import { useState, useEffect } from 'react';
import { Message } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EnhancedSummary from './EnhancedSummary';
import FormattedSummary from './FormattedSummary';
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Zap, 
  Check,
  Copy,
  User,
  Bot,
  Brain,
  Network,
  Loader2,
  Terminal,
  Database,
  Search,
  FileText,
  Sparkles,
  Activity,
  CheckCircle
} from 'lucide-react';

interface ExecutionStep {
  type: 'action' | 'result' | 'thought';
  tool?: string;
  input?: any;
  output?: any;
  thought?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  stepNumber?: number;
}

interface ClaudeMessageEnhancedProps {
  message: Message;
  isStreaming?: boolean;
  executionSteps?: ExecutionStep[];
}

export default function ClaudeMessageEnhanced({ 
  message, 
  isStreaming, 
  executionSteps 
}: ClaudeMessageEnhancedProps) {
  const [showExecution, setShowExecution] = useState(false); // Default to collapsed
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [queryData, setQueryData] = useState<any>(null);
  
  // Auto-expand running steps
  useEffect(() => {
    if (executionSteps && isStreaming) {
      const runningStepIndices = executionSteps
        .map((step, index) => step.status === 'running' ? index : -1)
        .filter(index => index !== -1);
      
      if (runningStepIndices.length > 0) {
        setExpandedSteps(prev => {
          const newSet = new Set(prev);
          runningStepIndices.forEach(index => newSet.add(index));
          return newSet;
        });
      }
    }
  }, [executionSteps, isStreaming]);

  useEffect(() => {
    // Extract data from execution steps
    if (executionSteps && executionSteps.length > 0) {
      // Look through all result steps to find query data
      for (const step of executionSteps) {
        if (step.type === 'result' && step.output) {
          try {
            const data = typeof step.output === 'string' 
              ? JSON.parse(step.output) 
              : step.output;
            
            // Check for rows in various formats
            if (data.rows && Array.isArray(data.rows)) {
              setQueryData(data.rows);
              break;
            } else if (data.content && Array.isArray(data.content)) {
              // MCP response format
              const textContent = data.content.find((c: any) => c.type === 'text');
              if (textContent?.text) {
                try {
                  const parsed = JSON.parse(textContent.text);
                  if (parsed.rows) {
                    setQueryData(parsed.rows);
                    break;
                  }
                } catch {
                  // Not JSON, skip
                }
              }
            }
          } catch (e) {
            // Not JSON, continue to next step
          }
        }
      }
    }
  }, [executionSteps]);

  const extractDataFromContent = () => {
    // Try to extract data from the message content if it contains query results
    if (!queryData && message.content) {
      const extractedData: any[] = [];
      
      // Multiple patterns to match different formats
      // Pattern 1: "Delegate ADDRESS with a maximum balance of NUMBER"
      const pattern1 = /(?:Delegate\s+)?(0x[a-fA-F0-9]{40})[^\n]*?(?:maximum balance of|with|balance of)\s*([0-9.E+\-]+|\d+(?:,\d+)*(?:\.\d+)?)/gi;
      
      // Pattern 2: "ADDRESS with NUMBER CTX/votes/tokens"
      const pattern2 = /(0x[a-fA-F0-9]{40})[^\n]*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:CTX|votes|tokens)/gi;
      
      // Pattern 3: Scientific notation (e.g., 3.5245200E+23)
      const pattern3 = /(0x[a-fA-F0-9]{40})[^\n]*?([0-9]+\.?[0-9]*[Ee][+\-]?[0-9]+)/gi;
      
      // Try each pattern
      for (const pattern of [pattern1, pattern2, pattern3]) {
        const matches = [...message.content.matchAll(pattern)];
        for (const match of matches) {
          const address = match[1];
          let amountStr = match[2].replace(/,/g, '');
          
          // Parse the amount
          let amount = parseFloat(amountStr);
          
          // Convert from wei to tokens if needed
          // If the value is greater than 10^15, it's likely in wei
          if (amount > 1e15) {
            amount = amount / 1e18;
          }
          
          // Check if address already exists
          const existing = extractedData.find(d => d.delegate === address);
          if (!existing && !isNaN(amount)) {
            extractedData.push({
              delegate: address,
              voting_power_ctx: amount,
              balance_ctx: amount,
              voting_power: amount
            });
          }
        }
      }
      
      // Also look for already formatted CTX values
      const ctxPattern = /(0x[a-fA-F0-9]{40})[^\n]*?([\d,]+(?:\.\d+)?)\s*CTX/gi;
      const ctxMatches = [...message.content.matchAll(ctxPattern)];
      for (const match of ctxMatches) {
        const address = match[1];
        const amount = parseFloat(match[2].replace(/,/g, ''));
        
        const existing = extractedData.find(d => d.delegate === address);
        if (!existing && !isNaN(amount)) {
          extractedData.push({
            delegate: address,
            voting_power_ctx: amount,
            balance_ctx: amount,
            voting_power: amount
          });
        }
      }
      
      // Sort by voting power descending and take top 3
      if (extractedData.length > 0) {
        extractedData.sort((a, b) => b.voting_power_ctx - a.voting_power_ctx);
        setQueryData(extractedData.slice(0, 3));
      }
    }
  };
  
  useEffect(() => {
    extractDataFromContent();
  }, [message.content]);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getToolIcon = (tool: string) => {
    if (tool?.includes('sql') || tool?.includes('query')) return <Database className="w-4 h-4" />;
    if (tool?.includes('search') || tool?.includes('find')) return <Search className="w-4 h-4" />;
    if (tool?.includes('table') || tool?.includes('details')) return <FileText className="w-4 h-4" />;
    return <Terminal className="w-4 h-4" />;
  };

  const formatToolInput = (input: any) => {
    // Handle string input that might be JSON
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        input = parsed;
      } catch {
        return input;
      }
    }
    
    if (input?.query) {
      // Format SQL query with syntax highlighting
      return (
        <pre className="language-sql whitespace-pre-wrap break-all">
          <code>{input.query}</code>
        </pre>
      );
    }
    if (input?.project_name) return `Project: ${input.project_name}`;
    if (input?.table_name) return `Table: ${input.table_name}`;
    if (input?.search_term) return `Search: ${input.search_term}`;
    return JSON.stringify(input, null, 2);
  };

  const formatToolOutput = (output: any) => {
    try {
      const parsed = typeof output === 'string' ? JSON.parse(output) : output;
      
      // Handle MCP response format
      if (parsed.content && Array.isArray(parsed.content)) {
        const textContent = parsed.content.find((c: any) => c.type === 'text');
        if (textContent?.text) {
          // Try to parse the text as JSON
          try {
            const data = JSON.parse(textContent.text);
            if (data.rows) {
              return formatToolOutput(data);
            }
          } catch {
            // Display as text
            return <div className="text-sm text-gray-300 whitespace-pre-wrap">{textContent.text.substring(0, 500)}</div>;
          }
        }
      }
      
      // Handle SQL query results
      if (parsed.rows && Array.isArray(parsed.rows)) {
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              Query executed successfully ({parsed.rows.length} rows):
            </div>
            {parsed.rows.slice(0, 3).map((row: any, idx: number) => (
              <div key={idx} className="bg-gray-900 p-2 rounded text-xs space-y-1">
                <div className="text-gray-400 font-medium">Row {idx + 1}:</div>
                {Object.entries(row).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-gray-500 min-w-[100px]">{key}:</span>
                    <span className="text-gray-200 font-mono break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value).substring(0, 50)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }
      
      // Handle text output
      if (typeof parsed === 'string') {
        return <div className="text-sm text-gray-300 whitespace-pre-wrap">{parsed.substring(0, 500)}</div>;
      }
      
      return <pre className="text-xs text-gray-300 overflow-x-auto">{JSON.stringify(parsed, null, 2).substring(0, 500)}</pre>;
    } catch {
      // If it's not JSON, display as text
      const text = String(output);
      if (text.length > 500) {
        return <div className="text-sm text-gray-300 whitespace-pre-wrap">{text.substring(0, 500)}...</div>;
      }
      return <div className="text-sm text-gray-300 whitespace-pre-wrap">{text}</div>;
    }
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''} mb-6`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          message.role === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
        }`}>
          {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-200">
            {message.role === 'user' ? 'You' : 'MCP Assistant'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* User Message */}
        {message.role === 'user' && (
          <div className="rounded-lg bg-blue-900/30 border border-blue-800/50 p-4">
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Assistant Message */}
        {message.role === 'assistant' && (
          <div className="space-y-3">
            {/* Thinking Indicator - Show when streaming */}
            {isStreaming && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/50 p-4">
                <div className="flex flex-col gap-2">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-purple-400 animate-pulse" />
                    <div className="text-sm font-medium text-purple-300">
                      Processing Query...
                    </div>
                  </div>
                  
                  {/* Progress bar for steps */}
                  <div className="w-full">
                    {executionSteps && executionSteps.length > 0 ? (
                      <>
                        <div className="text-xs text-gray-400 mb-2">
                          Step {executionSteps.filter(s => s.type === 'thought' || s.type === 'action').length} of ~10
                        </div>
                        <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (executionSteps.filter(s => s.type === 'thought' || s.type === 'action').length / 10) * 100)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Initializing...
                      </div>
                    )}
                  </div>
                  
                  {/* Current step display */}
                  <div className="flex items-center gap-2">
                    {executionSteps && executionSteps.length > 0 && (() => {
                      const relevantSteps = executionSteps.filter(s => s.type === 'thought' || s.type === 'action');
                      const latestStep = relevantSteps[relevantSteps.length - 1];
                      const stepNum = relevantSteps.length;
                      
                      if (!latestStep) return null;
                      
                      return (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-800/30 border border-purple-600/50 text-sm">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          <span className="font-medium text-purple-300">Step {stepNum}:</span>
                          <span className="text-purple-200">
                            {latestStep.type === 'thought' 
                              ? latestStep.thought?.substring(0, 60) + '...'
                              : `Executing ${latestStep.tool}`}
                          </span>
                        </div>
                      );
                    })()}
                    
                    {/* Show initial message if no steps yet */}
                    {(!executionSteps || executionSteps.length === 0) && (
                      <div className="text-xs text-purple-400/70">
                        Using ReAct framework to analyze your query...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Execution Pipeline - Show FIRST */}
            {executionSteps && executionSteps.length > 0 && (
              <div>
            <button
              onClick={() => setShowExecution(!showExecution)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-2"
            >
              {showExecution ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Network className="w-4 h-4" />
              <span>Execution Pipeline</span>
              <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full">
                {executionSteps.length} steps
              </span>
            </button>

            <AnimatePresence>
              {showExecution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {/* Step Counter */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 bg-gray-900/30 p-2 rounded">
                    <div className="flex items-center gap-1">
                      <Network className="w-3 h-3" />
                      <span>{executionSteps.filter(s => s.type === 'action').length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{executionSteps.filter(s => s.type === 'result').length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{executionSteps.filter(s => s.status === 'running').length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{executionSteps.filter(s => s.status === 'completed').length}</span>
                    </div>
                  </div>

                  {/* Execution Steps */}
                  {executionSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/20"
                    >
                      {/* Step Header */}
                      <button
                        onClick={() => toggleStep(index)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-900/40 transition-colors"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          step.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                          step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {step.status === 'running' ? 
                            <Loader2 className="w-3 h-3 animate-spin" /> :
                            step.status === 'completed' ? 
                            <Check className="w-3 h-3" /> :
                            <span className="text-xs">{index + 1}</span>
                          }
                        </div>
                        
                        <div className="flex-1 flex items-center gap-2 text-left">
                          {step.type === 'thought' && (
                            <>
                              <span className="text-xs font-medium text-gray-400">💭 Step {step.stepNumber}</span>
                              <span className="text-sm text-gray-200 italic">
                                {step.thought?.substring(0, 100)}{step.thought && step.thought.length > 100 ? '...' : ''}
                              </span>
                            </>
                          )}
                          {step.type === 'action' && (
                            <>
                              <span className="text-xs font-medium text-purple-400">action</span>
                              <span className="text-sm text-gray-200">
                                Executing {step.tool}
                              </span>
                              {step.tool && getToolIcon(step.tool)}
                            </>
                          )}
                          {step.type === 'result' && (
                            <>
                              <span className="text-xs font-medium text-green-400">result</span>
                              <span className="text-sm text-gray-200">Response received</span>
                            </>
                          )}
                        </div>
                        
                        {expandedSteps.has(index) ? 
                          <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        }
                      </button>

                      {/* Step Details */}
                      <AnimatePresence>
                        {expandedSteps.has(index) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-gray-800"
                          >
                            {step.type === 'thought' && step.thought && (
                              <div className="p-3 bg-gray-950/50">
                                <div className="text-xs text-gray-500 mb-2">Reasoning:</div>
                                <div className="text-sm text-gray-300 bg-gray-900 p-3 rounded">
                                  {step.thought}
                                </div>
                              </div>
                            )}
                            {step.type === 'action' && step.input && (
                              <div className="p-3 bg-gray-950/50">
                                {step.thought && (
                                  <>
                                    <div className="text-xs text-gray-500 mb-2">Reasoning:</div>
                                    <div className="text-sm text-gray-300 bg-gray-900 p-2 rounded mb-3 italic">
                                      {step.thought}
                                    </div>
                                  </>
                                )}
                                <div className="text-xs text-gray-500 mb-2">Input:</div>
                                <div className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                                  {formatToolInput(step.input)}
                                </div>
                              </div>
                            )}
                            {step.type === 'result' && step.output && (
                              <div className="p-3 bg-gray-950/50">
                                <div className="text-xs text-gray-500 mb-2">Output:</div>
                                <div className="text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                                  {formatToolOutput(step.output)}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {/* Total Steps Counter */}
                  <div className="text-xs text-gray-500 text-right">
                    Total Steps: {executionSteps.length}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
              </div>
            )}
            
            {/* Summary/Content - Show AFTER execution */}
            {message.content && (
              <div className="rounded-lg bg-gray-900/30 border border-gray-800/50 p-4">
                <FormattedSummary content={message.content} />
                
                {/* Additional Extracted Data Display */}
                {queryData && queryData.length > 0 && (
                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <EnhancedSummary data={queryData} />
                  </div>
                )}
              </div>
            )}
            
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}