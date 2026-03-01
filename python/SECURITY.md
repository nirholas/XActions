# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Xeepy, please report it responsibly:

### DO NOT

- ❌ Open a public GitHub issue
- ❌ Disclose the vulnerability publicly before it's fixed
- ❌ Exploit the vulnerability

### DO

- ✅ Email security concerns privately
- ✅ Provide detailed reproduction steps
- ✅ Allow time for us to address the issue

### Contact

Please report security vulnerabilities to the repository owner via:
- GitHub: [@nirholas](https://github.com/nirholas) (private message)
- Twitter: [@nichxbt](https://x.com/nichxbt) (DM)

### What to Include

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix deployment**: Depends on severity

### Scope

Security issues we care about:

- Session/cookie theft vulnerabilities
- Code injection possibilities
- Credential exposure risks
- Privilege escalation
- Data leakage

### Out of Scope

- Rate limiting bypass (intentionally not prevented in tool code)
- X/Twitter Terms of Service violations (user responsibility)
- Social engineering attacks

---

## Security Best Practices for Users

### Protect Your Session

```python
# DON'T commit session files
# Add to .gitignore:
session.json
cookies.json
*.session

# DON'T share your session
# Sessions contain authentication tokens
```

### Environment Variables

```python
# DON'T hardcode API keys
# BAD:
ai = ContentGenerator(api_key="sk-abc123...")

# GOOD:
import os
ai = ContentGenerator(api_key=os.environ.get("OPENAI_API_KEY"))
```

### Use `.env` Files

```bash
# Create .env file (never commit!)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Add to .gitignore
.env
.env.local
```

### Verify Downloads

```bash
# Verify package integrity
pip install xeepy --require-hashes

# Or check package checksums
pip hash xeepy
```

---

## Responsible Use

Xeepy is for **educational purposes only**. Users must:

1. Comply with X/Twitter Terms of Service
2. Respect rate limits
3. Not use for harassment or spam
4. Not scrape private/protected content without permission
5. Comply with applicable laws (GDPR, CCPA, etc.)

---

Thank you for helping keep Xeepy secure! 🛡️

## Reporting a Vulnerability

If you discover a security issue, please report it responsibly:

1. **Do NOT** open a public issue
2. Email the maintainer or open a private security advisory on GitHub
3. Include steps to reproduce the vulnerability
4. Allow reasonable time for a fix before disclosure
