---
name: skill-id
description: One sentence describing what this skill does and when to use it. Include key actions, relevant features, and use cases. Used by agents to decide which skill to load.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Skill Name

Brief description of the skill — what it does and when to use it.

## Quick Reference

| Goal | Solution |
|------|----------|
| Do X | `path/to/script.js` or `xactions command` |
| Do Y | `path/to/other.js` |

## Implementation Details

Describe how to implement the feature. Include:
- Which file(s) to read or modify
- Which CLI command or script to use
- Whether this is a browser script, Node.js, MCP tool, or API route

### Browser Script Usage

If applicable, explain which page to navigate to and how to paste/run the script:

```js
// Paste src/your-script.js into DevTools console on x.com/page
```

### CLI Usage

```bash
xactions command <args>
```

### MCP Tool Usage

```
x_tool_name({ param: 'value' })
```

## Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENV_VAR` | Description | - |

## Rate Limiting & Safety

- Delay between actions: X seconds
- Daily limit guidance: N actions/day
- Rate limit detection: what to watch for
- Recovery: what to do if limited

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Common issue | Fix |

## Related Skills

- **related-skill-id** — why it's related
