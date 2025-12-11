/**
 * Knowledge Nexus Marketing Site - Main Application
 *
 * Handles UI interactions, authentication state, and Stripe integration.
 */

// Global state
let currentPricingMode = 'monthly'; // 'monthly' or 'annual'
let userSubscription = null;

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Initializing Knowledge Nexus Marketing Site...');

    // Initialize Auth0
    await authManager.init();

    // Update UI based on auth state
    updateAuthUI();

    // Initialize pricing toggle
    initPricingToggle();

    // If authenticated, fetch subscription info
    if (authManager.isAuthenticated) {
        await fetchSubscription();
    }

    console.log('App initialized successfully');
}

/**
 * Update the authentication UI based on current state
 */
function updateAuthUI() {
    const loggedOutSection = document.getElementById('auth-logged-out');
    const loggedInSection = document.getElementById('auth-logged-in');
    const userGreeting = document.getElementById('user-greeting');

    if (authManager.isAuthenticated && authManager.user) {
        // Show logged-in state
        loggedOutSection?.classList.add('hidden');
        loggedInSection?.classList.remove('hidden');

        // Update greeting
        const displayName = authManager.getDisplayName();
        if (userGreeting) {
            userGreeting.textContent = `Welcome, ${displayName}!`;
        }

        // Update CTA buttons
        updateCTAButtons();
    } else {
        // Show logged-out state
        loggedOutSection?.classList.remove('hidden');
        loggedInSection?.classList.add('hidden');
    }
}

/**
 * Update CTA buttons based on subscription status
 */
function updateCTAButtons() {
    const heroCTA = document.querySelector('.hero-buttons');
    if (heroCTA && authManager.isAuthenticated) {
        // Replace "Get Started" with "Go to Dashboard"
        heroCTA.innerHTML = `
            <button onclick="enterPortal()" class="btn btn-primary btn-lg">
                Go to Dashboard
            </button>
            <a href="#features" class="btn btn-secondary btn-lg">
                Explore Features
            </a>
        `;
    }
}

/**
 * Initialize pricing toggle functionality
 */
function initPricingToggle() {
    const toggleButtons = document.querySelectorAll('.pricing-toggle button');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update pricing mode
            currentPricingMode = button.dataset.period;
            updatePricingDisplay();
        });
    });
}

/**
 * Update pricing display based on monthly/annual toggle
 */
function updatePricingDisplay() {
    const priceElements = document.querySelectorAll('[data-monthly-price]');

    priceElements.forEach(element => {
        const monthlyPrice = parseFloat(element.dataset.monthlyPrice);
        const annualPrice = parseFloat(element.dataset.annualPrice);

        if (currentPricingMode === 'annual' && annualPrice) {
            // Show annual price (per month equivalent)
            const monthlyEquivalent = Math.floor(annualPrice / 12);
            element.querySelector('.amount').textContent = monthlyEquivalent;
            element.querySelector('.period').textContent = '/mo (billed annually)';
        } else {
            element.querySelector('.amount').textContent = monthlyPrice;
            element.querySelector('.period').textContent = '/month';
        }
    });
}

/**
 * Login function - called from UI
 */
async function login() {
    try {
        await authManager.login();
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }
}

/**
 * Signup function - called from UI
 */
async function signup() {
    try {
        await authManager.signup();
    } catch (error) {
        console.error('Signup error:', error);
        showError('Signup failed. Please try again.');
    }
}

/**
 * Logout function - called from UI
 */
async function logout() {
    try {
        await authManager.logout();
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed. Please try again.');
    }
}

/**
 * Enter the main portal/dashboard
 */
async function enterPortal() {
    if (!authManager.isAuthenticated) {
        // Redirect to login first
        await login();
        return;
    }

    try {
        // Get fresh token
        const token = await authManager.getAccessToken();

        // Redirect to portal with token
        // The portal will validate the token and show appropriate dashboard
        const portalUrl = new URL(CONFIG.portal.url);

        // Store token in session for portal pickup (or use other secure method)
        sessionStorage.setItem('auth_redirect', 'true');

        window.location.href = portalUrl.toString();
    } catch (error) {
        console.error('Portal redirect error:', error);
        showError('Unable to access portal. Please try logging in again.');
    }
}

/**
 * Fetch user's subscription information
 */
async function fetchSubscription() {
    try {
        const response = await authManager.fetchWithAuth(
            `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.subscription}`
        );

        if (response.ok) {
            userSubscription = await response.json();
            updateSubscriptionUI();
        }
    } catch (error) {
        console.error('Failed to fetch subscription:', error);
        // Non-critical error, user can still browse
    }
}

/**
 * Update UI based on subscription status
 */
function updateSubscriptionUI() {
    if (!userSubscription) return;

    // Update pricing cards to show "Current Plan" badge
    const tierCard = document.querySelector(`[data-tier="${userSubscription.tier}"]`);
    if (tierCard) {
        const badge = document.createElement('span');
        badge.className = 'current-plan-badge';
        badge.textContent = 'Current Plan';
        tierCard.querySelector('.pricing-tier')?.appendChild(badge);

        // Change button to "Manage Plan"
        const ctaButton = tierCard.querySelector('.pricing-cta .btn');
        if (ctaButton) {
            ctaButton.textContent = 'Manage Plan';
            ctaButton.onclick = () => managePlan();
        }
    }
}

/**
 * Select a pricing plan - called from pricing cards
 */
async function selectPlan(tier) {
    // Free tier - just sign up
    if (tier === 'free') {
        if (authManager.isAuthenticated) {
            enterPortal();
        } else {
            signup();
        }
        return;
    }

    // Enterprise - contact sales
    if (tier === 'enterprise') {
        contactSales();
        return;
    }

    // Paid tier - initiate checkout
    if (!authManager.isAuthenticated) {
        // Need to login first, then redirect to checkout
        sessionStorage.setItem('pending_tier', tier);
        sessionStorage.setItem('pending_period', currentPricingMode);
        await signup();
        return;
    }

    // Already authenticated, create checkout session
    await createCheckoutSession(tier);
}

/**
 * Create a Stripe checkout session
 */
async function createCheckoutSession(tier) {
    try {
        showLoading();

        const priceId = CONFIG.stripe.priceIds[tier]?.[currentPricingMode];
        if (!priceId) {
            throw new Error(`Invalid tier or pricing mode: ${tier}/${currentPricingMode}`);
        }

        const response = await authManager.fetchWithAuth(
            `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.checkout}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    price_id: priceId,
                    success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: window.location.href,
                }),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const { checkout_url } = await response.json();

        // Redirect to Stripe Checkout
        window.location.href = checkout_url;
    } catch (error) {
        console.error('Checkout error:', error);
        showError('Unable to start checkout. Please try again.');
        hideLoading();
    }
}

/**
 * Open Stripe customer portal for subscription management
 */
async function managePlan() {
    try {
        showLoading();

        const response = await authManager.fetchWithAuth(
            `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.portal}`,
            { method: 'POST' }
        );

        if (!response.ok) {
            throw new Error('Failed to create portal session');
        }

        const { portal_url } = await response.json();
        window.location.href = portal_url;
    } catch (error) {
        console.error('Portal error:', error);
        showError('Unable to access billing portal. Please try again.');
        hideLoading();
    }
}

/**
 * Contact sales for enterprise inquiries
 */
function contactSales() {
    const email = CONFIG.contact.enterprise;
    const subject = encodeURIComponent('Enterprise Inquiry - Knowledge Nexus');
    const body = encodeURIComponent(`Hi,

I'm interested in learning more about Knowledge Nexus Enterprise.

Company:
Team Size:
Use Case:

Please contact me to discuss our requirements.

Thanks!`);

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

/**
 * Show loading state
 */
function showLoading() {
    document.body.classList.add('loading');
}

/**
 * Hide loading state
 */
function hideLoading() {
    document.body.classList.remove('loading');
}

/**
 * Show error message to user
 */
function showError(message) {
    // Simple alert for now - could be replaced with toast notification
    alert(message);
}

/**
 * Smooth scroll to section
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Check for pending actions after OAuth callback
async function checkPendingActions() {
    const pendingTier = sessionStorage.getItem('pending_tier');
    const pendingPeriod = sessionStorage.getItem('pending_period');

    if (pendingTier && authManager.isAuthenticated) {
        sessionStorage.removeItem('pending_tier');
        sessionStorage.removeItem('pending_period');

        currentPricingMode = pendingPeriod || 'monthly';
        await createCheckoutSession(pendingTier);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await checkPendingActions();
});

// Export functions for HTML onclick handlers
window.login = login;
window.logout = logout;
window.signup = signup;
window.enterPortal = enterPortal;
window.selectPlan = selectPlan;
window.contactSales = contactSales;
window.scrollToSection = scrollToSection;
