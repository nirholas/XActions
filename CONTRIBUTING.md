# Contributing to XActions ⚡

Thank you for your interest in contributing to **XActions** — the complete X/Twitter automation platform!

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
npm run dev
```

## 📝 Contribution Guidelines

### Code Standards

- ✅ **Small, focused PRs** — easier to review and merge
- ✅ **Clear documentation** — comment your code
- ✅ **No secrets** — never commit credentials or API keys
- ✅ **Test your changes** — ensure nothing breaks
- ✅ **Follow existing patterns** — consistency matters

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
5. Wait for review — maintainers aim to respond within 48 hours

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
└── bin/              # CLI entry point
```

## 🐛 Reporting Issues

When filing an issue, please include:

- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected vs actual** behavior
- **Screenshots** if applicable
- **Environment** (browser, Node version, etc.)

## 💬 Questions?

- Open a [GitHub Issue](https://github.com/nirholas/xactions/issues)
- Tweet [@nichxbt](https://x.com/nichxbt)

## 📄 License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

**Thank you for helping make XActions better!** ⚡

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
