// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Notification Hub
 * Send alerts to Email, Slack, Discord, and Telegram.
 *
 * Kills: Phantombuster (email alerts), Circleboom (Slack)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ============================================================================
// Notifier Class
// ============================================================================

export class Notifier {
  constructor() {
    this.config = { email: { enabled: false }, slack: { enabled: false }, discord: { enabled: false }, telegram: { enabled: false } };
  }

  /**
   * Configure notification channels
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this._saveConfig();
    return { status: 'configured', channels: Object.entries(this.config).filter(([, v]) => v.enabled).map(([k]) => k) };
  }

  /**
   * Load config from disk
   */
  async load() {
    try {
      const data = JSON.parse(await fsp.readFile(CONFIG_FILE, 'utf-8'));
      if (data.notifications) {
        this.config = data.notifications;
      }
    } catch { /* no config yet */ }
    return this;
  }

  /**
   * Send notification to all enabled channels
   */
  async send(event) {
    const { type = 'info', title = 'XActions Notification', message, data, severity = 'info' } = event;
    const results = {};

    for (const [channel, config] of Object.entries(this.config)) {
      if (!config.enabled) continue;

      try {
        switch (channel) {
          case 'email':
            results.email = await this._sendEmail(config, { type, title, message, severity });
            break;
          case 'slack':
            results.slack = await this._sendSlack(config, { type, title, message, severity });
            break;
          case 'discord':
            results.discord = await this._sendDiscord(config, { type, title, message, severity });
            break;
          case 'telegram':
            results.telegram = await this._sendTelegram(config, { type, title, message, severity });
            break;
        }
      } catch (error) {
        results[channel] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Send to a specific channel
   */
  async sendTo(channel, event) {
    const config = this.config[channel];
    if (!config?.enabled) return { error: `Channel "${channel}" not configured or not enabled` };

    return this.send({ ...event, _channel: channel });
  }

  /**
   * Send test notification
   */
  async test(channel) {
    return this.sendTo(channel, {
      type: 'test',
      title: '🧪 XActions Test Notification',
      message: `This is a test notification from XActions. If you see this, ${channel} is configured correctly!`,
      severity: 'info',
    });
  }

  // ── Channel Implementations ──

  async _sendEmail(config, event) {
    const { smtp, to } = config;
    if (!smtp || !to) return { error: 'Email not fully configured (need smtp + to)' };

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtp.host,
        port: smtp.port || 587,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      const severityEmoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #000; color: #fff; padding: 16px 20px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0;">⚡ XActions</h2>
          </div>
          <div style="background: #1a1a1a; color: #e0e0e0; padding: 20px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 14px; color: #888;">${severityEmoji[event.severity] || ''} ${event.severity.toUpperCase()}</p>
            <h3 style="color: #1d9bf0;">${event.title}</h3>
            <p>${event.message}</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: smtp.user,
        to,
        subject: `${severityEmoji[event.severity] || ''} ${event.title}`,
        html,
      });

      return { status: 'sent', channel: 'email' };
    } catch (error) {
      return { error: `Email send failed: ${error.message}` };
    }
  }

  async _sendSlack(config, event) {
    const { webhookUrl } = config;
    if (!webhookUrl) return { error: 'Slack webhook URL not configured' };

    const severityColor = { info: '#1d9bf0', warning: '#ffb800', critical: '#ff4444' };
    const payload = {
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: `⚡ ${event.title}` } },
        { type: 'section', text: { type: 'mrkdwn', text: event.message } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `_${event.severity}_ | XActions | ${new Date().toISOString()}` }] },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Slack webhook failed: ${response.status}`);
    return { status: 'sent', channel: 'slack' };
  }

  async _sendDiscord(config, event) {
    const { webhookUrl } = config;
    if (!webhookUrl) return { error: 'Discord webhook URL not configured' };

    const severityColor = { info: 0x1d9bf0, warning: 0xffb800, critical: 0xff4444 };
    const payload = {
      embeds: [{
        title: `⚡ ${event.title}`,
        description: event.message,
        color: severityColor[event.severity] || 0x1d9bf0,
        footer: { text: `XActions | ${event.severity}` },
        timestamp: new Date().toISOString(),
      }],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Discord webhook failed: ${response.status}`);
    return { status: 'sent', channel: 'discord' };
  }

  async _sendTelegram(config, event) {
    const { botToken, chatId } = config;
    if (!botToken || !chatId) return { error: 'Telegram bot token and chat ID required' };

    const severityEmoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };
    const text = `${severityEmoji[event.severity] || ''} *${event.title}*\n\n${event.message}\n\n_XActions • ${event.severity}_`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) throw new Error(`Telegram API failed: ${response.status}`);
    return { status: 'sent', channel: 'telegram' };
  }

  // ── Config Persistence ──

  async _saveConfig() {
    try {
      let data = {};
      try { data = JSON.parse(await fsp.readFile(CONFIG_FILE, 'utf-8')); } catch { /* new config */ }
      data.notifications = this.config;
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      await fsp.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`⚠️  Could not save notification config: ${error.message}`);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance = null;

export async function getNotifier() {
  if (!_instance) {
    _instance = new Notifier();
    await _instance.load();
  }
  return _instance;
}

// ============================================================================
// Pre-built notification triggers
// ============================================================================

export const TRIGGERS = {
  SENTIMENT_DROP: { type: 'reputation', title: '⚠️ Sentiment Drop', severity: 'warning' },
  FOLLOWER_LOSS: { type: 'followers', title: '📉 Follower Loss', severity: 'info' },
  BULK_COMPLETE: { type: 'bulk', title: '✅ Bulk Operation Complete', severity: 'info' },
  JOB_FAILURE: { type: 'scheduler', title: '❌ Scheduled Job Failed', severity: 'critical' },
  MILESTONE: { type: 'milestone', title: '🎉 Follower Milestone!', severity: 'info' },
  GROWTH_SPIKE: { type: 'growth', title: '📈 Unusual Growth Spike', severity: 'info' },
  KEYWORD_MATCH: { type: 'stream', title: '🔔 Keyword Match', severity: 'info' },
};

// by nichxbt
