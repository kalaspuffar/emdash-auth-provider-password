# Tutorial Video Script: Building a Password Auth Provider for EmDash CMS

## 🎬 VIDEO SCRIPT (Structured for Recording)

---

### [0:00 - 0:45] HOOK — The Setup

**Visual**: Screen recording of EmDash's setup wizard with passkey-only option

```
"Have you ever found a project that's really impressive but has one big blocker?

That's what I found with EmDash CMS — a headless CMS from the Astro team with an elegant, plugin-based architecture. But for authentication? It ships with passkey-only. No password login. No email option. Just passkeys.

Now passkeys are cool, and they're the future of security. But for a tutorial tool? Most people don't have hardware security keys. And setting up passkeys in browsers just doesn't work for everyone.

So I did what any reasonable person would do — I built a plug-and-play password authentication provider for it. And here's the thing: EmDash makes it ridiculously easy. Like, genuinely impressive easy.

In this video, I'm going to walk you through exactly how to do it, and along the way, you'll see what makes a well-designed plugin architecture."
```

---

### [0:45 - 2:30] THE PROBLEM — Framing it Constructively

**Visual**: Show the EmDash codebase structure, highlight the auth types file

"First, let me frame this correctly. EmDash's choice of passkey-only isn't wrong — it's a security-first position that makes sense for the project's scope. The issue isn't about EmDash being bad; it's about accessibility to tutorials.

The real question is: can we add password auth without hacking the core? And the answer, as we'll see, is 'yes, beautifully.'

Let's look at how EmDash's auth system is designed to be extended."

---

### [2:30 - 4:30] THE ARCHITECTURE — What makes it possible

**Visual**: Open `packages/core/src/auth/types.ts` in your IDE

"EmDash defines exactly what it needs from an auth provider in TypeScript. Just look at this interface:"

```typescript
// Show on screen:
export interface AuthProviderDescriptor {
  id: string;              // Unique identifier
  label: string;           // Display name ("Email & Password")
  config: unknown;         // Provider-specific config
  adminEntry?: string;     // Path to React UI components
  routes?: AuthRouteDescriptor[];
  publicRoutes?: string[];
  storage?: Record<...>;
}

export interface AuthProviderAdminExports {
  LoginButton?: ComponentType;         // Button for login page
  LoginForm?: ComponentType;           // Expanded login form
  SetupStep?: ComponentType<{ onComplete: () => void }>; // Wizard step
}
```

"It's just eight properties. Four are required. The rest are optional. That's it. No magic, no framework lock-in, no dark patterns. Just a clean interface that says 'tell us who you are, where your UI is, and what routes you need.'

And notice — EmDash doesn't define how you store credentials, how you verify passwords, or what UI framework you use. That's all up to us. This is what good plugin design looks like."

---

### [4:30 - 7:00] THE BUILD — Walking through the code

**Visual**: Open the package structure in your editor

"Let me show you how we fill in that interface. Our package structure:"

```
emdash-auth-provider-password/
├── src/
│   ├── index.ts              # The descriptor (what the interface requires)
│   ├── admin.tsx             # React components (UI for users)
│   └── routes/
│       ├── setup-register.ts # Account creation during setup
│       └── setup-login.ts    # Standard login flow
```

"Now let's look at the descriptor — index.ts. This exports a `password()` function that returns the AuthProviderDescriptor:"

```typescript
// SHOW ON SCREEN:
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
        entrypoint: "@emdash-cms/auth-provider-password/routes/setup-register.ts",
      },
    ],
    publicRoutes: [
      "/_emdash/api/auth/password/",
      "/_emdash/api/setup/password-register",
    ],
  };
}
```

"Seven properties. That's the entire contract. EmDash will:
- Show 'Email & Password' in the setup wizard (label)
- Import our React components (adminEntry)
- Inject two routes (routes)
- Allow unauthenticated access to login URLs (publicRoutes)

Everything else — how we handle passwords, sessions, validation — that's all up to us."

---

### [7:00 - 9:00] THE UI — What users see

**Visual**: Open admin.tsx

"The UI consists of three components:

1. LoginButton — shows in the provider grid
2. LoginForm — shows when button is clicked  
3. SetupStep — shows in the setup wizard

All using @cloudflare/kumo — EmDash's own UI component library. So it's already in the project, we just import it."

```typescript
// SHOW ON SCREEN:
export function SetupStep({ onComplete }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate: email present, password ≥ 8 chars, passwords match
    // POST to /_emdash/api/setup/password-register
    // Redirect to /admin on success
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input label="Email" type="email" value={email} onChange={...} />
      <Input label="Password" type="password" value={password} onChange={...} />
      <Input label="Confirm" type="password" value={confirmPassword} onChange={...} />
      <Button type="submit">Create admin account</Button>
    </form>
  );
}
```

"Notice the form is completely standard — React state, fetch API, redirect on success. No framework magic."

---

### [9:00 - 11:00] THE BACKEND — How credentials are stored

**Visual**: Show setup-register.ts and setup-login.ts

"This is where it gets interesting. EmDash already has a `credentials` database table designed for passkey auth. We piggyback on it perfectly:

```typescript
// SHOW: setup-register.ts
await adapter.createCredential({
  id: credId,
  userId: user.id,
  publicKey: new TextEncoder().encode(hashedPassword),  // BCrypt hash as text
  algorithm: 1,                                         // '1' to distinguish from COSE algorithms
  name: "password",                                     // marks this as password credential
  // ... standard fields
});
```

Key points:
- We store BCrypt hash in the `publicKey` column as UTF-8 text
- Use algorithm code `1` (BCrypt password, not COSE)
- Use the existing Credential table — zero migrations needed!
- Passwords are hashed with @oslojs/crypto, which EmDash already depends on

This is the beauty of thinking about extensibility from day one. We don't need to add new tables or write migrations. We just store a password hash in the column already there."

---

### [11:00 - 13:00] THE DEMO — Showing it work

**Visual**: Switch to terminal/server demo

"Now let's see it in action. I'm building on a machine with 32GB RAM because this monorepo needs ~3GB to build. You'll want at least 4GB to run it."

```bash
# INSTALLATION INSTRUCTIONS FOR DEMO
cd ~/projects
git clone https://github.com/kalaspuffar/emdash-auth-provider-password
git clone https://github.com/emdash-cms/emdash.git

# Create local symlink
cd emdash/packages/@emdash-cms/
ln -s ~/projects/emdash-auth-provider-password .

# Install (32GB RAM recommended)
cd ~/projects/emdash
pnpm install

# Update astro.config.mjs in demos/simple/
# Add: import { password } from "@emdash-cms/auth-provider-password";
# Add: authProviders: [password()],

# Start dev server
cd demos/simple
pnpm astro dev
```

"Now visit http://localhost:4321/api/setup. And there it is — our 'Email & Password' option alongside the default passkey option."

**[DEMO MOMENT]**
- Click "Email & Password"
- Fill in the form
- Click "Create admin account"
- Show the redirect to admin panel
- Show that you can now login with email/password

"It works perfectly. Password auth option appears, you create an account, you're logged in. Done."

---

### [13:00 - 14:30] THE PACKAGE — Why this architecture matters

**Visual**: Back to the package structure

"What I want to highlight isn't just that we *can* add password auth — it's *how easily* we did it:

1. **Drop-in installation** — One import, one config line
2. **Zero migrations** — Uses existing tables correctly
3. **No external deps** — Just BCrypt (via oslo) and Astro sessions
4. **Clean extension points** — TypeScript interface, not framework magic
5. **Community-ready** — Can be shared via npm or pushed to GitHub

"This is what good plugin architecture looks like. It doesn't require you to know the authors' mental model. It doesn't have undocumented APIs. It has a clear contract and respects your choices."

---

### [14:30 - 15:30] WRAP-UP — The bigger picture

**Visual**: Show final package files

"The package is at `kalaspuffar/emdash-auth-provider-password` — MIT license, ready to publish to npm. If you're using EmDash and want password auth, it's there. Or if you're building a headless CMS? Take inspiration from this plugin design.

"Projects that make it easy to extend are projects that last. EmDash's auth provider interface is a great example. It lets us add features without breaking the core, and it lets the community contribute without fighting the framework.

That's what open source should feel like."

---

## 🎯 KEY TECHNICAL POINTS TO MENTION

### Why This Approach Works
1. **Interface-driven design**: EmDash defines the contract, we implement it
2. **Zero migrations**: Correct use of existing credential table with algorithm code `1`
3. **BCrypt via oslo**: Standard, well-tested password hashing
4. **Astro sessions**: Uses EmDash's built-in session management
5. **kumo UI**: EmDash's own component library, already bundled

### Installation Notes
- Requires 32GB RAM for dev server (monorepo build needs ~3GB)
- Uses `@cloudflare/kumo` UI components (already in project)
- Stores credentials in existing `credentials` table
- No external dependencies beyond BCrypt and Astro

### Extension Points Viewers Can See
- Easy to add email verification (placeholder config option exists)
- Easy to add rate limiting (just modify route handlers)
- Easy to add social login (duplicate the pattern for OAuth)
- Plugin can be published to npm independently

## 🎮 DEMO SCRIPT (For Recording)

### Pre-demo Setup
```bash
# Open terminal showing:
pwd # /home/woden/emdash-auth-provider-password
ls -la  # Show the package structure
```

### Demo Sequence
1. Show package structure (`find . -type f | head -10`)
2. Open `package.json` in editor (show the clean exports)
3. Open `index.ts` (show descriptor)
4. Open `admin.tsx` (show components)
5. Open `setup-register.ts` (show registration logic)
6. Switch to dev server demo (show setup wizard, click, fill, login)
7. Show admin panel after login

## 📦 PACKAGE FILE LIST (For Reference)

```
/home/woden/emdash-auth-provider-password/
├── package.json              # 960 bytes — clean deps, TypeScript
├── README.md                 # 4.9K — docs and installation guide
├── LICENSE                   # MIT license
├── deploy-to-github.sh       # 1.6K — script for publishing
└── src/
    ├── index.ts              # 1.5K — password() descriptor
    ├── admin.tsx             # 6.8K — React components
    └── routes/
        ├── setup-register.ts # 4.0K — account creation route
        └── setup-login.ts    # 2.8K — login route
```

## 🔗 LINKS TO SHOW

- Package on GitHub: `https://github.com/kalaspuffar/emdash-auth-provider-password`
- EmDash CMS: `https://github.com/emdash-cms/emdash`
- osl.io/crypto docs: `https://github.com/panva/oslo`
- Astro portabletext: `https://github.com/withastro/astro`

---

**END OF VIDEO SCRIPT**
Total runtime: ~15 minutes
Focus: Constructive tutorial showing plugin architecture in action
Narrative: "Good plugin design = good software"
