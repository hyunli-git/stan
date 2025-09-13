#!/bin/bash
# Unified deployment script for STAN project
# This builds mobile web interface and deploys everything

echo "🚀 Starting STAN deployment..."

echo "📱 Building mobile web interface..."
cd stan-mobile
npm run web:export
cp -r dist/* ../stan-backend/public/
cd ..

echo "🌐 Deploying to Vercel..."
cd stan-backend
npx vercel deploy --prod

echo "✅ Deployment complete!"