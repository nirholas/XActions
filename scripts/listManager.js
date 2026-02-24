// scripts/listManager.js
// Browser console script for creating and managing X/Twitter lists
// Paste in DevTools console on x.com/i/lists
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'create',           // 'create' | 'addMembers' | 'exportMembers'
    listName: 'My List',
    listDescription: 'Created by XActions',
    isPrivate: false,
    usernames: [
      // 'user1',
      // 'user2',
    ],
    maxMembers: 200,            // For export
    dryRun: true,               // SET FALSE TO EXECUTE
    delay: 2000,
    scrollDelay: 1500,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const createList = async () => {
    console.log(`📋 Creating list: "${CONFIG.listName}"`);

    if (CONFIG.dryRun) {
      console.log(`   📝 Would create list: "${CONFIG.listName}" (${CONFIG.isPrivate ? 'private' : 'public'})`);
      return;
    }

    const createBtn = document.querySelector('[data-testid="createList"]');
    if (createBtn) { createBtn.click(); await sleep(1500); }

    const nameInput = document.querySelector('[data-testid="listNameInput"]');
    if (nameInput) {
      nameInput.focus();
      document.execCommand('insertText', false, CONFIG.listName);
      await sleep(500);
    }

    const descInput = document.querySelector('[data-testid="listDescriptionInput"]');
    if (descInput && CONFIG.listDescription) {
      descInput.focus();
      document.execCommand('insertText', false, CONFIG.listDescription);
      await sleep(500);
    }

    if (CONFIG.isPrivate) {
      const toggle = document.querySelector('[data-testid="listPrivateToggle"]');
      if (toggle) toggle.click();
      await sleep(300);
    }

    const saveBtn = document.querySelector('[data-testid="listSaveButton"]');
    if (saveBtn) { saveBtn.click(); await sleep(1500); }

    console.log('✅ List created!');
  };

  const addMembers = async () => {
    const users = CONFIG.usernames;
    if (users.length === 0) {
      console.error('❌ No usernames provided! Edit CONFIG.usernames.');
      return;
    }

    console.log(`👥 Adding ${users.length} users to list...`);

    if (CONFIG.dryRun) {
      users.forEach(u => console.log(`   📝 Would add: @${u}`));
      return;
    }

    const addBtn = document.querySelector('[data-testid="addMembers"]');
    if (addBtn) { addBtn.click(); await sleep(1500); }

    let added = 0;
    for (const username of users) {
      const searchInput = document.querySelector('[data-testid="searchPeople"]');
      if (!searchInput) { console.error('❌ Search input not found'); break; }

      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, username);
      await sleep(2000);

      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let found = false;
      for (const cell of cells) {
        if (cell.textContent.toLowerCase().includes(username.toLowerCase())) {
          cell.click();
          found = true;
          added++;
          console.log(`   ✅ Added @${username}`);
          break;
        }
      }

      if (!found) console.warn(`   ⚠️ @${username} not found`);

      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(CONFIG.delay);
    }

    console.log(`✅ Added ${added}/${users.length} members`);
  };

  const exportMembers = async () => {
    console.log('📥 Exporting list members...');
    const members = new Map();
    let retries = 0;

    while (members.size < CONFIG.maxMembers && retries < 5) {
      const prevSize = members.size;

      document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
        const linkEl = cell.querySelector('a[href^="/"]');
        const username = linkEl?.href?.replace(/^.*x\.com\//, '').split('/')[0] || '';
        if (!username || members.has(username)) return;

        const nameEl = cell.querySelector('[data-testid="User-Name"]');
        const bioEl = cell.querySelector('[dir="auto"]:not([data-testid])');
        members.set(username, {
          username,
          displayName: nameEl?.textContent?.split('@')[0]?.trim() || '',
          bio: bioEl?.textContent || '',
        });
      });

      if (members.size === prevSize) retries++;
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const data = [...members.values()];
    download(data, `xactions-list-members-${new Date().toISOString().slice(0, 10)}.json`);
    console.log(`✅ Exported ${data.length} members`);
  };

  const run = async () => {
    console.log('📋 LIST MANAGER — XActions by nichxbt\n');

    if (CONFIG.action === 'create') await createList();
    else if (CONFIG.action === 'addMembers') await addMembers();
    else if (CONFIG.action === 'exportMembers') await exportMembers();
    else console.error(`❌ Unknown action: ${CONFIG.action}`);

    console.log('\n🏁 Done!');
  };

  run();
})();
