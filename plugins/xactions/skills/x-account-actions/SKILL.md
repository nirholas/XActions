---
name: x-account-actions
description: Authenticate XActions and run X/Twitter write actions (post, reply, like, follow, unfollow non-followers, DMs) safely through the approval gate, daily caps and dry runs. Use when the user asks to act on their own X account.
---

# Acting on an X account with XActions

Write tools change a real account, so this plugin starts the server with `--require-approval`. In that mode every write tool (`x_post_tweet`, `x_post_thread`, `x_reply`, `x_quote_tweet`, `x_like`, `x_retweet`, `x_follow`, `x_unfollow`, `x_unfollow_non_followers`, `x_send_dm`, `x_delete_tweet`, `x_bookmark`, `x_clear_bookmarks`, `x_update_profile`, and others) is saved as a draft and not executed. The agent cannot approve its own drafts: `x_approve_draft` is hidden and returns a message telling the user to run a terminal command.

## Authenticate (the user does this)

The server reads the X `auth_token` cookie from `XACTIONS_SESSION_COOKIE`, or from a saved session. Never ask the user to paste a cookie into chat and never write it into a file. Either have them export it in their own shell before starting Claude Code:

```
export XACTIONS_SESSION_COOKIE=<auth_token value>
```

or run `npx -y -p xactions xactions login` (options: `--cookies-file <path>`, `--from-browser [browser]`). `XACTIONS_ACCOUNT` names the active saved account.

## Workflow

1. Call `x_action_budget` first. It reports the cap, usage in the rolling 24 hours and remaining slots for post, reply, like, repost, follow, unfollow, dm, block, mute and delete. Caps persist across restarts; override with `XACTIONS_ACTION_CAPS` (JSON, for example `{"follow":600}`) or `~/.xactions/action-caps.json`.
2. Prefer previews. `x_unfollow_non_followers` takes `{ username, maxUnfollows, dryRun }`; call it with `dryRun: true` and show the user the list before any real run.
3. Call the write tool. In approval mode the result is `held: true` with a `draftId`. Show the user the tool and arguments, then tell them to review and run:

```
npx -y -p xactions xactions drafts list
npx -y -p xactions xactions drafts show <id>
npx -y -p xactions xactions drafts approve <id>
```

`xactions drafts discard <id>` drops one. The agent may inspect drafts with `x_list_drafts` and `x_draft_status`, or drop one with `x_discard_draft`.

## Examples of tool arguments

- `x_post_tweet` `{ text }` (max 280 characters).
- `x_follow` `{ username }`, `x_unfollow` `{ username }`.

## Rules

- Only act on the account the user owns, and only on what they asked for. No mass follow, like or reply campaigns on your own initiative.
- Automation can violate X's terms and get an account limited; say so before bulk actions.
- To narrow the tool surface, set `XACTIONS_MCP_TOOLS` (for example `read,analytics`) or `XACTIONS_MCP_EXCLUDE` to group names or tool names in your own shell.
