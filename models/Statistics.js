const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Fixed schema - using Array instead of Set for uniqueVisitors
const statisticsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  visits: { type: Number, default: 0 },
  uniqueVisitors: [{ type: String }], // Changed from Set to Array
  channelsPlayed: { type: Number, default: 0 },
  popularChannels: [{
    name: String,
    playCount: { type: Number, default: 0 }
  }],
  userAgents: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add index for better performance
statisticsSchema.index({ date: 1 });
statisticsSchema.index({ createdAt: -1 });

const Statistics = mongoose.models.Statistics || mongoose.model('Statistics', statisticsSchema);

class StatsManager {
  constructor() {
    this.localStatsFile = path.join(__dirname, '..', 'iptvstats.json');
    this.isMongoAvailable = false;
    this.checkMongoConnection();
  }

  checkMongoConnection() {
    this.isMongoAvailable = mongoose.connection.readyState === 1;
    
    // Listen for connection changes
    mongoose.connection.on('connected', () => {
      this.isMongoAvailable = true;
      console.log('📦 StatsManager: MongoDB connection established');
    });
    
    mongoose.connection.on('disconnected', () => {
      this.isMongoAvailable = false;
      console.log('📝 StatsManager: Switched to local storage');
    });
  }

  async getToday() {
    return new Date().toISOString().split('T')[0];
  }

  generateVisitorId(userAgent, ip = '') {
    const crypto = require('crypto');
    const identifier = userAgent + ip + new Date().toDateString();
    return crypto.createHash('md5').update(identifier).digest('hex').substring(0, 12);
  }

  async recordVisit(userAgent = '', channelName = '', clientIp = '') {
    const today = await this.getToday();
    const visitorId = this.generateVisitorId(userAgent, clientIp);

    if (this.isMongoAvailable) {
      try {
        return await this.recordVisitMongo(today, visitorId, userAgent, channelName);
      } catch (error) {
        console.error('MongoDB stats error, falling back to local:', error.message);
        return await this.recordVisitLocal(today, visitorId, userAgent, channelName);
      }
    } else {
      return await this.recordVisitLocal(today, visitorId, userAgent, channelName);
    }
  }

  async recordVisitMongo(today, visitorId, userAgent, channelName) {
    try {
      let stats = await Statistics.findOne({ date: today });
      
      if (!stats) {
        stats = new Statistics({ 
          date: today,
          uniqueVisitors: [],
          popularChannels: [],
          userAgents: []
        });
      }

      // Increment visits
      stats.visits += 1;
      
      // Add unique visitor (check if not already exists)
      if (!stats.uniqueVisitors.includes(visitorId)) {
        stats.uniqueVisitors.push(visitorId);
      }
      
      // Add user agent
      if (userAgent && userAgent.trim()) {
        stats.userAgents.push(userAgent);
      }
      
      // Handle channel play
      if (channelName && channelName.trim()) {
        stats.channelsPlayed += 1;
        
        const existingChannel = stats.popularChannels.find(c => c.name === channelName);
        if (existingChannel) {
          existingChannel.playCount += 1;
        } else {
          stats.popularChannels.push({ name: channelName, playCount: 1 });
        }
        
        // Keep only top 50 channels to prevent document from growing too large
        if (stats.popularChannels.length > 50) {
          stats.popularChannels.sort((a, b) => b.playCount - a.playCount);
          stats.popularChannels = stats.popularChannels.slice(0, 50);
        }
      }
      
      stats.updatedAt = new Date();
      await stats.save();
      
      return {
        success: true,
        storage: 'mongodb',
        stats: {
          visits: stats.visits,
          uniqueVisitors: stats.uniqueVisitors.length,
          channelsPlayed: stats.channelsPlayed
        }
      };
    } catch (error) {
      throw new Error(`MongoDB operation failed: ${error.message}`);
    }
  }

  async recordVisitLocal(today, visitorId, userAgent, channelName) {
    try {
      let allStats = {};
      
      // Read existing stats
      try {
        const data = await fs.readFile(this.localStatsFile, 'utf8');
        allStats = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
        allStats = {};
      }

      // Initialize today's stats if not exists
      if (!allStats[today]) {
        allStats[today] = {
          visits: 0,
          uniqueVisitors: [],
          channelsPlayed: 0,
          popularChannels: [],
          userAgents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const todayStats = allStats[today];

      // Increment visits
      todayStats.visits += 1;
      
      // Add unique visitor
      if (!todayStats.uniqueVisitors.includes(visitorId)) {
        todayStats.uniqueVisitors.push(visitorId);
      }
      
      // Add user agent
      if (userAgent && userAgent.trim()) {
        todayStats.userAgents.push(userAgent);
      }

      // Handle channel play
      if (channelName && channelName.trim()) {
        todayStats.channelsPlayed += 1;
        
        const existingChannel = todayStats.popularChannels.find(c => c.name === channelName);
        if (existingChannel) {
          existingChannel.playCount += 1;
        } else {
          todayStats.popularChannels.push({ name: channelName, playCount: 1 });
        }
        
        // Keep only top 50 channels
        if (todayStats.popularChannels.length > 50) {
          todayStats.popularChannels.sort((a, b) => b.playCount - a.playCount);
          todayStats.popularChannels = todayStats.popularChannels.slice(0, 50);
        }
      }

      todayStats.updatedAt = new Date().toISOString();

      // Clean old data (keep only last 30 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      Object.keys(allStats).forEach(date => {
        if (new Date(date) < cutoffDate) {
          delete allStats[date];
        }
      });

      // Write back to file
      await fs.writeFile(this.localStatsFile, JSON.stringify(allStats, null, 2));
      
      return {
        success: true,
        storage: 'local',
        stats: {
          visits: todayStats.visits,
          uniqueVisitors: todayStats.uniqueVisitors.length,
          channelsPlayed: todayStats.channelsPlayed
        }
      };
    } catch (error) {
      console.error('Local stats error:', error);
      return {
        success: false,
        error: error.message,
        storage: 'local'
      };
    }
  }

  async getStats(days = 7) {
    if (this.isMongoAvailable) {
      try {
        return await this.getStatsMongo(days);
      } catch (error) {
        console.error('MongoDB stats retrieval error, falling back to local:', error.message);
        return await this.getStatsLocal(days);
      }
    } else {
      return await this.getStatsLocal(days);
    }
  }

  async getStatsMongo(days = 7) {
    try {
      const stats = await Statistics.find()
        .sort({ date: -1 })
        .limit(days)
        .lean(); // Use lean() for better performance

      return stats.map(stat => ({
        date: stat.date,
        visits: stat.visits || 0,
        uniqueVisitors: stat.uniqueVisitors ? stat.uniqueVisitors.length : 0,
        channelsPlayed: stat.channelsPlayed || 0,
        popularChannels: (stat.popularChannels || [])
          .sort((a, b) => b.playCount - a.playCount)
          .slice(0, 10), // Return only top 10 for API response
        storage: 'mongodb'
      }));
    } catch (error) {
      throw new Error(`MongoDB stats retrieval failed: ${error.message}`);
    }
  }

  async getStatsLocal(days = 7) {
    try {
      const data = await fs.readFile(this.localStatsFile, 'utf8');
      const allStats = JSON.parse(data);
      
      const dates = Object.keys(allStats)
        .sort()
        .reverse()
        .slice(0, days);
      
      return dates.map(date => ({
        date,
        visits: allStats[date].visits || 0,
        uniqueVisitors: allStats[date].uniqueVisitors ? allStats[date].uniqueVisitors.length : 0,
        channelsPlayed: allStats[date].channelsPlayed || 0,
        popularChannels: (allStats[date].popularChannels || [])
          .sort((a, b) => b.playCount - a.playCount)
          .slice(0, 10), // Return only top 10
        storage: 'local'
      }));
    } catch (error) {
      console.warn('Local stats file read error:', error.message);
      return [{
        date: await this.getToday(),
        visits: 0,
        uniqueVisitors: 0,
        channelsPlayed: 0,
        popularChannels: [],
        storage: 'local'
      }];
    }
  }

  // Get summary stats for dashboard
  async getSummaryStats() {
    try {
      const stats = await this.getStats(30); // Get last 30 days
      
      const summary = {
        totalVisits: stats.reduce((sum, day) => sum + day.visits, 0),
        totalUniqueVisitors: stats.reduce((sum, day) => sum + day.uniqueVisitors, 0),
        totalChannelsPlayed: stats.reduce((sum, day) => sum + day.channelsPlayed, 0),
        averageDailyVisits: stats.length > 0 ? Math.round(stats.reduce((sum, day) => sum + day.visits, 0) / stats.length) : 0,
        mostPopularChannels: this.getMostPopularChannels(stats),
        storage: this.isMongoAvailable ? 'mongodb' : 'local'
      };

      return summary;
    } catch (error) {
      console.error('Summary stats error:', error);
      return {
        totalVisits: 0,
        totalUniqueVisitors: 0,
        totalChannelsPlayed: 0,
        averageDailyVisits: 0,
        mostPopularChannels: [],
        storage: this.isMongoAvailable ? 'mongodb' : 'local',
        error: error.message
      };
    }
  }

  getMostPopularChannels(stats) {
    const channelCounts = {};
    
    stats.forEach(day => {
      day.popularChannels.forEach(channel => {
        if (channelCounts[channel.name]) {
          channelCounts[channel.name] += channel.playCount;
        } else {
          channelCounts[channel.name] = channel.playCount;
        }
      });
    });

    return Object.entries(channelCounts)
      .map(([name, playCount]) => ({ name, playCount }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);
  }

  // Clean up old data
  async cleanup() {
    if (this.isMongoAvailable) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days
        
        const result = await Statistics.deleteMany({
          createdAt: { $lt: cutoffDate }
        });
        
        console.log(`🧹 Cleaned up ${result.deletedCount} old statistics records`);
      } catch (error) {
        console.error('MongoDB cleanup error:', error);
      }
    }
    // Local cleanup is handled in recordVisitLocal
  }
}

module.exports = { Statistics, StatsManager };
                      
