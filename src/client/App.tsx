import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Task {
  id: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  startTime: number;
  elapsedTime: number;
}

interface ProgressUpdate {
  taskId: string;
  phase: string;
  step?: number;
  totalSteps?: number;
  message: string;
  plan?: any[];
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<any>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [projectGoal, setProjectGoal] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('progress', (data: ProgressUpdate) => {
      setProgressUpdates(prev => [...prev, data]);
    });

    newSocket.on('task-completed', (data: any) => {
      setIsRunning(false);
      setProgressUpdates(prev => [...prev, {
        taskId: data.taskId,
        phase: 'completed',
        message: `Task completed with status: ${data.status}`
      }]);
    });

    return () => {
     newSocket.close();
   };
  }, []);

  const startDevelopment = async () => {
    if (!projectGoal || !projectPath) return;

    setIsRunning(true);
    setProgressUpdates([]);

    try {
      const response = await fetch('/api/start-development', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectGoal, projectPath })
      });

      const result = await response.json();
      if (result.success) {
        socket?.emit('subscribe-task', result.taskId);
        
        // Poll for task status
        const interval = setInterval(async () => {
          const statusResponse = await fetch(`/api/status/${result.taskId}`);
          const status = await statusResponse.json();
          setCurrentTask(status);
          
          if (status.status === 'completed' || status.status === 'error') {
            clearInterval(interval);
            setIsRunning(false);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to start development:', error);
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">Autonomous AI Development System</h1>
            <p className="text-blue-100">Your AI agent for end-to-end development</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Control Panel */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Project Configuration</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Development Goal</label>
                  <textarea
                    value={projectGoal}
                    onChange={(e) => setProjectGoal(e.target.value)}
                    placeholder="Describe what you want to build or implement..."
                    className="w-full p-3 border rounded-lg h-24 resize-none"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Project Path</label>
                  <input
                    type="text"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="/path/to/your/project"
                    className="w-full p-3 border rounded-lg"
                    disabled={isRunning}
                  />
                </div>

                <button
                  onClick={startDevelopment}
                  disabled={isRunning || !projectGoal || !projectPath}
                  className={`w-full py-3 px-4 rounded-lg font-medium ${
                    isRunning || !projectGoal || !projectPath
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isRunning ? 'AI Agent Working...' : 'Start Autonomous Development'}
                </button>

                {/* Task Status */}
                {currentTask && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold mb-2">Current Task Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-medium">{currentTask.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Progress:</span>
                        <span className="font-medium">{Math.round(currentTask.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${currentTask.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Step {currentTask.currentStep} of {currentTask.totalSteps}</span>
                        <span>{Math.floor(currentTask.elapsedTime / 1000)}s elapsed</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Log */}
              <div>
                <h2 className="text-xl font-bold mb-4">Development Progress</h2>
                <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
                  {progressUpdates.length === 0 ? (
                    <p className="text-gray-500 text-center">No activity yet. Start development to see progress...</p>
                  ) : (
                    <div className="space-y-3">
                      {progressUpdates.map((update, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-l-blue-500">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-blue-600 uppercase">
                              {update.phase}
                            </span>
                            {update.step && (
                              <span className="text-xs text-gray-500">
                                Step {update.step}/{update.totalSteps}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{update.message}</p>
                          {update.plan && (
                            <div className="mt-2">
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-600">View Plan</summary>
                                <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(update.plan, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;