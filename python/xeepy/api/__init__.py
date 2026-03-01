"""
Xeepy API Module - REST API and GraphQL for X/Twitter automation.

Provides:
- FastAPI-based REST API for all Xeepy functionality
- Direct GraphQL client for higher rate limits and batch operations
"""

from __future__ import annotations

from xeepy.api.server import app, create_app
from xeepy.api.graphql import GraphQLClient, Operation, create_graphql_client

__all__ = [
    "app",
    "create_app",
    "GraphQLClient",
    "Operation",
    "create_graphql_client",
]

