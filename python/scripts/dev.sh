#!/bin/bash
# XTools Development Scripts
# Usage: ./scripts/dev.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_help() {
    echo "XTools Development Scripts"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install     Install XTools and dependencies"
    echo "  lint        Run linter"
    echo "  format      Format code"
    echo "  test        Run tests"
    echo "  coverage    Run tests with coverage"
    echo "  build       Build package"
    echo "  check       Run all checks (lint + typecheck)"
    echo "  clean       Clean build artifacts"
    echo "  help        Show this help"
}

install() {
    echo -e "${GREEN}Installing XTools...${NC}"
    pip install -e ".[dev,ai]"
    playwright install chromium
    echo -e "${GREEN}Done!${NC}"
}

lint() {
    echo -e "${YELLOW}Running linter...${NC}"
    ruff check xtools/
    echo -e "${GREEN}Lint passed!${NC}"
}

format_code() {
    echo -e "${YELLOW}Formatting code...${NC}"
    black xtools/
    ruff check --fix xtools/
    echo -e "${GREEN}Formatted!${NC}"
}

run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    pytest xtools/tests/ -v
    echo -e "${GREEN}Tests passed!${NC}"
}

coverage() {
    echo -e "${YELLOW}Running tests with coverage...${NC}"
    pytest xtools/tests/ --cov=xtools --cov-report=html --cov-report=term
    echo -e "${GREEN}Coverage report: htmlcov/index.html${NC}"
}

build() {
    echo -e "${YELLOW}Building package...${NC}"
    rm -rf build/ dist/ *.egg-info/
    pip install build
    python -m build
    echo -e "${GREEN}Build complete! Check dist/${NC}"
}

check() {
    echo -e "${YELLOW}Running all checks...${NC}"
    ruff check xtools/
    mypy xtools/ --ignore-missing-imports || true
    echo -e "${GREEN}All checks complete!${NC}"
}

clean() {
    echo -e "${YELLOW}Cleaning...${NC}"
    rm -rf build/ dist/ *.egg-info/ .pytest_cache/ .ruff_cache/ .mypy_cache/ htmlcov/
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    echo -e "${GREEN}Cleaned!${NC}"
}

# Main
case "${1:-help}" in
    install) install ;;
    lint) lint ;;
    format) format_code ;;
    test) run_tests ;;
    coverage) coverage ;;
    build) build ;;
    check) check ;;
    clean) clean ;;
    help|*) print_help ;;
esac
