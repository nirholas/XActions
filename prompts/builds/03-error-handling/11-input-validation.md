# Build 03-11 — Input Validation Framework

> **Creates:** `src/utils/validate.js`
> **Depends on:** Track 03 Build 01 (ValidationError class)

---

## Task

Build a composable input validation framework that all scrapers, MCP tools, and CLI commands use to validate arguments before executing. Prevents runtime errors from bad input and provides clear feedback.

---

## File: `src/utils/validate.js`

### Implementation

```javascript
import { ValidationError } from './errors.js';

/**
 * Validate a value against rules. Throws ValidationError on failure.
 */
export function validate(value, rules, fieldName = 'value') {
  const errors = [];

  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
  }

  if (value !== undefined && value !== null) {
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${fieldName} must be a ${rules.type}, got ${typeof value}`);
    }

    if (rules.type === 'string' || typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${fieldName} has invalid format`);
      }
      if (rules.oneOf && !rules.oneOf.includes(value)) {
        errors.push(`${fieldName} must be one of: ${rules.oneOf.join(', ')}`);
      }
    }

    if (rules.type === 'number' || typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fieldName} must be >= ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fieldName} must be <= ${rules.max}`);
      }
      if (rules.integer && !Number.isInteger(value)) {
        errors.push(`${fieldName} must be an integer`);
      }
    }

    if (rules.type === 'array' || Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`${fieldName} must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`${fieldName} must have at most ${rules.maxItems} items`);
      }
    }

    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) errors.push(customError);
    }
  }

  if (errors.length) {
    throw new ValidationError(errors.join('; '), { context: { field: fieldName, value } });
  }

  return value;
}

/**
 * Validate an object of params against a schema.
 */
export function validateParams(params, schema) {
  const errors = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    try {
      validate(params?.[key], rules, key);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length) {
    throw new ValidationError(`Validation failed: ${errors.join('; ')}`, {
      context: { params: Object.keys(params || {}) },
    });
  }

  return params;
}

// Pre-built validators for common Twitter fields
export const TwitterValidators = {
  username: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 15,
    pattern: /^[a-zA-Z0-9_]+$/,
    custom: (v) => v.startsWith('@') ? 'Remove the @ prefix from username' : null,
  },

  tweetId: {
    required: true,
    type: 'string',
    pattern: /^\d+$/,
    custom: (v) => v.length < 10 ? 'Tweet ID appears too short' : null,
  },

  count: {
    type: 'number',
    min: 1,
    max: 10000,
    integer: true,
  },

  cookie: {
    required: true,
    type: 'string',
    minLength: 10,
    custom: (v) => {
      if (!v.includes('auth_token') && !v.includes('ct0')) {
        return 'Cookie must contain auth_token and ct0 values';
      }
      return null;
    },
  },

  hashtag: {
    required: true,
    type: 'string',
    minLength: 1,
    custom: (v) => v.startsWith('#') ? 'Remove the # prefix from hashtag' : null,
  },

  searchQuery: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 500,
  },

  url: {
    required: true,
    type: 'string',
    pattern: /^https?:\/\/.+/,
  },
};

/**
 * Decorator-style validation for scraper functions.
 */
export function withValidation(schema, fn) {
  return async function validated(...args) {
    // First arg is usually the page, second is the target value
    // Validate based on schema keys mapping to arg positions
    for (const [key, rules] of Object.entries(schema)) {
      const argIndex = rules._argIndex ?? 0;
      validate(args[argIndex], rules, key);
    }
    return fn.apply(this, args);
  };
}
```

---

## Tests: `tests/errors/validation.test.js`

1. Test required field rejects undefined/null/empty
2. Test type checking rejects wrong types
3. Test string minLength/maxLength
4. Test number min/max/integer
5. Test pattern matching
6. Test oneOf enumeration
7. Test custom validator function
8. Test validateParams catches all errors in one pass
9. Test TwitterValidators.username rejects @ prefix
10. Test TwitterValidators.username rejects special characters
11. Test TwitterValidators.cookie rejects missing auth_token
12. Test TwitterValidators.tweetId rejects non-numeric
13. Test withValidation decorator wraps function

---

## Acceptance Criteria
- [ ] Composable validation rules (required, type, min, max, pattern, custom)
- [ ] `validateParams` batch-validates all fields
- [ ] Pre-built Twitter-specific validators
- [ ] `withValidation` decorator for wrapping functions
- [ ] Clear error messages with field name and reason
- [ ] All 13 tests pass
