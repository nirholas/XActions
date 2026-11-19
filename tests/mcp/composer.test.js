// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The composer flow behind x_post_tweet, x_post_thread, x_create_poll,
 * x_schedule_post, x_reply and x_quote_tweet.
 *
 * What it protects is the part that used to report success for posts that
 * never went out: the composer is opened through the sidebar (the old
 * /compose/tweet route redirects), typing goes to the dialog's editor and is
 * read back before posting, the post button is only pressed once enabled, and
 * a post counts only when X confirms it. The page-side functions run for real
 * against a jsdom document shaped like X's.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/home" }
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { jsdomPage } from './jsdom-page.js';
import {
  openComposer,
  typeIntoComposer,
  clickPostButton,
  confirmPosted,
  setDialogSelects,
  scheduleSelectValues,
  pollDurationValues,
  pickComposerTextbox,
} from '../../src/mcp/composer.js';

/** /home: a sidebar post button and the timeline's own inline composer. */
function renderHome() {
  document.body.innerHTML = `
    <nav><a data-testid="SideNav_NewTweet_Button" role="link">Post</a></nav>
    <main>
      <div data-testid="tweetTextarea_0" contenteditable="true" id="inline"></div>
      <button data-testid="tweetButtonInline" aria-disabled="true">Post</button>
    </main>`;
}

/** The compose dialog X mounts in its layers container. */
function mountDialog({ boxes = 1, disabled = true } = {}) {
  const layer = document.createElement('div');
  layer.setAttribute('role', 'dialog');
  layer.id = 'compose';
  for (let i = 0; i < boxes; i++) {
    const box = document.createElement('div');
    box.setAttribute('data-testid', `tweetTextarea_${i}`);
    box.setAttribute('contenteditable', 'true');
    layer.appendChild(box);
  }
  const post = document.createElement('button');
  post.setAttribute('data-testid', 'tweetButton');
  if (disabled) post.setAttribute('aria-disabled', 'true');
  layer.appendChild(post);
  document.body.appendChild(layer);
  return layer;
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.setAttribute('data-testid', 'toast');
  toast.textContent = text;
  document.body.appendChild(toast);
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/home');
});

describe('openComposer', () => {
  it('starts from /home and opens the dialog through the sidebar button', async () => {
    renderHome();
    const page = jsdomPage({
      onClick: (el) => {
        if (el.dataset.testid === 'SideNav_NewTweet_Button') mountDialog();
      },
    });

    await expect(openComposer(page)).resolves.toBe(true);
    expect(page.log.goto).toEqual([{ url: 'https://x.com/home', opts: { waitUntil: 'domcontentloaded' } }]);
  });

  it('does not mistake the inline home composer for an open dialog', async () => {
    renderHome();
    // The click does nothing: only the inline editor is on the page. The
    // fallback route is then tried, and the inline editor still satisfies it.
    const page = jsdomPage({ timeoutScale: 0.01 });

    await openComposer(page, { timeout: 50 });
    expect(page.log.goto.map((g) => g.url)).toEqual(['https://x.com/home', 'https://x.com/compose/post']);
  });

  it('never navigates to the old /compose/tweet route', async () => {
    renderHome();
    const page = jsdomPage({ onClick: () => mountDialog() });
    await openComposer(page);
    expect(page.log.goto.some((g) => g.url.includes('/compose/tweet'))).toBe(false);
  });
});

describe('typeIntoComposer', () => {
  it('clicks the dialog editor and types with the keyboard', async () => {
    renderHome();
    const dialog = mountDialog();
    const page = jsdomPage();

    await expect(typeIntoComposer(page, 0, 'hello world', { delay: 0 })).resolves.toBe(true);
    expect(page.log.clicks[0]).toBe(dialog.querySelector('[data-testid="tweetTextarea_0"]'));
    expect(page.log.typed).toEqual(['hello world']);
    expect(document.getElementById('inline').textContent).toBe('');
  });

  it('reports false when the keystrokes never reach the editor', async () => {
    // The failure #25 diagnosed: input that does not reach React state.
    mountDialog();
    const page = jsdomPage({ onType: () => {} });
    await expect(typeIntoComposer(page, 0, 'lost text', { delay: 0 })).resolves.toBe(false);
  });

  it('ignores whitespace differences when reading the text back', async () => {
    mountDialog();
    // Enter starts a new block in X's editor; textContent joins blocks.
    const page = jsdomPage({ onType: (text, el) => { el.textContent = text.replace(/\n/g, ''); } });
    await expect(typeIntoComposer(page, 0, 'line one\nline two', { delay: 0 })).resolves.toBe(true);
  });

  it('reports false when the editor never appears', async () => {
    renderHome();
    const page = jsdomPage();
    await expect(typeIntoComposer(page, 3, 'nope', { delay: 0, timeout: 30 })).resolves.toBe(false);
  });

  it('types into the numbered editor for later posts in a thread', async () => {
    const dialog = mountDialog({ boxes: 2 });
    const page = jsdomPage();
    await typeIntoComposer(page, 1, 'second post', { delay: 0 });
    expect(dialog.querySelector('[data-testid="tweetTextarea_1"]').textContent).toBe('second post');
  });
});

describe('pickComposerTextbox', () => {
  it('prefers the dialog editor, else the last one on the page', () => {
    renderHome();
    expect(pickComposerTextbox(0).id).toBe('inline');
    const dialog = mountDialog();
    expect(pickComposerTextbox(0)).toBe(dialog.querySelector('[data-testid="tweetTextarea_0"]'));
    expect(pickComposerTextbox(5)).toBeNull();
  });
});

describe('clickPostButton', () => {
  it('waits for the button to enable before pressing it', async () => {
    const dialog = mountDialog();
    const button = dialog.querySelector('[data-testid="tweetButton"]');
    let presses = 0;
    button.addEventListener('click', () => { presses++; });
    setTimeout(() => button.removeAttribute('aria-disabled'), 30);

    await expect(clickPostButton(jsdomPage(), { timeout: 1000 })).resolves.toBe(true);
    expect(presses).toBe(1);
  });

  it('presses nothing when the button stays disabled', async () => {
    const dialog = mountDialog();
    let presses = 0;
    dialog.querySelector('[data-testid="tweetButton"]').addEventListener('click', () => { presses++; });

    await expect(clickPostButton(jsdomPage(), { timeout: 40 })).resolves.toBe(false);
    expect(presses).toBe(0);
  });

  it('takes the first enabled candidate for an inline reply', async () => {
    renderHome();
    const inline = document.querySelector('[data-testid="tweetButtonInline"]');
    inline.removeAttribute('aria-disabled');
    let presses = 0;
    inline.addEventListener('click', () => { presses++; });

    await clickPostButton(jsdomPage(), { testids: ['tweetButtonInline', 'tweetButton'], timeout: 100 });
    expect(presses).toBe(1);
  });
});

describe('confirmPosted', () => {
  it('confirms once the dialog holding the text has closed', async () => {
    const dialog = mountDialog();
    dialog.querySelector('[data-testid="tweetTextarea_0"]').textContent = 'gm';
    setTimeout(() => dialog.remove(), 30);

    const outcome = await confirmPosted(jsdomPage(), { typed: 'gm', timeout: 1000 });
    expect(outcome).toMatchObject({ ok: true, via: 'composer-closed' });
  });

  it('confirms on X\'s "sent" toast', async () => {
    const dialog = mountDialog();
    dialog.querySelector('[data-testid="tweetTextarea_0"]').textContent = 'gm';
    showToast('Your post was sent.');

    const outcome = await confirmPosted(jsdomPage(), { typed: 'gm', timeout: 1000 });
    expect(outcome).toMatchObject({ ok: true, via: 'toast', toast: 'Your post was sent.' });
  });

  it('fails on an error toast even though a toast appeared', async () => {
    const dialog = mountDialog();
    dialog.querySelector('[data-testid="tweetTextarea_0"]').textContent = 'gm';
    showToast('Whoops! You already said that.');

    const outcome = await confirmPosted(jsdomPage(), { typed: 'gm', timeout: 1000 });
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/already said that/);
  });

  it('fails when the text is still in the composer at the deadline', async () => {
    const dialog = mountDialog();
    dialog.querySelector('[data-testid="tweetTextarea_0"]').textContent = 'gm';

    const outcome = await confirmPosted(jsdomPage(), { typed: 'gm', timeout: 50 });
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/did not confirm/);
  });

  it('confirms an inline reply once its box clears', async () => {
    renderHome();
    const inline = document.getElementById('inline');
    inline.textContent = 'nice one';
    setTimeout(() => { inline.textContent = ''; }, 30);

    const outcome = await confirmPosted(jsdomPage(), { typed: 'nice one', timeout: 1000 });
    expect(outcome.ok).toBe(true);
  });
});

describe('setDialogSelects', () => {
  function mountScheduleDialog({ labelled = true } = {}) {
    mountDialog();
    const sched = document.createElement('div');
    sched.setAttribute('role', 'dialog');
    const make = (label, values) => {
      const sel = document.createElement('select');
      if (labelled) sel.setAttribute('aria-label', label);
      for (const v of values) {
        const o = document.createElement('option');
        o.value = v.toLowerCase();
        o.textContent = v;
        sel.appendChild(o);
      }
      sched.appendChild(sel);
      return sel;
    };
    const selects = {
      month: make('Month', ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']),
      day: make('Day', Array.from({ length: 31 }, (_, i) => String(i + 1))),
      year: make('Year', ['2026', '2027']),
      hour: make('Hour', Array.from({ length: 12 }, (_, i) => String(i + 1))),
      minute: make('Minute', Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))),
      ampm: make('AM/PM', ['AM', 'PM']),
    };
    document.body.appendChild(sched);
    return selects;
  }

  it('sets every field of the schedule dialog for a local time', async () => {
    const selects = mountScheduleDialog();
    const changes = [];
    selects.hour.addEventListener('change', () => changes.push('hour'));

    const result = await setDialogSelects(jsdomPage(), scheduleSelectValues(new Date(2027, 2, 9, 15, 5)));

    expect(result).toEqual({ found: true, failed: [] });
    expect(selects.month.value).toBe('march');
    expect(selects.day.value).toBe('9');
    expect(selects.year.value).toBe('2027');
    expect(selects.hour.value).toBe('3');
    expect(selects.minute.value).toBe('05');
    expect(selects.ampm.value).toBe('pm');
    expect(changes).toEqual(['hour']);
  });

  it('falls back to position when the selects carry no labels', async () => {
    const selects = mountScheduleDialog({ labelled: false });
    const result = await setDialogSelects(jsdomPage(), scheduleSelectValues(new Date(2026, 11, 31, 0, 30)));
    expect(result.failed).toEqual([]);
    expect(selects.month.value).toBe('december');
    expect(selects.hour.value).toBe('12');
    expect(selects.ampm.value).toBe('am');
  });

  it('names the fields it could not set', async () => {
    mountScheduleDialog();
    const result = await setDialogSelects(jsdomPage(), scheduleSelectValues(new Date(2030, 0, 1, 9, 0)));
    expect(result.failed).toEqual(['year']);
  });

  it('reports a missing dialog rather than setting nothing quietly', async () => {
    mountDialog();
    const result = await setDialogSelects(jsdomPage(), pollDurationValues(90));
    expect(result).toEqual({ found: false, failed: ['days', 'hours', 'minutes'] });
  });
});

describe('select values', () => {
  it('maps midnight and noon onto the 12-hour clock', () => {
    const at = (h) => Object.fromEntries(scheduleSelectValues(new Date(2026, 0, 1, h, 0)).map((e) => [e.label, e.value]));
    expect(at(0)).toMatchObject({ hour: '12', am: 'AM' });
    expect(at(12)).toMatchObject({ hour: '12', am: 'PM' });
    expect(at(23)).toMatchObject({ hour: '11', am: 'PM' });
  });

  it('splits a poll length into days, hours and minutes', () => {
    const split = (m) => pollDurationValues(m).map((e) => e.value);
    expect(split(1440)).toEqual(['1', '0', '0']);
    expect(split(90)).toEqual(['0', '1', '30']);
    expect(split(10080)).toEqual(['7', '0', '0']);
  });
});
