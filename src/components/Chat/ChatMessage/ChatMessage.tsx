import { useState, useEffect } from 'react';
import { Message } from '../../../lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChainOfThought from '../ChainOfThought/ChainOfThought';
import styles from './ChatMessage.module.css';

interface ExecutionStep {
  type: 'action' | 'result' | 'thought' | 'error';
  tool?: string;
  input?: any;
  output?: any;
  thought?: string;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  executionSteps?: ExecutionStep[];
}

export default function ChatMessage({ 
  message, 
  isStreaming, 
  executionSteps
}: ChatMessageProps) {
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
    if (executionSteps && executionSteps.length > 0) {
      for (const step of executionSteps) {
        if (step.type === 'result' && step.output) {
          try {
            const data = typeof step.output === 'string' 
              ? JSON.parse(step.output) 
              : step.output;
            if (data.rows && Array.isArray(data.rows)) {
              setQueryData(data.rows);
              break;
            } else if (data.content && Array.isArray(data.content)) {
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
          } catch {
            // Not JSON, continue to next step
          }
        }
      }
    }
  }, [executionSteps]);

  const extractDataFromContent = () => {
    if (!queryData && message.content) {
      const extractedData: any[] = [];
      const pattern1 = /(?:Delegate\s+)?(0x[a-fA-F0-9]{40})[^\n]*?(?:maximum balance of|with|balance of)\s*([0-9.E+\-]+|\d+(?:,\d+)*(?:\.\d+)?)/gi;
      const pattern2 = /(0x[a-fA-F0-9]{40})[^\n]*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:CTX|votes|tokens)/gi;
      const pattern3 = /(0x[a-fA-F0-9]{40})[^\n]*?([0-9]+\.?[0-9]*[Ee][+\-]?[0-9]+)/gi;
      for (const pattern of [pattern1, pattern2, pattern3]) {
        const matches = Array.from(message.content.matchAll(pattern));
        for (const match of matches) {
          const address = match[1];
          let amountStr = match[2].replace(/,/g, '');
          let amount = parseFloat(amountStr);
          if (amount > 1e15) {
            amount = amount / 1e18;
          }
          const existing = extractedData.find(d => d.address === address);
          if (!existing && !isNaN(amount)) {
            extractedData.push({
              address,
              amount
            });
          }
        }
      }
      const ctxPattern = /(0x[a-fA-F0-9]{40})[^\n]*?([\d,]+(?:\.\d+)?)\s*CTX/gi;
      const ctxMatches = Array.from(message.content.matchAll(ctxPattern));
      for (const match of ctxMatches) {
        const address = match[1];
        const amount = parseFloat(match[2].replace(/,/g, ''));
        const existing = extractedData.find(d => d.address === address);
        if (!existing && !isNaN(amount)) {
          extractedData.push({
            address,
            amount
          });
        }
      }
      if (extractedData.length > 0) {
        extractedData.sort((a, b) => b.amount - a.amount);
        setQueryData(extractedData.slice(0, 3));
      }
    }
  };

  useEffect(() => {
    extractDataFromContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.content]);

  const hasError = executionSteps?.some(step => step.type === 'error' || step.status === 'error');

  return (
    <div
      className={
        `${styles.root} ` +
        (message.role === 'user' ? styles.justifyEnd : styles.justifyStart)
      }
    >
      <div className={message.role === 'user' ? styles.maxWidthUser : styles.maxWidthAssistant}>
        {message.role === 'user' && (
          <div className={styles.userBubble}>
            <div className={styles.userMarkdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {message.role === 'assistant' && (
          <div className={styles.assistantContainer}>
            {executionSteps && executionSteps.length > 0 && (
              <ChainOfThought 
                steps={executionSteps} 
                isStreaming={isStreaming}
              />
            )}
            {message.content && (
              <div className={styles.assistantBubble}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  className={styles.assistantMarkdown}
                >
                  {hasError ? "An error occurred." : message.content}
                </ReactMarkdown>
                {queryData && queryData.length > 0 && (
                  <div className={styles.queryDataSection}>
                    <div className={styles.queryDataList}>
                      {queryData.map((item: any, idx: number) => (
                        <div key={idx} className={styles.queryDataItem}>
                          <span className={styles.queryDataAddress}>{item.address}:</span> {item.amount} CTX
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}