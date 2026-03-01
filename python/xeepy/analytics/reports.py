"""
Report generator - generate comprehensive analytics reports.

Create formatted reports for various analytics data.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class ReportSection:
    """A section of a report"""
    title: str
    content: str
    data: Optional[dict] = None
    chart_data: Optional[dict] = None


@dataclass
class Report:
    """A complete analytics report"""
    title: str
    generated_at: datetime
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    sections: List[ReportSection] = field(default_factory=list)
    summary: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "generated_at": self.generated_at.isoformat(),
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "sections": [
                {"title": s.title, "content": s.content, "data": s.data}
                for s in self.sections
            ],
            "summary": self.summary,
            "metadata": self.metadata,
        }
    
    def to_markdown(self) -> str:
        """Export report as Markdown"""
        lines = [
            f"# {self.title}",
            "",
            f"*Generated: {self.generated_at.strftime('%Y-%m-%d %H:%M:%S')}*",
            "",
        ]
        
        if self.period_start and self.period_end:
            lines.extend([
                f"**Period:** {self.period_start.strftime('%Y-%m-%d')} to {self.period_end.strftime('%Y-%m-%d')}",
                "",
            ])
        
        if self.summary:
            lines.extend([
                "## Summary",
                "",
                self.summary,
                "",
            ])
        
        for section in self.sections:
            lines.extend([
                f"## {section.title}",
                "",
                section.content,
                "",
            ])
            
            if section.data:
                lines.append("### Data")
                lines.append("")
                lines.append("```json")
                lines.append(json.dumps(section.data, indent=2, default=str))
                lines.append("```")
                lines.append("")
        
        return "\n".join(lines)
    
    def to_html(self) -> str:
        """Export report as HTML"""
        html_parts = [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            f"<title>{self.title}</title>",
            "<style>",
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }",
            "h1 { color: #1DA1F2; }",
            "h2 { color: #14171A; border-bottom: 2px solid #E1E8ED; padding-bottom: 8px; }",
            ".meta { color: #657786; font-size: 14px; }",
            ".summary { background: #F5F8FA; padding: 15px; border-radius: 8px; margin: 20px 0; }",
            ".section { margin: 30px 0; }",
            "table { width: 100%; border-collapse: collapse; margin: 15px 0; }",
            "th, td { padding: 10px; text-align: left; border-bottom: 1px solid #E1E8ED; }",
            "th { background: #F5F8FA; }",
            ".chart { background: #F5F8FA; padding: 20px; border-radius: 8px; text-align: center; }",
            "</style>",
            "</head>",
            "<body>",
            f"<h1>📊 {self.title}</h1>",
            f"<p class='meta'>Generated: {self.generated_at.strftime('%Y-%m-%d %H:%M:%S')}</p>",
        ]
        
        if self.period_start and self.period_end:
            html_parts.append(
                f"<p class='meta'>Period: {self.period_start.strftime('%Y-%m-%d')} to {self.period_end.strftime('%Y-%m-%d')}</p>"
            )
        
        if self.summary:
            html_parts.extend([
                "<div class='summary'>",
                f"<strong>Summary:</strong> {self.summary}",
                "</div>",
            ])
        
        for section in self.sections:
            html_parts.extend([
                "<div class='section'>",
                f"<h2>{section.title}</h2>",
                f"<p>{section.content}</p>",
            ])
            
            if section.data:
                html_parts.append("<table>")
                for key, value in section.data.items():
                    if not isinstance(value, (dict, list)):
                        html_parts.append(f"<tr><td><strong>{key}</strong></td><td>{value}</td></tr>")
                html_parts.append("</table>")
            
            html_parts.append("</div>")
        
        html_parts.extend([
            "</body>",
            "</html>",
        ])
        
        return "\n".join(html_parts)
    
    def save(self, path: str, format: str = "auto") -> str:
        """
        Save report to file.
        
        Args:
            path: Output file path
            format: Output format (auto, json, md, html)
            
        Returns:
            Path to saved file
        """
        if format == "auto":
            if path.endswith(".json"):
                format = "json"
            elif path.endswith(".html"):
                format = "html"
            else:
                format = "md"
        
        if format == "json":
            content = json.dumps(self.to_dict(), indent=2, default=str)
        elif format == "html":
            content = self.to_html()
        else:
            content = self.to_markdown()
        
        with open(path, 'w') as f:
            f.write(content)
        
        return path


class ReportGenerator:
    """
    Generate comprehensive analytics reports.
    
    Combines data from various analytics sources into
    formatted reports that can be exported as Markdown,
    HTML, or JSON.
    
    Example:
        generator = ReportGenerator()
        
        # Build report
        report = generator.create_growth_report(
            username="myaccount",
            growth_data=growth_tracker.generate_report("myaccount"),
        )
        
        # Save report
        report.save("growth_report.html")
        
        # Or get as markdown
        print(report.to_markdown())
    """
    
    def __init__(self):
        """Initialize report generator"""
        pass
    
    def create_report(
        self,
        title: str,
        sections: List[ReportSection],
        summary: Optional[str] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        metadata: Optional[dict] = None,
    ) -> Report:
        """
        Create a custom report.
        
        Args:
            title: Report title
            sections: List of report sections
            summary: Executive summary
            period_start: Report period start
            period_end: Report period end
            metadata: Additional metadata
            
        Returns:
            Report object
        """
        return Report(
            title=title,
            generated_at=datetime.utcnow(),
            period_start=period_start,
            period_end=period_end,
            sections=sections,
            summary=summary or "",
            metadata=metadata or {},
        )
    
    def create_growth_report(
        self,
        username: str,
        growth_data: Any,
        period_days: int = 30,
    ) -> Report:
        """
        Create a follower growth report.
        
        Args:
            username: Account username
            growth_data: GrowthReport from GrowthTracker
            period_days: Report period
            
        Returns:
            Formatted Report
        """
        sections = []
        
        # Overview section
        overview_content = f"""
Your account @{username} had a net change of {growth_data.net_change:+,} followers 
over the past {period_days} days, representing a {growth_data.change_percentage:+.1f}% change.

- Starting followers: {growth_data.start_followers:,}
- Ending followers: {growth_data.end_followers:,}
- Average daily growth: {growth_data.avg_daily_growth:+.1f}
- Growth trend: {growth_data.growth_trend}
"""
        
        sections.append(ReportSection(
            title="Overview",
            content=overview_content.strip(),
            data={
                "start_followers": growth_data.start_followers,
                "end_followers": growth_data.end_followers,
                "net_change": growth_data.net_change,
                "change_percentage": f"{growth_data.change_percentage:+.1f}%",
                "avg_daily_growth": growth_data.avg_daily_growth,
                "trend": growth_data.growth_trend,
            },
        ))
        
        # Best/worst days
        if growth_data.best_day:
            days_content = f"""
**Best Day:** {growth_data.best_day.get('date', 'N/A')} (+{growth_data.best_day.get('change', 0):,} followers)

**Worst Day:** {growth_data.worst_day.get('date', 'N/A') if growth_data.worst_day else 'N/A'} ({growth_data.worst_day.get('change', 0):+,} followers)
"""
            sections.append(ReportSection(
                title="Notable Days",
                content=days_content.strip(),
            ))
        
        # Summary
        if growth_data.growth_trend == "growing":
            summary = f"Great progress! Your account is growing at {growth_data.avg_daily_growth:+.1f} followers per day."
        elif growth_data.growth_trend == "declining":
            summary = f"Your follower count has been declining. Consider reviewing your content strategy."
        else:
            summary = f"Your follower count has been relatively stable over this period."
        
        return Report(
            title=f"Growth Report: @{username}",
            generated_at=datetime.utcnow(),
            period_start=datetime.utcnow() - timedelta(days=period_days),
            period_end=datetime.utcnow(),
            sections=sections,
            summary=summary,
            metadata={"username": username, "period_days": period_days},
        )
    
    def create_engagement_report(
        self,
        username: str,
        engagement_data: Any,
    ) -> Report:
        """
        Create an engagement analytics report.
        
        Args:
            username: Account username
            engagement_data: EngagementReport from EngagementAnalytics
            
        Returns:
            Formatted Report
        """
        sections = []
        
        # Overview
        overview_content = f"""
Analysis of {engagement_data.total_tweets_analyzed} recent tweets from @{username}.

**Average Metrics:**
- Likes: {engagement_data.avg_likes:.1f}
- Retweets: {engagement_data.avg_retweets:.1f}
- Replies: {engagement_data.avg_replies:.1f}
- Engagement Rate: {engagement_data.avg_engagement_rate:.2f}%
"""
        
        sections.append(ReportSection(
            title="Engagement Overview",
            content=overview_content.strip(),
            data={
                "tweets_analyzed": engagement_data.total_tweets_analyzed,
                "avg_likes": engagement_data.avg_likes,
                "avg_retweets": engagement_data.avg_retweets,
                "avg_replies": engagement_data.avg_replies,
                "engagement_rate": f"{engagement_data.avg_engagement_rate:.2f}%",
            },
        ))
        
        # Top tweets
        if engagement_data.top_tweets:
            top_content = "Your best performing tweets:\n\n"
            for i, tweet in enumerate(engagement_data.top_tweets[:3], 1):
                top_content += f"{i}. \"{tweet.get('text', '')[:50]}...\" - {tweet.get('engagement', 0):,} engagements\n"
            
            sections.append(ReportSection(
                title="Top Performing Content",
                content=top_content.strip(),
            ))
        
        # Best times
        if engagement_data.engagement_by_hour:
            sorted_hours = sorted(
                engagement_data.engagement_by_hour.items(),
                key=lambda x: x[1],
                reverse=True,
            )
            
            best_hours = sorted_hours[:3]
            times_content = "Best times to post based on your engagement data:\n\n"
            for hour, engagement in best_hours:
                am_pm = "AM" if hour < 12 else "PM"
                h12 = hour % 12 or 12
                times_content += f"- {h12}:00 {am_pm} (avg engagement: {engagement:.0f})\n"
            
            sections.append(ReportSection(
                title="Optimal Posting Times",
                content=times_content.strip(),
                data={"engagement_by_hour": engagement_data.engagement_by_hour},
            ))
        
        summary = f"Analyzed {engagement_data.total_tweets_analyzed} tweets with an average engagement rate of {engagement_data.avg_engagement_rate:.2f}%."
        
        return Report(
            title=f"Engagement Report: @{username}",
            generated_at=datetime.utcnow(),
            sections=sections,
            summary=summary,
            metadata={"username": username},
        )
    
    def create_competitor_report(
        self,
        competitor_data: Any,
    ) -> Report:
        """
        Create a competitor analysis report.
        
        Args:
            competitor_data: CompetitorReport from CompetitorAnalyzer
            
        Returns:
            Formatted Report
        """
        sections = []
        
        your = competitor_data.your_account
        
        # Your stats
        your_content = f"""
**@{your.username}**
- Followers: {your.followers_count:,}
- Engagement Rate: {your.engagement_rate:.2f}%
- Avg Likes: {your.avg_likes:.0f}
- Avg Retweets: {your.avg_retweets:.0f}
"""
        
        sections.append(ReportSection(
            title="Your Account",
            content=your_content.strip(),
            data=your.to_dict(),
        ))
        
        # Competitor comparison
        comp_content = "How you compare to competitors:\n\n"
        
        for comp in competitor_data.competitors:
            comp_content += f"""
**@{comp.username}**
- Followers: {comp.followers_count:,} ({'+' if comp.followers_count > your.followers_count else ''}{comp.followers_count - your.followers_count:,} vs you)
- Engagement Rate: {comp.engagement_rate:.2f}%
"""
        
        sections.append(ReportSection(
            title="Competitor Comparison",
            content=comp_content.strip(),
        ))
        
        # Strengths and weaknesses
        if competitor_data.your_strengths:
            strengths_content = "\n".join(f"✅ {s}" for s in competitor_data.your_strengths)
            sections.append(ReportSection(
                title="Your Strengths",
                content=strengths_content,
            ))
        
        if competitor_data.opportunities:
            opps_content = "\n".join(f"📈 {o}" for o in competitor_data.opportunities)
            sections.append(ReportSection(
                title="Opportunities",
                content=opps_content,
            ))
        
        summary = f"Competitive analysis of @{your.username} against {len(competitor_data.competitors)} competitors."
        
        return Report(
            title=f"Competitor Analysis: @{your.username}",
            generated_at=datetime.utcnow(),
            sections=sections,
            summary=summary,
        )
    
    def create_audience_report(
        self,
        username: str,
        audience_data: Any,
    ) -> Report:
        """
        Create an audience insights report.
        
        Args:
            username: Account username
            audience_data: AudienceReport from AudienceInsights
            
        Returns:
            Formatted Report
        """
        sections = []
        
        # Demographics overview
        demo_content = f"""
Analysis of {audience_data.sample_size:,} followers (out of {audience_data.total_followers:,} total).

**Follower Quality:**
- Verified accounts: {audience_data.verified_percentage:.1f}%
- Active (recently posted): {audience_data.active_percentage:.1f}%
- Likely bots: {audience_data.likely_bots_percentage:.1f}%

**Follower Stats:**
- Average follower count: {audience_data.avg_follower_count:,.0f}
- Average following count: {audience_data.avg_following_count:,.0f}
- Average account age: {audience_data.avg_account_age_days:.0f} days
"""
        
        sections.append(ReportSection(
            title="Demographics Overview",
            content=demo_content.strip(),
            data={
                "total_followers": audience_data.total_followers,
                "sample_size": audience_data.sample_size,
                "verified_pct": f"{audience_data.verified_percentage:.1f}%",
                "active_pct": f"{audience_data.active_percentage:.1f}%",
                "bots_pct": f"{audience_data.likely_bots_percentage:.1f}%",
            },
        ))
        
        # Locations
        if audience_data.locations:
            sorted_locs = sorted(
                audience_data.locations.items(),
                key=lambda x: x[1],
                reverse=True,
            )[:10]
            
            loc_content = "Top locations of your followers:\n\n"
            for loc, count in sorted_locs:
                pct = count / audience_data.sample_size * 100
                loc_content += f"- {loc}: {pct:.1f}%\n"
            
            sections.append(ReportSection(
                title="Geographic Distribution",
                content=loc_content.strip(),
                data=dict(sorted_locs),
            ))
        
        # Interests
        if audience_data.common_bio_keywords:
            interests_content = "Common interests based on bio analysis:\n\n"
            for keyword, count in audience_data.common_bio_keywords[:15]:
                pct = count / audience_data.sample_size * 100
                interests_content += f"- {keyword}: {pct:.1f}%\n"
            
            sections.append(ReportSection(
                title="Audience Interests",
                content=interests_content.strip(),
            ))
        
        # Distribution
        if audience_data.follower_distribution:
            dist_content = "Follower size distribution:\n\n"
            for bucket, count in audience_data.follower_distribution.items():
                pct = count / audience_data.sample_size * 100
                dist_content += f"- {bucket}: {pct:.1f}%\n"
            
            sections.append(ReportSection(
                title="Follower Size Distribution",
                content=dist_content.strip(),
                data=audience_data.follower_distribution,
            ))
        
        summary = f"Audience analysis of @{username} based on {audience_data.sample_size:,} followers."
        
        return Report(
            title=f"Audience Report: @{username}",
            generated_at=datetime.utcnow(),
            sections=sections,
            summary=summary,
            metadata={"username": username},
        )
    
    def create_combined_report(
        self,
        username: str,
        growth_data: Optional[Any] = None,
        engagement_data: Optional[Any] = None,
        audience_data: Optional[Any] = None,
    ) -> Report:
        """
        Create a combined comprehensive report.
        
        Args:
            username: Account username
            growth_data: Optional growth data
            engagement_data: Optional engagement data
            audience_data: Optional audience data
            
        Returns:
            Combined Report
        """
        sections = []
        summary_parts = []
        
        if growth_data:
            sections.append(ReportSection(
                title="Growth Overview",
                content=f"Net change: {growth_data.net_change:+,} followers ({growth_data.change_percentage:+.1f}%)",
                data={
                    "start": growth_data.start_followers,
                    "end": growth_data.end_followers,
                    "change": growth_data.net_change,
                },
            ))
            summary_parts.append(f"{growth_data.net_change:+,} follower growth")
        
        if engagement_data:
            sections.append(ReportSection(
                title="Engagement Overview",
                content=f"Average engagement rate: {engagement_data.avg_engagement_rate:.2f}%",
                data={
                    "avg_likes": engagement_data.avg_likes,
                    "avg_retweets": engagement_data.avg_retweets,
                    "engagement_rate": f"{engagement_data.avg_engagement_rate:.2f}%",
                },
            ))
            summary_parts.append(f"{engagement_data.avg_engagement_rate:.2f}% engagement rate")
        
        if audience_data:
            sections.append(ReportSection(
                title="Audience Overview",
                content=f"Analyzed {audience_data.sample_size:,} of {audience_data.total_followers:,} followers",
                data={
                    "verified_pct": f"{audience_data.verified_percentage:.1f}%",
                    "active_pct": f"{audience_data.active_percentage:.1f}%",
                },
            ))
            summary_parts.append(f"{audience_data.total_followers:,} total followers")
        
        summary = f"@{username}: " + ", ".join(summary_parts) if summary_parts else f"Report for @{username}"
        
        return Report(
            title=f"Analytics Dashboard: @{username}",
            generated_at=datetime.utcnow(),
            sections=sections,
            summary=summary,
            metadata={"username": username},
        )


# Import timedelta for use in reports
from datetime import timedelta
