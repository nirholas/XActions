"""
Email notification handler.

Send notifications via email using SMTP.
"""

import smtplib
import ssl
from dataclasses import dataclass, field
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional


@dataclass
class EmailConfig:
    """Email configuration"""
    smtp_host: str
    smtp_port: int
    username: str
    password: str
    from_address: str
    to_addresses: List[str]
    use_tls: bool = True
    use_ssl: bool = False
    subject_prefix: str = "[Xeepy]"
    
    @classmethod
    def from_env(cls, prefix: str = "XEEPY_EMAIL") -> "EmailConfig":
        """
        Load email configuration from environment variables.
        
        Expected variables:
        - {prefix}_SMTP_HOST
        - {prefix}_SMTP_PORT
        - {prefix}_USERNAME
        - {prefix}_PASSWORD
        - {prefix}_FROM
        - {prefix}_TO (comma-separated)
        """
        import os
        
        to_str = os.environ.get(f"{prefix}_TO", "")
        to_addresses = [addr.strip() for addr in to_str.split(",") if addr.strip()]
        
        return cls(
            smtp_host=os.environ.get(f"{prefix}_SMTP_HOST", "smtp.gmail.com"),
            smtp_port=int(os.environ.get(f"{prefix}_SMTP_PORT", "587")),
            username=os.environ.get(f"{prefix}_USERNAME", ""),
            password=os.environ.get(f"{prefix}_PASSWORD", ""),
            from_address=os.environ.get(f"{prefix}_FROM", ""),
            to_addresses=to_addresses,
            use_tls=os.environ.get(f"{prefix}_USE_TLS", "true").lower() == "true",
            use_ssl=os.environ.get(f"{prefix}_USE_SSL", "false").lower() == "true",
        )


@dataclass
class EmailTemplate:
    """Email template for notifications"""
    subject: str
    body_text: str
    body_html: Optional[str] = None


class EmailNotifier:
    """
    Email notification handler.
    
    Sends formatted email notifications for various events.
    
    Example:
        config = EmailConfig(
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            username="your@email.com",
            password="app_password",
            from_address="your@email.com",
            to_addresses=["notify@email.com"],
        )
        notifier = EmailNotifier(config)
        await notifier.notify("unfollower_detected", "User @example unfollowed you")
    """
    
    # Default templates for events
    TEMPLATES = {
        "unfollower_detected": EmailTemplate(
            subject="Unfollower Alert",
            body_text="Unfollower detected:\n\n{message}\n\n{details}",
            body_html="""
            <html>
            <body>
            <h2>🚨 Unfollower Alert</h2>
            <p>{message}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                {details_html}
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent by Xeepy Monitoring</p>
            </body>
            </html>
            """,
        ),
        "new_follower": EmailTemplate(
            subject="New Follower",
            body_text="New follower notification:\n\n{message}\n\n{details}",
            body_html="""
            <html>
            <body>
            <h2>✅ New Follower</h2>
            <p>{message}</p>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
                {details_html}
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent by Xeepy Monitoring</p>
            </body>
            </html>
            """,
        ),
        "keyword_match": EmailTemplate(
            subject="Keyword Match Found",
            body_text="Keyword match detected:\n\n{message}\n\n{details}",
            body_html="""
            <html>
            <body>
            <h2>🔍 Keyword Match Found</h2>
            <p>{message}</p>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                {details_html}
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent by Xeepy Monitoring</p>
            </body>
            </html>
            """,
        ),
        "account_change": EmailTemplate(
            subject="Account Change Detected",
            body_text="Account change detected:\n\n{message}\n\n{details}",
            body_html="""
            <html>
            <body>
            <h2>⚠️ Account Change Detected</h2>
            <p>{message}</p>
            <div style="background: #fff3e0; padding: 15px; border-radius: 5px;">
                {details_html}
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent by Xeepy Monitoring</p>
            </body>
            </html>
            """,
        ),
        "daily_report": EmailTemplate(
            subject="Daily Analytics Report",
            body_text="Your daily analytics report:\n\n{message}\n\n{details}",
            body_html="""
            <html>
            <body>
            <h2>📊 Daily Analytics Report</h2>
            <p>{message}</p>
            {details_html}
            <hr>
            <p style="color: #666; font-size: 12px;">Sent by Xeepy Analytics</p>
            </body>
            </html>
            """,
        ),
        "default": EmailTemplate(
            subject="Notification",
            body_text="{message}\n\n{details}",
            body_html="""
            <html>
            <body>
            <h2>📬 Notification</h2>
            <p>{message}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                {details_html}
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent by Xeepy</p>
            </body>
            </html>
            """,
        ),
    }
    
    def __init__(self, config: EmailConfig):
        """
        Initialize email notifier.
        
        Args:
            config: Email configuration
        """
        self.config = config
        self._connection: Optional[smtplib.SMTP] = None
    
    def _format_details(self, data: Optional[Dict[str, Any]]) -> str:
        """Format data dict as plain text"""
        if not data:
            return ""
        
        lines = []
        for key, value in data.items():
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            lines.append(f"• {key}: {value}")
        
        return "\n".join(lines)
    
    def _format_details_html(self, data: Optional[Dict[str, Any]]) -> str:
        """Format data dict as HTML"""
        if not data:
            return ""
        
        lines = []
        for key, value in data.items():
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            lines.append(f"<p><strong>{key}:</strong> {value}</p>")
        
        return "\n".join(lines)
    
    def _create_message(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> MIMEMultipart:
        """Create email message"""
        template = self.TEMPLATES.get(event, self.TEMPLATES["default"])
        
        details = self._format_details(data)
        details_html = self._format_details_html(data)
        
        # Create message container
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{self.config.subject_prefix} {template.subject}"
        msg["From"] = self.config.from_address
        msg["To"] = ", ".join(self.config.to_addresses)
        
        # Plain text version
        text_body = template.body_text.format(
            message=message,
            details=details,
        )
        msg.attach(MIMEText(text_body, "plain"))
        
        # HTML version
        if template.body_html:
            html_body = template.body_html.format(
                message=message,
                details_html=details_html,
            )
            msg.attach(MIMEText(html_body, "html"))
        
        return msg
    
    def _get_connection(self) -> smtplib.SMTP:
        """Get or create SMTP connection"""
        if self.config.use_ssl:
            context = ssl.create_default_context()
            connection = smtplib.SMTP_SSL(
                self.config.smtp_host,
                self.config.smtp_port,
                context=context,
            )
        else:
            connection = smtplib.SMTP(
                self.config.smtp_host,
                self.config.smtp_port,
            )
            
            if self.config.use_tls:
                context = ssl.create_default_context()
                connection.starttls(context=context)
        
        connection.login(self.config.username, self.config.password)
        return connection
    
    async def notify(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send an email notification.
        
        Args:
            event: Event type identifier
            message: Notification message
            data: Additional data to include
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.config.to_addresses:
            return False
        
        try:
            msg = self._create_message(event, message, data)
            
            with self._get_connection() as connection:
                connection.send_message(msg)
            
            return True
            
        except Exception as e:
            # Log error but don't raise
            print(f"Email notification failed: {e}")
            return False
    
    async def send_custom(
        self,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        to_addresses: Optional[List[str]] = None,
    ) -> bool:
        """
        Send a custom email.
        
        Args:
            subject: Email subject
            body_text: Plain text body
            body_html: HTML body (optional)
            to_addresses: Override recipients (optional)
            
        Returns:
            True if sent successfully
        """
        recipients = to_addresses or self.config.to_addresses
        if not recipients:
            return False
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"{self.config.subject_prefix} {subject}"
            msg["From"] = self.config.from_address
            msg["To"] = ", ".join(recipients)
            
            msg.attach(MIMEText(body_text, "plain"))
            
            if body_html:
                msg.attach(MIMEText(body_html, "html"))
            
            with self._get_connection() as connection:
                connection.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Email notification failed: {e}")
            return False
    
    async def send_report(
        self,
        report_title: str,
        report_data: Dict[str, Any],
        summary: str,
    ) -> bool:
        """
        Send an analytics report email.
        
        Args:
            report_title: Report title
            report_data: Report data dictionary
            summary: Text summary of the report
            
        Returns:
            True if sent successfully
        """
        # Build HTML report
        html_sections = []
        for section, data in report_data.items():
            html_sections.append(f"<h3>{section}</h3>")
            
            if isinstance(data, dict):
                html_sections.append("<table style='border-collapse: collapse; width: 100%;'>")
                for key, value in data.items():
                    html_sections.append(
                        f"<tr><td style='border: 1px solid #ddd; padding: 8px;'>{key}</td>"
                        f"<td style='border: 1px solid #ddd; padding: 8px;'>{value}</td></tr>"
                    )
                html_sections.append("</table>")
            elif isinstance(data, list):
                html_sections.append("<ul>")
                for item in data:
                    html_sections.append(f"<li>{item}</li>")
                html_sections.append("</ul>")
            else:
                html_sections.append(f"<p>{data}</p>")
        
        body_html = f"""
        <html>
        <body>
        <h2>📊 {report_title}</h2>
        <p><em>{summary}</em></p>
        {"".join(html_sections)}
        <hr>
        <p style="color: #666; font-size: 12px;">
            Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} by Xeepy
        </p>
        </body>
        </html>
        """
        
        # Plain text version
        text_lines = [report_title, "=" * len(report_title), "", summary, ""]
        for section, data in report_data.items():
            text_lines.append(f"\n{section}")
            text_lines.append("-" * len(section))
            if isinstance(data, dict):
                for key, value in data.items():
                    text_lines.append(f"  {key}: {value}")
            elif isinstance(data, list):
                for item in data:
                    text_lines.append(f"  • {item}")
            else:
                text_lines.append(f"  {data}")
        
        return await self.send_custom(
            subject=report_title,
            body_text="\n".join(text_lines),
            body_html=body_html,
        )
