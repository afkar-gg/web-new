const { DASH_PASS } = require('../config');

function requireAuth(req, res, next) {
  const openPaths = [
    "/status", "/login", "/login-submit", "/track", "/check", "/complete", 
    "/bond", "/join", "/send-job", "/start-job", "/status/", "/graph", 
    "/disconnected", "/jadwal", "/schedule", "/current-subject", "/order"
  ];
  
  if (openPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  if (req.cookies?.dash_auth === DASH_PASS) {
    return next();
  }

  return res.redirect("/login");
}

module.exports = requireAuth;
