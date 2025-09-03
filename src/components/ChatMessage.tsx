import { useState, useEffect } from 'react';
import { Message } from '../lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import ChainOfThought from './ChainOfThought';

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

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  executionSteps?: ExecutionStep[];
  onRetryStep?: (stepIndex: number) => void;
}

export default function ChatMessage({ 
  message, 
  isStreaming, 
  executionSteps,
  onRetryStep 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [queryData, setQueryData] = useState<any>(null);
  
  // Auto-expand running steps
  useEffect(() => {
    if (executionSteps && isStreaming) {
      const runningStepIndices = executionSteps
        .map((step, index) => step.status === 'running' ? index : -1)
        .filter(index => index !== -1);
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
        const matches = Array.from(message.content.matchAll(pattern));
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
      const ctxMatches = Array.from(message.content.matchAll(ctxPattern));
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            return <div className="text-sm text-black whitespace-pre-wrap">{textContent.text.substring(0, 500)}</div>;
          }
        }
      }
      
      // Handle SQL query results
      if (parsed.rows && Array.isArray(parsed.rows)) {
        return (
          <div className="space-y-2">
            <div className="text-xs text-black">
              Query executed successfully ({parsed.rows.length} rows):
            </div>
            {parsed.rows.slice(0, 3).map((row: any, idx: number) => (
              <div key={idx} className="bg-gray-900 p-2 rounded text-xs space-y-1">
                <div className="text-black font-medium">Row {idx + 1}:</div>
                {Object.entries(row).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-black min-w-[100px]">{key}:</span>
                    <span className="text-black font-mono break-all">
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
        return <div className="text-sm text-black whitespace-pre-wrap">{parsed.substring(0, 500)}</div>;
      }
      
    return <pre className="text-xs text-black overflow-x-auto">{JSON.stringify(parsed, null, 2).substring(0, 500)}</pre>;
      } catch {
        // If it's not JSON, display as text
        const text = String(output);
        if (text.length > 500) {
          return <div className="text-sm text-black whitespace-pre-wrap">{text.substring(0, 500)}...</div>;
        }
        return <div className="text-sm text-black whitespace-pre-wrap">{text}</div>;
      }
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`${message.role === 'user' ? 'max-w-[70%]' : 'max-w-[85%] w-full'}`}>
        {message.role === 'user' && (
          <div className="rounded-2xl bg-purple-600 text-white px-5 py-4 shadow-xl">
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {message.role === 'assistant' && (
          <div className="space-y-3 text-black">
            {executionSteps && executionSteps.length > 0 && (
              <ChainOfThought 
                steps={executionSteps} 
                isStreaming={isStreaming}
                onRetry={onRetryStep}
              />
            )}
            
            {message.content && (
              <div className="rounded-2xl bg-white/10 backdrop-blur-lg text-black border border-purple-500/20 px-5 py-4 shadow-xl">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm max-w-none text-black"
                >
                  {message.content}
                </ReactMarkdown>
                {queryData && queryData.length > 0 && (
                  <div className="mt-4 border-t border-purple-300 pt-4">
                    <div className="space-y-2">
                      {queryData.map((item: any, idx: number) => (
                        <div key={idx} className="text-sm text-black">
                          <span className="text-purple-700">{item.address}:</span> {item.amount} CTX
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!isStreaming && (
                  <button
                    onClick={handleCopy}
                    className="mt-2 p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Copy message"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}