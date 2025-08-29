import Head from 'next/head';

interface ExecutionStep {
  type: 'action' | 'result' | 'thought';
  tool?: string;
  input?: any;
  output?: any;
  thought?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  stepNumber?: number;
}

export default function Home() {

  return (
    <div className="flex flex-col h-screen bg-white">
      <Head>
        <title>Tilt Chat Bot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
    </div>
  );
}