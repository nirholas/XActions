#!/usr/bin/env bash
# Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
#
# Printed each time an editor attaches to the dev container. Three lines, so it
# gets read.
#
# @author nich (@nichxbt)

cat <<'EOF'
xactions quickstart   three commands that work with no X account
npm test              run the test suite
AGENTS.md             how this repository works, at the workspace root
EOF
