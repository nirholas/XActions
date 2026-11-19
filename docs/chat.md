# XActions Chat

> Attach an X account, a post or a thread, then ask about it. Answers cite the posts they come from, and each citation opens that post. On the web at [xactions.app/chat](https://xactions.app/chat). Free, no account, no login, no API key.

[Ask XActions](ask.md) answers "how do I use XActions". Chat answers "what is
this account saying": what they have been posting about, which numbers they
have shared, which posts did best, who they work with, or a draft post that
tags them and quotes their own figures back.

## Using it

1. Open [xactions.app/chat](https://xactions.app/chat), or **Chat** in the site sidebar.
2. Attach something to ask about: click the paperclip, or paste an x.com link
   straight into the message box, which attaches it instead of typing it.
   - **An account** (`@handle` or a profile link) reads the profile and its recent posts.
   - **A post link** reads the post and the thread around it.
   - Attach up to eight. Attach several accounts to compare them.
3. Ask, or pick one of the suggested questions. Each `[n]` in an answer links
   to the post behind it, and the chips under the answer list every post it cited.

Deep links attach and ask in one step:

```
https://xactions.app/chat?attach=@base,@CoinbaseDev&q=What+have+they+shipped+this+month
```

| Control | What it does |
|---|---|
| Model chip (top left) | Shows which model answered. Click to pick a provider and use your own key, which is shared with Ask and stays in your browser. `Auto` needs no key. |
| Context meter (top right) | Estimated tokens of everything attached, against the 24K one question can carry. Over budget, the oldest posts of the largest attachment are left out first, and the answer says how many. |
| Download (top right) | Saves the conversation as Markdown with every cited post's link. |
| Conversations (left rail) | Past chats with their attachments, searchable. Stored in your browser's `localStorage`; nothing is kept on the server. |

Keyboard: `Enter` sends, `Shift+Enter` adds a line, `/` focuses the box, `Esc` stops an answer.

## How it works

An attachment is read once, through the same logged-out readers the hosted
MCP server uses ([`src/edge/`](../src/edge/)), and saved with the conversation.
Every later question sends those posts back with it, so a follow-up makes no
requests to X at all, only one to a model.

Each question numbers the attached posts `[1]` to `[n]` and sends them to the
model fenced as data, with instructions to cite them and to say so when the
posts do not answer the question. Posts are written by strangers, so text in a
post that reads like an instruction is treated as something to quote, never
something to follow. Answers stream through the same free model lanes as Ask
([`src/ask/lanes.js`](../src/ask/lanes.js)): when one is busy, the next one answers.

Logged out, X often returns an account's popular posts rather than its latest,
and sometimes fewer posts than asked for. The chip under the box shows how many
posts each attachment carries.

## API

The page calls two routes, served at the edge by the Cloudflare Worker
([`worker/index.js`](../worker/index.js)) and by the Express API for a
self-host ([`api/routes/chat.js`](../api/routes/chat.js)):

```bash
# Resolve an attachment into a context item (JSON)
curl -s https://xactions.app/api/chat/context -H 'content-type: application/json' \
  -d '{"input":"@base"}' > base.json

# Ask about it: Server-Sent Events (sources, lane, delta, done, error), like /api/ask
jq -n --slurpfile item base.json '{question: "What have they posted about lately?", items: $item}' \
  | curl -sN https://xactions.app/api/chat -H 'content-type: application/json' -d @-
```

`POST /api/chat` takes `{ question, items, history?, byok? }`. `items` are the
objects `/api/chat/context` returned; the server re-checks them, caps their
size, and keeps every citation pointing at x.com. `GET /api/chat/health` lists
the model lanes and limits.

Code: [`src/chat/context.js`](../src/chat/context.js) (attachments, numbering,
budget), [`src/chat/engine.js`](../src/chat/engine.js) (prompt and streaming),
[`dashboard/chat.html`](../dashboard/chat.html) and
[`dashboard/js/chat.js`](../dashboard/js/chat.js) (the page).
