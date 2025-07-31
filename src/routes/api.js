const express = require('express');
const { CHANNEL, JOB_CHANNEL, GAME_PLACE_ID, LOBBY_PLACE_ID } = require('../config');
const { pending, sessions, completed, lastSeen, lastSent, saveStorage } = require('../state');
const { sendDiscordMessage } = require('../utils/discord');
const router = express.Router();

// POST /start-job
router.post("/start-job", async (req, res) => {
    const { username, no_order, nama_store, jam_selesai_joki, target_bond, type } = req.body;
    const user = username.toLowerCase();
    const now = Date.now();
    const endTime = now + parseFloat(jam_selesai_joki || "0") * 3600 * 1000;
    
    const session = { username, no_order, nama_store, endTime, type, start_bonds: 0, current_bonds: 0, target_bond: parseInt(target_bond || "0"), startTime: now };
    pending.set(user, session);
    saveStorage();
    
    const embed = {
        embeds: [{
            title: `🚀 New Joki Started – ${username}`,
            description: `**Type:** ${type}\n**Order:** ${no_order}\n**Store:** ${nama_store}`,
            color: 0xffd700,
            fields: [
                { name: "End Time", value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                { name: "Start Time", value: `<t:${Math.floor(now / 1000)}:F>`, inline: true }
            ]
        }]
    };
    await sendDiscordMessage(CHANNEL, embed);
    res.json({ ok: true });
});

// GET /cancel/:username
router.get("/cancel/:username", (req, res) => {
    const uname = req.params.username.toLowerCase();
    pending.delete(uname);
    sessions.delete(uname);
    saveStorage();
    res.redirect("/dashboard");
});

// POST /track
router.post('/track', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    
    const user = username.toLowerCase();
    let job = sessions.get(user) || pending.get(user);

    if (job) {
        if (pending.has(user)) {
            pending.delete(user);
            sessions.set(user, job);
        }
        lastSeen.set(user, Date.now());
        saveStorage();
        res.json({ endTime: job.endTime, startTime: job.startTime, duration: job.duration });
    } else {
        res.status(404).json({ error: 'No job found for this user' });
    }
});

// POST /bond
router.post("/bond", async (req, res) => {
    const { username, bonds, placeId, alert } = req.body;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const user = username.toLowerCase();
    const session = sessions.get(user);

    if (alert === "lobby_idle") {
        await sendDiscordMessage(CHANNEL, { content: `⚠️ @everyone ${username} has been idle in the lobby for too long.` });
        return res.json({ ok: true, alert: "idle_sent" });
    }

    if (session) {
        session.lastPlaceId = placeId;
        session.current_bonds = bonds;
        if (session.start_bonds === undefined || session.start_bonds === 0) {
            session.start_bonds = bonds;
        }

        const bondGoalMet = session.type === "bonds" && session.target_bond && (bonds - session.start_bonds >= session.target_bond);

        if (bondGoalMet) {
            const now = Math.floor(Date.now() / 1000);
            const clean = session.no_order.replace(/^OD000000/, "");
            const embed = {
                embeds: [{
                    title: "✅ **JOKI COMPLETED**",
                    description: `**Username:** ${session.username}\n**Order ID:** ${session.no_order}\n[🔗 View Order](https://tokoku.itemku.com/riwayat-pesanan/rincian/${clean})\n\n⏰ Completed at: <t:${now}:f>`,
                    footer: { text: `- ${session.nama_store}` }
                }]
            };
            await sendDiscordMessage(CHANNEL, embed);

            session.completedAt = Date.now();
            sessions.delete(user);
            lastSeen.delete(user);
            completed.set(user, session);
            saveStorage();
            return res.json({ ok: true, completed: true });
        }

        lastSent.set(user, Date.now());
        saveStorage();
        return res.json({ ok: true });
    }

    return res.status(404).json({ error: "No active session" });
});

// GET /status/:query
router.get("/status/:query", (req, res) => {
    const q = req.params.query.toLowerCase();
    const findSession = coll => Array.from(coll.values()).find(s => s.username.toLowerCase() === q || (s.no_order && s.no_order.toLowerCase() === q));
    const session = findSession(sessions) || findSession(pending) || findSession(completed);
    
    if (!session) return res.status(404).json({ error: `No session found for ${req.params.query}` });

    const userKey = session.username.toLowerCase();
    const isActive = sessions.has(userKey);
    const isCompleted = completed.has(userKey);
    let status = isCompleted ? "completed" : (isActive ? "running" : "pending");

    const seen = (session.type === "bonds" ? lastSent.get(userKey) : lastSeen.get(userKey)) || 0;
    if (isActive && Date.now() - seen > 120000) {
        status = "inactive";
    }

    const base = { username: session.username, status, type: session.type, no_order: session.no_order, nama_store: session.nama_store };

    if (status === "running" || status === "inactive") {
        return res.json({
            ...base,
            endTime: session.endTime,
            timeLeft: Math.max(0, session.endTime - Date.now()),
            lastSeen: seen,
            activity: session.placeId === GAME_PLACE_ID ? "Gameplay" : session.placeId === LOBBY_PLACE_ID ? "Lobby" : "Unknown",
            currentBonds: session.current_bonds,
            targetBonds: session.target_bond,
            gained: session.type === "bonds" ? session.current_bonds - session.start_bonds : undefined
        });
    }

    if (status === "completed") {
        return res.json({ ...base, completedAt: session.completedAt || session.endTime, gained: session.type === "bonds" ? session.current_bonds - session.start_bonds : undefined });
    }

    return res.json(base); // pending
});

// POST /send-job
router.post("/send-job", async (req, res) => {
    const { username, placeId, jobId, join_url } = req.body;
    if (!username || !placeId || !jobId || !join_url) return res.status(400).json({ error: "Missing fields" });

    const embed = {
        content: `\`\`${jobId}\`\``,
        embeds: [{
            title: `🧩 Job ID for ${username}`,
            description: `**Place ID:** \`${placeId}\`\n**Job ID:** \`${jobId}\``,
            color: 0x3498db,
            fields: [{ name: "Join Link", value: `[Click to Join](${join_url})` }]
        }]
    };
    await sendDiscordMessage(JOB_CHANNEL, embed);
    res.json({ ok: true });
});

// POST /check
router.post("/check", (req, res) => {
    const user = req.body.username.toLowerCase();
    if (!sessions.has(user)) return res.status(404).json({ error: "No active session" });
    lastSeen.set(user, Date.now());
    res.json({ ok: true });
});

// POST /complete
router.post("/complete", async (req, res) => {
    const user = req.body.username.toLowerCase();
    const s = sessions.get(user);
    if (!s) return res.status(404).json({ error: "No session" });

    const clean = s.no_order.replace(/^OD000000/, "");
    const embed = {
        embeds: [{
            title: "✅ **JOKI COMPLETED**",
            description: `**Username:** ${s.username}\n**Order ID:** ${s.no_order}\n[🔗 View Order](https://tokoku.itemku.com/riwayat-pesanan/rincian/${clean})\n\n⏰ Completed at: <t:${Math.floor(Date.now() / 1000)}:f>`,
            footer: { text: `- ${s.nama_store}` }
        }]
    };
    await sendDiscordMessage(CHANNEL, embed);

    sessions.delete(user);
    lastSeen.delete(user);
    completed.set(user, s);
    saveStorage();
    res.json({ ok: true });
});

// POST /disconnected
router.post("/disconnected", async (req, res) => {
    const { username, reason = "Unknown", placeId } = req.body;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const embed = {
        embeds: [{
            title: `❌ Player Disconnected`,
            color: 0xff0000,
            fields: [
                { name: "Username", value: username, inline: true },
                { name: "Reason", value: reason, inline: true },
                { name: "Place ID", value: placeId || "Unknown", inline: true }
            ],
            timestamp: new Date().toISOString()
        }]
    };
    await sendDiscordMessage(CHANNEL, embed);
    res.json({ ok: true });
});

module.exports = router;
