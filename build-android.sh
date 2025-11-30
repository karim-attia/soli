#!/bin/bash
# Build Android Release Bundle
# This script loads environment variables from .env and builds the release bundle

# Load environment variables and export them
if [ -f ".env" ]; then
    set -a  # automatically export all variables
    source .env
    set +a
    echo "Loaded environment variables from .env"
else
    echo "Error: .env file not found"
    exit 1
fi

# Navigate to android directory and build
cd android
echo "Building Android App Bundle..."
./gradlew bundleRelease

echo "Build completed! Check android/app/build/outputs/bundle/release/app-release.aab"
