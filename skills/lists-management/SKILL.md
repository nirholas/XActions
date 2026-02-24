```skill
---
name: lists-management
description: Create and manage X/Twitter Lists including public/private lists, follow/pin lists, custom feeds, member management, and list-based automation.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Lists Management with XActions

Create, manage, and automate X/Twitter Lists.

## Features

- **Create Lists**: Public or private user groups
- **Follow Lists**: Subscribe to others' lists
- **Pin Lists**: Pin lists to home timeline
- **Member Management**: Add/remove users from lists
- **Custom Feeds**: Use lists as filtered timelines
- **List Discovery**: Find popular/recommended lists
- **Export**: Export list members and content

## Browser Console Script

**File:** `scripts/manageLists.js`

### How to use

1. Navigate to `x.com/i/lists`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Key selectors

| Element | Selector |
|---------|----------|
| Lists nav | `a[href*="/lists"]` |
| Create list | `[data-testid="createList"]` |
| List name | `[data-testid="listName"]` |
| List description | `[data-testid="listDescription"]` |
| Add member | `[data-testid="addMember"]` |
| Pin list | `[data-testid="pinList"]` |
| List members | `[data-testid="UserCell"]` |

## MCP Tools

- `x_create_list` – Create a new list
- `x_delete_list` – Delete a list
- `x_add_to_list` – Add user to list
- `x_remove_from_list` – Remove user from list
- `x_get_lists` – Get user's lists
- `x_get_list_members` – Get members of a list
- `x_get_list_feed` – Get timeline from a list
- `x_pin_list` – Pin/unpin a list

## API Endpoints

- `GET /api/lists` – Get user's lists
- `POST /api/lists` – Create list
- `DELETE /api/lists/:id` – Delete list
- `POST /api/lists/:id/members` – Add member
- `DELETE /api/lists/:id/members/:userId` – Remove member
- `GET /api/lists/:id/feed` – List timeline
- `GET /api/lists/:id/members` – List members
- `POST /api/lists/:id/pin` – Pin list

## Related Files

- `src/listManager.js` – Core list management module
- `scripts/manageLists.js` – Browser list script
- `scripts/scrapeList.js` – List member scraping

## Notes

- Lists can be public (visible to all) or private (only you)
- Up to 1000 lists per account
- Up to 5000 members per list
- Pinned lists appear as tabs on home timeline
- Users are notified when added to public lists (not private)
```
