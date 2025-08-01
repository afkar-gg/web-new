const { DASH_PASS } = require('../config');

function requireAuth(req, res, next) {
  const open = [
    "/status", "/login", "/login-submit",
    "/track", "/check", "/complete", "/bond", "/join",
    "/send-job", "/start-job", "/graph", "/disconnected", "/jadwal", "/schedule", "/current-subject", "/order"
  ];
  
  const allowed = open.some(p => req.path === p || req.path.startsWith(p + "/"));
  if (allowed || req.cookies?.dash_auth === DASH_PASS) return next();
  
  return res.redirect("/login");
}

module.exports = requireAuth;
