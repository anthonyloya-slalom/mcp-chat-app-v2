import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { BaseMessage } from '@langchain/core/messages';

export type LLMProvider = 'openai' | 'claude' | 'gemini' | 'ollama' | 'groq' | 'cohere';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  baseURL?: string;
}

export interface ModelCost {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

export const MODEL_COSTS = {
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  'mixtral-8x7b': { input: 0.0007, output: 0.0007 },
};

export const DEFAULT_MODELS = {
  openai: 'gpt-4-turbo-preview',
  claude: 'claude-3-opus-20240229',
  gemini: 'gemini-pro',
  ollama: 'llama2',
  groq: 'mixtral-8x7b-32768',
  cohere: 'command-r-plus',
};

export class EnhancedLLMProvider {
  private config: LLMConfig;
  private tokenUsage: { input: number; output: number } = { input: 0, output: 0 };
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  async createLLM(): Promise<BaseChatModel> {
    const { provider, apiKey, modelName, temperature = 0.7, maxTokens = 4000, streaming = false } = this.config;
    
    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
          modelName: modelName || DEFAULT_MODELS.openai,
          temperature,
          maxTokens,
          streaming,
          callbacks: [this.createTokenCounter()],
        });
        
      case 'claude':
        return new ChatAnthropic({
          anthropicApiKey: apiKey || process.env.ANTHROPIC_API_KEY,
          modelName: modelName || DEFAULT_MODELS.claude,
          temperature,
          maxTokens,
          streaming,
          callbacks: [this.createTokenCounter()],
        });
        
      case 'gemini':
        // For Gemini, we'd use LiteLLM or a custom implementation
        return this.createLiteLLMModel('gemini/gemini-pro');
        
      case 'ollama':
        return this.createLiteLLMModel(`ollama/${modelName || 'llama2'}`);
        
      case 'groq':
        return this.createLiteLLMModel(`groq/${modelName || 'mixtral-8x7b-32768'}`);
        
      case 'cohere':
        return this.createLiteLLMModel(`cohere/${modelName || 'command-r-plus'}`);
        
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
  
  private createLiteLLMModel(model: string): BaseChatModel {
    // This would integrate with LiteLLM for additional providers
    // For now, fallback to OpenAI with a proxy
    return new ChatOpenAI({
      openAIApiKey: this.config.apiKey || 'dummy',
      modelName: model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      configuration: {
        baseURL: this.config.baseURL || 'http://localhost:4000', // LiteLLM proxy
      },
    });
  }
  
  private createTokenCounter() {
    return {
      handleLLMEnd: async (output: any) => {
        if (output.llmOutput?.tokenUsage) {
          this.tokenUsage.input += output.llmOutput.tokenUsage.promptTokens || 0;
          this.tokenUsage.output += output.llmOutput.tokenUsage.completionTokens || 0;
        }
      },
    };
  }
  
  getTokenUsage(): { input: number; output: number } {
    return { ...this.tokenUsage };
  }
  
  calculateCost(): ModelCost {
    const modelName = this.config.modelName || DEFAULT_MODELS[this.config.provider];
    const costs = MODEL_COSTS[modelName as keyof typeof MODEL_COSTS] || { input: 0, output: 0 };
    
    const inputCost = (this.tokenUsage.input / 1000) * costs.input;
    const outputCost = (this.tokenUsage.output / 1000) * costs.output;
    
    return {
      inputTokens: this.tokenUsage.input,
      outputTokens: this.tokenUsage.output,
      totalCost: inputCost + outputCost,
    };
  }
  
  resetTokenUsage(): void {
    this.tokenUsage = { input: 0, output: 0 };
  }
}