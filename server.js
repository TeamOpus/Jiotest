const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static('public'));

// Database connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('📦 MongoDB connected successfully');
    } else {
      console.log('📝 Using local storage fallback');
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('📝 Falling back to local storage');
  }
};

connectDB();

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Serve main app
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`👨‍💻 Developer: @ifeelram`);
  console.log(`🏘️  Community: @BillaSpace`);
});
