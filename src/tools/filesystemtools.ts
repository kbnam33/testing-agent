// packages/agent/src/tools/FileSystemTool.ts
import * as fs from 'fs/promises'; // Using fs.promises for async operations
import * as path from 'path';

interface FileSystemToolParams {
  operation: 'createFile' | 'readFile' | 'writeFile' | 'appendFile' | 'deleteFile' | 'listDirectory'; // Added more operations for future use
  filePath: string;
  content?: string; // Optional for operations like readFile, deleteFile, listDirectory
  basePath?: string; // A base path to restrict file operations, e.g., the project path
}

interface ToolResult {
  success: boolean;
  message?: string;
  data?: any; // For returning file content or directory listings
}

export class FileSystemTool {
  private allowedBasePath: string;

  constructor(basePath: string = '.') { // Default base path to current directory for safety
    // Ensure the base path is absolute and normalized for security
    this.allowedBasePath = path.resolve(basePath);
    console.log(`FileSystemTool initialized with basePath: ${this.allowedBasePath}`);
  }

  // Helper to ensure the operation is within the allowed base path
  private async resolvePath(filePath: string): Promise<string | null> {
    const resolvedPath = path.resolve(this.allowedBasePath, filePath);
    if (!resolvedPath.startsWith(this.allowedBasePath)) {
      console.error(`Security Alert: Attempt to access path '${resolvedPath}' outside of allowed base path '${this.allowedBasePath}'.`);
      return null; // Path is outside the allowed base directory
    }
    // Ensure the directory exists for write operations, create if not
    const dir = path.dirname(resolvedPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error: any) {
      // Ignore EEXIST error (directory already exists), rethrow others
      if (error.code !== 'EEXIST') {
        console.error(`Error creating directory ${dir}:`, error);
        throw error; // Rethrow if it's not an EEXIST error
      }
    }
    return resolvedPath;
  }

  public async execute(params: FileSystemToolParams): Promise<ToolResult> {
    const resolvedFilePath = await this.resolvePath(params.filePath);
    if (!resolvedFilePath) {
      return { success: false, message: `Error: Path is outside the allowed project directory or directory creation failed for ${params.filePath}.` };
    }

    console.log(`FileSystemTool executing operation: ${params.operation} on path: ${resolvedFilePath}`);

    try {
      switch (params.operation) {
        case 'createFile': // Can be an alias for writeFile, ensuring it creates if not exists
        case 'writeFile':
          if (typeof params.content !== 'string') {
            return { success: false, message: "Error: 'content' must be provided for writeFile operation." };
          }
          await fs.writeFile(resolvedFilePath, params.content, 'utf8');
          return { success: true, message: `File '${params.filePath}' written successfully.` };

        case 'readFile':
          const data = await fs.readFile(resolvedFilePath, 'utf8');
          return { success: true, message: `File '${params.filePath}' read successfully.`, data };

        case 'appendFile':
          if (typeof params.content !== 'string') {
            return { success: false, message: "Error: 'content' must be provided for appendFile operation." };
          }
          await fs.appendFile(resolvedFilePath, params.content, 'utf8');
          return { success: true, message: `Content appended to file '${params.filePath}' successfully.` };
        
        case 'deleteFile':
          await fs.unlink(resolvedFilePath);
          return { success: true, message: `File '${params.filePath}' deleted successfully.` };

        case 'listDirectory':
          const items = await fs.readdir(resolvedFilePath);
          return { success: true, message: `Directory '${params.filePath}' listed successfully.`, data: items };

        default:
          return { success: false, message: `Error: Unknown operation '${(params as any).operation}'.` };
      }
    } catch (error: any) {
      console.error(`FileSystemTool error during ${params.operation} on ${params.filePath}:`, error);
      return { success: false, message: `Error during ${params.operation} on '${params.filePath}': ${error.message}` };
    }
  }
}