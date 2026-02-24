# Prompt 06: Add Progressive Disclosure Reference Files

You are an expert at Claude Agent Skills architecture, specifically the progressive disclosure pattern from Claude's official best practices.

You are working on the XActions project — an open-source X/Twitter automation toolkit by nichxbt.

## Context

The XActions project has 25 skills in `skills/*/SKILL.md`. Most are self-contained at 60-120 lines each. Following Claude's best practices, complex skills should have **reference files** that Claude loads only when needed, keeping SKILL.md as a concise overview.

Currently, only 1 skill (`growth-automation`) has a `references/` directory. Several skills would benefit from reference files.

## Your Task

Create reference files for the 5 most complex skills, and update their SKILL.md to point to them.

## Pattern to Follow

From SKILL.md:
```markdown
## Advanced features

**Detailed script configs**: See [references/configurations.md](references/configurations.md)
**All DOM selectors**: See [references/selectors.md](references/selectors.md)
```

Claude loads reference files **only when needed**. Keep references **one level deep** from SKILL.md (never chain references).

## Skills That Need References

### 1. `analytics-insights` (currently 150 lines — the longest "good" skill)

Create `skills/analytics-insights/references/script-configs.md`:
- Move the detailed per-script "What it reports" and "How to use" sections out of SKILL.md
- SKILL.md keeps the script selection table + 2-line summary per script
- Reference file gets the full per-script documentation
- Target: SKILL.md drops to ~60 lines, reference file ~100 lines

### 2. `content-posting` (currently 147 lines)

Create `skills/content-posting/references/script-configs.md`:
- Move detailed CONFIG examples and per-script usage out of SKILL.md  
- SKILL.md keeps script table + brief descriptions
- Target: SKILL.md drops to ~60 lines, reference file ~100 lines

### 3. `blocking-muting-management` (currently ~145 lines, 7 scripts)

Create `skills/blocking-muting-management/references/script-details.md`:
- Move per-script configuration and detection heuristics  
- SKILL.md keeps script table + 1-line per script
- Target: SKILL.md ~70 lines, reference file ~90 lines

### 4. `growth-automation` (already has references/)

Verify `skills/growth-automation/references/supporting-scripts.md` is properly linked from SKILL.md. If not, add the reference link.

### 5. `twitter-scraping`

Create `skills/twitter-scraping/references/scraper-details.md`:
- Detailed usage for each scraper script
- Include the scripts from both `src/scrapers/` and `scripts/scrape*.js`
- Target: reference file ~80 lines

## Rules

1. **SKILL.md stays as the overview** — script table, 1-2 line descriptions, reference links
2. **Reference files get the details** — full configs, step-by-step usage, output formats 
3. **One level deep only** — reference files do NOT link to other reference files
4. **Each reference file starts with a table of contents** (for files >50 lines)
5. Reference files don't need YAML frontmatter
6. Use relative paths in links: `[references/configs.md](references/configs.md)`
7. After splitting, SKILL.md should be 50-80 lines, reference files 60-120 lines

## Validation

For each skill:
- SKILL.md still has valid YAML frontmatter
- SKILL.md body is under 80 lines
- Reference links are correct relative paths
- Reference file covers everything that was removed from SKILL.md
- No information is lost in the split

## Output Format

For each skill:
1. Complete new SKILL.md (shortened)
2. Complete new reference file(s)
3. Line counts for both
4. What was moved and what stayed
