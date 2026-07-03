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
docker compose up --build

