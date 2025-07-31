const express = require('express');
const { exec } = require("child_process");
const router = express.Router();

// POST /shutdown
router.post("/shutdown", (req, res) => {
  res.send("🔴 Server shutting down...");
  process.exit(0);
});

// POST /restart
router.post("/restart", (req, res) => {
  exec("bash ./rblx.sh", (err, stdout, stderr) => {
    if (err) {
        console.error("Error during restart script execution:", err);
        return res.status(500).send("❌ Failed to restart.");
    }
    console.log("Restart stdout:", stdout);
    console.error("Restart stderr:", stderr);
    res.send("🔄 Restarted via rblx.sh");
  });
});

module.exports = router;
