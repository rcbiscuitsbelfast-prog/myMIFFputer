# MIFF LLM Proxy

A lightweight Express router and service for proxying MIFF (Mystical Interactive Fantasy Framework) LLM requests to external providers.

## Features

- **Multiple Provider Support**: Supports Together AI and HuggingFace
- **Context Injection**: Automatically injects MIFF game context (quests, dialogue, player state) into prompts
- **Rate Limiting**: Simple in-memory rate limiting to prevent abuse
- **Mock Fallback**: Returns deterministic mock responses when API keys are not configured
- **Error Handling**: Graceful error handling with fallback to mock responses
- **Timeout Protection**: Configurable timeouts to prevent hanging requests

## API Endpoints

### POST /api/miff/llm/chat

Main chat completion endpoint that accepts messages and optional MIFF context.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Help me with my quest"
    }
  ],
  "context": {
    "currentQuest": "Find the lost artifact",
    "activeDialogue": "Talking to the wizard",
    "playerCharacter": {
      "name": "Aria",
      "class": "Mage",
      "level": 5
    },
    "gameState": {
      "location": "Enchanted Forest",
      "health": 85,
      "mana": 60
    }
  },
  "max_tokens": 1000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The wizard nods knowingly..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 32,
    "total_tokens": 77
  },
  "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  "processing_time_ms": 1234,
  "mock": false
}
```

### GET /api/miff/llm/status

Health check endpoint that returns service configuration status.

**Response:**
```json
{
  "status": "ok",
  "configured": true,
  "provider": "together",
  "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  "rate_limit": {
    "window_ms": 60000,
    "max_requests": 10
  },
  "timeout_ms": 30000,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### POST /api/miff/llm/test

Test endpoint to validate the LLM proxy configuration.

**Response:**
```json
{
  "status": "success",
  "configured": true,
  "response": { ... },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Configuration

Environment variables for configuring the MIFF LLM Proxy:

```bash
# Required: Provider and model configuration
MIFF_LLM_PROVIDER=together                    # Supported: together, huggingface
MIFF_LLM_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo
MIFF_LLM_API_KEY=your_api_key_here

# Optional: Performance and rate limiting
MIFF_LLM_TIMEOUT=30000                        # Request timeout in milliseconds
MIFF_LLM_RATE_LIMIT_WINDOW=60000               # Rate limit window in milliseconds
MIFF_LLM_RATE_LIMIT_MAX=10                     # Max requests per window
```

## Supported Providers

### Together AI
- **Provider ID**: `together`
- **Default Model**: `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo`
- **API Key**: Required from [Together AI](https://together.ai/)

### HuggingFace
- **Provider ID**: `huggingface`
- **Default Model**: Any text generation model (e.g., `meta-llama/Llama-2-7b-chat-hf`)
- **API Key**: Required from [HuggingFace](https://huggingface.co/settings/tokens)

## Context Injection

The proxy automatically injects MIFF-specific context into the conversation as a system message. The context can include:

- `currentQuest`: Current active quest
- `activeDialogue`: Current dialogue scenario
- `playerCharacter`: Player character information
- `gameState`: Current game state (location, health, etc.)

The injected system prompt helps the LLM maintain context and respond appropriately within the fantasy game setting.

## Mock Response Fallback

When API keys are not configured, the service returns deterministic mock responses based on keyword detection:

- **quest/quest**: Responses about adventuring and quests
- **forest/tree**: Responses about mystical forests
- **help/guide**: Responses with mysterious guides
- **magic/spell**: Responses about magical energy
- **Default**: General adventure responses

This ensures the UI remains functional even without API access.

## Rate Limiting

Simple in-memory rate limiting is implemented to prevent abuse:

- **Default**: 10 requests per minute per client
- **Identification**: Uses IP address or `x-forwarded-for` header
- **Response**: HTTP 429 with `retry_after` header when exceeded

## Error Handling

The proxy implements comprehensive error handling:

- **API Errors**: Falls back to mock responses
- **Timeouts**: Returns HTTP 408 with timing information
- **Rate Limiting**: Returns HTTP 429 with retry information
- **Validation**: Returns HTTP 400 for malformed requests
- **Server Errors**: Returns HTTP 500 with error details

## Integration

The service is automatically registered in the Puter AI module and the router is mounted in the main API service. No additional configuration is required beyond the environment variables.

## Testing

Comprehensive unit and integration tests are included:

```bash
# Run unit tests for the service
npm test -- src/backend/src/services/MIFFLLMProxyService.test.js

# Run integration tests for the router
npm test -- src/backend/src/routers/miff-llm.test.js
```

Tests cover:
- Service configuration and initialization
- Rate limiting behavior
- Context injection
- Provider-specific requests
- Error handling and fallbacks
- Mock response generation
- Complex MIFF scenarios

## Security Considerations

- API keys are loaded from environment variables only
- Rate limiting prevents abuse
- Input validation prevents malformed requests
- Timeout protection prevents resource exhaustion
- No sensitive information is logged in production

## Performance

- Lightweight implementation suitable for Render's free tier
- In-memory rate limiting with automatic cleanup
- Configurable timeouts prevent hanging requests
- Mock responses provide instant fallback when needed

## Future Enhancements

Potential improvements for future versions:

- Streaming response support
- Additional LLM providers
- Persistent rate limiting (Redis/database)
- Advanced context management
- Response caching
- Request batching
- Advanced error reporting