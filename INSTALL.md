#!/bin/bash
# EmDash CMS + Password Auth Provider - Installation Guide
# For Daniel's 32GB RAM rig

set -euo pipefail

# ===================================================================
# Step 1: Prepare your emdash workspace
# ===================================================================
echo "=== Step 1: Navigate to your emdash workspace ==="
cd /path/to/your/emdash-repo
echo "Current dir: $(pwd)"

# ===================================================================
# Step 2: Install the password auth provider package
# ===================================================================
echo -e "\n=== Step 2: Add the password provider to your workspace ==="
echo "You can do one of these:"
echo ""
echo "OPTION A: Use local symlink (recommended for dev):"
echo "  cd packages/"
echo "  ln -s /home/woden/emdash-auth-provider-password emdash-auth-provider-password"
echo ""
echo "OPTION B: Install from npm (after publishing to npm or registry):"
echo "  pnpm add @emdash-cms/auth-provider-password"
echo ""
echo "OPTION C: Copy the package locally:"
echo "  cp -r /home/woden/emdash-auth-provider-password packages/emdash-auth-provider-password"

# ===================================================================
# Step 3: Update your demo's package.json 
# ===================================================================
echo -e "\n=== Step 3: Update demo package.json ==="
cat <<'EOF'
Add this to your demo's package.json dependencies:
"@emdash-cms/auth-provider-password": "workspace:*"

Example for a pnpm workspace:
EOF

cat <<'EOF'
{
  "dependencies": {
    "@emdash-cms/auth-provider-password": "workspace:*",
    // ... other deps
  }
}
EOF

echo -e "\nThen run: pnpm install"

# ===================================================================
# Step 4: Update astro.config.mjs
# ===================================================================
echo -e "\n=== Step 4: Update astro.config.mjs ==="
cat <<'EOF'
Add this import and config:

import { password } from "@emdash-cms/auth-provider-password";

emdash({
  authProviders: [password()],
  // ... rest of your config
})
EOF

# ===================================================================
# Step 5: Start the dev server
# ===================================================================
echo -e "\n=== Step 5: Start dev server ==="
echo "With 32GB RAM, this should work fine:"
echo "  cd demos/simple"
echo "  pnpm astro dev"
echo ""
echo "The server should start at http://localhost:4321"
echo "Visit http://localhost:4321/api/setup to create your admin account"

# ===================================================================
# Step 6: Verify the setup
# ===================================================================
echo -e "\n=== Step 6: Verify the Setup ==="
cat <<'EOF'
1. Open http://localhost:4321/api/setup in your browser
2. You should see the "Email & Password" option alongside Passkey
3. Click "Email & Password" and fill in the form
4. After creation, you should be redirected to the admin panel
5. Verify you can login with email/password at http://localhost:4321/api/auth/login
EOF

echo -e "\n=== Done! ==="
echo "Your email/password auth is now working. You can also enable both"
echo "passkey and email/password by adding both to the authProviders array:"
echo '  authProviders: [password(), passkey()],'
