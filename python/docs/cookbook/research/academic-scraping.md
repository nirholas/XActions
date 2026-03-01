# Academic Research Methodology

A comprehensive guide for conducting ethical academic research using social media data, with proper methodology, IRB compliance, and reproducibility standards.

---

## Overview

This guide covers academic research best practices including:

- **IRB considerations** - Ethical review requirements
- **Sampling strategies** - Statistical sampling methods
- **Rate limit compliance** - Responsible data collection
- **Data anonymization** - Privacy protection pipeline
- **Reproducibility** - Standards for replication
- **Publication requirements** - Citation and disclosure

---

## Ethical Framework

### IRB Considerations

!!! warning "Institutional Review Board"
    Most academic institutions require IRB approval for research involving human subjects, including social media data. **Consult your IRB before beginning data collection.**

```python
# research_ethics.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class ResearchProtocol:
    """Document your research protocol for IRB submission."""
    
    # Study Information
    title: str
    principal_investigator: str
    institution: str
    irb_protocol_number: Optional[str] = None
    approval_date: Optional[datetime] = None
    
    # Research Design
    research_questions: list[str] = None
    methodology: str = ""
    
    # Data Collection
    data_types: list[str] = None  # tweets, profiles, etc.
    estimated_sample_size: int = 0
    collection_period: str = ""
    
    # Privacy Protections
    anonymization_method: str = ""
    data_storage: str = ""
    data_retention_period: str = ""
    
    # Risk Assessment
    risks_to_subjects: list[str] = None
    risk_mitigation: list[str] = None
    
    def generate_irb_summary(self) -> str:
        """Generate summary for IRB application."""
        return f"""
# IRB Protocol Summary

## Study Title
{self.title}

## Principal Investigator
{self.principal_investigator}
Institution: {self.institution}

## Research Questions
{chr(10).join(f"- {q}" for q in (self.research_questions or []))}

## Methodology
{self.methodology}

## Data Collection
- Data Types: {', '.join(self.data_types or [])}
- Sample Size: {self.estimated_sample_size:,}
- Collection Period: {self.collection_period}

## Privacy Protections
- Anonymization: {self.anonymization_method}
- Storage: {self.data_storage}
- Retention: {self.data_retention_period}

## Risk Assessment
Risks:
{chr(10).join(f"- {r}" for r in (self.risks_to_subjects or []))}

Mitigation:
{chr(10).join(f"- {m}" for m in (self.risk_mitigation or []))}
"""
```

### Ethical Guidelines

```python
# ethical_guidelines.py

class EthicalGuidelines:
    """Guidelines for ethical social media research."""
    
    PRINCIPLES = [
        "Respect for persons - Protect autonomy and vulnerable populations",
        "Beneficence - Maximize benefits, minimize harm",
        "Justice - Fair distribution of research benefits and burdens",
    ]
    
    REQUIREMENTS = {
        "public_data": {
            "description": "Publicly posted content",
            "irb_required": "Usually - depends on research questions",
            "consent_required": "Generally not for public posts",
            "restrictions": [
                "No contact with users without consent",
                "Cannot use for identifying individuals",
                "Must anonymize before publication"
            ]
        },
        "private_data": {
            "description": "DMs, protected accounts, private groups",
            "irb_required": "Always",
            "consent_required": "Always - explicit opt-in",
            "restrictions": [
                "Requires explicit consent from all parties",
                "Must explain data use clearly",
                "Right to withdraw at any time"
            ]
        }
    }
    
    @staticmethod
    def assess_risk(research_type: str) -> dict:
        """Assess risk level for research type."""
        
        risk_levels = {
            "aggregate_analysis": {
                "level": "minimal",
                "justification": "No individual identification possible",
                "recommended_safeguards": [
                    "Aggregate results only",
                    "Minimum cell size of 10",
                    "No demographic details that could identify"
                ]
            },
            "content_analysis": {
                "level": "low",
                "justification": "Public content, but quotes could identify",
                "recommended_safeguards": [
                    "Paraphrase instead of direct quotes",
                    "Remove usernames and identifying info",
                    "Do not include profile images"
                ]
            },
            "network_analysis": {
                "level": "moderate",
                "justification": "Network structure could reveal identity",
                "recommended_safeguards": [
                    "Aggregate network metrics only",
                    "Do not publish individual connections",
                    "Apply k-anonymity to network data"
                ]
            },
            "longitudinal_tracking": {
                "level": "elevated",
                "justification": "Tracking individuals over time",
                "recommended_safeguards": [
                    "Strong justification required",
                    "Robust anonymization",
                    "Secure data storage with audit logs"
                ]
            }
        }
        
        return risk_levels.get(research_type, {
            "level": "unknown",
            "justification": "Consult IRB",
            "recommended_safeguards": ["Full IRB review recommended"]
        })
```

---

## Sampling Strategies

### Statistical Sampling Methods

```python
# sampling_strategies.py
import random
from datetime import datetime, timedelta
from typing import Optional, Generator
import hashlib

class SamplingStrategy:
    """Implement various sampling strategies for research."""
    
    def __init__(self, seed: int = None):
        """Initialize with optional random seed for reproducibility."""
        self.seed = seed or int(datetime.now().timestamp())
        random.seed(self.seed)
    
    def simple_random_sample(
        self,
        population: list,
        sample_size: int
    ) -> list:
        """Simple random sampling."""
        
        if sample_size >= len(population):
            return population
        
        return random.sample(population, sample_size)
    
    def stratified_sample(
        self,
        population: list,
        strata_key: callable,
        sample_size: int,
        proportional: bool = True
    ) -> list:
        """Stratified sampling by a grouping key."""
        
        # Group by strata
        strata = {}
        for item in population:
            key = strata_key(item)
            if key not in strata:
                strata[key] = []
            strata[key].append(item)
        
        if proportional:
            # Sample proportionally to strata size
            sample = []
            for key, items in strata.items():
                stratum_size = int(len(items) / len(population) * sample_size)
                stratum_size = max(1, stratum_size)  # At least 1 per stratum
                sample.extend(random.sample(items, min(stratum_size, len(items))))
        else:
            # Equal sample from each stratum
            per_stratum = sample_size // len(strata)
            sample = []
            for items in strata.values():
                sample.extend(random.sample(items, min(per_stratum, len(items))))
        
        return sample
    
    def systematic_sample(
        self,
        population: list,
        sample_size: int
    ) -> list:
        """Systematic sampling (every nth item)."""
        
        n = len(population) // sample_size
        start = random.randint(0, n - 1)
        
        return [population[i] for i in range(start, len(population), n)]
    
    def time_stratified_sample(
        self,
        items: list,
        time_key: callable,
        sample_per_period: int,
        period: str = "day"  # hour, day, week, month
    ) -> list:
        """Sample stratified by time period."""
        
        # Group by time period
        def get_period(dt: datetime) -> str:
            if period == "hour":
                return dt.strftime("%Y-%m-%d-%H")
            elif period == "day":
                return dt.strftime("%Y-%m-%d")
            elif period == "week":
                return dt.strftime("%Y-W%W")
            elif period == "month":
                return dt.strftime("%Y-%m")
            return dt.strftime("%Y-%m-%d")
        
        periods = {}
        for item in items:
            p = get_period(time_key(item))
            if p not in periods:
                periods[p] = []
            periods[p].append(item)
        
        # Sample from each period
        sample = []
        for period_items in periods.values():
            n = min(sample_per_period, len(period_items))
            sample.extend(random.sample(period_items, n))
        
        return sample
    
    def quota_sample(
        self,
        population: list,
        quotas: dict[str, int],
        group_key: callable
    ) -> list:
        """Quota sampling based on predefined quotas."""
        
        sample = []
        remaining_quotas = quotas.copy()
        
        # Shuffle for randomness
        shuffled = population.copy()
        random.shuffle(shuffled)
        
        for item in shuffled:
            group = group_key(item)
            
            if group in remaining_quotas and remaining_quotas[group] > 0:
                sample.append(item)
                remaining_quotas[group] -= 1
            
            # Check if all quotas filled
            if all(q <= 0 for q in remaining_quotas.values()):
                break
        
        return sample
```

### Reproducible Sampling

```python
# reproducible_sampling.py

class ReproducibleSampler:
    """Sampler that ensures reproducibility."""
    
    def __init__(
        self,
        seed: int,
        study_id: str
    ):
        self.seed = seed
        self.study_id = study_id
        self.sample_log = []
    
    def deterministic_id_sample(
        self,
        ids: list[str],
        sample_rate: float
    ) -> list[str]:
        """
        Sample based on hash of ID.
        Same IDs always produce same sample.
        """
        
        sampled = []
        
        for id in ids:
            # Create deterministic hash
            hash_input = f"{self.study_id}:{self.seed}:{id}"
            hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
            
            # Normalize to 0-1
            normalized = (hash_value % 10000) / 10000
            
            if normalized < sample_rate:
                sampled.append(id)
        
        return sampled
    
    def log_sample(
        self,
        sample_name: str,
        method: str,
        population_size: int,
        sample_size: int,
        parameters: dict
    ):
        """Log sampling decisions for reproducibility."""
        
        self.sample_log.append({
            'timestamp': datetime.now().isoformat(),
            'sample_name': sample_name,
            'method': method,
            'population_size': population_size,
            'sample_size': sample_size,
            'parameters': parameters,
            'seed': self.seed
        })
    
    def export_log(self) -> str:
        """Export sampling log for publication."""
        
        log = "# Sampling Methodology Log\n\n"
        log += f"Study ID: {self.study_id}\n"
        log += f"Random Seed: {self.seed}\n\n"
        
        for entry in self.sample_log:
            log += f"## {entry['sample_name']}\n"
            log += f"- Method: {entry['method']}\n"
            log += f"- Population: {entry['population_size']:,}\n"
            log += f"- Sample: {entry['sample_size']:,}\n"
            log += f"- Parameters: {entry['parameters']}\n\n"
        
        return log
```

---

## Rate Limit Compliance

### Responsible Collection

```python
# rate_compliant_collector.py
import asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator
import logging

from xeepy import Xeepy

class RateCompliantCollector:
    """Collect data while respecting rate limits."""
    
    def __init__(
        self,
        requests_per_15min: int = 50,  # Conservative limit
        daily_limit: int = 1000,
        log_file: str = "collection_log.txt"
    ):
        self.requests_per_15min = requests_per_15min
        self.daily_limit = daily_limit
        self.request_times: list[datetime] = []
        self.daily_count = 0
        self.last_reset = datetime.now().date()
        
        # Setup logging
        logging.basicConfig(
            filename=log_file,
            level=logging.INFO,
            format='%(asctime)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    async def wait_if_needed(self):
        """Wait if approaching rate limits."""
        
        now = datetime.now()
        
        # Reset daily count if new day
        if now.date() != self.last_reset:
            self.daily_count = 0
            self.last_reset = now.date()
        
        # Check daily limit
        if self.daily_count >= self.daily_limit:
            wait_until = datetime.combine(
                now.date() + timedelta(days=1),
                datetime.min.time()
            )
            wait_seconds = (wait_until - now).total_seconds()
            self.logger.info(f"Daily limit reached. Waiting {wait_seconds/3600:.1f} hours")
            await asyncio.sleep(wait_seconds)
            self.daily_count = 0
        
        # Check 15-minute window
        cutoff = now - timedelta(minutes=15)
        self.request_times = [t for t in self.request_times if t > cutoff]
        
        if len(self.request_times) >= self.requests_per_15min:
            oldest = min(self.request_times)
            wait_until = oldest + timedelta(minutes=15)
            wait_seconds = (wait_until - now).total_seconds()
            
            if wait_seconds > 0:
                self.logger.info(f"Rate limit approaching. Waiting {wait_seconds:.0f}s")
                await asyncio.sleep(wait_seconds)
    
    async def collect_with_backoff(
        self,
        collect_func,
        *args,
        max_retries: int = 3,
        **kwargs
    ):
        """Collect with exponential backoff on failure."""
        
        for attempt in range(max_retries):
            try:
                await self.wait_if_needed()
                
                result = await collect_func(*args, **kwargs)
                
                self.request_times.append(datetime.now())
                self.daily_count += 1
                
                return result
                
            except Exception as e:
                wait_time = (2 ** attempt) * 60  # Exponential backoff
                self.logger.warning(f"Request failed: {e}. Retrying in {wait_time}s")
                await asyncio.sleep(wait_time)
        
        raise Exception(f"Failed after {max_retries} retries")
    
    async def collect_batch(
        self,
        items: list,
        collect_func,
        batch_size: int = 10,
        delay_between: float = 2.0
    ) -> AsyncGenerator:
        """Collect items in batches with delays."""
        
        total = len(items)
        
        for i in range(0, total, batch_size):
            batch = items[i:i + batch_size]
            
            for item in batch:
                result = await self.collect_with_backoff(collect_func, item)
                yield result
                
                await asyncio.sleep(delay_between)
            
            # Progress logging
            progress = min(i + batch_size, total)
            self.logger.info(f"Progress: {progress}/{total} ({progress/total*100:.1f}%)")
    
    def get_collection_stats(self) -> dict:
        """Get collection statistics."""
        
        return {
            'daily_count': self.daily_count,
            'daily_limit': self.daily_limit,
            'requests_last_15min': len(self.request_times),
            'rate_limit_15min': self.requests_per_15min
        }
```

---

## Data Anonymization Pipeline

```python
# anonymization_pipeline.py
import hashlib
import re
from datetime import datetime
from typing import Optional

class AnonymizationPipeline:
    """Pipeline for anonymizing social media data."""
    
    def __init__(self, salt: str = None):
        """Initialize with optional salt for hashing."""
        self.salt = salt or datetime.now().isoformat()
        self.id_mapping: dict[str, str] = {}
    
    def hash_id(self, original_id: str) -> str:
        """Create consistent anonymous ID."""
        
        if original_id in self.id_mapping:
            return self.id_mapping[original_id]
        
        hash_input = f"{self.salt}:{original_id}"
        hashed = hashlib.sha256(hash_input.encode()).hexdigest()[:16]
        
        self.id_mapping[original_id] = hashed
        return hashed
    
    def anonymize_text(self, text: str) -> str:
        """Remove identifying information from text."""
        
        # Remove @mentions
        text = re.sub(r'@\w+', '@[USER]', text)
        
        # Remove URLs
        text = re.sub(r'https?://\S+', '[URL]', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+\.\S+', '[EMAIL]', text)
        
        # Remove phone numbers
        text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
        
        return text
    
    def anonymize_profile(self, profile: dict) -> dict:
        """Anonymize user profile."""
        
        return {
            'anonymous_id': self.hash_id(profile.get('user_id', '')),
            'followers_bucket': self._bucket_followers(profile.get('followers', 0)),
            'account_age_years': self._calculate_age_years(profile.get('created_at')),
            'is_verified': profile.get('verified', False),
            # Do NOT include: username, display_name, bio, location, profile_image
        }
    
    def anonymize_tweet(self, tweet: dict) -> dict:
        """Anonymize tweet data."""
        
        return {
            'anonymous_tweet_id': self.hash_id(tweet.get('tweet_id', '')),
            'anonymous_author_id': self.hash_id(tweet.get('author_id', '')),
            'text_anonymized': self.anonymize_text(tweet.get('text', '')),
            'timestamp_hour': self._round_timestamp(tweet.get('created_at')),
            'engagement_bucket': self._bucket_engagement(
                tweet.get('likes', 0) + tweet.get('retweets', 0)
            ),
            'has_media': bool(tweet.get('media')),
            'language': tweet.get('language'),
            # Do NOT include: exact timestamp, exact engagement counts
        }
    
    def _bucket_followers(self, count: int) -> str:
        """Bucket follower counts to prevent identification."""
        
        if count < 100:
            return "<100"
        elif count < 1000:
            return "100-1K"
        elif count < 10000:
            return "1K-10K"
        elif count < 100000:
            return "10K-100K"
        else:
            return ">100K"
    
    def _bucket_engagement(self, count: int) -> str:
        """Bucket engagement counts."""
        
        if count < 10:
            return "<10"
        elif count < 100:
            return "10-100"
        elif count < 1000:
            return "100-1K"
        else:
            return ">1K"
    
    def _round_timestamp(
        self,
        dt: Optional[datetime]
    ) -> Optional[str]:
        """Round timestamp to hour for privacy."""
        
        if dt is None:
            return None
        
        return dt.replace(minute=0, second=0, microsecond=0).isoformat()
    
    def _calculate_age_years(
        self,
        created_at: Optional[datetime]
    ) -> Optional[int]:
        """Calculate account age in years."""
        
        if created_at is None:
            return None
        
        age = datetime.now() - created_at
        return age.days // 365
    
    def generate_anonymization_report(self) -> str:
        """Generate report of anonymization applied."""
        
        return f"""
# Anonymization Report

## Methods Applied

### ID Anonymization
- Method: SHA-256 hashing with salt
- Mapping preserved: Yes (for linking)
- IDs anonymized: {len(self.id_mapping)}

### Text Anonymization
- @mentions: Replaced with [USER]
- URLs: Replaced with [URL]
- Emails: Replaced with [EMAIL]
- Phone numbers: Replaced with [PHONE]

### Numeric Anonymization
- Follower counts: Bucketed (5 ranges)
- Engagement counts: Bucketed (4 ranges)
- Timestamps: Rounded to hour

### Fields Removed
- Usernames
- Display names
- Bios
- Locations
- Profile images
- Exact counts
- Exact timestamps

## Compliance
- GDPR: Personal data pseudonymized
- Research ethics: Re-identification risk minimized
"""
```

---

## Reproducibility Guidelines

### Code Repository Structure

```
research-project/
├── README.md              # Project overview
├── LICENSE                # Open source license
├── CITATION.cff           # Citation file
├── requirements.txt       # Python dependencies
├── environment.yml        # Conda environment
│
├── data/
│   ├── raw/              # Original collected data (DO NOT COMMIT)
│   ├── processed/        # Anonymized data
│   └── README.md         # Data documentation
│
├── src/
│   ├── collection/       # Data collection scripts
│   ├── processing/       # Data processing
│   ├── analysis/         # Analysis code
│   └── visualization/    # Visualization code
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_analysis.ipynb
│   └── 03_visualization.ipynb
│
├── results/
│   ├── figures/          # Generated figures
│   └── tables/           # Generated tables
│
├── docs/
│   ├── methodology.md    # Detailed methodology
│   ├── codebook.md       # Variable definitions
│   └── ethics.md         # Ethics documentation
│
└── tests/
    └── test_analysis.py  # Unit tests
```

### Documentation Template

```python
# documentation_generator.py

class ResearchDocumentation:
    """Generate research documentation."""
    
    def generate_methodology(
        self,
        collection_params: dict,
        sampling_log: str,
        anonymization_report: str
    ) -> str:
        """Generate methodology documentation."""
        
        return f"""
# Methodology Documentation

## Data Collection

### Source
- Platform: X/Twitter
- Collection Tool: Xeepy v{collection_params.get('version', 'N/A')}
- Collection Period: {collection_params.get('period', 'N/A')}

### Parameters
- Total queries: {collection_params.get('total_queries', 0)}
- Rate limiting: {collection_params.get('rate_limit', 'N/A')}

## Sampling

{sampling_log}

## Anonymization

{anonymization_report}

## Reproducibility

### Random Seeds
- Sampling seed: {collection_params.get('seed', 'N/A')}

### Software Versions
- Python: {collection_params.get('python_version', 'N/A')}
- Xeepy: {collection_params.get('xeepy_version', 'N/A')}

### Code Availability
- Repository: {collection_params.get('repo_url', 'N/A')}
- Commit: {collection_params.get('commit_hash', 'N/A')}
"""
    
    def generate_codebook(self, variables: list[dict]) -> str:
        """Generate variable codebook."""
        
        codebook = "# Codebook\n\n"
        codebook += "| Variable | Type | Description | Values |\n"
        codebook += "|----------|------|-------------|--------|\n"
        
        for var in variables:
            codebook += f"| {var['name']} | {var['type']} | {var['description']} | {var.get('values', 'N/A')} |\n"
        
        return codebook
    
    def generate_citation(self, metadata: dict) -> str:
        """Generate CITATION.cff file."""
        
        return f"""
cff-version: 1.2.0
message: "If you use this dataset, please cite it as below."
authors:
  - family-names: {metadata.get('author_last', '')}
    given-names: {metadata.get('author_first', '')}
    orcid: {metadata.get('orcid', '')}
title: "{metadata.get('title', '')}"
version: {metadata.get('version', '1.0.0')}
doi: {metadata.get('doi', '')}
date-released: {metadata.get('date', '')}
"""
```

---

## Publication Checklist

```python
# publication_checklist.py

PUBLICATION_CHECKLIST = {
    "methodology": [
        "☐ Research questions clearly stated",
        "☐ Data collection methods documented",
        "☐ Sampling strategy explained and justified",
        "☐ Sample size and power analysis reported",
        "☐ Time period of data collection specified",
        "☐ Rate limiting approach documented",
    ],
    "ethics": [
        "☐ IRB approval obtained (if required)",
        "☐ IRB protocol number cited",
        "☐ Consent procedures documented",
        "☐ Anonymization methods described",
        "☐ Risk assessment completed",
        "☐ Data storage and security addressed",
    ],
    "reproducibility": [
        "☐ Code available in public repository",
        "☐ Data available (or explanation why not)",
        "☐ Random seeds documented",
        "☐ Software versions specified",
        "☐ Environment files provided",
        "☐ Analysis pipeline documented",
    ],
    "citation": [
        "☐ Platform (X/Twitter) properly cited",
        "☐ Collection tool (Xeepy) cited",
        "☐ Previous related work cited",
        "☐ CITATION.cff file created",
        "☐ DOI obtained for dataset",
    ],
    "disclosure": [
        "☐ Limitations clearly stated",
        "☐ Potential biases acknowledged",
        "☐ Platform terms of service addressed",
        "☐ Conflicts of interest disclosed",
    ]
}

def print_checklist():
    """Print publication checklist."""
    
    print("=" * 60)
    print("ACADEMIC PUBLICATION CHECKLIST")
    print("=" * 60)
    
    for category, items in PUBLICATION_CHECKLIST.items():
        print(f"\n{category.upper()}")
        print("-" * 40)
        for item in items:
            print(f"  {item}")
    
    print("\n" + "=" * 60)
```

---

## Complete Example

```python
# academic_research_example.py
import asyncio
from datetime import datetime

from xeepy import Xeepy
from research_ethics import ResearchProtocol
from sampling_strategies import SamplingStrategy, ReproducibleSampler
from rate_compliant_collector import RateCompliantCollector
from anonymization_pipeline import AnonymizationPipeline
from documentation_generator import ResearchDocumentation

async def main():
    # 1. Document research protocol
    protocol = ResearchProtocol(
        title="Sentiment Analysis of Tech Industry Discussions",
        principal_investigator="Dr. Jane Smith",
        institution="University of Example",
        research_questions=[
            "How does sentiment vary across tech topics?",
            "What factors predict engagement?"
        ],
        data_types=["tweets", "user_profiles"],
        estimated_sample_size=10000,
        collection_period="2024-01-01 to 2024-03-31",
        anonymization_method="SHA-256 hashing with bucketing",
        data_storage="Encrypted institutional server",
        data_retention_period="5 years",
        risks_to_subjects=["Minimal - public data only"],
        risk_mitigation=["Anonymization", "Aggregate reporting"]
    )
    
    print(protocol.generate_irb_summary())
    
    # 2. Setup reproducible sampling
    SEED = 42
    sampler = ReproducibleSampler(seed=SEED, study_id="TECH-SENT-2024")
    
    # 3. Initialize collector
    collector = RateCompliantCollector(
        requests_per_15min=30,
        daily_limit=500
    )
    
    # 4. Collect data
    async with Xeepy() as x:
        # Search for relevant tweets
        search_queries = ["python programming", "javascript", "machine learning"]
        
        all_tweets = []
        for query in search_queries:
            tweets = await collector.collect_with_backoff(
                x.scrape.search,
                query=query,
                limit=1000
            )
            all_tweets.extend(tweets)
    
    print(f"Collected {len(all_tweets)} tweets")
    
    # 5. Sample
    strategy = SamplingStrategy(seed=SEED)
    sampled = strategy.stratified_sample(
        population=all_tweets,
        strata_key=lambda t: t.created_at.date().month,
        sample_size=1000
    )
    
    sampler.log_sample(
        sample_name="main_sample",
        method="stratified_by_month",
        population_size=len(all_tweets),
        sample_size=len(sampled),
        parameters={'strata': 'month'}
    )
    
    # 6. Anonymize
    pipeline = AnonymizationPipeline(salt=f"TECH-SENT-{SEED}")
    
    anonymized = []
    for tweet in sampled:
        anon_tweet = pipeline.anonymize_tweet({
            'tweet_id': tweet.id,
            'author_id': tweet.author.id,
            'text': tweet.text,
            'created_at': tweet.created_at,
            'likes': tweet.like_count,
            'retweets': tweet.retweet_count,
            'media': tweet.media
        })
        anonymized.append(anon_tweet)
    
    # 7. Generate documentation
    docs = ResearchDocumentation()
    
    methodology = docs.generate_methodology(
        collection_params={
            'version': '1.0.0',
            'period': '2024-01-01 to 2024-03-31',
            'total_queries': len(search_queries),
            'rate_limit': '30 requests/15min',
            'seed': SEED,
            'python_version': '3.11',
            'xeepy_version': '1.0.0'
        },
        sampling_log=sampler.export_log(),
        anonymization_report=pipeline.generate_anonymization_report()
    )
    
    with open("methodology.md", "w") as f:
        f.write(methodology)
    
    print("Research documentation generated!")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Best Practices

!!! warning "Always Consult IRB"
    Even for "public" data, consult your institution's IRB. Requirements vary by institution and jurisdiction.

!!! tip "Reproducibility First"
    Set random seeds, document everything, and use version control from day one.

!!! danger "Privacy Matters"
    Even public tweets can identify individuals. Always anonymize before publication.

---

## Resources

- [ACM Ethics Guidelines](https://www.acm.org/code-of-ethics)
- [AoIR Ethics Guidelines](https://aoir.org/ethics/)
- [GDPR for Researchers](https://gdpr.eu/researchers/)
- [Twitter Research API Terms](https://developer.twitter.com/en/developer-terms)

---

## Related Recipes

- [Brand Monitoring](../business/brand-monitoring.md) - Data collection patterns
- [Sentiment Analysis](../../guides/ai/sentiment.md) - Analysis methods
- [Data Export](../../guides/export/index.md) - Data export
