import { ReactNode } from 'react';

interface PromptBubbleProps {
  icon?: ReactNode;
  text: string;
  description?: string;
  onClick?: () => void;
}

export default function PromptBubble({ icon, text, description, onClick }: PromptBubbleProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-gray-200 hover:border-gray-300 transition-all group"
    >
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-black">{text}</p>
        {description}
      </div>
    </button>
  );
}
