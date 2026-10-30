# deepmerge (vendored)

Upstream [deepmerge](https://github.com/TehShrike/deepmerge) 4.3.1, MIT licensed (see `license.txt`), with one change.

**Why it is vendored.** deepmerge <= 4.3.1 is affected by [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): an own `__proto__` key (which `JSON.parse` produces) is assigned onto the merged result and replaces its prototype. No patched release exists. XActions gets deepmerge through `puppeteer-extra` and `puppeteer-extra-plugin-user-preferences`, and every project that installs them points its `deepmerge` override at a copy of this directory:

| Project | Copy |
| --- | --- |
| XActions root (`package.json`) | `vendor/deepmerge` |
| `xspace-agents/xspace-agent` (`package.json`) | `xspace-agents/vendor/deepmerge` |

`xspace-agents/` keeps its own copy because it is built as a separate Docker context that cannot reach the repo root. The two copies must stay byte-identical; `tests/deepmerge-prototype.test.js` fails when they differ.

**The change.** `getKeys()` in `index.js` (upstream's `dist/cjs.js`, renamed because the repo ignores `dist/`) drops the `__proto__` key, which covers both the target and the source loop of `mergeObject()`. Everything else is byte-identical to the published 4.3.1.

**Tests.** `tests/deepmerge-prototype.test.js` reproduces both poisoning paths, checks normal merge behaviour, and checks the copies match. `xspace-agents/xspace-agent/tests/deepmerge.test.ts` checks that its puppeteer-extra resolves the patched copy.

**When to remove it.** Delete both copies and every `deepmerge` override once upstream ships a fixed release, or once `puppeteer-extra` stops depending on deepmerge.
