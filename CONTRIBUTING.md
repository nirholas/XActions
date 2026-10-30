# Contributing to XActions ⚡

Thank you for your interest in contributing to **XActions**, the complete X/Twitter automation platform!

Created by [nich](https://github.com/nirholas) ([@nichxbt](https://x.com/nichxbt))

## 🚀 How to Contribute

### Getting Started

1. **Fork** the repository at [github.com/nirholas/xactions](https://github.com/nirholas/xactions)
2. **Clone** your fork locally
3. **Create a branch** for your feature/fix: `git checkout -b feature/your-feature`
4. **Make changes** and commit with clear messages
5. **Push** and open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/xactions.git
cd xactions

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npx prisma generate
npx prisma db push

# Start development
npm run dev          # the API server on http://localhost:3001
npm run cli -- profile nasa   # or drive the CLI straight from the source tree
```

XActions needs Node.js 22.19 or newer (`engines.node` is `>=22.19`, the floor
undici 8 sets). CI runs the test suite on 22 and 24, so either is a safe
local choice.

## ✅ Before you open a PR

Three commands. All of them run in CI, so running them locally saves a round
trip:

```bash
npm test              # the whole suite, offline, under a minute
npm run lint          # ESLint over the whole repo
npm run docs:check    # dead links, stale versions and counts, invented CLI commands
npm run docs:scripts  # only if you added or renamed a browser console script
```

`docs:check` runs four checks in sequence: the browser-script catalog is
regenerated and compared, the MCP registry manifests are compared, the Ask
action index is compared, and then the documentation auditor runs. The auditor
itself is dependency-free and takes about a second. Run it alone with
`npm run docs:audit`. It fails on:

| Problem | Why it is checked |
|---------|-------------------|
| A dead relative link | The first person to notice is a stranger who clicked it and left |
| A dead heading anchor | Same, but harder to spot in review |
| A referenced script that does not exist | Docs telling people to run a deleted file |
| A stale version claim | The version drifted across 25 files before this existed |
| A stale MCP tool, skill, route or CLI command count | Recomputed from `src/mcp/server.js`, `skills/`, `api/routes/` and `src/cli/help-groups.js` on every run, so a number nobody can reproduce cannot survive |
| A documented CLI command that does not exist | The reader assumes they typed it wrong |

If you touched anything that talks to X, also run:

```bash
npm run check:endpoints   # are X's GraphQL query IDs still current?
```

Query IDs that need a session are reported as unchecked rather than as
failures; set `X_AUTH_TOKEN` and `X_CSRF_TOKEN` to cover those too.

## 📝 Contribution Guidelines

### Code Standards

- ✅ **Small, focused PRs**: easier to review and merge
- ✅ **Clear documentation**: comment your code
- ✅ **No secrets**: never commit credentials or API keys
- ✅ **Test your changes**: ensure nothing breaks
- ✅ **Follow existing patterns**: consistency matters
- ✅ **Never report empty as success**: a scrape that finds nothing must say so
  and say what to do about it. Silently returning `0` or `null` is the single
  most confusing thing this tool can do, and it has happened more than once.

### Types of Contributions Welcome

| Type | Description |
|------|-------------|
| 🐛 Bug Fixes | Fix issues or unexpected behavior |
| ✨ New Features | Add new automation capabilities |
| 📚 Documentation | Improve docs, tutorials, examples |
| 🎨 UI/UX | Enhance dashboard interface |
| 🧪 Tests | Add or improve test coverage |
| 🌐 i18n | Add translations |
| 🔧 Tooling | Improve build, dev experience |

### Pull Request Process

1. Update documentation if adding features
2. Add entries to `docs/` for new functionality
3. Ensure your code follows existing style
4. Link related issues in PR description
5. Wait for review. Maintainers aim to respond within 48 hours

## 🏗️ Project Structure

```
xactions/
├── src/              # Core modules
│   ├── automation/   # Automation features
│   └── *.js          # Main scripts
├── api/              # Backend API routes
├── dashboard/        # Frontend UI
├── docs/             # Documentation
├── prisma/           # Database schema
├── skills/           # Agent skills, one directory each
├── extension/        # Chrome and Edge extension (Manifest V3)
├── scripts/          # Browser console scripts, plus build and docs tooling
├── tests/            # Vitest suite
└── bin/              # Legacy command name, forwards to the CLI
```

[AGENTS.md](AGENTS.md) has the full map, the three runtime contexts, and the
mistakes that have cost people time here. Read it before your first PR.

## 🐛 Reporting Issues

When filing an issue, please include:

- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected vs actual** behavior
- **Screenshots** if applicable
- **Environment** (browser, Node version, etc.)

## Credit

Everyone whose work changes XActions is credited in
[CONTRIBUTORS.md](CONTRIBUTORS.md), not only in git history:

- **Merged code** is credited to its author, including when a maintainer
  rebases or re-lands it in another PR.
- **A valid bug report** (one that reproduces and leads to a fix) is credited
  to the reporter, with a link to the issue. The fixing commit carries a
  `Reported-by:` trailer and its CHANGELOG entry names you.
- **A closed PR whose finding was right** is credited too, when the fix reached
  `main` another way.

Questions, feature ideas that are not built, and reports that do not reproduce
are welcome but are not listed. If you think you were missed, open an issue.

## 💬 Questions?

- Open a [GitHub Issue](https://github.com/nirholas/xactions/issues)
- Tweet [@nichxbt](https://x.com/nichxbt)

## 📄 License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

### Borrowing from other projects

We learn from other open source projects, and we do it by their rules. Before
you bring anything in from elsewhere, check the upstream LICENSE file itself,
not the README's claim:

- **MIT, BSD, ISC, Apache-2.0, Unlicense, CC0**: you may adapt the code. Keep the
  upstream copyright and licence notice in the file you put it in, and add a row
  to [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
- **GPL, LGPL, AGPL, SSPL, MPL, CC-BY-SA, or no LICENSE file at all**: ideas only.
  Read it, understand the mechanism, write your own. Do not paste a line.

Endpoint paths, query IDs, header names and rate-limit numbers are observations
of X's behaviour rather than someone's creative work, so those can be recorded
from any source. Matching a public API's shape is fine everywhere too. When in
doubt, add the dependency instead of copying it.

---

**Thank you for helping make XActions better!** ⚡

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
