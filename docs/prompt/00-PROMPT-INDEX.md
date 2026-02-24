# XActions Skills Overhaul — Prompt Index

Paste each prompt into a **fresh Claude Opus 4.6 chat**. Work through them in order.

| # | File | What It Produces | Dependencies |
|---|------|-------------------|-------------|
| 01 | `01-fix-frontmatter-and-consolidate.md` | Fixes all 15 broken YAML frontmatter files, merges duplicates | None |
| 02 | `02-rewrite-agents-md.md` | Rewrites AGENTS.md as a concise hub (<200 lines) with references | #01 done |
| 03 | `03-rewrite-claude-md.md` | Transforms CLAUDE.md into a proper root-level skill file | #02 done |
| 04 | `04-rewrite-skill-tier2-batch1.md` | Rewrites 8 of the weaker skills to match best practices | #01 done |
| 05 | `05-rewrite-skill-tier2-batch2.md` | Rewrites remaining 7 weaker skills | #04 done |
| 06 | `06-add-progressive-disclosure.md` | Adds reference files for complex skills (selectors, API, patterns) | #04 + #05 done |
| 07 | `07-create-agent-prompts-skills.md` | Converts AGENT_PROMPTS.md monolith into individual skill-based prompts | #01-#06 done |
| 08 | `08-validation-and-testing.md` | Validates all SKILL.md files, checks frontmatter, tests discovery | Everything done |
| 09 | `09-algorithm-cultivation-system.md` | 14 prompts building the 24/7 LLM-powered thought leadership agent system | None |
| 10 | `09-competitive-features.md` | **16 prompts (09-A—09-P)** building features to beat Phantombuster, Apify, Circleboom, Hypefury, Taplio, Followerwonk, Typefully, Social Blade | None (all independent) |

### Prompt 09 Sub-prompts

| Sub | Feature | Kills Competitor |
|-----|---------|-----------------|
| 09-A | Historical Analytics Database | Followerwonk, Social Blade |
| 09-B | Audience Overlap & Venn Analysis | Followerwonk |
| 09-C | Follower CRM & Segmentation | Circleboom, Followerwonk |
| 09-D | CSV Bulk Operations Import | Phantombuster, Circleboom |
| 09-E | Proxy Rotation & Stealth | Phantombuster, Apify |
| 09-F | Cloud Scheduled Execution | Phantombuster, Apify |
| 09-G | Visual Content Calendar Dashboard | Hypefury, Taplio, Typefully |
| 09-H | Evergreen Content Recycler | Hypefury |
| 09-I | RSS & Webhook Content Ingestion | Hypefury, Taplio |
| 09-J | AI Hashtag & Content Optimizer | Taplio |
| 09-K | Thread Composer with Preview | Typefully |
| 09-L | Notification Integrations | Phantombuster, Circleboom |
| 09-M | Robust Pagination & Retry Engine | Apify |
| 09-N | Team & Multi-User Support | Phantombuster, Taplio |
| 09-O | Dashboard Analytics Visualization | All competitors |
| 09-P | Apify/Phantombuster Export Compat | Apify, Phantombuster |

## Budget Estimate

Each prompt will consume ~$2-8 of Claude Opus 4.6 credits depending on output length.
Total estimated: ~$30-60 for the skills overhaul (#01-#08), ~$50-120 for competitive features (#09).

## Key Principles Applied

From [Claude's official best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices):

- SKILL.md body under 500 lines (yours average ~88, good)
- Proper YAML frontmatter with name + description (15 are currently broken)
- Progressive disclosure: SKILL.md as overview, detailed content in reference files
- One-level-deep references (never chain references)
- Concise is key: assume Claude is smart, cut token waste
- No time-sensitive info
- Consistent terminology
- Third-person descriptions
- Gerund naming: `unfollow-management`, `content-posting`, etc.
