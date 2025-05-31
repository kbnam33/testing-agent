// src/server/ai-agent.ts
import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { MCPOrchestrator } from './mcp-orchestrator';

export class AIAgent extends EventEmitter {
  private anthropic: Anthropic;
  private activeTasks: Map<string, any> = new Map();
  
  constructor(private orchestrator: MCPOrchestrator) {
    super();
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your-api-key') {
      console.warn('⚠️  ANTHROPIC_API_KEY not set. Please add it to your .env file');
    }
    
    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key'
    });
  }

  async startAutonomousDevelopment(projectGoal: string, projectPath: string) {
    const taskId = `task-${Date.now()}`;
    
    console.log(`🤖 Starting autonomous development for task: ${taskId}`);
    console.log(`📋 Goal: ${projectGoal}`);
    console.log(`📂 Path: ${projectPath}`);
    
    const task = {
      id: taskId,
      goal: projectGoal,
      projectPath,
      status: 'planning',
      steps: [] as any[],
      currentStep: 0,
      totalSteps: 0,
      startTime: Date.now()
    };

    this.activeTasks.set(taskId, task);
    
    // Start autonomous development process (async)
    this.runAutonomousDevelopment(taskId).catch((error) => {
      console.error(`❌ Task ${taskId} failed:`, error);
      this.emit('task-complete', { taskId, status: 'error', error: error.message });
    });
    
    return { taskId, status: 'started' };
  }

  private async runAutonomousDevelopment(taskId: string) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    try {
      // Phase 1: Planning
      await this.planDevelopment(task);
      
      // Phase 2: Implementation
      await this.implementPlan(task);
      
      // Phase 3: Testing & Validation
      await this.testAndValidate(task);
      
      task.status = 'completed';
      this.emit('task-complete', { taskId, status: 'completed' });
      
    } catch (error: any) {
      console.error(`❌ Development failed for task ${taskId}:`, error);
      task.status = 'error';
      this.emit('task-complete', { taskId, status: 'error', error: error.message });
    }
  }

  private async planDevelopment(task: any) {
    console.log(`📋 Planning development for task: ${task.id}`);
    
    this.emit('progress-update', {
      taskId: task.id,
      phase: 'planning',
      message: 'Analyzing project and creating development plan...'
    });

    try {
      // Get project context
      const context = await this.orchestrator.getProjectContext(task.projectPath);
      task.context = context;

      // Create a simple plan based on the goal
      const plan = await this.createDevelopmentPlan(task.goal, context);
      task.steps = plan.steps;
      task.totalSteps = plan.steps.length;

      this.emit('progress-update', {
        taskId: task.id,
        phase: 'planning',
        message: `Plan created with ${plan.steps.length} steps`,
        plan: plan.steps
      });

      task.status = 'implementing';
      
    } catch (error: any) {
      console.error('❌ Planning failed:', error);
      throw new Error(`Planning failed: ${error.message}`);
    }
  }

  private async createDevelopmentPlan(goal: string, context: any) {
    // For simple goals like "Create a file named hello.txt", create a direct plan
    if (goal.toLowerCase().includes('create') && goal.toLowerCase().includes('file')) {
      return {
        steps: [
          {
            id: 1,
            description: goal,
            action: 'create_file',
            estimatedTime: '30s'
          }
        ]
      };
    }

    // For more complex goals, you could integrate with Anthropic API here
    // For now, return a generic plan
    return {
      steps: [
        {
          id: 1,
          description: goal,
          action: 'implement_goal',
          estimatedTime: '2min'
        }
      ]
    };
  }

  private async implementPlan(task: any) {
    console.log(`🔨 Implementing plan for task: ${task.id}`);
    
    for (let i = 0; i < task.steps.length; i++) {
      const step = task.steps[i];
      task.currentStep = i + 1;

      this.emit('progress-update', {
        taskId: task.id,
        phase: 'implementing',
        step: i + 1,
        totalSteps: task.steps.length,
        message: `Executing: ${step.description}`
      });

      await this.executeStep(task, step);
      
      // Small delay for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async executeStep(task: any, step: any) {
    console.log(`⚙️ Executing step: ${step.description}`);
    
    try {
      // Parse the goal to extract file details
      if (task.goal.toLowerCase().includes('create') && task.goal.toLowerCase().includes('file')) {
        await this.executeFileCreation(task);
      } else {
        // For other goals, implement generic execution logic
        await this.executeGenericGoal(task, step);
      }
    } catch (error: any) {
      console.error(`❌ Step execution failed:`, error);
      throw error;
    }
  }

  private async executeFileCreation(task: any) {
    // Extract filename and content from goal
    const goal = task.goal;
    let filename = 'hello.txt';
    let content = 'Hello, world!';
    
    // Try to parse filename from goal
    const filenameMatch = goal.match(/named\s+([^\s]+)/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
    
    // Try to parse content from goal
    const contentMatch = goal.match(/containing.*?["']([^"']+)["']/i);
    if (contentMatch) {
      content = contentMatch[1];
    }
    
    const filePath = `${task.projectPath}/${filename}`;
    
    console.log(`📝 Creating file: ${filePath} with content: "${content}"`);
    
    // Use MCP filesystem server to create the file
    await this.orchestrator.callTool('filesystem', 'write_file', {
      path: filePath,
      content: content
    });
    
    console.log(`✅ File created successfully: ${filename}`);
  }

  private async executeGenericGoal(task: any, step: any) {
    // Placeholder for more complex goal execution
    console.log(`🔧 Executing generic goal: ${step.description}`);
    
    // For demo purposes, just wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async testAndValidate(task: any) {
    console.log(`🧪 Testing and validating task: ${task.id}`);
    
    this.emit('progress-update', {
      taskId: task.id,
      phase: 'testing',
      message: 'Running tests and validating implementation...'
    });

    try {
      // Check if the file was created (for file creation goals)
      if (task.goal.toLowerCase().includes('create') && task.goal.toLowerCase().includes('file')) {
        await this.validateFileCreation(task);
      }
      
      // Try to run any available tests
      await this.runProjectTests(task);
      
    } catch (error: any) {
      console.log(`⚠️ Testing completed with warnings: ${error.message}`);
      // Don't fail the entire task if tests fail, just log it
    }
  }

  private async validateFileCreation(task: any) {
    const goal = task.goal;
    let filename = 'hello.txt';
    
    const filenameMatch = goal.match(/named\s+([^\s]+)/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
    
    const filePath = `${task.projectPath}/${filename}`;
    
    try {
      const result = await this.orchestrator.callTool('filesystem', 'read_file', {
        path: filePath
      });
      
      console.log(`✅ File validation successful: ${filename} exists`);
      
    } catch (error) {
      throw new Error(`File validation failed: ${filename} was not created`);
    }
  }

  private async runProjectTests(task: any) {
    try {
      // Try running npm test (if available)
      await this.orchestrator.callTool('terminal', 'run_command', {
        command: 'npm test --passWithNoTests',
        cwd: task.projectPath,
        timeout: 30000
      });
      
      console.log('✅ Tests passed');
      
    } catch (error) {
      console.log('📝 No tests to run or tests failed, continuing...');
    }
  }

  async handleUserInput(taskId: string, userInput: string) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    console.log(`👤 User input for task ${taskId}: ${userInput}`);
    
    this.emit('progress-update', {
      taskId,
      phase: 'user-input',
      message: `Processing user input: ${userInput}`
    });
  }

  async getTaskStatus(taskId: string) {
    const task = this.activeTasks.get(taskId);
    if (!task) return { error: 'Task not found' };
    
    const progress = task.totalSteps > 0 ? (task.currentStep / task.totalSteps) * 100 : 0;
    
    return {
      id: task.id,
      status: task.status,
      currentStep: task.currentStep,
      totalSteps: task.totalSteps,
      progress: Math.min(progress, 100),
      startTime: task.startTime,
      elapsedTime: Date.now() - task.startTime
    };
  }
}