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

| Element | Selector / Approach | Ghi chú |
|---|---|---|
| Post container | `[role="article"]` | **Primary** — used in scrapeTweets |
| Post text | `[dir="auto"]` trong article → first non-trivial textContent | Prefer first element with length > 5 |
| Timestamp | `abbr[data-utime]` hoặc `time[datetime]` hoặc text fallback | Best-effort; FB hides timestamps in links |
| Post URL | `a[href*="/posts/"]`, `a[href*="/permalink/"]`, `a[href*="story_fbid"]` | First match wins |
| Likes count | Regex `/([\d,.]+[KkMm]?)\s*(like\|reaction)/i` on article.textContent | Best-effort; default "0" |
| Comments count | Regex `/([\d,.]+[KkMm]?)\s*comment/i` on article.textContent | Best-effort; default "0" |
| Media images | `img` trong article → filter static/emoji/non-http | Avatar images filtered by `static`/`emoji` keywords |
| Video presence | `video` element trong article | boolean hasVideo |

> **Approach used in `scrapeTweets`:** `[role="article"]` container, text from `[dir="auto"]`, regex-based engagement extraction from article text, scroll-based pagination with bounded retries. Still UNVERIFIED on a live authenticated session — selectors may differ when logged in vs. public view.

## Search (FR-4)

| Element | Selector / Approach | Ghi chú |
|---|---|---|
| Search URL | `${FACEBOOK_BASE}/search/posts?q=<encodeURIComponent(query)>` | Posts-specific search surface |
| Result container | `[role="article"]` | **Primary** — same as scrapeTweets (UNVERIFIED on live session) |
| Result text | First `[dir="auto"]` with length > 5 | UNVERIFIED — may grab author name instead of post body |
| Author | First `a[href]` in article that is NOT a post permalink/search link | Extracts vanity handle from href; UNVERIFIED |
| Timestamp | `abbr[data-utime]` or `time[datetime]` or text fallback | UNVERIFIED |
| Post URL (id) | `a[href*="/posts/"]`, `a[href*="/permalink/"]`, `a[href*="story_fbid"]` | Preferred for stable `id`; text fallback if absent |

> **Approach used in `searchTweets`:** Navigate to `/search/posts?q=...`, extract `[role="article"]` containers, author from first non-permalink profile link, text from first `[dir="auto"]`. All UNVERIFIED on live authenticated session. Search results may not render without login.

## Followers (FR-3) — ĐẶC BIỆT CẦN VERIFY

**Đây là blocker chính.** Trạng thái follower visibility trên Facebook (theo hiểu biết tới 2026, CẦN verify live):

| Loại tài khoản | Follower list công khai? | Ghi chú |
|---|---|---|
| **Page** (business/creator) | **Thường CÓ** phần nào | Tab "Followers"/"Likes" nếu page bật hiển thị. Đây là nguồn khả thi nhất. |
| **Personal profile** | **Thường KHÔNG** | FB ẩn friend/follower list cho hầu hết profile từ ~2020. Chỉ thấy "followed by X mutual" khi đã login & có liên hệ. |
| **Profile có "Followers" public** | Tùy setting user | Một số profile bật "Public" cho followers — hiếm. |

**Hệ quả thiết kế (đã phản ánh trong FR-3 và Story 1.4):** `scrapeFollowers` điều hướng đến `/<handle>/followers`, detect exposure bằng sự hiện diện của `[role="listitem"]` hoặc text "followers" trong body, rồi trả về:
- **Array** `[{ name, username, url, platform }]` nếu list hiển thị
- **Object** `{ note, username, platform }` nếu list bị ẩn — KHÔNG throw, KHÔNG trả mảng rỗng vô nghĩa

**Phương pháp detect (UNVERIFIED on live session):**
- Navigate to `facebook.com/<handle>/followers`
- Check `document.querySelectorAll('[role="listitem"]').length > 0` OR `/followers?/i` in body text
- If neither → restricted fallback

| Element | Selector / Approach | Ghi chú |
|---|---|---|
| Followers URL | `/${handle}/followers` | Page follower surface — UNVERIFIED |
| Follower row container | `[role="listitem"]` | UNVERIFIED — may differ on live session |
| Follower link | `a[href*="facebook.com"], a[href^="/"]` trong listitem | UNVERIFIED |
| Follower name | `span, strong` trong listitem | UNVERIFIED — pick first non-empty |
| Restricted detect | No `[role="listitem"]` AND no "followers" heading | Returns note object |

> **Open Question Q3 (PRD) — Resolution:** Based on Story 1.4 design, personal profiles return the `note` fallback. Pages with public followers are the only viable scrape target. Live verification required to confirm `[role="listitem"]` selector accuracy and whether `/followers` URL works for all Page types.

## Automate selectors (FR-6, FR-7, FR-8) — Epic 2

> ⚠️ Phần này dò sau, trong Epic 2. Dò trên **tài khoản phụ** vì thao tác ghi rủi ro khóa account cao (ADR-007).

| Element | Selector đề xuất (UNVERIFIED) | Ghi chú |
|---|---|---|
| Like button (not liked) | `[aria-label="Like"]` / `[aria-label="Thích"]` | aria-label đổi theo locale; Story 2.2 |
| Like button (already liked) | `[aria-label="Remove Like"]` / `[aria-label="Bỏ thích"]` | Detect already-liked state; Story 2.2 |
| Comment input (en) | `[aria-label*="Write a comment"]`, `[placeholder*="Write a comment"]` | Story 2.3; substring match for flexibility |
| Comment input (vi) | `[aria-label*="Viết bình luận"]`, `[placeholder*="Viết bình luận"]` | Story 2.3; Vietnamese locale |
| Comment submit | Enter key (`page.keyboard.press('Enter')`) | Story 2.3; most reliable method |
| Post submit | `[aria-label="Post"]` / `[aria-label="Đăng"]` | |

⚠️ **aria-label phụ thuộc locale.** Account đặt tiếng Việt sẽ có "Thích", "Bình luận", "Đăng". Helper phải hỗ trợ đa locale hoặc ép locale `en_US` khi login.
| Post composer (en) | `[aria-label*="What's on your mind"]`, `[role="textbox"][data-text*="What's on your mind"]` | Story 2.4; substring match |
| Post composer (vi) | `[aria-label*="Bạn đang nghĩ gì"]`, `[role="textbox"][data-text*="Bạn đang nghĩ gì"]` | Story 2.4; Vietnamese locale |
| Post submit (en) | `[aria-label="Post"]` | Story 2.4 |
| Post submit (vi) | `[aria-label="Đăng"]` | Story 2.4; Vietnamese locale |

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
