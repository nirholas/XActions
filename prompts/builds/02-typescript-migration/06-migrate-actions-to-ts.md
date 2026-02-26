# Build 02-06 — Migrate Action Modules to TypeScript

> **Creates:** `.ts` versions of actions.js, engagement.js, media.js, dm.js

---

## Task

Convert all HTTP scraper mutation/action modules to TypeScript.

---

## Files

1. **`actions.ts`** — Post/delete tweet mutations with typed responses
2. **`engagement.ts`** — Like/follow/block with result types
3. **`media.ts`** — Upload with progress types, download with stream types
4. **`dm.ts`** — DM operations with conversation types

### Key Interfaces

```typescript
interface PostTweetOptions {
  replyTo?: string;
  mediaIds?: string[];
  quoteTweetId?: string;
  sensitive?: boolean;
}

interface PostTweetResult {
  id: string;
  text: string;
  createdAt: string;
  author: TwitterUser;
}

interface BulkOperationOptions {
  delayMs?: number;
  onProgress?: (progress: BulkProgress) => void;
  dryRun?: boolean;
}

interface BulkProgress {
  completed: number;
  total: number;
  current: string; // Current user/tweet being processed
  failed: Array<{ id: string; error: Error }>;
}

interface UploadProgress {
  phase: 'init' | 'upload' | 'processing' | 'complete';
  percent: number;
  bytesUploaded?: number;
  totalBytes?: number;
}

interface MediaUploadResult {
  mediaId: string;
  mediaKey: string;
  processingInfo?: { state: string; checkAfterSecs: number };
}
```

---

## Acceptance Criteria
- [ ] All 4 action modules converted
- [ ] Mutation inputs and outputs fully typed
- [ ] Bulk operation progress types defined
- [ ] Media upload progress types defined
- [ ] Compiles with `tsc --noEmit`
