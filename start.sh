#!/bin/bash
# CricketVerse — Quick Start Script
# Usage: bash start.sh

echo "🏏 Starting CricketVerse..."

# Check for .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from example — please fill in your API keys before continuing"
  echo "   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY"
  exit 1
fi

echo "Starting with Docker Compose..."
# Detached on purpose: foreground compose tears down every container in the
# project when the terminal closes or Ctrl-C is pressed.
docker compose up -d --build
echo "✅ Running — frontend on http://localhost:3000 (logs: docker compose logs -f)"

