import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

const server = new Server(
  {
    name: 'filesystem-server',
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
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
            recursive: { type: 'boolean', description: 'List recursively' },
          },
          required: ['path'],
        },
      },
      {
        name: 'create_directory',
        description: 'Create a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to create' },
          },
          required: ['path'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  // cast request.params to any so TypeScript no longer complains:
  const params = (request.params as any);
  const name = params.name as string;
  const args = params.arguments as any;

  try {
    switch (name) {
      case 'read_file': {
        // Now args.path is any, so no type error:
        const content = await fs.readFile(args.path, 'utf-8');
        return { content: [{ type: 'text', text: content }] };
      }

      case 'write_file': {
        await fs.writeFile(args.path, args.content, 'utf-8');
        return { content: [{ type: 'text', text: `File written: ${args.path}` }] };
      }

      case 'list_directory': {
        // We know args.path: string, args.recursive: boolean
        const listDir = async (dirPath: string, recursive = false): Promise<string[]> => {
          const items = await fs.readdir(dirPath);
          let result = items.map(item => path.join(dirPath, item));

          if (recursive) {
            for (const item of items) {
              const itemPath = path.join(dirPath, item);
              const stat = await fs.stat(itemPath);
              if (stat.isDirectory()) {
                const subItems = await listDir(itemPath, true);
                result = result.concat(subItems);
              }
            }
          }
          return result;
        };

        const files = await listDir(args.path, args.recursive);
        return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
      }

      case 'create_directory': {
        await fs.mkdir(args.path, { recursive: true });
        return { content: [{ type: 'text', text: `Directory created: ${args.path}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);