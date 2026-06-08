# Facebook Session Cookie (`c_user` + `xs`)

> Hướng dẫn cách lấy cặp cookie Facebook để dùng cho XActions Facebook adapter. Áp dụng cho CLI, MCP, REST API và Library.
> Verified June 2026 — Facebook auth cookies are stable; format không đổi từ ~2018.

## Tổng quan

XActions Facebook adapter dùng **cặp cookie session** thay cho username/password:

| Cookie | Vai trò | Format |
|---|---|---|
| `c_user` | User ID số của tài khoản | 15-17 chữ số, ví dụ `100012345678901` |
| `xs` | Session token | Chuỗi dài có `%3A` (URL-encoded `:`), ví dụ `12%3AabCdEf...` |

**Cả hai đều bắt buộc**. Thiếu một trong hai thì login không thành công, adapter sẽ trả lỗi rõ ràng (không retry mù — theo FR-10).

⚠️ **Cookie là bí mật cấp tài khoản.** Bất kỳ ai có cặp `c_user` + `xs` đều đăng nhập được như bạn. Đọc phần [Security](#security) trước khi dùng.

## Bước 1 — Đăng nhập Facebook trên trình duyệt

1. Mở [https://www.facebook.com](https://www.facebook.com).
2. Đăng nhập tài khoản bạn muốn dùng cho automation.
   - **Khuyến nghị mạnh:** Tạo tài khoản phụ (test account) cho automation thay vì dùng tài khoản chính. Lý do: rủi ro checkpoint/khóa khi dò selector cho phần Automate (xem ADR-007 trong architecture).
3. Hoàn tất 2FA nếu được yêu cầu — sau khi vào Home feed là OK.

## Bước 2 — Trích xuất cookie từ DevTools

1. Mở DevTools (`F12` hoặc `Cmd+Opt+I` trên macOS).
2. Sang tab **Application** (Chrome/Edge) hoặc **Storage** (Firefox).
3. Trong sidebar trái: **Cookies → `https://www.facebook.com`**.
4. Tìm 2 dòng:
   - `c_user` — copy giá trị (chỉ chữ số).
   - `xs` — copy giá trị (chuỗi dài, có ký tự `%`).
5. Lưu vào nơi an toàn (password manager, .env file, key vault). **Không** paste vào chat, ticket, screenshot công khai.

### Cách lấy nhanh qua DevTools Console

Nếu bạn quen Console, mở `https://www.facebook.com` rồi chạy:

```js
document.cookie
  .split('; ')
  .filter(c => c.startsWith('c_user=') || c.startsWith('xs='))
  .join('\n')
```

⚠️ **Lưu ý:** `xs` có flag `HttpOnly: true`, **không đọc được** từ `document.cookie` qua JavaScript — đây là biện pháp bảo vệ của Facebook. Bạn **bắt buộc** phải dùng DevTools UI ở Bước 2 cho `xs`. Console chỉ lấy được `c_user`.

## Bước 3 — Cấu hình cho từng surface

### CLI

Lệnh login tương tác (sẽ thêm trong Story 3.1 của Epic 3):

```bash
xactions login --platform facebook
# Nhập c_user khi được hỏi
# Nhập xs khi được hỏi
# Lưu vào ~/.xactions/config.json (chmod 600)
```

Hoặc set env trực tiếp:

```bash
export XACTIONS_FB_C_USER="100012345678901"
export XACTIONS_FB_XS="12%3AabCdEf..."
xactions scrape --platform facebook --profile zuck
```

### MCP server

Trong cấu hình MCP của Claude Desktop / agent (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "xactions": {
      "command": "node",
      "args": ["/path/to/xactions/src/mcp/server.js"],
      "env": {
        "XACTIONS_FB_C_USER": "100012345678901",
        "XACTIONS_FB_XS": "12%3AabCdEf..."
      }
    }
  }
}
```

### Node.js Library

```js
import { scrape } from 'xactions/scrapers';

const profile = await scrape('facebook', 'profile', {
  username: 'zuck',
  authCookie: {
    c_user: process.env.XACTIONS_FB_C_USER,
    xs: process.env.XACTIONS_FB_XS,
  },
});
```

`loginWithCookie(page, { c_user, xs })` nhận **object** (khác Twitter — Twitter nhận string `auth_token` đơn). Đây là contract bắt buộc theo FR-10.

### REST API + Dashboard

Cookie được lưu vào DB qua user profile (encrypted at rest), giống Twitter `sessionCookie` field hiện có. Dashboard không hiển thị giá trị cookie sau khi lưu (chỉ status: connected/disconnected).

`POST /api/auth/facebook/connect` body:

```json
{
  "c_user": "100012345678901",
  "xs": "12%3AabCdEf..."
}
```

## Vòng đời cookie — khi nào hết hạn

`xs` thường sống vài tháng nếu bạn không log out. Nó sẽ bị **invalidate ngay** khi:

- Đổi mật khẩu Facebook.
- Bấm "Log out of all sessions" trong Settings → Security.
- Facebook detect hoạt động bất thường → checkpoint (có thể yêu cầu xác minh ảnh, OTP).
- Bạn log out từ **bất kỳ thiết bị nào** dùng cùng session — Facebook share session token.
- Một số trường hợp đổi địa lý/IP đột ngột.

**Khi cookie hết hạn:** XActions sẽ trả lỗi rõ ràng (FR-10 yêu cầu) — bạn cần lặp lại Bước 1-3 để lấy cookie mới. Không có cơ chế tự refresh.

## Security

XActions tuân thủ Security Architecture §7 và NFR3:

- **Không log:** Cookie không bao giờ xuất hiện trong console output, log file, error message, response API. Có redaction ở mọi entrypoint (theo FR-10).
- **Không echo trong response:** API response không bao giờ trả về giá trị cookie, kể cả cho user sở hữu.
- **Scope theo userId:** Mọi record liên quan Facebook (Operation, snapshot) scope theo `userId`; không có cross-user read/write.
- **At rest:** Cookie lưu trong Prisma `User.sessionCookie` field tái dùng với Twitter; mã hóa tùy stack deploy (xem `docs/deployment.md`).

Bạn nên:

- Dùng tài khoản phụ cho automation, đặc biệt khi dò selector phần Automate (Epic 2).
- Rotate cookie định kỳ (3-6 tháng) hoặc khi có sự kiện security.
- Không commit cookie vào git, không paste vào ticket/chat công khai.
- Bật 2FA cho tài khoản Facebook để giảm rủi ro nếu cookie rò rỉ — checkpoint sẽ trigger trước khi attacker hành động được.

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `Unauthorized` ngay sau login | `xs` decode sai (mất ký tự `%`) | Copy lại nguyên gốc từ DevTools, **không** URL-decode |
| Login OK nhưng scrape rỗng | Profile bị block / cần login với account follow | Verify bằng cách mở incognito + paste cookie thủ công |
| Đột ngột hết hạn sau vài giờ | Checkpoint Facebook trigger | Login lại trên trình duyệt → giải checkpoint → lấy cookie mới |
| `c_user` chỉ có 5-7 chữ số | Đó không phải `c_user` — có thể là cookie khác | `c_user` luôn 15-17 chữ số |

## Tham chiếu chéo

- Architecture: `_bmad-output/planning-artifacts/architecture.md` Addendum A.3 (wiring), A.5 (ADR-006/007), A.6 (risks).
- PRD: `_bmad-output/planning-artifacts/prds/prd-XActions-2026-06-08/prd.md` §3 Glossary, FR-10, NFR3.
- Story implement: Epic 1 Story 1.1 (`epics.md`).
- Selector docs: `docs/agents/selectors-facebook.md`.
