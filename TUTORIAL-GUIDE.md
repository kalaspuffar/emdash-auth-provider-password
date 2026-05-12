# Tutorial: Building a Password Auth Provider for EmDash CMS

## The Story

EmDash CMS shipped with passkey-only authentication — technically impressive but unusable for most YouTube tutorials since it requires WebAuthn hardware or Safari. Today we're going to demonstrate one of the most important features of modern headless CMS platforms: **extensibility**. By building a custom password authentication provider, we'll show how to make EmDash accessible to everyone while contributing to the project as a community member.

## Why This Matters

Most CMS platforms charge you or require complex setup. But the really good ones give you the tools to customize them yourself. EmDash's plugin system demonstrates exactly that — a well-designed auth provider interface that lets you add features without hacking core code.

## What We're Building

A drop-in password authentication provider for EmDash that:
- Adds an "Email & Password" option to the setup wizard
- Enables post-setup login with email/password
- Stores credentials securely using BCrypt
- Works without external OAuth apps or SMTP servers
- Integrates cleanly into EmDash's existing Credential database

## The Walkthrough

### Step 1: Understanding the Plugin System

First, let's look at how EmDash's auth system is designed to be extended. The key file is in `packages/core/src/auth/types.ts`:

```typescript
export interface AuthProviderDescriptor {
  id: string;
  label: string;
  config: unknown;
  adminEntry?: string;
  routes?: AuthRouteDescriptor[];
  publicRoutes?: string[];
  storage?: Record<string, { indexes: string[]; uniqueIndexes: string[] }>;
}

export interface AuthProviderAdminExports {
  LoginButton?: ComponentType;
  LoginForm?: ComponentType;
  SetupStep?: ComponentType<{ onComplete: () => void }>;
}
```

See how clean this is? EmDash defines exactly what it needs from a provider, and we implement the rest. No magic, no framework lock-in.

### Step 2: Creating the Package Structure

```bash
mkdir -p emdash-auth-provider-password/src/routes
cd emdash-auth-provider-password
```

Our package structure:
```
src/
├── index.ts              # The descriptor function
├── admin.tsx             # React components for the UI
└── routes/
    ├── setup-register.ts  # Account creation endpoint
    └── setup-login.ts     # Login endpoint
```

### Step 3: The Descriptor — `index.ts`

The descriptor is the heart of the provider. It tells EmDash: who we are, where our UI lives, which routes we need.

```typescript
export function password(_config?): AuthProviderDescriptor {
  return {
    id: "password",
    label: "Email & Password",
    config: {},
    adminEntry: "@emdash-cms/auth-provider-password/admin",
    routes: [
      {
        pattern: "/_emdash/api/auth/password/login",
        entrypoint: "@emdash-cms/auth-provider-password/routes/setup-login.ts",
      },
      {
        pattern: "/_emdash/api/setup/password-register",
        entrypoint: "@emdash-cms/auth-provider-password/src/routes/setup-register.ts",
      },
    ],
    publicRoutes: [
      "/_emdash/api/auth/password/",
      "/_emdash/api/setup/password-register",
    ],
  };
}
```

That's it. Seven properties. Four are required. The rest are optional. We register two routes — one for creating accounts during setup, one for daily login.

### Step 4: The Admin UI — `admin.tsx`

This is what users see in two contexts:

1. **Setup Wizard** (`SetupStep` component): Where users create their first account
2. **Login Page** (`LoginForm` + `LoginButton` components): Where they return to

```typescript
import { Button, Input } from "@cloudflare/kumo";
import * as React from "react";

export function LoginButton() {
  return (
    <Button variant="outline" className="w-full justify-center">
      <EmailIcon className="h-5 w-5" />
      <span>Email & Password</span>
    </Button>
  );
}

export function LoginForm() {
  // State for email/password form
  // Fetch to /_emdash/api/auth/password/login
  // Redirect to /admin on success
}

export function SetupStep({ onComplete }) {
  // State with email/password/confirmPassword
  // Fetch to /_emdash/api/setup/password-register
  // Validate password ≥ 8 chars, passwords match
  // Redirect to /admin on success
}
```

Notice we use `@cloudflare/kumo` — that's EmDash's UI component library, already in the project. Consistent styling, no extra UI deps.

### Step 5: The Registration Route — `setup-register.ts`

This is where the magic happens:

```typescript
export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  // 1. Parse email/password from body
  // 2. Validate: email exists, password ≥ 8 chars
  // 3. Check setup isn't already complete
  // 4. Create user via findOrCreateOAuthUser()
  // 5. Hash password with @oslojs/crypto BCrypt
  // 6. Store credential with `name="password"`, algorithm=1
  // 7. Call finalizeSetup()
  // 8. Set Astro session and redirect to /_emdash/admin
};
```

Key insight: We use EmDash's existing `findOrCreateOAuthUser()` function and store the password hash in the existing `credentials` table. Zero migrations needed.

### Step 6: The Login Route — `setup-login.ts`

Standard login flow:

```typescript
export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  // 1. Find user by email
  // 2. Find password credential (where name === "password")
  // 3. Verify password with @oslojs/crypto
  // 4. Update credential counter
  // 5. Set Astro session
  // 6. Redirect to /_emdash/admin
};
```

### Step 7: Installation and Testing

On your rig (32GB RAM — you'll need this for the monorepo build):

```bash
# Clone both repos
cd ~/projects
git clone https://github.com/kalaspuffar/emdash-auth-provider-password
git clone https://github.com/emdash-cms/emdash.git

# Create local symlink
cd emdash/packages/@emdash-cms/
ln -s ~/projects/emdash-auth-provider-password .

# Install dependencies (32GB RAM: ✅, 4GB RAM: ❌)
cd ~/projects/emdash
pnpm install

# Apply config changes to your demo site
# Add import and authProviders: [password()] to astro.config.mjs

# Start dev server
cd demos/simple
pnpm astro dev

# Visit http://localhost:4321/api/setup
# Select "Email & Password"
# Create your admin account
# Done!
```

## The Narrative Beats for Your Video

### Opening Hook
"Hey everyone, Daniel here. I've been experimenting with EmDash CMS lately — it's this really cool, rapidly evolving headless CMS from the Astro team. And I hit a wall: it only supports passkey authentication. That's fine for me, Safari user that I am, but for YouTube tutorials? No way. Most viewers don't have hardware security keys."

### The Pivot
"So instead of just complaining about it like a normal person on the internet, I built a password auth provider. And here's the really cool part — EmDash makes it dead easy. Let me show you how."

### The Teaching Moment
"When a project exposes a clean plugin interface like this, that tells you something important: the authors understand that not everyone has the same tools or needs. This is what makes a project production-ready — it's designed to be customized."

- Show the `AuthProviderDescriptor` interface — point out how minimal it is
- Explain each property: id, label, adminEntry, routes, publicRoutes
- Emphasize: this is just TypeScript, no magic framework

### The Build
- Walk through each file quickly
- Highlight the key decisions: BCrypt via oslo, existing credential table, Astro sessions
- Show the setup wizard in action
- Click "Email & Password" — fill in form — create account
- Show it working

### The Wrap-up
"I pushed this to GitHub at `kalaspuffar/emdash-auth-provider-password`. If you're using EmDash and want password auth, check it out. And if you're building a headless CMS? Take inspiration from EmDash's plugin architecture. This is the right way to do extensibility."

## Key Technical Points to Mention

1. **Zero migrations**: Uses existing `credentials` table with a special algorithm code
2. **No external deps**: BCrypt via oslo, Astro sessions, kumo UI components
3. **Clean interface**: EmDash defines the contract, we implement it
4. **Production-ready**: BCrypt hashing, session management, proper validation
5. **Extensible design**: Could add email verification, rate limiting, etc. easily

## File References

- Package: `/home/woden/emdash-auth-provider-password/`
- Descriptor: `src/index.ts`
- Admin UI: `src/admin.tsx`
- Registration: `src/routes/setup-register.ts`
- Login: `src/routes/setup-login.ts`
- Demo config: `/home/woden/emdash-repo/demos/simple/astro.config.mjs`

Remember: the whole point of this is to demonstrate that good plugin design makes extension a joy, not a chore.
