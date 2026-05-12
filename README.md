# @emdash-cms/auth-provider-password

[![npm version](https://img.shields.io/npm/v/@emdash-cms/auth-provider-password.svg)](https://www.npmjs.com/package/@emdash-cms/auth-provider-password)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Password authentication provider for EmDash CMS — adds email/password login as an auth method alongside passkey.

## Features

- **Email/password signup** during setup wizard
- **Email/password login** after setup
- **BCrypt password hashing** via `@oslojs/crypto`
- **Zero external dependencies** — no OAuth, no SMTP
- **Works with existing Credential tables** — no migrations needed
- **Drop-in installation** — one import, one config line

## Quick Start

### 1. Install the package

```bash
cd /path/to/your/emdash-repo
npm install @emdash-cms/auth-provider-password
```

### 2. Update your Astro config

In `astro.config.mjs`:

```js
import { password } from "@emdash-cms/auth-provider-password";

export default defineConfig({
  integrations: [
    emdash({
      authProviders: [password()],
      // ... other config
    }),
  ],
});
```

### 3. Rebuild and run

```bash
pnpm astro dev
```

Visit `http://localhost:4321/api/setup` to create your admin account. You'll now see the "Email & Password" option alongside Passkey.

## Setup Wizard Flow

When enabled, the setup wizard shows two options:
1. **Passkey** (default — recommended for production)
2. **Email & Password** (provided by this package)

Users can create an admin account during setup via email/password instead of a passkey. After setup, login appears on the standard login page as an "Email & Password" button.

## Configuration Options

The `password()` function accepts an optional config object:

```ts
emdash({
  authProviders: [
    password({
      requireEmailVerification: false,  // default: false (not implemented yet)
      minLength: 8,                      // default: 8
    }),
  ],
});
```

## Database Compatibility

The package stores password hashes in the existing `credentials` table:
- Stores BCrypt hash as UTF-8 text in the `publicKey` column
- Uses `name="password"` to mark the row as a password credential
- Uses algorithm code `1` to distinguish from COSE passkey algorithms

No database migrations are required.

## Architecture

### Package Structure

```
src/
├── index.ts              # password() descriptor function
├── admin.tsx             # LoginButton, LoginForm, SetupStep components
└── routes/
    ├── setup-register.ts  # POST /_emdash/api/setup/password-register
    └── setup-login.ts     # POST /_emdash/api/auth/password/login
```

### Auth Flow

1. **Setup Wizard**: User clicks "Email & Password" → sees form
2. **Registration**: User fills email/password → creates user + credential row
3. **Session**: Astro session created with `session.set("user", { id })`
4. **Login**: Same flow on login page, just without setup wizard step

### Security Considerations

- Passwords are hashed with BCrypt via `@oslojs/crypto`
- Minimum 8-character password requirement
- BCrypt work factor is handled by the library automatically
- No email sending — passwords are stored locally

## Installation 

### Option A: Local symlink (recommended for dev)

```bash
cd /path/to/your/emdash-repo/packages/
ln -s /home/woden/emdash-auth-provider-password @emdash-cms/auth-provider-password

# Then install
cd /path/to/your/emdash-repo
pnpm install
```

### Option B: Copy package locally

```bash
cp -r /home/woden/emdash-auth-provider-password /path/to/your/emdash-repo/packages/@emdash-cms/auth-provider-password

cd /path/to/your/emdash-repo
pnpm install
```

### Option C: Push to npm and install normally

```bash
# See GitHub section below
npm publish
npm install @emdash-cms/auth-provider-password
```

### Verify setup

```bash
cd demos/simple
pnpm astro dev
# Visit http://localhost:4321/api/setup
```

## Publishing to npm

### 1. Push to GitHub first

```bash
cd /home/woden/emdash-auth-provider-password
git init
git add .
git commit -m "Initial release: @emdash-cms/auth-provider-password"
git remote add origin https://github.com/kalaspuffar/emdash-auth-provider-password.git
git push -u origin main
```

### 2. Login to npm

```bash
npm login
```

### 3. Publish

```bash
npm publish
```

### 4. Verify installation

```bash
npm install @emdash-cms/auth-provider-password@latest
```

## Contributing

Feel free to open issues and pull requests. This is a community-maintained auth provider.

### Development setup

```bash
# Clone the repo
cd /home/woden/emdash-auth-provider-password

# Install dependencies
npm install

# Run TypeScript (optional)
npx tsc --noEmit

# Test by installing locally in your emdash repo
cd /path/to/your/emdash-repo/packages/@emdash-cms/auth-provider-password
ln -sf /home/woden/emdash-auth-provider-password/.* ./
pnpm install
```

## License

MIT
