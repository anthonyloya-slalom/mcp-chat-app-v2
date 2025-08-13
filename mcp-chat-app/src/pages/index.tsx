import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Toaster, toast } from 'react-hot-toast';
import ClaudeMessageEnhanced from '../components/ClaudeMessageEnhanced';
import { useConversationStore } from '../lib/store';
import { Message } from '../lib/types';
import { cn } from '../lib/utils';
import { 
  Send, 
  Sparkles,
  Database,
  Search,
  FileSearch,
  Loader2,
  Plus,
  Settings,
  History
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

export default function Home() {
  const {
    messages,
    currentProvider,
    isProcessing,
    addMessage,
    updateMessage,
    setProcessing,
    clearMessages,
  } = useConversationStore();
  
  const [inputValue, setInputValue] = useState('');
  const [executionSteps, setExecutionSteps] = useState<Map<string, ExecutionStep[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, executionSteps]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setInputValue('');
    
    setProcessing(true);
    
    // Create assistant message placeholder
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thoughts: [],
    };
    addMessage(assistantMessage);
    
    // Initialize execution steps
    const steps: ExecutionStep[] = [];
    setExecutionSteps(prev => new Map(prev).set(assistantId, steps));
    
    // Check if user wants streaming (can add a toggle later)
    const useStreaming = true; // Enable streaming for real-time step display
    
    if (useStreaming) {
      try {
        // Use streaming endpoint with conversation history
        const response = await fetch('/api/mcp-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            input: content,
            provider: currentProvider,
            conversationHistory: messages.slice(-6) // Send last 6 messages for context
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process message');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body');
        }
        
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7).trim();
              const nextLine = lines[i + 1];
              
              if (nextLine?.startsWith('data: ')) {
                try {
                  const data = JSON.parse(nextLine.slice(6));
                  console.log(`📡 SSE Event: ${eventType}`, data);
                  
                  // Handle different event types
                  if (eventType === 'action') {
                    console.log(`🎯 Action Step ${data.stepNumber}: ${data.tool}`, data);
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current];
                      
                      // Add action step
                      newSteps.push({
                        type: 'action',
                        tool: data.tool,
                        input: data.input,
                        thought: data.thought,
                        status: 'running',
                        stepNumber: data.stepNumber
                      });
                      
                      console.log('Updated execution steps after action:', newSteps);
                      return new Map(prev).set(assistantId, newSteps);
                    });
                  } else if (eventType === 'observation') {
                    console.log(`📊 Observation received for ${data.tool}`);
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current];
                      // Update last action to completed
                      if (newSteps.length > 0 && newSteps[newSteps.length - 1].type === 'action') {
                        newSteps[newSteps.length - 1].status = 'completed';
                      }
                      // Add result
                      newSteps.push({
                        type: 'result',
                        output: data.result,
                        status: 'completed'
                      });
                      return new Map(prev).set(assistantId, newSteps);
                    });
                  } else if (eventType === 'final') {
                    console.log(`✅ Final answer received (${data.answer?.length || 0} chars)`);
                    updateMessage(assistantId, {
                      content: data.answer,
                    });
                  } else if (eventType === 'thinking') {
                    console.log(`💭 Thinking Step ${data.stepNumber}: ${data.thought}`);
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current, {
                        type: 'thought',
                        thought: data.thought,
                        status: 'completed',
                        stepNumber: data.stepNumber
                      }];
                      console.log('Updated execution steps:', newSteps);
                      return new Map(prev).set(assistantId, newSteps);
                    });
                    // Also update the message to show the thought
                    updateMessage(assistantId, {
                      content: data.message || 'Processing...',
                    });
                  } else if (eventType === 'step') {
                    console.log(`📍 Step ${data.stepNumber}: ${data.message}`);
                    // Show thinking/processing status
                    updateMessage(assistantId, {
                      content: data.message || 'Processing...',
                    });
                  } else if (eventType === 'start') {
                    console.log(`🚀 Streaming started for: ${data.input}`);
                  } else if (eventType === 'error') {
                    console.error(`❌ Error:`, data);
                  }
                  i++; // Skip the data line we just processed
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        // Fall back to non-streaming endpoint
        await handleNonStreamingMessage(content, assistantId);
      }
    } else {
      await handleNonStreamingMessage(content, assistantId);
    }
    
    setProcessing(false);
  };
  
  const handleNonStreamingMessage = async (content: string, assistantId: string) => {
    try {
      // Show initial "thinking" status
      setExecutionSteps(prev => new Map(prev).set(assistantId, [{
        type: 'action',
        tool: 'Thinking',
        input: { message: 'Processing your request...' },
        status: 'running'
      }]));
      
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          input: content,
          provider: currentProvider 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process message');
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get response');
      }
      
      // Parse execution steps from API response with animation delay
      if (result.steps && Array.isArray(result.steps)) {
        const parsedSteps: ExecutionStep[] = [];
        
        // Add steps progressively with a small delay for visual effect
        for (let i = 0; i < result.steps.length; i++) {
          const step = result.steps[i];
          
          // Add action step
          if (step.action) {
            parsedSteps.push({
              type: 'action',
              tool: step.action.tool,
              input: step.action.toolInput,
              status: i === result.steps.length - 1 ? 'completed' : 'completed'
            });
            
            // Update UI immediately
            setExecutionSteps(prev => new Map(prev).set(assistantId, [...parsedSteps]));
            
            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Add observation/result step
          if (step.observation) {
            parsedSteps.push({
              type: 'result',
              output: step.observation,
              status: 'completed'
            });
            
            // Update UI immediately
            setExecutionSteps(prev => new Map(prev).set(assistantId, [...parsedSteps]));
            
            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      // Update message with formatted content from API
      updateMessage(assistantId, {
        content: result.output || 'I encountered an error processing your request.',
      });
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send message. Please check your API keys.');
      
      updateMessage(assistantId, {
        content: 'I encountered an error processing your request. Please make sure the API keys are configured correctly.',
        error: String(error),
      });
    }
  };
  
  const exampleQueries = [
    { 
      icon: <Database className="w-4 h-4" />, 
      text: 'Find the top 3 delegates by voting power',
      description: 'Query delegate rankings'
    },
    { 
      icon: <FileSearch className="w-4 h-4" />, 
      text: 'What are the latest proposals executed?',
      description: 'View recent governance proposals'
    },
    { 
      icon: <Search className="w-4 h-4" />, 
      text: 'Show me the largest deposits this week',
      description: 'Track deposit activity'
    },
  ];
  
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <Head>
        <title>MCP SQL Chat</title>
        <meta name="description" content="Advanced SQL chat with Model Context Protocol" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid #374151',
          },
        }}
      />
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">MCP Assistant</h1>
              <span className="text-xs text-gray-500">
                Claude-style UI
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
              <History className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                clearMessages();
                setExecutionSteps(new Map());
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
          </div>
        </div>
      </header>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to MCP Assistant</h2>
              <p className="text-gray-400 text-center max-w-md mb-8">
                Query your database using natural language with Claude-style UI. I'll provide clear summaries and show you the data.
              </p>
              
              {/* Example Queries */}
              <div className="w-full max-w-2xl space-y-2">
                <p className="text-xs text-gray-500 mb-3">Try an example</p>
                {exampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(query.text)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-800 hover:bg-gray-900/50 transition-all group text-left"
                  >
                    <div className="p-2 rounded-lg bg-gray-800 group-hover:bg-gray-700">
                      {query.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{query.text}</p>
                      <p className="text-xs text-gray-500">{query.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ClaudeMessageEnhanced
                  key={message.id}
                  message={message}
                  isStreaming={isProcessing && index === messages.length - 1}
                  executionSteps={
                    message.role === 'assistant' ? executionSteps.get(message.id) : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              placeholder="Message MCP Assistant..."
              disabled={isProcessing}
              rows={1}
              className={cn(
                "w-full px-4 py-3 pr-12 bg-gray-800 rounded-lg",
                "placeholder:text-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-purple-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "resize-none min-h-[48px] max-h-[200px]",
                "text-sm text-gray-100"
              )}
              style={{
                height: 'auto',
                overflowY: inputValue.split('\n').length > 5 ? 'auto' : 'hidden',
              }}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isProcessing || !inputValue.trim()}
              className={cn(
                "absolute right-2 bottom-2 p-2 rounded-md",
                "transition-all",
                isProcessing || !inputValue.trim()
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-purple-400 hover:bg-gray-700"
              )}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </p>
            <p className="text-xs text-gray-500">
              {currentProvider === 'claude' ? 'Claude 3 Opus' : 'GPT-4'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}