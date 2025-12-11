# Knowledge Nexus Marketing Site

Static marketing website for Knowledge Nexus, designed for S3 hosting with CloudFront CDN.

## Features

- **Google OAuth**: Direct Google Sign-In (no third-party auth service needed)
- **Subscription-Aware**: Shows user's current plan, redirects to portal
- **Stripe Integration**: Checkout flow for paid plans
- **Fully Static**: No server required, hosts on S3
- **Responsive**: Works on all devices
- **Invite-Only Support**: Works with backend's invite system

## Project Structure

```
knowledge-nexus-marketing/
├── index.html          # Main landing page
├── css/
│   └── styles.css      # Custom styles (Tailwind CDN used in HTML)
├── js/
│   ├── config.js       # Configuration (Auth0, Stripe, API URLs)
│   ├── auth.js         # Auth0 authentication module
│   └── app.js          # Main application logic
├── s3-website.json     # S3 website configuration
├── deploy.sh           # Deployment script
└── README.md
```

## Configuration

Before deploying, update `js/config.js` with your values:

### Google OAuth Setup

Your backend already has Google OAuth configured. The marketing site uses the same credentials.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Find your OAuth 2.0 Client ID (or create one for "Web application")
4. Add authorized JavaScript origins:
   - `http://localhost:8000` (local dev)
   - `https://your-domain.com` (production)
5. Update `config.js`:

```javascript
google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
}
```

**Note**: The backend exposes `/api/auth/google/client-id` which the frontend will auto-fetch, so you may not need to hardcode it.

### Stripe Setup

1. Get your Stripe publishable key from the Dashboard
2. Create Products and Prices for each tier
3. Update `config.js`:

```javascript
stripe: {
    publishableKey: 'pk_live_YOUR_KEY',
    priceIds: {
        personal: { monthly: 'price_xxx', annual: 'price_yyy' },
        // ... other tiers
    }
}
```

### API Configuration

Update the API base URL to point to your Knowledge Nexus backend:

```javascript
api: {
    baseUrl: 'https://api.knowledge-nexus.io',
}
```

## Local Development

Simply open `index.html` in a browser, or use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (if you have http-server installed)
npx http-server
```

Visit `http://localhost:8000`

## Deployment to S3

### Prerequisites

1. AWS CLI installed and configured
2. S3 bucket created
3. (Optional) CloudFront distribution for HTTPS

### Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://knowledge-nexus-marketing --region us-east-1

# Enable static website hosting
aws s3api put-bucket-website \
    --bucket knowledge-nexus-marketing \
    --website-configuration file://s3-website.json

# Set public access (if not using CloudFront)
aws s3api put-bucket-policy \
    --bucket knowledge-nexus-marketing \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::knowledge-nexus-marketing/*"
        }]
    }'
```

### Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh

# Deploy to staging
./deploy.sh staging
```

### CloudFront (Recommended)

For HTTPS and better performance, set up CloudFront:

```bash
# Create distribution pointing to S3 website endpoint
# Then set the distribution ID in deploy.sh or as env var
export CLOUDFRONT_DIST_ID="E1234567890"
./deploy.sh
```

## Auth Flow

1. User clicks "Sign In" → Google Sign-In popup appears
2. User authenticates with Google → receives ID token (credential)
3. Frontend POSTs credential to `/api/auth/google`
4. Backend verifies token with Google, creates/finds user
5. Backend returns JWT access/refresh tokens + user info
6. Frontend stores tokens in localStorage
7. User info displayed ("Welcome, Name!")
8. "Enter Portal" button redirects to app

**Invite-Only Mode**: If user is not in the system and has no invite, the backend returns 403. The frontend displays an appropriate message.

## Stripe Flow

1. User selects a plan → `selectPlan(tier)` called
2. If not logged in, redirects to signup first
3. Creates Stripe Checkout session via API
4. Redirects to Stripe hosted checkout
5. After payment, redirected to success page
6. Webhook updates user subscription in backend

## Environment Variables (for CI/CD)

```bash
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
BUCKET=knowledge-nexus-marketing
CLOUDFRONT_DIST_ID=E1234567890
```

## License

Proprietary - Knowledge Nexus
