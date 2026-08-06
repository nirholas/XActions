#!/usr/bin/env node
// Hermes Content Poster — Format deslopped content for manual posting
// Usage: node hermes-poster.js [content-file]
// Reads a content file, splits it into tweet-sized chunks, outputs copy-paste ready text

import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = process.env.HERMES_CONTENT_DIR || `${process.env.HOME}/.hermes/cron/output`;

function parseContent(raw) {
  const lines = raw.trim().split('\n');
  const title = lines[0].replace(/[:\-–—].*$/, '').trim();
  const body = lines.slice(1).join('\n').trim();
  const tweets = splitIntoTweets(body);
  return { title, body, tweets };
}

function splitIntoTweets(text) {
  const maxLen = 280;
  const tweets = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxLen) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) tweets.push(current);
      if (sentence.length <= maxLen) {
        current = sentence.trim();
      } else {
        const words = sentence.split(' ');
        current = '';
        for (const word of words) {
          if ((current + ' ' + word).length <= maxLen) {
            current = (current + ' ' + word).trim();
          } else {
            if (current) tweets.push(current);
            current = word;
          }
        }
      }
    }
  }
  if (current) tweets.push(current);

  if (tweets.length > 1) {
    return tweets.map((t, i) => `${i + 1}/${tweets.length} ${t}`);
  }
  return tweets;
}

function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    const files = fs.readdirSync(CONTENT_DIR)
      .filter(f => f.startsWith('security-thread_') && f.endsWith('.txt'))
      .sort().reverse().slice(0, 10);

    if (files.length === 0) {
      console.log('No content files found.');
      process.exit(1);
    }

    console.log('Available content files:');
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('\nUsage: node hermes-poster.js <filename>');
    process.exit(0);
  }

  const filePath = path.isAbsolute(inputFile) ? inputFile : path.join(CONTENT_DIR, inputFile);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { title, tweets } = parseContent(raw);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Title: ${title}`);
  console.log(`Tweets: ${tweets.length}`);
  console.log(`${'='.repeat(60)}\n`);

  tweets.forEach((t, i) => {
    console.log(`--- Tweet ${i + 1} (${t.length} chars) ---`);
    console.log(t);
    console.log();
  });

  console.log('Copy each tweet above and post to X/Twitter manually.');
}

main();
