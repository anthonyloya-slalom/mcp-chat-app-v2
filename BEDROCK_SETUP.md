# AWS Bedrock Setup for MCP Chat App

This application uses Anthropic's Claude models through AWS Bedrock. Follow these steps to configure the application.

## Prerequisites

1. AWS Account with Bedrock access
2. AWS credentials configured
3. Access to Claude models in your AWS region

## Configuration

### 1. Set up AWS Credentials

Create a `.env.local` file in the root directory with your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=us-east-1

# Optional: If using temporary credentials
# AWS_SESSION_TOKEN=your-session-token-here
```

### 2. Enable Claude Models in AWS Bedrock

1. Go to the AWS Console > Bedrock > Model Access
2. Request access to Anthropic Claude models
3. Wait for approval (usually instant for Claude models)

### 3. Supported Models

The application is configured to use:
- **Default**: `us.anthropic.claude-opus-4-1-20250805-v1:0` (Claude Opus 4.1 - Cross-region inference profile)

**Important**: Claude Opus 4.1 requires using the cross-region inference profile (with `us.` prefix) for on-demand throughput.

Other available models:
- `us.anthropic.claude-opus-4-20250514-v1:0` (Claude Opus 4 - Cross-region)
- `us.anthropic.claude-sonnet-4-20250514-v1:0` (Claude Sonnet 4 - Cross-region)
- `anthropic.claude-3-7-sonnet-20250219-v1:0` (Claude Sonnet 3.7)
- `anthropic.claude-3-5-haiku-20241022-v1:0` (Claude Haiku 3.5)

Note: Models with `us.` prefix use cross-region inference profiles for better availability and on-demand throughput.

### 4. Region Configuration

The application defaults to `us-east-1` but can be configured to use any AWS region where Bedrock is available:

- us-east-1 (N. Virginia)
- us-east-2 (Ohio)
- us-west-2 (Oregon)
- eu-west-1 (Ireland)
- ap-northeast-1 (Tokyo)
- ap-southeast-2 (Sydney)

## Architecture

The application uses a centralized LLM provider module (`src/lib/llm-provider.ts`) that:

1. Creates AnthropicBedrock client instances
2. Manages AWS authentication
3. Provides a simple interface for making Claude API calls
4. Supports streaming responses

## API Routes

Both API routes use the same LLM provider:
- `/api/mcp-stream.ts` - Streaming responses with SSE
- `/api/mcp.ts` - Standard JSON responses

## Testing

To test your Bedrock connection:

```bash
npm run dev
```

Then navigate to http://localhost:3000 and send a test message.

## Troubleshooting

### Authentication Errors
- Verify AWS credentials are correctly set in `.env.local`
- Check IAM user has `bedrock:InvokeModel` permissions
- Ensure the AWS region is correct

### Model Access Errors
- Confirm model access is granted in AWS Bedrock console
- Check the model ID is correct for your region
- Some models may have regional restrictions

### Connection Issues
- Verify network connectivity to AWS
- Check for any proxy or firewall restrictions
- Ensure AWS SDK can access the Bedrock endpoint

## Cost Considerations

AWS Bedrock charges per token processed:
- Input tokens: Charged for prompt text
- Output tokens: Charged for generated responses
- Pricing varies by model (Opus > Sonnet > Haiku)

Monitor usage in AWS Cost Explorer to track spending.

## Security Best Practices

1. **Never commit credentials**: Keep `.env.local` in `.gitignore`
2. **Use IAM roles in production**: Instead of access keys when deployed on AWS
3. **Rotate credentials regularly**: Update access keys periodically
4. **Limit permissions**: Grant only necessary Bedrock permissions
5. **Enable CloudTrail**: Log all Bedrock API calls for auditing