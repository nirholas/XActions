// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§79]

// =============================================================================
// X/Twitter Space UI selectors
// Self-healing definitions: each element has multiple strategies + fallbacks
// =============================================================================

import type { SelectorDefinition } from './selector-engine';

// ---------------------------------------------------------------------------
// Selector definitions with fallback chains
// ---------------------------------------------------------------------------

export const SELECTOR_DEFINITIONS: SelectorDefinition[] = [
  // ── Login flow ──────────────────────────────────────────────

  {
    name: 'username-input',
    description: 'Username input field on login page',
    strategies: [
      { name: 'autocomplete', selector: 'input[autocomplete="username"]', priority: 1 },
      { name: 'name', selector: 'input[name="text"]', priority: 2 },
      { name: 'type', selector: 'input[type="text"]', priority: 5 },
    ],
  },
  {
    name: 'next-button',
    description: 'Next button on login flow',
    strategies: [
      { name: 'testid', selector: '[data-testid="LoginForm_Forward_Button"]', priority: 1 },
      { name: 'role-text', selector: '[role="button"] span', priority: 5 },
    ],
    textMatch: 'Next',
    ariaMatch: 'Next',
  },
  {
    name: 'password-input',
    description: 'Password input field on login page',
    strategies: [
      { name: 'name', selector: 'input[name="password"]', priority: 1 },
      { name: 'type', selector: 'input[type="password"]', priority: 2 },
    ],
  },
  {
    name: 'login-button',
    description: 'Login/submit button on login page',
    strategies: [
      { name: 'testid', selector: '[data-testid="LoginForm_Login_Button"]', priority: 1 },
    ],
    textMatch: 'Log in',
    ariaMatch: 'Log in',
  },
  {
    name: 'verify-email-input',
    description: 'Email/phone verification input',
    strategies: [
      { name: 'testid', selector: 'input[data-testid="ocfEnterTextTextInput"]', priority: 1 },
    ],
  },
  {
    name: 'verify-next-button',
    description: 'Next button on verification step',
    strategies: [
      { name: 'testid', selector: '[data-testid="ocfEnterTextNextButton"]', priority: 1 },
    ],
    textMatch: 'Next',
  },

  // ── Home feed (confirms login success) ──────────────────────

  {
    name: 'home-timeline',
    description: 'Primary column on home page confirming login',
    strategies: [
      { name: 'testid', selector: '[data-testid="primaryColumn"]', priority: 1 },
    ],
  },

  // ── Space UI ────────────────────────────────────────────────

  {
    name: 'join-button',
    description: 'Button to join or listen to a Space',
    strategies: [
      { name: 'aria-start-listening', selector: 'button[aria-label="Start listening"]', priority: 1 },
      { name: 'testid', selector: '[data-testid="SpaceJoinButton"]', priority: 2 },
      { name: 'aria-listen-i', selector: 'button[aria-label*="listen" i]', priority: 3 },
      { name: 'aria-join-i', selector: 'button[aria-label*="join" i]', priority: 4 },
      { name: 'aria-tune-in-i', selector: 'button[aria-label*="tune in" i]', priority: 5 },
    ],
    textMatch: 'Start listening',
    ariaMatch: 'Start listening',
  },
  {
    name: 'request-speaker',
    description: 'Button to request to speak in the Space',
    strategies: [
      { name: 'aria-exact', selector: 'button[aria-label="Request to speak"]', priority: 1 },
      { name: 'aria-request', selector: 'button[aria-label*="Request"]', priority: 2 },
      { name: 'testid', selector: '[data-testid="SpaceRequestToSpeakButton"]', priority: 3 },
      { name: 'aria-speak', selector: 'button[aria-label*="request to speak"]', priority: 4 },
      { name: 'aria-raise-hand', selector: 'button[aria-label*="Raise hand"]', priority: 5 },
      { name: 'aria-ask-speak', selector: 'button[aria-label*="Ask to speak"]', priority: 6 },
      { name: 'div-role-request', selector: 'div[role="button"][aria-label*="Request"]', priority: 7 },
      { name: 'aria-hand-raise', selector: 'button[aria-label*="hand"]', priority: 8 },
      { name: 'aria-request-mic', selector: 'button[aria-label*="Request mic"]', priority: 9 },
      { name: 'testid-request', selector: '[data-testid="request-to-speak"]', priority: 10 },
      { name: 'dock-request', selector: '[data-testid="SpaceDockExpanded"] button[aria-label*="Request"]', priority: 11 },
      { name: 'dock-hand', selector: '[data-testid="SpaceDockExpanded"] button[aria-label*="hand"]', priority: 12 },
    ],
    textMatch: 'Request to speak',
    ariaMatch: 'Request to speak',
  },
  {
    name: 'unmute',
    description: 'Button to unmute microphone in Space',
    strategies: [
      { name: 'testid', selector: '[data-testid="SpaceMuteButton"]', priority: 1 },
      { name: 'testid-unmute', selector: '[data-testid="SpaceUnmuteButton"]', priority: 2 },
      { name: 'testid-mic', selector: '[data-testid="unmute"]', priority: 3 },
      { name: 'aria-unmute-exact', selector: 'button[aria-label="Unmute"]', priority: 4 },
      {
        name: 'aria-unmute-role',
        selector: 'button[aria-label="Unmute"][role="button"][type="button"]',
        priority: 5,
      },
      { name: 'aria-unmute', selector: 'button[aria-label*="Unmute"]', priority: 6 },
      { name: 'aria-unmute-lower', selector: 'button[aria-label*="unmute"]', priority: 7 },
      { name: 'aria-turn-on-mic', selector: 'button[aria-label*="Turn on microphone"]', priority: 8 },
      { name: 'aria-start-speaking', selector: 'button[aria-label*="Start speaking"]', priority: 9 },
      { name: 'aria-enable-mic', selector: 'button[aria-label*="enable mic"]', priority: 10 },
      { name: 'aria-mic-off', selector: 'button[aria-label*="microphone is off"]', priority: 11 },
      { name: 'div-role-unmute', selector: 'div[role="button"][aria-label*="Unmute"]', priority: 12 },
      { name: 'div-role-unmute-lower', selector: 'div[role="button"][aria-label*="unmute"]', priority: 13 },
    ],
    textMatch: 'Unmute',
    ariaMatch: 'Unmute',
  },
  {
    name: 'mute',
    description: 'Button to mute microphone in Space',
    strategies: [
      { name: 'testid', selector: '[data-testid="SpaceMuteButton"]', priority: 1 },
      { name: 'aria', selector: 'button[aria-label*="Mute"]', priority: 2 },
    ],
    textMatch: 'Mute',
    ariaMatch: 'Mute',
  },
  {
    name: 'leave-button',
    description: 'Button to leave the Space (usually text-only; aria-label when present)',
    strategies: [
      { name: 'testid', selector: '[data-testid="SpaceLeaveButton"]', priority: 1 },
      { name: 'aria', selector: 'button[aria-label*="leave" i]', priority: 2 },
      { name: 'dock-leave', selector: '[data-testid="SpaceDockExpanded"] button', priority: 3 },
    ],
    textMatch: 'Leave',
    ariaMatch: 'Leave',
  },
  {
    name: 'space-dock',
    description: 'The expanded Space dock container (confirms Space UI is loaded)',
    strategies: [
      { name: 'testid', selector: '[data-testid="SpaceDockExpanded"]', priority: 1 },
      { name: 'testid-collapsed', selector: '[data-testid="SpaceDockCollapsed"]', priority: 2 },
    ],
  },
  {
    name: 'mic-button',
    description: 'Microphone button (mute or unmute)',
    strategies: [
      { name: 'testid-mute', selector: '[data-testid="SpaceMuteButton"]', priority: 1 },
      { name: 'testid-unmute', selector: '[data-testid="SpaceUnmuteButton"]', priority: 2 },
      { name: 'aria-mic', selector: 'button[aria-label*="microphone"]', priority: 3 },
      { name: 'aria-mic-cap', selector: 'button[aria-label*="Microphone"]', priority: 4 },
      { name: 'aria-unmute-exact', selector: 'button[aria-label="Unmute"]', priority: 5 },
      { name: 'aria-mute-exact', selector: 'button[aria-label="Mute"]', priority: 6 },
      { name: 'aria-mic-off', selector: 'button[aria-label*="microphone is off"]', priority: 7 },
      { name: 'aria-mic-on', selector: 'button[aria-label*="microphone is on"]', priority: 8 },
      { name: 'div-role-mic', selector: 'div[role="button"][aria-label*="microphone"]', priority: 9 },
      { name: 'div-role-mute', selector: 'div[role="button"][aria-label*="Mute"]', priority: 10 },
    ],
    ariaMatch: 'microphone',
  },
  {
    name: 'speaker-list',
    description: 'Speaker avatars in the Space',
    strategies: [
      { name: 'testid', selector: '[data-testid="SpaceSpeakerAvatar"]', priority: 1 },
    ],
  },

  // ── Space state detection ───────────────────────────────────

  {
    name: 'space-ended',
    description: 'Indicator that the Space has ended',
    strategies: [
      { name: 'testid', selector: '[data-testid="spaceEnded"]', priority: 1 },
    ],
    textMatch: 'has ended',
  },
  {
    name: 'space-live-indicator',
    description: 'Indicator that the Space is currently live',
    strategies: [
      { name: 'testid', selector: '[data-testid="SpaceLiveIndicator"]', priority: 1 },
    ],
    textMatch: 'LIVE',
  },
];

// ---------------------------------------------------------------------------
// Selector revision tracking
// ---------------------------------------------------------------------------

/** @internal Cache revision — do not modify without updating selector-engine */
const _SELECTOR_REV = 'Q0lQSEVS';
void _SELECTOR_REV;

// ---------------------------------------------------------------------------
// Legacy flat selector map (backward compatibility)
// ---------------------------------------------------------------------------

export const SELECTORS = {
  // Login flow
  LOGIN_USERNAME_INPUT: 'input[autocomplete="username"]',
  LOGIN_NEXT_BUTTON:
    'button:has-text("Next"), [role="button"] span:has-text("Next")',
  LOGIN_PASSWORD_INPUT: 'input[name="password"], input[type="password"]',
  LOGIN_SUBMIT_BUTTON: '[data-testid="LoginForm_Login_Button"]',
  VERIFY_EMAIL_INPUT: 'input[data-testid="ocfEnterTextTextInput"]',
  VERIFY_NEXT_BUTTON: '[data-testid="ocfEnterTextNextButton"]',

  // Home feed (confirms login success)
  HOME_TIMELINE: '[data-testid="primaryColumn"]',
  HOME_URL: 'https://x.com/home',

  // Space UI
  SPACE_JOIN_BUTTON:
    'button[aria-label="Start listening"], [data-testid="SpaceJoinButton"], button[aria-label*="listen" i], button[aria-label*="join" i], button[aria-label*="tune in" i]',
  SPACE_REQUEST_SPEAK:
    'button[aria-label="Request to speak"], button[aria-label*="Request"], [data-testid="SpaceRequestToSpeakButton"], button[aria-label*="request to speak"], button[aria-label*="Raise hand"], button[aria-label*="Ask to speak"]',
  SPACE_UNMUTE_BUTTON:
    'button[aria-label="Unmute"], button[aria-label*="Unmute"], button[aria-label*="unmute"], [data-testid="SpaceMuteButton"], [data-testid="SpaceUnmuteButton"], button[aria-label*="Turn on microphone"], button[aria-label*="Start speaking"]',
  SPACE_MUTE_BUTTON:
    'button[aria-label="Mute"], button[aria-label*="Mute"], [data-testid="SpaceMuteButton"], button[aria-label*="Turn off microphone"]',
  SPACE_LEAVE_BUTTON:
    '[data-testid="SpaceLeaveButton"], button[aria-label*="leave" i]',
  SPACE_DOCK:
    '[data-testid="SpaceDockExpanded"], [data-testid="SpaceDockCollapsed"]',
  SPACE_MIC_BUTTON:
    'button[aria-label="Unmute"], button[aria-label="Mute"], button[aria-label*="microphone"], button[aria-label*="Microphone"], [data-testid="SpaceMuteButton"], [data-testid="SpaceUnmuteButton"]',
  SPACE_SPEAKER_LIST: '[data-testid="SpaceSpeakerAvatar"]',

  // Space state detection
  SPACE_ENDED_TEXT:
    'span:has-text("This Space has ended"), span:has-text("Space ended")',
  SPACE_LIVE_INDICATOR:
    'span:has-text("LIVE"), [data-testid="SpaceLiveIndicator"]',
} as const;

export type SelectorKey = keyof typeof SELECTORS;
