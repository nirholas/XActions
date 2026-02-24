# 📋 List Manager

Create and manage X/Twitter Lists — create lists, add members, and export member data.

---

## 📋 What It Does

Provides three actions:
1. **Create** — Creates a new list with name and description
2. **Add Members** — Adds a list of usernames to an existing list
3. **Export Members** — Exports all members of a list as JSON

---

## 🌐 Browser Console Script

### Create a List

**Steps:**
1. Go to `x.com/i/lists`
2. Set `action: 'create'` in CONFIG
3. Open console (F12) and paste `src/listManager.js`

### Add Members to a List

**Steps:**
1. Go to the list page (`x.com/i/lists/<listId>`)
2. Set `action: 'addMembers'` in CONFIG
3. Open console (F12) and paste `src/listManager.js`

### Export Members

**Steps:**
1. Go to the list's members page
2. Set `action: 'exportMembers'`
3. Open console (F12) and paste `src/listManager.js`

**Configuration:**
```javascript
const CONFIG = {
  action: 'create', // 'create', 'addMembers', or 'exportMembers'
  listName: 'Web3 Builders',
  listDescription: 'Developers building in web3',
  isPrivate: false,
  members: ['user1', 'user2', 'user3'],
};
```

---

## 📁 Files

- `src/listManager.js` — Browser console list manager

## ⚠️ Notes

- Creating lists requires being on the Lists page
- Adding members navigates to each user's profile, so it may be slow
- Exported member data downloads as a JSON file
- X limits how many lists you can create; use wisely
