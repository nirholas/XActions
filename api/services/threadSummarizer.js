/**
 * Thread Summarizer Service
 * 
 * Uses OpenRouter AI to generate summaries of Twitter/X threads.
 * Gracefully falls back if no OPENROUTER_API_KEY is configured.
 * 
 * @module api/services/threadSummarizer
 * @author nichxbt
 */

/**
 * Calculate estimated reading time
 * @param {string[]} texts - Array of tweet texts
 * @returns {string} Reading time like "2 min"
 */
export function calculateReadingTime(texts) {
  const totalWords = texts.join(' ').split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(totalWords / 200)); // ~200 WPM
  return `${minutes} min`;
}

/**
 * Summarize a thread using OpenRouter AI
 * 
 * @param {object} options
 * @param {Array<{text: string}>} options.tweets - Array of tweet objects with text
 * @param {string} [options.author] - Thread author username
 * @param {string} [options.apiKey] - OpenRouter API key (falls back to env)
 * @param {string} [options.model] - Model to use
 * @returns {Promise<{ summary: string, keyPoints: string[], readingTime: string }>}
 */
export async function summarizeThread(options = {}) {
  const { tweets, author, apiKey: providedKey, model } = options;

  if (!tweets || tweets.length === 0) {
    throw new Error('No tweets provided for summarization');
  }

  const apiKey = providedKey || process.env.OPENROUTER_API_KEY;
  const texts = tweets.map((t) => (typeof t === 'string' ? t : t.text)).filter(Boolean);
  const readingTime = calculateReadingTime(texts);

  // If no API key, return graceful fallback
  if (!apiKey) {
    return {
      summary: null,
      keyPoints: [],
      readingTime,
      available: false,
      message: 'Enable AI summaries by adding OPENROUTER_API_KEY to your environment variables.',
    };
  }

  const selectedModel = model || 'google/gemini-flash-1.5';

  // Build the thread text for the prompt
  const threadText = texts
    .map((text, i) => `[${i + 1}/${texts.length}] ${text}`)
    .join('\n\n');

  const systemPrompt = `You are a concise thread summarizer. Given a Twitter/X thread, provide:
1. A clear 2-3 sentence summary
2. 3-5 key bullet points capturing the main ideas, facts, arguments, and conclusions

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "summary": "<2-3 sentence summary>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"]
}

Rules:
- Be factual and neutral
- Capture the essence, not every detail  
- Key points should be self-contained (understandable without reading the thread)
- Keep each key point under 150 characters
- Do not add opinions or editorializing`;

  const userPrompt = author
    ? `Summarize this thread by @${author}:\n\n${threadText}`
    : `Summarize this thread:\n\n${threadText}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xactions.app',
        'X-Title': 'XActions Thread Summarizer',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter API error (${response.status}): ${errorBody}`);
      return {
        summary: null,
        keyPoints: [],
        readingTime,
        available: false,
        message: 'AI summary temporarily unavailable. Please try again later.',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      summary: result.summary || 'Summary not available.',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      readingTime,
      available: true,
    };
  } catch (error) {
    console.error('Thread summarization error:', error.message);
    return {
      summary: null,
      keyPoints: [],
      readingTime,
      available: false,
      message: 'AI summary generation failed. The thread content is still available below.',
    };
  }
}
