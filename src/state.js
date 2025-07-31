const fs = require('fs');
const { STORAGE_FILE } = require('./config');

const pending = new Map();
const sessions = new Map();
const lastSeen = new Map();
const lastSent = new Map();
const completed = new Map();

const state = {
  pending,
  sessions,
  lastSeen,
  lastSent,
  completed,
};

function saveStorage() {
  const data = {
    completed: Array.from(completed.values()),
    pending: Array.from(pending.values()),
    sessions: Array.from(sessions.values()),
    lastSeen: Object.fromEntries(lastSeen),
    lastSent: Object.fromEntries(lastSent)
  };
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}

function loadStorage() {
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ completed: [] }, null, 2));
  }

  const saved = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
  if (saved.completed) saved.completed.forEach(s => completed.set(s.username.toLowerCase(), s));
  if (saved.pending) saved.pending.forEach(s => pending.set(s.username.toLowerCase(), s));
  if (saved.sessions) saved.sessions.forEach(s => sessions.set(s.username.toLowerCase(), s));
  if (saved.lastSeen) Object.entries(saved.lastSeen).forEach(([k, v]) => lastSeen.set(k, v));
  if (saved.lastSent) Object.entries(saved.lastSent).forEach(([k, v]) => lastSent.set(k, v));

  console.log("~$ Restored data from storage.json");
}

module.exports = {
  ...state,
  saveStorage,
  loadStorage,
};
