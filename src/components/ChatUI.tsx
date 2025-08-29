import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useConversationStore } from '../lib/store';
import { Message } from '../lib/types';
import { cn } from '../lib/utils';
import { Loader2, Bot, User } from 'lucide-react';
import PromptBubble from './ui/promptBubble';
import MessageInputBox from './ui/messageInputBox';
import Greeting from './ui/greeting';
import ChatMessage from './ChatMessage';

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

interface ChatUIProps {
  onClose?: () => void;
}

export default function ChatUI({ onClose }: ChatUIProps) {
  const {
    messages,
    currentProvider,
    isProcessing,
    addMessage,
    updateMessage,
    setProcessing,
  } = useConversationStore();

  const [inputValue, setInputValue] = useState('');
  const [executionSteps, setExecutionSteps] = useState<Map<string, ExecutionStep[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, executionSteps]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isProcessing) return;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setInputValue('');
    setProcessing(true);
    
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
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current];
                      
                      // Mark last step as error if exists
                      if (newSteps.length > 0) {
                        newSteps[newSteps.length - 1].status = 'error';
                      }
                      
                      // Add error step
                      newSteps.push({
                        type: 'error',
                        error: data.error || data.message || 'An error occurred',
                        status: 'error'
                      });
                      
                      return new Map(prev).set(assistantId, newSteps);
                    });
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
    { text: 'How common is it to have intermittent vs continuous caregiving leaves?' },
    { text: 'What is the typical duration of a caregiving leave for us?' },
    { text: 'How are intermittent vs continuous leaves trending over the past year?' },
  ];

  return (
    <div className={cn('flex flex-col h-full bg-white')}>
      <div className="w-full bg-black py-3 px-5 shadow-md rounded-t-2xl flex items-center justify-between">
        <span className="text-white text-base font-semibold">Chat with Tilda</span>
          <button
            className="ml-auto w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
            onClick={onClose}
            aria-label="Close chat"
          >
            <span className="text-white text-base font-semibold">X</span>
          </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
              <Greeting />
              <div className="w-full max-w-2xl space-y-3">
                <p className="text-sm text-black mb-4 font-medium">Try asking:</p>
                {exampleQueries.map((query, index) => (
                  <PromptBubble
                    key={index}
                    text={query.text}
                    onClick={() => handleSendMessage(query.text)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isProcessing && index === messages.length - 1}
                  executionSteps={executionSteps.get(message.id)}
                  onRetryStep={(stepIndex) => {
                    console.log(`Retrying step ${stepIndex} for message ${message.id}`);
                    // TODO: Implement retry logic based on your API
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      <MessageInputBox
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
}
