import '@/styles/globals.css';
import ChatLauncher from '../components/ui/ChatLauncher';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <ChatLauncher />
    </>
  );
}