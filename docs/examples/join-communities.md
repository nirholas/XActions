# 🏘️ Join Communities

Automatically discover and join X Communities matching keyword criteria.

---

## 📋 What It Does

1. Navigates to X's suggested communities page
2. Scrolls to find communities
3. Filters by name/description keywords
4. Clicks Join on matching communities
5. Tracks joined communities in sessionStorage

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/communities/suggested`
2. Edit CONFIG with your keywords
3. Open console (F12) and paste `src/joinCommunities.js`

**Configuration:**
```javascript
const CONFIG = {
  keywords: ['crypto', 'developer', 'web3'],
  maxToJoin: 10,
  scrollCycles: 15,
  delayBetweenJoins: 3000,
};
```

---

## 📁 Files

- `src/joinCommunities.js` — Browser console community joiner
- `src/leaveAllCommunities.js` — Leave all communities (companion script)

## ⚠️ Notes

- Must start on `x.com/communities/suggested` or a similar communities page
- Some communities require admin approval after clicking Join
- Use `src/leaveAllCommunities.js` to undo if needed
- Keyword matching is case-insensitive on community name and description
