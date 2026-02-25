/**
 * ThreadVideo — Animated thread unroll video
 * Use case: Turn a Twitter thread into a swipeable/scrolling video.
 *
 * Input props:
 *   author, handle, tweets (array of strings), verified
 *
 * @author nich (@nichxbt)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { theme } from '../utils/theme.js';
import { FadeIn, SlideIn, Avatar, Logo, Watermark } from '../components/Shared.jsx';

const ThreadTweet = ({ text, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame, fps, config: { damping: 50, stiffness: 100 } });
  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const translateY = interpolate(spr, [0, 1], [40, 0]);

  return (
    <div style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      background: theme.bgCard,
      borderRadius: 20,
      padding: 32,
      border: `1px solid ${theme.border}`,
      maxWidth: 700,
      width: '85%',
      position: 'relative',
    }}>
      {/* Thread line */}
      {index < total - 1 && (
        <div style={{
          position: 'absolute',
          left: 48,
          bottom: -30,
          width: 3,
          height: 30,
          background: theme.accent,
          opacity: 0.3,
        }} />
      )}

      {/* Tweet number badge */}
      <div style={{
        position: 'absolute',
        top: -14,
        right: 24,
        background: theme.accent,
        borderRadius: 20,
        padding: '4px 14px',
        fontSize: 14,
        fontWeight: 700,
        color: '#fff',
        fontFamily: theme.fontFamily,
      }}>
        {index + 1}/{total}
      </div>

      <div style={{
        fontSize: 24,
        color: theme.text,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        fontFamily: theme.fontFamily,
      }}>
        {text}
      </div>
    </div>
  );
};

export const ThreadVideo = ({
  author = 'nich',
  handle = '@nichxbt',
  verified = true,
  tweets = [
    '🧵 Thread: How I built the #1 free Twitter automation toolkit\n\nNo API fees. Open source. 50K+ users.',
    '1/ I started with a simple problem:\n\nI wanted to unfollow everyone who doesn\'t follow me back.\n\nTwitter API costs $100/mo minimum. That\'s insane for a simple operation.',
    '2/ So I built XActions — browser automation.\n\nPaste a script in DevTools → done.\n\nNo API keys, no OAuth, no billing.',
    '3/ It snowballed:\n\n• Profile scraper\n• Follower scraper\n• Tweet search\n• Thread unroller\n• Video downloader\n• 50+ MCP tools for AI agents',
    '4/ The secret sauce?\n\nAI voice analysis → scrape anyone\'s tweets → analyze their writing style → generate tweets in their voice.\n\nNobody else has this.',
    '5/ Try it free:\n\ngithub.com/nirholas/XActions\n\nnpx xactions-mcp (for Claude/Cursor)',
  ],
}) => {
  const frame = useCurrentFrame();
  const FRAMES_PER_TWEET = 90; // 3 seconds each at 30fps

  return (
    <AbsoluteFill style={{
      background: theme.bg,
      fontFamily: theme.fontFamily,
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 30% 20%, ${theme.accentGlow}, transparent 50%)`,
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 40,
        left: 50,
        right: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={author} size={48} delay={0} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{author}</span>
              {verified && <span style={{ fontSize: 16, color: theme.accent }}>✓</span>}
            </div>
            <span style={{ fontSize: 16, color: theme.textSecondary }}>{handle}</span>
          </div>
        </div>
        <Logo size={32} delay={0} />
      </div>

      {/* Thread tweets */}
      <div style={{
        position: 'absolute',
        top: 130,
        left: 0,
        right: 0,
        bottom: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
      }}>
        {tweets.map((text, i) => (
          <Sequence key={i} from={i * FRAMES_PER_TWEET} durationInFrames={FRAMES_PER_TWEET + 30}>
            <ThreadTweet text={text} index={i} total={tweets.length} />
          </Sequence>
        ))}
      </div>

      <Watermark />
    </AbsoluteFill>
  );
};
