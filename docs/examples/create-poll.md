# 📊 Create Polls

Create poll tweets with 2–4 options and a configurable duration.

---

## 📋 What It Does

1. Opens the tweet compose box
2. Types your poll question
3. Clicks the poll icon to open the poll builder
4. Fills in 2–4 options
5. Sets poll duration (hours/days)
6. Posts the poll

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/home`
2. Edit CONFIG with your question and options
3. Open console (F12) and paste `src/createPoll.js`

**Configuration:**
```javascript
const CONFIG = {
  question: 'What is your favorite programming language?',
  options: ['JavaScript', 'Python', 'Rust', 'Go'],
  durationDays: 1,
  durationHours: 0,
  durationMinutes: 0,
};
```

---

## 📁 Files

- `src/createPoll.js` — Browser console poll creator

## ⚠️ Notes

- Polls require 2–4 options (X limitation)
- Maximum duration is 7 days
- The script auto-adds option fields if more than 2 options are specified
- You must be on the home timeline or any page with the compose box available
