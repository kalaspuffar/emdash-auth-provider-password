#!/bin/bash
# Deploy @emdash-cms/auth-provider-password to GitHub
# Run this on Daniel's 32GB rig

set -euo pipefail

PACKAGE_DIR="/home/woden/emdash-auth-provider-password"
REPO_NAME="emdash-auth-provider-password"

echo "=== Deploying @emdash-cms/auth-provider-password ==="
echo ""
echo "This will:"
echo "1. Initialize a git repo in $PACKAGE_DIR"
echo "2. Push to https://github.com/kalaspuffar/$REPO_NAME.git"
echo ""

# Check if package exists
if [ ! -d "$PACKAGE_DIR" ]; then
    echo "ERROR: Package directory not found at $PACKAGE_DIR"
    exit 1
fi

cd "$PACKAGE_DIR"

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "ERROR: 'gh' CLI not found. Install it first:"
    echo "  brew install gh  # macOS"
    echo "  or follow: https://cli.github.com/"
    exit 1
fi

# Check if already a git repo
if [ -d ".git" ]; then
    echo "Git repo already initialized"
else
    echo "Initializing git repo..."
    git init
    git add .
    git commit -m "Initial release: @emdash-cms/auth-provider-password"
fi

# Check if remote already set
if git remote get-url origin &> /dev/null; then
    echo "Remote origin already set to $(git remote get-url origin)"
else
    echo "Setting remote origin..."
    git remote add origin https://github.com/kalaspuffar/$REPO_NAME.git
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "=== Deployed! ==="
echo "Now install it with:"
echo "  npm install @emdash-cms/auth-provider-password"
echo ""
echo "And follow the INSTALL.md for emdash integration"
