#!/bin/bash

# Simple deployment script for PoC demo
# Deploys to Vercel, Netlify, or GitHub Pages

echo "🚀 Deploying Sensory Compass PoC..."

# Build the project
echo "📦 Building project..."
npm run build

# Option 1: Deploy to Vercel (recommended for Next.js/React)
deploy_vercel() {
    echo "Deploying to Vercel..."
    npx vercel --prod
}

# Option 2: Deploy to Netlify
deploy_netlify() {
    echo "Deploying to Netlify..."
    npx netlify deploy --prod --dir=dist
}

# Option 3: Deploy to GitHub Pages
deploy_github_pages() {
    echo "Deploying to GitHub Pages..."
    npm run build
    git add dist -f
    git commit -m "Deploy PoC to GitHub Pages"
    git subtree push --prefix dist origin gh-pages
}

# Check if vercel is installed, otherwise use netlify
if command -v vercel &> /dev/null; then
    deploy_vercel
elif command -v netlify &> /dev/null; then
    deploy_netlify
else
    echo "Installing Vercel CLI..."
    npm i -g vercel
    deploy_vercel
fi

echo "✅ Deployment complete!"
echo "📱 Don't forget to test on mobile devices!"
