const express = require('express');
const { StatsManager } = require('../models/Statistics');
const router = express.Router();

const statsManager = new StatsManager();

// Record visit
router.post('/visit', async (req, res) => {
  try {
    const { userAgent, channelName } = req.body;
    await statsManager.recordVisit(userAgent, channelName);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get playlist (hidden URL)
router.get('/playlist', async (req, res) => {
  try {
    // Record the visit
    await statsManager.recordVisit(req.headers['user-agent']);
    
    // Return the hidden playlist URL
    const playlistUrl = process.env.PLAYLIST_URL || 'https://raw.githubusercontent.com/alex4528/m3u/refs/heads/main/jstar.m3u';
    res.json({ playlistUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
