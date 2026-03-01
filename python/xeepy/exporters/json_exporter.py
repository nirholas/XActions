"""
JSON exporter for Xeepy.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from loguru import logger

from xeepy.exporters.base import BaseExporter


class JSONExporter(BaseExporter):
    """
    Exports data to JSON format.
    
    Features:
    - Pretty printing with configurable indent
    - Datetime serialization
    - Streaming for large datasets
    
    Example:
        >>> exporter = JSONExporter(indent=2)
        >>> exporter.export(tweets, "tweets.json")
    """
    
    def __init__(
        self,
        indent: int | None = 2,
        ensure_ascii: bool = False,
    ) -> None:
        """
        Initialize JSONExporter.
        
        Args:
            indent: Indentation level (None for compact).
            ensure_ascii: Whether to escape non-ASCII characters.
        """
        self.indent = indent
        self.ensure_ascii = ensure_ascii
    
    def export(
        self,
        data: list[dict[str, Any]],
        filepath: str | Path,
        **kwargs,
    ) -> Path:
        """
        Export data to JSON file.
        
        Args:
            data: List of dictionaries to export.
            filepath: Output file path.
            **kwargs: Additional options:
                - encoding: File encoding (default: utf-8).
                - wrap_in_object: Wrap array in object with metadata.
            
        Returns:
            Path to the exported file.
        """
        filepath = Path(filepath)
        self._ensure_dir(filepath)
        
        encoding = kwargs.get("encoding", "utf-8")
        wrap_in_object = kwargs.get("wrap_in_object", False)
        
        if wrap_in_object:
            output = {
                "count": len(data),
                "exported_at": datetime.now().isoformat(),
                "data": data,
            }
        else:
            output = data
        
        with open(filepath, "w", encoding=encoding) as f:
            json.dump(
                output,
                f,
                indent=self.indent,
                ensure_ascii=self.ensure_ascii,
                default=self._json_serializer,
            )
        
        logger.info(f"Exported {len(data)} items to {filepath}")
        return filepath
    
    def import_data(
        self,
        filepath: str | Path,
        **kwargs,
    ) -> list[dict[str, Any]]:
        """
        Import data from JSON file.
        
        Args:
            filepath: Input file path.
            **kwargs: Additional options:
                - encoding: File encoding (default: utf-8).
            
        Returns:
            List of dictionaries.
        """
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        encoding = kwargs.get("encoding", "utf-8")
        
        with open(filepath, "r", encoding=encoding) as f:
            data = json.load(f)
        
        # Handle wrapped format
        if isinstance(data, dict) and "data" in data:
            data = data["data"]
        
        if not isinstance(data, list):
            data = [data]
        
        logger.info(f"Imported {len(data)} items from {filepath}")
        return data
    
    def _json_serializer(self, obj: Any) -> Any:
        """Custom JSON serializer for special types."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, "to_dict"):
            return obj.to_dict()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    def export_ndjson(
        self,
        data: list[dict[str, Any]],
        filepath: str | Path,
    ) -> Path:
        """
        Export to newline-delimited JSON (NDJSON).
        
        Each line is a separate JSON object.
        Useful for streaming large datasets.
        
        Args:
            data: Data to export.
            filepath: Output path.
            
        Returns:
            Path to exported file.
        """
        filepath = Path(filepath)
        self._ensure_dir(filepath)
        
        with open(filepath, "w", encoding="utf-8") as f:
            for item in data:
                json.dump(
                    item,
                    f,
                    ensure_ascii=self.ensure_ascii,
                    default=self._json_serializer,
                )
                f.write("\n")
        
        logger.info(f"Exported {len(data)} items to {filepath} (NDJSON)")
        return filepath
    
    def import_ndjson(
        self,
        filepath: str | Path,
    ) -> list[dict[str, Any]]:
        """
        Import from newline-delimited JSON.
        
        Args:
            filepath: Input file path.
            
        Returns:
            List of dictionaries.
        """
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        data = []
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        
        logger.info(f"Imported {len(data)} items from {filepath} (NDJSON)")
        return data
    
    def to_json_string(
        self,
        data: list[dict[str, Any]],
    ) -> str:
        """
        Convert data to JSON string without writing to file.
        
        Args:
            data: Data to convert.
            
        Returns:
            JSON string.
        """
        return json.dumps(
            data,
            indent=self.indent,
            ensure_ascii=self.ensure_ascii,
            default=self._json_serializer,
        )
