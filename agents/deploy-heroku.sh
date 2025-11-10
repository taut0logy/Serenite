#!/bin/bash

# Heroku Deployment Script for Serenite API
# This script helps automate the Heroku deployment process

set -e  # Exit on error

echo "=================================="
echo "Serenite API - Heroku Deployment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo -e "${RED}Error: Heroku CLI is not installed${NC}"
    echo "Please install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo -e "${GREEN}✓ Heroku CLI found${NC}"

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${YELLOW}You need to login to Heroku${NC}"
    heroku login
fi

echo -e "${GREEN}✓ Logged in to Heroku${NC}"
echo ""

# Ask for app name
read -p "Enter your Heroku app name (or press Enter to create a new one): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo -e "${YELLOW}Creating new Heroku app...${NC}"
    heroku create
    APP_NAME=$(heroku apps:info -j | python -c "import sys, json; print(json.load(sys.stdin)['app']['name'])")
    echo -e "${GREEN}✓ Created app: $APP_NAME${NC}"
else
    # Check if app exists
    if heroku apps:info --app "$APP_NAME" &> /dev/null; then
        echo -e "${GREEN}✓ Using existing app: $APP_NAME${NC}"
    else
        echo -e "${YELLOW}App doesn't exist. Creating: $APP_NAME${NC}"
        heroku create "$APP_NAME"
        echo -e "${GREEN}✓ Created app: $APP_NAME${NC}"
    fi
fi

echo ""

# Add PostgreSQL if not already added
echo "Checking PostgreSQL addon..."
if heroku addons --app "$APP_NAME" | grep -q "heroku-postgresql"; then
    echo -e "${GREEN}✓ PostgreSQL addon already exists${NC}"
else
    read -p "Add Heroku Postgres addon? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Adding Heroku Postgres..."
        heroku addons:create heroku-postgresql:essential-0 --app "$APP_NAME"
        echo -e "${GREEN}✓ PostgreSQL addon added${NC}"
        
        # Wait for database to be ready
        echo "Waiting for database to be ready..."
        sleep 10
        
        # Enable pgvector extension
        echo "Enabling pgvector extension..."
        heroku pg:psql --app "$APP_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"
        echo -e "${GREEN}✓ pgvector extension enabled${NC}"
        
        # Set up connection pooling
        echo "Setting up connection pooling..."
        if heroku addons --app "$APP_NAME" | grep -q "connection-pooling"; then
            echo -e "${GREEN}✓ Connection pooling already enabled${NC}"
        else
            heroku addons:attach --as DATABASE_CONNECTION_POOL --app "$APP_NAME" --addon $(heroku addons --app "$APP_NAME" | grep heroku-postgresql | awk '{print $1}')
            echo -e "${GREEN}✓ Connection pooling enabled${NC}"
        fi
    fi
fi

echo ""

# Configure environment variables
echo "=================================="
echo "Environment Variables Setup"
echo "=================================="
echo ""

read -p "Do you want to set environment variables now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    
    # GROQ API Key
    read -p "Enter GROQ_API_KEY: " GROQ_KEY
    if [ ! -z "$GROQ_KEY" ]; then
        heroku config:set GROQ_API_KEY="$GROQ_KEY" --app "$APP_NAME"
    fi
    
    # Tavily API Key
    read -p "Enter TAVILY_API_KEY: " TAVILY_KEY
    if [ ! -z "$TAVILY_KEY" ]; then
        heroku config:set TAVILY_API_KEY="$TAVILY_KEY" --app "$APP_NAME"
    fi
    
    # Cohere API Key
    read -p "Enter COHERE_API_KEY: " COHERE_KEY
    if [ ! -z "$COHERE_KEY" ]; then
        heroku config:set COHERE_API_KEY="$COHERE_KEY" --app "$APP_NAME"
    fi
    
    # AWS Credentials
    read -p "Enter AWS_ACCESS_KEY_ID: " AWS_KEY
    if [ ! -z "$AWS_KEY" ]; then
        heroku config:set AWS_ACCESS_KEY_ID="$AWS_KEY" --app "$APP_NAME"
    fi
    
    read -p "Enter AWS_SECRET_ACCESS_KEY: " AWS_SECRET
    if [ ! -z "$AWS_SECRET" ]; then
        heroku config:set AWS_SECRET_ACCESS_KEY="$AWS_SECRET" --app "$APP_NAME"
    fi
    
    read -p "Enter AWS_REGION (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    heroku config:set AWS_REGION="$AWS_REGION" --app "$APP_NAME"
    
    # S3 Configuration
    read -p "Enable S3 storage? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter S3_TEMP_BUCKET (default: serenite-temp): " S3_BUCKET
        S3_BUCKET=${S3_BUCKET:-serenite-temp}
        heroku config:set USE_S3_STORAGE=true --app "$APP_NAME"
        heroku config:set S3_TEMP_BUCKET="$S3_BUCKET" --app "$APP_NAME"
    else
        heroku config:set USE_S3_STORAGE=false --app "$APP_NAME"
    fi
    
    # Frontend URL
    read -p "Enter CLIENT_URL (your frontend URL, or * for all): " CLIENT_URL
    if [ ! -z "$CLIENT_URL" ]; then
        heroku config:set CLIENT_URL="$CLIENT_URL" --app "$APP_NAME"
    fi
    
    # Production settings
    heroku config:set USE_API_MODELS=true --app "$APP_NAME"
    heroku config:set ENVIRONMENT=production --app "$APP_NAME"
    heroku config:set DEBUG=false --app "$APP_NAME"
    
    echo -e "${GREEN}✓ Environment variables set${NC}"
fi

echo ""

# Show current config
echo "=================================="
echo "Current Configuration"
echo "=================================="
heroku config --app "$APP_NAME"
echo ""

# Deploy
read -p "Do you want to deploy now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying to Heroku..."
    
    # Check if git remote exists
    if ! git remote | grep -q heroku; then
        heroku git:remote --app "$APP_NAME"
    fi
    
    # Get current branch
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    echo "Pushing $BRANCH to Heroku..."
    git push heroku "$BRANCH:main" || git push heroku main
    
    echo -e "${GREEN}✓ Deployment complete${NC}"
    
    # Initialize database
    read -p "Initialize vector store database? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Running setup_vector_store.py..."
        heroku run python setup_vector_store.py --app "$APP_NAME"
    fi
fi

echo ""
echo "=================================="
echo "Deployment Summary"
echo "=================================="
echo -e "App Name: ${GREEN}$APP_NAME${NC}"
echo -e "App URL: ${GREEN}https://$APP_NAME.herokuapp.com${NC}"
echo -e "Health Check: ${GREEN}https://$APP_NAME.herokuapp.com/health${NC}"
echo ""

# Display database URLs
echo "=================================="
echo "Database Connection URLs"
echo "=================================="
echo ""
echo -e "${YELLOW}For Heroku agents server (internal use):${NC}"
heroku config:get DATABASE_URL --app "$APP_NAME" 2>/dev/null && echo "" || echo -e "${RED}DATABASE_URL not set${NC}\n"

echo -e "${YELLOW}For Vercel/Next.js client (use this one):${NC}"
DB_POOL_URL=$(heroku config:get DATABASE_CONNECTION_POOL_URL --app "$APP_NAME" 2>/dev/null)
if [ ! -z "$DB_POOL_URL" ]; then
    echo "$DB_POOL_URL"
    echo ""
    echo -e "${GREEN}✓ Copy this URL to your Vercel environment variables as DATABASE_URL${NC}"
else
    echo -e "${YELLOW}Connection pooling URL not available yet. Use regular DATABASE_URL for now.${NC}"
    heroku config:get DATABASE_URL --app "$APP_NAME" 2>/dev/null || echo -e "${RED}DATABASE_URL not set${NC}"
fi
echo ""

# Open app
read -p "Open app in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    heroku open --app "$APP_NAME"
fi

# View logs
read -p "View logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    heroku logs --tail --app "$APP_NAME"
fi

echo ""
echo -e "${GREEN}✓ Deployment process complete!${NC}"
echo ""
echo "Useful commands:"
echo "  heroku logs --tail --app $APP_NAME"
echo "  heroku restart --app $APP_NAME"
echo "  heroku ps --app $APP_NAME"
echo "  heroku config --app $APP_NAME"
echo ""
