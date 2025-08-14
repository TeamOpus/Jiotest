class IPTVPlayer {
    constructor() {
        this.allChannels = [];
        this.filteredChannels = [];
        this.player = null;
        this.currentChannel = null;
        this.playerType = 'shaka';
        this.playlistUrl = '';
        this.currentView = 'grid';
        
        this.initializeElements();
        this.bindEvents();
        this.recordVisit();
        this.loadPlaylist();
        this.initializeFeatures();
    }

    initializeElements() {
        this.elements = {
            video: document.getElementById('video'),
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            groupSelect: document.getElementById('groupSelect'),
            sortSelect: document.getElementById('sortSelect'),
            playerSelect: document.getElementById('playerSelect'),
            audioSelect: document.getElementById('audioSelect'),
            audioGroup: document.getElementById('audioGroup'),
            refreshBtn: document.getElementById('refreshBtn'),
            gridToggle: document.getElementById('gridToggle'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            pipBtn: document.getElementById('pipBtn'),
            channelList: document.getElementById('channelList'),
            status: document.getElementById('status'),
            currentChannelName: document.getElementById('currentChannelName'),
            currentChannelGroup: document.getElementById('currentChannelGroup'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingStatus: document.getElementById('loadingStatus'),
            loadingProgress: document.getElementById('loadingProgress'),
            playerLoading: document.getElementById('playerLoading'),
            onlineStatus: document.getElementById('onlineStatus'),
            channelCount: document.getElementById('channelCount'),
            categoryCount: document.getElementById('categoryCount'),
            liveCount: document.getElementById('liveCount'),
            qualityIndicator: document.getElementById('qualityIndicator'),
            toastContainer: document.getElementById('toastContainer')
        };
    }

    bindEvents() {
        // Search functionality
        this.elements.searchInput.addEventListener('input', debounce(() => {
            this.filterChannels();
            this.toggleClearButton();
        }, 300));

        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.filterChannels();
            this.toggleClearButton();
        });

        // Filter and sort
        this.elements.groupSelect.addEventListener('change', () => this.filterChannels());
        this.elements.sortSelect.addEventListener('change', () => this.filterChannels());

        // Player controls
        this.elements.playerSelect.addEventListener('change', (e) => this.switchPlayer(e.target.value));
        this.elements.audioSelect.addEventListener('change', (e) => this.switchAudio(e.target.value));

        // Action buttons
        this.elements.refreshBtn.addEventListener('click', () => this.loadPlaylist());
        this.elements.gridToggle.addEventListener('click', () => this.toggleView());

        // Player controls
        this.elements.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
        this.elements.pipBtn?.addEventListener('click', () => this.togglePiP());

        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderChannels(this.filteredChannels);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'f':
                        e.preventDefault();
                        this.elements.searchInput.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.loadPlaylist();
                        break;
                }
            }
            
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen();
            }
        });

        // Network status monitoring
        window.addEventListener('online', () => this.updateNetworkStatus(true));
        window.addEventListener('offline', () => this.updateNetworkStatus(false));
    }

    initializeFeatures() {
        // Check for Picture-in-Picture support
        if (document.pictureInPictureEnabled && this.elements.pipBtn) {
            this.elements.pipBtn.style.display = 'block';
        }

        // Update network status
        this.updateNetworkStatus(navigator.onLine);

        // Auto-update stats periodically
        setInterval(() => this.updateStats(), 30000);
    }

    async recordVisit() {
        try {
            await fetch('/api/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAgent: navigator.userAgent
                })
            });
        } catch (error) {
            console.warn('Failed to record visit:', error);
        }
    }

    async loadPlaylist() {
        this.showLoading(true);
        this.updateLoadingStatus('Connecting to streaming service...', 10);

        try {
            // Get playlist URL from backend (hidden from frontend)
            this.updateLoadingStatus('Fetching playlist...', 30);
            const response = await fetch('/api/playlist');
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get playlist URL');
            }
            
            this.playlistUrl = data.playlistUrl;

            this.updateLoadingStatus('Loading channels...', 50);
            const playlistResponse = await fetch(this.playlistUrl);
            if (!playlistResponse.ok) throw new Error('Failed to fetch playlist');
            
            const playlistText = await playlistResponse.text();
            this.updateLoadingStatus('Parsing channels...', 70);
            
            this.allChannels = this.parseM3U(playlistText);

            // Add hardcoded premium channels
            this.updateLoadingStatus('Adding premium channels...', 80);
            await this.addHardcodedChannels();

            this.updateLoadingStatus('Finalizing...', 90);
            this.updateGroupOptions();
            this.filterChannels();
            this.updateStats();
            
            this.updateLoadingStatus('Complete!', 100);
            this.showToast(`Successfully loaded ${this.allChannels.length} channels`, 'success');
            
            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);
        } catch (error) {
            console.error('Failed to load playlist:', error);
            this.updateStatus(`Failed to load channels: ${error.message}`, 'error');
            this.showToast('Failed to load channels', 'error');
        } finally {
            setTimeout(() => {
                this.showLoading(false);
            }, 500);
        }
    }

    parseM3U(m3uText) {
        const lines = m3uText.split(/\r?\n/).map(line => line.trim());
        const channels = [];
        let currentChannel = null;

        for (const line of lines) {
            if (line.startsWith('#EXTINF:')) {
                if (currentChannel) channels.push(currentChannel);
                
                currentChannel = this.createEmptyChannel();
                
                // Extract channel name
                const nameMatch = line.match(/,(.+)$/);
                if (nameMatch) currentChannel.name = nameMatch[1].trim();

                // Extract logo
                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) currentChannel.logo = logoMatch[1];

                // Extract group
                const groupMatch = line.match(/group-title="([^"]+)"/);
                if (groupMatch) currentChannel.group = groupMatch[1].trim();
            } 
            else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
                if (currentChannel) {
                    const keyParts = line.split('=')[1].split(':');
                    if (keyParts.length === 2) {
                        currentChannel.clearKeyId = keyParts[0];
                        currentChannel.clearKeyKey = keyParts[1];
                    }
                }
            }
            else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
                if (currentChannel) {
                    currentChannel.userAgent = line.substring('#EXTVLCOPT:http-user-agent='.length);
                }
            }
            else if (line.startsWith('#EXTHTTP:')) {
                if (currentChannel) {
                    try {
                        currentChannel.cookie = JSON.parse(line.substring('#EXTHTTP:'.length));
                    } catch (e) {
                        console.warn('Failed to parse EXTHTTP:', e);
                    }
                }
            }
            else if (line && !line.startsWith('#')) {
                if (currentChannel && !currentChannel.manifestUri) {
                    currentChannel.manifestUri = line;
                }
            }
        }

        if (currentChannel) channels.push(currentChannel);
        return channels.filter(ch => ch.manifestUri && ch.name);
    }

    createEmptyChannel() {
        return {
            name: '',
            logo: '',
            manifestUri: '',
            group: 'General',
            clearKeyId: null,
            clearKeyKey: null,
            userAgent: null,
            cookie: null
        };
    }

    async addHardcodedChannels() {
        // Get token from existing channels if available
        const tokenChannel = this.allChannels.find(c => c.cookie?.cookie);
        const token = tokenChannel?.cookie?.cookie || '';

        const premiumChannels = [
            {
                name: 'Jalsha Movies HD',
                logo: 'https://img.media.jio.com/tvpimages/92/42/302096_1749652323250_l_medium.jpg',
                manifestUri: `https://jiotvmblive.cdn.jio.com/bpk-tv/Jalsa_Movies_HD_BTS/output/index.mpd${token ? '?' + token : ''}`,
                group: '🎬 Premium Movies',
                clearKeyId: '336cae9ff0c957cfabc598f4faf7e701',
                clearKeyKey: '24b00e0fec8785b474f544560dfec897',
                userAgent: 'plaYtv/7.1.3 (Linux;Android 13) ygx/69.1 ExoPlayerLib/2.11.6',
                cookie: token ? { cookie: token } : null
            },
            {
                name: 'Star Jalsha',
                logo: 'https://img.media.jio.com/tvpimages/13/28/301972_1749651663207_l_medium.jpg',
                manifestUri: `https://jiotvmblive.cdn.jio.com/bpk-tv/Star_Jalsha_BTS/output/index.mpd${token ? '?' + token : ''}`,
                group: '⭐ Premium Entertainment',
                clearKeyId: '9d4fac613fa6505c8f4c34269bad472a',
                clearKeyKey: '4eb0380c9f3d517db1eeaa768a3e23ac',
                userAgent: 'plaYtv/7.1.3 (Linux;Android 13) ygx/69.1 ExoPlayerLib/2.11.6',
                cookie: token ? { cookie: token } : null
            },
            {
                name: 'Star Jalsha HD',
                logo: 'https://img.media.jio.com/tvpimages/13/28/301972_1749651663207_l_medium.jpg',
                manifestUri: `https://jiotvmblive.cdn.jio.com/bpk-tv/Star_Jalsha_HD_BTS/output/index.mpd${token ? '?' + token : ''}`,
                group: '⭐ Premium Entertainment',
                clearKeyId: '7810c0264da15a62b200a3254d041aed',
                clearKeyKey: 'cb1e3bcfcdb1281b85625b12dae6de43',
                userAgent: 'plaYtv/7.1.3 (Linux;Android 13) ygx/69.1 ExoPlayerLib/2.11.6',
                cookie: token ? { cookie: token } : null
            }
        ];

        this.allChannels.push(...premiumChannels);
    }

    updateGroupOptions() {
        const groups = new Set(['all']);
        this.allChannels.forEach(channel => {
            if (channel.group && channel.group.trim()) {
                groups.add(channel.group.trim());
            }
        });

        this.elements.groupSelect.innerHTML = '';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group === 'all' ? 'all' : group;
            option.textContent = group === 'all' ? '🌐 All Categories' : group;
            this.elements.groupSelect.appendChild(option);
        });
    }

    filterChannels() {
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
        const selectedGroup = this.elements.groupSelect.value;
        const sortType = this.elements.sortSelect.value;

        let filtered = this.allChannels.filter(channel => {
            const matchesSearch = !searchTerm || 
                channel.name.toLowerCase().includes(searchTerm) ||
                (channel.group && channel.group.toLowerCase().includes(searchTerm));
            
            const matchesGroup = selectedGroup === 'all' || 
                channel.group === selectedGroup;

            return matchesSearch && matchesGroup;
        });

        // Sort channels
        switch (sortType) {
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'group':
                filtered.sort((a, b) => {
                    const groupA = a.group || 'zzz';
                    const groupB = b.group || 'zzz';
                    return groupA.localeCompare(groupB) || a.name.localeCompare(b.name);
                });
                break;
        }

        this.filteredChannels = filtered;
        this.renderChannels(filtered);
    }

    renderChannels(channels) {
        if (!channels.length) {
            this.elements.channelList.innerHTML = `
                <div class="no-channels">
                    <div class="no-channels-icon">📺</div>
                    <h3>No channels found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
            this.elements.channelList.className = 'channels-grid empty';
            return;
        }

        const isListView = this.currentView === 'list';
        this.elements.channelList.className = `channels-${this.currentView}`;

        const channelsHTML = channels.map(channel => {
            const logoHtml = channel.logo 
                ? `<img class="channel-logo" src="${channel.logo}" alt="${escapeHtml(channel.name)}" loading="lazy" onerror="this.style.display='none'">` 
                : '<div class="channel-logo-placeholder">📺</div>';

            return `
                <div class="channel-card ${isListView ? 'list-item' : ''}" 
                     tabindex="0" 
                     data-channel='${JSON.stringify(channel).replace(/'/g, '&apos;')}'>
                    ${logoHtml}
                    <div class="channel-info">
                        <div class="channel-name">${escapeHtml(channel.name)}</div>
                        <div class="channel-group">${escapeHtml(channel.group || 'General')}</div>
                        ${channel.clearKeyId ? '<div class="channel-quality">🔒 DRM Protected</div>' : '<div class="channel-quality">📺 Standard</div>'}
                    </div>
                    <div class="channel-actions">
                        <button class="play-btn">▶ Play</button>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.channelList.innerHTML = channelsHTML;

        // Add event listeners
        this.elements.channelList.querySelectorAll('.channel-card').forEach(card => {
            const playBtn = card.querySelector('.play-btn');
            const channelData = JSON.parse(card.dataset.channel.replace(/&apos;/g, "'"));

            const playChannel = () => this.playChannel(channelData);

            card.addEventListener('click', playChannel);
            playBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                playChannel();
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    playChannel();
                }
            });
        });
    }

    async playChannel(channel) {
        this.currentChannel = channel;
        this.updateCurrentChannelDisplay(channel);
        this.showPlayerLoading(true);

        // Smooth scroll to video
        this.elements.video.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });

        // Record channel play
        try {
            await fetch('/api/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAgent: navigator.userAgent,
                    channelName: channel.name
                })
            });
        } catch (error) {
            console.warn('Failed to record channel play:', error);
        }

        if (this.playerType === 'shaka') {
            await this.playWithShaka(channel);
        } else {
            await this.playWithNative(channel);
        }
    }

    async playWithShaka(channel) {
        try {
            if (!shaka.Player.isBrowserSupported()) {
                throw new Error('Shaka Player is not supported in this browser');
            }

            if (!this.player) {
                shaka.polyfill.installAll();
                this.player = new shaka.Player(this.elements.video);
                
                this.player.addEventListener('error', (event) => {
                    console.error('Shaka Player error:', event.detail);
                    this.updateStatus(`Playback error: ${event.detail.message}`, 'error');
                    this.showPlayerLoading(false);
                });

                this.player.addEventListener('trackschanged', () => {
                    this.updateAudioTracks();
                });
            }

            // Clear previous filters
            this.player.getNetworkingEngine().clearAllRequestFilters();

            // Configure request filters
            this.player.getNetworkingEngine().registerRequestFilter((type, request) => {
                if (type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
                    type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
                    
                    if (channel.cookie?.cookie) {
                        request.uris = request.uris.map(uri => {
                            const separator = uri.includes('?') ? '&' : '?';
                            return uri + separator + channel.cookie.cookie;
                        });
                    }

                    if (channel.userAgent) {
                        request.headers['User-Agent'] = channel.userAgent;
                    }
                }
            });

            // Configure DRM if needed
            if (channel.clearKeyId && channel.clearKeyKey) {
                this.player.configure({
                    drm: {
                        clearKeys: {
                            [channel.clearKeyId]: channel.clearKeyKey
                        }
                    }
                });
            }

            await this.player.load(channel.manifestUri);
            this.updateStatus(`Now playing: ${channel.name}`, 'success');
            this.showToast(`Playing ${channel.name}`, 'success');
            this.showPlayerLoading(false);

            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);

        } catch (error) {
            console.error('Shaka Player error:', error);
            this.updateStatus(`Failed to play channel: ${error.message}`, 'error');
            this.showToast('Playback failed', 'error');
            this.showPlayerLoading(false);
        }
    }

    async playWithNative(channel) {
        try {
            // For native player, we can only play direct URLs without DRM
            if (channel.clearKeyId || channel.clearKeyKey) {
                this.updateStatus('This channel requires DRM support. Please switch to Shaka Player.', 'error');
                this.showToast('DRM support required - Switch to Shaka Player', 'error');
                this.showPlayerLoading(false);
                return;
            }

            let playUrl = channel.manifestUri;
            if (channel.cookie?.cookie) {
                const separator = playUrl.includes('?') ? '&' : '?';
                playUrl += separator + channel.cookie.cookie;
            }

            this.elements.video.src = playUrl;
            await this.elements.video.play();
            
            this.updateStatus(`Now playing: ${channel.name}`, 'success');
            this.showToast(`Playing ${channel.name}`, 'success');
            this.showPlayerLoading(false);
            
            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);

        } catch (error) {
            console.error('Native player error:', error);
            this.updateStatus(`Failed to play channel: ${error.message}`, 'error');
            this.showToast('Playback failed', 'error');
            this.showPlayerLoading(false);
        }
    }

    switchPlayer(playerType) {
        this.playerType = playerType;
        
        if (playerType === 'native' && this.player) {
            this.player.destroy();
            this.player = null;
        }

        this.elements.audioGroup.style.display = playerType === 'shaka' ? 'block' : 'none';

        if (this.currentChannel) {
            this.playChannel(this.currentChannel);
        }

        this.showToast(`Switched to ${playerType === 'shaka' ? 'Shaka' : 'MediaX'} Player`, 'info');
    }

    updateAudioTracks() {
        if (!this.player || this.playerType !== 'shaka') return;

        const audioTracks = this.player.getVariantTracks()
            .filter(track => track.type === 'audio')
            .reduce((unique, track) => {
                if (!unique.find(t => t.language === track.language)) {
                    unique.push(track);
                }
                return unique;
            }, []);

        this.elements.audioSelect.innerHTML = '<option value="">Default Audio</option>';
        
        audioTracks.forEach(track => {
            const option = document.createElement('option');
            option.value = track.id;
            option.textContent = `${track.language || 'Unknown'} (${track.bandwidth ? Math.round(track.bandwidth/1000) + 'kbps' : 'N/A'})`;
            this.elements.audioSelect.appendChild(option);
        });

        this.elements.audioGroup.style.display = audioTracks.length > 1 ? 'block' : 'none';
    }

    switchAudio(trackId) {
        if (!this.player || this.playerType !== 'shaka') return;

        if (trackId) {
            this.player.selectAudioLanguage(trackId);
            this.showToast('Audio track changed', 'info');
        } else {
            this.player.selectAudioLanguage('');
            this.showToast('Reset to default audio', 'info');
        }
    }

    updateCurrentChannelDisplay(channel) {
        this.elements.currentChannelName.textContent = channel.name;
        this.elements.currentChannelGroup.textContent = channel.group || 'General';
    }

    updateStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status-message ${type}`;
        
        if (!message) {
            this.elements.status.className = 'status-message';
        }
    }

    updateLoadingStatus(message, progress) {
        this.elements.loadingStatus.textContent = message;
        this.elements.loadingProgress.style.width = `${progress}%`;
    }

    showLoading(show) {
        if (show) {
            this.elements.loadingOverlay.classList.remove('hidden');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
            this.elements.loadingProgress.style.width = '0%';
        }
    }

    showPlayerLoading(show) {
        if (this.elements.playerLoading) {
            this.elements.playerLoading.style.display = show ? 'flex' : 'none';
        }
    }

    toggleClearButton() {
        const hasValue = this.elements.searchInput.value.length > 0;
        this.elements.clearSearch.style.display = hasValue ? 'block' : 'none';
    }

    toggleView() {
        this.currentView = this.currentView === 'grid' ? 'list' : 'grid';
        this.elements.gridToggle.querySelector('.btn-text').textContent = 
            this.currentView === 'grid' ? 'List' : 'Grid';
        this.elements.gridToggle.querySelector('.btn-icon').textContent = 
            this.currentView === 'grid' ? '☰' : '⊞';
        
        this.renderChannels(this.filteredChannels);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.elements.video.requestFullscreen?.() || 
            this.elements.video.webkitRequestFullscreen?.() || 
            this.elements.video.mozRequestFullScreen?.();
        } else {
            document.exitFullscreen?.() || 
            document.webkitExitFullscreen?.() || 
            document.mozCancelFullScreen?.();
        }
    }

    togglePiP() {
        if (!document.pictureInPictureElement) {
            this.elements.video.requestPictureInPicture?.();
        } else {
            document.exitPictureInPicture?.();
        }
    }

    updateNetworkStatus(isOnline) {
        const statusDot = this.elements.onlineStatus;
        const statusText = statusDot.parentElement.querySelector('.status-text');
        
        if (isOnline) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Online';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Offline';
        }
    }

    updateStats() {
        const totalChannels = this.allChannels.length;
        const categories = new Set(this.allChannels.map(c => c.group)).size;
        const liveStreams = this.allChannels.filter(c => c.manifestUri).length;
        
        this.elements.channelCount.textContent = totalChannels;
        this.elements.categoryCount.textContent = categories;
        this.elements.liveCount.textContent = liveStreams;
        
        // Update quality indicator based on current channel
        if (this.currentChannel?.clearKeyId) {
            this.elements.qualityIndicator.textContent = 'DRM';
        } else {
            this.elements.qualityIndicator.textContent = 'HD';
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// Initialize the player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.iptvPlayer = new IPTVPlayer();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.iptvPlayer?.player) {
        window.iptvPlayer.player.destroy();
    }
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.iptvPlayer?.elements.video) {
        window.iptvPlayer.elements.video.pause();
    }
});
