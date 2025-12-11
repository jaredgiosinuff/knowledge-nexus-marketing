/**
 * Knowledge Nexus Marketing Site Configuration
 *
 * This file contains all configurable settings for the marketing site.
 * Update these values based on your environment (development, staging, production).
 */

const CONFIG = {
    // Google OAuth Configuration
    // Get your client ID from Google Cloud Console -> APIs & Services -> Credentials
    google: {
        clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    },

    // API Configuration
    api: {
        // Base URL for the Knowledge Nexus API
        baseUrl: 'https://api.knowledge-nexus.io',
        // For local development:
        // baseUrl: 'http://localhost:8080',

        // Endpoints
        endpoints: {
            googleAuth: '/api/auth/google',
            googleClientId: '/api/auth/google/client-id',
            checkInvite: '/api/auth/check-invite',
            userProfile: '/api/auth/me',
            subscription: '/api/v1/subscription',
            checkout: '/api/v1/checkout/session',
            billingPortal: '/api/v1/subscription/portal',
        }
    },

    // Stripe Configuration
    stripe: {
        publishableKey: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
        // Price IDs for each tier (from Stripe Dashboard)
        priceIds: {
            personal: {
                monthly: 'price_personal_monthly',
                annual: 'price_personal_annual',
            },
            pro: {
                monthly: 'price_pro_monthly',
                annual: 'price_pro_annual',
            },
            family: {
                monthly: 'price_family_monthly',
                annual: 'price_family_annual',
            },
            team: {
                monthly: 'price_team_monthly',
                annual: 'price_team_annual',
            },
            business: {
                monthly: 'price_business_monthly',
                annual: 'price_business_annual',
            },
        }
    },

    // Portal Configuration
    portal: {
        // URL to redirect authenticated users to the main application
        url: 'https://app.knowledge-nexus.io',
        // For local development:
        // url: 'http://localhost:3000',
    },

    // Feature Flags
    features: {
        // Enable annual pricing toggle
        annualPricing: true,
        // Enable enterprise contact form
        enterpriseContact: true,
        // Show beta badge on new features
        showBetaBadges: false,
    },

    // Social Links
    social: {
        twitter: 'https://twitter.com/knowledgenexus',
        github: 'https://github.com/knowledge-nexus',
        linkedin: 'https://linkedin.com/company/knowledge-nexus',
        discord: 'https://discord.gg/knowledge-nexus',
    },

    // Contact Information
    contact: {
        sales: 'sales@knowledge-nexus.io',
        support: 'support@knowledge-nexus.io',
        enterprise: 'enterprise@knowledge-nexus.io',
    },

    // Tier Information (for UI display)
    tiers: {
        free: {
            name: 'Free',
            monthlyPrice: 0,
            annualPrice: 0,
            features: [
                '1 Knowledge Base',
                '100 documents',
                '256-dim embeddings',
                'Basic AI chat (gpt-oss:120b)',
                'Community support',
            ],
        },
        personal: {
            name: 'Personal',
            monthlyPrice: 12,
            annualPrice: 120,
            features: [
                '3 Knowledge Bases',
                '1,000 documents',
                '384-dim embeddings',
                '5GB storage',
                'Advanced AI models',
                'Email support',
            ],
        },
        pro: {
            name: 'Pro',
            monthlyPrice: 29,
            annualPrice: 290,
            features: [
                '10 Knowledge Bases',
                '10,000 documents',
                '512-dim embeddings',
                '25GB storage',
                'Image embeddings',
                'Voice interface',
                'Priority support',
            ],
        },
        family: {
            name: 'Family',
            monthlyPrice: 49,
            annualPrice: 490,
            features: [
                'Up to 6 users',
                '20 Knowledge Bases',
                '25,000 documents',
                '100GB shared storage',
                'All Pro features',
                'Family sharing controls',
            ],
        },
        team: {
            name: 'Team',
            monthlyPrice: 19,
            annualPrice: 190,
            perUser: true,
            minUsers: 5,
            features: [
                'Unlimited Knowledge Bases',
                '50,000 documents/user',
                '768-dim embeddings',
                '50GB storage/user',
                'Team collaboration',
                'Admin dashboard',
            ],
        },
        business: {
            name: 'Business',
            monthlyPrice: 35,
            annualPrice: 350,
            perUser: true,
            minUsers: 10,
            features: [
                'Everything in Team',
                '100,000 documents/user',
                '1024-dim embeddings',
                '100GB storage/user',
                'SSO/SAML',
                'Advanced analytics',
                'Dedicated support',
            ],
        },
        enterprise: {
            name: 'Enterprise',
            monthlyPrice: null,
            annualPrice: null,
            custom: true,
            features: [
                'Unlimited everything',
                'On-premise deployment',
                'Custom integrations',
                'SLA guarantees',
                'Dedicated success manager',
                'Custom model training',
            ],
        },
    },
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.google);
Object.freeze(CONFIG.api);
Object.freeze(CONFIG.stripe);
Object.freeze(CONFIG.portal);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
