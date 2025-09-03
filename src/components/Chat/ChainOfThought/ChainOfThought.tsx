import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './ChainOfThought.module.css';

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

  if (steps.some((step: ExecutionStep) => step.tool === 'web_search')) return null;

  useEffect(() => {
    if (steps) {
      const newExpanded = new Set<number>();
      steps.forEach((step, index) => {
        if (step.status === 'running') {
          newExpanded.add(index);
        } else if (expandedSteps.has(index) && step.status !== 'completed') {
          newExpanded.add(index);
        } else if (step.status === 'error') {
          newExpanded.add(index);
        }
      });
      setExpandedSteps(newExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      return <span style={{ color: '#f87171', fontSize: '1rem' }}>✗</span>;
    }
    switch (step.status) {
      case 'running':
        return <span className={styles.loadingIcon} style={{ fontSize: '1rem' }}>○</span>;
      case 'completed':
        return <span style={{ color: '#22c55e', fontSize: '1rem' }}>✓</span>;
      case 'pending':
      default:
        return <span style={{ color: '#6b7280', fontSize: '1rem' }}>○</span>;
    }
  };

  const getStepTitle = (step: ExecutionStep) => {
    if (step.type === 'error') {
      return `Error: ${step.error?.substring(0, 80) || 'Unknown error'}`;
    }
    if (step.tool) {
      return `${step.tool}`;
    }
    if (step.type === 'thought' && step.thought) {
      return step.thought.substring(0, 100) + (step.thought.length > 100 ? '...' : '');
    }
    return 'Processing step';
  };

  const formatInput = (input: any) => {
    if (!input) return null;
    if (typeof input === 'string') {
      return <div className={styles.inputText}>{input}</div>;
    }
    return (
      <pre className={styles.inputText}>
        {JSON.stringify(input, null, 2)}
      </pre>
    );
  };

  const formatOutput = (output: any) => {
    if (!output) return null;
    try {
      const parsed = typeof output === 'string' ? JSON.parse(output) : output;
      if (parsed.content && Array.isArray(parsed.content)) {
        const textContent = parsed.content.find((c: any) => c.type === 'text');
        if (textContent?.text) {
          return (
            <div className={styles.outputText}>
              {textContent.text.substring(0, 500)}
              {textContent.text.length > 500 && '...'}
            </div>
          );
        }
      }
      if (parsed.rows && Array.isArray(parsed.rows)) {
        return (
          <div>
            <div className={styles.outputText}>
              Result received ({parsed.rows.length} rows)
            </div>
            {parsed.rows.length > 0 && (
              <div className={styles.outputText}>
                Preview: {JSON.stringify(parsed.rows[0], null, 2).substring(0, 200)}...
              </div>
            )}
          </div>
        );
      }
      return (
        <pre className={styles.outputText}>
          {JSON.stringify(parsed, null, 2).substring(0, 500)}
        </pre>
      );
    } catch {
      const text = String(output);
      return (
        <div className={styles.outputText}>
          {text.substring(0, 500)}
          {text.length > 500 && '...'}
        </div>
      );
    }
  };

  const totalSteps = steps.filter(s => s.stepNumber !== 0).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div
        className={styles.header}
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
      >
        <div className={styles.headerContent}>
          <span className={styles.headerIcon}>
            {isSectionExpanded ? (
              <ChevronDown width={16} height={16} />
            ) : (
              <ChevronRight width={16} height={16} />
            )}
          </span>
          <div className={styles.headerTitle}>
            View processing steps ({totalSteps})
          </div>
        </div>
      </div>

      {isSectionExpanded && (
        <div className={styles.stepsSection}>
          {steps.map((step, index) => {
            const isExpanded = expandedSteps.has(index);
            return (
              <div key={index}>
                <div
                  className={styles.stepRow}
                  onClick={() => toggleStep(index)}
                >
                  <span className={styles.stepChevron}>
                    {isExpanded ? (
                      <ChevronDown width={12} height={12} />
                    ) : (
                      <ChevronRight width={12} height={12} />
                    )}
                  </span>
                  {getStepIcon(step)}
                  <div className={styles.stepTitle}>
                    {getStepTitle(step)}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className={styles.expandedContent}>
                    {step.tool && step.input && (
                      <div className={styles.inputOutputBlock}>
                        <div className={styles.inputOutputInner}>
                          <span>{formatInput(step.input)}</span>
                        </div>
                      </div>
                    )}
                    {step.output && (
                      <div className={styles.inputOutputBlock}>
                        <div className={styles.inputOutputInner}>
                          <span>{formatOutput(step.output)}</span>
                        </div>
                      </div>
                    )}
                    {step.type === 'thought' && step.thought && (
                      <div className={styles.thoughtText}>
                        {step.thought}
                      </div>
                    )}

                    {/* Error display */}
                    {(step.type === 'error' || step.status === 'error') && (
                      <div className={styles.errorBlock}>
                        <div className={styles.errorTitle}>
                          Error occurred
                        </div>
                        <div className={styles.errorDetails}>
                          {step.error || 'An unexpected error occurred'}
                        </div>
                        {onRetry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(index);
                            }}
                            className={styles.retryButton}
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
        <div className={styles.loadingRow}>
          <span className={styles.loadingIcon}>○</span>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}