import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';

const server = new Server(
  {
    name: 'terminal-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'run_command',
        description: 'Execute a shell command',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            cwd: { type: 'string', description: 'Working directory' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
          },
          required: ['command'],
        },
      },
      {
        name: 'install_dependencies',
        description: 'Install npm dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            cwd: { type: 'string', description: 'Project directory' },
            package: { type: 'string', description: 'Specific package to install' },
          },
          required: ['cwd'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const params = (request.params as any);
  const name = params.name as string;
  const args = params.arguments as any;

  try {
    switch (name) {
      case 'run_command': {
        // args.command is any, args.cwd is any
        const result = await executeCommand(args.command, args.cwd, args.timeout || 30000);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode
            }, null, 2)
          }]
        };
      }

      case 'install_dependencies': {
        const command = args.package
          ? `npm install ${args.package}`
          : 'npm install';
        const result = await executeCommand(command, args.cwd, 60000);
        return {
          content: [{
            type: 'text',
            text: `Dependencies installed: ${result.stdout}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});


function executeCommand(command: string, cwd?: string, timeout = 30000): Promise<{stdout: string, stderr: string, exitCode: number}> {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], { 
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);