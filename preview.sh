#!/bin/bash

echo "🚀 Starting local preview server..."
echo ""
echo "Your Sensory Compass PoC is ready!"
echo ""
echo "📱 Local Preview: http://localhost:5173"
echo ""
echo "To share with others for testing:"
echo "1. Use ngrok: ngrok http 5173"
echo "2. Or deploy to Vercel: vercel login && vercel --prod"
echo "3. Or deploy to Netlify: netlify deploy"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the preview server
npx vite preview --port 5173 --host
