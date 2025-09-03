import '@/styles/globals.css';
import ChatLauncherButton from '../components/Chat/ChatLauncherButton/ChatLauncherButton';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <ChatLauncherButton />
    </>
  );
}