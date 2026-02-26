# Build 03: Local-First / Edge AI Agents

> **Project**: XActions Local AI — Run AI-powered Twitter automation entirely on-device with local LLMs  
> **Status**: New Build  
> **Priority**: #3 — Privacy-first differentiator, zero API cost for users  
> **Author**: XActions Team  

---

## Executive Summary

The shift from cloud-hosted LLMs to local models (Llama 4, Phi-4, Gemma 3, Mistral) is accelerating. XActions agents currently use OpenRouter/cloud APIs for LLM inference (`src/agents/llmBrain.js`). This build creates a **fully local AI agent** — no API keys, no cloud, zero cost, full privacy. Users can run XActions' thought leader agent, persona engine, and content generation entirely on their own hardware.

## Technical Context

### Existing XActions AI Infrastructure
- **LLM Brain**: `src/agents/llmBrain.js` — Current AI inference layer, uses OpenRouter API
- **Thought Leader Agent**: `src/agents/thoughtLeaderAgent.js` — Full automated growth agent
- **Persona Engine**: `src/personaEngine.js` — 680 lines, persona configs with niche presets and model settings
- **Content Calendar**: `src/agents/contentCalendar.js` — AI-powered content scheduling
- **Sentiment Analyzer**: `src/sentimentAnalyzer.js` — Tweet sentiment analysis
- **Auto Reply**: `src/autoReply.js` — AI-generated replies
- **Algorithm Builder**: `src/algorithmBuilder.js` — Automated account growth with AI comments/posts
- **Default models**: `google/gemini-flash-2.0` (via OpenRouter)

### Local LLM Landscape (2026)
| Runtime | Language | Models | Speed |
|---------|----------|--------|-------|
| **Ollama** | Go/C++ | Llama 4, Phi-4, Gemma 3, Mistral, Qwen3 | Fast, GPU optimized |
| **llama.cpp** | C++ | GGUF format models | Fastest CPU inference |
| **LM Studio** | Electron | All GGUF/GGML models | GUI + API server |
| **Llamafile** | C | Single-file executables | Zero-install |
| **vLLM** | Python | All HuggingFace models | Production serving |
| **MLX** | Swift | Apple Silicon optimized | Fastest on Mac |

### Architecture Plan

```
┌──────────────────────────────────────────────────────┐
│               XActions Local AI Agent                │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │          Unified LLM Interface                   │ │
│  │  Single API for local + cloud inference          │ │
│  └───────────────┬─────────────────────────────────┘ │
│                  │                                   │
│  ┌───────┬───────┼───────┬──────────┬────────────┐   │
│  │       │       │       │          │            │   │
│  ▼       ▼       ▼       ▼          ▼            │   │
│ Ollama  llama   LM     Llamafile  OpenRouter     │   │
│ Driver  .cpp    Studio  Driver    (fallback)     │   │
│         Driver  Driver                           │   │
│  └───────┴───────┴───────┴──────────┴────────────┘   │
│                  │                                   │
│  ┌───────────────▼─────────────────────────────────┐ │
│  │        Model Manager                            │ │
│  │  Auto-detect • Download • Quantize • Select    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │        Prompt Optimizer                          │ │
│  │  Adapt prompts for smaller models • Cache       │ │
│  │  Token counting • Context window management     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │        Local Agent Runner                        │ │
│  │  Persona Engine • Content Gen • Auto-Reply      │ │
│  │  Sentiment Analysis • Thread Composition        │ │
│  │  All running 100% local                         │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Key Files to Create
```
src/local-ai/
  index.js              — Main entry point
  llmInterface.js       — Unified LLM interface (local + cloud)
  drivers/
    ollama.js           — Ollama API driver
    llamaCpp.js         — llama.cpp server driver
    lmStudio.js         — LM Studio API driver
    llamafile.js        — Llamafile driver
    openrouter.js       — OpenRouter cloud fallback
  modelManager.js       — Model discovery, download, selection
  promptOptimizer.js    — Prompt adaptation for local models
  tokenCounter.js       — Token counting without API calls
  contextManager.js     — Context window management
  localAgent.js         — Local-only agent runner
  benchmarker.js        — Model performance benchmarking
  hardwareDetector.js   — Detect GPU, RAM, CPU capabilities
  setup.js              — First-run setup wizard
tests/local-ai/
  llmInterface.test.js
  drivers.test.js
  modelManager.test.js
  promptOptimizer.test.js
  localAgent.test.js
  integration.test.js
```

---

## Agent Build Prompts

---

### Prompt 1: Hardware Detection and Capability Assessment

```
You are building the hardware detection system for XActions Local AI.

Create file: src/local-ai/hardwareDetector.js

This detects the user's hardware capabilities to recommend the best local LLM configuration.

Build:

1. detectHardware() — Comprehensive system scan:
   Return: {
     cpu: {
       model: string,          // e.g., "Apple M3 Pro" or "AMD Ryzen 9 7950X"
       cores: number,          // Physical cores
       threads: number,        // Logical threads
       architecture: string,   // 'x64', 'arm64'
       features: string[],     // ['avx2', 'avx512', 'neon'] — relevant for inference
     },
     memory: {
       totalGB: number,
       availableGB: number,
       type: string,           // 'DDR5', 'LPDDR5', 'unified'
     },
     gpu: {
       available: boolean,
       devices: Array<{
         name: string,         // "NVIDIA RTX 4090" or "Apple M3 GPU"
         vramGB: number,
         driver: string,       // CUDA version, ROCm version, Metal
         compute: string,      // 'cuda', 'rocm', 'metal', 'vulkan', 'cpu-only'
       }>
     },
     storage: {
       availableGB: number,
       type: string,           // 'nvme', 'ssd', 'hdd'
       modelStoragePath: string, // Where models will be stored
     },
     os: {
       platform: string,
       release: string,
       arch: string,
     }
   }

   Detection methods:
   - CPU: Parse /proc/cpuinfo (Linux), sysctl (macOS), or os.cpus()
   - Memory: os.totalmem(), os.freemem()
   - GPU: 
     a. NVIDIA: Run 'nvidia-smi --query-gpu=name,memory.total --format=csv' 
     b. AMD: Run 'rocm-smi --showmeminfo vram'
     c. Apple: Parse system_profiler SPDisplaysDataType
     d. Fallback: No GPU detected
   - Storage: Run 'df -BG' (Linux/Mac) for available space

2. recommendModelSize(hardware) — Suggest optimal model size:
   Rules:
   - < 8GB RAM: 1-3B parameter models (Phi-4-mini, Qwen3-0.5B)
   - 8-16GB RAM: 7-8B models (Llama-4-8B, Mistral-7B, Gemma-3-9B)
   - 16-32GB RAM: 13-14B models (Llama-4-Scout)
   - 32-64GB RAM: 30-70B models
   - 64GB+ RAM: 70B+ models
   
   With GPU:
   - Prefer GPU offloading — VRAM determines how much of the model fits on GPU
   - 6GB VRAM: 7B Q4 quantized
   - 12GB VRAM: 13B Q4 or 7B Q8
   - 24GB VRAM: 30B Q4 or 13B Q8
   - 48GB+ VRAM: 70B Q4

   Return: {
     maxModelSize: string,      // '7b', '13b', '30b', '70b'
     quantization: string,      // 'q4_k_m', 'q5_k_m', 'q8_0', 'f16'
     gpuLayers: number,         // How many layers to offload to GPU
     contextWindow: number,     // Max safe context window size
     estimatedSpeed: string,    // 'fast (>30 tok/s)', 'moderate (10-30)', 'slow (<10)'
     recommended: Array<{       // Top 3 model recommendations
       name: string,
       size: string,
       why: string,
     }>
   }

3. checkRuntime(runtime) — Check if a local LLM runtime is installed:
   runtime: 'ollama' | 'llamacpp' | 'lmstudio' | 'llamafile'
   - Check PATH for executables
   - Check running services (ollama serve → http://localhost:11434)
   - Return: { installed: boolean, running: boolean, version: string, models: string[] }

4. getSystemReport() — Human-readable system report for debugging:
   Format as clean text with hardware specs, recommended config, and detected runtimes.

Use child_process.execSync for system commands (with try/catch for cross-platform safety).
Author: @author nich (@nichxbt)
```

---

### Prompt 2: Unified LLM Interface

```
You are building the Unified LLM Interface for XActions — a single API that works with any local or cloud LLM provider.

Create file: src/local-ai/llmInterface.js

Context:
- XActions currently uses src/agents/llmBrain.js which calls OpenRouter API
- This new interface must be a drop-in replacement that adds local model support
- Must maintain the same API that llmBrain.js consumers expect

Build:

1. LLMInterface class:
   constructor(options):
     - provider: 'auto' | 'ollama' | 'llamacpp' | 'lmstudio' | 'llamafile' | 'openrouter' (default 'auto')
     - model: string (model name, e.g., 'llama4:8b' or 'phi4')
     - fallbackProvider: string (use cloud if local fails, default null)
     - temperature: number (default 0.7)
     - maxTokens: number (default 2048)
     - systemPrompt: string
     - contextWindow: number (auto-detected based on model)
     - timeout: number (default 60000ms)

2. Core methods (matching existing llmBrain.js interface):
   - async generate(prompt, options?) — Generate text completion:
     options: { temperature, maxTokens, stopSequences, format: 'text' | 'json' }
     Return: { text: string, usage: { promptTokens, completionTokens, totalTokens }, model, provider, duration }
   
   - async chat(messages, options?) — Chat completion:
     messages: Array<{ role: 'system'|'user'|'assistant', content: string }>
     Return: same as generate
   
   - async generateComment(context) — Generate a social media comment (convenience):
     context: { tweetText, authorName, persona, tone, maxLength }
     Builds an optimized prompt for comment generation
     Return: string
   
   - async generatePost(context) — Generate a social media post:
     context: { topic, persona, tone, maxLength, style: 'tweet'|'thread'|'reply' }
     Return: string
   
   - async analyzeSentiment(text) — Analyze sentiment of a tweet:
     Return: { sentiment: 'positive'|'negative'|'neutral', confidence: number, keywords: string[] }
   
   - async summarize(text, maxLength?) — Summarize text:
     Return: string
   
   - async extractTopics(texts) — Extract topics from an array of tweets:
     Return: string[]

3. Provider auto-detection ('auto' mode):
   a. Check if Ollama is running (GET http://localhost:11434/api/tags)
   b. Check if LM Studio is running (GET http://localhost:1234/v1/models)
   c. Check if llama.cpp server is running (GET http://localhost:8080/health)
   d. Check if Llamafile is running (GET http://localhost:8080/health)
   e. Fallback to OpenRouter if OPENROUTER_API_KEY env var is set
   f. If nothing available, throw helpful error with setup instructions

4. Model auto-selection:
   When model is not specified:
   a. List available models from detected provider
   b. Select the best model for social media tasks:
      Priority: Llama-4-8B > Phi-4 > Gemma-3-9B > Mistral-7B > Qwen3-7B
   c. Prefer instruction-tuned variants
   d. Log which model was auto-selected

5. drop-in replacement setup:
   - createLocalLLM(options) — Factory that returns LLMInterface configured for local use
   - createCloudLLM(options) — Factory for cloud use (OpenRouter)
   - createHybridLLM(options) — Factory that tries local first, falls back to cloud
   
   - migrateLlmBrain() — Function that patches src/agents/llmBrain.js to use locally:
     Generates a config that maps all existing llmBrain function calls to the new interface

Author: @author nich (@nichxbt)
```

---

### Prompt 3: Ollama Driver

```
You are building the Ollama driver for XActions Local AI.

Create file: src/local-ai/drivers/ollama.js

Ollama is the most popular local LLM runtime. This driver communicates with Ollama's REST API.

Context:
- Ollama API: http://localhost:11434
- Ollama supports: Llama 4, Phi-4, Gemma 3, Mistral, Qwen3, DeepSeek, and many more
- API docs: https://github.com/ollama/ollama/blob/main/docs/api.md

Build the OllamaDriver class:

1. Connection:
   - constructor(options) — { host: 'http://localhost:11434', timeout: 60000 }
   - isAvailable() — Check if Ollama server is running (GET /api/tags)
   - getVersion() — Get Ollama version

2. Model management:
   - listModels() — GET /api/tags → Return array of { name, size, modifiedAt, digest }
   - pullModel(name, onProgress) — POST /api/pull → Download model with progress callback
     Stream the response and call onProgress({ status, completed, total, percent })
   - deleteModel(name) — DELETE /api/delete
   - showModel(name) — POST /api/show → Get model details: parameters, template, system prompt, size
   - hasModel(name) — Check if model is downloaded
   - ensureModel(name) — Pull if not available, return when ready

3. Inference:
   - generate(model, prompt, options) — POST /api/generate:
     Body: { model, prompt, stream: false, options: { temperature, top_p, top_k, num_predict, stop } }
     Return: { text: response, totalDuration, loadDuration, promptEvalCount, evalCount, evalDuration }
   
   - generateStream(model, prompt, options) — POST /api/generate with stream: true:
     Return async generator that yields tokens as they're generated
     Each yield: { token: string, done: boolean }
   
   - chat(model, messages, options) — POST /api/chat:
     Body: { model, messages: [{role, content}], stream: false, options }
     Return: { message: { role, content }, totalDuration, evalCount }
   
   - chatStream(model, messages, options) — Streaming chat
   
   - embeddings(model, input) — POST /api/embed:
     Return: { embeddings: number[][] }

4. Optimized settings for XActions tasks:
   - getXActionsConfig(task) — Return optimal Ollama options for each task type:
     'comment': { temperature: 0.8, top_p: 0.9, num_predict: 150, stop: ['\n\n'] }
     'post': { temperature: 0.7, top_p: 0.95, num_predict: 280, stop: [] }
     'analysis': { temperature: 0.3, top_p: 0.8, num_predict: 500, stop: [] }
     'sentiment': { temperature: 0.1, top_p: 0.5, num_predict: 50, format: 'json' }
     'summary': { temperature: 0.4, top_p: 0.85, num_predict: 200, stop: [] }

5. Health monitoring:
   - getLoadedModels() — Currently loaded models in memory
   - getResourceUsage() — Memory/GPU usage by Ollama
   - unloadModel(name) — Free model from memory

6. Error handling:
   - Model not found → suggest available alternatives
   - Out of memory → suggest smaller quantization
   - Timeout → suggest increasing timeout or using smaller model
   - Connection refused → provide installation instructions

Author: @author nich (@nichxbt)
```

---

### Prompt 4: llama.cpp Server Driver

```
You are building the llama.cpp server driver for XActions Local AI.

Create file: src/local-ai/drivers/llamaCpp.js

llama.cpp's server mode provides an OpenAI-compatible API for local inference. This is the fastest option for CPU inference.

Build the LlamaCppDriver class:

1. Connection:
   - constructor(options) — { host: 'http://localhost:8080', timeout: 60000 }
   - isAvailable() — Check if server is running (GET /health)
   - getServerInfo() — GET /props → model info, context size, etc.

2. Server management:
   - startServer(options) — Launch llama-server process:
     options: {
       modelPath: string,      // Path to .gguf file
       contextSize: number,    // -c flag (default 4096)
       gpuLayers: number,      // -ngl flag (auto-detect)
       threads: number,        // -t flag (auto-detect from CPU)
       port: number,           // --port (default 8080)
       batchSize: number,      // -b flag (default 512)
       flashAttention: boolean, // -fa flag
     }
     Spawn child process, wait for "listening on" in stdout
     Return process handle for lifecycle management
   
   - stopServer() — Kill the llama-server process
   - isServerRunning() — Check process and HTTP health

3. Inference (OpenAI-compatible endpoints):
   - completion(prompt, options) — POST /completion:
     Body: { prompt, n_predict, temperature, top_p, top_k, stop, stream: false }
     Return: { content, tokens_predicted, tokens_evaluated, timings }
   
   - completionStream(prompt, options) — Streaming completion:
     Return async generator yielding tokens
   
   - chatCompletion(messages, options) — POST /v1/chat/completions:
     OpenAI-compatible chat endpoint
     Body: { model: "local", messages, temperature, max_tokens, stream: false }
     Return: { choices: [{ message: { role, content } }], usage: { prompt_tokens, completion_tokens } }
   
   - embeddings(input) — POST /embedding:
     Return: { embedding: number[] }

4. Model file management:
   - findModels(searchPaths?) — Find .gguf files on disk:
     Default search paths: ~/.xactions/models/, ~/models/, ~/.cache/lm-studio/models/
     Return: Array<{ path, name, size, quantization }>
   
   - getModelInfo(path) — Read GGUF metadata without loading the model:
     Parse GGUF header for: architecture, context length, parameter count, quantization type
   
   - downloadModel(url, destPath, onProgress) — Download a GGUF model from URL:
     Support HuggingFace URLs: https://huggingface.co/TheBloke/Llama-4-8B-GGUF/resolve/main/...
     Stream download with progress callback

5. Performance optimization:
   - benchmarkModel(modelPath, promptLength) — Run a quick benchmark:
     Return: { tokensPerSecond, timeToFirstToken, promptEvalTime, memoryUsed }
   
   - getOptimalConfig(hardware, modelPath) — Calculate optimal server config:
     Based on model size, available RAM/VRAM, CPU cores
     Return: { gpuLayers, threads, contextSize, batchSize }

Author: @author nich (@nichxbt)
```

---

### Prompt 5: LM Studio and Llamafile Drivers

```
You are building the LM Studio and Llamafile drivers for XActions Local AI.

Create files:
- src/local-ai/drivers/lmStudio.js
- src/local-ai/drivers/llamafile.js

1. LM Studio Driver (lmStudio.js):
   LM Studio provides an OpenAI-compatible API at http://localhost:1234.

   LMStudioDriver class:
   - constructor(options) — { host: 'http://localhost:1234', timeout: 60000 }
   - isAvailable() — GET /v1/models
   - listModels() — GET /v1/models → Return loaded models
   - chatCompletion(messages, options) — POST /v1/chat/completions (OpenAI format)
   - completion(prompt, options) — POST /v1/completions
   - embeddings(input, model) — POST /v1/embeddings
   
   Since LM Studio is fully OpenAI-compatible, this driver is thin:
   - Reuse OpenAI-format request/response parsing
   - Auto-detect which model is loaded
   - Handle LM Studio-specific quirks (model naming, context limits)

2. Llamafile Driver (llamafile.js):
   Llamafile bundles a model+runtime into a single executable.

   LlamafileDriver class:
   - constructor(options) — { host: 'http://localhost:8080', timeout: 60000 }
   - isAvailable() — GET /health
   
   - startLlamafile(executablePath) — Run the llamafile binary:
     a. Make it executable (chmod +x)
     b. Spawn process
     c. Wait for server to start
     d. Return process handle
   
   - downloadLlamafile(modelName) — Download a pre-packaged llamafile:
     Known llamafiles: llava, mistral-7b, phi-3, etc.
     Download from HuggingFace or Mozilla's llamafile releases
   
   - Inference endpoints: Same as llama.cpp (llamafile uses the same server)
     chatCompletion, completion, embeddings

3. OpenRouter Fallback Driver:
   Create file: src/local-ai/drivers/openrouter.js
   
   This wraps the existing OpenRouter integration as a driver:
   - constructor(options) — { apiKey: process.env.OPENROUTER_API_KEY, baseUrl: 'https://openrouter.ai/api/v1' }
   - isAvailable() — Check if API key is set and valid
   - chatCompletion(messages, options) — POST to OpenRouter's chat/completions
   - listModels() — GET /v1/models (filter for relevant models)
   
   Include a cost estimator:
   - estimateCost(promptTokens, completionTokens, model) — Return estimated USD cost
   - This helps users understand the cost savings of going local

Author: @author nich (@nichxbt)
```

---

### Prompt 6: Model Manager — Discovery, Download, Selection

```
You are building the Model Manager for XActions Local AI.

Create file: src/local-ai/modelManager.js

This manages the full lifecycle of local models: discovery, download, selection, and optimization.

Build:

1. ModelManager class:
   constructor(options):
     - modelsDir: string (default ~/.xactions/models/)
     - drivers: { ollama, llamaCpp, lmStudio, llamafile } (injected driver instances)

2. Discovery:
   - discoverModels() — Find all available models across all runtimes:
     a. Ollama: list pulled models
     b. llama.cpp: scan modelsDir for .gguf files
     c. LM Studio: check loaded models
     d. Llamafile: scan for llamafile executables
     Return: Array<{
       name: string,
       runtime: string,
       size: string,           // '7b', '13b', etc.
       quantization: string,   // 'q4_k_m', 'q8_0', 'f16'
       contextWindow: number,
       sizeOnDisk: string,     // '4.1 GB'
       loaded: boolean,
       driver: string
     }>
   
   - getRecommendedModels(hardware) — Suggest models based on hardware:
     Return top 5 models that will run well, with download commands

3. Download and install:
   - installModel(modelSpec) — Install a model:
     modelSpec: { name, runtime, quantization? }
     Route to appropriate driver:
       - Ollama: ollama.pullModel(name)
       - GGUF: download from HuggingFace, save to modelsDir
     Show progress bar (callback-based)
   
   - installRecommended(hardware) — Install the best model for the hardware
   
   - RECOMMENDED_MODELS — Curated list of models known to work well for social media tasks:
     {
       'llama4-8b-instruct': {
         ollama: 'llama4:8b-instruct',
         gguf: 'https://huggingface.co/...',
         sizeGB: 4.7,
         minRAM: 8,
         quality: 'excellent',
         speed: 'fast',
         bestFor: ['comments', 'posts', 'analysis']
       },
       'phi4-mini': {
         ollama: 'phi4:mini',
         sizeGB: 2.2,
         minRAM: 4,
         quality: 'good',
         speed: 'very-fast',
         bestFor: ['comments', 'sentiment']
       },
       'gemma3-9b': { ... },
       'mistral-7b-instruct': { ... },
       'qwen3-7b': { ... },
       'deepseek-r1-7b': { ... },
     }

4. Selection:
   - selectModel(task, preferences?) — Auto-select the best available model for a task:
     task: 'comment' | 'post' | 'thread' | 'analysis' | 'sentiment' | 'summary'
     preferences: { speed?: 'fast'|'quality', maxSizeGB?: number }
     
     Selection algorithm:
     a. Get all available models (discoverModels)
     b. Filter by hardware compatibility
     c. Score by task suitability (from RECOMMENDED_MODELS.bestFor)
     d. Apply preferences (speed vs quality tradeoff)
     e. Return best match with justification
   
   - setDefaultModel(task, modelName) — Set user's preferred model for a task
   - getDefaultModel(task) — Get user's preferred model

5. Benchmarking:
   - benchmarkModel(modelName, tasks) — Run standardized benchmarks:
     Tasks: ['comment-generation', 'sentiment-analysis', 'post-creation', 'summarization']
     For each task:
       - Run 5 sample prompts
       - Measure: tokens/second, time-to-first-token, quality score (length, coherence check)
     Return: { model, results: [{ task, avgTokPerSec, avgLatency, qualityScore }] }
   
   - benchmarkAll() — Benchmark all available models, return comparison table
   - getBenchmarkHistory() — Load saved benchmark results

6. Storage management:
   - getStorageUsage() — Total size of downloaded models
   - cleanupModels(keepTop) — Remove least-used models to free space
   - getModelUsageStats() — Track which models are used most

Persist preferences and benchmarks to ~/.xactions/model-config.json.
Author: @author nich (@nichxbt)
```

---

### Prompt 7: Prompt Optimizer for Local Models

```
You are building the Prompt Optimizer for XActions Local AI.

Create file: src/local-ai/promptOptimizer.js

Cloud LLMs (GPT-4, Claude) handle verbose, complex prompts well. Local 7B-13B models need shorter, clearer prompts optimized for their capabilities. This optimizer adapts XActions' prompts for local model performance.

Build:

1. PromptOptimizer class:
   constructor(options):
     - modelSize: '1b' | '3b' | '7b' | '13b' | '30b' | '70b' (affects optimization level)
     - contextWindow: number (affects truncation)
     - useJsonMode: boolean (whether model supports structured JSON output)

2. Prompt templates for XActions tasks:
   Store optimized prompt templates for each task and model size tier:

   COMMENT GENERATION:
   - 70b+: Full persona context, examples, tone guidelines, topic analysis (same as cloud)
   - 7b-13b: Condensed persona, 2 examples, direct instruction
   - 1b-3b: Minimal instruction, single example, very constrained output
   
   Templates:
   comment_7b: `Write a short reply to this tweet. Be {tone}. Max {maxLength} chars.

Tweet: "{tweetText}"
By: @{author}

Your reply:`

   comment_13b: `You are @{persona}. Your style: {toneDescription}.
Reply to this tweet naturally. Keep it under {maxLength} characters.

Tweet by @{author}: "{tweetText}"

Your reply (be authentic, no hashtags):`

   POST GENERATION:
   post_7b: `Write a {style} tweet about {topic}. Be {tone}. Max 280 chars.

Tweet:`

   post_13b: Full persona context with topic and style guidelines

   SENTIMENT ANALYSIS:
   sentiment_all: `Classify this tweet's sentiment as positive, negative, or neutral.
Tweet: "{text}"
Sentiment:`

   THREAD COMPOSITION:
   thread_7b: `Write a 3-tweet thread about {topic}. Each tweet max 280 chars.

Tweet 1:`

   SUMMARIZATION:
   summary_7b: `Summarize in 2 sentences:
"{text}"
Summary:`

3. Optimization functions:
   - optimizePrompt(prompt, modelSize) — Adapt a prompt for the target model size:
     a. Truncate context to fit context window (leave room for response)
     b. Simplify instructions (remove nested conditionals for small models)
     c. Add output format constraints (small models need more structure)
     d. Inject few-shot examples for small models (improves quality significantly)
     e. Remove meta-instructions small models can't follow ("think step by step" doesn't help <7B)
   
   - buildComment(context, modelSize) — Build optimized comment generation prompt
   - buildPost(context, modelSize) — Build optimized post generation prompt
   - buildAnalysis(context, modelSize) — Build optimized analysis prompt
   - buildSentiment(text, modelSize) — Build optimized sentiment prompt
   - buildThread(context, modelSize) — Build optimized thread prompt

4. Output parsing:
   - parseOutput(raw, task) — Clean and validate model output:
     a. Strip thinking/reasoning tags (for models that output <think>...</think>)
     b. Remove "Sure, here's" prefixes and "I hope this helps" suffixes
     c. Trim to character limits
     d. Validate JSON if json format was requested
     e. Remove unwanted hashtags (small models add them unprompted)
     f. Fix encoding issues
   
   - enforceCharLimit(text, limit) — Intelligently truncate without cutting words
   - extractJSON(text) — Extract JSON from mixed text output

5. Quality scoring:
   - scoreOutput(output, task, context) — Score output quality (0-100):
     Factors:
     - Length appropriateness (not too short, not too long)
     - Relevance to context (keyword overlap)
     - Formatting (no excessive capitalization, proper punctuation)
     - Authenticity (doesn't sound robotic)
     Return: { score, issues: string[] }
   
   - shouldRetry(output, task) — Returns true if output quality is too low
     Threshold: score < 40

Author: @author nich (@nichxbt)
```

---

### Prompt 8: Token Counter (Offline)

```
You are building an offline token counter for XActions Local AI.

Create file: src/local-ai/tokenCounter.js

Cloud APIs count tokens for you. Local models need client-side token counting for context window management. This must work WITHOUT external API calls.

Build:

1. TokenCounter class:
   constructor(options):
     - method: 'estimate' | 'tiktoken' | 'model-specific' (default 'estimate')

2. Fast estimation (no dependencies):
   - estimateTokens(text) — Quick estimation:
     Rule of thumb: ~4 characters per token for English, ~2 for Chinese/Japanese
     Algorithm:
     a. Count words (split by whitespace)
     b. Token estimate = words * 1.3 + specialChars * 0.5
     c. Adjust for code content (more tokens per word)
     d. Return: { tokens: number, method: 'estimate', confidence: 'approximate' }
   
   - estimateTokensAccurate(text) — Better estimation:
     a. Split text into segments: words, numbers, punctuation, whitespace
     b. Count BPE-style: common words = 1 token, uncommon = 2-3, long words = word.length/4
     c. Account for special characters and codepoints
     d. Return: { tokens: number, method: 'heuristic', confidence: 'good' }

3. Tokenizer-based counting (more accurate):
   - countTokensLlama(text) — Count tokens using Llama tokenizer patterns:
     Implement a simplified BPE tokenizer that approximates Llama's tokenization
     Use common merge rules for English text
   
   - countTokensChatML(messages) — Count tokens for chat format:
     Add overhead per message: role tokens, separator tokens, formatting
     messages: Array<{ role, content }>
     Return: total tokens including format overhead

4. Context window management:
   - fitsInContext(text, contextWindow, reserveForOutput) — Check if text fits:
     Return: { fits: boolean, tokenCount: number, remaining: number, needsTruncation: boolean }
   
   - truncateToFit(text, maxTokens) — Intelligently truncate:
     Strategy: 
     a. If slightly over, remove last paragraph
     b. If significantly over, keep first and last 20% (most important parts)
     c. Never cut mid-sentence
     Return: { text: string, originalTokens: number, truncatedTokens: number }
   
   - truncateMessages(messages, maxTokens) — Truncate chat history to fit:
     Strategy: Keep system message and last N messages that fit
     Remove oldest messages first (but always keep system message)

5. Utilities:
   - tokensToCharacters(tokens) — Approximate character count from tokens
   - characterToTokens(chars) — Approximate token count from characters
   - getContextWindow(modelName) — Return known context window for model:
     Known windows: { 'llama4:8b': 131072, 'phi4': 16384, 'gemma3': 8192, 'mistral-7b': 32768, ... }

Author: @author nich (@nichxbt)
```

---

### Prompt 9: Local Agent Runner

```
You are building the Local Agent Runner for XActions — the component that runs the full XActions AI agent entirely on local models.

Create file: src/local-ai/localAgent.js

This replaces the cloud-dependent parts of the XActions agent system with local inference, enabling fully offline, privacy-first automation.

Context:
- src/agents/thoughtLeaderAgent.js — The main agent loop (engagement, posting, monitoring)
- src/personaEngine.js — Persona management
- src/algorithmBuilder.js — Algorithm training
- src/autoReply.js — Auto-reply generation
- src/sentimentAnalyzer.js — Sentiment analysis
- src/agents/contentCalendar.js — Content scheduling

Build:

1. LocalAgent class:
   constructor(options):
     - llm: LLMInterface instance (from llmInterface.js)
     - persona: object (from personaEngine)
     - schedule: object (activity schedule)
     - browserAgent: object (from browser-use module, optional)
     - authToken: string (X/Twitter session cookie)

2. Agent capabilities (each using local LLM):
   - generateComment(tweet) — Generate a contextual reply to a tweet:
     a. Build prompt using promptOptimizer
     b. Include persona context (tone, style, topics)
     c. Generate via local LLM
     d. Parse and validate output
     e. Quality check — regenerate if below threshold
     f. Return comment text
   
   - generatePost(topic?) — Generate an original tweet:
     a. Select topic from persona's topic list (or use provided topic)
     b. Build post prompt with persona context
     c. Generate via local LLM
     d. Enforce 280 character limit
     e. Return post text
   
   - generateThread(topic, tweetCount) — Generate a thread:
     a. Generate outline (topic → key points)
     b. Generate each tweet in sequence, maintaining coherence
     c. Enforce per-tweet character limit
     d. Return array of tweet texts
   
   - analyzeSentiment(text) — Local sentiment analysis:
     Use local LLM with constrained output (positive/negative/neutral)
   
   - analyzeEngagement(tweets) — Analyze engagement patterns:
     Summarize what content performs best based on tweet metrics
   
   - selectTargetTweets(timeline) — Choose which tweets to engage with:
     Score tweets by: relevance to persona topics, engagement potential, author influence
     Return top N tweets to engage with

3. Agent loop (the main automation loop):
   - start() — Begin the automated agent:
     Run a continuous loop (with configurable interval):
     a. Check schedule: is it active hours?
     b. Scrape timeline for relevant tweets
     c. Select target tweets for engagement
     d. For each target: generate and post comment
     e. Periodically generate original posts
     f. Track metrics: comments posted, posts created, engagement rate
     g. Sleep between actions (rate limit aware)
     h. Log all actions to ~/.xactions/agent-log.json
   
   - stop() — Stop the agent gracefully
   - pause() / resume() — Temporary pause/resume
   - getStatus() — Return current status: { running, paused, metrics, lastAction, nextAction }

4. Metrics tracking:
   - Track: comments generated, posts created, followers gained, engagement rate, model inference time
   - Store daily summaries to ~/.xactions/agent-metrics/YYYY-MM-DD.json
   - getMetrics(period?) — Return metrics for today, week, or all time

5. Privacy features:
   - All inference happens locally — NO data sent to any cloud API
   - Agent logs and metrics stored only on local filesystem
   - No telemetry, no analytics, no phone-home
   - DATA_PRIVACY.md — Document exactly what data stays local

Author: @author nich (@nichxbt)
```

---

### Prompt 10: First-Run Setup Wizard

```
You are building the first-run setup wizard for XActions Local AI.

Create file: src/local-ai/setup.js

This interactive CLI wizard guides users through setting up local AI for XActions — detecting hardware, installing a model, and running a test.

Build:

1. Setup wizard flow:
   - async runSetup() — Main entry point:
   
   Step 1: Welcome
     Console output: "🤖 XActions Local AI Setup"
     Explain: Run AI-powered Twitter automation 100% locally — no API keys, no cloud, full privacy.
   
   Step 2: Hardware Detection
     Call hardwareDetector.detectHardware()
     Display: CPU, RAM, GPU (if any), available storage
     Display: recommendModelSize() results
   
   Step 3: Runtime Detection
     Check for installed runtimes: Ollama, LM Studio, llama.cpp, Llamafile
     If none found:
       Recommend Ollama (easiest to install)
       Provide install command:
         macOS: curl -fsSL https://ollama.com/install.sh | sh
         Linux: curl -fsSL https://ollama.com/install.sh | sh
         Windows: Download from https://ollama.com/download
       Ask user if they want to install now (auto-run the command)
       Wait for installation and verify
   
   Step 4: Model Selection
     Show recommended models with:
       Name, Size, Quality rating, Speed rating, Best for
     Let user choose or accept default recommendation
     Download the model (show progress bar)
     Verify model works (run a test generation)
   
   Step 5: Test Run
     Run a quick test:
     a. Generate a test comment: "Reply to: 'Just shipped a new feature! 🚀'"
     b. Measure generation speed (tokens/second)
     c. Display the generated text
     d. Show quality score
     e. Show performance: "Generated in 2.3s (24 tokens/sec)"
   
   Step 6: Configuration
     Save config to ~/.xactions/local-ai-config.json:
     {
       runtime: 'ollama',
       model: 'llama4:8b-instruct',
       hardware: { ... },
       benchmark: { tokPerSec, latency },
       setupDate: ISO timestamp
     }
     
   Step 7: Done
     Print: "✅ XActions Local AI is ready!"
     Print: "Run: xactions agent --local to start your local AI agent"
     Print: "Run: xactions local-ai benchmark to test model performance"

2. CLI integration:
   - xactions local-ai setup — Run the setup wizard
   - xactions local-ai status — Show current config, model, performance stats
   - xactions local-ai models — List available and installed models
   - xactions local-ai install <model> — Install a specific model
   - xactions local-ai benchmark — Run performance benchmarks
   - xactions local-ai test <prompt> — Quick test generation

3. Non-interactive mode:
   - runSetup({ interactive: false, model: 'llama4:8b', runtime: 'ollama' })
   - Auto-detect, auto-install, auto-configure without prompts
   - For CI/CD and Docker environments

Author: @author nich (@nichxbt)
```

---

### Prompt 11: Context Manager

```
You are building the Context Manager for XActions Local AI.

Create file: src/local-ai/contextManager.js

Local models have limited context windows (4K-128K tokens). This manages conversation context, compression, and smart truncation to maximize the useful context within those limits.

Build:

1. ContextManager class:
   constructor(options):
     - maxTokens: number (from model's context window)
     - reserveForOutput: number (default 1024 tokens)
     - compressionStrategy: 'truncate' | 'summarize' | 'sliding-window' (default 'sliding-window')
     - tokenCounter: TokenCounter instance

2. Conversation context management:
   - addMessage(role, content) — Add a message to the conversation
   - getContext() — Return messages that fit in the context window:
     Always include: system message + last N messages that fit
   - clear() — Clear conversation history
   - getTokenCount() — Current token usage

3. Smart context compression:
   - compress(messages, targetTokens) — Compress messages to fit:
     Strategy: 'truncate':
       Remove oldest messages (keep system + recent)
     
     Strategy: 'summarize':
       Summarize older messages into a single "context summary" message
       Use the local LLM itself to generate summaries
       Keep summary + recent messages
     
     Strategy: 'sliding-window':
       Keep a sliding window of the most recent N messages
       Periodically compress older messages into a running summary
       Optimal for long-running agent conversations

4. XActions-specific context building:
   - buildAgentContext(persona, recentActivity, targetTweet) — Build context for the agent:
     Prioritize information by importance:
     a. System prompt with persona (highest priority, always included)
     b. Target tweet being replied to
     c. Recent engagement history (last 5 interactions)
     d. Topic context (trending in persona's niche)
     e. Performance data (what's been working)
     Fit all within context window, truncating lower-priority items first
   
   - buildAnalysisContext(data) — Build context for analysis tasks:
     Pack as much data as possible, with smart truncation:
     - Summarize large datasets into statistics
     - Sample representative items instead of including all
   
   - buildThreadContext(topic, existingTweets) — Build context for thread generation:
     Include: persona, topic, published tweets so far, remaining tweet count

5. Memory/RAG (lightweight, no vector DB):
   - LongTermMemory class:
     Store important facts extracted from agent interactions:
     - Persona preferences discovered over time
     - Best-performing content patterns
     - User interaction history
     Store as JSON file, load relevant memories into context based on keywords
   
   - addMemory(fact, keywords, importance) — Store a memory
   - recallMemories(query, maxTokens) — Retrieve relevant memories that fit in budget
   - pruneMemories(maxCount) — Remove oldest/least-important memories

Author: @author nich (@nichxbt)
```

---

### Prompt 12: Model Benchmarker

```
You are building the Model Benchmarker for XActions Local AI.

Create file: src/local-ai/benchmarker.js

This runs standardized benchmarks specifically designed for XActions' social media AI tasks, helping users choose the best model.

Build:

1. Benchmarker class:
   constructor(options):
     - llmInterface: LLMInterface instance
     - tokenCounter: TokenCounter instance

2. Benchmark tasks (XActions-specific):
   
   TASK: Comment Generation
     5 test tweets with known good replies for quality comparison:
     a. "Just launched my first SaaS! $0 to $1k MRR in 30 days 🚀"
     b. "Hot take: Vim is better than VS Code and it's not even close"
     c. "Bitcoin just hit $200k. Who's still holding? 💎"
     d. "Studying machine learning. Any resource recommendations?"
     e. "This market is brutal. Down 40% this month. Should I sell?"
     
     Measure: tokens/sec, time-to-first-token, output length, quality score
   
   TASK: Post Generation
     5 topic prompts:
     a. Generate a tweet about building in public
     b. Generate a tweet about AI developments
     c. Generate a tweet about crypto markets
     d. Generate a tweet about productivity tips
     e. Generate a tweet about open source
     
     Measure: tokens/sec, character count, hashtag-free check, quality score
   
   TASK: Sentiment Analysis
     10 tweets with known sentiment labels:
     Measure: accuracy (% correct), tokens/sec, consistency
   
   TASK: Thread Generation
     2 topics (3-tweet threads):
     Measure: tokens/sec, per-tweet character limit compliance, coherence
   
   TASK: Summarization
     2 long texts (500+ words):
     Measure: tokens/sec, summary length, key point retention

3. Benchmark execution:
   - runBenchmark(modelName, tasks?) — Run all or selected benchmarks:
     tasks: 'all' | string[] (default 'all')
     For each task:
       a. Warm up: one throw-away generation
       b. Run 3 iterations
       c. Average the metrics
       d. Score quality on 0-100 scale
     Return: BenchmarkResult {
       model, runtime, timestamp, hardware,
       results: { [task]: { avgTokPerSec, avgLatency, avgQuality, samples } },
       overall: { speed, quality, suitability }
     }
   
   - compareBenchmarks(results[]) — Compare multiple benchmark results:
     Generate comparison table: model × metric
     Highlight winner in each category
     Return formatted comparison string
   
   - runQuickBench(modelName) — 30-second quick benchmark:
     Just run 1 comment generation + 1 sentiment analysis
     Return: { speed: 'fast'|'moderate'|'slow', quality: 'good'|'acceptable'|'poor' }

4. Quality scoring (automated, no LLM needed):
   - scoreComment(generated, originalTweet) — 0-100:
     + Length appropriate (20-200 chars): +30
     + Contains relevant keywords from original: +20
     + No excessive hashtags: +10
     + No "As an AI" or robotic phrases: +15
     + Proper punctuation: +10
     + Matches requested tone: +15
   
   - scorePost(generated, topic) — 0-100:
     + Under 280 characters: +20
     + Contains topic keywords: +20
     + Engaging (has hook, question, or call to action): +20
     + No hashtag spam: +15
     + Original (not generic): +15
     + Proper formatting: +10

5. Persistence:
   - Save all benchmark results to ~/.xactions/benchmarks/
   - getBenchmarkHistory(modelName?) — Get past benchmarks
   - generateReport() — Generate a markdown report of all benchmarks

Author: @author nich (@nichxbt)
```

---

### Prompt 13: Local AI Module Entry Point and CLI

```
You are building the main entry point and CLI for XActions Local AI.

Create file: src/local-ai/index.js

Build:

1. Re-export all submodules:
   - hardwareDetector
   - llmInterface, createLocalLLM, createHybridLLM
   - drivers: { ollama, llamaCpp, lmStudio, llamafile, openrouter }
   - modelManager
   - promptOptimizer
   - tokenCounter
   - contextManager
   - localAgent
   - benchmarker
   - setup

2. createLocalAI(options) — All-in-one factory:
   options: {
     runtime: 'auto' | 'ollama' | 'llamacpp' | 'lmstudio' | 'llamafile',
     model: string (auto-select if not specified),
     persona: string | object (persona name or config),
     fallbackToCloud: boolean (default false),
     contextWindow: number (auto-detect),
   }
   
   Returns: {
     llm: LLMInterface,
     models: ModelManager,
     prompts: PromptOptimizer,
     tokens: TokenCounter,
     context: ContextManager,
     agent: LocalAgent,
     benchmark: Benchmarker,
     hardware: object,
     
     // Convenience:
     generate(prompt) — Quick text generation
     comment(tweet) — Generate a comment
     post(topic) — Generate a post
     sentiment(text) — Analyze sentiment
     startAgent() — Start the local agent loop
   }

3. CLI commands (integrate with src/cli/):
   - xactions local-ai setup — First-run setup wizard
   - xactions local-ai status — Show current configuration
   - xactions local-ai models — List installed models
   - xactions local-ai install <model> — Install a model
   - xactions local-ai remove <model> — Remove a model
   - xactions local-ai benchmark [model] — Run benchmarks
   - xactions local-ai test <prompt> — Quick test
   - xactions local-ai comment <tweet-url> — Generate a comment for a tweet
   - xactions local-ai post [topic] — Generate a post
   - xactions local-ai agent start — Start the local AI agent
   - xactions local-ai agent stop — Stop the agent
   - xactions local-ai agent status — Agent metrics and status

4. Integration with existing XActions:
   - Patch src/agents/llmBrain.js to use local LLM when configured:
     Add XACTIONS_LLM_MODE env var: 'local' | 'cloud' | 'hybrid'
     When 'local': all inference uses local models
     When 'hybrid': try local first, fall back to cloud on failure
   
   - Patch xactions agent command to support --local flag:
     xactions agent --local — Run thought leader agent with local inference

5. Standalone mode (node src/local-ai/index.js --setup):
   Run setup wizard if first time, otherwise show status.

Author: @author nich (@nichxbt)
```

---

### Prompt 14: Test Suite

```
You are building the test suite for XActions Local AI.

Create test files using vitest:

1. tests/local-ai/hardwareDetector.test.js:
   - Test detectHardware returns valid structure
   - Test recommendModelSize for different RAM amounts (4GB, 8GB, 16GB, 32GB, 64GB)
   - Test GPU detection (mock nvidia-smi output)
   - Test checkRuntime for each runtime
   - Test cross-platform compatibility (mock /proc/cpuinfo vs sysctl)

2. tests/local-ai/llmInterface.test.js:
   - Test provider auto-detection with mocked HTTP calls
   - Test generate() returns correct structure
   - Test chat() with message history
   - Test generateComment() with persona context
   - Test generatePost() respects character limit
   - Test analyzeSentiment() returns valid sentiment
   - Test model auto-selection picks appropriate model
   - Test fallback from local to cloud when local fails

3. tests/local-ai/drivers.test.js:
   - Test OllamaDriver.listModels with mocked HTTP response
   - Test OllamaDriver.generate with mocked response
   - Test OllamaDriver.generateStream yields tokens
   - Test LlamaCppDriver.completion with mocked response
   - Test LMStudioDriver.chatCompletion with mocked response
   - Test all drivers implement the same interface
   - Test error handling (connection refused, timeout, model not found)

4. tests/local-ai/promptOptimizer.test.js:
   - Test optimizePrompt shortens prompt for small models
   - Test buildComment generates valid prompt for each model size
   - Test parseOutput strips thinking tags
   - Test parseOutput removes "As an AI" patterns
   - Test enforceCharLimit doesn't cut mid-word
   - Test extractJSON handles mixed text/JSON output
   - Test scoreOutput gives higher scores to quality outputs
   - Test templates for all task types exist

5. tests/local-ai/tokenCounter.test.js:
   - Test estimateTokens is within 20% of actual for English text
   - Test fitsInContext returns correct boolean
   - Test truncateToFit maintains sentence boundaries
   - Test truncateMessages keeps system message
   - Test countTokensChatML includes format overhead

6. tests/local-ai/integration.test.js:
   - Full integration: detect hardware → select model → generate comment → score quality
   - Test local agent generates correct number of actions per loop
   - Test context manager compresses conversation correctly
   - Test benchmarker produces valid results
   - Mock all LLM calls with realistic responses

Each file: minimum 8 test cases.
Author: @author nich (@nichxbt)
```

---

### Prompt 15: Documentation and Skill File

```
You are writing the complete documentation for XActions Local AI.

Create these files:

1. skills/local-first-ai/SKILL.md:
   - Title: Local-First AI — Zero-Cost, Private AI Agent
   - Description: Run XActions' full AI agent on your own hardware
   - Prerequisites: Node.js 20+, 8GB+ RAM, Ollama OR LM Studio
   - Quick Start: 4 commands from zero to running local AI agent
   - Supported runtimes with pros/cons
   - Recommended models table (name, size, quality, speed, best-for)
   - Configuration reference
   - Examples:
     a. Generate a comment locally
     b. Run the thought leader agent offline
     c. Benchmark models
     d. Use hybrid mode (local + cloud fallback)
     e. Set up for a Docker deployment
   - Performance tuning guide
   - Troubleshooting: 10 common issues

2. docs/local-ai.md:
   - Complete technical documentation
   - Architecture diagram
   - Unified LLM Interface API reference
   - Driver API reference (Ollama, llama.cpp, LM Studio, Llamafile)
   - Model Manager API reference
   - Prompt Optimizer: how prompts are adapted for local models
   - Token Counter: estimation algorithms explained
   - Context Manager: compression strategies
   - Local Agent: how the automation loop works
   - Privacy guarantees: exactly what stays local
   - Performance benchmarks: real numbers for different hardware
   - Code examples for every major function
   - Comparison: local vs cloud (cost, speed, quality, privacy)

3. docs/local-ai-models.md:
   - Complete model compatibility guide
   - For each recommended model:
     Name, parameters, quantization options, RAM requirements,
     quality for each task type, download commands, configuration
   - Performance comparison table
   - How to add custom models

4. Update README section (provide text to add):
   - Add "🏠 Local AI" to features
   - Add local AI quick start section
   - Add privacy badge/section

All content must use real XActions code paths and real model names. No placeholders.
Author: @author nich (@nichxbt)
```

---

## Success Criteria

- [ ] Unified LLM interface works as drop-in replacement for llmBrain.js
- [ ] Ollama driver communicates with Ollama API successfully
- [ ] llama.cpp driver can start server and run inference
- [ ] LM Studio and Llamafile drivers work
- [ ] Model manager discovers, downloads, and selects models
- [ ] Prompt optimizer produces quality output from 7B models
- [ ] Token counter estimates are within 20% of actual
- [ ] Context manager fits conversations within model limits  
- [ ] Local agent runs the full automation loop with local inference
- [ ] Setup wizard guides users from zero to running
- [ ] Benchmarker produces real performance numbers
- [ ] Full test suite passes with vitest
- [ ] Documentation is complete with real examples
- [ ] Zero cloud API calls when running in local mode
