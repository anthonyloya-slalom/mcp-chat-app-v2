import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useConversationStore } from '../../../lib/store';
import { Message } from '../../../lib/types';
import { cn } from '../../../lib/utils';
import { X as XIcon } from 'lucide-react';
import PromptMessageButton from '../PromptMessageButton/PromptMessageButton';
import MessageInputArea from '../MessageInputArea/MessageInputArea';
import ChatMessage from '../ChatMessage/ChatMessage';
import styles from './ChatUI.module.css';

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
    const useStreaming = true;

    if (useStreaming) {
      try {
        const response = await fetch('/api/mcp-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: content,
            provider: currentProvider,
            conversationHistory: messages.slice(-6)
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
                  if (eventType === 'action') {
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current];
                      newSteps.push({
                        type: 'action',
                        tool: data.tool,
                        input: data.input,
                        thought: data.thought,
                        status: 'running',
                        stepNumber: data.stepNumber
                      });
                      return new Map(prev).set(assistantId, newSteps);
                    });
                  } else if (eventType === 'observation') {
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current];
                      if (newSteps.length > 0 && newSteps[newSteps.length - 1].type === 'action') {
                        newSteps[newSteps.length - 1].status = 'completed';
                      }
                      newSteps.push({
                        type: 'result',
                        output: data.result,
                        status: 'completed'
                      });
                      return new Map(prev).set(assistantId, newSteps);
                    });
                  } else if (eventType === 'final') {
                    updateMessage(assistantId, {
                      content: data.answer,
                    });
                  } else if (eventType === 'thinking') {
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current, {
                        type: 'thought' as const,
                        thought: data.thought,
                        status: 'completed' as const,
                        stepNumber: data.stepNumber
                      }];
                      return new Map(prev).set(assistantId, newSteps);
                    });
                    updateMessage(assistantId, {
                      content: data.message || 'Tilt AI is thinking...',
                    });
                  } else if (eventType === 'step') {
                    updateMessage(assistantId, {
                      content: data.message || 'Tilt AI is thinking...',
                    });
                  } else if (eventType === 'start') {
                    // no-op
                  } else if (eventType === 'error') {
                    setExecutionSteps(prev => {
                      const current = prev.get(assistantId) || [];
                      const newSteps = [...current];
                      if (newSteps.length > 0) {
                        newSteps[newSteps.length - 1].status = 'error';
                      }
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
                  // ignore
                }
              }
            }
          }
        }
      } catch (error) {
        await handleNonStreamingMessage(content, assistantId);
      }
    } else {
      await handleNonStreamingMessage(content, assistantId);
    }

    setProcessing(false);
  };

  const handleNonStreamingMessage = async (content: string, assistantId: string) => {
    try {
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

      if (!result.success) {
        throw new Error(result.error || 'Failed to get response');
      }

      if (result.steps && Array.isArray(result.steps)) {
        const parsedSteps: ExecutionStep[] = [];
        for (let i = 0; i < result.steps.length; i++) {
          const step = result.steps[i];
          if (step.action) {
            parsedSteps.push({
              type: 'action',
              tool: step.action.tool,
              input: step.action.toolInput,
              status: 'completed'
            });
            setExecutionSteps(prev => new Map(prev).set(assistantId, [...parsedSteps]));
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          if (step.observation) {
            parsedSteps.push({
              type: 'result',
              output: step.observation,
              status: 'completed'
            });
            setExecutionSteps(prev => new Map(prev).set(assistantId, [...parsedSteps]));
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      updateMessage(assistantId, {
        content: result.output || 'I encountered an error processing your request.',
      });

    } catch (error) {
      toast.error('Failed to send message. Please check your API keys.');
      updateMessage(assistantId, {
        content: 'I encountered an error processing your request. Please make sure the API keys are configured correctly.',
        error: String(error),
      });
    }
  };

  const exampleQueries = [
    { text: 'What is the typical duration of a caregiving leave for our company?' },
    { text: 'Show me all pending leaves and their status' },
    { text: 'What\'s the most popular month for beginning a leave?' },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Chat with Tilda</span>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close chat"
        >
          <XIcon className={styles.closeIcon} />
        </button>
      </div>
      <div className={messages.length === 0 ? styles.bodyEmpty : styles.body}>
        <div className={styles.container}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateInner}>
                <div className={styles.emptyStateHeader}>
                  <h2 className={styles.emptyStateTitle}>Hi, I'm Tilda!</h2>
                  <p className={styles.emptyStateSubtitle}>
                    Ask me about leave insights, and I'll get you<br />
                    the info you need.
                  </p>
                </div>
                <div className={styles.promptList}>
                  <p className={styles.promptLabel}>Try asking:</p>
                  {exampleQueries.map((query, index) => (
                    <PromptMessageButton
                      key={index}
                      text={query.text}
                      onClick={() => handleSendMessage(query.text)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isProcessing && index === messages.length - 1}
                  executionSteps={executionSteps.get(message.id)}
                  onRetryStep={(stepIndex) => {
                    // TODO: Implement retry logic based on your API
                  }}
                />
              ))}
              <div ref={messagesEndRef} className={styles.messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      <MessageInputArea
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
}
