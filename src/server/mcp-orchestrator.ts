// src/server/mcp-orchestrator.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

export class MCPOrchestrator {
  private clients: Map<string, Client> = new Map();
  private processes: Map<string, any> = new Map();

  async initialize() {
    console.log('🔧 Initializing MCP servers...');
    
    try {
      // Initialize filesystem server
      await this.initializeServer('filesystem', 'src/mcp-servers/filesystem-server.ts');
      
      // Initialize terminal server  
      await this.initializeServer('terminal', 'src/mcp-servers/terminal-server.ts');
      
      // Initialize web server
      await this.initializeServer('web', 'src/mcp-servers/web-server.ts');
      
      console.log('✅ All MCP servers initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MCP servers:', error);
      throw error;
    }
  }

  private async initializeServer(serverName: string, scriptPath: string) {
    try {
      console.log(`🚀 Starting ${serverName} server...`);
      
      // Spawn the MCP server process
      const process = spawn('npx', ['tsx', scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Store process reference for cleanup
      this.processes.set(serverName, process);

      // Create transport and client
      const transport = new StdioClientTransport({
        reader: process.stdout,
        writer: process.stdin
      });

      const client = new Client({
        name: `${serverName}-client`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Connect client
      await client.connect(transport);
      this.clients.set(serverName, client);

      console.log(`✅ ${serverName} server connected`);

      // Handle process errors
      process.stderr?.on('data', (data) => {
        console.error(`${serverName} server error:`, data.toString());
      });

      process.on('exit', (code) => {
        console.log(`${serverName} server exited with code:`, code);
        this.clients.delete(serverName);
        this.processes.delete(serverName);
      });

    } catch (error) {
      console.error(`❌ Failed to initialize ${serverName} server:`, error);
      throw error;
    }
  }

  async callTool(serverName: string, toolName: string, args: any) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server ${serverName} not found or not connected`);
    }

    try {
      console.log(`🔧 Calling ${serverName}.${toolName} with args:`, args);
      const result = await client.callTool({ name: toolName, arguments: args });
      console.log(`✅ Tool call successful:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Tool call failed ${serverName}.${toolName}:`, error);
      throw error;
    }
  }

  async getProjectContext(projectPath: string) {
    try {
      console.log(`📂 Getting project context for: ${projectPath}`);

      // 1) List directory structure
      const fileStructureResult = await this.callTool('filesystem', 'list_directory', {
        path: projectPath,
        recursive: true
      });

      // 2) Try to read package.json
      let packageJson = {};
      try {
        const packageJsonResult = await this.callTool('filesystem', 'read_file', {
          path: path.join(projectPath, 'package.json')
        });
        const packageContent = Array.isArray(packageJsonResult.content) 
          ? packageJsonResult.content[0]?.text || '{}'
          : packageJsonResult.content || '{}';
        packageJson = JSON.parse(packageContent);
      } catch (error) {
        console.log('📝 No package.json found or failed to read, using empty object');
      }

      // 3) Get git status
      let gitStatus = 'No git repository';
      try {
        const gitResult = await this.callTool('terminal', 'run_command', {
          command: 'git status --porcelain',
          cwd: projectPath
        });
        const gitOutput = Array.isArray(gitResult.content)
          ? JSON.parse(gitResult.content[0]?.text || '{}')
          : gitResult.content;
        gitStatus = gitOutput.stdout || 'No git repository';
      } catch (error) {
        console.log('📝 Git status not available');
      }

      // Parse file structure
      const fileStructure = Array.isArray(fileStructureResult.content)
        ? JSON.parse(fileStructureResult.content[0]?.text || '[]')
        : fileStructureResult.content || [];

      const context = {
        fileStructure,
        packageJson,
        gitStatus,
        timestamp: Date.now()
      };

      console.log('✅ Project context retrieved successfully');
      return context;

    } catch (error) {
      console.error('❌ Failed to get project context:', error);
      throw error;
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up MCP servers...');
    
    // Close all client connections
    for (const [name, client] of this.clients) {
      try {
        await client.close();
        console.log(`✅ Closed ${name} client`);
      } catch (error) {
        console.error(`❌ Error closing ${name} client:`, error);
      }
    }

    // Kill all server processes
    for (const [name, process] of this.processes) {
      try {
        process.kill();
        console.log(`✅ Killed ${name} process`);
      } catch (error) {
        console.error(`❌ Error killing ${name} process:`, error);
      }
    }

    this.clients.clear();
    this.processes.clear();
  }
}