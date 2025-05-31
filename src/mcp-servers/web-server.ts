import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const server = new Server(
  {
    name: 'web-server',
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
        name: 'web_search',
        description: 'Search the web using a search engine',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum number of results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'fetch_page',
        description: 'Fetch and parse a web page',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to fetch' },
            selector: { type: 'string', description: 'CSS selector to extract specific content' },
          },
          required: ['url'],
        },
      },
      {
        name: 'download_asset',
        description: 'Download an asset (image, file) from a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Asset URL' },
            savePath: { type: 'string', description: 'Local path to save the asset' },
          },
          required: ['url', 'savePath'],
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
      case 'web_search': {
        const searchResults = await performWebSearch(args.query, args.maxResults || 5);
        return { content: [{ type: 'text', text: JSON.stringify(searchResults, null, 2) }] };
      }

      case 'fetch_page': {
        const response = await fetch(args.url);
        const html = await response.text();
        const $ = cheerio.load(html);
        const content = args.selector ? $(args.selector).text() : $.text();
        return { content: [{ type: 'text', text: content }] };
      }

      case 'download_asset': {
        const response = await fetch(args.url);
        const buffer = await response.buffer();
        await import('fs/promises').then(fs => 
          fs.writeFile(args.savePath, buffer)
        );
        return { content: [{ type: 'text', text: `Asset downloaded to: ${args.savePath}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});


async function performWebSearch(query: string, maxResults: number) {
  // Placeholder implementation - integrate with real search API
  return {
    query,
    results: [
      {
        title: `Search result for: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `This is a placeholder search result for "${query}".`
      }
    ]
  };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);