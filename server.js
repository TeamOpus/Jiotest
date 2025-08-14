const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Get server IP address with fallback
const getServerIP = () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    
    // Look for custom IP first (from environment)
    if (process.env.CUSTOM_IP) {
      return process.env.CUSTOM_IP;
    }
    
    // Look for external/public IP
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const addresses = networkInterfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal) {
          return address.address;
        }
      }
    }
    
    // Look for private network IP
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const addresses = networkInterfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && 
            !address.internal && 
            (address.address.startsWith('192.168.') || 
             address.address.startsWith('10.') || 
             address.address.startsWith('172.'))) {
          return address.address;
        }
      }
    }
    
    // Fallback to localhost
    return 'localhost';
  } catch (error) {
    console.warn('⚠️  Could not detect IP address:', error.message);
    return 'localhost';
  }
};

// Enhanced middleware configuration for Vercel compatibility
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      mediaSrc: ["'self'", "https:", "http:", "blob:"],
      connectSrc: ["'self'", "https:", "http:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Enhanced logging for different environments
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
} else {
  app.use(morgan('dev'));
}

// Enhanced body parsing
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 50000
}));

// Trust proxy for accurate IP detection (important for Vercel)
app.set('trust proxy', true);

// Static files with enhanced caching
app.use(express.static('public', {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true,
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    } else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    }
  }
}));

// Database connection with enhanced error handling
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        bufferCommands: false,
        bufferMaxEntries: 0
      };
      
      await mongoose.connect(process.env.MONGODB_URI, options);
      console.log('📦 MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });
      
    } else {
      console.log('📝 Using local storage fallback (MongoDB URI not provided)');
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('📝 Falling back to local storage');
  }
};

// Initialize database connection
connectDB();

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(healthStatus);
});

// API Routes with error handling
app.use('/api', (req, res, next) => {
  // Add request timestamp for debugging
  req.timestamp = Date.now();
  next();
}, require('./routes/api'));

app.use('/admin', (req, res, next) => {
  // Add security headers for admin routes
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, require('./routes/admin'));

// Serve main app with enhanced headers
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/index.html');
});

// Serve admin panel with security headers
app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(__dirname + '/public/admin.html');
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  const apiDocs = {
    title: 'IPTV Stream+ API Documentation',
    version: '2.0.0',
    endpoints: {
      'GET /health': 'Server health check',
      'POST /api/visit': 'Record visitor statistics',
      'GET /api/playlist': 'Get playlist URL (authenticated)',
      'POST /admin/login': 'Admin authentication',
      'GET /admin/stats': 'Get platform statistics (admin only)'
    },
    developer: '@ifeelram',
    community: '@BillaSpace'
  };
  
  res.json(apiDocs);
});

// Enhanced 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handler with detailed logging
app.use((err, req, res, next) => {
  console.error(`❌ Error occurred:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Something went wrong!',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  // Close MongoDB connection
  mongoose.connection.close(() => {
    console.log('📦 MongoDB connection closed');
  });
  
  // Close HTTP server
  if (server) {
    server.close(() => {
      console.log('🚀 HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Server startup
let server;
const serverIP = getServerIP();

// For Vercel, we export the app instead of listening
if (process.env.VERCEL) {
  // Vercel serverless function export
  module.exports = app;
  console.log('🚀 Vercel serverless function ready');
  console.log(`👨‍💻 Developer: @ifeelram`);
  console.log(`🏘️  Community: @BillaSpace`);
} else {
  // Traditional server for other platforms
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    
    if (serverIP !== 'localhost') {
      console.log(`🌍 Network: http://${serverIP}:${PORT}`);
    }
    
    console.log(`🔗 Admin: http://${serverIP}:${PORT}/admin`);
    console.log(`📊 Health: http://${serverIP}:${PORT}/health`);
    console.log(`📚 API Docs: http://${serverIP}:${PORT}/api-docs`);
    console.log(`👨‍💻 Developer: @ifeelram`);
    console.log(`🏘️ Brought To You By: @BillaSpace`);
    console.log(`📦 Database: ${mongoose.connection.readyState === 1 ? 'MongoDB' : 'Local Storage'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Handle server errors
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}
  
