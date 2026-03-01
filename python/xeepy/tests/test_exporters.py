"""
Tests for exporters.
"""

import json
import pytest
import tempfile
from pathlib import Path

from xeepy.exporters import CSVExporter, JSONExporter, SQLiteExporter


class TestCSVExporter:
    """Tests for CSVExporter."""
    
    def test_export_basic(self):
        exporter = CSVExporter()
        data = [
            {"name": "Alice", "age": 30},
            {"name": "Bob", "age": 25},
        ]
        
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            result = exporter.export(data, filepath)
            assert result == filepath
            assert filepath.exists()
            
            # Read back
            imported = exporter.import_data(filepath)
            assert len(imported) == 2
            assert imported[0]["name"] == "Alice"
        finally:
            filepath.unlink(missing_ok=True)
    
    def test_export_empty(self):
        exporter = CSVExporter()
        
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export([], filepath)
            assert filepath.exists()
        finally:
            filepath.unlink(missing_ok=True)
    
    def test_export_nested(self):
        exporter = CSVExporter(flatten_nested=True)
        data = [
            {"name": "Alice", "address": {"city": "NYC", "zip": "10001"}},
        ]
        
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export(data, filepath)
            imported = exporter.import_data(filepath)
            
            # Nested keys should be flattened
            assert "address_city" in imported[0]
            assert imported[0]["address_city"] == "NYC"
        finally:
            filepath.unlink(missing_ok=True)


class TestJSONExporter:
    """Tests for JSONExporter."""
    
    def test_export_basic(self):
        exporter = JSONExporter()
        data = [
            {"name": "Alice", "age": 30},
            {"name": "Bob", "age": 25},
        ]
        
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            result = exporter.export(data, filepath)
            assert result == filepath
            
            # Read back
            imported = exporter.import_data(filepath)
            assert len(imported) == 2
        finally:
            filepath.unlink(missing_ok=True)
    
    def test_export_with_wrapper(self):
        exporter = JSONExporter()
        data = [{"name": "Alice"}]
        
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export(data, filepath, wrap_in_object=True)
            
            with open(filepath) as f:
                content = json.load(f)
            
            assert "count" in content
            assert "exported_at" in content
            assert "data" in content
        finally:
            filepath.unlink(missing_ok=True)
    
    def test_export_ndjson(self):
        exporter = JSONExporter()
        data = [
            {"name": "Alice"},
            {"name": "Bob"},
        ]
        
        with tempfile.NamedTemporaryFile(suffix=".ndjson", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export_ndjson(data, filepath)
            
            # Each line should be valid JSON
            with open(filepath) as f:
                lines = f.readlines()
            
            assert len(lines) == 2
            assert json.loads(lines[0])["name"] == "Alice"
        finally:
            filepath.unlink(missing_ok=True)


class TestSQLiteExporter:
    """Tests for SQLiteExporter."""
    
    def test_export_basic(self):
        exporter = SQLiteExporter()
        data = [
            {"id": 1, "name": "Alice", "age": 30},
            {"id": 2, "name": "Bob", "age": 25},
        ]
        
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export(data, filepath, table="users")
            
            # Query back
            imported = exporter.import_data(filepath, table="users")
            assert len(imported) == 2
        finally:
            filepath.unlink(missing_ok=True)
    
    def test_get_tables(self):
        exporter = SQLiteExporter()
        data = [{"id": 1, "name": "Test"}]
        
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export(data, filepath, table="test_table")
            
            tables = exporter.get_tables(filepath)
            assert "test_table" in tables
        finally:
            filepath.unlink(missing_ok=True)
    
    def test_query(self):
        exporter = SQLiteExporter()
        data = [
            {"id": 1, "name": "Alice", "age": 30},
            {"id": 2, "name": "Bob", "age": 25},
        ]
        
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            filepath = Path(f.name)
        
        try:
            exporter.export(data, filepath, table="users")
            
            # Query with filter
            results = exporter.query(filepath, "SELECT * FROM users WHERE age > 26")
            assert len(results) == 1
            assert results[0]["name"] == "Alice"
        finally:
            filepath.unlink(missing_ok=True)
