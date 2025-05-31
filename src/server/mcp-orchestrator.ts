// src/server/mcp-orchestrator.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPOrchestrator {
  private clients: Map<string, Client> = new Map();

  async initialize() {
    // … existing initialization of filesystem, terminal, web …
  }

  async callTool(serverName: string, toolName: string, args: any) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP server ${serverName} not found`);
    return await client.callTool({ name: toolName, arguments: args });
  }

  async getProjectContext(projectPath: string) {
    // 1) List directory
    const fileStructure = await this.callTool('filesystem', 'list_directory', {
      path: projectPath,
      recursive: true
    });

    // 2) Read package.json
    const rawPackageResult = await this.callTool('filesystem', 'read_file', {
      path: `${projectPath}/package.json`
    });

    // 3) Run git status
    const gitStatus = await this.callTool('terminal', 'run_command', {
      command: 'git status',
      cwd: projectPath
    });

    // Now: rawPackageResult.content is unknown. Cast it to string:
    const rawContent = (rawPackageResult as any).content as string;
    // If content is empty or undefined, fallback to "{}"
    const pkgString = rawContent && typeof rawContent === 'string'
      ? rawContent
      : '{}';

    return {
      fileStructure: (fileStructure as any).content,      // treat content as any
      packageJson: JSON.parse(pkgString),
      gitStatus: (gitStatus as any).stdout,                // treat stdout as string
      timestamp: Date.now()
    };
  }
}
