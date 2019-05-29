const express = require('express');

const router = express.Router();

// Import home controller
const slackController = require('../controllers/slackController');

// Contact routes
router.post('/', slackController.asyncview);

// Export API routes
module.exports = router;
