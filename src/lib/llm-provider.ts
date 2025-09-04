import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

export type LLMProvider = 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  region?: string;
}

export const DEFAULT_MODELS = {
  claude: 'us.anthropic.claude-opus-4-1-20250805-v1:0',
};

export function createLLM(config: LLMConfig): any {
  const {
    provider,
    apiKey,
    modelName,
    temperature = 0.7,
    maxTokens = 4000,
    region = process.env.AWS_REGION,
  } = config;

  switch (provider) {
    case 'claude':
      // Create AWS Bedrock client
      const bedrockClient = new BedrockRuntime({
        region: region,
        credentials: {
          accessKeyId: apiKey || process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      // Create AnthropicBedrock instance
      return new AnthropicBedrock({
        client: bedrockClient,
        model: modelName || DEFAULT_MODELS.claude,
        temperature,
        maxTokens,
        streaming: true,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export function getDefaultProvider(): LLMProvider {
  return 'claude';
}