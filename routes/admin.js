const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { StatsManager } = require('../models/Statistics');
const router = express.Router();

const statsManager = new StatsManager();

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied - No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (!password) {
      return res.status(400).json({ 
        success: false,
        error: 'Password is required' 
      });
    }
    
    if (password === adminPassword) {
      const token = jwt.sign(
        { 
          admin: true,
          timestamp: Date.now()
        },
        process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
        { expiresIn: '24h' }
      );
      
      res.json({ 
        success: true,
        token,
        expiresIn: '24h',
        message: 'Login successful'
      });
    } else {
      res.status(401).json({ 
        success: false,
        error: 'Invalid password' 
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during login' 
    });
  }
});

// Get detailed statistics (admin only)
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90); // Max 90 days
    const stats = await statsManager.getStats(days);
    
    res.json({
      success: true,
      data: stats,
      requestedDays: days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve statistics' 
    });
  }
});

// Get summary statistics (admin only)
router.get('/stats/summary', authenticateAdmin, async (req, res) => {
  try {
    const summary = await statsManager.getSummaryStats();
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin summary stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve summary statistics' 
    });
  }
});

// Clean up old data (admin only)
router.post('/cleanup', authenticateAdmin, async (req, res) => {
  try {
    await statsManager.cleanup();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin cleanup error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform cleanup' 
    });
  }
});

module.exports = router;
