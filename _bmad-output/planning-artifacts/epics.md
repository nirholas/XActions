---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# XActions - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for XActions, decomposing the requirements from the Facebook Platform Extension PRD and Architecture Addendum A into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Người dùng có thể scrape một Facebook profile/page công khai bằng handle hoặc URL; trả về normalized profile shape và lỗi rõ ràng khi profile không tồn tại hoặc bị chặn.

FR2: Người dùng có thể scrape posts gần đây của một profile/page với `limit`; mỗi post trả về `id`, `text`, `timestamp`, `likes`, `comments`, `url`, `media`, `platform: 'facebook'`; scroll có delay và bounded retry.

FR3: Người dùng có thể scrape followers của một profile/page khi Facebook cho phép; nếu không lộ follower list thì trả object có `note` thay vì lỗi cứng.

FR4: Người dùng có thể search posts/nội dung Facebook theo query; trả về mảng kết quả normalized và tôn trọng `limit`.

FR5: Facebook được đăng ký vào `platforms` registry để `scrape('facebook', action, options)` và alias `'fb'` dispatch đúng module; `facebook`/`fb` nằm trong nhánh `needsPuppeteer`.

FR6: Người dùng có thể tự động like một hoặc nhiều Facebook post; `dryRun` mặc định `true`; khi chạy thật có delay, bounded batch và Operation record.

FR7: Người dùng có thể tự động comment nội dung cho trước lên post; `dryRun` mặc định `true`; preview hiển thị post mục tiêu và nội dung comment; chạy thật có delay/batch/stop condition.

FR8: Người dùng có thể tạo Facebook post text (kèm media nếu có); `dryRun` mặc định `true`; chạy thật trả về URL/ID post trong Operation result.

FR9: Mọi hàm automate chia sẻ guardrail: dry-run mặc định, delay, bounded batch, bounded retry, stop condition, cảnh báo account risk trước batch ghi đầu tiên.

FR10: Người dùng xác thực bằng cặp Facebook session cookie `c_user` + `xs`; thiếu/sai cookie trả lỗi rõ ràng; cookie không xuất hiện trong log/response.

FR11: MCP tool/option nhận `platform: "facebook"` hoặc `"fb"` cho các action đã hỗ trợ; schema bổ sung additive và có contract test.

FR12: CLI hỗ trợ `--platform facebook` cho scrape/automate; scrape trả output qua exporter hiện có; automate có cờ dry-run mặc định bật.

FR13: REST API + Dashboard hỗ trợ Facebook; route validate/authorize theo `userId`, business logic ở `api/services`, thao tác nặng/ghi sau rate limit hoặc job queue.

FR14: Job automation Facebook được lưu vào PostgreSQL qua Prisma; Operation record có progress, Socket.IO update cho job dài; snapshot chỉ thêm khi story/future phase có retention rõ.

### NonFunctional Requirements

NFR1: Rate-limit safety — mọi vòng lặp action (scrape scroll + automate) có delay 1-3s, bounded retry, stop condition; automate dùng batch nhỏ hơn scrape do account risk cao hơn.

NFR2: Anti-detection — dùng puppeteer-extra-plugin-stealth như Threads/Twitter; delay rộng hơn cho Facebook.

NFR3: Security — session cookie `c_user`/`xs` là dữ liệu nhạy cảm; không log, không echo trong response; mọi record scope theo `userId`.

NFR4: Selector resilience — ưu tiên anchor theo `role`/`aria-label`/text, bọc selector trong helper và tài liệu `docs/agents/selectors-facebook.md`; không hard-code rải rác.

NFR5: Consistency — output khớp normalized shape của các nền tảng khác; entrypoint chỉ orchestrate/validate/format, không nhân bản logic scraper.

NFR6: Testability — unit test cho parser/normalizer, smoke test gated bởi session/env availability, contract test khi public surface (MCP/API/CLI) đổi.

### Additional Requirements

- Architecture Addendum A xác nhận Facebook là nền tảng thứ năm, bổ sung chứ không viết lại kiến trúc brownfield hiện có.
- ADR-006: Facebook scrape đi qua adapter pattern hiện có, clone gần nhất từ `src/scrapers/threads/index.js`.
- ADR-007: Facebook automate tách khỏi scrape, nằm ở `api/services/facebookAutomation.js` và `src/automation/facebook/*.js`, mặc định dry-run.
- Wiring requirement: thêm `import facebook from './facebook/index.js'`, thêm `facebook`/`fb` vào `platforms`, thêm `facebook`/`fb` vào `needsPuppeteer`.
- Login contract lệch Twitter: `loginWithCookie(page, { c_user, xs })` nhận object, không phải string.
- Selector knowledge phải tập trung ở `docs/agents/selectors-facebook.md`.
- Implementation phases từ Architecture A.7: Phase 1 Scrape core; Phase 2 Registry + tests; Phase 3 Expose surfaces; Phase 4 Automate; Phase 5 Persisted workflows.
- Phase 1 blockers: tài liệu cách lấy cookie `c_user`/`xs`; xác minh field follower scrape thực tế.
- Phase 4 blocker: chốt batch size an toàn cho automate bằng account thử nghiệm.

### UX Design Requirements

Không có UX Design document riêng. Dashboard work ở MVP là tích hợp surface hiện có, không tạo UX flow mới độc lập. Nếu dashboard story phát sinh UI mới, story đó phải tuân thủ shared CSS/helpers và API-side authorization theo architecture.

### FR Coverage Map

FR1: Epic 1 - Scrape Facebook profile
FR2: Epic 1 - Scrape Facebook posts
FR3: Epic 1 - Scrape Facebook followers (with public-data fallback)
FR4: Epic 1 - Search Facebook posts
FR5: Epic 1 - Register Facebook in `platforms` dispatcher
FR6: Epic 2 - Auto-like Facebook posts (dry-run default)
FR7: Epic 2 - Auto-comment on Facebook posts (dry-run default)
FR8: Epic 2 - Create Facebook post (dry-run default)
FR9: Epic 2 - Shared automate guardrails (delay, batch, stop)
FR10: Epic 1 - Login with Facebook session cookie (`c_user` + `xs`)
FR11: Epic 3 - MCP tool/option for Facebook
FR12: Epic 3 - CLI `--platform facebook`
FR13: Epic 3 - REST API + Dashboard for Facebook
FR14: Epic 3 - Operation persistence via Prisma

## Epic List

### Epic 1: Facebook Data Reading
Người dùng có thể đọc dữ liệu Facebook (profile, posts, followers, search) qua Node library bằng cùng interface với các nền tảng khác. Bao gồm login bằng session cookie, Facebook adapter module, đăng ký vào dispatcher và bộ scrape function chuẩn hóa output.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR10

### Epic 2: Facebook Automation
Người dùng có thể tự động hóa hành động ghi (like, comment, post) trên Facebook với cơ chế an toàn: dry-run mặc định, delay 1-3s, bounded batch và stop condition. Logic nằm ở Facebook automation service, tách hoàn toàn khỏi adapter scrape (theo ADR-007).
**FRs covered:** FR6, FR7, FR8, FR9

### Epic 3: Facebook Multi-Surface & Persistence
Người dùng truy cập mọi tính năng Facebook (scrape + automate) qua CLI, MCP, REST API/Dashboard, với Operation persistence qua Prisma và Socket.IO updates cho job dài. Surface exposure dùng lại pattern hiện có thay vì tạo chiến lược riêng cho Facebook.
**FRs covered:** FR11, FR12, FR13, FR14

## Epic 1: Facebook Data Reading

Người dùng có thể đọc dữ liệu Facebook (profile, posts, followers, search) qua Node library bằng cùng interface với các nền tảng khác. Bao gồm login bằng session cookie, Facebook adapter module, đăng ký vào dispatcher và bộ scrape function chuẩn hóa output.

### Story 1.1: Facebook adapter scaffold + login + dispatcher registration

As a developer using XActions,
I want a Facebook adapter module registered in the platform dispatcher with login support,
So that I have a working foundation to build scrape functions on.

**Acceptance Criteria:**

**Given** the XActions codebase with `src/scrapers/` multi-platform structure
**When** `src/scrapers/facebook/index.js` is created with `createBrowser`, `createPage`, `loginWithCookie` exports
**Then** the module follows the same pattern as `src/scrapers/threads/index.js` (Puppeteer + Stealth)
**And** `loginWithCookie(page, { c_user, xs })` accepts an object with both cookies
**And** missing/invalid cookies return a clear error message without retrying blindly
**And** cookies never appear in logs or error messages (security redaction)

**Given** the `src/scrapers/index.js` dispatcher
**When** Facebook is registered in the `platforms` object with aliases `facebook` and `fb`
**Then** `getPlatform('facebook')` and `getPlatform('fb')` return the Facebook module
**And** `'facebook'` and `'fb'` are in the `needsPuppeteer` branch of the `scrape()` function
**And** calling `scrape('facebook', 'nonexistent', {})` throws an appropriate error listing available actions

**Given** the new module
**When** inspecting the file structure
**Then** `docs/agents/selectors-facebook.md` is created (initially empty/skeleton)
**And** unit tests exist for login error handling and dispatcher wiring

### Story 1.2: Scrape Facebook profile

As a growth marketer using XActions,
I want to scrape a public Facebook profile/page,
So that I can analyze Facebook accounts with the same normalized format as Twitter.

**Acceptance Criteria:**

**Given** a valid Facebook session cookie and a public profile handle or URL
**When** `scrape('facebook', 'profile', { page, username: '<handle>' })` is called
**Then** the system returns an object with: `name`, `username`, `bio`, `avatar`, `followers`, `url`, `platform: 'facebook'`
**And** the shape matches the profile shape of other platform adapters (Threads/Twitter)

**Given** a non-existent or blocked profile
**When** scrape profile is called
**Then** the system returns a clear error (not a hang, not an empty unlabeled object)

**Given** the profile scraping logic
**When** extracting data from the DOM
**Then** selectors are documented in `docs/agents/selectors-facebook.md`
**And** selectors prefer `role`/`aria-label`/text anchors over class names
**And** unit tests validate the normalizer/parser logic

### Story 1.3: Scrape Facebook posts

As a growth marketer using XActions,
I want to scrape recent posts from a Facebook profile/page with a configurable limit,
So that I can collect Facebook content for cross-platform analysis.

**Acceptance Criteria:**

**Given** a valid session and a public profile/page
**When** `scrape('facebook', 'posts', { page, username, limit: 50 })` is called
**Then** each post in the result has: `id`, `text`, `timestamp`, `likes`, `comments`, `url`, `media: { images, hasVideo }`, `platform: 'facebook'`

**Given** the posts scraping loop
**When** scrolling to load more posts
**Then** there is a 1-3s delay between scrolls (rate-limit safety)
**And** there is a bounded retry limit when no new posts appear (maxRetries)
**And** the loop stops when `limit` is reached or content is exhausted

**Given** a page with fewer posts than `limit`
**When** the scraper reaches end of content
**Then** it returns whatever posts were collected without error

### Story 1.4: Scrape Facebook followers (public-data fallback)

As a growth marketer using XActions,
I want to scrape followers of a Facebook profile/page when publicly available,
So that I can understand audience composition without hitting a hard error when data is restricted.

**Acceptance Criteria:**

**Given** a profile where Facebook exposes the follower list publicly
**When** `scrape('facebook', 'followers', { page, username })` is called
**Then** the system returns an array of follower profiles (`name`, `username`, `url`)

**Given** a profile where Facebook does NOT expose the follower list publicly
**When** scrape followers is called
**Then** the system returns an object with `note` field explaining the limitation and `platform: 'facebook'`
**And** the system does NOT throw an error or return an empty unlabeled result

**Given** the follower scraping logic
**When** verifying available fields
**Then** `docs/agents/selectors-facebook.md` documents which fields are actually extractable (resolves Phase 1 blocker Q3)

### Story 1.5: Search Facebook posts

As a growth marketer using XActions,
I want to search Facebook posts by query,
So that I can discover content and conversations relevant to my niche.

**Acceptance Criteria:**

**Given** a valid session and a search query
**When** `scrape('facebook', 'search', { page, query, limit: 30 })` is called
**Then** the system returns an array of results with: `id`, `text`, `author`, `timestamp`, `url`, `platform: 'facebook'`

**Given** the search loop
**When** scrolling for more results
**Then** it respects `limit` and has bounded retry when no new results appear
**And** delay 1-3s between scrolls

**Given** a query with no results
**When** the search returns empty
**Then** the system returns an empty array, not an error

## Epic 2: Facebook Automation

Người dùng có thể tự động hóa hành động ghi (like, comment, post) trên Facebook với cơ chế an toàn: dry-run mặc định, delay 1-3s, bounded batch và stop condition. Logic nằm ở Facebook automation service, tách hoàn toàn khỏi adapter scrape (theo ADR-007).

### Story 2.1: Automation service scaffold + shared guardrails

As a multi-account operator using XActions,
I want a Facebook automation service with built-in safety guardrails,
So that every write action is protected by dry-run, delay, and batch limits by default.

**Acceptance Criteria:**

**Given** the XActions codebase
**When** `api/services/facebookAutomation.js` is created (and `src/automation/facebook/` for loop scripts)
**Then** the service is separate from the scrape adapter (per ADR-007)
**And** it reuses the Facebook login from Epic 1 (`loginWithCookie` with `c_user`/`xs`)

**Given** any write function in the service
**When** the function signature is defined
**Then** it accepts a `dryRun` parameter defaulting to `true`
**And** a shared guardrail helper enforces: 1-3s delay between actions, bounded batch size, bounded retry, explicit stop condition

**Given** a batch size exceeding the configured threshold
**When** a write operation is requested
**Then** the system rejects or splits the batch — no unbounded write loop is possible
**And** an account-risk warning is surfaced before the first real write batch

**Given** the guardrail helper
**When** unit testing
**Then** tests confirm no write executes when `dryRun` has not been explicitly disabled

### Story 2.2: Auto-like Facebook posts (dry-run default)

As a multi-account operator using XActions,
I want to auto-like one or more Facebook posts with a dry-run preview,
So that I can see exactly what will be affected before executing for real.

**Acceptance Criteria:**

**Given** the automation service with shared guardrails
**When** the like function is called with default `dryRun=true`
**Then** the system returns the list of posts that would be liked WITHOUT sending any action to Facebook

**Given** `dryRun=false` is explicitly set
**When** the like action executes
**Then** likes are performed with 1-3s delay between actions and bounded batch size
**And** an Operation record is created (type, status, progress, result) scoped by `userId`

**Given** a like action that fails (blocked, checkpoint)
**When** the failure occurs
**Then** a clear error is returned and recorded in the Operation status

### Story 2.3: Auto-comment on Facebook posts (dry-run default)

As a multi-account operator using XActions,
I want to auto-comment user-provided content on posts with a dry-run preview,
So that I can review target posts and comment text before posting.

**Acceptance Criteria:**

**Given** the automation service
**When** the comment function is called with default `dryRun=true`
**Then** the preview shows the target post(s) and the comment content that would be posted

**Given** `dryRun=false`
**When** comments execute
**Then** there is delay between comments, bounded batch, and a clear stop condition
**And** comment content is user-provided — the system does NOT auto-generate content
**And** an Operation record tracks the run scoped by `userId`

### Story 2.4: Create Facebook post (dry-run default)

As a multi-account operator using XActions,
I want to create a Facebook text post (with optional media) with a dry-run preview,
So that I can confirm content before it goes live.

**Acceptance Criteria:**

**Given** the automation service
**When** the post-create function is called with default `dryRun=true`
**Then** the preview shows the post content that would be published

**Given** `dryRun=false`
**When** the post executes successfully
**Then** the created post URL/ID is returned in the Operation result

**Given** a post failure (blocked, checkpoint)
**When** the failure occurs
**Then** a clear message is returned and written to the Operation status

## Epic 3: Facebook Multi-Surface & Persistence

Người dùng truy cập mọi tính năng Facebook (scrape + automate) qua CLI, MCP, REST API/Dashboard, với Operation persistence qua Prisma và Socket.IO updates cho job dài. Surface exposure dùng lại pattern hiện có thay vì tạo chiến lược riêng cho Facebook.

### Story 3.1: CLI `--platform facebook`

As a CLI user of XActions,
I want to run scrape and automate commands against Facebook via `--platform facebook`,
So that I can use Facebook from the terminal like any other platform.

**Acceptance Criteria:**

**Given** the XActions CLI and a registered Facebook adapter
**When** `xactions scrape --platform facebook --profile <handle>` is run
**Then** normalized output is returned through the existing exporters (JSON/CSV/...)
**And** the command does NOT duplicate scraper logic (delegates to the adapter)

**Given** an automate command via CLI
**When** the user runs a Facebook write command
**Then** there is a dry-run flag that defaults to enabled
**And** disabling dry-run requires an explicit flag

**Given** an invalid platform value
**When** the command runs
**Then** the CLI surfaces the dispatcher's `Unknown platform` error cleanly

### Story 3.2: MCP tool/option for Facebook

As an AI agent using the XActions MCP server,
I want to call Facebook scrape and automate actions with the same schema as other platforms,
So that I don't need platform-specific handling.

**Acceptance Criteria:**

**Given** the MCP server
**When** a tool is called with `platform: "facebook"` or `"fb"`
**Then** supported scrape and automate actions dispatch correctly

**Given** the MCP tool schema
**When** Facebook support is added
**Then** the schema additions are additive — existing tool contracts are not broken
**And** a contract test verifies schema stability for the Facebook tool

**Given** an automate action via MCP
**When** invoked
**Then** dry-run default behavior is preserved (consistent with CLI and service)

### Story 3.3: REST API + Dashboard for Facebook

As a dashboard user of XActions,
I want to access Facebook scrape and automate via REST API and see it in the dashboard,
So that I can operate Facebook from the web UI.

**Acceptance Criteria:**

**Given** the Express API
**When** Facebook routes are added
**Then** routes validate input and authorize by `userId` at the boundary
**And** business logic lives in `api/services` (routes only orchestrate/validate/format)
**And** heavy/write operations sit behind rate limiting or the job queue

**Given** the dashboard
**When** a Facebook page/section is added
**Then** it calls the API using the unified response shape
**And** security relies on API-side authorization, not client-only guards
**And** it reuses shared CSS/helpers per architecture

### Story 3.4: Operation persistence + Socket.IO updates

As a dashboard user of XActions,
I want Facebook automation jobs tracked in the database with real-time progress,
So that I can monitor long-running jobs and review their history.

**Acceptance Criteria:**

**Given** a Facebook automation job
**When** the job runs
**Then** an Operation record is created/updated with progress, scoped by `userId`
**And** Socket.IO emits progress updates for long-running jobs visible on the dashboard

**Given** the persistence design
**When** implementing storage
**Then** the existing `Operation` model is reused — no Facebook-specific Prisma table is created at MVP (per assumption)
**And** any new snapshot table is added only if a story/future phase requires explicit retention

**Given** records belonging to a user
**When** read or written
**Then** access is always scoped by `userId` — no cross-user read/write
