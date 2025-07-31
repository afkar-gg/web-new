const express = require('express');
const uiRoutes = require('./ui');
const apiRoutes = require('./api');
const adminRoutes = require('./admin');

const router = express.Router();

router.use(uiRoutes);
router.use(apiRoutes);
router.use(adminRoutes);

module.exports = router;
