"""
CSV exporter for Xeepy.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from loguru import logger

from xeepy.exporters.base import BaseExporter


class CSVExporter(BaseExporter):
    """
    Exports data to CSV format.
    
    Features:
    - Automatic field detection
    - Nested dict flattening
    - List handling
    - Configurable delimiter
    
    Example:
        >>> exporter = CSVExporter()
        >>> exporter.export(tweets, "tweets.csv")
    """
    
    def __init__(
        self,
        delimiter: str = ",",
        quoting: int = csv.QUOTE_MINIMAL,
        flatten_nested: bool = True,
    ) -> None:
        """
        Initialize CSVExporter.
        
        Args:
            delimiter: Field delimiter (default: comma).
            quoting: CSV quoting style.
            flatten_nested: Whether to flatten nested dicts.
        """
        self.delimiter = delimiter
        self.quoting = quoting
        self.flatten_nested = flatten_nested
    
    def export(
        self,
        data: list[dict[str, Any]],
        filepath: str | Path,
        **kwargs,
    ) -> Path:
        """
        Export data to CSV file.
        
        Args:
            data: List of dictionaries to export.
            filepath: Output file path.
            **kwargs: Additional options:
                - fieldnames: List of fields to include (default: all).
                - encoding: File encoding (default: utf-8).
            
        Returns:
            Path to the exported file.
        """
        filepath = Path(filepath)
        self._ensure_dir(filepath)
        
        if not data:
            logger.warning("No data to export")
            # Create empty file with headers
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("")
            return filepath
        
        # Process data
        if self.flatten_nested:
            processed_data = [self._flatten_dict(item) for item in data]
        else:
            processed_data = data
        
        # Get fieldnames
        fieldnames = kwargs.get("fieldnames")
        if not fieldnames:
            # Collect all unique keys
            all_keys: set[str] = set()
            for item in processed_data:
                all_keys.update(item.keys())
            fieldnames = sorted(all_keys)
        
        encoding = kwargs.get("encoding", "utf-8")
        
        # Write CSV
        with open(filepath, "w", newline="", encoding=encoding) as f:
            writer = csv.DictWriter(
                f,
                fieldnames=fieldnames,
                delimiter=self.delimiter,
                quoting=self.quoting,
                extrasaction="ignore",
            )
            
            writer.writeheader()
            
            for item in processed_data:
                # Convert any remaining non-string values
                row = {}
                for key in fieldnames:
                    value = item.get(key, "")
                    if value is None:
                        value = ""
                    elif isinstance(value, bool):
                        value = str(value).lower()
                    elif isinstance(value, (list, dict)):
                        value = str(value)
                    row[key] = value
                
                writer.writerow(row)
        
        logger.info(f"Exported {len(processed_data)} rows to {filepath}")
        return filepath
    
    def import_data(
        self,
        filepath: str | Path,
        **kwargs,
    ) -> list[dict[str, Any]]:
        """
        Import data from CSV file.
        
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
        
        data = []
        with open(filepath, "r", encoding=encoding) as f:
            reader = csv.DictReader(f, delimiter=self.delimiter)
            
            for row in reader:
                # Convert numeric strings back to numbers where possible
                processed_row = {}
                for key, value in row.items():
                    if value == "":
                        processed_row[key] = None
                    elif value.lower() in ("true", "false"):
                        processed_row[key] = value.lower() == "true"
                    else:
                        try:
                            processed_row[key] = int(value)
                        except ValueError:
                            try:
                                processed_row[key] = float(value)
                            except ValueError:
                                processed_row[key] = value
                
                data.append(processed_row)
        
        logger.info(f"Imported {len(data)} rows from {filepath}")
        return data
    
    def export_with_headers(
        self,
        data: list[dict[str, Any]],
        filepath: str | Path,
        headers: dict[str, str],
    ) -> Path:
        """
        Export with custom header names.
        
        Args:
            data: Data to export.
            filepath: Output path.
            headers: Mapping of field names to header names.
            
        Returns:
            Path to exported file.
        """
        filepath = Path(filepath)
        self._ensure_dir(filepath)
        
        if not data:
            return filepath
        
        if self.flatten_nested:
            processed_data = [self._flatten_dict(item) for item in data]
        else:
            processed_data = data
        
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter=self.delimiter, quoting=self.quoting)
            
            # Write custom headers
            fieldnames = list(headers.keys())
            writer.writerow([headers[f] for f in fieldnames])
            
            # Write data
            for item in processed_data:
                row = [item.get(f, "") for f in fieldnames]
                writer.writerow(row)
        
        logger.info(f"Exported {len(processed_data)} rows to {filepath}")
        return filepath
