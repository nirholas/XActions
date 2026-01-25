# XActions Demo Recordings

Animated terminal demos for documentation and README.

## 🎬 Available Demos

| Demo | Description | Output |
|------|-------------|--------|
| `unfollow-everyone.tape` | Mass unfollow script | GIF + WebM |
| `cli.tape` | CLI usage overview | GIF + WebM |
| `mcp-server.tape` | MCP server for AI agents | GIF + WebM |
| `bookmarklet.tape` | One-click bookmarklets | GIF + WebM |
| `install.tape` | Installation guide | GIF + WebM |

## 🛠️ Requirements

Install VHS (Charmbracelet):

```bash
# macOS
brew install charmbracelet/tap/vhs

# Linux (Ubuntu/Debian)
sudo apt install ffmpeg
go install github.com/charmbracelet/vhs@latest

# Or download from releases
# https://github.com/charmbracelet/vhs/releases
```

## 📹 Generate Demos

```bash
# Generate all demos
./generate-demos.sh

# Generate single demo
vhs unfollow-everyone.tape
```

## 🎨 Customization

Edit the `.tape` files to change:
- `Set Theme` - Color scheme (Catppuccin Mocha, Dracula, etc.)
- `Set FontSize` - Text size (14-20 recommended)
- `Set Width/Height` - Dimensions in pixels
- `Type@Nms` - Typing speed (lower = faster)

## 📁 Output

Generated files go to the same directory:
- `*.gif` - For GitHub README (larger file, universal support)
- `*.webm` - For web (smaller, better quality)

## 🔗 Usage in README

```markdown
<p align="center">
  <img src=".github/demos/install.gif" alt="Installation Demo" width="700">
</p>
```
