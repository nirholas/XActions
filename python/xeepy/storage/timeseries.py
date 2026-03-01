"""
Time-series storage for historical tracking and analytics.

Store and query time-series data like follower counts, engagement metrics, etc.
"""

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


@dataclass
class DataPoint:
    """A single data point in the time series"""
    timestamp: datetime
    value: float
    metadata: Optional[dict] = None
    
    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "value": self.value,
            "metadata": self.metadata,
        }


@dataclass
class TimeSeries:
    """A collection of data points for a metric"""
    metric_name: str
    entity_id: str  # e.g., username
    data_points: List[DataPoint] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "metric_name": self.metric_name,
            "entity_id": self.entity_id,
            "data_points": [dp.to_dict() for dp in self.data_points],
        }
    
    @property
    def values(self) -> List[float]:
        return [dp.value for dp in self.data_points]
    
    @property
    def timestamps(self) -> List[datetime]:
        return [dp.timestamp for dp in self.data_points]
    
    def get_change(self) -> Optional[float]:
        """Get change from first to last value"""
        if len(self.data_points) < 2:
            return None
        return self.data_points[-1].value - self.data_points[0].value
    
    def get_change_percentage(self) -> Optional[float]:
        """Get percentage change from first to last value"""
        if len(self.data_points) < 2:
            return None
        first = self.data_points[0].value
        if first == 0:
            return None
        return ((self.data_points[-1].value - first) / first) * 100


class TimeSeriesStorage:
    """
    Store time-series data for analytics and tracking.
    
    Supports storing various metrics over time with efficient querying
    for historical analysis.
    
    Example:
        storage = TimeSeriesStorage()
        
        # Record follower count
        storage.record("followers", "myuser", 1000)
        
        # Later...
        storage.record("followers", "myuser", 1050)
        
        # Get history
        history = storage.get_series("followers", "myuser", days=30)
    """
    
    # Common metric names
    METRIC_FOLLOWERS = "followers"
    METRIC_FOLLOWING = "following"
    METRIC_TWEETS = "tweets"
    METRIC_LIKES = "likes"
    METRIC_ENGAGEMENT_RATE = "engagement_rate"
    
    def __init__(self, db_path: str = "xeepy_timeseries.db"):
        """
        Initialize time-series storage.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Main time series data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS timeseries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    value REAL NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    UNIQUE(metric_name, entity_id, timestamp)
                )
            """)
            
            # Index for efficient querying
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_timeseries_query 
                ON timeseries(metric_name, entity_id, timestamp DESC)
            """)
            
            # Daily aggregates for faster long-term queries
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_aggregates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    min_value REAL,
                    max_value REAL,
                    avg_value REAL,
                    last_value REAL,
                    count INTEGER,
                    UNIQUE(metric_name, entity_id, date)
                )
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_daily_agg_query 
                ON daily_aggregates(metric_name, entity_id, date DESC)
            """)
            
            conn.commit()
    
    def record(
        self,
        metric_name: str,
        entity_id: str,
        value: float,
        timestamp: Optional[datetime] = None,
        metadata: Optional[dict] = None,
    ) -> int:
        """
        Record a data point.
        
        Args:
            metric_name: Name of the metric (e.g., 'followers')
            entity_id: Entity identifier (e.g., username)
            value: The value to record
            timestamp: When the value was recorded (default: now)
            metadata: Optional additional data
            
        Returns:
            ID of the recorded data point
        """
        timestamp = timestamp or datetime.utcnow()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            metadata_json = json.dumps(metadata) if metadata else None
            
            cursor.execute(
                """
                INSERT OR REPLACE INTO timeseries 
                (metric_name, entity_id, value, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?)
                """,
                (metric_name, entity_id.lower(), value, timestamp, metadata_json)
            )
            
            # Update daily aggregate
            self._update_daily_aggregate(cursor, metric_name, entity_id.lower(), timestamp.date(), value)
            
            conn.commit()
            return cursor.lastrowid
    
    def record_multiple(
        self,
        entity_id: str,
        metrics: Dict[str, float],
        timestamp: Optional[datetime] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        """
        Record multiple metrics at once.
        
        Args:
            entity_id: Entity identifier
            metrics: Dictionary of metric_name -> value
            timestamp: When the values were recorded
            metadata: Optional additional data
        """
        timestamp = timestamp or datetime.utcnow()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            metadata_json = json.dumps(metadata) if metadata else None
            
            for metric_name, value in metrics.items():
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO timeseries 
                    (metric_name, entity_id, value, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (metric_name, entity_id.lower(), value, timestamp, metadata_json)
                )
                self._update_daily_aggregate(cursor, metric_name, entity_id.lower(), timestamp.date(), value)
            
            conn.commit()
    
    def _update_daily_aggregate(
        self,
        cursor: sqlite3.Cursor,
        metric_name: str,
        entity_id: str,
        date: datetime,
        value: float,
    ) -> None:
        """Update daily aggregate for a metric"""
        cursor.execute(
            """
            INSERT INTO daily_aggregates 
            (metric_name, entity_id, date, min_value, max_value, avg_value, last_value, count)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(metric_name, entity_id, date) DO UPDATE SET
                min_value = MIN(min_value, ?),
                max_value = MAX(max_value, ?),
                avg_value = (avg_value * count + ?) / (count + 1),
                last_value = ?,
                count = count + 1
            """,
            (metric_name, entity_id, date, value, value, value, value,
             value, value, value, value)
        )
    
    def get_latest(
        self,
        metric_name: str,
        entity_id: str,
    ) -> Optional[DataPoint]:
        """
        Get the most recent data point for a metric.
        
        Args:
            metric_name: Name of the metric
            entity_id: Entity identifier
            
        Returns:
            Latest DataPoint or None if no data
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                """
                SELECT value, timestamp, metadata FROM timeseries
                WHERE metric_name = ? AND entity_id = ?
                ORDER BY timestamp DESC LIMIT 1
                """,
                (metric_name, entity_id.lower())
            )
            
            row = cursor.fetchone()
            if not row:
                return None
            
            return DataPoint(
                value=row[0],
                timestamp=datetime.fromisoformat(row[1]) if isinstance(row[1], str) else row[1],
                metadata=json.loads(row[2]) if row[2] else None,
            )
    
    def get_series(
        self,
        metric_name: str,
        entity_id: str,
        days: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None,
    ) -> TimeSeries:
        """
        Get time series data for a metric.
        
        Args:
            metric_name: Name of the metric
            entity_id: Entity identifier
            days: Number of days to look back (alternative to start_date)
            start_date: Start of date range
            end_date: End of date range (default: now)
            limit: Maximum number of data points
            
        Returns:
            TimeSeries with data points
        """
        end_date = end_date or datetime.utcnow()
        
        if days is not None:
            start_date = end_date - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            query = """
                SELECT value, timestamp, metadata FROM timeseries
                WHERE metric_name = ? AND entity_id = ?
            """
            params: List[Any] = [metric_name, entity_id.lower()]
            
            if start_date:
                query += " AND timestamp >= ?"
                params.append(start_date)
            
            if end_date:
                query += " AND timestamp <= ?"
                params.append(end_date)
            
            query += " ORDER BY timestamp ASC"
            
            if limit:
                query += " LIMIT ?"
                params.append(limit)
            
            cursor.execute(query, params)
            
            data_points = []
            for row in cursor.fetchall():
                data_points.append(DataPoint(
                    value=row[0],
                    timestamp=datetime.fromisoformat(row[1]) if isinstance(row[1], str) else row[1],
                    metadata=json.loads(row[2]) if row[2] else None,
                ))
            
            return TimeSeries(
                metric_name=metric_name,
                entity_id=entity_id,
                data_points=data_points,
            )
    
    def get_daily_series(
        self,
        metric_name: str,
        entity_id: str,
        days: int = 30,
    ) -> List[dict]:
        """
        Get daily aggregated data for a metric.
        
        More efficient than get_series for long time ranges.
        
        Args:
            metric_name: Name of the metric
            entity_id: Entity identifier
            days: Number of days to look back
            
        Returns:
            List of daily data dictionaries
        """
        start_date = datetime.utcnow().date() - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                """
                SELECT date, min_value, max_value, avg_value, last_value, count
                FROM daily_aggregates
                WHERE metric_name = ? AND entity_id = ? AND date >= ?
                ORDER BY date ASC
                """,
                (metric_name, entity_id.lower(), start_date)
            )
            
            return [
                {
                    "date": row[0],
                    "min": row[1],
                    "max": row[2],
                    "avg": row[3],
                    "last": row[4],
                    "count": row[5],
                }
                for row in cursor.fetchall()
            ]
    
    def get_change(
        self,
        metric_name: str,
        entity_id: str,
        days: int = 1,
    ) -> Optional[dict]:
        """
        Get the change in a metric over a time period.
        
        Args:
            metric_name: Name of the metric
            entity_id: Entity identifier
            days: Number of days to compare
            
        Returns:
            Dictionary with change information
        """
        series = self.get_series(metric_name, entity_id, days=days)
        
        if len(series.data_points) < 2:
            return None
        
        first = series.data_points[0]
        last = series.data_points[-1]
        change = last.value - first.value
        
        pct_change = None
        if first.value != 0:
            pct_change = (change / first.value) * 100
        
        return {
            "start_value": first.value,
            "end_value": last.value,
            "change": change,
            "change_percentage": pct_change,
            "start_time": first.timestamp,
            "end_time": last.timestamp,
            "data_points": len(series.data_points),
        }
    
    def get_metrics_for_entity(self, entity_id: str) -> List[str]:
        """
        Get all metric names recorded for an entity.
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            List of metric names
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                """
                SELECT DISTINCT metric_name FROM timeseries
                WHERE entity_id = ?
                """,
                (entity_id.lower(),)
            )
            
            return [row[0] for row in cursor.fetchall()]
    
    def get_all_entities(self, metric_name: Optional[str] = None) -> List[str]:
        """
        Get all entities with recorded data.
        
        Args:
            metric_name: Filter by metric (optional)
            
        Returns:
            List of entity IDs
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if metric_name:
                cursor.execute(
                    "SELECT DISTINCT entity_id FROM timeseries WHERE metric_name = ?",
                    (metric_name,)
                )
            else:
                cursor.execute("SELECT DISTINCT entity_id FROM timeseries")
            
            return [row[0] for row in cursor.fetchall()]
    
    def delete_old_data(
        self,
        days_to_keep: int = 365,
        keep_daily_aggregates: bool = True,
    ) -> int:
        """
        Delete data older than specified days.
        
        Args:
            days_to_keep: Keep data newer than this
            keep_daily_aggregates: Keep daily aggregates even if raw data deleted
            
        Returns:
            Number of rows deleted
        """
        cutoff = datetime.utcnow() - timedelta(days=days_to_keep)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                "DELETE FROM timeseries WHERE timestamp < ?",
                (cutoff,)
            )
            deleted = cursor.rowcount
            
            if not keep_daily_aggregates:
                cursor.execute(
                    "DELETE FROM daily_aggregates WHERE date < ?",
                    (cutoff.date(),)
                )
            
            conn.commit()
            return deleted
    
    def get_stats(self) -> dict:
        """Get storage statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM timeseries")
            total_points = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT metric_name) FROM timeseries")
            unique_metrics = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT entity_id) FROM timeseries")
            unique_entities = cursor.fetchone()[0]
            
            cursor.execute("SELECT MIN(timestamp), MAX(timestamp) FROM timeseries")
            date_range = cursor.fetchone()
            
            return {
                "total_data_points": total_points,
                "unique_metrics": unique_metrics,
                "unique_entities": unique_entities,
                "oldest_data": date_range[0],
                "newest_data": date_range[1],
                "db_size_bytes": self.db_path.stat().st_size if self.db_path.exists() else 0,
            }
    
    def export_to_csv(
        self,
        metric_name: str,
        entity_id: str,
        output_path: str,
        days: Optional[int] = None,
    ) -> str:
        """
        Export time series data to CSV.
        
        Args:
            metric_name: Name of the metric
            entity_id: Entity identifier
            output_path: Output file path
            days: Number of days to export (None = all)
            
        Returns:
            Path to exported file
        """
        import csv
        
        series = self.get_series(metric_name, entity_id, days=days)
        
        with open(output_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'value', 'metadata'])
            
            for dp in series.data_points:
                writer.writerow([
                    dp.timestamp.isoformat(),
                    dp.value,
                    json.dumps(dp.metadata) if dp.metadata else '',
                ])
        
        return output_path
