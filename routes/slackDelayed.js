const express = require('express');

const router = express.Router();

// Import home controller
const slackdelayedController = require('../controllers/slackdelayedController');

// Contact routes
router.post('/', slackdelayedController.view);

// Export API routes
module.exports = router;
