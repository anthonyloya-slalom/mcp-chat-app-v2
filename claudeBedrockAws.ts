import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

const client = new AnthropicBedrock({
  // Authenticate by either providing the keys below or use the default AWS credential providers, such as
  // using ~/.aws/credentials or the "AWS_SECRET_ACCESS_KEY" and "AWS_ACCESS_KEY_ID" environment variables.
  awsAccessKey: process.env.AWS_ACCESS_KEY,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,

  // awsRegion changes the aws region to which the request is made. By default, we read AWS_REGION,
  // and if that's not present, we default to us-east-1. Note that we do not read ~/.aws/config for the region.
  awsRegion: process.env.AWS_REGION,
});

async function main() {
  const message = await client.messages.create({
    model: 'us.anthropic.claude-opus-4-1-20250805-v1:0',
    max_tokens: 256,
    messages: [{"role": "user", "content": "Hello, world"}]
  });
  console.log("AWS", message);
}
main().catch(console.error);