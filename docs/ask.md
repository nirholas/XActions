# Ask XActions

> Ask how to do anything with XActions in plain language and get a sourced answer **plus the exact thing to run**. On the web at [xactions.app/ask](https://xactions.app/ask), in your terminal as `xactions ask`, and to an AI agent as the `x_ask` MCP tool. Free, no account, no API key.

Ask XActions is a conversational assistant for the toolkit. It searches the documentation, the 50 agent skills, the browser scripts, the marketing pages, and the GitHub repository, then streams an answer that cites its sources with clickable `[1]` `[2]` markers.

An explanation is only half of what someone asking "how do I unfollow all users" wants. The other half is the thing they run, so every answer ends with the **runnable actions** behind it: the browser script to paste (copied straight from source, with the x.com page to paste it on), the terminal command to type, and the MCP tool an agent should call. Those come from a catalog built out of the repository itself, so it cannot drift from what the code actually offers.

## Three ways to ask

| Surface | Use it when |
|---|---|
| [xactions.app/ask](https://xactions.app/ask) | You are reading the docs and want an answer with buttons |
| `xactions ask "..."` | You are in a terminal and want the command without leaving it |
| `x_ask` MCP tool | An AI agent needs to know how the toolkit works before acting |

## Using it

Open [xactions.app/ask](https://xactions.app/ask), type a question, press Enter. Or deep-link a question:

```
https://xactions.app/ask?q=how+do+i+unfollow+everyone
```

- **History** (top right) lists past conversations. They live in your browser's `localStorage`; nothing is stored on the server, which is what the **Private** badge means.
- **Auto / model picker** (in the composer) chooses who answers. `Auto` walks the free lanes below. Pick a provider and paste your own key to make it answer first; the key stays in your browser and is sent only with your question.
- Every answer has **Copy** and **Retry**, code blocks have a copy button, and source chips open the doc, script page, or GitHub file that backed the answer.
- Keyboard: `Enter` sends, `Shift+Enter` adds a line, `/` focuses the box, `Esc` stops a streaming answer, `Ctrl/Cmd+Shift+O` starts a new conversation.

## In the terminal

```bash
xactions ask "how do I unfollow everyone?"
xactions ask "scrape followers" --json          # machine-readable: answer, sources, actions
echo "how do I download a video" | xactions ask # reads a piped question
xactions ask "post a thread" --provider groq --key gsk_...  # answer with your own key
```

The answer streams as it is written, wrapped to your terminal, and ends with a **Run it** block and the sources. Retrieval is local to the installed package, so it still answers with no network once the lanes are unreachable. Flags: `--json`, `--quiet`, `--no-sources`, `--provider`, `--key`, `--model`.

## As an MCP tool

`x_ask` lets an agent read the manual instead of guessing at it. Point Claude Desktop, Cursor, or any MCP client at the XActions server ([MCP setup](mcp-setup.md)) and the agent can ask before it acts:

```json
{ "name": "x_ask", "arguments": { "question": "how do I unfollow everyone?" } }
```

```json
{
  "question": "how do I unfollow everyone?",
  "answer": "Paste the Unfollow Everyone script into the DevTools console on ...",
  "lane": "llm7",
  "actions": [
    { "kind": "script", "id": "unfollow-everyone", "run": "Open x.com/YOUR_USERNAME/following, press F12, paste into the Console tab", "raw": "https://raw.githubusercontent.com/..." },
    { "kind": "mcp", "id": "x_unfollow_all", "run": "Call x_unfollow_all with confirm" }
  ],
  "sources": [{ "n": 1, "title": "Unfollow Everyone", "url": "https://..." }]
}
```

Pass `actionsOnly: true` to skip the written answer and get just the matching scripts, commands and tools. That path never calls a model, so it returns in milliseconds: use it when the agent only needs to know *which* tool does the job.

`x_ask` is a read tool. It touches no X account, needs no session, and works with no API key.

## How it works

```
question ──► BM25 search over dashboard/data/ask-index.json  ─┐
         └─► GitHub search (issues, PRs; code with a token) ──┴─► numbered sources
                                                                        │
                       system prompt + sources + question ──► free LLM chain ──► streamed answer
```

1. **Index.** `npm run ask:index` (`scripts/build-ask-index.mjs`) strips YAML frontmatter and SEO keyword lists (both matched queries while teaching the reader nothing), then chunks `docs/**/*.md`, `skills/*/SKILL.md`, `tutorials/**/*.md`, the top-level README/CHANGELOG, the header comments of every browser script in `src/` and `scripts/`, and the text of the dashboard pages (FAQ, pricing, features, ...). Each chunk carries the live URL it came from: the rendered docs page when one exists (via `dashboard/docs/_pages-manifest.json`), the `/scripts/<slug>` page for a script, or the GitHub blob URL. The result is `dashboard/data/ask-index.json`, served at `/data/ask-index.json`. `npm run docs:check` fails when the committed index is stale.
2. **Retrieval.** `src/ask/engine.js` builds a BM25 searcher over the chunks at startup (about 20 ms per query), with a small synonym map bridging how people ask ("all", "twitter", "retweet") to how the docs are written ("everyone", "X", "repost"). Titles are boosted, results are capped per document, and a live GitHub issues/PR search is merged in so recent bug reports show up too.
3. **Actions.** `src/ask/actions.js` ranks the catalog in `dashboard/data/ask-actions.json` against the question *and* the passages retrieval just found. A passage from `docs/examples/unfollow-everyone.md` is direct evidence that `browser/unfollowEveryone.js` is the answer, which survives phrasing ("clean out my following", "start fresh") that no keyword match would. Terms carried by a large share of the catalog are ignored, so the product's own name cannot make "is XActions safe?" look like a request to run something, and a conceptual question correctly returns nothing runnable.
4. **Answer.** The sources, the question, and the matched actions go to the first lane that accepts the request in `src/ask/lanes.js`; the reply streams back as Server-Sent Events. The model is given the actions so its prose agrees with the buttons beside it instead of inventing a script name.

### The action catalog

`scripts/build-ask-actions.mjs` reads all three executable surfaces from source, so nothing is hand-maintained:

| Surface | Read from | Carries |
|---|---|---|
| Browser scripts | `browser/*.js`, `scripts/*.js` headers | title, description, the x.com page to paste it on, raw source URL, `/scripts/<slug>` page, whether `core.js` must be pasted first |
| CLI commands | the `.command()`/`.description()` calls in `src/cli/**` | full invocation including subcommand prefixes |
| MCP tools | the tool definitions in `src/mcp/server.js` | name, description, required arguments |

61 scripts exist in both `browser/` and `scripts/`; the catalog keeps whichever copy the generated page was built from, so the source quoted beside a link always matches the page it links to.

## Free LLM lanes

Every lane is an OpenAI-compatible chat endpoint reached with `fetch`, so the same file runs in Node, in the Cloudflare Worker, and in the browser. Lanes are tried in order; a `402`, `429`, `5xx`, or network error moves on to the next one.

| Order | Lane | Needs | Model |
|---|---|---|---|
| 1 | Your key (BYOK, from the model picker) | user-supplied | provider default |
| 2 | Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile |
| 3 | Cerebras | `CEREBRAS_API_KEY` | llama-3.3-70b |
| 4 | OpenRouter free tier | `OPENROUTER_API_KEY` | first live `:free` model (read from `/models`, never hardcoded) |
| 5 | xAI | `XAI_API_KEY` | grok-4.1-fast |
| 6 | Google AI Studio | `GEMINI_API_KEY` | gemini-2.5-flash-lite |
| 7 | Mistral | `MISTRAL_API_KEY` | mistral-small-latest |
| 8 | Cloudflare Workers AI | `CLOUDFLARE_AI_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | llama-3.3-70b-instruct-fp8-fast |
| 9 | LLM7 | nothing | gemini-3.1-flash-lite |
| 10 | Pollinations | nothing | openai-fast |
| 11 | OVH AI Endpoints (anonymous) | nothing | Meta-Llama-3.3-70B |

Lanes 9 to 11 need no key, so a deployment with an empty environment still answers. Add any of the keyed free tiers to get a stronger model and a separate quota pool. `GITHUB_TOKEN` is optional and only raises the GitHub search rate limit and enables code search.

Two facts about the keyless tier worth knowing before you rely on it:

- **Its quota is per IP and it is shared with everyone else on that address.** All three keyless lanes can be rate limited at once. Configure one keyed free tier (Groq is the easiest) if you want a lane that is reliably yours.
- **LLM7 refuses browser calls.** It answers `401` to any request carrying an `Origin` header, so it is server-side only and the in-browser fallback skips it (`browserSafe` in `buildLaneChain`). Pollinations and OVH send permissive CORS headers and do work from the page, as does any provider you supply your own key for.

### When every lane is busy

Rather than showing an error, the engine falls back to a **documentation digest**: the passages that matched the question, quoted from the index, with their links. It is labelled "Answered via the documentation index, no model lane was free" so nobody mistakes it for a written answer, and it is real retrieved text, never generated. This runs on every surface, so a question is never answered with nothing when the index already found the material.

## API

### `POST /api/ask`

```json
{
  "question": "how do I unfollow everyone?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "byok": { "provider": "groq", "apiKey": "gsk_..." }
}
```

`history` (optional) is the prior turns of the conversation, last six are used. `byok` (optional) makes that provider lead the chain; providers: `groq`, `openrouter`, `xai`, `openai`, `gemini`, `mistral`, `cerebras`.

The response is `text/event-stream`. Each `data:` line is one JSON event:

```
data: {"type":"sources","sources":[{"n":1,"title":"Unfollow Everyone","url":"https://...","kind":"doc","path":"docs/examples/unfollow-everyone.md"}]}
data: {"type":"actions","actions":[{"kind":"script","id":"unfollow-everyone","title":"Unfollow Everyone","run":"Open x.com/YOUR_USERNAME/following, press F12, paste into the Console tab","raw":"https://raw.githubusercontent.com/...","page":"/scripts/unfollow-everyone","why":"named by a cited source"}]}
data: {"type":"lane","lane":"llm7"}
data: {"type":"delta","text":"To unfollow everyone"}
data: {"type":"delta","text":" on X, paste"}
data: {"type":"done","lane":"llm7","model":"gemini-3.1-flash-lite","partial":false,"sources":[...]}
```

`done` carries `partial: true` when a lane died mid-answer and what had already streamed was kept, and `digest: true` with `lane: "docs"` when every lane was busy and the answer is the documentation digest described above.

An `error` event carries `message` when every lane failed. From a terminal:

```bash
curl -N https://xactions.app/api/ask \
  -H 'content-type: application/json' \
  -d '{"question":"how do I unfollow everyone?"}'
```

The `actions` event arrives before the first token, so a client can show what to run while the prose is still streaming.

### `GET /api/ask/health`

Index size and digest, action-catalog size, the lanes configured on this deployment, and the suggested questions.

## Where it runs

- **Cloudflare Worker** (`worker/index.js`): `/api/ask` is answered at the edge. The index is read from the static assets bundle and the lanes are called with `fetch`, so no origin server is needed.
- **Express** (`api/routes/ask.js`): mounted at `/api/ask` in both `api/server.js` and the Vercel `api/serverless.js`.
- **Browser fallback** (`dashboard/js/ask.js`): if `POST /api/ask` does not answer with an event stream (for example a static-only deploy, which is what xactions.app serves until the Worker is deployed), the page downloads `/data/ask-index.json` (about 650 KB gzipped, fetched only on this path and then cached), runs the same engine from `/js/ask/engine.js`, and calls the keyless lanes directly. A toast says so and the answer is labelled "in-browser".

## Development

```bash
npm run ask:index          # rebuild the index AND the action catalog, and mirror src/ask/ into dashboard/js/ask/
npm run ask:index:check    # exit 1 if either is stale (part of npm run docs:check)
npx vitest run tests/ask   # retrieval, action matching, lane failover, and the CLI and MCP surfaces end to end
```

Rebuild whenever you change docs, skills, tutorials, a script header, a dashboard page, a CLI command, or an MCP tool. The action catalog is derived from source, so adding a script or a command is enough to make it answerable: no list to update by hand.

Related: [MCP setup](mcp-setup.md), [CLI reference](cli-reference.md), [Browser scripts](browser-scripts.md), [REST API](rest-api.md).
