/**
 * AnalyticsDashboard — Animated analytics video
 * Use case: Show engagement stats, follower growth, best posting times as a video.
 *
 * Input props:
 *   username, followers, following, tweets, engagement, growth, bestHour, bestDay
 *
 * @author nich (@nichxbt)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { theme } from '../utils/theme.js';
import { FadeIn, SlideIn, Counter, Logo, Avatar, StatCard, ProgressBar, Watermark } from '../components/Shared.jsx';

const BarChart = ({ data, maxValue, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, padding: '0 8px' }}>
      {data.map((item, i) => {
        const barDelay = delay + i * 3;
        const spr = spring({ frame: frame - barDelay, fps, config: { damping: 60, stiffness: 80 } });
        const barHeight = interpolate(spr, [0, 1], [0, (item.value / maxValue) * 180]);

        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono }}>
              {item.value > 0 ? item.value : ''}
            </span>
            <div style={{
              width: '100%',
              height: barHeight,
              background: item.highlight ? theme.accent : theme.border,
              borderRadius: 4,
              minHeight: 2,
            }} />
            <span style={{ fontSize: 11, color: theme.textSecondary, fontFamily: theme.fontFamily }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const AnalyticsDashboard = ({
  username = 'nichxbt',
  followers = 12400,
  following = 890,
  tweetsCount = 3200,
  avgLikes = 142,
  avgRetweets = 38,
  engagementRate = 4.2,
  followerGrowth = 8.5,
  bestHour = '10:00 UTC',
  bestDay = 'Tuesday',
  hourlyData = [
    { label: '6am', value: 12, highlight: false },
    { label: '8am', value: 34, highlight: false },
    { label: '10am', value: 89, highlight: true },
    { label: '12pm', value: 67, highlight: false },
    { label: '2pm', value: 45, highlight: false },
    { label: '4pm', value: 56, highlight: false },
    { label: '6pm', value: 72, highlight: true },
    { label: '8pm', value: 38, highlight: false },
    { label: '10pm', value: 23, highlight: false },
  ],
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{
      background: theme.bg,
      fontFamily: theme.fontFamily,
      padding: 60,
    }}>
      {/* Gradient bg */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 70% 30%, rgba(124, 77, 255, 0.15), transparent 60%)`,
      }} />

      {/* Header */}
      <Sequence from={0} durationInFrames={300}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Avatar name={username} size={56} delay={0} />
            <div>
              <FadeIn delay={5}>
                <span style={{ fontSize: 28, fontWeight: 700, color: theme.text }}>@{username}</span>
              </FadeIn>
              <FadeIn delay={10}>
                <span style={{ fontSize: 16, color: theme.textSecondary }}>Analytics Dashboard</span>
              </FadeIn>
            </div>
          </div>
          <Logo size={36} delay={5} />
        </div>
      </Sequence>

      {/* Stats row */}
      <Sequence from={10} durationInFrames={280}>
        <div style={{ display: 'flex', gap: 24, marginTop: 40, justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <StatCard label="Followers" value={followers} color={theme.accent} delay={15} />
          <StatCard label="Following" value={following} color={theme.purple} delay={20} />
          <StatCard label="Tweets" value={tweetsCount} color={theme.text} delay={25} />
          <StatCard label="Avg Likes" value={avgLikes} color={theme.red} delay={30} />
        </div>
      </Sequence>

      {/* Middle section: engagement + best time */}
      <Sequence from={30} durationInFrames={260}>
        <div style={{ display: 'flex', gap: 32, marginTop: 40, position: 'relative', zIndex: 1 }}>
          {/* Engagement card */}
          <FadeIn delay={35} style={{
            flex: 1,
            background: theme.bgCard,
            borderRadius: theme.borderRadius,
            padding: 32,
            border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 18, color: theme.textSecondary, marginBottom: 20 }}>Engagement Rate</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
              <Counter value={engagementRate * 10} fontSize={56} color={theme.green} delay={40} />
              <span style={{ fontSize: 32, color: theme.green, fontWeight: 700 }}>%</span>
            </div>
            <ProgressBar progress={engagementRate * 10} color={theme.green} delay={45} height={10} />
            <div style={{ marginTop: 20, display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 14, color: theme.textMuted }}>Avg Retweets</div>
                <Counter value={avgRetweets} fontSize={24} color={theme.text} delay={50} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: theme.textMuted }}>Growth</div>
                <span style={{ fontSize: 24, fontWeight: 700, color: theme.green, fontFamily: theme.fontMono }}>
                  +{followerGrowth}%
                </span>
              </div>
            </div>
          </FadeIn>

          {/* Best time to post */}
          <FadeIn delay={40} style={{
            flex: 1.3,
            background: theme.bgCard,
            borderRadius: theme.borderRadius,
            padding: 32,
            border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 18, color: theme.textSecondary, marginBottom: 12 }}>Best Time to Post</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{
                background: `${theme.accent}22`,
                borderRadius: 12,
                padding: '8px 16px',
                fontSize: 16,
                color: theme.accent,
                fontWeight: 600,
              }}>
                ⏰ {bestHour}
              </div>
              <div style={{
                background: `${theme.purple}22`,
                borderRadius: 12,
                padding: '8px 16px',
                fontSize: 16,
                color: theme.purple,
                fontWeight: 600,
              }}>
                📅 {bestDay}
              </div>
            </div>
            <BarChart data={hourlyData} maxValue={100} delay={50} />
          </FadeIn>
        </div>
      </Sequence>

      {/* Footer CTA */}
      <Sequence from={70} durationInFrames={220}>
        <FadeIn delay={75} style={{
          marginTop: 'auto',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          <span style={{ fontSize: 18, color: theme.textMuted }}>
            Powered by XActions — free Twitter analytics • xactions.app
          </span>
        </FadeIn>
      </Sequence>

      <Watermark />
    </AbsoluteFill>
  );
};
