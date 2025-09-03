import { ChatAnthropic } from '@langchain/anthropic';

export type LLMProvider = 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_MODELS = {
  claude: 'claude-3-opus-20240229',
};

export function createLLM(config: LLMConfig): any {
  const {
    provider,
    apiKey,
    modelName,
    temperature = 0.7,
    maxTokens = 4000,
  } = config;

  switch (provider) {
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
  // Always use Claude as the default provider
  return 'claude';
}