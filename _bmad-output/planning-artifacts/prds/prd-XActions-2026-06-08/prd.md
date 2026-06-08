---
title: Facebook Platform Extension
created: 2026-06-08
updated: 2026-06-08
status: draft-reviewed
---

# PRD: Facebook Platform Extension
*Internal technical PRD for adding Facebook scrape and automation support to XActions.*

## 0. Document Purpose

PRD này dành cho người phát triển XActions (maintainer + AI dev agent) và downstream workflow owners (epic/story, architecture). Nó định nghĩa *cái gì* và *vì sao* cho việc thêm Facebook làm nền tảng thứ năm — không lặp lại *cách làm* kỹ thuật. Chi tiết kiến trúc (wiring `platforms` registry, normalized shape, selector strategy) đã nằm ở `_bmad-output/planning-artifacts/architecture.md` Addendum A (ADR-006, ADR-007); PRD này build trên đó. Tài liệu được tổ chức: vocabulary neo theo Glossary, features nhóm lại với FR lồng bên trong (đánh số toàn cục FR-N), assumptions gắn tag inline `[ASSUMPTION]` và liệt kê ở §9.

## 1. Vision

XActions là toolkit tự động hóa mạng xã hội không phụ thuộc API trả phí, hiện hỗ trợ Twitter/X, Bluesky, Mastodon và Threads qua một adapter pattern thống nhất. Người dùng gọi cùng một interface (`scrape()`, CLI `--platform`, MCP tool, REST API) cho mọi nền tảng và nhận về dữ liệu đã chuẩn hóa.

Facebook Platform Extension đưa Facebook vào cùng mô hình đó. Nó cho phép người dùng **đọc** (scrape profile, posts, followers, search) và **hành động** (post, like, comment) trên Facebook bằng browser automation — không cần Facebook Graph API, không phí, chỉ cần session cookie. Vì Facebook là sản phẩm Meta giống Threads, phần đọc tái dùng gần như nguyên vẹn pattern Puppeteer + Stealth đã chạy ổn định; phần ghi tái dùng hạ tầng automation server-side đã có cho Twitter.

Giá trị cốt lõi: người dùng XActions mở rộng vùng phủ sang mạng xã hội lớn nhất thế giới mà không phải học công cụ mới hay đổi quy trình — cùng một toolkit, thêm một nền tảng. Với maintainer, việc này chứng minh kiến trúc multi-platform mở rộng được, biến "thêm nền tảng" thành thao tác có khuôn mẫu thay vì dự án viết lại.

## 2. Target User

### 2.1 Jobs To Be Done

- **Là maintainer XActions**, tôi muốn thêm Facebook theo đúng adapter pattern hiện có để chứng minh kiến trúc mở rộng được và giảm chi phí thêm nền tảng tương lai.
- **Là người làm growth/marketing** dùng XActions, tôi muốn scrape dữ liệu công khai trên Facebook (profile, posts, followers) để phân tích cùng một chỗ với dữ liệu Twitter.
- **Là người vận hành nhiều tài khoản**, tôi muốn tự động hóa post/like/comment trên Facebook với cùng cơ chế an toàn (dry-run, delay, batch giới hạn) như đang dùng cho Twitter.
- **Là AI agent** (qua MCP), tôi muốn gọi tool Facebook bằng cùng schema như các nền tảng khác để không phải xử lý đặc thù từng nền tảng.

### 2.2 Non-Users (v1)

- Người cần Facebook Ads/Business automation (quảng cáo trả phí, quản lý campaign) — ngoài phạm vi v1.
- Người cần automation trên Facebook Groups hoặc Marketplace — ngoài phạm vi v1.
- Người mong đợi Facebook Graph API chính thức — XActions cố ý dùng browser automation.

### 2.3 Key User Journeys

Vì đây là tính năng kỹ thuật/nội bộ với người vận hành đơn vai trò, các UJ giữ ở dạng nhẹ (một câu, theo scope dial "lighter").

- **UJ-1. Linh scrape một profile Facebook công khai.** Linh, người làm growth đã cấu hình cookie Facebook, chạy `xactions scrape --platform facebook --profile <handle>` và nhận về JSON profile đã chuẩn hóa giống hệt shape của Twitter. Realizes FR-1.
- **UJ-2. Linh thu thập posts gần đây của một trang.** Linh chạy lệnh scrape posts với `--limit 50`, hệ thống scroll và trả về danh sách posts (text, timestamp, likes, comments, media). Realizes FR-2.
- **UJ-3. Tâm tự động like có kiểm soát.** Tâm, vận hành nhiều tài khoản, chạy automate like nhưng để mặc định `dryRun=true` lần đầu để xem preview những post sẽ bị tác động trước khi thực thi thật. Realizes FR-6, FR-9.
- **UJ-4. AI agent gọi qua MCP.** Một agent gọi MCP tool với `platform: "facebook", action: "profile"` và nhận kết quả cùng schema như các nền tảng khác, không cần nhánh xử lý riêng. Realizes FR-11.

## 3. Glossary

*Downstream workflows và readers phải dùng các thuật ngữ này chính xác. FR/UJ/SM dùng nguyên văn; không đặt từ đồng nghĩa ở bất kỳ đâu trong PRD.*

- **Facebook adapter** — Module `src/scrapers/facebook/index.js` chứa logic scrape, đăng ký vào `platforms` registry. Tương ứng adapter của Threads/Twitter.
- **Facebook automation service** — Logic ghi (post/like/comment) ở `api/services/facebookAutomation.js` + scripts `src/automation/facebook/*.js`. Tách khỏi adapter theo ADR-007.
- **Scrape** — Thao tác đọc dữ liệu (profile, posts, followers, search). Không thay đổi trạng thái tài khoản.
- **Automate** — Thao tác ghi (post, like, comment). Thay đổi trạng thái, rủi ro account cao hơn scrape.
- **Dry-run** — Chế độ chạy thử của thao tác ghi: hệ thống tính toán và preview hành động sẽ thực hiện nhưng không gửi lên Facebook. Mặc định bật cho mọi hàm automate.
- **Normalized shape** — Cấu trúc dữ liệu chuẩn hóa chung mọi nền tảng (profile/post), kèm trường `platform`. Định nghĩa chi tiết ở architecture Addendum A.4.
- **Session cookie (Facebook)** — Cặp `c_user` + `xs` dùng để xác thực phiên Facebook. Khác Twitter (một `auth_token`). Thuộc nhóm dữ liệu nhạy cảm, không bao giờ log.
- **Surface** — Một entrypoint người dùng: CLI, MCP, REST API, Dashboard, hoặc Node library.
- **Operation** — Bản ghi Prisma theo dõi một job automation dài (type, status, progress, result), scope theo `userId`.

## 4. Features

*Mỗi subsection là một feature mạch lạc: mô tả hành vi trước, FR lồng bên dưới, NFR/notes riêng nếu có. FR đánh số toàn cục (FR-1..FR-N) để downstream tham chiếu ổn định kể cả khi feature bị sắp xếp lại.*

### 4.1 Facebook Scrape

**Description:** Người dùng đọc dữ liệu công khai trên Facebook qua cùng interface với các nền tảng khác. Facebook adapter dùng Puppeteer + Stealth (theo ADR-006), trả về normalized shape kèm `platform: 'facebook'`. Một số action có thể bị giới hạn bởi đặc thù Facebook (ví dụ follower list không lộ công khai đầy đủ); khi đó trả về data kèm trường `note` giải thích thay vì ném lỗi cứng. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Scrape profile

Người dùng có thể scrape một Facebook profile/page công khai bằng handle hoặc URL. Realizes UJ-1.

**Consequences (testable):**
- Trả về object có các trường: `name`, `username`, `bio`, `avatar`, `followers`, `url`, `platform: 'facebook'`.
- Khi profile không tồn tại hoặc bị chặn, trả về lỗi rõ ràng (không treo, không trả object rỗng không nhãn).
- Shape khớp với profile shape của các adapter khác (đối chiếu architecture Addendum A.4).

#### FR-2: Scrape posts

Người dùng có thể scrape posts gần đây của một profile/page với `limit` cấu hình được. Realizes UJ-2.

**Consequences (testable):**
- Mỗi post có: `id`, `text`, `timestamp`, `likes`, `comments`, `url`, `media {images, hasVideo}`, `platform: 'facebook'`.
- Hệ thống scroll để load thêm cho tới khi đạt `limit` hoặc hết nội dung; có giới hạn số lần retry khi không có post mới.
- Có delay 1-3s giữa các lần scroll (theo rule rate-limit của repo).

#### FR-3: Scrape followers

Người dùng có thể scrape followers của một profile/page khi Facebook cho phép.

**Consequences (testable):**
- Khi follower list công khai: trả về mảng profile rút gọn (`name`, `username`, `url`).
- Khi Facebook không lộ follower list: trả về object kèm `note` giải thích giới hạn và `platform: 'facebook'`, không ném lỗi.

**Out of Scope:**
- Lấy toàn bộ follower của trang lớn vượt giới hạn UI Facebook hiển thị.

#### FR-4: Search posts

Người dùng có thể search posts/nội dung Facebook theo query.

**Consequences (testable):**
- Trả về mảng kết quả với `id`, `text`, `author`, `timestamp`, `url`, `platform: 'facebook'`.
- Tôn trọng `limit`; có bounded retry khi không có kết quả mới.

#### FR-5: Đăng ký platform vào dispatcher

Facebook được đăng ký vào `platforms` registry để `scrape('facebook', action, options)` hoạt động qua dispatcher hiện có.

**Consequences (testable):**
- `scrape('facebook', 'profile', {...})` và alias `'fb'` đều dispatch đúng module.
- `getPlatform('facebook')` trả về module; platform không hợp lệ vẫn ném lỗi `Unknown platform` như cũ.
- `'facebook'`/`'fb'` nằm trong nhánh `needsPuppeteer` của hàm `scrape()`.

**Feature-specific NFRs:**
- Selector knowledge tập trung ở `docs/agents/selectors-facebook.md`; không hard-code selector rải rác trong feature files.

### 4.2 Facebook Automate

**Description:** Người dùng thực hiện thao tác ghi (post, like, comment) trên Facebook. Theo ADR-007, logic này tách khỏi adapter scrape, nằm ở Facebook automation service. **Dry-run là mặc định** cho mọi hàm ghi: lần chạy đầu chỉ preview hành động sẽ thực hiện, người dùng phải chủ động tắt dry-run để thực thi thật. Mọi action ghi log qua Operation và tuân thủ delay/batch giới hạn. Realizes UJ-3.

**Functional Requirements:**

#### FR-6: Like post (dry-run mặc định)

Người dùng có thể tự động like một hoặc nhiều post Facebook. Realizes UJ-3.

**Consequences (testable):**
- Tham số `dryRun` mặc định `true`; khi bật, hệ thống trả về danh sách post sẽ được like mà không gửi action lên Facebook.
- Khi `dryRun=false`, thực thi like với delay 1-3s giữa các action và bounded batch size.
- Mỗi lần chạy tạo một Operation record (type, status, progress, result) scope theo `userId`.

#### FR-7: Comment trên post (dry-run mặc định)

Người dùng có thể tự động comment nội dung cho trước lên post.

**Consequences (testable):**
- `dryRun` mặc định `true`; preview hiển thị post mục tiêu và nội dung comment sẽ đăng.
- Khi thực thi thật: delay giữa các comment, bounded batch, stop condition rõ ràng.
- Nội dung comment do người dùng cung cấp; hệ thống không tự sinh nếu không được yêu cầu.

#### FR-8: Tạo post

Người dùng có thể đăng một post text (kèm media nếu có) lên profile/page.

**Consequences (testable):**
- `dryRun` mặc định `true`; preview nội dung post sẽ đăng.
- Khi thực thi thật: trả về URL/ID post đã tạo trong result của Operation.
- Lỗi đăng (bị chặn, checkpoint) trả về thông báo rõ ràng, ghi vào Operation status.

#### FR-9: Cơ chế an toàn dùng chung

Mọi hàm automate chia sẻ guardrail: dry-run mặc định, delay, bounded batch, bounded retry, stop condition. Realizes UJ-3.

**Consequences (testable):**
- Không hàm ghi nào thực thi thật khi `dryRun` chưa bị tắt tường minh.
- Batch vượt ngưỡng cấu hình bị từ chối hoặc chia nhỏ; không có vòng lặp ghi không giới hạn.
- Cảnh báo account risk hiển thị trước batch ghi đầu tiên.

#### FR-10: Login bằng session cookie Facebook

Người dùng xác thực bằng cặp cookie `c_user` + `xs`.

**Consequences (testable):**
- `loginWithCookie(page, { c_user, xs })` nhận object (khác Twitter nhận string).
- Thiếu hoặc sai cookie: lỗi rõ ràng, không retry mù.
- Cookie không bao giờ xuất hiện trong log hay response (theo Security guardrail §10).

### 4.3 Surfaces Exposure

**Description:** Facebook lộ ra qua cả bốn surface hiện có của XActions, dùng lại pattern từng surface thay vì tạo chiến lược riêng. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-11: MCP tool/option Facebook

AI agent gọi được scrape và automate Facebook qua MCP với cùng schema các nền tảng khác. Realizes UJ-4.

**Consequences (testable):**
- MCP tool nhận `platform: "facebook"` (hoặc `"fb"`) cho các action đã hỗ trợ.
- Schema bổ sung là additive — không phá vỡ tool contract hiện có (theo rule MCP §5 architecture).
- Có contract test cho schema stability của tool Facebook.

#### FR-12: CLI `--platform facebook`

Người dùng chạy được lệnh scrape/automate Facebook qua CLI với cờ `--platform facebook`. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- `xactions scrape --platform facebook --profile <handle>` trả về normalized output qua exporter hiện có (JSON/CSV/...).
- Lệnh automate có cờ điều khiển dry-run, mặc định bật.
- Không nhân bản logic scraper trong command (theo rule CLI §5 architecture).

#### FR-13: REST API + Dashboard

Facebook truy cập được qua REST endpoint và hiển thị trên dashboard.

**Consequences (testable):**
- Route validate input và authorize theo `userId` ở boundary; business logic ở `api/services`.
- Thao tác ghi/nặng đứng sau rate limit hoặc job queue.
- Dashboard page gọi API theo response shape thống nhất; bảo mật dựa trên API-side authorization.

#### FR-14: Persistence qua Prisma

Job automation Facebook được lưu vào PostgreSQL qua Prisma; snapshot chỉ được thêm nếu story hoặc future phase yêu cầu retention rõ ràng.

**Consequences (testable):**
- Job ghi tạo Operation record với progress cập nhật được; emit Socket.IO cho job dài hiển thị trên dashboard.
- Mọi record scope theo `userId`; không đọc/ghi chéo user.
- Snapshot mới (nếu có) đi kèm retention/export policy trước khi bật mặc định (theo rule §6 architecture). `[ASSUMPTION: tái dùng model Operation hiện có; chỉ thêm cột/loại mới nếu query cần, không tạo bảng riêng cho Facebook ở MVP.]`

**Library export:** Node library lộ Facebook qua hàm `scrape()` thống nhất (FR-5) — không cần FR riêng vì đi qua cùng dispatcher.

## 5. Non-Goals (Explicit)

- Không xây Facebook Ads / Business / campaign automation trong v1.
- Không hỗ trợ Facebook Groups và Marketplace automation trong v1.
- Không dùng Facebook Graph API chính thức — cố ý đi browser automation (theo ADR-001).
- Không xây UI quản lý nhiều tài khoản Facebook riêng — tái dùng cơ chế multi-account hiện có nếu cần.
- Không tự sinh nội dung comment/post bằng AI ở MVP (nội dung do người dùng cung cấp).

## 6. MVP Scope

### 6.1 In Scope

- Facebook adapter: scrape profile, posts, followers (giới hạn), search (FR-1..FR-4).
- Đăng ký platform vào dispatcher (FR-5).
- Facebook automation service: like, comment, post — dry-run mặc định (FR-6..FR-9).
- Login bằng session cookie `c_user`+`xs` (FR-10).
- Lộ qua cả 4 surface: MCP, CLI, REST API + Dashboard, Library (FR-11..FR-13).
- Persistence Operation qua Prisma + Socket.IO cho job dài (FR-14).
- Tài liệu selector riêng `docs/agents/selectors-facebook.md`.

### 6.2 Out of Scope for MVP

- Lấy follower list đầy đủ vượt giới hạn UI Facebook — lý do: Facebook không lộ công khai.
- AI tự sinh nội dung post/comment — defer v2. `[NOTE FOR PM: nếu timeline cho phép, đây là điểm tích hợp tự nhiên với AI layer hiện có.]`
- Bảng Prisma riêng cho Facebook — defer cho tới khi query thực tế cần.
- Groups/Marketplace/Ads — defer v2+.

## 7. Cross-Cutting NFRs

- **Rate-limit safety:** Mọi vòng lặp action (scrape scroll + automate) có delay 1-3s, bounded retry, stop condition. Automate dùng batch nhỏ hơn scrape do account risk cao hơn.
- **Anti-detection:** Dùng puppeteer-extra-plugin-stealth như Threads/Twitter; delay rộng hơn cho Facebook.
- **Security:** Session cookie `c_user`/`xs` thuộc nhóm nhạy cảm — không log, không echo trong response. Mọi record scope theo `userId`.
- **Selector resilience:** Facebook không có `data-testid` sạch; ưu tiên anchor theo `role`/`aria-label`/text, bọc trong helper để cập nhật một chỗ. Đây là chi phí maintenance chính, không phải chi phí build ban đầu.
- **Consistency:** Output khớp normalized shape của các nền tảng khác; entrypoint chỉ orchestrate/validate/format, không nhân bản logic scraper (theo ADR-002).
- **Testability:** Unit test cho parser/normalizer ở tầng thấp nhất; smoke test gated bởi session/env availability; contract test khi public surface (MCP/API/CLI) đổi.

## 8. Success Metrics

**Primary**
- **SM-1**: Parity về scrape — Facebook adapter trả về normalized shape khớp các nền tảng khác cho profile/posts. Target: scrape profile + posts chạy được qua cả 4 surface với cùng schema. Validates FR-1, FR-2, FR-5, FR-11..FR-14.
- **SM-2**: An toàn automate — không có thao tác ghi nào thực thi thật khi dry-run chưa bị tắt tường minh. Target: 100% hàm ghi mặc định `dryRun=true`. Validates FR-6..FR-9.

**Secondary**
- **SM-3**: Tái dùng dispatcher hiện có — Facebook đi qua `scrape()` dispatcher, không thêm public API top-level mới cho scraping. Validates FR-5.

**Counter-metrics (do not optimize)**
- **SM-C1**: Không tối đa hóa throughput automate. Đẩy nhanh batch ghi để "chạy nhiều hơn" làm tăng account risk — cân bằng với SM-2. Giữ delay/batch bảo thủ kể cả khi chậm hơn.
- **SM-C2**: Không tối đa hóa độ phủ selector ngắn hạn. Hard-code nhiều selector để "scrape được nhiều field hơn" làm tăng nợ maintenance khi Facebook đổi DOM — ưu tiên ít selector bền vững hơn nhiều selector giòn.

## 9. Open Questions

*Phân loại theo phase blocker — story trong epic tương ứng phải resolve trước khi đóng.*

**Phase 1 (Scrape) blocker**
1. ~~Cách lấy cặp cookie `c_user`+`xs` sẽ được tài liệu hóa thế nào cho người dùng cuối (CLI/dashboard)?~~ ✅ **RESOLVED 2026-06-08:** `docs/agents/facebook-session-cookie.md`.
3. Follower scrape: field nào thực sự lấy được công khai từ UI Facebook hiện tại — cần verify khi dò selector. ⚠️ **PARTIAL 2026-06-08:** `docs/agents/selectors-facebook.md` đã có skeleton + verify checklist; phần follower visibility theo loại tài khoản (Page vs personal) đã document; selector cụ thể vẫn cần dev verify live ở Story 1.4.

**Phase 4 (Automate) blocker**
2. Ngưỡng batch size an toàn cho automate Facebook là bao nhiêu — cần thực nghiệm trên account thử nghiệm trước khi chốt default.

**Non-blocking (defer)**
4. Có cần proxy rotation cho Facebook ngay ở MVP không, hay dùng cấu hình proxy hiện có là đủ?
5. Retention policy cho Operation/snapshot Facebook nếu sau này thêm follower monitoring.

## 10. Assumptions Index

*Mọi `[ASSUMPTION]`/`[NOTE FOR PM]` trong tài liệu, gom lại để xác nhận:*

- **§4.4 FR-14** — Tái dùng model Operation hiện có cho Facebook; chỉ thêm cột/loại mới khi query cần, không tạo bảng Prisma riêng ở MVP.
- **§6.2** — AI tự sinh nội dung post/comment defer v2; là điểm tích hợp tự nhiên với AI layer nếu timeline cho phép.
- **Security guardrail** — Cặp cookie `c_user`/`xs` xử lý như session field nhạy cảm hiện có; cơ chế redaction tái dùng từ Twitter.

