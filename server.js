<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apex Stream+ | Modern IPTV Streaming Platform</title>
    
    <!-- Favicon and Icons -->
    <link rel="icon" href="assets/icons/favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/icons/favicon-16x16.png">
    <link rel="manifest" href="assets/icons/site.webmanifest">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- CSS -->
    <link rel="stylesheet" href="css/style.css">
    
    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.6.0/shaka-player.compiled.min.js" crossorigin="anonymous"></script>
    
    <!-- Meta Tags -->
    <meta name="description" content="Modern IPTV Streaming Platform with Glassmorphism UI - Experience premium streaming with cutting-edge technology">
    <meta name="keywords" content="IPTV, Streaming, Modern, Glassmorphism, TV, Channels, Live TV, Premium Streaming">
    <meta name="author" content="@ifeelram">
    <meta name="theme-color" content="#667eea">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="Apex Stream+ | Modern IPTV Platform">
    <meta property="og:description" content="Experience premium IPTV streaming with our modern glassmorphism interface and cutting-edge technology">
    <meta property="og:type" content="website">
    <meta property="og:image" content="assets/icons/icon-512x512.png">
    <meta property="og:url" content="/">
    <meta property="og:site_name" content="Apex Stream+">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Apex Stream+ | Modern IPTV Platform">
    <meta name="twitter:description" content="Experience premium IPTV streaming with modern glassmorphism interface">
    <meta name="twitter:image" content="assets/icons/icon-512x512.png">
    
    <!-- PWA Meta Tags -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Apex Stream+">
</head>
<body>
    <!-- Enhanced Animated Background with Particles -->
    <div class="animated-bg">
        <div class="wave wave1"></div>
        <div class="wave wave2"></div>
        <div class="wave wave3"></div>
        <div class="particles">
            <span class="particle"></span>
            <span class="particle"></span>
            <span class="particle"></span>
            <span class="particle"></span>
            <span class="particle"></span>
        </div>
    </div>

    <!-- Enhanced Header -->
    <header class="glass-header">
        <div class="container">
            <div class="logo">
                <div class="logo-icon">📺</div>
                <div class="logo-text">
                    <h1>Apex Stream+</h1>
                    <span class="tagline">Ultra-Modern Streaming Experience</span>
                </div>
            </div>
            <div class="header-controls">
                <div class="control-group">
                    <label for="playerSelect">Player:</label>
                    <select id="playerSelect" class="glass-select" title="Select video player">
                        <option value="shaka">🚀 Shaka Player</option>
                        <option value="native">⚡ MediaX Player</option>
                    </select>
                </div>
                <div class="control-group" style="display: none;" id="audioGroup">
                    <label for="audioSelect">Audio:</label>
                    <select id="audioSelect" class="glass-select" title="Select audio track">
                        <option value="">Default Audio</option>
                    </select>
                </div>
                <div class="stats-indicator">
                    <span id="onlineStatus" class="status-dot online" title="Connection status"></span>
                    <span class="status-text">Online</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container">
        <!-- Enhanced Video Player Section -->
        <section class="player-section glass-panel">
            <div class="video-container">
                <video id="video" controls autoplay muted playsinline 
                       preload="none"
                       poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23000'/%3E%3Ctext x='50' y='50' font-size='40' text-anchor='middle' dy='.3em' fill='%23667eea'%3E📺%3C/text%3E%3C/svg%3E">
                </video>
                
                <!-- Enhanced Player Overlay -->
                <div class="player-overlay">
                    <div class="current-channel">
                        <div class="channel-info">
                            <div class="channel-icon">📺</div>
                            <div class="channel-details">
                                <span id="currentChannelName">Select a channel to start streaming</span>
                                <span id="currentChannelGroup" class="channel-group-small"></span>
                            </div>
                        </div>
                        <div class="player-controls">
                            <button id="fullscreenBtn" class="control-btn" title="Toggle Fullscreen" aria-label="Fullscreen">⛶</button>
                            <button id="pipBtn" class="control-btn" title="Picture in Picture" aria-label="Picture in Picture" style="display: none;">📱</button>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Loading Spinner -->
                <div id="playerLoading" class="player-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Loading stream...</span>
                </div>
            </div>
        </section>

        <!-- Enhanced Controls Section -->
        <section class="controls-section glass-panel">
            <div class="search-container">
                <div class="search-wrapper">
                    <span class="search-icon" aria-hidden="true">🔍</span>
                    <input id="searchInput" type="text" 
                           placeholder="Search channels, genres, languages..." 
                           class="glass-input search-input" 
                           autocomplete="off"
                           spellcheck="false"
                           aria-label="Search channels">
                    <button id="clearSearch" class="clear-btn" style="display: none;" 
                            title="Clear search" aria-label="Clear search">✖</button>
                </div>
            </div>
            
            <div class="filter-container">
                <div class="filter-group">
                    <label for="groupSelect">Category:</label>
                    <select id="groupSelect" class="glass-select" title="Filter by category">
                        <option value="all">🌐 All Categories</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="sortSelect">Sort by:</label>
                    <select id="sortSelect" class="glass-select" title="Sort channels">
                        <option value="name">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                        <option value="group">Category</option>
                    </select>
                </div>
                
                <div class="action-buttons">
                    <button id="refreshBtn" class="glass-btn primary" title="Refresh channel list">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text">Refresh</span>
                    </button>
                    <button id="gridToggle" class="glass-btn secondary" title="Toggle view layout">
                        <span class="btn-icon">⊞</span>
                        <span class="btn-text">Grid</span>
                    </button>
                </div>
            </div>
        </section>
        <!-- Enhanced Statistics Section -->
        <section class="stats-section glass-panel">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-icon" aria-hidden="true">📊</div>
                    <div class="stat-content">
                        <div class="stat-number" id="channelCount" aria-live="polite">0</div>
                        <div class="stat-label">Channels</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon" aria-hidden="true">📺</div>
                    <div class="stat-content">
                        <div class="stat-number" id="categoryCount" aria-live="polite">0</div>
                        <div class="stat-label">Categories</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon" aria-hidden="true">🔴</div>
                    <div class="stat-content">
                        <div class="stat-number" id="liveCount" aria-live="polite">0</div>
                        <div class="stat-label">Live Streams</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon" aria-hidden="true">⚡</div>
                    <div class="stat-content">
                        <div class="stat-number" id="qualityIndicator" aria-live="polite">HD</div>
                        <div class="stat-label">Quality</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Enhanced Status Messages -->
        <div id="status" class="status-message" role="status" aria-live="polite"></div>

        <!-- Enhanced Channels Grid -->
        <section class="channels-section">
            <div class="section-header">
                <h2>📺 Available Channels</h2>
                <div class="view-options" role="tablist" aria-label="View options">
                    <button class="view-btn active" data-view="grid" role="tab" aria-selected="true" aria-controls="channelList">
                        <span aria-hidden="true">⊞</span> Grid
                    </button>
                    <button class="view-btn" data-view="list" role="tab" aria-selected="false" aria-controls="channelList">
                        <span aria-hidden="true">☰</span> List
                    </button>
                </div>
            </div>
            <div id="channelList" class="channels-grid" role="grid" aria-label="Channel list"></div>
        </section>
    </main>

    <!-- Enhanced Footer -->
    <footer class="glass-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>🚀 Apex Stream+</h4>
                    <p>Next-generation IPTV streaming platform with cutting-edge technology and modern glassmorphism design. Experience premium streaming like never before.</p>
                    <div class="footer-links">
                        <a href="/health" class="footer-link" title="Server Status">Server Status</a>
                        <a href="/api-docs" class="footer-link" title="API Documentation">API Docs</a>
                    </div>
                </div>
                <div class="footer-section">
                    <h4>⚡ Features</h4>
                    <ul>
                        <li>Ultra-Modern Glassmorphism UI</li>
                        <li>Multi-Player Support (Shaka & Native)</li>
                        <li>Real-time Statistics & Analytics</li>
                        <li>Advanced Search & Filtering</li>
                        <li>Picture-in-Picture Support</li>
                        <li>Responsive Design</li>
                        <li>Accessibility Optimized</li>
                        <li>Progressive Web App Ready</li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>🛠️ Technology Stack</h4>
                    <ul>
                        <li>Frontend: Vanilla JS + Modern CSS</li>
                        <li>Backend: Node.js + Express</li>
                        <li>Database: MongoDB + Local Fallback</li>
                        <li>Video: Shaka Player + Native HTML5</li>
                        <li>Deployment: Multi-platform Ready</li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>👨‍💻 Credits & Community</h4>
                    <p>Developer: <strong>@ifeelram</strong></p>
                    <p>Community: <strong>@BillaSpace</strong></p>
                    <p>&copy; 2025 Apex Stream+ Platform</p>
                    <div class="footer-meta">
                        <p>Version: 2.0.0</p>
                        <p>Build: Production</p>
                        <p>Last Updated: January 2025</p>
                    </div>
                </div>
            </div>
        </div>
    </footer>
        <!-- Enhanced Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" role="dialog" aria-labelledby="loadingTitle" aria-describedby="loadingStatus">
        <div class="loading-content">
            <div class="loading-logo" aria-hidden="true">📺</div>
            <div class="loading-spinner-large" aria-hidden="true"></div>
            <h3 id="loadingTitle">Loading Channels...</h3>
            <p id="loadingStatus">Connecting to streaming services...</p>
            <div class="loading-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" id="loadingProgress"></div>
            </div>
        </div>
    </div>

    <!-- Enhanced Toast Notifications -->
    <div id="toastContainer" class="toast-container" aria-live="polite" aria-atomic="true"></div>

    <!-- Error Boundary -->
    <div id="errorBoundary" class="error-boundary" style="display: none;">
        <div class="error-content glass-panel">
            <div class="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p id="errorMessage">An unexpected error occurred. Please refresh the page and try again.</p>
            <button id="reloadBtn" class="glass-btn primary">🔄 Reload Page</button>
        </div>
    </div>

    <!-- Scripts -->
    <script src="js/utils.js"></script>
    <script src="js/app.js"></script>
    
    <!-- Enhanced Initialization -->
    <script>
        // Enhanced mobile optimization
        document.addEventListener('gesturestart', function (e) {
            e.preventDefault();
        });

        // Dynamic viewport adjustment for mobile
        if (window.navigator.userAgent.includes('Mobile')) {
            const viewport = document.querySelector('meta[name="viewport"]');
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }

        // Enhanced error boundary
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            const errorBoundary = document.getElementById('errorBoundary');
            const errorMessage = document.getElementById('errorMessage');
            
            if (errorBoundary && errorMessage) {
                errorMessage.textContent = event.error?.message || 'An unexpected error occurred';
                errorBoundary.style.display = 'flex';
            }
        });

        // Reload button handler
        document.getElementById('reloadBtn')?.addEventListener('click', () => {
            window.location.reload();
        });

        // Service Worker Registration (if available)
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }

        // Performance monitoring
        window.addEventListener('load', () => {
            if (typeof PerformanceObserver !== 'undefined') {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'navigation') {
                            console.log('Page load time:', entry.loadEventEnd - entry.loadEventStart, 'ms');
                        }
                    }
                });
                
                try {
                    observer.observe({ entryTypes: ['navigation'] });
                } catch (e) {
                    console.log('Performance Observer not supported');
                }
            }
        });

        // Enhanced keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Global keyboard shortcuts
            if (e.altKey) {
                switch (e.key) {
                    case 'h':
                        e.preventDefault();
                        document.querySelector('.glass-header').scrollIntoView({ behavior: 'smooth' });
                        break;
                    case 'p':
                        e.preventDefault();
                        document.querySelector('.player-section').scrollIntoView({ behavior: 'smooth' });
                        break;
                    case 'c':
                        e.preventDefault();
                        document.querySelector('.channels-section').scrollIntoView({ behavior: 'smooth' });
                        break;
                }
            }
        });

        // Connection status monitoring
        window.addEventListener('online', () => {
            console.log('Connection restored');
            if (window.iptvPlayer) {
                window.iptvPlayer.updateNetworkStatus(true);
            }
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost');
            if (window.iptvPlayer) {
                window.iptvPlayer.updateNetworkStatus(false);
            }
        });

        // Prevent context menu on production
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }

        console.log('🚀 Apex Stream+ v2.0.0 Initialized');
        console.log('👨‍💻 Developer: @ifeelram');
        console.log('🏘️ Community: @BillaSpace');
    </script>

    <!-- Additional CSS for enhanced features -->
    <style>
        .footer-links {
            margin-top: 12px;
            display: flex;
            gap: 16px;
        }

        .footer-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .footer-link:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.1);
        }

        .footer-meta {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-meta p {
            font-size: 12px;
            margin-bottom: 4px;
            opacity: 0.7;
        }

        .error-boundary {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 12, 41, 0.95);
            backdrop-filter: blur(20px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }

        .error-content {
            text-align: center;
            padding: 40px;
            max-width: 400px;
            margin: 20px;
        }

        .error-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }

        .error-content h3 {
            font-size: 24px;
            color: var(--text-primary);
            margin-bottom: 16px;
        }

        .error-content p {
            color: var(--text-secondary);
            margin-bottom: 24px;
            line-height: 1.6;
        }

        /* Enhanced loading states */
        .loading-overlay[aria-busy="true"] .loading-spinner-large {
            animation: spin 1s linear infinite;
        }

        /* Focus management */
        .skip-link {
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1000;
        }

        .skip-link:focus {
            top: 6px;
        }
    </style>

    <!-- Skip link for accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
</body>
</html>
