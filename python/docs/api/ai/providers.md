# AIProvider

Abstract base class and factory for AI provider integrations.

## Import

```python
from xeepy.ai.providers import AIProvider, get_provider
```

## Factory Function

```python
def get_provider(
    provider: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    **kwargs
) -> AIProvider
```

Get an AI provider instance.

**Parameters:**
- `provider`: Provider name (`openai`, `anthropic`, `ollama`)
- `api_key`: API key (not required for Ollama)
- `model`: Model name (defaults to provider's best model)
- `**kwargs`: Additional provider-specific options

## Supported Providers

| Provider | Models | API Key Required |
|----------|--------|------------------|
| `openai` | `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` | Yes |
| `anthropic` | `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku` | Yes |
| `ollama` | `llama2`, `mistral`, `codellama` | No |

## Base Class

```python
class AIProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Generate text completion."""
        pass
    
    @abstractmethod
    async def analyze(
        self,
        text: str,
        analysis_type: str
    ) -> Dict[str, Any]:
        """Analyze text (sentiment, topics, etc.)."""
        pass
```

## OpenAIProvider

```python
class OpenAIProvider(AIProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4",
        organization: Optional[str] = None
    )
```

## AnthropicProvider

```python
class AnthropicProvider(AIProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-opus-20240229"
    )
```

## OllamaProvider

```python
class OllamaProvider(AIProvider):
    def __init__(
        self,
        model: str = "llama2",
        host: str = "http://localhost:11434"
    )
```

## Usage Examples

### Basic Provider Setup

```python
from xeepy.ai.providers import get_provider

# OpenAI
openai = get_provider("openai", api_key="sk-...", model="gpt-4")

# Anthropic
claude = get_provider("anthropic", api_key="sk-ant-...", model="claude-3-opus")

# Ollama (local)
ollama = get_provider("ollama", model="llama2")
```

### Generate Text

```python
from xeepy.ai.providers import get_provider

async def main():
    ai = get_provider("openai", api_key="sk-...")
    
    response = await ai.generate(
        prompt="Write a tweet about Python programming",
        system_prompt="You are a tech influencer on Twitter",
        max_tokens=280,
        temperature=0.8
    )
    
    print(response)

asyncio.run(main())
```

### Analyze Text

```python
from xeepy.ai.providers import get_provider

async def main():
    ai = get_provider("anthropic", api_key="sk-ant-...")
    
    analysis = await ai.analyze(
        text="I love this new feature! Amazing work!",
        analysis_type="sentiment"
    )
    
    print(f"Sentiment: {analysis['sentiment']}")
    print(f"Score: {analysis['score']}")

asyncio.run(main())
```

### Use with Xeepy

```python
from xeepy import Xeepy
from xeepy.ai.providers import get_provider

async def main():
    ai = get_provider("openai", api_key="sk-...")
    
    async with Xeepy() as x:
        # Get tweets to reply to
        tweets = await x.scrape.search("Python tips", limit=5)
        
        for tweet in tweets.items:
            # Generate AI reply
            reply = await ai.generate(
                prompt=f"Write a helpful reply to: {tweet.text}",
                system_prompt="Be helpful and friendly. Max 280 chars.",
                max_tokens=100
            )
            print(f"Tweet: {tweet.text[:50]}...")
            print(f"Reply: {reply}\n")

asyncio.run(main())
```

### Local Ollama Setup

```python
from xeepy.ai.providers import get_provider

async def main():
    # Make sure Ollama is running: ollama serve
    ai = get_provider(
        "ollama",
        model="llama2",
        host="http://localhost:11434"
    )
    
    response = await ai.generate(
        prompt="Explain async/await in Python",
        max_tokens=200
    )
    print(response)

asyncio.run(main())
```

### Provider with Custom Settings

```python
from xeepy.ai.providers import OpenAIProvider

async def main():
    ai = OpenAIProvider(
        api_key="sk-...",
        model="gpt-4-turbo",
        organization="org-..."
    )
    
    # Configure generation
    response = await ai.generate(
        prompt="Tweet ideas for developers",
        system_prompt="You create viral tech content",
        max_tokens=500,
        temperature=0.9  # More creative
    )
    
    print(response)

asyncio.run(main())
```

### Multiple Providers

```python
from xeepy.ai.providers import get_provider

async def compare_providers(prompt: str):
    providers = {
        "gpt-4": get_provider("openai", api_key="sk-..."),
        "claude": get_provider("anthropic", api_key="sk-ant-..."),
        "llama": get_provider("ollama", model="llama2")
    }
    
    results = {}
    for name, ai in providers.items():
        try:
            results[name] = await ai.generate(prompt, max_tokens=100)
        except Exception as e:
            results[name] = f"Error: {e}"
    
    return results

asyncio.run(compare_providers("Write a Python tip"))
```

### Environment Variables

```python
import os
from xeepy.ai.providers import get_provider

# API keys from environment
openai = get_provider(
    "openai",
    api_key=os.getenv("OPENAI_API_KEY")
)

anthropic = get_provider(
    "anthropic",
    api_key=os.getenv("ANTHROPIC_API_KEY")
)
```

### Error Handling

```python
from xeepy.ai.providers import get_provider, AIProviderError

async def safe_generate(prompt: str):
    ai = get_provider("openai", api_key="sk-...")
    
    try:
        return await ai.generate(prompt)
    except AIProviderError as e:
        print(f"AI error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

asyncio.run(safe_generate("Hello world"))
```

### Streaming Responses

```python
from xeepy.ai.providers import get_provider

async def stream_response():
    ai = get_provider("openai", api_key="sk-...")
    
    async for chunk in ai.generate_stream(
        prompt="Write a long tweet thread about AI",
        max_tokens=1000
    ):
        print(chunk, end="", flush=True)

asyncio.run(stream_response())
```

## See Also

- [ContentGenerator](content.md) - AI content generation
- [SentimentAnalyzer](sentiment.md) - Sentiment analysis
- [BotDetector](detection.md) - Bot detection
