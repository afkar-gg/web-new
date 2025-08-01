const express = require('express');
const { version, changelog, DASH_PASS } = require('../config');
const { pending, sessions, completed } = require('../state');
const router = express.Router();

// Logic for rendering table rows, moved from original file
function renderRows(items, type) {
    if (!items.length) {
      return `<tr><td colspan="6" style="color:#aaa;text-align:center;">No ${type} sessions</td></tr>`;
    }
    const formatAmount = (s) => {
        if (s.type === "bonds") return `${(s.current_bonds - s.start_bonds) || 0} bonds`;
        if (s.startTime && s.endTime) {
            const minutes = Math.round((s.endTime - s.startTime) / 60000);
            return `${minutes} min`;
        }
        return "-";
    };
    return items.map(s => `
      <tr>
        <td>${s.username}</td>
        <td>${s.no_order || "-"}</td>
        <td>${s.nama_store || "-"}</td>
        <td>${s.type || "afk"}</td>
        <td>${formatAmount(s)}</td>
        <td>
          ${type === "active" ? `<form method="GET" action="/cancel/${s.username}"><button style="padding:4px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;">✖</button></form>` : "–"}
        </td>
      </tr>
    `).join("");
}

// GET /
router.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>WELCOME TO AFKARSTORE</title><style>body{background:#18181b;color:#ececec;font-family:'Inter',Arial,sans-serif;margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;}.container{width:100%;max-width:420px;}.card{background:#23232b;border-radius:14px;box-shadow:0 2px 16px #0006;padding:20px;margin-bottom:20px;}h1,h2{color:#3b82f6;margin-top:0;}h2{font-size:1.2em;margin-top:1.2em;}a{color:#38bdf8;text-decoration:none;font-weight:bold;}a:hover{color:#3b82f6;}ul{padding-left:1.2em;}</style></head><body><div class="container"><div class="card"><h1>WELCOME TO AFKARSTORE</h1><p>Selamat datang di bagian kecil dari store saya, ini adalah tempat dimana saya menyimpan informasi joki (tidak akan menyimpan password), semoga dengan adanya ini mungkin bisa mempermudah untuk pembeli dan penjoki (saya sendiri 🗿)</p></div><div class="card"><h2>Kenapa Pilih Afkarstore?</h2><ul><li>Harga yang terjangkau (biasanya termurah di itemku)</li><li>memiliki sistem online checker (akan cek jika akun online atau tidak)</li><li>otomatis menghitung kapan selesai nya joki</li><li>bla bla bla (malas yapping)</li></ul></div><div class="card"><h2>Knp Lu Bikin Website Ini?</h2><p>Cukup langka yg punya website buat jadiin tool utk joki (apalagi roblox 😂). Sambil emg sengaja bikin projek kecil sambil belajar ama chatgpt. Dan juga biar beda dari yang lain, lebih keren, dan berkualitas tinggi. walau masih berkembang dari fitur2 keren lainnya, ini udh cukup keren buat joki roblox</p></div><div class="card" style="text-align:center;"><p>Pencet <a href="/status" target="_blank">Disini</a> jika anda sedang ingin melihat status joki kalian</p></div></div></body></html>
  `);
});

// GET /login
router.get("/login", (req, res) => {
  res.send(`
    <!DOCTYPE html><html><body style="margin:0;height:100vh;background:#18181b;color:#eee;display:flex;justify-content:center;align-items:center;font-family:sans-serif;"><form method="POST" action="/login-submit" style="display:flex;flex-direction:column;width:260px;"><input type="password" name="password" placeholder="Password" required style="padding:10px;margin:6px 0;border:none;border-radius:4px;background:#2a2a33;color:#eee;" /><button type="submit" style="padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:4px;">Login</button></form></body></html>
  `);
});

// POST /login-submit
router.post("/login-submit", (req, res) => {
  const { password } = req.body;
  if (password !== DASH_PASS) return res.status(401).send("❌ Wrong password");
  res.cookie("dash_auth", DASH_PASS, { httpOnly: true, maxAge: 86400000 }); // 1 day cookie
  res.redirect("/dashboard");
});

// GET /dashboard
router.get("/dashboard", (req, res) => {
  const pendList = Array.from(pending.values());
  const activeList = Array.from(sessions.values());
  const completedList = Array.from(completed.values());

  res.send(`
    <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Dashboard</title><style>body{margin:0;padding:20px;background:#18181b;color:#ececec;font-family:'Inter',Arial,sans-serif;}.container{max-width:1000px;margin:auto;}h1{color:#3b82f6;text-align:center;}.card{background:#23232b;padding:20px;margin-bottom:20px;border-radius:14px;box-shadow:0 2px 16px #0006;}input,select,button{width:100%;padding:12px;margin-top:8px;border:none;border-radius:6px;background:#2a2a33;color:#eee;font-size:16px;}button{background:#3b82f6;font-weight:bold;cursor:pointer;}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;}th,td{padding:10px;border-bottom:1px solid #333;text-align:left;}th{background:#2a2a33;color:#eee;}.bottom-buttons{display:flex;gap:10px;margin:20px 0;}.bottom-buttons form{flex:1;}.bottom-buttons button{width:100%;padding:12px;border:none;border-radius:6px;color:#fff;font-size:16px;cursor:pointer;}.shutdown-btn{background:#ef4444;}.update-btn{background:#10b981;}.version{text-align:center;font-size:14px;color:#aaa;}@media(max-width:768px){input,select,button{font-size:18px;}table{font-size:12px;}}</style></head><body><div class="container"><h1>Joki Dashboard</h1><div class="card"><h2>Buat Job Baru</h2><form id="jobForm"><input name="username" placeholder="Username" required /><input name="no_order" placeholder="Order ID" required /><input name="nama_store" placeholder="Nama Store" required /><input name="jam_selesai_joki" type="number" step="any" placeholder="Durasi (jam)" /><input name="target_bond" type="number" placeholder="Target Bond (untuk bonds)" /><select name="type" required><option value="afk">AFK</option><option value="bonds">Bonds</option></select><button type="submit">🚀 Mulai Job</button></form></div><div class="card"><h2>Pending Jobs</h2><div style="overflow-x:auto;"><table><tr><th>Username</th><th>Order</th><th>Store</th><th>Type</th><th>Info</th><th>Action</th></tr>${renderRows(pendList,"pending")}</table></div></div><div class="card"><h2>Active Jobs</h2><div style="overflow-x:auto;"><table><tr><th>Username</th><th>Order</th><th>Store</th><th>Type</th><th>Info</th><th>Action</th></tr>${renderRows(activeList,"active")}</table></div></div><div class="card"><h2>Completed Jobs</h2><div style="overflow-x:auto;"><table><tr><th>Username</th><th>Order</th><th>Store</th><th>Type</th><th>Info</th><th>Action</th></tr>${renderRows(completedList,"completed")}</table></div></div><div class="bottom-buttons"><form method="POST" action="/shutdown"><button type="submit" class="shutdown-btn">🔴 Shutdown</button></form><form method="POST" action="/restart"><button type="submit" class="update-btn">🟢 Update</button></form></div><div class="version">version: ${version}<br>${changelog.map(l=>`• ${l}`).join("<br>")}</div></div><script>document.getElementById("jobForm").onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));await fetch("/start-job",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});location.reload();};</script></body></html>
  `);
});

// GET /status
app.get("/status", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Check Joki Status</title>
  <style>
    body {
      margin:0; padding:0; background:#18181b; color:#eee;
      font-family:'Inter',sans-serif; display:flex; align-items:center; justify-content:center;
      min-height:100vh;
    }
    .main-container {
      width:90%; max-width:500px; padding:20px;
      background:#23232b; border-radius:12px; box-shadow:0 2px 16px #0008;
      text-align:center;
    }
    input#u, button {
      width:100%; padding:12px; margin-top:12px;
      border:none; border-radius:4px; font-size:16px;
    }
    input#u { background:#2a2a33; color:#eee; }
    button {
      background:#3b82f6; color:#fff; cursor:pointer;
    }
    .status-frame {
      margin-top:20px; padding:16px;
      background:#2c2c34; border-radius:8px; box-shadow:0 2px 10px #000;
      text-align:center;
    }
    .qr-frame {
      margin-top:12px; padding:16px;
      background:#1f1f25; border-radius:8px;
      text-align:left; font-size:14px;
    }
    h3 { margin-bottom:8px; color:#3b82f6; }
    @media(min-width:768px) {
      .main-container { max-width:80%; }
    }
  </style>
</head>
<body>
  <div class="main-container">
    <h2>🔍 Cek Status Joki</h2>
    <input id="u" placeholder="Username atau Order ID"/>
    <button onclick="startCheck()">Check</button>

    <div id="r" class="status-frame"></div>

    <div class="qr-frame">
      <h3>Mau Diskon Untuk Pembelian Selanjutnya?</h3>
      <p>Minta kode QRIS ke owner via WhatsApp untuk dapat harga lebih murah.</p>
      <h3>Apakah Tidak Bisa Mendapatkan Diskon Di Itemku?</h3>
      <p>Karena ada pajak 12% dari Itemku, saya hanya bisa berikan harga segitu. Ini QRIS saya sebelum pindah ke Itemku.</p>
      <h3>Dulu Berjualan Dimana?</h3>
      <p>🤫</p>
    </div>
  </div>

  <script>
    let interval;
    function startCheck() {
      clearInterval(interval);
      const q = document.getElementById('u').value.trim();
      if (!q) return;
      check(q);
      interval = setInterval(() => check(q), 1000);
    }

    async function check(q) {
      const out = document.getElementById('r');
      try {
        const res = await fetch('/status/' + encodeURIComponent(q), {
          headers: { "Accept": "application/json" }
        });
        const d = await res.json();

        if (!res.ok) {
          out.innerHTML = '❌ ' + d.error;
          clearInterval(interval);
          return;
        }

        if (d.status === 'pending') {
          out.innerHTML = '⌛ <b>' + d.username + '</b> sedang menunggu...';
        } else if (d.status === 'running' || d.status === 'inactive') {
          const rem = Math.max(0, Math.floor((d.endTime - Date.now()) / 1000));
          const h = Math.floor(rem / 3600), m = Math.floor((rem % 3600) / 60), s = rem % 60;
          const lastSeenAgo = Math.max(0, Date.now() - d.lastSeen);
          const lm = Math.floor(lastSeenAgo / 60000);
          const ls = Math.floor((lastSeenAgo % 60000) / 1000);

          let text = (d.status === 'inactive' ? '🔴 ' : '🟢 ') + '<b>' + d.username + '</b> aktif<br>';
          if (d.type === 'bonds') {
            text += '📈 Gained: ' + d.gained + ' / ' + d.targetBonds + ' bonds<br>';
          } else {
            text += '⏳ Time left: ' + h + 'h ' + m + 'm ' + s + 's<br>';
          }
          text += '👁️ Last seen: ' + lm + 'm ' + ls + 's ago<br>';
          text += '🎮 Activity: ' + d.activity;
          out.innerHTML = text;
        } else if (d.status === 'completed') {
          let text = '✅ <b>' + d.username + '</b> selesai<br>';
          text += '🧾 Order: ' + d.no_order + '<br>';
          if (d.gained !== undefined) text += '📈 Gained: ' + d.gained + ' bonds';
          out.innerHTML = text;
          clearInterval(interval);
        }
      } catch {
        out.innerHTML = '❌ Error fetching status';
        clearInterval(interval);
      }
    }
  </script>
</body>
</html>`);
});

// GET /order
router.get("/order", (req, res) => {
    res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Cek Order</title><style>body{margin:0;padding:0;background:#18181b;color:#eee;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}.container{width:90%;max-width:500px;background:#23232b;padding:20px;border-radius:12px;text-align:center;box-shadow:0 2px 16px #0008;}input,button{width:100%;padding:12px;margin-top:12px;border:none;border-radius:4px;font-size:16px;}input{background:#2a2a33;color:#eee;}button{background:#3b82f6;color:#fff;cursor:pointer;}</style></head><body><div class="container"><h2>🔍 Cek Order</h2><input id="q" placeholder="Order ID (Contoh: OD000000123456)"/><button onclick="startCheck()">Check Order</button></div><script>function startCheck(){const q=document.getElementById("q").value.trim();if(!q||!q.startsWith("OD"))return;const clean=q.replace(/^OD000000/,"");window.location.href="/order/"+clean}</script></body></html>`);
});

// GET /order/:clean
router.get("/order/:clean", (req, res) => {
    res.redirect(`https://tokoku.itemku.com/riwayat-pesanan/rincian/${req.params.clean}`);
});

// GET /join
router.get("/join", (req, res) => {
    const { place, job, username } = req.query; // Assume username is passed
    if (!place || !job) return res.status(400).send("Missing place/job query parameters");
    
    const user = username.toLowerCase();
    const jobData = pending.get(user);
    if(jobData) {
        pending.delete(user);
        sessions.set(user, jobData);
        saveStorage();
    }
    
    const uri = `roblox://experiences/start?placeId=${place}&gameId=${job}`;
    res.send(`<!DOCTYPE html><html><body style="background:#18181b;color:#eee;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>🔗 Redirecting to Roblox...</h1><a href="${uri}" style="color:#3b82f6;">Tap here if not redirected</a></div><script>setTimeout(()=>{location.href="${uri}"},1500)</script></body></html>`);
});

module.exports = router;
