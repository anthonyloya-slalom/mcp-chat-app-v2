import { useState } from 'react';
import Image from 'next/image';
import ChatUI from './ChatUI';

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Floating chat icon */}
      <button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-purple-700 flex items-center justify-center shadow-lg hover:bg-purple-800 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
      >
        <Image
          src={require('../images/chatLogo.jpg')}
          alt="Chat Icon"
          width={32}
          height={32}
        />
      </button>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[350px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <ChatUI isEmbedded />
        </div>
      )}
    </>
  );
}
