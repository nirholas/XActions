

## 🤖 AGENT 5: API Reference

**Files to create (50+ total) - Structured reference documentation:**

### Template for each file:
```markdown
# ModuleName

Brief description.

## Classes

### ClassName

Description.

#### Constructor

\`\`\`python
ClassName(
    param1: str,      # Description
    param2: int = 10  # Description with default
)
\`\`\`

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `attr1` | `str` | Description |

#### Methods

##### method_name()

\`\`\`python
async def method_name(
    arg1: str,
    arg2: Optional[int] = None
) -> ReturnType
\`\`\`

**Parameters:**
- `arg1` - Description
- `arg2` - Description (optional)

**Returns:** Description

**Raises:**
- `ErrorType` - When this happens

**Example:**
\`\`\`python
result = await obj.method_name("test")
\`\`\`
```

### Files to create:

**Core** (`docs/api/core/`):
1. `xeepy.md`, `browser.md`, `auth.md`, `rate_limiter.md`, `config.md`

**Scrapers** (`docs/api/scrapers/`):
6-20. `replies.md`, `profile.md`, `followers.md`, `following.md`, `tweets.md`, `thread.md`, `search.md`, `hashtag.md`, `media.md`, `likes.md`, `lists.md`, `mentions.md`, `spaces.md`, `downloads.md`, `recommendations.md`

**Actions** (`docs/api/actions/`):
21-27. `follow.md`, `unfollow.md`, `engage.md`, `messaging.md`, `scheduling.md`, `polls.md`, `settings.md`

**Monitoring** (`docs/api/monitoring/`):
28-31. `unfollowers.md`, `growth.md`, `keywords.md`, `account.md`

**Analytics** (`docs/api/analytics/`):
32-36. `growth.md`, `engagement.md`, `audience.md`, `competitors.md`, `content.md`

**AI** (`docs/api/ai/`):
37-40. `providers.md`, `content.md`, `sentiment.md`, `detection.md`

**API** (`docs/api/api/`):
41-42. `graphql.md`, `server.md`

**Models** (`docs/api/models/`):
43-45. `tweet.md`, `user.md`, `engagement.md`

**Storage** (`docs/api/storage/`):
46-47. `database.md`, `export.md`

**Notifications** (`docs/api/notifications/`):
48-50. `discord.md`, `telegram.md`, `email.md`

### Also create:
51. `docs/migration.md` - Migration guide from v1 to v2

### Fix required:
52. Edit `docs/FAQ.md` - Change `../CONTRIBUTING.md` to `community/contributing.md`

---

## ✅ Verification Checklist

After all agents complete, run:
```bash
mkdocs serve
```

Verify:
- [ ] No warnings about missing files
- [ ] No broken internal links
- [ ] All code examples have correct syntax
- [ ] Consistent formatting across pages
