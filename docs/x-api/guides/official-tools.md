# Official tools

X publishes its own SDKs, a command-line client, hosted MCP servers and machine-readable documentation. This guide lists them and says where each fits next to XActions.

Official pages: https://docs.x.com/tools-and-libraries, https://docs.x.com/tools/mcp, https://docs.x.com/tools/xurl and https://docs.x.com/tools/llms-txt

## OpenAPI document

The API definition is published at https://api.x.com/2/openapi.json. It is the best source for endpoint paths, parameters, enums and schemas, and the XActions v2 client is generated from it. Pin the version you generate from, since the spec changes often.

## Official SDKs (XDKs)

Client libraries generated from the same OpenAPI document, with authentication, pagination and streaming built in:

- Python: `pip install xdk`, Python 3.8 or later.
- TypeScript: `npm install @xdevplatform/xdk`, Node.js 18 or later.
- Java: `com.x:xdk`, Java 17 or later.
- C#: `dotnet add package XDevPlatform.Xdk`, .NET 8 or later.

Use them when your project is in one of those languages and you want a maintained client with no extra layer. XActions ships its own client for JavaScript projects that already use XActions for browser-based work, so one dependency covers both paths.

## xurl

xurl is a curl-style command-line tool. It runs the OAuth 2.0 login for you, stores tokens locally under `~/.xurl`, and signs requests. Examples: `xurl /2/users/by/username/example`, `xurl -X POST /2/tweets -d '{"text":"hi"}'`.

Setup needs an app with OAuth 2.0 enabled, the redirect `http://localhost:8080/callback` registered, and `CLIENT_ID` and `CLIENT_SECRET` exported. Run `xurl auth oauth2` once.

It suits manual testing and quick scripts. It also has an `xurl mcp` mode that acts as a local bridge for MCP clients. Source: https://github.com/xdevplatform/xurl.

## Hosted MCP servers

Two servers are hosted by X.

X MCP at `https://api.x.com/mcp` exposes API operations as tools: posts, search, users, bookmarks, trends, news and drafting articles. It uses Streamable HTTP with standard OAuth discovery. There is no dynamic client registration, so create your own OAuth 2.0 app in the console and give its client id to the MCP client. Three connection routes exist: native OAuth 2.0 with PKCE, an app-only bearer token for read-only use, or the local `xurl mcp` bridge for clients that cannot do native OAuth. Calls act with your account's permissions and bill like normal API calls.

Docs MCP at `https://docs.x.com/mcp` lets an assistant search and read the documentation. It needs no API key.

## Machine-readable documentation

- `https://docs.x.com/llms.txt`: an index of pages. Section indexes exist for the X API, enterprise APIs, ads and each SDK.
- `https://docs.x.com/llms-full.txt`: the whole documentation in one file.
- Any docs page with `.md` added to its URL returns plain Markdown.
- `https://docs.x.com/skill.md` and the discovery files under `/.well-known/agent-skills/`: a capability summary for agents following the agentskills.io format.
- `https://docs.x.com/AGENTS.md`: usage guidance for agents.

Load the index or the Docs MCP into your coding assistant before generating X API code. It prevents guessing at parameter names.

## Where XActions fits

- Official API access, reliable and billed per use: use the official SDKs, the XActions v2 client, or xurl for ad hoc calls. Pick by language and by how much you want in one dependency.
- Browser automation for features or data the API does not offer, or where cost matters: XActions' scrapers and automations.
- AI assistants: XActions' MCP server drives browser workflows and, with your own keys, the official API through its `x_api_*` tools. The hosted X MCP also covers API-backed operations. They can run side by side in one assistant. Keep the credentials separate.
- Documentation and code generation: feed the Docs MCP or `llms.txt` to the assistant, and the OpenAPI document to the generator.

XActions has no special relationship with X. None of these tools is bundled or endorsed here.

The official docs at docs.x.com are authoritative, and XActions is not affiliated with X Corp.
