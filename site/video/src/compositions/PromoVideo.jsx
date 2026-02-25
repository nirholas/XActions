/**
 * PromoVideo — XActions promotional/marketing video
 * Use case: Product demo, GitHub README hero video, social media ads.
 *
 * Scenes: Logo reveal → Feature showcase → Tool demo → CTA
 *
 * @author nich (@nichxbt)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { theme } from '../utils/theme.js';
import { FadeIn, SlideIn, Logo, Watermark } from '../components/Shared.jsx';

// ─── Scene: Logo Reveal ───
const LogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame, fps, config: { damping: 30, stiffness: 100 } });

  const scale = interpolate(spr, [0, 1], [0.3, 1]);
  const blur = interpolate(spr, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{
      background: theme.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      {/* Animated radial glow */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accentGlow}, transparent 70%)`,
        transform: `scale(${scale * 1.5})`,
        filter: `blur(${blur + 40}px)`,
      }} />

      <div style={{ transform: `scale(${scale})`, filter: `blur(${blur}px)` }}>
        <Logo size={80} delay={0} />
      </div>

      <FadeIn delay={20} style={{ fontSize: 24, color: theme.textSecondary, textAlign: 'center', maxWidth: 600 }}>
        The Complete X/Twitter Automation Toolkit
      </FadeIn>

      <FadeIn delay={30} style={{ fontSize: 18, color: theme.textMuted }}>
        No API fees. Open source. Free forever.
      </FadeIn>
    </AbsoluteFill>
  );
};

// ─── Scene: Feature Showcase ───
const features = [
  { icon: '🔍', title: 'Scrape Anything', desc: 'Profiles, followers, tweets, threads, videos' },
  { icon: '🤖', title: '75+ MCP Tools', desc: 'Works with Claude, Cursor, Windsurf, GPT' },
  { icon: '📊', title: 'Analytics', desc: 'Best time to post, sentiment, competitors' },
  { icon: '✍️', title: 'AI Writer', desc: 'Analyze voice → Generate tweets in their style' },
  { icon: '⚡', title: 'Actions', desc: 'Follow, unfollow, like, post, thread, DM' },
  { icon: '🌐', title: 'Multi-Platform', desc: 'Twitter, Bluesky, Mastodon, Threads' },
];

const FeatureShowcase = () => {
  return (
    <AbsoluteFill style={{
      background: theme.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 60,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 20% 80%, rgba(29, 155, 240, 0.1), transparent 50%),
                     radial-gradient(ellipse at 80% 20%, rgba(124, 77, 255, 0.1), transparent 50%)`,
      }} />

      <FadeIn delay={0} style={{ fontSize: 42, fontWeight: 800, color: theme.text, marginBottom: 48, textAlign: 'center' }}>
        Everything You Need
      </FadeIn>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24,
        maxWidth: 1000,
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}>
        {features.map((f, i) => (
          <SlideIn key={i} from={i % 2 === 0 ? 'left' : 'right'} delay={8 + i * 8} style={{
            background: theme.bgCard,
            borderRadius: theme.borderRadius,
            padding: 28,
            border: `1px solid ${theme.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{f.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 8, fontFamily: theme.fontFamily }}>
              {f.title}
            </div>
            <div style={{ fontSize: 15, color: theme.textSecondary, fontFamily: theme.fontFamily }}>
              {f.desc}
            </div>
          </SlideIn>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: Code Demo ───
const CodeDemo = () => {
  const frame = useCurrentFrame();
  const lines = [
    '$ npx xactions-mcp',
    '',
    '⚡ XActions MCP Server v3.0.0',
    '✅ Authenticated',
    '📋 Tools available: 77',
    '',
    '> "Analyze @paulg\'s writing style"',
    '',
    '  Scraping 50 tweets...',
    '  Analyzing voice profile...',
    '  Tone: Thoughtful, contrarian',
    '  Avg length: 142 chars',
    '  ✅ Voice profile ready',
  ];

  const visibleLines = Math.min(lines.length, Math.floor(frame / 5));

  return (
    <AbsoluteFill style={{
      background: theme.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#0d1117',
        borderRadius: 16,
        padding: 40,
        maxWidth: 800,
        width: '80%',
        border: `1px solid ${theme.border}`,
        fontFamily: theme.fontMono,
        fontSize: 18,
        lineHeight: 1.8,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Terminal chrome */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#28ca41' }} />
        </div>

        {lines.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{
            color: line.startsWith('$') ? theme.green
              : line.startsWith('>') ? theme.accent
              : line.startsWith('  ✅') ? theme.green
              : line.startsWith('⚡') ? theme.accent
              : line.startsWith('✅') ? theme.green
              : line.startsWith('📋') ? theme.purple
              : theme.textSecondary,
            whiteSpace: 'pre',
          }}>
            {line}
          </div>
        ))}

        {/* Cursor blink */}
        <span style={{
          display: 'inline-block',
          width: 10,
          height: 22,
          background: theme.accent,
          opacity: Math.sin(frame / 4) > 0 ? 1 : 0,
          marginLeft: 2,
          verticalAlign: 'text-bottom',
        }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: CTA ───
const CTA = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 10), [-1, 1], [0.98, 1.02]);

  return (
    <AbsoluteFill style={{
      background: theme.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
    }}>
      <div style={{
        position: 'absolute',
        width: 800,
        height: 800,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accentGlow}, transparent 60%)`,
        filter: 'blur(80px)',
      }} />

      <FadeIn delay={0}>
        <Logo size={64} delay={5} />
      </FadeIn>

      <FadeIn delay={10} style={{
        fontSize: 48,
        fontWeight: 800,
        color: theme.text,
        textAlign: 'center',
        fontFamily: theme.fontFamily,
      }}>
        Free. Open Source. Forever.
      </FadeIn>

      <FadeIn delay={20} style={{
        transform: `scale(${pulse})`,
        background: theme.gradient,
        borderRadius: 16,
        padding: '20px 48px',
        fontSize: 24,
        fontWeight: 700,
        color: '#fff',
        fontFamily: theme.fontFamily,
      }}>
        github.com/nirholas/XActions
      </FadeIn>

      <FadeIn delay={30} style={{ fontSize: 20, color: theme.textSecondary }}>
        npx xactions-mcp  ·  npm install xactions  ·  xactions.app
      </FadeIn>
    </AbsoluteFill>
  );
};

// ─── Main Promo Composition ───
export const PromoVideo = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}>
        <LogoReveal />
      </Sequence>
      <Sequence from={90} durationInFrames={120}>
        <FeatureShowcase />
      </Sequence>
      <Sequence from={210} durationInFrames={120}>
        <CodeDemo />
      </Sequence>
      <Sequence from={330} durationInFrames={120}>
        <CTA />
      </Sequence>
      <Watermark />
    </AbsoluteFill>
  );
};
