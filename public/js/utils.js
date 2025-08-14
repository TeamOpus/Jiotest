// Utility functions for the IPTV platform

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format file size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Check if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if browser supports features
function checkBrowserSupport() {
    const support = {
        webgl: !!window.WebGLRenderingContext,
        webrtc: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        fullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled),
        localStorage: typeof Storage !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator
    };
    return support;
}

// Local storage helpers
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
            return false;
        }
    }
};

// Theme utilities
const theme = {
    isDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    
    isHighContrast() {
        return window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches;
    },
    
    isReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
};

// Network status
class NetworkStatus {
    constructor() {
        this.online = navigator.onLine;
        this.callbacks = [];
        
        window.addEventListener('online', () => {
            this.online = true;
            this.notifyCallbacks('online');
        });
        
        window.addEventListener('offline', () => {
            this.online = false;
            this.notifyCallbacks('offline');
        });
    }
    
    isOnline() {
        return this.online;
    }
    
    onStatusChange(callback) {
        this.callbacks.push(callback);
    }
    
    notifyCallbacks(status) {
        this.callbacks.forEach(callback => callback(status));
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }
    
    mark(name) {
        if (performance && performance.mark) {
            performance.mark(name);
        }
        this.metrics[name] = performance.now();
    }
    
    measure(name, startMark, endMark) {
        if (performance && performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
                const entries = performance.getEntriesByName(name);
                if (entries.length > 0) {
                    return entries[entries.length - 1].duration;
                }
            } catch (e) {
                console.warn('Performance measurement failed:', e);
            }
        }
        return null;
    }
    
    getMetrics() {
        return this.metrics;
    }
}

// Error reporter
class ErrorReporter {
    constructor() {
        this.errors = [];
        window.addEventListener('error', (event) => {
            this.reportError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.reportError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });
    }
    
    reportError(error) {
        this.errors.push(error);
        console.error('Error reported:', error);
        
        // Keep only last 50 errors
        if (this.errors.length > 50) {
            this.errors = this.errors.slice(-50);
        }
    }
    
    getErrors() {
        return this.errors;
    }
    
    clearErrors() {
        this.errors = [];
    }
}

// Initialize utilities
const networkStatus = new NetworkStatus();
const performanceMonitor = new PerformanceMonitor();
const errorReporter = new ErrorReporter();

// Export for global use
window.utils = {
    debounce,
    escapeHtml,
    formatBytes,
    formatDuration,
    isMobileDevice,
    checkBrowserSupport,
    storage,
    theme,
    networkStatus,
    performanceMonitor,
    errorReporter
};
