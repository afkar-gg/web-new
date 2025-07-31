const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { BOT_TOKEN } = require('../config');

async function sendDiscordMessage(channelId, payload) {
  if (!channelId) {
    console.error("Attempted to send Discord message without a channel ID.");
    return;
  }
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${BOT_TOKEN}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("❌ Failed to send Discord message:", error);
  }
}

module.exports = { sendDiscordMessage };
