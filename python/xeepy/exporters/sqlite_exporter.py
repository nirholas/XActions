"""
SQLite exporter for Xeepy.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from loguru import logger

from xeepy.exporters.base import BaseExporter


class SQLiteExporter(BaseExporter):
    """
    Exports data to SQLite database.
    
    Features:
    - Automatic table creation
    - Type inference
    - Upsert support
    - Query interface
    
    Example:
        >>> exporter = SQLiteExporter()
        >>> exporter.export(tweets, "data.db", table="tweets")
        >>> 
        >>> # Query data
        >>> results = exporter.query("data.db", "SELECT * FROM tweets WHERE likes > 100")
    """
    
    def __init__(self) -> None:
        """Initialize SQLiteExporter."""
        pass
    
    def export(
        self,
        data: list[dict[str, Any]],
        filepath: str | Path,
        **kwargs,
    ) -> Path:
        """
        Export data to SQLite database.
        
        Args:
            data: List of dictionaries to export.
            filepath: Database file path.
            **kwargs: Additional options:
                - table: Table name (default: "data").
                - if_exists: "replace", "append", or "fail" (default: "replace").
                - primary_key: Column to use as primary key.
            
        Returns:
            Path to the database file.
        """
        filepath = Path(filepath)
        self._ensure_dir(filepath)
        
        if not data:
            logger.warning("No data to export")
            return filepath
        
        table = kwargs.get("table", "data")
        if_exists = kwargs.get("if_exists", "replace")
        primary_key = kwargs.get("primary_key", "id")
        
        # Flatten nested data
        processed_data = [self._flatten_dict(item) for item in data]
        
        # Infer schema from data
        schema = self._infer_schema(processed_data)
        
        conn = sqlite3.connect(str(filepath))
        cursor = conn.cursor()
        
        try:
            # Handle existing table
            if if_exists == "replace":
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
            elif if_exists == "fail":
                cursor.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table,)
                )
                if cursor.fetchone():
                    raise ValueError(f"Table {table} already exists")
            
            # Create table if needed
            if if_exists != "append" or not self._table_exists(cursor, table):
                columns = []
                for col_name, col_type in schema.items():
                    col_def = f'"{col_name}" {col_type}'
                    if col_name == primary_key:
                        col_def += " PRIMARY KEY"
                    columns.append(col_def)
                
                create_sql = f'CREATE TABLE IF NOT EXISTS "{table}" ({", ".join(columns)})'
                cursor.execute(create_sql)
            
            # Insert data
            columns = list(schema.keys())
            placeholders = ", ".join(["?" for _ in columns])
            col_names = ", ".join([f'"{c}"' for c in columns])
            
            insert_sql = f'INSERT OR REPLACE INTO "{table}" ({col_names}) VALUES ({placeholders})'
            
            for item in processed_data:
                values = []
                for col in columns:
                    value = item.get(col)
                    if isinstance(value, (dict, list)):
                        value = json.dumps(value)
                    elif isinstance(value, datetime):
                        value = value.isoformat()
                    elif isinstance(value, bool):
                        value = int(value)
                    values.append(value)
                
                cursor.execute(insert_sql, values)
            
            conn.commit()
            logger.info(f"Exported {len(processed_data)} rows to {filepath}:{table}")
            
        finally:
            conn.close()
        
        return filepath
    
    def import_data(
        self,
        filepath: str | Path,
        **kwargs,
    ) -> list[dict[str, Any]]:
        """
        Import data from SQLite database.
        
        Args:
            filepath: Database file path.
            **kwargs: Additional options:
                - table: Table name (default: "data").
                - query: Custom SQL query (overrides table).
                - limit: Maximum rows to return.
            
        Returns:
            List of dictionaries.
        """
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"Database not found: {filepath}")
        
        table = kwargs.get("table", "data")
        query = kwargs.get("query")
        limit = kwargs.get("limit")
        
        conn = sqlite3.connect(str(filepath))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            if query:
                sql = query
            else:
                sql = f'SELECT * FROM "{table}"'
                if limit:
                    sql += f" LIMIT {limit}"
            
            cursor.execute(sql)
            rows = cursor.fetchall()
            
            data = [dict(row) for row in rows]
            
            logger.info(f"Imported {len(data)} rows from {filepath}")
            return data
            
        finally:
            conn.close()
    
    def _infer_schema(self, data: list[dict[str, Any]]) -> dict[str, str]:
        """Infer SQLite schema from data."""
        schema: dict[str, str] = {}
        
        for item in data:
            for key, value in item.items():
                if key not in schema:
                    schema[key] = self._infer_type(value)
                else:
                    # Widen type if needed
                    current_type = schema[key]
                    new_type = self._infer_type(value)
                    schema[key] = self._wider_type(current_type, new_type)
        
        return schema
    
    def _infer_type(self, value: Any) -> str:
        """Infer SQLite type from Python value."""
        if value is None:
            return "TEXT"
        if isinstance(value, bool):
            return "INTEGER"
        if isinstance(value, int):
            return "INTEGER"
        if isinstance(value, float):
            return "REAL"
        if isinstance(value, (dict, list)):
            return "TEXT"  # Store as JSON
        return "TEXT"
    
    def _wider_type(self, type1: str, type2: str) -> str:
        """Return the wider of two types."""
        type_order = ["INTEGER", "REAL", "TEXT"]
        idx1 = type_order.index(type1) if type1 in type_order else 2
        idx2 = type_order.index(type2) if type2 in type_order else 2
        return type_order[max(idx1, idx2)]
    
    def _table_exists(self, cursor: sqlite3.Cursor, table: str) -> bool:
        """Check if table exists."""
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table,)
        )
        return cursor.fetchone() is not None
    
    def query(
        self,
        filepath: str | Path,
        sql: str,
    ) -> list[dict[str, Any]]:
        """
        Execute a SQL query and return results.
        
        Args:
            filepath: Database file path.
            sql: SQL query to execute.
            
        Returns:
            List of result dictionaries.
        """
        return self.import_data(filepath, query=sql)
    
    def get_tables(self, filepath: str | Path) -> list[str]:
        """
        Get list of tables in database.
        
        Args:
            filepath: Database file path.
            
        Returns:
            List of table names.
        """
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"Database not found: {filepath}")
        
        conn = sqlite3.connect(str(filepath))
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
            return [row[0] for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_table_info(
        self,
        filepath: str | Path,
        table: str,
    ) -> list[dict[str, Any]]:
        """
        Get schema information for a table.
        
        Args:
            filepath: Database file path.
            table: Table name.
            
        Returns:
            List of column info dicts.
        """
        filepath = Path(filepath)
        
        conn = sqlite3.connect(str(filepath))
        cursor = conn.cursor()
        
        try:
            cursor.execute(f'PRAGMA table_info("{table}")')
            columns = cursor.fetchall()
            
            return [
                {
                    "index": col[0],
                    "name": col[1],
                    "type": col[2],
                    "not_null": bool(col[3]),
                    "default": col[4],
                    "primary_key": bool(col[5]),
                }
                for col in columns
            ]
        finally:
            conn.close()
    
    def count(self, filepath: str | Path, table: str) -> int:
        """
        Get row count for a table.
        
        Args:
            filepath: Database file path.
            table: Table name.
            
        Returns:
            Number of rows.
        """
        filepath = Path(filepath)
        
        conn = sqlite3.connect(str(filepath))
        cursor = conn.cursor()
        
        try:
            cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
            return cursor.fetchone()[0]
        finally:
            conn.close()
