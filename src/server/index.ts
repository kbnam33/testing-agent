import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { MCPOrchestrator } from './mcp-orchestrator';
import { AIAgent } from './ai-agent';
import { ProjectManager } from './project-manager';

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
  }

  setupRoutes() {
    app.use(express.json());
    app.use(express.static('dist'));

    app.post('/api/start-development', async (req, res) => {
      const { projectGoal, projectPath } = req.body;
      try {
        const result = await this.aiAgent.startAutonomousDevelopment(projectGoal, projectPath);
        res.json({ success: true, taskId: result.taskId });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/user-input', async (req, res) => {
      const { taskId, userInput } = req.body;
      await this.aiAgent.handleUserInput(taskId, userInput);
      res.json({ success: true });
    });

    app.get('/api/status/:taskId', async (req, res) => {
      const status = await this.aiAgent.getTaskStatus(req.params.taskId);
      res.json(status);
    });
  }

  setupSocketHandlers() {
    io.on('connection', (socket) => {
      console.log('Client connected');
      
      socket.on('subscribe-task', (taskId) => {
        socket.join(`task-${taskId}`);
      });

      // Real-time updates for development progress
      this.aiAgent.on('progress-update', (data) => {
        io.to(`task-${data.taskId}`).emit('progress', data);
      });

      this.aiAgent.on('approval-needed', (data) => {
        io.to(`task-${data.taskId}`).emit('approval-request', data);
      });

      this.aiAgent.on('task-complete', (data) => {
        io.to(`task-${data.taskId}`).emit('task-completed', data);
      });
    });
  }

  async start() {
    await this.orchestrator.initialize();
    server.listen(3001, () => {
      console.log('🚀 Autonomous AI Development System running on port 3001');
      console.log('📱 MCP Servers initialized');
      console.log('🤖 AI Agent ready for autonomous development');
    });
  }
}

new AutonomousDevSystem().start();
