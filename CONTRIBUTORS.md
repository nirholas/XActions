# Contributors

XActions is built by [nich](https://github.com/nirholas) with help from the people below.
A precise bug report is a contribution: most of the fixes listed here started as
someone else's reproduction. Thank you all.

How credit is given is described in [CONTRIBUTING.md](CONTRIBUTING.md#credit).
If you should be on this list and are not, open an issue and say so.

## Code

| Contributor | Contribution |
|---|---|
| [@mayconfrr](https://github.com/mayconfrr) | Found that `TweetResultByRestId` returns an Article's full body only with the `withArticlePlainText` field toggle set, and wrote the pure-HTTP Article reader behind `scrapeArticle` and `xactions article` ([#45](https://github.com/nirholas/XActions/pull/45)). |
| [@MurlocYat](https://github.com/MurlocYat) | Diagnosed why `x_post_tweet` stopped posting (the `/compose/post` redirect and the contenteditable editor) and fixed it by opening the composer from the sidebar and typing through the keyboard ([#25](https://github.com/nirholas/XActions/pull/25)). |
| [@devlewicki](https://github.com/devlewicki) | Signed every HTTP request lane with `x-client-transaction-id` over HTTP/2, followed `screen_name` and `name` when X moved them from `legacy` to `core`, and made the browser scrapers wait for content instead of a `networkidle2` that never settles ([#100](https://github.com/nirholas/XActions/pull/100)). |
| [@deptrai](https://github.com/deptrai) | Made `xactions schedule` and the `x_schedule_*` MCP tools persist their jobs, revived every GraphQL write in `src/client/api/tweets.js`, and made the MCP browser pick up a fresh login ([#153](https://github.com/nirholas/XActions/pull/153)). |
| [@RandyLu87](https://github.com/RandyLu87) | Authenticated the MCP server's shared browser and fixed five tools that returned empty results with no error ([#65](https://github.com/nirholas/XActions/pull/65), fixing [#27](https://github.com/nirholas/XActions/issues/27)); read trends and engagement counts by structure instead of position. |
| [@ni3a](https://github.com/ni3a) | Sent `SearchTimeline` and `Followers` as POST, the transport X switched them to, which brought `xactions search` and `followers` back ([#42](https://github.com/nirholas/XActions/issues/42)). |
| [@nelsongallardo](https://github.com/nelsongallardo) | The home timeline MCP tool and the missing `getPage` path the browser tools needed ([#29](https://github.com/nirholas/XActions/pull/29), landed as [#68](https://github.com/nirholas/XActions/pull/68)). |
| [@swarmsyy](https://github.com/swarmsyy) | The `glama.json` manifest that listed XActions in the Glama MCP registry. |
| [@tahajalili](https://github.com/tahajalili) | `UnfollowWDFBLog`, the unfollow script that keeps a log of who it unfollowed ([#1](https://github.com/nirholas/XActions/pull/1)). The first outside contribution. |

## Bug reports and findings

| Contributor | Report |
|---|---|
| [@cmdenney](https://github.com/cmdenney) | Flagged that Blocknative's API was shutting down while the docs still taught it ([#30](https://github.com/nirholas/XActions/issues/30)). |
| [@n4s3r](https://github.com/n4s3r) | `xactions followers` failed with a bare `HTTP 404:` because the client still sent `Followers` and `SearchTimeline` as GET, and the browser script stopped at about 27 followers ([#99](https://github.com/nirholas/XActions/issues/99)). |
| [@mayconfrr](https://github.com/mayconfrr) | Found that cookie login failed because `verify_credentials` answered 404 on every call, and that GraphQL responses needed unwrapping from their `data` envelope ([#44](https://github.com/nirholas/XActions/pull/44)). Both are fixed on main. |
| [@W4ilops](https://github.com/W4ilops) | Found and fixed the `await` in a non-async SIGINT handler that crashed the CLI at load ([#26](https://github.com/nirholas/XActions/pull/26)), three months before it was reported as #35. |
| [@G-Glitch404](https://github.com/G-Glitch404) | Browser scrapers crashed with `puppeteer.use is not a function` in 4.0.1, with the root cause pinned to the namespace-vs-default import ([#87](https://github.com/nirholas/XActions/issues/87)). |
| [@azeezalhajj570-ai](https://github.com/azeezalhajj570-ai) | Group DM participants came back as array indexes ([#84](https://github.com/nirholas/XActions/issues/84)); no endpoint listed a connected account's group DMs, and nothing processed the conversations job ([#85](https://github.com/nirholas/XActions/issues/85)). The second led to finding that 221 queued job types had no processor at all. |
| [@stone-w4tch3r](https://github.com/stone-w4tch3r) | Search and followers failed with HTTP 404 because X now requires POST for those queries ([#42](https://github.com/nirholas/XActions/issues/42)). |
| [@avner-assistant](https://github.com/avner-assistant) | The MCP browser never logged in, so search and analysis tools returned nothing ([#27](https://github.com/nirholas/XActions/issues/27)). |
| [@SarthakB11](https://github.com/SarthakB11) | The CLI crashed at load on an `await` in a non-async SIGINT handler ([#35](https://github.com/nirholas/XActions/issues/35)). |
| [@shimautao](https://github.com/shimautao) | `npm install` failed with ETARGET on unpublished dependency versions ([#36](https://github.com/nirholas/XActions/issues/36)). |
| [@dotyigit](https://github.com/dotyigit) | The npm package shipped without `search.js` and crashed on start ([#9](https://github.com/nirholas/XActions/issues/9)). |
| [@mxl](https://github.com/mxl) | `npx xactions-mcp` failed on a missing `parsers.js` ([#11](https://github.com/nirholas/XActions/issues/11)). |
| [@reteps](https://github.com/reteps) | Diagnosed and fixed that packaging failure ([#15](https://github.com/nirholas/XActions/pull/15)). |
| [@xingyu42](https://github.com/xingyu42) | `xactions-mcp` was missing from npm ([#8](https://github.com/nirholas/XActions/issues/8)). |
| [@allani-ca](https://github.com/allani-ca) | `xactions profile` did not return the website ([#6](https://github.com/nirholas/XActions/issues/6)). |
| [@nj-io](https://github.com/nj-io) | Found that the browser tools had no `getPage` in the tool map ([#22](https://github.com/nirholas/XActions/pull/22)), and investigated liked posts and threads live against x.com ([#23](https://github.com/nirholas/XActions/pull/23), [#24](https://github.com/nirholas/XActions/pull/24)). |
| [@blackbuuurn](https://github.com/blackbuuurn) | Thread scraping returned empty results ([#12](https://github.com/nirholas/XActions/pull/12)). |
| [@chasays](https://github.com/chasays) | Bio extraction depended on one fragile selector ([#5](https://github.com/nirholas/XActions/pull/5)), which led to a shared extractor for every script that reads a bio. |
