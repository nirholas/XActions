#!/bin/bash
# Generate all XActions demo recordings
# Requires: vhs (https://github.com/charmbracelet/vhs)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🎬 Generating XActions demo recordings..."
echo ""

# Check for vhs
if ! command -v vhs &> /dev/null; then
    echo "❌ VHS not found. Install it first:"
    echo ""
    echo "   # macOS"
    echo "   brew install charmbracelet/tap/vhs"
    echo ""
    echo "   # Linux"
    echo "   go install github.com/charmbracelet/vhs@latest"
    echo ""
    exit 1
fi

# Check for ffmpeg (required by vhs)
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg not found. Install it first:"
    echo "   sudo apt install ffmpeg  # Linux"
    echo "   brew install ffmpeg      # macOS"
    exit 1
fi

# Generate each demo
TAPES=(
    "install.tape"
    "cli.tape"
    "unfollow-everyone.tape"
    "mcp-server.tape"
    "bookmarklet.tape"
)

for tape in "${TAPES[@]}"; do
    if [ -f "$tape" ]; then
        echo "📹 Generating: $tape"
        vhs "$tape"
        echo "   ✅ Done!"
        echo ""
    else
        echo "   ⚠️ Skipping $tape (not found)"
    fi
done

echo "🎉 All demos generated!"
echo ""
echo "Files created:"
ls -la *.gif *.webm 2>/dev/null || echo "   (no outputs yet)"
