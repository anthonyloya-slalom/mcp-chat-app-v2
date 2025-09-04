import { useState } from 'react';
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

export default function ChainOfThought({ steps, isStreaming }: ChainOfThoughtProps) {
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  if (steps.some((step: ExecutionStep) => step.tool === 'web_search')) return null;

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
      return `Error: ${step.error || 'Unknown error'}`;
    }
    if (step.tool) {
      return `${step.tool}`;
    }
    if (step.type === 'thought' && step.thought) {
      return step.thought;
    }
    return 'Processing step';
  };

  const totalSteps = steps.filter(s => s.stepNumber !== 0).length;

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
        style={{ cursor: 'pointer' }}
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
          {steps.map((step, index) => (
            <div key={index} className={styles.stepRow}>
              {getStepIcon(step)}
              <div className={styles.stepTitle}>
                {getStepTitle(step)}
              </div>
            </div>
          ))}
        </div>
      )}

      {isSectionExpanded && isStreaming && steps.length === 0 && (
        <div className={styles.loadingRow}>
          <span className={styles.loadingIcon}>○</span>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}