import { create } from 'zustand';
import { Message, ToolStep } from './types';
import { LLMProvider } from './llm-provider';

interface ConversationState {
  messages: Message[];
  currentProvider: LLMProvider;
  isProcessing: boolean;
  streamingContent: string;
  streamingSteps: ToolStep[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  tokenUsage: { input: number; output: number; cost: number };
  settings: {
    temperature: number;
    maxTokens: number;
    streaming: boolean;
    showThoughts: boolean;
    darkMode: boolean;
  };
  
  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setProvider: (provider: LLMProvider) => void;
  setProcessing: (processing: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  setStreamingSteps: (steps: ToolStep[]) => void;
  addStreamingStep: (step: ToolStep) => void;
  updateStreamingStep: (id: string, updates: Partial<ToolStep>) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  updateTokenUsage: (usage: { input: number; output: number; cost: number }) => void;
  updateSettings: (settings: Partial<ConversationState['settings']>) => void;
  clearMessages: () => void;
  exportConversation: () => string;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [],
  currentProvider: 'claude',
  isProcessing: false,
  streamingContent: '',
  streamingSteps: [],
  connectionStatus: 'disconnected',
  tokenUsage: { input: 0, output: 0, cost: 0 },
  settings: {
    temperature: 0.7,
    maxTokens: 4000,
    streaming: true,
    showThoughts: true,
    darkMode: false,
  },
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
    
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
    
  setProvider: (provider) =>
    set({ currentProvider: provider }),
    
  setProcessing: (processing) =>
    set({ isProcessing: processing }),
    
  setStreamingContent: (content) =>
    set({ streamingContent: content }),
    
  appendStreamingContent: (content) =>
    set((state) => ({
      streamingContent: state.streamingContent + content,
    })),
    
  setStreamingSteps: (steps) =>
    set({ streamingSteps: steps }),
    
  addStreamingStep: (step) =>
    set((state) => ({
      streamingSteps: [...state.streamingSteps, step],
    })),
    
  updateStreamingStep: (id, updates) =>
    set((state) => ({
      streamingSteps: state.streamingSteps.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      ),
    })),
    
  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),
    
  updateTokenUsage: (usage) =>
    set((state) => ({
      tokenUsage: {
        input: state.tokenUsage.input + usage.input,
        output: state.tokenUsage.output + usage.output,
        cost: state.tokenUsage.cost + usage.cost,
      },
    })),
    
  updateSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
    
  clearMessages: () =>
    set({ messages: [], tokenUsage: { input: 0, output: 0, cost: 0 } }),
    
  exportConversation: () => {
    const state = get();
    const conversation = {
      messages: state.messages,
      provider: state.currentProvider,
      timestamp: new Date().toISOString(),
      tokenUsage: state.tokenUsage,
    };
    return JSON.stringify(conversation, null, 2);
  },
}));