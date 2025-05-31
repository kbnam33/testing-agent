// src/server/index.ts
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { MCPOrchestrator } from './mcp-orchestrator';
import { AIAgent } from './ai-agent';
import { ProjectManager } from './project-manager';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Load environment variables
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

class AutonomousDevSystem {
  private orchestrator: MCPOrchestrator;
  private aiAgent: AIAgent;
  private projectManager: ProjectManager;

  constructor() {
    this.orchestrator = new MCPOrchestrator();
    this.aiAgent = new AIAgent(this.orchestrator);
    this.projectManager = new ProjectManager();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupShutdownHandlers();
  }

  setupRoutes() {
    app.use(express.json());
    
    // Serve static files from dist directory
    const distPath = path.resolve(__dirname, '../../dist');
    app.use(express.static(distPath));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        anthropicKeySet: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-api-key'
      });
    });

    app.post('/api/start-development', async (req, res) => {
      const { projectGoal, projectPath } = req.body;
      
      if (!projectGoal || !projectPath) {
        return res.status(400).json({ 
          error: 'Both projectGoal and projectPath are required' 
        });
      }

      try {
        console.log(`🚀 Starting development: ${projectGoal} at ${projectPath}`);
        const result = await this.aiAgent.startAutonomousDevelopment(projectGoal, projectPath);
        res.json({ success: true, taskId: result.taskId });
      } catch (error: any) {
        console.error('❌ Failed to start development:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/user-input', async (req, res) => {
      const { taskId, userInput } = req.body;
      
      if (!taskId || !userInput) {
        return res.status(400).json({ 
          error: 'Both taskId and userInput are required' 
        });
      }

      try {
        await this.aiAgent.handleUserInput(taskId, userInput);
        res.json({ success: true });
      } catch (error: any) {
        console.error('❌ Failed to handle user input:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/status/:taskId', async (req, res) => {
      try {
        const status = await this.aiAgent.getTaskStatus(req.params.taskId);
        res.json(status);
      } catch (error: any) {
        console.error('❌ Failed to get task status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Catch all handler for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  setupSocketHandlers() {
    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);
      
      socket.on('subscribe-task', (taskId) => {
        console.log(`📡 Client subscribed to task: ${taskId}`);
        socket.join(`task-${taskId}`);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
      });

      // Real-time updates for development progress
      this.aiAgent.on('progress-update', (data) => {
        console.log(`📡 Broadcasting progress update for task ${data.taskId}`);
        io.to(`task-${data.taskId}`).emit('progress', data);
      });

      this.aiAgent.on('approval-needed', (data) => {
        console.log(`📡 Broadcasting approval request for task ${data.taskId}`);
        io.to(`task-${data.taskId}`).emit('approval-request', data);
      });

      this.aiAgent.on('task-complete', (data) => {
        console.log(`📡 Broadcasting task completion for task ${data.taskId}`);
        io.to(`task-${data.taskId}`).emit('task-completed', data);
      });
    });
  }

  setupShutdownHandlers() {
    const cleanup = async () => {
      console.log('🧹 Shutting down gracefully...');
      try {
        await this.orchestrator.cleanup();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  async start() {
    try {
      // Check environment variables
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key') {
        console.warn('⚠️  ANTHROPIC_API_KEY not set. Please create a .env file with your API key.');
        console.warn('⚠️  The system will run in demo mode with limited functionality.');
      }

      // Initialize MCP orchestrator
      console.log('🔧 Initializing MCP orchestrator...');
      await this.orchestrator.initialize();

      // Start server
      const port = process.env.PORT || 3001;
      server.listen(port, () => {
        console.log('🚀 Autonomous AI Development System running!');
        console.log(`📱 Backend server: http://localhost:${port}`);
        console.log('📱 Frontend: http://localhost:3000 (when running npm run dev)');
        console.log('🤖 AI Agent ready for autonomous development');
        console.log('📋 MCP Servers: filesystem, terminal, web');
      });

    } catch (error) {
      console.error('❌ Failed to start system:', error);
      process.exit(1);
    }
  }
}

// Create and start the system
const system = new AutonomousDevSystem();
system.start().catch((error) => {
  console.error('💥 System startup failed:', error);
  process.exit(1);
});