/**
 * TweetVideo — Animated tweet card video
 * Use case: Share a tweet as a video for TikTok, Reels, Shorts.
 *
 * Input props:
 *   author, handle, text, likes, retweets, replies, verified, avatar
 *
 * @author nich (@nichxbt)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { theme } from '../utils/theme.js';
import { FadeIn, SlideIn, Counter, Logo, Avatar, Watermark } from '../components/Shared.jsx';

export const TweetVideo = ({
  author = 'nich',
  handle = '@nichxbt',
  text = 'Just built an open-source Twitter automation toolkit. No API fees. 100% free.\n\nXActions: scrapers, MCP server, CLI, browser scripts.\n\ngithub.com/nirholas/XActions',
  likes = 4280,
  retweets = 1340,
  replies = 312,
  verified = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background glow pulse
  const glowScale = interpolate(Math.sin(frame / 30), [-1, 1], [0.95, 1.05]);

  return (
    <AbsoluteFill style={{
      background: theme.bg,
      fontFamily: theme.fontFamily,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accentGlow}, transparent 70%)`,
        transform: `scale(${glowScale})`,
        filter: 'blur(60px)',
      }} />

      {/* Tweet card */}
      <SlideIn from="bottom" delay={5} style={{
        background: theme.bgCard,
        borderRadius: 24,
        padding: 40,
        maxWidth: 680,
        width: '80%',
        border: `1px solid ${theme.border}`,
        boxShadow: `0 0 80px ${theme.accentGlow}`,
        position: 'relative',
      }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar name={author} size={56} delay={10} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{author}</span>
              {verified && <span style={{ fontSize: 18, color: theme.accent }}>✓</span>}
            </div>
            <span style={{ fontSize: 18, color: theme.textSecondary }}>{handle}</span>
          </div>
        </div>

        {/* Tweet text */}
        <FadeIn delay={18} style={{ fontSize: 26, color: theme.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 24 }}>
          {text}
        </FadeIn>

        {/* Engagement stats */}
        <FadeIn delay={35} style={{ display: 'flex', gap: 40, paddingTop: 20, borderTop: `1px solid ${theme.border}` }}>
          <div style={{ textAlign: 'center' }}>
            <Counter value={replies} fontSize={28} color={theme.text} delay={40} />
            <div style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>Replies</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Counter value={retweets} fontSize={28} color={theme.green} delay={45} />
            <div style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>Reposts</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Counter value={likes} fontSize={28} color={theme.red} delay={50} />
            <div style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>Likes</div>
          </div>
        </FadeIn>
      </SlideIn>

      {/* Top logo */}
      <div style={{ position: 'absolute', top: 40, left: 50 }}>
        <Logo size={36} delay={0} />
      </div>

      <Watermark />
    </AbsoluteFill>
  );
};
