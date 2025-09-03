import { useState } from 'react';
import Image from 'next/image';
import ChatUI from '../ChatUI';

export default function ChatLauncherButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open ? (
        <div className="fixed bottom-10 right-10 z-50 w-[500px] h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <ChatUI onClose={() => setOpen(false)} />
        </div>
      ) : (
        <button
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-purple-700 p-0 overflow-hidden shadow-lg hover:bg-purple-800 transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Open chat"
        >
            <Image
                src={require('../images/chatLogo.jpg')}
                alt="Chat Icon"
                fill
                style={{ objectFit: 'cover' }}
                className="rounded-full"
            />
        </button>
      )}
    </>
  );
}
