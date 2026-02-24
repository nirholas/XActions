# Adding New Features

## Checklist

1. Create the script in `src/` following [browser-script-patterns.md](browser-script-patterns.md)
2. Add documentation in `docs/examples/your-feature.md`
3. Update `README.md` — add to examples and feature matrix
4. If it belongs to an existing skill category, update that `skills/*/SKILL.md`
5. If it's a new category, create a new `skills/your-category/SKILL.md` with YAML frontmatter

## Documentation Template

```markdown
# Feature Name

Brief description.

## What It Does

1. Step one
2. Step two

## Browser Console Script

Navigate to: x.com/relevant/page
Paste in DevTools console.

## Notes

- Important caveats
```

## SKILL.md Frontmatter Template

```yaml
---
name: your-skill-name
description: Third-person description of what this does and when to use it.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---
```

## Code Style

- `const` over `let`, async/await over raw promises
- Descriptive `console.log` with emojis for visibility
- Comment complex selectors
- Author credit: `// by nichxbt`
- Use `data-testid` selectors when available (see [selectors.md](selectors.md))
