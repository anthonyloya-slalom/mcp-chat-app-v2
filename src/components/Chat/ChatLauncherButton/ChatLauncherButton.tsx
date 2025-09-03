import { useState } from 'react';
import Image from 'next/image';
import ChatUI from '../ChatUI/ChatUI';
import styles from './ChatLauncherButton.module.css';

export default function ChatLauncherButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open ? (
        <div className={styles.chatWindow}>
          <ChatUI onClose={() => setOpen(false)} />
        </div>
      ) : (
        <button
          className={styles.launcherButton}
          onClick={() => setOpen(true)}
          aria-label="Open chat"
        >
            <Image
                src={require('../../images/chatLogo.jpg')}
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
