class IPTVPlayer {
    constructor() {
        this.allChannels = [];
        this.player = null;
        this.currentChannel = null;
        this.playerType = 'shaka';
        this.playlistUrl = '';
        
        this.initializeElements();
        this.bindEvents();
        this.recordVisit();
        this.loadPlaylist();
    }

    initializeElements() {
        this.elements = {
            video: document.getElementById('video'),
            searchInput: document.getElementById('searchInput'),
            groupSelect: document.getElementById('groupSelect'),
            playerSelect: document.getElementById('playerSelect'),
            audioSelect: document.getElementById('audioSelect'),
            refreshBtn: document.getElementById('refreshBtn'),
            channelList: document.getElementById('channelList'),
            status: document.getElementById('status'),
            currentChannelName: document.getElementById('currentChannelName'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    bindEvents() {
        this.elements.searchInput.addEventListener('input', debounce(() => this.filterChannels(), 300));
        this.elements.groupSelect.addEventListener('change', () => this.filterChannels());
        this.elements.playerSelect.addEventListener('change', (e) => this.switchPlayer(e.target.value));
        this.elements.audioSelect.addEventListener('change', (e) => this.switchAudio(e.target.value));
        this.elements.refreshBtn.addEventListener('click', () => this.loadPlaylist());

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
        });
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
        this.updateStatus('Loading channels...', 'info');

        try {
            // Get playlist URL from backend (hidden from frontend)
            const response = await fetch('/api/playlist');
            const data = await response.json();
            this.playlistUrl = data.playlistUrl;

            const playlistResponse = await fetch(this.playlistUrl);
            if (!playlistResponse.ok) throw new Error('Failed to fetch playlist');
            
            const playlistText = await playlistResponse.text();
            this.allChannels = this.parseM3U(playlistText);

            // Add hardcoded premium channels
            this.addHardcodedChannels();

            this.updateGroupOptions();
            this.filterChannels();
            this.updateStatus(`Loaded ${this.allChannels.length} channels successfully`, 'success');
            
            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);
        } catch (error) {
            console.error('Failed to load playlist:', error);
            this.updateStatus(`Failed to load channels: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
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

    addHardcodedChannels() {
        // Get token from existing channels if available
        const tokenChannel = this.allChannels.find(c => c.cookie?.cookie);
        const token = tokenChannel?.cookie?.cookie || '';

        const premiumChannels = [
            {
                name: 'Jalsha Movies HD',
                logo: 'https://img.media.jio.com/tvpimages/92/42/302096_1749652323250_l_medium.jpg',
                manifestUri: `https://jiotvmblive.cdn.jio.com/bpk-tv/Jalsa_Movies_HD_BTS/output/index.mpd${token ? '?' + token : ''}`,
                group: 'Premium Movies',
                clearKeyId: '336cae9ff0c957cfabc598f4faf7e701',
                clearKeyKey: '24b00e0fec8785b474f544560dfec897',
                userAgent: 'plaYtv/7.1.3 (Linux;Android 13) ygx/69.1 ExoPlayerLib/2.11.6',
                cookie: token ? { cookie: token } : null
            },
            {
                name: 'Star Jalsha',
                logo: 'https://img.media.jio.com/tvpimages/13/28/301972_1749651663207_l_medium.jpg',
                manifestUri: `https://jiotvmblive.cdn.jio.com/bpk-tv/Star_Jalsha_BTS/output/index.mpd${token ? '?' + token : ''}`,
                group: 'Premium Entertainment',
                clearKeyId: '9d4fac613fa6505c8f4c34269bad472a',
                clearKeyKey: '4eb0380c9f3d517db1eeaa768a3e23ac',
                userAgent: 'plaYtv/7.1.3 (Linux;Android 13) ygx/69.1 ExoPlayerLib/2.11.6',
                cookie: token ? { cookie: token } : null
            },
            {
                name: 'Star Jalsha HD',
                logo: 'https://img.media.jio.com/tvpimages/13/28/301972_1749651663207_l_medium.jpg',
                manifestUri: `https://jiotvmblive.cdn.jio.com/bpk-tv/Star_Jalsha_HD_BTS/output/index.mpd${token ? '?' + token : ''}`,
                group: 'Premium Entertainment',
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
            option.textContent = group === 'all' ? 'All Categories' : group;
            this.elements.groupSelect.appendChild(option);
        });
    }

    filterChannels() {
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
        const selectedGroup = this.elements.groupSelect.value;

        const filtered = this.allChannels.filter(channel => {
            const matchesSearch = !searchTerm || 
                channel.name.toLowerCase().includes(searchTerm) ||
                (channel.group && channel.group.toLowerCase().includes(searchTerm));
            
            const matchesGroup = selectedGroup === 'all' || 
                channel.group === selectedGroup;

            return matchesSearch && matchesGroup;
        });

        this.renderChannels(filtered);
    }

    renderChannels(channels) {
        if (!channels.length) {
            this.elements.channelList.innerHTML = `
                <div class="no-channels">
                    <p>No channels found matching your criteria.</p>
                </div>
            `;
            return;
        }

        const channelsHTML = channels.map(channel => `
            <div class="channel-card" tabindex="0" data-channel='${JSON.stringify(channel)}'>
                ${channel.logo ? `<img class="channel-logo" src="${channel.logo}" alt="${channel.name}" loading="lazy">` : '📺'}
                <div class="channel-name">${escapeHtml(channel.name)}</div>
                <div class="channel-group">${escapeHtml(channel.group || 'General')}</div>
            </div>
        `).join('');

        this.elements.channelList.innerHTML = channelsHTML;

        // Add click/keyboard event listeners
        this.elements.channelList.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelData = JSON.parse(card.dataset.channel);
                this.playChannel(channelData);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const channelData = JSON.parse(card.dataset.channel);
                    this.playChannel(channelData);
                }
            });
        });
    }

    async playChannel(channel) {
        this.currentChannel = channel;
        this.updateStatus(`Loading ${channel.name}...`, 'info');
        this.elements.currentChannelName.textContent = channel.name;

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
                });

                // Update audio tracks when available
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

            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);

        } catch (error) {
            console.error('Shaka Player error:', error);
            this.updateStatus(`Failed to play channel: ${error.message}`, 'error');
        }
    }

    async playWithNative(channel) {
        try {
            // For native player, we can only play direct URLs without DRM
            if (channel.clearKeyId || channel.clearKeyKey) {
                this.updateStatus('This channel requires DRM support. Please switch to Shaka Player.', 'error');
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
            
            setTimeout(() => {
                this.updateStatus('', '');
            }, 3000);

        } catch (error) {
            console.error('Native player error:', error);
            this.updateStatus(`Failed to play channel: ${error.message}`, 'error');
        }
    }

    switchPlayer(playerType) {
        this.playerType = playerType;
        
        if (playerType === 'native' && this.player) {
            this.player.destroy();
            this.player = null;
        }

        this.elements.audioSelect.style.display = playerType === 'shaka' ? 'block' : 'none';

        if (this.currentChannel) {
            this.playChannel(this.currentChannel);
        }

        this.updateStatus(`Switched to ${playerType === 'shaka' ? 'Shaka' : 'Native'} Player`, 'info');
        
        setTimeout(() => {
            this.updateStatus('', '');
        }, 2000);
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

        this.elements.audioSelect.style.display = audioTracks.length > 1 ? 'block' : 'none';
    }

    switchAudio(trackId) {
        if (!this.player || this.playerType !== 'shaka') return;

        if (trackId) {
            this.player.selectAudioLanguage(trackId);
            this.updateStatus('Audio track changed', 'info');
        } else {
            // Reset to default
            this.player.selectAudioLanguage('');
            this.updateStatus('Reset to default audio', 'info');
        }

        setTimeout(() => {
            this.updateStatus('', '');
        }, 2000);
    }

    updateStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status-message ${type}`;
        
        if (!message) {
            this.elements.status.className = 'status-message';
        }
    }

    showLoading(show) {
        if (show) {
            this.elements.loadingOverlay.classList.remove('hidden');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
        }
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
