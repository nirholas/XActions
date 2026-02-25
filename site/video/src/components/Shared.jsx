/**
 * XActions Video — Reusable Components
 * @author nich (@nichxbt)
 */

import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { theme } from '../utils/theme.js';

// ─── Animated Number Counter ───
export const Counter = ({ value, prefix = '', suffix = '', fontSize = 64, color = theme.text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({ frame: frame - delay, fps, config: { damping: 80, stiffness: 100 } });
  const displayValue = Math.round(interpolate(spr, [0, 1], [0, value]));

  return (
    <span style={{ fontSize, fontWeight: 800, color, fontFamily: theme.fontMono }}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

// ─── Fade-in text ───
export const FadeIn = ({ children, delay = 0, duration = 15, style = {} }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const translateY = interpolate(frame - delay, [0, duration], [20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};

// ─── Slide-in from direction ───
export const SlideIn = ({ children, from = 'left', delay = 0, duration = 20, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: frame - delay, fps, config: { damping: 50, stiffness: 120 } });

  const axis = from === 'left' || from === 'right' ? 'X' : 'Y';
  const sign = from === 'left' || from === 'top' ? -1 : 1;
  const translate = interpolate(spr, [0, 1], [sign * 100, 0]);

  return (
    <div style={{ transform: `translate${axis}(${translate}px)`, opacity: spr, ...style }}>
      {children}
    </div>
  );
};

// ─── XActions Logo ───
export const Logo = ({ size = 48, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: frame - delay, fps, config: { damping: 40, stiffness: 200 } });
  const scale = interpolate(spr, [0, 1], [0.5, 1]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${scale})`, opacity: spr }}>
      <span style={{ fontSize: size, fontWeight: 900, color: theme.accent, fontFamily: theme.fontFamily }}>⚡</span>
      <span style={{ fontSize: size * 0.7, fontWeight: 800, color: theme.text, fontFamily: theme.fontFamily, letterSpacing: -1 }}>
        XActions
      </span>
    </div>
  );
};

// ─── Avatar Circle ───
export const Avatar = ({ name, size = 64, color = theme.accent, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: frame - delay, fps, config: { damping: 60, stiffness: 150 } });

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.4,
      fontWeight: 700,
      color: '#fff',
      fontFamily: theme.fontFamily,
      transform: `scale(${interpolate(spr, [0, 1], [0, 1])})`,
      opacity: spr,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
};

// ─── Stat Card ───
export const StatCard = ({ label, value, prefix = '', suffix = '', color = theme.accent, delay = 0 }) => {
  return (
    <FadeIn delay={delay} style={{
      background: theme.bgCard,
      borderRadius: theme.borderRadius,
      padding: '24px 32px',
      border: `1px solid ${theme.border}`,
      minWidth: 200,
      textAlign: 'center',
    }}>
      <Counter value={value} prefix={prefix} suffix={suffix} fontSize={48} color={color} delay={delay} />
      <div style={{ fontSize: 18, color: theme.textSecondary, marginTop: 8, fontFamily: theme.fontFamily }}>
        {label}
      </div>
    </FadeIn>
  );
};

// ─── Tweet Bubble ───
export const TweetBubble = ({ text, author = '@user', likes = 0, retweets = 0, delay = 0 }) => {
  return (
    <SlideIn from="bottom" delay={delay} style={{
      background: theme.bgCard,
      borderRadius: theme.borderRadius,
      padding: 24,
      border: `1px solid ${theme.border}`,
      maxWidth: 600,
      fontFamily: theme.fontFamily,
    }}>
      <div style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 8 }}>{author}</div>
      <div style={{ fontSize: 22, color: theme.text, lineHeight: 1.5 }}>{text}</div>
      <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 16, color: theme.textMuted }}>
        <span>❤️ {likes.toLocaleString()}</span>
        <span>🔄 {retweets.toLocaleString()}</span>
      </div>
    </SlideIn>
  );
};

// ─── Progress Bar ───
export const ProgressBar = ({ progress, color = theme.accent, delay = 0, height = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: frame - delay, fps, config: { damping: 80, stiffness: 60 } });
  const width = interpolate(spr, [0, 1], [0, progress]);

  return (
    <div style={{ width: '100%', height, background: theme.bgCard, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'none' }} />
    </div>
  );
};

// ─── Watermark ───
export const Watermark = () => (
  <div style={{
    position: 'absolute',
    bottom: 32,
    right: 40,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: 0.5,
  }}>
    <span style={{ fontSize: 18, color: theme.textMuted, fontFamily: theme.fontFamily }}>xactions.app</span>
  </div>
);
