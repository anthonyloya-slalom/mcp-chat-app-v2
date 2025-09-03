import styles from './PromptMessageButton.module.css';

interface PromptMessageButtonProps {
  text: string;
  description?: string;
  onClick?: () => void;
}

export default function PromptMessageButton({ text, description, onClick }: PromptMessageButtonProps) {
  return (
    <button
      onClick={onClick}
      className={styles.button}
      type="button"
    >
      <div className={styles.content}>
        <p className={styles.text}>{text}</p>
        {description}
      </div>
    </button>
  );
}
