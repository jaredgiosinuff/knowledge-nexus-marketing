/**
 * Knowledge Nexus Authentication Module
 *
 * Handles Auth0 authentication using the SPA SDK.
 * Provides login, logout, and user profile management.
 */

class AuthManager {
    constructor() {
        this.auth0Client = null;
        this.isAuthenticated = false;
        this.user = null;
        this.accessToken = null;
        this.initialized = false;
    }

    /**
     * Initialize the Auth0 client
     * Must be called before any other auth methods
     */
    async init() {
        if (this.initialized) return;

        try {
            // Create Auth0 client instance
            this.auth0Client = await auth0.createAuth0Client({
                domain: CONFIG.auth0.domain,
                clientId: CONFIG.auth0.clientId,
                authorizationParams: {
                    redirect_uri: CONFIG.auth0.redirectUri,
                    audience: CONFIG.auth0.audience,
                    scope: CONFIG.auth0.scope,
                },
                cacheLocation: 'localstorage',
                useRefreshTokens: true,
            });

            // Handle callback if returning from Auth0
            if (window.location.search.includes('code=') &&
                window.location.search.includes('state=')) {
                await this.handleCallback();
            }

            // Check if user is already authenticated
            this.isAuthenticated = await this.auth0Client.isAuthenticated();

            if (this.isAuthenticated) {
                await this.loadUserProfile();
            }

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.initialized = true; // Mark as initialized even on error
            return false;
        }
    }

    /**
     * Handle the callback from Auth0 after login
     */
    async handleCallback() {
        try {
            await this.auth0Client.handleRedirectCallback();
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error('Callback handling failed:', error);
            throw error;
        }
    }

    /**
     * Load the user's profile from Auth0
     */
    async loadUserProfile() {
        try {
            this.user = await this.auth0Client.getUser();
            this.accessToken = await this.auth0Client.getTokenSilently();
            return this.user;
        } catch (error) {
            console.error('Failed to load user profile:', error);
            return null;
        }
    }

    /**
     * Initiate login flow
     * Redirects user to Auth0 login page
     */
    async login(options = {}) {
        if (!this.auth0Client) {
            console.error('Auth not initialized');
            return;
        }

        try {
            await this.auth0Client.loginWithRedirect({
                authorizationParams: {
                    screen_hint: options.signup ? 'signup' : 'login',
                    ...options.authorizationParams,
                },
                appState: {
                    returnTo: options.returnTo || window.location.pathname,
                },
            });
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Initiate signup flow
     * Same as login but shows signup screen
     */
    async signup(options = {}) {
        return this.login({ ...options, signup: true });
    }

    /**
     * Log the user out
     */
    async logout() {
        if (!this.auth0Client) {
            console.error('Auth not initialized');
            return;
        }

        try {
            await this.auth0Client.logout({
                logoutParams: {
                    returnTo: window.location.origin,
                },
            });
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
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
        return this.user.name || this.user.nickname || this.user.email;
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
        return this.user?.picture;
    }

    /**
     * Get an access token for API calls
     * Automatically refreshes if expired
     */
    async getAccessToken() {
        if (!this.auth0Client) {
            throw new Error('Auth not initialized');
        }

        try {
            return await this.auth0Client.getTokenSilently();
        } catch (error) {
            console.error('Failed to get access token:', error);
            // If token refresh fails, user needs to re-authenticate
            if (error.error === 'login_required') {
                this.isAuthenticated = false;
                this.user = null;
            }
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        if (!this.auth0Client) return false;
        return await this.auth0Client.isAuthenticated();
    }

    /**
     * Make an authenticated API request
     */
    async fetchWithAuth(url, options = {}) {
        try {
            const token = await this.getAccessToken();

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 401) {
                // Token might be invalid, try to refresh
                this.isAuthenticated = false;
                throw new Error('Unauthorized');
            }

            return response;
        } catch (error) {
            console.error('Authenticated request failed:', error);
            throw error;
        }
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, authManager };
}
