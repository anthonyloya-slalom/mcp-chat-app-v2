import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Toaster, toast } from 'react-hot-toast';
import ChatMessage from '../components/ChatMessage';
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
  History,
  Bot,
  User
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
                        type: 'thought' as const,
                        thought: data.thought,
                        status: 'completed' as const,
                        stepNumber: data.stepNumber
                      }];
                      console.log('Updated execution steps:', newSteps);
                      return new Map(prev).set(assistantId, newSteps);
                    });
                    // Also update the message to show the thought
                    updateMessage(assistantId, {
                      content: data.message || 'Tilt AI is thinking...',
                    });
                  } else if (eventType === 'step') {
                    console.log(`📍 Step ${data.stepNumber}: ${data.message}`);
                    // Show thinking/processing status
                    updateMessage(assistantId, {
                      content: data.message || 'Tilt AI is thinking...',
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
        input: { message: 'Tilt AI is thinking...' },
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
      text: 'How common is it to have intermittent vs continuous caregiving leaves?',
      description: 'Analyze caregiving leave patterns'
    },
    { 
      icon: <FileSearch className="w-4 h-4" />, 
      text: 'What is the typical duration of a caregiving leave for us?',
      description: 'Get duration statistics'
    },
    { 
      icon: <Search className="w-4 h-4" />, 
      text: 'How are intermittent vs continuous leaves trending over the past year?',
      description: 'Analyze leave trends'
    },
  ];
  
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-950 via-orange-950/20 to-gray-950">
      <Head>
        <title>MCP Chat Assistant</title>
        <meta name="description" content="Advanced chat with Model Context Protocol" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'linear-gradient(to right, #7c2d12, #ea580c)',
            color: '#e2e8f0',
            border: '1px solid rgba(241, 93, 74, 0.2)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
      
      {/* Header */}
      <header className="relative z-10 bg-black/40 backdrop-blur-xl border-b border-orange-500/10">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 via-transparent to-red-600/5"></div>
        <div className="relative container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl blur-lg opacity-60"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">MCP Assistant</h1>
              <p className="text-xs text-orange-300/60">Powered by Claude & Snowflake</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <History className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                clearMessages();
                setExecutionSteps(new Map());
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 hover:text-white transition-all backdrop-blur-sm border border-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>
      </header>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl blur-2xl opacity-40"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Welcome to MCP Assistant
              </h2>
              <p className="text-gray-400 text-center max-w-md mb-10">
                Query your Snowflake database using natural language. I'll help analyze your leave data with clear insights.
              </p>
              
              {/* Example Queries */}
              <div className="w-full max-w-2xl space-y-3">
                <p className="text-sm text-orange-400/60 mb-4 font-medium">Try an example:</p>
                {exampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(query.text)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-orange-500/20 hover:border-orange-500/40 transition-all group"
                  >
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-600/20 to-red-600/20 group-hover:from-orange-600/30 group-hover:to-red-600/30 transition-all">
                      {query.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-200">{query.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{query.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={message.id} className={cn(
                  "flex gap-4",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl blur opacity-60"></div>
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-5 py-4 shadow-xl",
                    message.role === 'user' 
                      ? "bg-gradient-to-r from-[#F15D4A] to-orange-600 text-white"
                      : "bg-white/10 backdrop-blur-lg text-gray-100 border border-orange-500/20"
                  )}>
                    <div className="whitespace-pre-wrap break-words">
                      {message.content || (isProcessing && index === messages.length - 1 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                            <span className="text-orange-300">Tilt AI is thinking...</span>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      ) : '')}
                    </div>
                    
                    {/* Execution steps hidden - no longer showing chain of thought */}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg border border-gray-700">
                        <User className="w-6 h-6 text-gray-300" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="relative z-10 bg-black/40 backdrop-blur-xl border-t border-orange-500/10">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 via-transparent to-red-600/5"></div>
        <div className="relative container mx-auto max-w-4xl px-4 py-5">
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
              placeholder="Ask about your leave data..."
              disabled={isProcessing}
              rows={1}
              className={cn(
                "w-full px-5 py-3.5 pr-14",
                "bg-white/10 backdrop-blur-lg",
                "text-white placeholder:text-gray-500",
                "rounded-xl border border-orange-500/20",
                "focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "resize-none min-h-[52px] max-h-[200px]",
                "text-sm"
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
                "absolute right-3 bottom-3 p-2.5 rounded-lg",
                "transition-all duration-200",
                isProcessing || !inputValue.trim()
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-white bg-gradient-to-r from-[#F15D4A] to-orange-600 hover:from-orange-600 hover:to-[#F15D4A] shadow-lg"
              )}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              Press Enter to send • Shift+Enter for new line
            </p>
            <div className="flex items-center gap-2 text-xs text-orange-400/60">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Connected to Snowflake
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}