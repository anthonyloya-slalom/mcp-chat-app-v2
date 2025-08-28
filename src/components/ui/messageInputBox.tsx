import { useRef } from 'react';
import { cn } from '../../lib/utils';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputBoxProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSendMessage: (content: string) => void;
  isProcessing: boolean;
}

export default function MessageInputBox({ inputValue, setInputValue, handleSendMessage, isProcessing }: MessageInputBoxProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
  <div className="relative z-10 bg-white border-t border-purple-500/10">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-purple-400/5"></div>
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
            placeholder="Ask a detailed question..."
            disabled={isProcessing}
            rows={1}
            className={cn(
              "w-full px-5 py-3.5 pr-14",
              "bg-white/10 backdrop-blur-lg",
              "text-black placeholder:text-gray-500",
              "rounded-xl border border-purple-500/20",
              "focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
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
                : "text-white bg-gradient-to-r from-[#a78bfa] to-purple-600 hover:from-purple-600 hover:to-[#a78bfa] shadow-lg"
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
