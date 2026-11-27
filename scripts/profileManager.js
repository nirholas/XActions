// GENERATED FILE: a copy of browser/scrapeProfile.js, written by scripts/build-script-manifest.mjs. Edit browser/scrapeProfile.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Profile Scraper
 * Get detailed profile data for a user
 *
 * @name        scrapeProfile.js
 * @title       Scrape Profile
 * @description Read a profile's name, bio, location, website, join date, counts, verified badge and images, and download them as JSON.
 * @category    scrape
 * @page        x.com/<username>
 * @writes      false
 * @aliases     scripts/profileManager.js, scripts/scrapeProfile.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 *
 * HOW TO USE:
 * 1. Go to any user's profile: x.com/USERNAME
 * 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
 * 3. Paste browser/scrapeProfile.js and press Enter
 *
 * by nichxbt - https://github.com/nirholas/XActions
 */

(() => {
  const CONFIG = {
    exportResults: true,      // Download profile data as JSON
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseNumber = (str) => {
    if (!str) return 0;
    const clean = str.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    if (str.includes('K')) return Math.round(num * 1000);
    if (str.includes('M')) return Math.round(num * 1000000);
    return num;
  };

  const run = async () => {
    const username = window.location.pathname.split('/')[1];

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Please go to a user profile first!');
      return;
    }

    console.log(`👤 Scraping profile of @${username}...`);
    await sleep(1000);

    // Extract profile data from the page
    const profile = {
      handle: username,
      displayName: '',
      bio: '',
      location: '',
      website: '',
      joinDate: '',
      followersCount: 0,
      followingCount: 0,
      followersRaw: '',
      followingRaw: '',
      tweetsCount: 0,
      verified: false,
      profileImageUrl: '',
      bannerImageUrl: '',
      scrapedAt: new Date().toISOString(),
      url: window.location.href,
    };

    // Display name
    const displayNameEl = document.querySelector('[data-testid="UserName"] span');
    profile.displayName = displayNameEl?.textContent || username;

    // Bio
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    profile.bio = bioEl?.textContent || '';

    // Location
    const locationEl = document.querySelector('[data-testid="UserLocation"]');
    profile.location = locationEl?.textContent || '';

    // Website
    const websiteEl = document.querySelector('[data-testid="UserUrl"]');
    profile.website = websiteEl?.href || websiteEl?.querySelector('a')?.href || websiteEl?.textContent || '';

    // Join date
    const joinDateEl = document.querySelector('[data-testid="UserJoinDate"]');
    profile.joinDate = joinDateEl?.textContent || '';

    // Followers/Following counts (raw text kept as shown, e.g. "1.2K")
    const followLinks = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
    followLinks.forEach(link => {
      const text = link.textContent || '';
      const raw = link.querySelector('span')?.textContent?.trim() || '';
      if (link.href.includes('/followers')) {
        profile.followersCount = parseNumber(text);
        profile.followersRaw = raw;
      } else if (link.href.includes('/following')) {
        profile.followingCount = parseNumber(text);
        profile.followingRaw = raw;
      }
    });

    // Verified badge
    profile.verified = !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]') ||
                       !!document.querySelector('[data-testid="icon-verified"]');

    // Profile image
    const profileImg = document.querySelector('a[href*="/photo"] img') ||
                       document.querySelector('[data-testid="UserAvatar-Container"] img');
    if (profileImg) {
      profile.profileImageUrl = profileImg.src.replace('_normal', '_400x400');
    }

    // Banner image
    const bannerImg = document.querySelector('a[href*="/header_photo"] img');
    profile.bannerImageUrl = bannerImg?.src || '';

    // Tweet count (from nav or header)
    const tweetCountEl = document.querySelector('[data-testid="primaryColumn"] h2')?.parentElement?.querySelector('span');
    if (tweetCountEl) {
      const match = tweetCountEl.textContent?.match(/[\d,.]+[KM]?/);
      if (match) profile.tweetsCount = parseNumber(match[0]);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`👤 PROFILE: @${profile.handle}`);
    console.log('='.repeat(60));
    console.log(`📛 Name: ${profile.displayName}`);
    console.log(`📝 Bio: ${profile.bio.slice(0, 100)}${profile.bio.length > 100 ? '...' : ''}`);
    console.log(`📍 Location: ${profile.location || 'N/A'}`);
    console.log(`🔗 Website: ${profile.website || 'N/A'}`);
    console.log(`📅 Joined: ${profile.joinDate}`);
    console.log(`👥 Followers: ${profile.followersCount.toLocaleString()}`);
    console.log(`👥 Following: ${profile.followingCount.toLocaleString()}`);
    console.log(`${profile.verified ? '✅ Verified' : ''}`);
    console.log('='.repeat(60) + '\n');

    if (CONFIG.exportResults) {
      download(JSON.stringify(profile, null, 2), `profile_${username}_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded profile.json');
    }

    window.scrapedProfile = profile;
    window.__xactions_profile = profile;
    console.log('\n✅ Done! Access data: window.scrapedProfile');
    return profile;
  };

  run();
})();
