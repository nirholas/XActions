# 18: run the CLI and the MCP server from Docker with no Node install

Read `prompts/dx/00-README.md` first. Wave 1. Prompt 22 builds on this.

## Goal

`docker run ghcr.io/nirholas/xactions profile nasa` works, and an MCP client can be
pointed at the same image, on a machine with no Node.

## Why

The published image is the API server: its `CMD` is `start.sh`, which runs Prisma
migrations and starts Express on port 3001 (`grep -n "CMD\|EXPOSE" Dockerfile`). Using
the CLI or the MCP server from it means overriding the command and carrying a database
stack the user does not need. The project requires Node `>=22.19`, which many machines
do not have.

## Do

1. **A second, slim image.** `deploy/docker/cli.Dockerfile` (or a `cli` target in the
   root `Dockerfile` if that keeps one file honest): multi-stage, production
   dependencies of the root package only, no `api/` workspace, no Prisma, non-root user,
   `ENTRYPOINT ["xactions"]`. The MCP server is reachable as
   `docker run -i <image> mcp` or through a documented `--entrypoint xactions-mcp`.
2. **Two variants:** default without a browser (HTTP reads, the guest tier, MCP), and
   `-browser` with Chromium and its libraries for the Puppeteer paths. Report both
   sizes.
3. **State lives in a volume.** `XACTIONS_HOME=/data`, documented as
   `-v xactions:/data`, so a login, the query-ID cache, checkpoints and the action
   ledger survive. Verify the non-root user can write it on first run.
4. **Login without a browser on the host:** document `xactions login --cookies-file`
   with a mounted file, and the environment variable `XACTIONS_SESSION_COOKIE`.
5. **MCP config for Docker:** `xactions mcp-config --docker` prints a client config that
   runs the image with `-i --rm` and the volume. Streamable HTTP mode works with
   `-p 3000:3000` and `XACTIONS_MCP_TOKEN`.
6. **Publish in CI:** extend `.github/workflows/docker-publish.yml` to build and push
   both variants for `linux/amd64` and `linux/arm64`, tagged with the version and
   `latest`, separate from the existing API image's tags. Keep the API image as it is.
7. **Smoke test in CI:** build the image, run `xactions --version`,
   `xactions profile nasa --compact` against the live guest tier, and an MCP
   `initialize` plus `tools/list` over stdio.

## Do not

- Do not change the existing API image, `start.sh` or `docker-compose.yml`.
- Do not push an image yourself.
- Do not bake a cookie or any secret into a layer.

## Done when

- Both variants build locally and the three smoke commands pass; show the output and
  the image sizes.
- README's Docker section and `docs/getting-started.md` lead with the one-line CLI
  form; `docs/mcp-setup.md` has the Docker config.
