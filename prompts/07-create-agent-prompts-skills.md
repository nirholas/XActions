# Prompt 07: Convert AGENT_PROMPTS.md into Individual Skill-Based Prompt Files

You are an expert at AI agent prompt engineering and Claude Agent Skills architecture.

You are working on the XActions project — an open-source X/Twitter automation toolkit by nichxbt.

## Context

The project has a 400-line `AGENT_PROMPTS.md` containing 5 long-form agent prompts designed for Claude + XActions MCP. These prompts are monolithic, overly verbose, and not structured as skills.

The project also has 25 skills in `skills/*/SKILL.md`.

## Your Task

1. **Delete `AGENT_PROMPTS.md`** — it's a monolith that violates every best practice
2. **Create 5 new skill directories** under `skills/` for the agent workflows it described
3. Each gets a proper `SKILL.md` with YAML frontmatter

## Current Prompts to Convert

### 1. Competitor Intelligence Agent → `skills/competitor-intelligence/`

Current: 50+ lines of instructions for analyzing competitor X accounts.

Convert to a SKILL.md that:
- Has proper frontmatter: `name: competitor-intelligence`
- Description: "Analyzes competitor X/Twitter accounts including profile, content strategy, audience, engagement patterns, and network. Use when comparing accounts, researching competitors, or benchmarking social performance."
- Lists the MCP tools needed: `x_get_profile`, `x_get_tweets`, `x_get_followers`, `x_get_replies`, `x_get_following`
- Provides a clear **workflow** (numbered steps, not paragraphs)
- Includes an **output template** (the report structure)
- Under 80 lines

### 2. Lead Generation Agent → `skills/lead-generation/`

Convert to a SKILL.md:
- `name: lead-generation`  
- Description: "Finds and qualifies B2B leads from X/Twitter conversations using keyword search, profile analysis, and intent scoring. Use when prospecting, finding potential customers, or mining social conversations for leads."
- Workflow: search → qualify → score → gather context
- Output template: CSV-ready lead list format
- Under 80 lines

### 3. Content Repurposing Agent → `skills/content-repurposing/`

Convert to a SKILL.md:
- `name: content-repurposing`
- Description: "Identifies top-performing tweets and generates repurposed content variations including threads, angle variations, and content series. Use when maximizing content ROI or planning a content calendar."
- Workflow: identify top posts → analyze patterns → generate variations → build calendar
- Under 80 lines

### 4. Community Health Monitor → `skills/community-health-monitoring/`

Convert to a SKILL.md:
- `name: community-health-monitoring`
- Description: "Audits follower quality, engagement authenticity, unfollower patterns, and network efficiency to produce a community health score. Use when monitoring account health or detecting bot/spam followers."
- Workflow: audit followers → check engagement → analyze unfollowers → assess reciprocity
- Output template: Health score breakdown
- Under 80 lines

### 5. Viral Thread Generator → `skills/viral-thread-generation/`

Convert to a SKILL.md:
- `name: viral-thread-generation`
- Description: "Researches trending topics and competitor threads to generate high-engagement thread content with optimized hooks, value ladders, and calls to action. Use when creating threads or planning viral content."
- Workflow: research trending → analyze competitor threads → mine audience interests → generate 3 threads
- Include the thread structure template (hook → credibility → value → twist → CTA)
- Under 100 lines (this one has more structural detail)

## Rules

1. **Proper YAML frontmatter** — starts with `---`, has name + description
2. **name**: lowercase-letters-numbers-hyphens only
3. **description**: third person, what + when, max 1024 chars
4. Include `license: MIT` and `metadata: { author: nichxbt, version: "3.0" }`
5. **No verbose role-play framing** — don't start with "You are a..." (that's for system prompts, not skills)
6. **Concise workflows** — numbered steps, not paragraphs of explanation
7. **Reference MCP tools by name** where applicable
8. **Under 100 lines each** (aim for 60-80)
9. **Output templates** should be concise — show the structure, not full examples
10. Remove the "Variables to Replace" and "Cost Estimates" sections — those are implementation details, not skill content

## Output Format

For each of the 5 new skills:
1. Full directory path
2. Complete SKILL.md content
3. Line count

Confirm `AGENT_PROMPTS.md` should be deleted.

Final summary table of all 5 new skills with line counts.
