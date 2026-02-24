// Manage Lists on X - by nichxbt
// https://github.com/nirholas/xactions
// Create, manage, and populate X lists programmatically
// 1. Go to x.com (any page)
// 2. Open the Developer Console (F12)
// 3. Edit the CONFIG below
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Create a new list
    createList: {
      enabled: false,
      name: 'My List',
      description: 'Created by XActions',
      isPrivate: true,
    },
    // Add users to an existing list (navigate to list page first)
    addUsers: {
      enabled: true,
      usernames: [
        // 'user1',
        // 'user2',
      ],
    },
    // Export list members
    exportMembers: {
      enabled: false,
      maxMembers: 200,
    },
    actionDelay: 2000,
    scrollDelay: 1500,
  };

  const $createListButton = '[data-testid="createList"]';
  const $listNameInput = '[data-testid="listNameInput"]';
  const $listDescInput = '[data-testid="listDescriptionInput"]';
  const $listPrivateToggle = '[data-testid="listPrivateToggle"]';
  const $listSaveButton = '[data-testid="listSaveButton"]';
  const $addMemberButton = '[data-testid="addMembers"]';
  const $searchInput = '[data-testid="searchPeople"]';
  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const createNewList = async () => {
    console.log(`📋 Creating list: "${CONFIG.createList.name}"`);

    const createBtn = document.querySelector($createListButton);
    if (createBtn) {
      createBtn.click();
      await sleep(1500);
    }

    const nameInput = document.querySelector($listNameInput);
    if (nameInput) {
      nameInput.focus();
      nameInput.value = '';
      document.execCommand('insertText', false, CONFIG.createList.name);
      await sleep(500);
    }

    const descInput = document.querySelector($listDescInput);
    if (descInput && CONFIG.createList.description) {
      descInput.focus();
      descInput.value = '';
      document.execCommand('insertText', false, CONFIG.createList.description);
      await sleep(500);
    }

    if (CONFIG.createList.isPrivate) {
      const toggle = document.querySelector($listPrivateToggle);
      if (toggle) toggle.click();
      await sleep(300);
    }

    const saveBtn = document.querySelector($listSaveButton);
    if (saveBtn) {
      saveBtn.click();
      console.log('✅ List created!');
      await sleep(1500);
    }
  };

  const addUsersToList = async () => {
    const users = CONFIG.addUsers.usernames;
    console.log(`👥 Adding ${users.length} users to list...`);

    const addBtn = document.querySelector($addMemberButton);
    if (addBtn) {
      addBtn.click();
      await sleep(1500);
    }

    for (const username of users) {
      const searchInput = document.querySelector($searchInput);
      if (!searchInput) {
        console.error('❌ Search input not found');
        break;
      }

      searchInput.focus();
      searchInput.value = '';
      document.execCommand('insertText', false, username);
      await sleep(2000);

      // Click on matching user
      const cells = document.querySelectorAll($userCell);
      let found = false;
      for (const cell of cells) {
        if (cell.textContent.toLowerCase().includes(username.toLowerCase())) {
          cell.click();
          found = true;
          console.log(`✅ Added @${username}`);
          break;
        }
      }

      if (!found) {
        console.warn(`⚠️ @${username} not found`);
      }

      // Clear search
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(CONFIG.actionDelay);
    }
  };

  const exportListMembers = async () => {
    console.log('📥 Exporting list members...');

    const members = new Map();
    let noNewItems = 0;

    while (members.size < CONFIG.exportMembers.maxMembers && noNewItems < 5) {
      const prevSize = members.size;
      const cells = document.querySelectorAll($userCell);

      cells.forEach(cell => {
        const nameEl = cell.querySelector($userName);
        const linkEl = cell.querySelector('a[href^="/"]');
        const bioEl = cell.querySelector('[dir="auto"]:not([data-testid])');
        const username = linkEl?.href?.replace(/^.*x\.com\//, '').split('/')[0] || '';
        if (username && !members.has(username)) {
          members.set(username, {
            username,
            displayName: nameEl?.textContent?.split('@')[0]?.trim() || '',
            bio: bioEl?.textContent || '',
          });
        }
      });

      if (members.size === prevSize) noNewItems++;
      else noNewItems = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const data = [...members.values()];
    console.log(`📊 Found ${data.length} list members`);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions-list-members-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    console.log('📥 List members exported as JSON');
  };

  const run = async () => {
    console.log('📋 LIST MANAGER - XActions by nichxbt\n');

    if (CONFIG.createList.enabled) await createNewList();
    if (CONFIG.addUsers.enabled) await addUsersToList();
    if (CONFIG.exportMembers.enabled) await exportListMembers();

    console.log('\n✅ Done!');
  };

  run();
})();
