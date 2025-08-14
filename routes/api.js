const express = require('express');
const { StatsManager } = require('../models/Statistics');
const router = express.Router();

const statsManager = new StatsManager();

// Record visit with client IP
router.post('/visit', async (req, res) => {
  try {
    const { userAgent, channelName } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    const result = await statsManager.recordVisit(userAgent, channelName, clientIp);
    res.json(result);
  } catch (error) {
    console.error('Visit recording error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      storage: 'unknown'
    });
  }
});

// Get playlist (hidden URL)
router.get('/playlist', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Record the visit
    await statsManager.recordVisit(req.headers['user-agent'], '', clientIp);
    
    // Return the hidden playlist URL
    const playlistUrl = process.env.PLAYLIST_URL || 'https://raw.githubusercontent.com/alex4528/m3u/refs/heads/main/jstar.m3u';
    res.json({ 
      success: true,
      playlistUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Playlist API error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get summary statistics (public endpoint with limited data)
router.get('/stats/summary', async (req, res) => {
  try {
    const summary = await statsManager.getSummaryStats();
    
    // Return limited public data
    res.json({
      totalVisits: summary.totalVisits,
      totalChannelsPlayed: summary.totalChannelsPlayed,
      storage: summary.storage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Summary stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get summary statistics'
    });
  }
});

module.exports = router;
