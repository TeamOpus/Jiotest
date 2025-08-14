class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.elements = {
            loginSection: document.getElementById('loginSection'),
            dashboardSection: document.getElementById('dashboardSection'),
            loginForm: document.getElementById('loginForm'),
            adminPassword: document.getElementById('adminPassword'),
            logoutBtn: document.getElementById('logoutBtn'),
            todayVisits: document.getElementById('todayVisits'),
            uniqueVisitors: document.getElementById('uniqueVisitors'),
            channelsPlayed: document.getElementById('channelsPlayed'),
            popularChannels: document.getElementById('popularChannels')
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        if (this.token) {
            this.showDashboard();
            this.loadStats();
        } else {
            this.showLogin();
        }
    }

    bindEvents() {
        this.elements.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        this.elements.logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        // Auto-refresh stats every 30 seconds
        setInterval(() => {
            if (this.token && this.elements.dashboardSection.style.display !== 'none') {
                this.loadStats();
            }
        }, 30000);
    }

    async login() {
        const password = this.elements.adminPassword.value;
        
        if (!password) {
            this.showError('Please enter admin password');
            return;
        }

        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                this.token = data.token;
                localStorage.setItem('adminToken', this.token);
                this.showDashboard();
                this.loadStats();
                this.elements.adminPassword.value = '';
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Connection error. Please try again.');
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        this.showLogin();
    }

    showLogin() {
        this.elements.loginSection.style.display = 'block';
        this.elements.dashboardSection.style.display = 'none';
        this.elements.adminPassword.focus();
    }

    showDashboard() {
        this.elements.loginSection.style.display = 'none';
        this.elements.dashboardSection.style.display = 'block';
    }

    async loadStats() {
        if (!this.token) {
            this.logout();
            return;
        }

        try {
            // Show loading state
            this.setLoadingState(true);

            const response = await fetch('/admin/stats?days=7', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const stats = await response.json();
            this.updateStats(stats);
            
        } catch (error) {
            console.error('Stats loading error:', error);
            this.showError('Failed to load statistics');
        } finally {
            this.setLoadingState(false);
        }
    }

    updateStats(stats) {
        // Get today's stats
        const today = stats.find(stat => {
            const statDate = new Date(stat.date);
            const todayDate = new Date();
            return statDate.toDateString() === todayDate.toDateString();
        }) || { visits: 0, uniqueVisitors: 0, channelsPlayed: 0, popularChannels: [] };

        // Update stat numbers with animation
        this.animateNumber(this.elements.todayVisits, today.visits);
        this.animateNumber(this.elements.uniqueVisitors, today.uniqueVisitors);
        this.animateNumber(this.elements.channelsPlayed, today.channelsPlayed);

        // Update popular channels
        this.updatePopularChannels(today.popularChannels);
    }

    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 20);
        
        if (increment === 0) {
            element.textContent = targetValue;
            return;
        }

        const animate = () => {
            const current = parseInt(element.textContent) || 0;
            if (current < targetValue) {
                element.textContent = Math.min(current + increment, targetValue);
                requestAnimationFrame(animate);
            } else {
                element.textContent = targetValue;
            }
        };

        animate();
    }

    updatePopularChannels(channels) {
        if (!channels || channels.length === 0) {
            this.elements.popularChannels.innerHTML = `
                <div class="empty-state">
                    <p>No channels played today</p>
                </div>
            `;
            return;
        }

        // Sort by play count and take top 10
        const topChannels = channels
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 10);

        const channelsHTML = topChannels.map((channel, index) => `
            <div class="popular-channel-item">
                <div class="channel-info">
                    <div class="channel-icon">
                        ${this.getChannelIcon(channel.name, index)}
                    </div>
                    <span class="channel-name">${this.escapeHtml(channel.name)}</span>
                </div>
                <div class="play-count">${channel.playCount} plays</div>
            </div>
        `).join('');

        this.elements.popularChannels.innerHTML = channelsHTML;
    }

    getChannelIcon(channelName, index) {
        // Return appropriate icon based on channel name or use ranking
        const icons = ['🥇', '🥈', '🥉', '📺', '🎬', '⭐', '🔥', '💫', '🎭', '🎪'];
        
        if (channelName.toLowerCase().includes('news')) return '📰';
        if (channelName.toLowerCase().includes('sports')) return '⚽';
        if (channelName.toLowerCase().includes('movie')) return '🎬';
        if (channelName.toLowerCase().includes('music')) return '🎵';
        if (channelName.toLowerCase().includes('kids')) return '🧸';
        
        return icons[index] || '📺';
    }

    setLoadingState(isLoading) {
        const statNumbers = [
            this.elements.todayVisits,
            this.elements.uniqueVisitors,
            this.elements.channelsPlayed
        ];

        statNumbers.forEach(element => {
            if (isLoading) {
                element.classList.add('loading-stat');
            } else {
                element.classList.remove('loading-stat');
            }
        });

        if (isLoading) {
            this.elements.popularChannels.innerHTML = `
                <div class="empty-state">
                    <p>Loading popular channels...</p>
                </div>
            `;
        }
    }

    showError(message) {
        // Remove existing error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        // Insert after login form or at top of dashboard
        if (this.elements.loginSection.style.display !== 'none') {
            this.elements.loginForm.insertAdjacentElement('afterend', errorDiv);
        } else {
            this.elements.dashboardSection.insertAdjacentElement('afterbegin', errorDiv);
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    if (window.adminDashboard) {
        if (window.adminDashboard.token) {
            window.adminDashboard.showDashboard();
        } else {
            window.adminDashboard.showLogin();
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clear any intervals or cleanup if needed
});
