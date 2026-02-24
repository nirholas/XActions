---
name: grok-ai
description: Interacts with X/Twitter's Grok AI chatbot from the browser. Sends prompts, generates images, manages chat sessions, and integrates Grok into content creation workflows. Use when users want to automate Grok AI interactions, generate AI content, create AI images, or integrate Grok into their X workflow.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Grok AI Integration

Browser console scripts for interacting with X's built-in Grok AI chatbot — sending prompts, generating images, managing conversations, and integrating into content workflows.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Send prompts & manage Grok chats | `src/grokIntegration.js` | `x.com/i/grok` |
| Generate tweet content | `src/contentRepurposer.js` | `x.com/USERNAME` |
| Analyze sentiment of mentions | `src/sentimentAnalyzer.js` | `x.com/USERNAME` |
| Create content calendar | `src/contentCalendar.js` | `x.com/USERNAME` |

## Grok Integration

**File:** `src/grokIntegration.js`

Automates interactions with Grok AI through the X browser interface.

### How to Use

1. Navigate to `x.com/i/grok`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Features

- Send text prompts programmatically
- Queue multiple prompts for batch processing
- Extract and save Grok responses
- Start new chat sessions
- Generate images with Grok AI
- Export conversation history

### How It Works

1. Locates the Grok chat input field
2. Sets the prompt text via DOM manipulation
3. Triggers the send action
4. Waits for response to complete (monitors for streaming to stop)
5. Extracts response text from the conversation area
6. Supports queuing multiple prompts with delays between them

## DOM Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Chat input | `[data-testid="grokInput"]` | Text input field |
| Send button | `[data-testid="grokSendButton"]` | Submit prompt |
| Response area | `[data-testid="grokResponse"]` | AI response container |
| New chat button | `[data-testid="grokNewChat"]` | Start fresh conversation |
| Image gen toggle | `[data-testid="grokImageGen"]` | Switch to image mode |
| Message bubbles | `.grok-message` | Individual messages |
| Loading indicator | `[data-testid="grokLoading"]` | Response in progress |

## Grok Capabilities

### Text Generation
- Tweet drafts and variations
- Thread outlines
- Reply suggestions
- Bio writing
- Content summarization
- Trend analysis (Grok has real-time X data access)

### Image Generation
- AI-generated images from text prompts
- Multiple style options
- Profile picture ideas
- Banner image concepts
- Meme creation

### Real-Time Context
Grok has access to real-time X data, making it uniquely useful for:
- Summarizing trending topic discussions
- Analyzing public sentiment on topics
- Generating content relevant to current events
- Understanding what's happening on X right now

## Integration with XActions Workflow

### Content creation pipeline with Grok

1. **Research trends:** Use `src/trendingTopicMonitor.js` to find hot topics
2. **Generate ideas:** Send trending topics to Grok for content angle suggestions
3. **Draft content:** Use Grok to draft tweets on the chosen angle
4. **Optimize timing:** Use `src/tweetScheduleOptimizer.js` to pick the best posting time
5. **Post and track:** Use `src/tweetPerformance.js` to measure results
6. **Iterate:** Send performance data to Grok for improvement suggestions

### Audience engagement with Grok

1. Run `src/sentimentAnalyzer.js` to understand audience sentiment
2. Send sentiment data to Grok: "My audience sentiment is 60% positive. How can I improve?"
3. Use Grok's suggestions to adjust your content strategy
4. Generate reply templates with Grok for common comment types

### Batch content generation

1. Navigate to `x.com/i/grok`
2. Paste `src/grokIntegration.js`
3. Queue prompts for a week's worth of content:
   - "Write 5 tweets about [your niche] for Monday"
   - "Create a thread outline about [topic]"
   - "Generate 3 engagement questions for my audience"
4. Export all responses
5. Schedule generated content with `src/contentCalendar.js`

## Prerequisites

- **Grok access:** Requires X Premium subscription
- **Image generation:** Available with Premium, may have daily limits
- **Real-time data:** Always available when Grok is accessible

## Rate Limiting

- **Prompt rate:** Grok may limit requests per hour
- **Image generation:** Typically limited to ~10-25 images per day
- **Response time:** 3-15 seconds depending on complexity
- **Script delay:** Built-in 5-second wait between queued prompts

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Grok not responding | Check X Premium subscription status |
| Script can't find input field | Grok UI may have updated — inspect the input element for new selectors |
| Response not captured | Grok may still be streaming — increase wait time |
| Image generation fails | May have hit daily limit — try again tomorrow |
| "Grok is at capacity" | High traffic — retry in a few minutes |
| Chat history not exporting | Scroll up to load older messages before exporting |
| Prompts not sending | Ensure the input field has focus — click it first |

## Related Skills

- **content-posting** — Post Grok-generated content
- **discovery-explore** — Find topics to discuss with Grok
- **analytics-insights** — Track performance of AI-generated content
- **creator-monetization** — Use Grok to optimize monetization strategy
