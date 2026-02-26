# Build 08: Verifiable Agent Actions — Cryptographic Audit Trails

> **Project**: XActions Verifiable Actions — Signed action logs, tamper-proof audit trails, agent receipts, compliance  
> **Status**: New Build  
> **Priority**: #8 — Trust and accountability for autonomous agents  
> **Author**: XActions Team  

---

## Executive Summary

When AI agents act on your behalf — posting tweets, following accounts, running growth campaigns — you need **proof** of exactly what happened, when, and why. This build creates a **cryptographic audit trail system**: every action is signed, logged, and verifiable. Agents produce receipts. Actions can be replayed. Compliance officers can audit. Disputes can be resolved with tamper-proof evidence. This is critical infrastructure as regulators catch up to agentic AI.

## Technical Context

### Existing XActions Infrastructure
- **MCP Server**: `src/mcp/server.js` — 60+ tools that execute actions
- **Agent System**: `src/agents/` — thoughtLeaderAgent, persona, scheduler
- **Workflow Engine**: `src/workflows/engine.js` — Executes multi-step workflows
- **CLI**: `src/cli/` — Command-line tool for manual actions
- **API**: `api/` — Express.js backend
- **Database**: `src/agents/database.js` — SQLite for agent data
- **Persona Engine**: `src/personaEngine.js` — LLM-driven automation

### Architecture Plan

```
┌──────────────────────────────────────────────────────┐
│        XActions Verifiable Action System              │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │      Action Interceptor (Middleware)              │ │
│  │  Hooks into MCP, CLI, API, Workflows             │ │
│  │  Captures every action before & after execution  │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │      Action Signer (Ed25519 / HMAC)              │ │
│  │  Signs each action with agent's key              │ │
│  │  Produces tamper-proof receipt                   │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │      Audit Log (Append-Only SQLite + JSONL)      │ │
│  │  Immutable action log • Hash-chained entries     │ │
│  │  Searchable • Exportable                        │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────┬───────────┼───────────┬──────────────┐      │
│  │     │           │           │              │      │
│  ▼     ▼           ▼           ▼              ▼      │
│ Receipt  Verifier  Compliance  Replay      Dashboard │
│ Generator          Reporter   Engine       & Viewer  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Key Files to Create
```
src/audit/
  index.js                — Module entry point
  types.js                — Action and receipt types
  signer.js               — Ed25519 cryptographic signing
  auditLog.js             — Append-only audit log storage
  actionInterceptor.js    — Middleware that captures actions
  receiptGenerator.js     — Human-readable action receipts
  verifier.js             — Verify signatures and integrity
  complianceReporter.js   — Generate compliance reports
  replayEngine.js         — Replay and simulate past actions
  hashChain.js            — Hash chain for tamper detection
  keyManager.js           — Key generation and storage
  policyEngine.js         — Action policies and guardrails
  alerter.js              — Anomaly alerting on audit data
tests/audit/
  signer.test.js
  auditLog.test.js
  actionInterceptor.test.js
  verifier.test.js
  hashChain.test.js
  policyEngine.test.js
  integration.test.js
```

---

## Agent Build Prompts

---

### Prompt 1: Action Types and Constants

```
You are building the action types and constants for XActions Verifiable Actions.

Create file: src/audit/types.js

Build:

1. Action categories:
   CATEGORIES = {
     CONTENT: 'content',
     ENGAGEMENT: 'engagement',
     SOCIAL: 'social',
     SCRAPING: 'scraping',
     SETTINGS: 'settings',
     SYSTEM: 'system'
   }

2. Action types (every possible action XActions can perform):
   
   CONTENT actions:
     'tweet.create' — Post a tweet
     'tweet.delete' — Delete a tweet
     'tweet.edit' — Edit a tweet
     'thread.create' — Post a thread
     'repost.create' — Repost a tweet
     'reply.create' — Reply to a tweet
     'quote.create' — Quote tweet
     'poll.create' — Create a poll
     'media.upload' — Upload media
   
   ENGAGEMENT actions:
     'like.create' — Like a tweet
     'like.delete' — Unlike a tweet
     'bookmark.create' — Bookmark a tweet
     'bookmark.delete' — Remove bookmark
   
   SOCIAL actions:
     'follow.create' — Follow a user
     'follow.delete' — Unfollow a user
     'block.create' — Block a user
     'block.delete' — Unblock
     'mute.create' — Mute
     'mute.delete' — Unmute
     'dm.send' — Send direct message
     'community.join' — Join community
     'community.leave' — Leave community
     'list.add' — Add to list
     'list.remove' — Remove from list
   
   SCRAPING actions:
     'scrape.profile' — Scrape a profile
     'scrape.followers' — Scrape follower list
     'scrape.tweets' — Scrape tweets
     'scrape.search' — Search scrape
     'scrape.engagement' — Scrape engagement data
   
   SETTINGS actions:
     'profile.update' — Update profile
     'settings.change' — Change settings
   
   SYSTEM actions:
     'workflow.start' — Start a workflow
     'workflow.complete' — Complete a workflow
     'agent.start' — Start an agent session
     'agent.stop' — Stop an agent session
     'monitor.start' — Start monitoring
     'monitor.stop' — Stop monitoring

3. Risk levels per action type:
   LOW: scraping, reading (no side effects)
   MEDIUM: likes, bookmarks, follows (reversible)
   HIGH: tweets, DMs, profile changes (visible to public)
   CRITICAL: blocks, mass unfollows, account settings (potentially destructive)

4. ActionRecord type:
   {
     id: string (UUID v4),
     timestamp: string (ISO 8601 with milliseconds),
     action: string (action type from above),
     category: string,
     riskLevel: 'low' | 'medium' | 'high' | 'critical',
     actor: {
       type: 'user' | 'agent' | 'workflow' | 'mcp_client',
       id: string,
       name: string
     },
     target: {
       type: 'tweet' | 'user' | 'community' | 'list' | 'setting',
       id: string,
       identifier: string (username or URL)
     },
     input: object (parameters passed to the action),
     output: object (result returned),
     success: boolean,
     error: string | null,
     duration: number (ms),
     source: 'mcp' | 'cli' | 'api' | 'workflow' | 'agent' | 'browser_script',
     context: {
       workflowId: string | null,
       agentSessionId: string | null,
       mcpClientId: string | null,
       apiKeyId: string | null
     },
     signature: string | null,
     previousHash: string | null (hash chain link)
   }

5. ActionReceipt type:
   {
     actionId: string,
     timestamp: string,
     summary: string (human-readable: "Posted tweet 'Hello world' at 2025-01-15 10:30 UTC"),
     action: string,
     actor: object,
     target: object,
     success: boolean,
     signature: string,
     verificationUrl: string
   }

Author: @author nich (@nichxbt)
```

---

### Prompt 2: Key Manager

```
You are building the key management system for XActions Verifiable Actions.

Create file: src/audit/keyManager.js

This manages Ed25519 signing keys for action signing.

Build:

1. KeyManager class:
   constructor(options):
     - keyDir: string (default ~/.xactions/keys/)
     - Uses Node.js built-in crypto module (no external deps)

2. Key generation:
   - generateKeyPair(name) — Generate Ed25519 key pair:
     Use crypto.generateKeyPairSync('ed25519')
     Save:
       ~/.xactions/keys/{name}.priv.pem — Private key (PEM format)
       ~/.xactions/keys/{name}.pub.pem — Public key (PEM format)
       ~/.xactions/keys/{name}.json — Metadata: { name, algorithm, createdAt, fingerprint }
     Return: { name, publicKey, fingerprint, createdAt }
   
   - generateAgentKey(agentId) — Generate key for a specific agent:
     name = "agent-{agentId}"
     Same as above
   
   - generateWorkflowKey(workflowId) — Key for a workflow

3. Key management:
   - listKeys() — List all key pairs:
     Return: Array<{ name, fingerprint, createdAt, lastUsed }>
   
   - getPublicKey(name) — Get public key
   - getPrivateKey(name) — Get private key (for signing)
   
   - revokeKey(name) — Revoke a key:
     Move to ~/.xactions/keys/revoked/
     Add to revocation list
   
   - isRevoked(name) — Check if key is revoked
   
   - rotateKey(name) — Generate new key, revoke old one:
     a. Generate new key pair with name "{name}-v{N+1}"
     b. Revoke old key
     c. Return new key info

4. Default key:
   - getDefaultKey() — Get the main signing key:
     If no key exists: auto-generate "default" key pair
     Return private key for signing
   
   - getDefaultPublicKey() — For verification

5. Key fingerprints:
   - getFingerprint(publicKey) — SHA-256 hash of public key bytes, hex-encoded
   - Used to identify which key signed an action

6. Export/import:
   - exportPublicKey(name) — Export public key for sharing
   - importPublicKey(name, pemData) — Import someone else's public key for verification

Author: @author nich (@nichxbt)
```

---

### Prompt 3: Cryptographic Signer

```
You are building the cryptographic signer for XActions Verifiable Actions.

Create file: src/audit/signer.js

This signs action records with Ed25519 signatures and verifies them.

Build:

1. ActionSigner class:
   constructor(options):
     - keyManager: KeyManager instance

2. Signing:
   - signAction(actionRecord, keyName?) — Sign an action record:
     keyName defaults to 'default'
     
     Process:
     a. Create canonical representation of the action:
        - Take actionRecord WITHOUT signature and previousHash fields
        - JSON.stringify with sorted keys (deterministic serialization)
        - This is the "payload" to sign
     b. Get private key from KeyManager
     c. Sign with Ed25519: crypto.sign(null, Buffer.from(payload), privateKey)
     d. Encode signature as base64
     e. Return the signature string
   
   - signAndAttach(actionRecord, keyName?) — Sign and return modified record:
     const signature = this.signAction(actionRecord, keyName);
     return { ...actionRecord, signature };

3. Verification:
   - verifyAction(actionRecord) — Verify an action's signature:
     a. Extract signature from record
     b. Reconstruct the canonical payload (same process as signing)
     c. Get public key (from keyManager, by fingerprint in record metadata)
     d. Verify: crypto.verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, 'base64'))
     e. Return: { valid: boolean, keyName: string, signedAt: string }
   
   - verifyBatch(actionRecords) — Verify multiple records:
     Return: { valid: number, invalid: number, results: Array<{ id, valid, reason }> }

4. Canonical serialization:
   - canonicalize(actionRecord) — Create deterministic JSON:
     JSON.stringify with keys sorted alphabetically at all levels
     This ensures the same record always produces the same bytes
     Function: sortObject(obj) recursively sorts all object keys
   
   Important: Always exclude these fields before canonicalization:
     signature, previousHash (these are computed, not part of the signed content)

5. HMAC alternative (for when Ed25519 is overkill):
   - hmacSign(actionRecord, secret) — HMAC-SHA256 signing:
     Simpler, uses a shared secret instead of key pair
     For self-hosted scenarios where you trust the environment
   
   - hmacVerify(actionRecord, secret) — Verify HMAC signature

6. Timestamping:
   - addTimestamp(actionRecord) — Add a secure timestamp:
     timestamp = ISO 8601 with milliseconds
     Include in signed payload
     This prevents backdating

Author: @author nich (@nichxbt)
```

---

### Prompt 4: Hash Chain

```
You are building the hash chain system for XActions Verifiable Actions.

Create file: src/audit/hashChain.js

This creates a hash chain linking each action to the previous one, making it impossible to insert, delete, or reorder actions without detection.

Build:

1. HashChain class:
   constructor(options):
     - algorithm: 'sha256' (default)
     - genesisHash: string (hash of the first entry, can be a known constant)

2. Chain operations:
   - computeHash(actionRecord) — Compute hash of an action record:
     payload = canonicalize({ ...actionRecord without previousHash })
     hash = crypto.createHash('sha256').update(payload).digest('hex')
     Return: hash
   
   - chainAction(actionRecord, previousHash) — Add to chain:
     a. Set actionRecord.previousHash = previousHash
     b. Compute hash of the complete record (including previousHash)
     c. Return: { record: actionRecord, hash }
   
   - getGenesisHash() — Hash of the chain's beginning:
     Return SHA-256 of "XActions Audit Chain Genesis v1"

3. Chain verification:
   - verifyChain(actionRecords) — Verify entire chain integrity:
     a. First record's previousHash must match genesis hash
     b. For each subsequent record:
        - Recompute hash of previous record
        - Compare to current record's previousHash
        - If mismatch: chain is broken at this point
     c. Return: {
         valid: boolean,
         length: number,
         brokenAt: number | null (index where chain breaks),
         firstAction: string (timestamp),
         lastAction: string (timestamp),
         coverage: string (date range)
       }
   
   - verifyRange(records, startHash, endHash) — Verify a subset of the chain
   
   - findBreaks(records) — Find all chain break points:
     Return: Array<{ index, expectedHash, actualHash, record }>

4. Chain management:
   - getLastHash(db) — Get hash of the most recent action in the database
   - rebuildChain(records) — Rebuild the entire hash chain from scratch:
     Used for repair/migration
     Warning: this changes all hashes

5. Merkle tree summary:
   - computeMerkleRoot(records) — Compute Merkle tree root:
     Allows efficient verification of large audit logs
     Return: { root: string, depth: number }
   
   - generateMerkleProof(records, index) — Proof that a specific record is in the tree:
     Return: { leafHash, proof: Array<{ hash, position }>, root }
   
   - verifyMerkleProof(proof) — Verify a Merkle proof:
     Return: boolean

Author: @author nich (@nichxbt)
```

---

### Prompt 5: Audit Log Storage

```
You are building the audit log storage for XActions Verifiable Actions.

Create file: src/audit/auditLog.js

This is the append-only, hash-chained audit log that records every action.

Build:

1. AuditLog class:
   constructor(options):
     - dbPath: string (default ~/.xactions/audit.db)
     - jsonlPath: string (default ~/.xactions/audit.jsonl)
     - signer: ActionSigner
     - hashChain: HashChain
     - writeJsonl: boolean (default true — dual-write)

2. Database schema:
   Table: actions
     id TEXT PRIMARY KEY,
     timestamp TEXT,
     action TEXT,
     category TEXT,
     riskLevel TEXT,
     actorType TEXT,
     actorId TEXT,
     actorName TEXT,
     targetType TEXT,
     targetId TEXT,
     targetIdentifier TEXT,
     input TEXT (JSON),
     output TEXT (JSON),
     success BOOLEAN,
     error TEXT,
     duration INTEGER,
     source TEXT,
     workflowId TEXT,
     agentSessionId TEXT,
     mcpClientId TEXT,
     apiKeyId TEXT,
     signature TEXT,
     previousHash TEXT,
     hash TEXT
   
   Indexes:
     CREATE INDEX idx_actions_timestamp ON actions(timestamp);
     CREATE INDEX idx_actions_action ON actions(action);
     CREATE INDEX idx_actions_actor ON actions(actorId);
     CREATE INDEX idx_actions_target ON actions(targetIdentifier);
     CREATE INDEX idx_actions_category ON actions(category);
     CREATE INDEX idx_actions_source ON actions(source);
     CREATE INDEX idx_actions_risk ON actions(riskLevel);
     CREATE INDEX idx_actions_workflow ON actions(workflowId);
     CREATE INDEX idx_actions_session ON actions(agentSessionId);

3. Append operations (no update or delete):
   - append(actionRecord) — Add action to the audit log:
     a. Sign the action record
     b. Get last hash from chain
     c. Chain the action (set previousHash, compute hash)
     d. Insert into SQLite
     e. Append to JSONL file (one JSON object per line)
     f. Return: { id, hash, signature }
   
   - appendBatch(actionRecords) — Bulk append (for migration/import)

4. Query operations:
   - getAction(id) — Get a single action by ID
   - getActions(filters) — Query with filters:
     filters: {
       action?: string | string[],
       category?: string,
       riskLevel?: string,
       actorId?: string,
       targetIdentifier?: string,
       source?: string,
       workflowId?: string,
       agentSessionId?: string,
       since?: string (ISO date),
       until?: string (ISO date),
       success?: boolean,
       limit?: number,
       offset?: number,
       orderBy?: 'timestamp' | 'riskLevel',
       order?: 'asc' | 'desc'
     }
     Return: { actions: ActionRecord[], total: number, page: number }
   
   - getActionsByTarget(identifier) — All actions on a specific target
   - getActionsByActor(actorId) — All actions by a specific actor
   - getRecentActions(limit) — Most recent N actions
   - countActions(filters) — Count actions matching filters

5. Aggregation queries:
   - getActionSummary(period) — Summary statistics:
     Return: {
       total: number,
       byCategory: { [category]: number },
       byAction: { [action]: number },
       byRiskLevel: { [level]: number },
       bySource: { [source]: number },
       successRate: number,
       avgDuration: number,
       topActors: Array<{ actorId, count }>,
       topTargets: Array<{ identifier, count }>
     }
   
   - getTimeline(since, until, granularity) — Action count over time:
     granularity: 'minute' | 'hour' | 'day' | 'week'
     Return: Array<{ period, count, byRisk }>

6. Maintenance:
   - verifyIntegrity() — Verify entire audit log hash chain
   - exportToJsonl(path, filters?) — Export audit log
   - importFromJsonl(path) — Import audit log
   - getStats() — Database size, record count, date range

Author: @author nich (@nichxbt)
```

---

### Prompt 6: Action Interceptor

```
You are building the action interceptor for XActions Verifiable Actions.

Create file: src/audit/actionInterceptor.js

This hooks into all XActions action execution points to automatically capture and log every action.

Build:

1. ActionInterceptor class:
   constructor(options):
     - auditLog: AuditLog
     - policyEngine: PolicyEngine (optional, for pre-execution checks)
     - enabled: boolean (default true)

2. MCP server interceptor:
   - interceptMCP(server) — Hook into MCP tool execution:
     Wraps every tool handler in the MCP server:
     
     Original: server.setRequestHandler(CallToolRequestSchema, handler)
     Intercepted:
       a. Before execution:
          - Create ActionRecord with action type mapped from tool name
          - Record input parameters
          - Record actor (MCP client info)
          - If policyEngine: check if action is allowed
          - If denied: return error, log as blocked
          - Start timer
       b. Execute original handler
       c. After execution:
          - Record output
          - Record success/failure
          - Record duration
          - Append to audit log
     
     Tool name → action type mapping:
       'x_post_tweet' → 'tweet.create'
       'x_delete_tweet' → 'tweet.delete'
       'x_like_tweet' → 'like.create'
       'x_follow_user' → 'follow.create'
       'x_unfollow_user' → 'follow.delete'
       'x_scrape_profile' → 'scrape.profile'
       etc. for all 60+ MCP tools

3. CLI interceptor:
   - interceptCLI(cliHandler) — Wrap CLI command handlers:
     Same pattern: record before, execute, record after
     actor.type = 'user'
     source = 'cli'

4. API interceptor:
   - apiMiddleware() — Express middleware for API routes:
     For every API request that modifies state (POST, PUT, DELETE):
     a. Record action start
     b. next()
     c. On response finish: record result
     source = 'api'
     actor from API key

5. Workflow interceptor:
   - interceptWorkflow(engine) — Hook into workflow engine:
     Wrap workflow step execution
     source = 'workflow'
     context.workflowId set

6. Agent interceptor:
   - interceptAgent(agent) — Hook into agent execution:
     Wrap agent action methods
     source = 'agent'
     context.agentSessionId set

7. Universal wrapper:
   - wrapAction(fn, metadata) — Generic wrapper for any async function:
     metadata: { action, actorType, actorId, targetType, source }
     Returns wrapped function that logs to audit trail
     
     Usage:
     const wrappedFollow = interceptor.wrapAction(
       originalFollow,
       { action: 'follow.create', actorType: 'agent', source: 'agent' }
     );

8. Control:
   - enable() / disable() — Turn auditing on/off
   - setPolicyEngine(engine) — Attach policy engine for pre-checks
   - getInterceptionStats() — How many actions intercepted, by source

Author: @author nich (@nichxbt)
```

---

### Prompt 7: Receipt Generator

```
You are building the receipt generator for XActions Verifiable Actions.

Create file: src/audit/receiptGenerator.js

This generates human-readable, verifiable receipts for actions.

Build:

1. ReceiptGenerator class:
   constructor(options):
     - auditLog: AuditLog
     - signer: ActionSigner

2. Receipt generation:
   - generateReceipt(actionId) — Generate a receipt for a single action:
     a. Fetch action from audit log
     b. Create human-readable summary:
        
        Template per action type:
        'tweet.create': "Posted tweet: \"{text}\" — {url}"
        'tweet.delete': "Deleted tweet {tweetId}"
        'like.create': "Liked tweet by @{target}: \"{text}\""
        'follow.create': "Followed @{target}"
        'follow.delete': "Unfollowed @{target}"
        'scrape.profile': "Scraped profile of @{target}"
        etc.
     
     c. Build receipt object:
     {
       receiptId: UUID,
       actionId: string,
       timestamp: string,
       summary: string (human-readable),
       action: string,
       actor: { type, id, name },
       target: { type, identifier },
       success: boolean,
       duration: number,
       source: string,
       signature: string (from audit log),
       verificationInstructions: "To verify: xactions audit verify {receiptId}"
     }
   
   - generateSessionReceipt(agentSessionId) — Receipt for an entire agent session:
     a. Fetch all actions for the session
     b. Summarize: "Agent '{name}' ran from {start} to {end}: {count} actions"
     c. List each action with summary
     d. Calculate totals: tweets posted, users followed, etc.
     e. Sign the entire session receipt
   
   - generateWorkflowReceipt(workflowId) — Receipt for a workflow run

3. Receipt formats:
   - toText(receipt) — Plain text receipt:
     ```
     ╔══════════════════════════════════════════╗
     ║          XACTIONS ACTION RECEIPT         ║
     ╠══════════════════════════════════════════╣
     ║ Receipt ID:  abc123                      ║
     ║ Timestamp:   2025-01-15T10:30:00.000Z   ║
     ║ Action:      Posted tweet                ║
     ║ Actor:       Agent "growth-bot"          ║
     ║ Target:      n/a                         ║
     ║ Status:      ✅ Success                   ║
     ║ Duration:    1,234ms                     ║
     ║ Signature:   a1b2c3...                   ║
     ╚══════════════════════════════════════════╝
     ```
   
   - toMarkdown(receipt) — Markdown formatted receipt
   - toJSON(receipt) — JSON receipt (machine-readable)
   - toHTML(receipt) — Styled HTML receipt (for dashboard)

4. Batch receipts:
   - generateDailyReceipt(date) — All actions on a date:
     Summary + full action list + statistics
   
   - generatePeriodReceipt(since, until) — Actions in a period

5. Receipt storage:
   - Save receipts to ~/.xactions/receipts/{year}/{month}/{receiptId}.json
   - getReceipt(receiptId) — Retrieve stored receipt
   - listReceipts(filters) — List receipts

Author: @author nich (@nichxbt)
```

---

### Prompt 8: Verifier

```
You are building the verification system for XActions Verifiable Actions.

Create file: src/audit/verifier.js

This verifies the integrity and authenticity of audit logs, receipts, and action records.

Build:

1. AuditVerifier class:
   constructor(options):
     - signer: ActionSigner
     - hashChain: HashChain
     - auditLog: AuditLog

2. Single action verification:
   - verifyAction(actionRecord) — Verify a single action:
     Checks:
     a. Signature is valid (Ed25519 signature matches content)
     b. Hash is correct (recompute and compare)
     c. Timestamp is reasonable (not in the future, not impossibly old)
     d. Required fields are present
     
     Return: {
       valid: boolean,
       checks: {
         signature: { passed: boolean, detail: string },
         hash: { passed: boolean, detail: string },
         timestamp: { passed: boolean, detail: string },
         schema: { passed: boolean, detail: string }
       },
       overallConfidence: number (0-100)
     }

3. Chain verification:
   - verifyChainIntegrity(options) — Verify the entire audit log:
     options: { since?, until?, limit? }
     a. Fetch all records in order
     b. Verify hash chain continuity
     c. Verify each signature
     d. Check for gaps in timestamps
     
     Return: {
       valid: boolean,
       totalRecords: number,
       verifiedRecords: number,
       chainBreaks: number,
       invalidSignatures: number,
       gaps: Array<{ before, after, gapDuration }>,
       coverage: { from, to },
       integrity: number (0-100 percentage of valid records)
     }

4. Receipt verification:
   - verifyReceipt(receipt) — Verify a receipt:
     a. Look up the original action in audit log
     b. Verify the receipt's claims match the action record
     c. Verify the signature
     Return: { valid: boolean, matchesAuditLog: boolean, signatureValid: boolean }

5. Merkle proof verification:
   - verifyMerkleProof(proof) — Verify a Merkle proof:
     Used for proving a specific action exists in the log without revealing the whole log

6. External verification:
   - generateVerificationBundle(actionId) — Create a bundle that can be verified independently:
     Bundle contents:
     - Action record
     - Public key
     - Hash chain context (previous and next hashes)
     - Merkle proof
     Return: { bundle: string (base64-encoded JSON) }
   
   - verifyBundle(bundle) — Verify an externally-provided bundle

7. Automated health monitoring:
   - scheduleIntegrityChecks(interval) — Run periodic integrity checks
   - getIntegrityReport() — Latest integrity check results

Author: @author nich (@nichxbt)
```

---

### Prompt 9: Policy Engine

```
You are building the policy engine for XActions Verifiable Actions.

Create file: src/audit/policyEngine.js

This enforces policies and guardrails on agent actions — rate limits, content restrictions, and approval workflows.

Build:

1. PolicyEngine class:
   constructor(options):
     - configPath: string (default ~/.xactions/policies.json)
     - auditLog: AuditLog

2. Policy definition:
   Policy schema:
   {
     id: string,
     name: string,
     description: string,
     enabled: boolean,
     conditions: {
       actors?: string[],          -- Apply to specific actors
       actions?: string[],          -- Apply to specific action types
       categories?: string[],       -- Apply to categories
       riskLevels?: string[],       -- Apply to risk levels
       sources?: string[]           -- Apply to sources
     },
     rules: Array<PolicyRule>,
     enforcement: 'block' | 'warn' | 'log_only'
   }

3. Built-in policy rules:
   
   RATE LIMIT:
     { type: 'rate_limit', action: 'follow.create', limit: 100, window: '1h' }
     { type: 'rate_limit', action: 'tweet.create', limit: 50, window: '1h' }
     { type: 'rate_limit', action: 'like.create', limit: 200, window: '1h' }
   
   DAILY LIMIT:
     { type: 'daily_limit', action: 'follow.create', limit: 400 }
     { type: 'daily_limit', action: 'tweet.create', limit: 100 }
   
   CONTENT FILTER:
     { type: 'content_filter', field: 'input.text', blockedPatterns: [/buy now/i, /follow for follow/i] }
   
   TARGET RESTRICTIONS:
     { type: 'target_restriction', blockedTargets: ['@elonmusk'] }
     (Some accounts should never be unfollowed, blocked, etc.)
   
   TIME RESTRICTIONS:
     { type: 'time_restriction', allowedHours: { start: 8, end: 22 }, timezone: 'UTC' }
     (Don't post or engage outside hours — looks like a bot)
   
   APPROVAL REQUIRED:
     { type: 'approval_required', actions: ['tweet.create'], riskLevels: ['critical'] }
     (Pause and require human approval before executing)
   
   BUDGET LIMIT:
     { type: 'budget_limit', action: 'follow.create', maxPerSession: 50 }

4. Policy evaluation:
   - evaluateAction(actionRecord) — Check if action is allowed:
     a. Find all policies that match this action (by conditions)
     b. For each matching policy:
        - Evaluate each rule
        - If rule fails: collect violation
     c. Return: {
         allowed: boolean,
         violations: Array<{ policyId, ruleName, detail }>,
         warnings: Array<{ policyId, ruleName, detail }>,
         requiresApproval: boolean
       }

5. Policy management:
   - loadPolicies() — Load from config file
   - addPolicy(policy) — Add a new policy
   - updatePolicy(id, updates) — Update existing policy
   - removePolicy(id) — Remove a policy
   - getPolicy(id) — Get a specific policy
   - listPolicies() — List all policies
   - enablePolicy(id) / disablePolicy(id)

6. Default policies:
   - createDefaultPolicies() — Create sensible defaults:
     Anti-spam: Max 50 tweets/hour, max 200 follows/day
     Anti-detection: Enforce 1-3s delays between actions
     Time restrictions: No actions at 3am
     Content safety: Block common spam patterns

7. Policy reporting:
   - getViolationReport(period) — Summary of policy violations:
     Return: { totalViolations, byPolicy, byAction, byActor, trending }

Author: @author nich (@nichxbt)
```

---

### Prompt 10: Replay Engine

```
You are building the replay engine for XActions Verifiable Actions.

Create file: src/audit/replayEngine.js

This replays and simulates past actions — for debugging, auditing, and "what-if" analysis.

Build:

1. ReplayEngine class:
   constructor(options):
     - auditLog: AuditLog
     - policyEngine: PolicyEngine (optional, for policy checks during replay)

2. Replay modes:
   - replayDry(filters) — Dry-run replay (no actual execution):
     a. Fetch actions matching filters from audit log
     b. For each action: simulate execution, check policies, record result
     c. Return: {
         actions: Array<{ original, wouldSucceed, policyResult }>,
         summary: { total, wouldSucceed, wouldFail, policyViolations }
       }
     Use case: "If this agent ran again today, what would happen?"
   
   - replayLive(filters, options) — Actually re-execute actions:
     WARNING: This performs real actions!
     options: { 
       dryRun: false,
       delayBetween: 2000,
       stopOnError: true,
       skipActions: string[] (action types to skip)
     }
     a. Require explicit confirmation
     b. Fetch and execute each action
     c. Record new audit log entries for the replay
     d. Return results

3. Session replay:
   - replaySession(sessionId, mode) — Replay an entire agent session:
     Useful for debugging: "What did this agent do?"
     mode: 'dry' | 'live' | 'analyze'
     
     In 'analyze' mode:
     - Don't execute, just analyze
     - Calculate: total actions, action distribution, pace, targets engaged
     - Detect patterns: was the agent looping? Was it stuck? 
     - Return analysis report

4. What-if simulation:
   - simulateWithPolicy(sessionId, policyOverrides) — What if policies were different?
     a. Get all actions from session
     b. Apply new policy rules
     c. Return: which actions would have been blocked/allowed
     Use case: "Would this stricter policy have prevented the spam incident?"
   
   - simulateThrottled(sessionId, newRateLimits) — Simulate with different rate limits:
     Show how the session would have played out with slower limits

5. Timeline visualization:
   - generateTimeline(filters) — Create timeline data for visualization:
     Return: Array<{ timestamp, action, actor, target, success, riskLevel }>
     Suitable for D3.js timeline chart

6. Diff analysis:
   - diffSessions(sessionA, sessionB) — Compare two sessions:
     Return: { onlyInA, onlyInB, common, differences }
   
   - diffReplays(originalSession, replayResults) — Compare original to replay:
     Return: { same, different, newErrors, newSuccesses }

Author: @author nich (@nichxbt)
```

---

### Prompt 11: Compliance Reporter

```
You are building the compliance reporter for XActions Verifiable Actions.

Create file: src/audit/complianceReporter.js

This generates compliance reports for auditors, proving what actions were taken and ensuring policy adherence.

Build:

1. ComplianceReporter class:
   constructor(options):
     - auditLog: AuditLog
     - verifier: AuditVerifier
     - policyEngine: PolicyEngine

2. Report types:
   
   - generateFullAuditReport(period) — Complete audit report:
     Sections:
     a. Executive Summary:
        Total actions, success rate, risk distribution, policy compliance rate
     b. Integrity Verification:
        Hash chain verification result
        Signature verification results
        Anomalies detected
     c. Action Breakdown:
        By category, by action type, by actor, by risk level
        Tables with counts and percentages
     d. Policy Compliance:
        Policies in place
        Violations: count, severity, details
        Compliance rate per policy
     e. Risk Assessment:
        High-risk actions: full details
        Critical actions: full details with context
        Unusual patterns detected
     f. Timeline:
        Chronological list of all actions with receipts
     g. Recommendations:
        Based on violations and patterns
   
   - generateActorReport(actorId, period) — Report for a specific agent/user:
     Everything the actor did, policies violated, patterns
   
   - generateIncidentReport(actionIds) — Investigate specific actions:
     Full context: what happened before, during, after
     Chain of events leading to and from these actions
   
   - generateDataAccessReport(period) — GDPR/privacy focused:
     All scraping actions, what data was accessed, for whom

3. Report formats:
   - toMarkdown(report) — Full markdown document
   - toHTML(report) — Styled HTML (printable)
   - toJSON(report) — Structured JSON
   - toPDF(report) — PDF via HTML→PDF conversion
   - toCSV(report) — Tabular data export

4. Scheduled compliance:
   - scheduleReport(type, cron, outputPath) — Auto-generate reports:
     Weekly audit summary, monthly full audit
   - Store reports: ~/.xactions/compliance/{year}/{month}/{report-name}.md

5. Export for external auditors:
   - exportAuditBundle(period) — Create a complete, verifiable bundle:
     Contains: audit log entries, hash chain, public key, verification instructions
     Format: ZIP file with JSON + verification script
     Third-party can verify without XActions installed

Author: @author nich (@nichxbt)
```

---

### Prompt 12: Anomaly Alerter

```
You are building the anomaly alerting system for XActions Verifiable Actions.

Create file: src/audit/alerter.js

This monitors the audit log for suspicious patterns and anomalies.

Build:

1. AuditAlerter class:
   constructor(options):
     - auditLog: AuditLog
     - alertHandlers: Map<string, Function> (how to deliver alerts)

2. Anomaly detection patterns:
   
   - detectRapidActions(window?) — Detect burst of actions in short time:
     If >50 actions in 5 minutes: alert
     Could indicate: runaway agent, compromised API key
   
   - detectUnusualHours(timezone?) — Actions at unusual times:
     If actions at 3am in user's timezone: alert
     Could indicate: compromised credentials
   
   - detectNewActor() — New actor type never seen before:
     If an unknown agent/API key starts making actions: alert
   
   - detectHighRiskBurst() — Multiple high-risk actions in sequence:
     If >10 high/critical risk actions in 10 minutes: alert
   
   - detectRepeatedFailures() — Many failed actions:
     If >80% failure rate in last 20 actions: alert
     Could indicate: expired auth, platform changes
   
   - detectPolicyViolationSpike() — Sudden increase in policy violations:
     If violations > 3x average: alert
   
   - detectTargetingPattern() — Unusual targeting:
     If one target receives >20 actions in an hour: alert
     Could indicate: harassment or obsessive behavior

3. Alert management:
   - Alert schema:
     {
       id: string,
       type: string,
       severity: 'info' | 'warning' | 'critical',
       title: string,
       description: string,
       affectedActions: string[] (action IDs),
       detectedAt: string,
       acknowledged: boolean,
       resolvedAt: string | null
     }
   
   - addHandler(type, handler) — Register alert handler:
     types: 'log', 'console', 'webhook', 'file'
     handler receives: Alert object
   
   - acknowledge(alertId) — Mark alert as acknowledged
   - resolve(alertId) — Mark as resolved
   - getActiveAlerts() — Get unresolved alerts
   - getAlertHistory(period) — Alert history

4. Continuous monitoring:
   - startMonitoring(interval?) — Begin continuous anomaly checks:
     Default interval: every 60 seconds
     Run all detection patterns
     Deliver alerts through handlers
   
   - stopMonitoring()

Author: @author nich (@nichxbt)
```

---

### Prompt 13: Module Entry Point and CLI

```
You are building the entry point and CLI commands for XActions Verifiable Actions.

Create file: src/audit/index.js

Build:

1. Re-export everything:
   export all classes from all src/audit/ modules

2. createAuditSystem(options) — All-in-one factory:
   options: {
     dbPath?: string,
     keyDir?: string,
     enableChaining?: boolean (default true),
     enableSigning?: boolean (default true),
     enablePolicies?: boolean (default true),
     enableAlerts?: boolean (default true),
     defaultPolicies?: boolean (default true)
   }
   
   Returns: {
     log: AuditLog,
     signer: ActionSigner,
     chain: HashChain,
     keys: KeyManager,
     interceptor: ActionInterceptor,
     receipts: ReceiptGenerator,
     verifier: AuditVerifier,
     policies: PolicyEngine,
     replay: ReplayEngine,
     compliance: ComplianceReporter,
     alerter: AuditAlerter,
     
     // Convenience:
     logAction(record) — Append to audit log
     getReceipt(actionId) — Generate receipt
     verify() — Verify chain integrity
     generateReport(period) — Compliance report
   }

3. Integration helper:
   - integrateWithMCP(mcpServer, auditSystem) — Automatically intercept all MCP tools
   - integrateWithCLI(cliHandler, auditSystem) — Intercept CLI commands
   - integrateWithAPI(expressApp, auditSystem) — Add audit middleware
   - integrateWithWorkflows(engine, auditSystem) — Intercept workflow steps

4. CLI commands:
   xactions audit status — Show audit system status (records, integrity, alerts)
   xactions audit verify — Run full integrity verification
   xactions audit search [--action type] [--since date] [--actor id] — Search audit log
   xactions audit receipt <actionId> — Generate and display receipt
   xactions audit report [--type full|actor|incident|compliance] [--period 30d]
   xactions audit export [--format jsonl|json|csv] [--since date] [--output path]
   xactions audit replay <sessionId> [--dry-run]
   xactions audit policies list — List active policies
   xactions audit policies add <policyFile> — Add policy from JSON file
   xactions audit alerts — Show active alerts
   xactions audit keys list — List signing keys
   xactions audit keys generate <name> — Generate new key pair

5. Add to package.json exports:
   "./audit": "./src/audit/index.js"

Author: @author nich (@nichxbt)
```

---

### Prompt 14: Complete Test Suite

```
You are building the test suite for XActions Verifiable Actions.

Create test files using vitest:

1. tests/audit/signer.test.js:
   - Test Ed25519 key pair generation
   - Test action signing produces valid base64 signature
   - Test signature verification passes for valid signature
   - Test signature verification fails for tampered record
   - Test signature verification fails for wrong key
   - Test canonical serialization is deterministic
   - Test HMAC signing alternative
   - Test HMAC verification

2. tests/audit/auditLog.test.js:
   - Test table creation on first run
   - Test append creates record with correct fields
   - Test append generates signature
   - Test append maintains hash chain
   - Test getActions with filters returns correct results
   - Test getActionSummary returns correct counts
   - Test getTimeline returns chronological data
   - Test JSONL dual-write works
   - Test cannot update or delete records (append-only)

3. tests/audit/actionInterceptor.test.js:
   - Test MCP tool interception captures action
   - Test interceptor records input and output
   - Test interceptor records success/failure
   - Test interceptor records duration
   - Test interceptor respects policy engine (blocked action)
   - Test interceptor can be disabled
   - Test universal wrapAction works

4. tests/audit/verifier.test.js:
   - Test verifyAction passes for valid record
   - Test verifyAction fails for invalid signature
   - Test verifyAction fails for wrong hash
   - Test verifyChainIntegrity passes for valid chain
   - Test verifyChainIntegrity detects broken link
   - Test verifyChainIntegrity detects removed record
   - Test Merkle proof generation and verification

5. tests/audit/hashChain.test.js:
   - Test genesis hash is consistent
   - Test chainAction links to previous hash
   - Test verifyChain passes for valid chain
   - Test verifyChain fails for reordered records
   - Test verifyChain fails for inserted records
   - Test verifyChain fails for deleted records
   - Test Merkle root computation

6. tests/audit/policyEngine.test.js:
   - Test rate limit policy blocks when exceeded
   - Test rate limit policy allows when under limit
   - Test daily limit policy
   - Test content filter blocks banned patterns
   - Test target restriction blocks banned targets
   - Test time restriction blocks outside hours
   - Test multiple policies are evaluated
   - Test policy enforcement levels (block vs warn vs log)

7. tests/audit/integration.test.js:
   - Full pipeline: intercept → sign → chain → store → verify
   - Test receipt generation for a stored action
   - Test compliance report generation
   - Test replay engine dry run
   - Test alert detection for rapid actions
   All with in-memory SQLite

Author: @author nich (@nichxbt)
```

---

### Prompt 15: Documentation and Dashboard

```
You are writing documentation and dashboard for XActions Verifiable Actions.

Create these files:

1. skills/verifiable-actions/SKILL.md:
   - Title: Verifiable Agent Actions — Cryptographic Audit Trails
   - Description: Tamper-proof logging of every action agents take
   - Why: Accountability, compliance, debugging, trust
   - Quick Start: Enable auditing in 3 commands
   - Features: signing, hash chains, receipts, policies, alerts, compliance
   - CLI reference
   - Configuration
   - Use cases: 5 real scenarios

2. docs/verifiable-actions.md:
   Complete documentation:
   - Architecture with diagram
   - How signing works (Ed25519 explained simply)
   - How hash chains work (linked list of hashes)
   - How Merkle proofs work (efficient verification)
   - Action types reference (every auditable action)
   - Policy engine: writing custom policies
   - Receipt system: generating and sharing receipts
   - Compliance reporting: types and automation
   - Replay engine: debugging agent sessions
   - Anomaly alerting: patterns detected
   - Integration guide: how to add auditing to existing code
   - API reference for every function
   - Code examples
   - Security considerations
   - Performance: impact of auditing on action speed

3. docs/audit-api-reference.md:
   Complete API reference for every public function

4. dashboard/audit.html:
   Audit dashboard:
   - Audit log viewer (table with filters):
     Columns: Time, Action, Actor, Target, Risk, Status, Signature
     Filters: date range, action type, actor, risk level
     Click row → action detail panel with receipt
   - Integrity status (chain verification result)
   - Policy violations panel
   - Active alerts panel
   - Statistics: actions/hour chart, risk distribution pie chart
   - Receipt viewer (enter action ID → see receipt)
   - Compliance report generator (select period, generate)
   - Session replay viewer (select session, see timeline)

All content uses real code paths and algorithms from the implementation.
Author: @author nich (@nichxbt)
```

---

## Success Criteria

- [ ] Ed25519 key generation and management works
- [ ] Actions are cryptographically signed
- [ ] Hash chain links every action to the previous one
- [ ] Audit log is append-only (no update/delete)
- [ ] Action interceptor hooks into MCP, CLI, API, workflows
- [ ] receipts are generated with human-readable summaries
- [ ] Verification detects tampered records
- [ ] Policy engine enforces rate limits and restrictions
- [ ] Replay engine can dry-run past sessions
- [ ] Compliance reports generate valid documents
- [ ] Anomaly alerter detects suspicious patterns
- [ ] Full test suite passes with vitest
- [ ] CLI commands work for all audit operations
- [ ] Dashboard provides audit log viewer and management
- [ ] Documentation is complete
