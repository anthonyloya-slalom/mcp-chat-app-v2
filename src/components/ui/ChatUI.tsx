import { useState, useEffect, useRef } from 'react';
import { useConversationStore } from '../../lib/store';
import { Message } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Loader2, Bot, User } from 'lucide-react';
import PromptBubble from './promptBubble';
import MessageInputBox from './messageInputBox';
import Greeting from './greeting';

interface ExecutionStep {
  type: 'action' | 'result' | 'thought';
  tool?: string;
  input?: any;
  output?: any;
  thought?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  stepNumber?: number;
}

interface ChatUIProps {
  isEmbedded?: boolean;
}

export default function ChatUI({ isEmbedded }: ChatUIProps) {
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    setExecutionSteps(prev => new Map(prev).set(assistantId, []));
    // ...existing streaming and non-streaming logic from chatBot.tsx...
    setProcessing(false);
  };

  const exampleQueries = [
    { text: 'How common is it to have intermittent vs continuous caregiving leaves?' },
    { text: 'What is the typical duration of a caregiving leave for us?' },
    { text: 'How are intermittent vs continuous leaves trending over the past year?' },
  ];

  return (
    <div className={cn('flex flex-col', isEmbedded ? 'h-full' : 'h-screen', 'bg-white')}>
      {!isEmbedded && <div className="py-2 px-4 font-bold text-lg">Tilt Chat Bot</div>}
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
                <div key={message.id} className={cn(
                  'flex gap-4',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center shadow-lg">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[70%] rounded-2xl px-5 py-4 shadow-xl',
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 backdrop-blur-lg text-black border border-purple-500/20'
                  )}>
                    <div className="whitespace-pre-wrap break-words">
                      {message.content || (isProcessing && index === messages.length - 1 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span className="text-black">Tilt AI is thinking...</span>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      ) : '')}
                    </div>
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
      <MessageInputBox
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
}
