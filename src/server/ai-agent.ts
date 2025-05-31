import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { MCPOrchestrator } from './mcp-orchestrator';

export class AIAgent extends EventEmitter {
  private anthropic: Anthropic;
  private activeTasks: Map<string, any> = new Map();
  
  constructor(private orchestrator: MCPOrchestrator) {
    super();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key'
    });
  }

  async startAutonomousDevelopment(projectGoal: string, projectPath: string) {
    const taskId = `task-${Date.now()}`;
    
    // Get comprehensive project context
    const context = await this.orchestrator.getProjectContext(projectPath);
    
    const task = {
      id: taskId,
      goal: projectGoal,
      projectPath,
      context,
      status: 'planning',
      steps: [] as any[],
      currentStep: 0,
      startTime: Date.now()
    };

    this.activeTasks.set(taskId, task);
    
    // Start autonomous development process
    this.runAutonomousDevelopment(taskId);
    
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
      
      // Phase 3: Testing & Refinement
      await this.testAndRefine(task);
      
      this.emit('task-complete', { taskId, status: 'completed' });
      
    } catch (error: any) {
      this.emit('task-complete', { taskId, status: 'error', error: error.message });
    }
  }

  private async planDevelopment(task: any) {
    this.emit('progress-update', {
      taskId: task.id,
      phase: 'planning',
      message: 'Analyzing project and creating development plan...'
    });

    const systemPrompt = `You are an autonomous AI development agent. Your goal is to ${task.goal}.

Project Context:
- File Structure: ${JSON.stringify(task.context.fileStructure, null, 2)}
- Package.json: ${JSON.stringify(task.context.packageJson, null, 2)}
- Git Status: ${task.context.gitStatus}

Create a detailed step-by-step plan to achieve the goal. For each step, specify:
1. What needs to be done
2. Which files need to be created/modified
3. What commands need to be run
4. Estimated time
5. Dependencies on other steps

Respond with a JSON plan structure.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: systemPrompt }]
    });

    const plan = JSON.parse((response as any).content[0].text);
    task.steps = plan.steps;
    task.status = 'implementing';

    this.emit('progress-update', {
      taskId: task.id,
      phase: 'planning',
      message: `Plan created with ${plan.steps.length} steps`,
      plan: plan.steps
    });
  }

  private async implementPlan(task: any) {
    for (let i = 0; i < task.steps.length; i++) {
      const step = task.steps[i];
      task.currentStep = i;

      this.emit('progress-update', {
        taskId: task.id,
        phase: 'implementing',
        step: i + 1,
        totalSteps: task.steps.length,
        message: `Executing: ${step.description}`
      });

      await this.executeStep(task, step);
    }
  }

  private async executeStep(task: any, step: any) {
    const systemPrompt = `You are executing step: ${step.description}

Current project context:
${JSON.stringify(await this.orchestrator.getProjectContext(task.projectPath), null, 2)}

Available MCP tools:
- filesystem: read_file, write_file, list_directory, create_directory
- terminal: run_command, install_dependencies
- web: web_search, fetch_page, download_asset

Execute this step by calling the appropriate MCP tools. Be thorough and check your work.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: systemPrompt }],
      tools: [
        {
          name: 'mcp_call',
          description: 'Call MCP server tools',
          input_schema: {
            type: 'object',
            properties: {
              server: { type: 'string' },
              tool: { type: 'string' },
              args: { type: 'object' }
            }
          }
        }
      ]
    });

    // Execute the MCP calls from AI response
    for (const block of (response as any).content) {
        if ((block as any).type === 'tool_use') {
            const { server, tool, args } = (block as any).input;
            await this.orchestrator.callTool(server, tool, args);
        }
    }

  }

  private async testAndRefine(task: any) {
    this.emit('progress-update', {
      taskId: task.id,
      phase: 'testing',
      message: 'Running tests and validating implementation...'
    });

    // Run tests using terminal MCP server
    await this.orchestrator.callTool('terminal', 'run_command', {
      command: 'npm test',
      cwd: task.projectPath
    });

    // Build the project
    await this.orchestrator.callTool('terminal', 'run_command', {
      command: 'npm run build',
      cwd: task.projectPath
    });

    task.status = 'completed';
  }

  async handleUserInput(taskId: string, userInput: string) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    // Process user input and adjust plan if needed
    this.emit('progress-update', {
      taskId,
      message: `Processing user input: ${userInput}`
    });
  }

  async getTaskStatus(taskId: string) {
    const task = this.activeTasks.get(taskId);
    if (!task) return { error: 'Task not found' };
    
    return {
      id: task.id,
      status: task.status,
      currentStep: task.currentStep,
      totalSteps: task.steps.length,
      progress: task.steps.length > 0 ? (task.currentStep / task.steps.length) * 100 : 0,
      startTime: task.startTime,
      elapsedTime: Date.now() - task.startTime
    };
  }
}
