const fs = require('fs');
const appConfig = require('../config.json');

// === Version Info ===
const version = "v2.2.4";
const changelog = [
  "whitelisted order endpoint",
];

// === App Configuration ===
const STORAGE_FILE = "./storage.json";
const BOT_TOKEN = appConfig.BOT_TOKEN;
const CHANNEL = appConfig.CHANNEL_ID;
const JOB_CHANNEL = appConfig.JOB_CHANNEL_ID;
const DASH_PASS = appConfig.DASHBOARD_PASSWORD || "secret";
const GAME_PLACE_ID = 70876832253163;
const LOBBY_PLACE_ID = 116495829188952;
const PORT = appConfig.PORT || 3000;

if (!BOT_TOKEN || !CHANNEL) {
  console.error("❌ Missing BOT_TOKEN or CHANNEL_ID in config.json");
  process.exit(1);
}

module.exports = {
  version,
  changelog,
  STORAGE_FILE,
  BOT_TOKEN,
  CHANNEL,
  JOB_CHANNEL,
  DASH_PASS,
  GAME_PLACE_ID,
  LOBBY_PLACE_ID,
  PORT,
};
