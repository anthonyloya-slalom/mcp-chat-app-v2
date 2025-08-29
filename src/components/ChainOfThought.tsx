import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExecutionStep {
  type: 'action' | 'result' | 'thought' | 'error';
  tool?: string;
  input?: any;
  output?: any;
  thought?: string;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  stepNumber?: number;
}

interface ChainOfThoughtProps {
  steps: ExecutionStep[];
  isStreaming?: boolean;
  onRetry?: (stepIndex: number) => void;
}

export default function ChainOfThought({ steps, isStreaming, onRetry }: ChainOfThoughtProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);
  
  // Auto-expand running steps and auto-collapse completed steps
  useEffect(() => {
    if (steps) {
      const newExpanded = new Set<number>();
      
      steps.forEach((step, index) => {
        // Auto-expand running steps
        if (step.status === 'running') {
          newExpanded.add(index);
        }
        // Keep previously expanded steps expanded unless completed
        else if (expandedSteps.has(index) && step.status !== 'completed') {
          newExpanded.add(index);
        }
        // Auto-expand error steps
        else if (step.status === 'error') {
          newExpanded.add(index);
        }
      });
      
      setExpandedSteps(newExpanded);
    }
  }, [steps]);

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getStepIcon = (step: ExecutionStep) => {
    if (step.type === 'error' || step.status === 'error') {
      return <span className="text-red-400 text-base">✗</span>;
    }
    
    switch (step.status) {
      case 'running':
        return <span className="text-amber-400 text-base animate-pulse">○</span>;
      case 'completed':
        return <span className="text-green-500 text-base">✓</span>;
      case 'pending':
      default:
        return <span className="text-gray-500 text-base">○</span>;
    }
  };

  const getStepTitle = (step: ExecutionStep) => {
    if (step.type === 'error') {
      return `Error: ${step.error?.substring(0, 80) || 'Unknown error'}`;
    }
    if (step.type === 'thought' && step.thought) {
      return step.thought.substring(0, 100) + (step.thought.length > 100 ? '...' : '');
    }
    if (step.tool) {
      return `${step.tool}`;
    }
    return 'Processing step';
  };

  const formatInput = (input: any) => {
    if (!input) return null;
    
    if (typeof input === 'string') {
      return <div className="text-xs text-slate-300 font-mono">{input}</div>;
    }
    
    return (
      <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
        {JSON.stringify(input, null, 2)}
      </pre>
    );
  };

  const formatOutput = (output: any) => {
    if (!output) return null;
    
    try {
      const parsed = typeof output === 'string' ? JSON.parse(output) : output;
      
      // Handle MCP response format
      if (parsed.content && Array.isArray(parsed.content)) {
        const textContent = parsed.content.find((c: any) => c.type === 'text');
        if (textContent?.text) {
          return (
            <div className="text-xs text-emerald-300 whitespace-pre-wrap">
              {textContent.text.substring(0, 500)}
              {textContent.text.length > 500 && '...'}
            </div>
          );
        }
      }
      
      // Handle SQL query results
      if (parsed.rows && Array.isArray(parsed.rows)) {
        return (
          <div className="space-y-1">
            <div className="text-xs text-emerald-400">
              Result received ({parsed.rows.length} rows)
            </div>
            {parsed.rows.length > 0 && (
              <div className="text-xs text-slate-400">
                Preview: {JSON.stringify(parsed.rows[0], null, 2).substring(0, 200)}...
              </div>
            )}
          </div>
        );
      }
      
      return (
        <pre className="text-xs text-emerald-300 overflow-x-auto">
          {JSON.stringify(parsed, null, 2).substring(0, 500)}
        </pre>
      );
    } catch {
      const text = String(output);
      return (
        <div className="text-xs text-emerald-300 whitespace-pre-wrap">
          {text.substring(0, 500)}
          {text.length > 500 && '...'}
        </div>
      );
    }
  };

  const totalSteps = steps.filter(s => s.type !== 'thought').length;
  const completedSteps = steps.filter(s => s.status === 'completed' && s.type !== 'thought').length;

  return (
    <div className="rounded-lg bg-slate-800 p-4 space-y-3">
      {/* Header */}
      <div 
        className="flex items-center justify-between text-sm cursor-pointer"
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">
            {isSectionExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
          <div className="text-amber-400 font-medium">
            View processing steps ({totalSteps})
          </div>
        </div>
        {totalSteps > 0 && (
          <div className="text-sm text-gray-500">
            {completedSteps}/{totalSteps} completed
          </div>
        )}
      </div>

      {/* Steps - Only show if section is expanded */}
      {isSectionExpanded && (
        <div className="space-y-2 pl-6 border-l-2 border-slate-600">
          {steps.map((step, index) => {
            const isExpanded = expandedSteps.has(index);
            
            return (
              <div key={index}>
                <div 
                  className="flex items-start gap-2 cursor-pointer hover:bg-slate-700/30 rounded p-1 -ml-1 transition-colors"
                  onClick={() => toggleStep(index)}
                >
                  <span className="text-gray-500 mt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                  {getStepIcon(step)}
                  <div className="flex-1 text-sm text-gray-200">
                    {getStepTitle(step)}
                  </div>
                </div>
              
                {/* Expanded content */}
                {isExpanded && (
                  <div className="ml-10 mt-2 space-y-2 text-xs">
                    {step.tool && step.input && (
                      <div className="space-y-1">
                        <div className="text-slate-400 font-medium">
                          {step.tool}
                        </div>
                        <div className="pl-4 border-l border-slate-600">
                          {formatInput(step.input)}
                        </div>
                      </div>
                    )}
                    
                    {step.output && (
                      <div className="space-y-1">
                        <div className="text-emerald-400 font-medium">
                          Result received
                        </div>
                        <div className="pl-4 border-l border-emerald-900/50">
                          {formatOutput(step.output)}
                        </div>
                      </div>
                    )}
                    
                    {step.type === 'thought' && step.thought && (
                      <div className="text-slate-300 italic">
                        {step.thought}
                      </div>
                    )}
                    
                    {/* Error display */}
                    {(step.type === 'error' || step.status === 'error') && (
                      <div className="space-y-2">
                        <div className="text-red-400 font-medium">
                          Error occurred
                        </div>
                        <div className="pl-4 border-l border-red-900/50 text-red-300">
                          {step.error || 'An unexpected error occurred'}
                        </div>
                        {onRetry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(index);
                            }}
                            className="ml-4 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            Retry this step
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Loading indicator */}
      {isSectionExpanded && isStreaming && steps.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-400 pl-6">
          <span className="text-amber-400 animate-pulse">○</span>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}