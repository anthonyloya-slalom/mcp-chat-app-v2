import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type LLMProvider = 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_MODELS = {
  openai: 'gpt-4-turbo-preview',
  claude: 'claude-3-opus-20240229',
};

export function createLLM(config: LLMConfig): BaseChatModel {
  const {
    provider,
    apiKey,
    modelName,
    temperature = 0.7,
    maxTokens = 4000,
  } = config;

  switch (provider) {
    case 'openai':
      return new ChatOpenAI({
        openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
        modelName: modelName || DEFAULT_MODELS.openai,
        temperature,
        maxTokens,
        streaming: true,
      });

    case 'claude':
      return new ChatAnthropic({
        anthropicApiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        modelName: modelName || DEFAULT_MODELS.claude,
        temperature,
        maxTokens,
        streaming: true,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export function getDefaultProvider(): LLMProvider {
  const defaultProvider = process.env.DEFAULT_LLM_PROVIDER;
  if (defaultProvider === 'openai' || defaultProvider === 'claude') {
    return defaultProvider;
  }
  // Default to Claude if available, otherwise OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    return 'claude';
  }
  return 'openai';
}