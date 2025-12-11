/**
 * Knowledge Nexus Authentication Module
 *
 * Handles Google Sign-In authentication directly (no Auth0).
 * Uses Google Identity Services library and your backend's /api/auth/google endpoint.
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.initialized = false;
        this.googleClientId = null;
    }

    /**
     * Initialize the authentication system
     * Loads Google client ID from backend and checks existing session
     */
    async init() {
        if (this.initialized) return;

        try {
            // Try to fetch Google client ID from backend
            await this.loadGoogleClientId();

            // Check for existing session in localStorage
            this.loadSession();

            // If we have tokens, verify they're still valid
            if (this.accessToken) {
                await this.verifySession();
            }

            // Initialize Google Sign-In
            await this.initGoogleSignIn();

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.initialized = true;
            return false;
        }
    }

    /**
     * Fetch Google Client ID from backend
     */
    async loadGoogleClientId() {
        try {
            // Try to get from backend first
            const response = await fetch(
                `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.googleClientId}`
            );

            if (response.ok) {
                const data = await response.json();
                this.googleClientId = data.client_id;
            } else {
                // Fall back to config
                this.googleClientId = CONFIG.google.clientId;
            }
        } catch (error) {
            // Use config as fallback
            this.googleClientId = CONFIG.google.clientId;
        }
    }

    /**
     * Initialize Google Sign-In button and One Tap
     */
    async initGoogleSignIn() {
        if (!this.googleClientId || this.googleClientId.includes('YOUR_')) {
            console.warn('Google Client ID not configured');
            return;
        }

        // Wait for Google library to load
        if (typeof google === 'undefined') {
            console.warn('Google Identity Services not loaded');
            return;
        }

        google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: this.handleGoogleCallback.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,
        });

        // Render Google Sign-In button if container exists
        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
            google.accounts.id.renderButton(buttonContainer, {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
            });
        }
    }

    /**
     * Handle Google Sign-In callback
     */
    async handleGoogleCallback(response) {
        try {
            showLoading();

            // Send credential to our backend
            const authResponse = await fetch(
                `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.googleAuth}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        credential: response.credential,
                    }),
                }
            );

            if (!authResponse.ok) {
                const error = await authResponse.json();
                throw new Error(error.detail || 'Authentication failed');
            }

            const data = await authResponse.json();

            // Store tokens and user info
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            this.user = data.user;
            this.isAuthenticated = true;

            // Persist to localStorage
            this.saveSession();

            // Update UI
            if (typeof updateAuthUI === 'function') {
                updateAuthUI();
            }

            // Check for pending actions (like selecting a plan)
            if (typeof checkPendingActions === 'function') {
                await checkPendingActions();
            }

            hideLoading();

            // If new user, show welcome message
            if (data.is_new_user) {
                showMessage(`Welcome to Knowledge Nexus, ${this.user.full_name || this.user.username}!`);
            }

        } catch (error) {
            hideLoading();
            console.error('Google auth error:', error);
            showError(error.message || 'Sign in failed. Please try again.');
        }
    }

    /**
     * Trigger Google Sign-In popup
     */
    async login() {
        if (!this.googleClientId || this.googleClientId.includes('YOUR_')) {
            showError('Google Sign-In not configured. Please contact support.');
            return;
        }

        // Use Google One Tap or redirect flow
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                // One Tap not available, fall back to button click
                console.log('One Tap not displayed:', notification.getNotDisplayedReason());
            }
            if (notification.isSkippedMoment()) {
                console.log('One Tap skipped:', notification.getSkippedReason());
            }
        });
    }

    /**
     * Trigger Google Sign-In for signup (same flow, different intent)
     */
    async signup() {
        return this.login();
    }

    /**
     * Log out the user
     */
    async logout() {
        // Clear local session
        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;
        this.isAuthenticated = false;

        // Clear localStorage
        localStorage.removeItem('kn_access_token');
        localStorage.removeItem('kn_refresh_token');
        localStorage.removeItem('kn_user');

        // Revoke Google session
        if (typeof google !== 'undefined' && this.googleClientId) {
            google.accounts.id.disableAutoSelect();
        }

        // Update UI
        if (typeof updateAuthUI === 'function') {
            updateAuthUI();
        }

        // Reload page to reset state
        window.location.reload();
    }

    /**
     * Save session to localStorage
     */
    saveSession() {
        if (this.accessToken) {
            localStorage.setItem('kn_access_token', this.accessToken);
        }
        if (this.refreshToken) {
            localStorage.setItem('kn_refresh_token', this.refreshToken);
        }
        if (this.user) {
            localStorage.setItem('kn_user', JSON.stringify(this.user));
        }
    }

    /**
     * Load session from localStorage
     */
    loadSession() {
        this.accessToken = localStorage.getItem('kn_access_token');
        this.refreshToken = localStorage.getItem('kn_refresh_token');

        const userJson = localStorage.getItem('kn_user');
        if (userJson) {
            try {
                this.user = JSON.parse(userJson);
                this.isAuthenticated = true;
            } catch (e) {
                console.error('Failed to parse user data');
            }
        }
    }

    /**
     * Verify the current session is still valid
     */
    async verifySession() {
        try {
            const response = await this.fetchWithAuth(
                `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.userProfile}`
            );

            if (response.ok) {
                const user = await response.json();
                this.user = user;
                this.isAuthenticated = true;
                this.saveSession();
            } else {
                // Session invalid, clear it
                this.clearSession();
            }
        } catch (error) {
            console.error('Session verification failed:', error);
            // Don't clear session on network errors
        }
    }

    /**
     * Clear session data
     */
    clearSession() {
        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;
        this.isAuthenticated = false;
        localStorage.removeItem('kn_access_token');
        localStorage.removeItem('kn_refresh_token');
        localStorage.removeItem('kn_user');
    }

    /**
     * Get the current user's profile
     */
    getUser() {
        return this.user;
    }

    /**
     * Get the user's display name
     */
    getDisplayName() {
        if (!this.user) return null;
        return this.user.full_name || this.user.username || this.user.email;
    }

    /**
     * Get the user's email
     */
    getEmail() {
        return this.user?.email;
    }

    /**
     * Get the user's avatar URL
     */
    getAvatar() {
        return this.user?.profile_picture_url;
    }

    /**
     * Get the access token for API calls
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * Make an authenticated API request
     */
    async fetchWithAuth(url, options = {}) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            // Token expired, try to refresh
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                // Retry the request
                return fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            } else {
                this.clearSession();
                throw new Error('Session expired');
            }
        }

        return response;
    }

    /**
     * Refresh the access token using refresh token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch(
                `${CONFIG.api.baseUrl}/api/auth/refresh`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        refresh_token: this.refreshToken,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.access_token;
                if (data.refresh_token) {
                    this.refreshToken = data.refresh_token;
                }
                this.saveSession();
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }

    /**
     * Check if email has a valid invite (for invite-only system)
     */
    async checkInvite(email) {
        try {
            const response = await fetch(
                `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.checkInvite}?email=${encodeURIComponent(email)}`
            );

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Invite check failed:', error);
        }

        return { has_invite: false };
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Helper functions for UI
function showLoading() {
    document.body.classList.add('loading');
}

function hideLoading() {
    document.body.classList.remove('loading');
}

function showError(message) {
    alert(message);
}

function showMessage(message) {
    alert(message);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, authManager };
}
