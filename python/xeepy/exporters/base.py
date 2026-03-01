"""
Base exporter class.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from loguru import logger


class BaseExporter(ABC):
    """
    Base class for all exporters.
    
    Subclasses must implement the export() method.
    """
    
    @abstractmethod
    def export(
        self,
        data: list[dict[str, Any]],
        filepath: str | Path,
        **kwargs,
    ) -> Path:
        """
        Export data to a file.
        
        Args:
            data: List of dictionaries to export.
            filepath: Output file path.
            **kwargs: Exporter-specific options.
            
        Returns:
            Path to the exported file.
        """
        raise NotImplementedError
    
    @abstractmethod
    def import_data(
        self,
        filepath: str | Path,
        **kwargs,
    ) -> list[dict[str, Any]]:
        """
        Import data from a file.
        
        Args:
            filepath: Input file path.
            **kwargs: Importer-specific options.
            
        Returns:
            List of dictionaries.
        """
        raise NotImplementedError
    
    def _ensure_dir(self, filepath: Path) -> None:
        """Ensure the parent directory exists."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
    
    def _flatten_dict(
        self,
        d: dict[str, Any],
        parent_key: str = "",
        sep: str = "_",
    ) -> dict[str, Any]:
        """Flatten a nested dictionary."""
        items: list[tuple[str, Any]] = []
        
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep).items())
            elif isinstance(v, list):
                # Convert lists to semicolon-separated strings
                items.append((new_key, ";".join(str(x) for x in v)))
            else:
                items.append((new_key, v))
        
        return dict(items)
