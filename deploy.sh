#!/bin/bash
set -e

PROJECT_ID="instagram-automation-ad77b"
REGION="europe-west1"

echo "========================================"
echo "  Instagram Automation - Deploy Script"
echo "========================================"
echo ""

# Parse arguments
SKIP_LINT=false
SKIP_TEST=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-lint) SKIP_LINT=true ;;
        --skip-test) SKIP_TEST=true ;;
        --help)
            echo "Usage: ./deploy.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-lint   Skip linting"
            echo "  --skip-test   Skip post-deploy test"
            echo "  --help        Show this help"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Navigate to functions directory
cd functions

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linter
if [ "$SKIP_LINT" = false ]; then
    echo "📝 Running linter..."
    npm run lint || echo "⚠️  Lint warnings (continuing...)"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Go back to root
cd ..

# Deploy to Firebase
echo ""
echo "☁️  Deploying to Firebase..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

firebase deploy --only functions --project $PROJECT_ID

# Post-deploy health check
if [ "$SKIP_TEST" = false ]; then
    echo ""
    echo "🏥 Running health check..."
    sleep 5

    HEALTH_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/healthCheck"
    HEALTH_RESULT=$(curl -s "$HEALTH_URL" 2>/dev/null || echo '{"status":"error"}')

    if echo "$HEALTH_RESULT" | grep -q '"status":"healthy"'; then
        echo "✅ Health check passed!"
    else
        echo "⚠️  Health check returned: $HEALTH_RESULT"
    fi
fi

echo ""
echo "========================================"
echo "  ✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Endpoints:"
echo "  Health: https://${REGION}-${PROJECT_ID}.cloudfunctions.net/healthCheck"
echo "  Queue:  https://${REGION}-${PROJECT_ID}.cloudfunctions.net/getQueueStats"
echo ""
