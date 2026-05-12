/**
 * Password Auth Provider Admin Components
 *
 * Provides LoginButton, LoginForm, and SetupStep components
 * for the EmDash admin UI's authentication system and setup wizard.
 */

import { Button, Input } from "@cloudflare/kumo";
import * as React from "react";

// ============================================================================
// Shared email icon
// ============================================================================

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

// ============================================================================
// LoginButton — compact button shown in the provider grid
// ============================================================================

export function LoginButton() {
  return (
    <Button type="button" variant="outline" className="w-full justify-center">
      <EmailIcon className="h-5 w-5" />
      <span>Email & Password</span>
    </Button>
  );
}

// ============================================================================
// LoginForm — expanded form shown when LoginButton is clicked
// ============================================================================

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/_emdash/api/auth/password/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-EmDash-Request": "1",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Invalid email or password");
      }

      // Login successful — the response sets a session cookie
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isLoading}
        required
        className="w-full"
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        disabled={isLoading}
        required
        className="w-full"
      />

      {error && (
        <div className="rounded-lg bg-kumo-danger/10 p-3 text-sm text-kumo-danger">{error}</div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !email.trim() || !password}>
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

// ============================================================================
// SetupStep — shown in the setup wizard for initial admin creation
// ============================================================================

export function SetupStep({ onComplete }: { onComplete: () => void }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/_emdash/api/setup/password-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-EmDash-Request": "1",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: email.trim().split("@")[0],
          password,
        }),
        credentials: "include",
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || "Failed to create admin account");
      }

      // Account created and authenticated — redirect to admin
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-center mb-2">
        <p className="text-sm font-medium text-kumo-default">Email & Password</p>
        <p className="text-xs text-kumo-subtle">Create an admin account with email and password</p>
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isLoading}
        required
        className="w-full"
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
        disabled={isLoading}
        required
        className="w-full"
      />

      <Input
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Repeat your password"
        disabled={isLoading}
        required
        className="w-full"
      />

      {error && (
        <div className="rounded-lg bg-kumo-danger/10 p-3 text-sm text-kumo-danger">{error}</div>
      )}

      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={isLoading || !email.trim() || password.length < 8 || password !== confirmPassword}
      >
        {isLoading ? "Creating account..." : "Create admin account"}
      </Button>
    </form>
  );
}
