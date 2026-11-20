// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Thread Summarizer Service
 * 
 * Summarizes Twitter/X threads through the free LLM lanes (src/ai/freeLLM.js).
 * Returns `available: false` when LLM calls are off or every lane fails.
 * 
 * @module api/services/threadSummarizer
 * @author nichxbt
 */

import { freeChat, llmEnabled } from '../../src/ai/freeLLM.js';

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
 * Summarize a thread with a free LLM
 *
 * @param {object} options
 * @param {Array<{text: string}>} options.tweets - Array of tweet objects with text
 * @param {string} [options.author] - Thread author username
 * @returns {Promise<{ summary: string, keyPoints: string[], readingTime: string }>}
 */
export async function summarizeThread(options = {}) {
  const { tweets, author } = options;

  if (!tweets || tweets.length === 0) {
    throw new Error('No tweets provided for summarization');
  }

  const texts = tweets.map((t) => (typeof t === 'string' ? t : t.text)).filter(Boolean);
  const readingTime = calculateReadingTime(texts);

  if (!llmEnabled()) {
    return {
      summary: null,
      keyPoints: [],
      readingTime,
      available: false,
      message: 'AI summaries are turned off on this server (XACTIONS_LLM=off).',
    };
  }

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
    const { text: content } = await freeChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 800, timeoutMs: 60_000 },
    );

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
    console.error('❌ Thread summarization error:', error.message);
    return {
      summary: null,
      keyPoints: [],
      readingTime,
      available: false,
      message: 'AI summary generation failed. The thread content is still available below.',
    };
  }
}
