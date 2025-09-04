import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

export type LLMProvider = 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsSessionToken?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  region?: string;
}

export const DEFAULT_MODELS = {
  claude: 'us.anthropic.claude-opus-4-1-20250805-v1:0',
};

export function createLLM(config: LLMConfig): AnthropicBedrock {
  const {
    provider,
    awsAccessKey,
    awsSecretKey,
    awsSessionToken,
    modelName,
    temperature = 0.7,
    maxTokens = 4000,
    region = process.env.AWS_REGION || 'us-east-1',
  } = config;

  switch (provider) {
    case 'claude':
      // Create AnthropicBedrock client directly with credentials
      return new AnthropicBedrock({
        // AWS credentials - will use default providers if not specified
        awsAccessKey: awsAccessKey || process.env.AWS_ACCESS_KEY_ID,
        awsSecretKey: awsSecretKey || process.env.AWS_SECRET_ACCESS_KEY,
        awsSessionToken: awsSessionToken || process.env.AWS_SESSION_TOKEN,
        
        // AWS region
        awsRegion: region,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export async function callClaudeBedrock(prompt: string, config?: Partial<LLMConfig>): Promise<string> {
  const llm = createLLM({
    provider: 'claude',
    ...config,
  });

  const response = await llm.messages.create({
    model: config?.modelName || DEFAULT_MODELS.claude,
    max_tokens: config?.maxTokens || 2000,
    temperature: config?.temperature || 0,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  if (response.content && response.content.length > 0) {
    const content = response.content[0];
    if ('text' in content) {
      return content.text;
    }
  }

  return '';
}

export function getDefaultProvider(): LLMProvider {
  return 'claude';
}