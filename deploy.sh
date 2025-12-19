#!/bin/bash
# Knowledge Nexus Marketing Site - S3 Deployment Script
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - S3 bucket created and configured for static website hosting
#
# Usage:
#   ./deploy.sh                    # Deploy to production
#   ./deploy.sh staging            # Deploy to staging
#   BUCKET=custom-bucket ./deploy.sh  # Deploy to custom bucket

set -e

# Configuration
PRODUCTION_BUCKET="${BUCKET:-knowledge-nexus-marketing}"
STAGING_BUCKET="${STAGING_BUCKET:-knowledge-nexus-marketing-staging}"
REGION="${AWS_REGION:-us-east-1}"
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_ID:-}"

# Determine target environment
ENV="${1:-production}"

if [ "$ENV" = "staging" ]; then
    TARGET_BUCKET="$STAGING_BUCKET"
    echo "Deploying to STAGING: s3://$TARGET_BUCKET"
else
    TARGET_BUCKET="$PRODUCTION_BUCKET"
    echo "Deploying to PRODUCTION: s3://$TARGET_BUCKET"
fi

# Upload files with appropriate content types
echo "Uploading HTML files..."
aws s3 cp index.html "s3://$TARGET_BUCKET/" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "max-age=300"

echo "Uploading CSS files..."
aws s3 sync css/ "s3://$TARGET_BUCKET/css/" \
    --content-type "text/css; charset=utf-8" \
    --cache-control "max-age=31536000"

echo "Uploading JavaScript files..."
aws s3 sync js/ "s3://$TARGET_BUCKET/js/" \
    --content-type "application/javascript; charset=utf-8" \
    --cache-control "max-age=31536000"

# Upload images if they exist
if [ -d "images" ]; then
    echo "Uploading images..."
    aws s3 sync images/ "s3://$TARGET_BUCKET/images/" \
        --cache-control "max-age=31536000"
fi

# Upload fonts if they exist
if [ -d "fonts" ]; then
    echo "Uploading fonts..."
    aws s3 sync fonts/ "s3://$TARGET_BUCKET/fonts/" \
        --cache-control "max-age=31536000"
fi

# Upload downloads if they exist
if [ -d "downloads" ]; then
    echo "Uploading downloads..."
    aws s3 sync downloads/ "s3://$TARGET_BUCKET/downloads/" \
        --cache-control "max-age=3600"
fi

# Upload blog if it exists
if [ -d "blog" ]; then
    echo "Uploading blog..."
    aws s3 sync blog/ "s3://$TARGET_BUCKET/blog/" \
        --content-type "text/html; charset=utf-8" \
        --cache-control "max-age=300"
fi

# Upload other pages
for dir in privacy terms security; do
    if [ -d "$dir" ]; then
        echo "Uploading $dir..."
        aws s3 sync $dir/ "s3://$TARGET_BUCKET/$dir/" \
            --content-type "text/html; charset=utf-8" \
            --cache-control "max-age=300"
    fi
done

# Configure website hosting
echo "Configuring website hosting..."
aws s3api put-bucket-website \
    --bucket "$TARGET_BUCKET" \
    --website-configuration file://s3-website.json

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$CLOUDFRONT_DIST_ID" ] && [ "$ENV" = "production" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DIST_ID" \
        --paths "/*"
fi

echo ""
echo "Deployment complete!"
echo "Website URL: http://$TARGET_BUCKET.s3-website-$REGION.amazonaws.com"
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
    echo "CloudFront will update within a few minutes."
fi
