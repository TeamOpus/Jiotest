const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const statisticsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  visits: { type: Number, default: 0 },
  uniqueVisitors: { type: Set, default: new Set() },
  channelsPlayed: { type: Number, default: 0 },
  popularChannels: [{
    name: String,
    playCount: { type: Number, default: 0 }
  }],
  userAgents: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Statistics = mongoose.models.Statistics || mongoose.model('Statistics', statisticsSchema);

class StatsManager {
  constructor() {
    this.localStatsFile = path.join(__dirname, '..', 'iptvstats.json');
    this.useDatabase = mongoose.connection.readyState === 1;
  }

  async getToday() {
    return new Date().toISOString().split('T')[0];
  }

  async recordVisit(userAgent = '', channelName = '') {
    const today = await this.getToday();
    const visitorId = this.generateVisitorId(userAgent);

    if (this.useDatabase) {
      try {
        const stats = await Statistics.findOne({ date: today }) || new Statistics({ date: today });
        stats.visits += 1;
        stats.uniqueVisitors.add(visitorId);
        stats.userAgents.push(userAgent);
        
        if (channelName) {
          stats.channelsPlayed += 1;
          const channel = stats.popularChannels.find(c => c.name === channelName);
          if (channel) {
            channel.playCount += 1;
          } else {
            stats.popularChannels.push({ name: channelName, playCount: 1 });
          }
        }
        
        stats.updatedAt = new Date();
        await stats.save();
        return true;
      } catch (error) {
        console.error('Database stats error:', error);
        return this.recordVisitLocal(userAgent, channelName);
      }
    } else {
      return this.recordVisitLocal(userAgent, channelName);
    }
  }

  async recordVisitLocal(userAgent = '', channelName = '') {
    try {
      const today = await this.getToday();
      const visitorId = this.generateVisitorId(userAgent);
      
      let stats = {};
      try {
        const data = await fs.readFile(this.localStatsFile, 'utf8');
        stats = JSON.parse(data);
      } catch (error) {
        stats = {};
      }

      if (!stats[today]) {
        stats[today] = {
          visits: 0,
          uniqueVisitors: [],
          channelsPlayed: 0,
          popularChannels: [],
          userAgents: []
        };
      }

      stats[today].visits += 1;
      
      if (!stats[today].uniqueVisitors.includes(visitorId)) {
        stats[today].uniqueVisitors.push(visitorId);
      }
      
      stats[today].userAgents.push(userAgent);

      if (channelName) {
        stats[today].channelsPlayed += 1;
        const channel = stats[today].popularChannels.find(c => c.name === channelName);
        if (channel) {
          channel.playCount += 1;
        } else {
          stats[today].popularChannels.push({ name: channelName, playCount: 1 });
        }
      }

      await fs.writeFile(this.localStatsFile, JSON.stringify(stats, null, 2));
      return true;
    } catch (error) {
      console.error('Local stats error:', error);
      return false;
    }
  }

  generateVisitorId(userAgent) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(userAgent + Date.now().toString()).digest('hex').substring(0, 8);
  }

  async getStats(days = 7) {
    if (this.useDatabase) {
      try {
        const stats = await Statistics.find()
          .sort({ date: -1 })
          .limit(days);
        return stats.map(stat => ({
          date: stat.date,
          visits: stat.visits,
          uniqueVisitors: stat.uniqueVisitors.size || 0,
          channelsPlayed: stat.channelsPlayed,
          popularChannels: stat.popularChannels
        }));
      } catch (error) {
        console.error('Database stats retrieval error:', error);
        return this.getStatsLocal(days);
      }
    } else {
      return this.getStatsLocal(days);
    }
  }

  async getStatsLocal(days = 7) {
    try {
      const data = await fs.readFile(this.localStatsFile, 'utf8');
      const stats = JSON.parse(data);
      const dates = Object.keys(stats).sort().reverse().slice(0, days);
      
      return dates.map(date => ({
        date,
        visits: stats[date].visits || 0,
        uniqueVisitors: stats[date].uniqueVisitors?.length || 0,
        channelsPlayed: stats[date].channelsPlayed || 0,
        popularChannels: stats[date].popularChannels || []
      }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = { Statistics, StatsManager };
