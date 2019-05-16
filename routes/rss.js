const express = require('express');

const router = express.Router();

// Import home controller
const rssController = require('../controllers/rssController');

// Contact routes
router.get('/', rssController.asyncview);

// Export API routes
module.exports = router;
