const express = require("express");
const cookieParser = require("cookie-parser");
const { exec } = require("child_process");

const config = require("./src/config");
const { loadStorage, sessions, completed, lastSeen } = require('./src/state');
const { sendDiscordMessage } = require('./src/utils/discord');
const authMiddleware = require('./src/middleware/auth');
const mainRouter = require('./src/routes/index');

// Load initial data from storage
loadStorage();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply auth middleware to all routes
app.use(authMiddleware);

// Use the main router
app.use("/", mainRouter);

// === Heartbeat Watchdog ===
setInterval(() => {
  const now = Date.now();
  sessions.forEach((s, uname) => {
    if (completed.has(uname)) return;

    const seen = lastSeen.get(uname) || 0;

    // Time's up warning
    if (s.type !== "afk" && !s.warned && now > s.endTime) {
      sendDiscordMessage(config.CHANNEL, { content: `⏳ ${s.username}'s joki ended.` });
      s.warned = true;
    }

    // Offline warning
    if (!s.offline && now - seen > 180000) { // 3 minutes
      sendDiscordMessage(config.CHANNEL, { content: `🔴 @everyone – **${s.username} is OFFLINE.** No heartbeat in 3 minutes.` });
      s.offline = true;
    }

    // Back online
    if (s.offline && now - seen <= 180000) {
      s.offline = false;
    }
  });
}, 60000); // Run every minute

// === Start Server ===
app.listen(config.PORT, () => {
  console.log(`~$ Proxy running on http://localhost:${config.PORT}`);
  console.log(`~$ Version: ${config.version}`);
  config.changelog.forEach(log => console.log(`   • ${log}`));
  console.log(`\n~$ To expose via Cloudflare, run: cloudflared tunnel --url http://localhost:${config.PORT}`);
});