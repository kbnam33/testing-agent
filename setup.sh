#!/bin/bash
echo "🚀 Setting up Autonomous AI Development System..."

# Install dependencies (root installs both server & client because both are in same package.json)
npm install

# Ensure src directories exist (we already created them, so this is just a safety net)
mkdir -p src/server src/mcp-servers src/client

# Build the frontend once (generates dist/)
npm run build

echo "✅ Setup complete!"
echo "📝 Next steps:"
echo "   1. Add your Anthropic API key to .env file"
echo "   2. Run 'npm run dev' to start both backend (port 3001) and frontend (port 3000)"
echo "   3. Open http://localhost:3000 in your browser"
