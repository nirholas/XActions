---
name: articles-longform
description: Compose, preview, publish, and manage long-form Articles on X/Twitter. Premium+ feature. Includes article creation, formatting, media insertion, and performance tracking. Use when users want to write, publish, manage, or analyze X Articles.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Articles & Longform

Browser console scripts for creating and managing X/Twitter Articles (Premium+ feature).

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Publish an article | `src/articlePublisher.js` | `x.com/compose/article` |
| Convert thread to article | `src/contentRepurposer.js` | `x.com/USERNAME` |
| Track article performance | `src/tweetPerformance.js` | `x.com/USERNAME` |
| Generate blog outline | `src/contentRepurposer.js` | `x.com/USERNAME` |

## Article Publisher

**File:** `src/articlePublisher.js`

Assists with article composition on X's article editor.

### Features
- Title and subtitle insertion
- Body text formatting (headings, bold, italic, lists)
- Image and media embedding
- Draft saving
- Publish with cover image

### How to Use

1. Navigate to `x.com/compose/article`
2. Open DevTools (F12) -> Console
3. Paste the script -> Enter
4. Use controls to compose

### Controls
- `XActions.setTitle(text)` -- Set article title
- `XActions.setSubtitle(text)` -- Set subtitle
- `XActions.addParagraph(text)` -- Add body paragraph
- `XActions.addHeading(text, level)` -- Add heading (h2, h3)
- `XActions.addImage(url, alt)` -- Insert image
- `XActions.preview()` -- Preview formatted article
- `XActions.publish()` -- Publish (with confirmation prompt)

## DOM Selectors

| Element | Selector |
|---------|----------|
| Article editor | `[data-testid="articleEditor"]` |
| Title field | `[data-testid="articleTitle"]` |
| Body editor | `[data-testid="articleBody"]` |
| Cover image | `[data-testid="articleCoverImage"]` |
| Publish button | `[data-testid="articlePublishButton"]` |
| Save draft | `[data-testid="articleSaveDraft"]` |

## Content Strategy

### Thread-to-Article pipeline
1. Run `src/tweetPerformance.js` to find your best-performing threads
2. Run `src/contentRepurposer.js` -> `XActions.toBlog(i)` to generate article outline
3. Navigate to `x.com/compose/article`
4. Use `src/articlePublisher.js` to format and publish
5. Share the article link as a tweet for promotion

### SEO and reach optimization
- Use `src/contentRepurposer.js` -> `XActions.toBlog(i)` for keyword suggestions
- Articles get indexed by Google (unlike regular tweets)
- Include 1-2 images per 500 words for better engagement
- Link back to your profile and other articles

## Requirements
- X Premium+ subscription ($16/mo) required
- Articles support rich text, images, and embedded tweets
- No word count limit
- Articles are publicly accessible (even to non-X users)
- Articles have their own URL structure: `x.com/USERNAME/articles/ID`

## Notes
- Articles persist permanently (unlike tweets which get buried)
- Google indexes X Articles -- good for SEO
- Cover image recommended for social sharing preview
- Draft auto-saves periodically
