# XTools Development Makefile
# Run common development tasks locally

.PHONY: help install dev lint format test build clean publish

# Default target
help:
	@echo "XTools Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install     Install XTools"
	@echo "  make dev         Install with dev dependencies"
	@echo "  make browser     Install Playwright browser"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint        Run linter (ruff)"
	@echo "  make format      Format code (black)"
	@echo "  make typecheck   Run type checker (mypy)"
	@echo "  make check       Run all checks"
	@echo ""
	@echo "Testing:"
	@echo "  make test        Run tests"
	@echo "  make coverage    Run tests with coverage"
	@echo ""
	@echo "Build:"
	@echo "  make build       Build package"
	@echo "  make publish     Publish to PyPI"
	@echo "  make clean       Clean build artifacts"
	@echo ""
	@echo "Docs:"
	@echo "  make docs        Serve docs locally"
	@echo "  make docs-build  Build docs"

# Installation
install:
	pip install .

dev:
	pip install -e ".[dev,ai]"
	playwright install chromium

browser:
	playwright install chromium
	playwright install-deps chromium

# Code Quality
lint:
	ruff check xtools/

format:
	black xtools/
	ruff check --fix xtools/

typecheck:
	mypy xtools/ --ignore-missing-imports

check: lint typecheck
	@echo "All checks passed!"

# Testing
test:
	pytest xtools/tests/ -v

coverage:
	pytest xtools/tests/ --cov=xtools --cov-report=html --cov-report=term
	@echo "Coverage report: htmlcov/index.html"

# Build
build: clean
	pip install build
	python -m build
	@echo "Build complete! Check dist/"

clean:
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf xtools/*.egg-info/
	rm -rf .pytest_cache/
	rm -rf .ruff_cache/
	rm -rf .mypy_cache/
	rm -rf htmlcov/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned!"

publish: build
	pip install twine
	twine check dist/*
	@echo ""
	@echo "Ready to publish! Run:"
	@echo "  twine upload dist/*"

# Documentation
docs:
	mkdocs serve

docs-build:
	mkdocs build
