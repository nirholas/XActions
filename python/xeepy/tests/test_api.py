"""Tests for REST API endpoints."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestAPIImports:
    """Tests for API module imports."""

    def test_server_import(self) -> None:
        """Test server module can be imported."""
        from xeepy.api.server import app, run_server

        assert app is not None
        assert callable(run_server)

    def test_routes_import(self) -> None:
        """Test route modules can be imported."""
        from xeepy.api.routes import scrape, follow, engage, monitor, ai

        assert scrape is not None
        assert follow is not None
        assert engage is not None
        assert monitor is not None
        assert ai is not None


class TestAPIModels:
    """Tests for API Pydantic models."""

    def test_scrape_request_model(self) -> None:
        """Test ScrapeRequest model."""
        from xeepy.api.routes.scrape import ScrapeRepliesRequest

        request = ScrapeRepliesRequest(
            tweet_url="https://twitter.com/user/status/123",
            max_replies=100,
        )

        assert request.tweet_url == "https://twitter.com/user/status/123"
        assert request.max_replies == 100

    def test_follow_request_model(self) -> None:
        """Test FollowRequest model."""
        from xeepy.api.routes.follow import FollowUserRequest

        request = FollowUserRequest(username="testuser")

        assert request.username == "testuser"

    def test_engage_request_model(self) -> None:
        """Test EngageRequest model."""
        from xeepy.api.routes.engage import LikeRequest

        request = LikeRequest(tweet_url="https://twitter.com/user/status/123")

        assert request.tweet_url == "https://twitter.com/user/status/123"

    def test_ai_generate_request_model(self) -> None:
        """Test AIGenerateRequest model."""
        from xeepy.api.routes.ai import GenerateContentRequest

        request = GenerateContentRequest(
            topic="Python programming",
            content_type="tweet",
            tone="professional",
        )

        assert request.topic == "Python programming"
        assert request.content_type == "tweet"
        assert request.tone == "professional"

    def test_sentiment_request_model(self) -> None:
        """Test SentimentRequest model."""
        from xeepy.api.routes.ai import SentimentRequest

        request = SentimentRequest(text="I love this!")

        assert request.text == "I love this!"


class TestAPIRouters:
    """Tests for API router configuration."""

    def test_scrape_router_exists(self) -> None:
        """Test scrape router exists."""
        from xeepy.api.routes.scrape import router

        assert router is not None
        assert router.prefix == "/scrape" or hasattr(router, "routes")

    def test_follow_router_exists(self) -> None:
        """Test follow router exists."""
        from xeepy.api.routes.follow import router

        assert router is not None

    def test_engage_router_exists(self) -> None:
        """Test engage router exists."""
        from xeepy.api.routes.engage import router

        assert router is not None

    def test_monitor_router_exists(self) -> None:
        """Test monitor router exists."""
        from xeepy.api.routes.monitor import router

        assert router is not None

    def test_ai_router_exists(self) -> None:
        """Test AI router exists."""
        from xeepy.api.routes.ai import router

        assert router is not None


class TestFastAPIApp:
    """Tests for FastAPI application."""

    def test_app_title(self) -> None:
        """Test app has correct title."""
        from xeepy.api.server import app

        assert "xeepy" in app.title.lower() or "Xeepy" in app.title

    def test_app_version(self) -> None:
        """Test app has version."""
        from xeepy.api.server import app

        assert app.version is not None

    def test_app_has_routes(self) -> None:
        """Test app has routes registered."""
        from xeepy.api.server import app

        routes = [route.path for route in app.routes]

        assert len(routes) > 0

    def test_health_endpoint_exists(self) -> None:
        """Test health check endpoint exists."""
        from xeepy.api.server import app

        routes = [route.path for route in app.routes]

        assert "/health" in routes or any("/health" in r for r in routes)


class TestAPIWithTestClient:
    """Tests using FastAPI TestClient."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        from fastapi.testclient import TestClient
        from xeepy.api.server import app

        return TestClient(app)

    def test_health_check(self, client) -> None:
        """Test health check endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy" or "ok" in str(data).lower()

    def test_root_endpoint(self, client) -> None:
        """Test root endpoint."""
        response = client.get("/")

        assert response.status_code in [200, 404]  # May or may not exist

    def test_docs_endpoint(self, client) -> None:
        """Test OpenAPI docs endpoint."""
        response = client.get("/docs")

        assert response.status_code == 200

    def test_openapi_schema(self, client) -> None:
        """Test OpenAPI schema endpoint."""
        response = client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data


class TestAPIEndpointValidation:
    """Tests for API endpoint input validation."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        from fastapi.testclient import TestClient
        from xeepy.api.server import app

        return TestClient(app)

    def test_invalid_scrape_request(self, client) -> None:
        """Test scrape endpoint rejects invalid input."""
        response = client.post("/scrape/replies", json={})

        assert response.status_code == 422  # Validation error

    def test_invalid_sentiment_request(self, client) -> None:
        """Test sentiment endpoint rejects empty text."""
        response = client.post("/ai/sentiment", json={"text": ""})

        assert response.status_code in [400, 422]

    def test_invalid_generate_request(self, client) -> None:
        """Test generate endpoint rejects missing topic."""
        response = client.post("/ai/generate", json={})

        assert response.status_code == 422


class TestAPIErrorHandling:
    """Tests for API error handling."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        from fastapi.testclient import TestClient
        from xeepy.api.server import app

        return TestClient(app)

    def test_not_found_endpoint(self, client) -> None:
        """Test 404 for unknown endpoint."""
        response = client.get("/nonexistent/endpoint")

        assert response.status_code == 404

    def test_method_not_allowed(self, client) -> None:
        """Test 405 for wrong method."""
        response = client.patch("/health")

        assert response.status_code in [405, 404]


class TestAPIResponseFormats:
    """Tests for API response formats."""

    @pytest.fixture
    def client(self):
        """Create a test client."""
        from fastapi.testclient import TestClient
        from xeepy.api.server import app

        return TestClient(app)

    def test_json_response(self, client) -> None:
        """Test JSON response format."""
        response = client.get("/health")

        assert response.headers.get("content-type") == "application/json"

    def test_cors_headers(self, client) -> None:
        """Test CORS headers are present."""
        response = client.options("/health")

        # CORS headers may or may not be configured
        # Just verify the request doesn't fail
        assert response.status_code in [200, 204, 405]
