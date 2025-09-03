import { useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import styles from './MessageInputArea.module.css';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

interface MessageInputAreaProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSendMessage: (content: string) => void;
  isProcessing: boolean;
}

export default function MessageInputArea({
  inputValue,
  setInputValue,
  handleSendMessage,
  isProcessing,
}: MessageInputAreaProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={styles.wrapper}>
      <div className={styles.gradientBg}></div>
      <div className={styles.innerContainer}>
        <div className={styles.inputContainer}>
          <TextField
            inputRef={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
            placeholder="Ask a detailed question..."
            disabled={isProcessing}
            multiline
            minRows={1}
            maxRows={8}
            variant="outlined"
            fullWidth
            InputProps={{
              className: styles.textarea,
              style: {
                height: 'auto',
                overflowY: inputValue.split('\n').length > 5 ? 'auto' : 'hidden',
              },
            }}
          />
          <IconButton
            onClick={() => handleSendMessage(inputValue)}
            disabled={isProcessing || !inputValue.trim()}
            className={styles.sendButton}
            aria-label="Send message"
            size="large"
          >
            {isProcessing ? (
              <Loader2 className={styles.iconSpin} />
            ) : (
              <Send className={styles.icon} />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
