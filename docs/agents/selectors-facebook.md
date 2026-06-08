# Facebook DOM Selectors Reference

> ⚠️ **STATUS: UNVERIFIED — skeleton + verify checklist.**
> Các selector dưới đây là **điểm khởi đầu dựa trên cấu trúc DOM Facebook đã biết**, CHƯA được verify live trên session thật.
> Facebook obfuscate class names (randomized, ví dụ `x1i10hfl`) và đổi DOM thường xuyên — **không** dựa vào class. Ưu tiên `role`, `aria-label`, text anchor.
> Dev phải chạy [Verify Checklist](#verify-checklist) trên account thật trước khi tin bất kỳ selector nào.

## Nguyên tắc chọn selector cho Facebook (NFR4)

Facebook KHÔNG có `data-testid` sạch như Twitter. Thứ tự ưu tiên:

1. **`role` + `aria-label`** — bền nhất. Ví dụ `[role="article"]`, `[aria-label="Like"]`.
2. **Text anchor** — tìm element theo text content (ví dụ nút có text "Followers").
3. **Structural** — quan hệ cha-con ổn định (ví dụ `[role="main"] [role="article"]`).
4. **Class name** — TUYỆT ĐỐI tránh. Class Facebook randomized, đổi mỗi deploy.

Mọi selector phải bọc trong helper một chỗ để khi Facebook đổi DOM chỉ sửa một nơi.

## Profile (FR-1)

| Element | Selector / Approach | Ghi chú |
|---|---|---|
| Profile name | `meta[property="og:title"]` → strip ` \| Facebook` suffix | **Primary** — stable, meta-first |
| Bio/intro | `meta[property="og:description"]` → strip leading follower count | Fallback: DOM text |
| Avatar | `meta[property="og:image"]` | CDN URL, stable |
| Follower count | Regex `/([\d,.]+[KkMm]?)\s*followers?/i` from `og:description` or `document.body.innerText` | Best-effort, `null` if absent |
| Meta fallback | `meta[property="og:title"]`, `og:description`, `og:image` | **Ổn định nhất** — ưu tiên hơn DOM |
| Blocked/missing detect | `og:title` absent or equals `"Facebook"` → throw error | Avoids returning empty objects |

> **Approach used in `scrapeProfile`:** meta-first (`og:` tags via `page.evaluate`), DOM body text fallback for follower count. Still UNVERIFIED on a live authenticated session — DOM selectors may differ when logged in vs. public view.

## Posts (FR-2)

| Element | Selector đề xuất (UNVERIFIED) | Ghi chú |
|---|---|---|
| Post container | `[role="article"]` | FB dùng `role="article"` cho feed post |
| Post text | `[data-ad-comet-preview="message"]` hoặc `[dir="auto"]` trong article | Cần verify attribute còn tồn tại |
| Timestamp | `a[role="link"]` chứa text thời gian / `abbr` | FB ẩn timestamp trong link |
| Likes count | text anchor gần icon like | Parse số |
| Comments count | text anchor "comment"/"bình luận" | Parse số |
| Media images | `img` trong article (loại avatar) | Filter theo src pattern |
| Video presence | `video` element trong article | boolean hasVideo |

## Search (FR-4)

| Element | Selector đề xuất (UNVERIFIED) | Ghi chú |
|---|---|---|
| Result container | `[role="article"]` trong search results | URL: `facebook.com/search/posts?q=...` |
| Result author | `a[role="link"]` đầu tiên trong article | |
| Result text | `[dir="auto"]` trong article | |

## Followers (FR-3) — ĐẶC BIỆT CẦN VERIFY

**Đây là blocker chính.** Trạng thái follower visibility trên Facebook (theo hiểu biết tới 2026, CẦN verify live):

| Loại tài khoản | Follower list công khai? | Ghi chú |
|---|---|---|
| **Page** (business/creator) | **Thường CÓ** phần nào | Tab "Followers"/"Likes" nếu page bật hiển thị. Đây là nguồn khả thi nhất. |
| **Personal profile** | **Thường KHÔNG** | FB ẩn friend/follower list cho hầu hết profile từ ~2020. Chỉ thấy "followed by X mutual" khi đã login & có liên hệ. |
| **Profile có "Followers" public** | Tùy setting user | Một số profile bật "Public" cho followers — hiếm. |

**Hệ quả thiết kế (đã phản ánh trong FR-3):** Adapter PHẢI xử lý case "không lộ list" bằng cách trả object có `note` thay vì lỗi cứng. Không giả định luôn lấy được list.

| Element | Selector đề xuất (UNVERIFIED) | Ghi chú |
|---|---|---|
| Followers tab (Page) | text anchor "Followers"/"Người theo dõi" | Chỉ có ở Page |
| Follower cell | `[role="listitem"]` hoặc `a[role="link"]` trong followers dialog | Cần verify |
| "Followed by" widget | text anchor "Followed by" | Chỉ subset nhỏ |

## Automate selectors (FR-6, FR-7, FR-8) — Epic 2

> ⚠️ Phần này dò sau, trong Epic 2. Dò trên **tài khoản phụ** vì thao tác ghi rủi ro khóa account cao (ADR-007).

| Element | Selector đề xuất (UNVERIFIED) | Ghi chú |
|---|---|---|
| Like button | `[aria-label="Like"]` / `[aria-label="Thích"]` | aria-label đổi theo locale |
| Comment box | `[aria-label="Write a comment"]` / `[role="textbox"]` | |
| Comment submit | Enter key hoặc `[aria-label="Comment"]` | FB thường submit bằng Enter |
| Post composer | `[role="button"]` text "What's on your mind" | |
| Post submit | `[aria-label="Post"]` / `[aria-label="Đăng"]` | |

⚠️ **aria-label phụ thuộc locale.** Account đặt tiếng Việt sẽ có "Thích", "Bình luận", "Đăng". Helper phải hỗ trợ đa locale hoặc ép locale `en_US` khi login.

## Verify Checklist

Dev chạy trên account thật (ưu tiên account phụ), đánh dấu khi verify:

### Scrape (Epic 1)
- [ ] **Profile**: mở 1 public page + 1 personal profile, xác nhận selector lấy được `name`, `followers`, `bio`, `avatar`. Ghi lại selector thực tế hoạt động.
- [ ] **Profile meta fallback**: xác nhận `og:title`/`og:description` parse được name + follower count.
- [ ] **Posts**: scroll 1 page, xác nhận `[role="article"]` bắt được post; verify lấy được text/timestamp/likes/comments/media.
- [ ] **Posts pagination**: xác nhận scroll load thêm post + bounded retry hoạt động.
- [ ] **Followers — Page**: mở 1 Page có tab Followers, xác nhận lấy được list. Ghi selector.
- [ ] **Followers — Personal**: mở 1 personal profile, xác nhận KHÔNG lấy được → adapter trả `note` đúng (không crash).
- [ ] **Search**: chạy `facebook.com/search/posts?q=<query>`, xác nhận bắt được results + author.

### Cập nhật sau verify
- [ ] Thay mọi selector "UNVERIFIED" bằng selector thật đã test.
- [ ] Đổi header status thành `VERIFIED <tháng/năm>`.
- [ ] Ghi lại field follower nào THỰC SỰ lấy được (resolves Open Question Q3 trong PRD).
- [ ] Note locale nào đã test (vì aria-label đổi theo ngôn ngữ).

## Tham chiếu chéo

- Pattern tham khảo: `src/scrapers/threads/index.js` (Meta product, cùng cách parse meta tags).
- Cookie: `docs/agents/facebook-session-cookie.md`.
- Architecture: Addendum A.6 (selector obfuscation risk).
- PRD: FR-1..FR-4, NFR4, Open Question Q3.
