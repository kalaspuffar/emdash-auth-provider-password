/**
 * Login route handler for password authentication provider.
 *
 * Verifies email + password against the database and establishes an Astro session.
 * Reads the BCrypt password hash from the credential row (name="password").
 *
 * POST /_emdash/api/auth/password/login
 * Body: { email, password }
 * Response: redirects to /_emdash/admin on success, or renders login page on failure
 */

import type { APIRoute } from "astro";

import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import bcryptjs from "bcryptjs";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  try {
    const { emdash } = locals;

    if (!emdash?.db) {
      return redirect("/_emdash/admin/login?error=server_error&message=Database not configured");
    }

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return redirect("/_emdash/admin/login?error=invalid_credentials&message=Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adapter = createKyselyAdapter(emdash.db);

    // Find user by email
    const user = await adapter.getUserByEmail(normalizedEmail);
    if (!user) {
      return redirect("/_emdash/admin/login?error=invalid_credentials&message=Invalid email or password");
    }

    // Check disabled
    if (user.disabled) {
      return redirect("/_emdash/admin/login?error=account_disabled&message=Account disabled");
    }

    // Find password credential
    const credentials = await adapter.getCredentialsByUserId(user.id);
    const passwordCred = credentials.find(
      (c) => c.name === "password",
    );

    if (!passwordCred) {
      return redirect(
        "/_emdash/admin/login?error=invalid_credentials&message=" +
        encodeURIComponent("This account does not have a password set. Please use passkey or contact the admin."),
      );
    }

    // Decode and verify password
    const storedHash = new TextDecoder().decode(passwordCred.publicKey);
    const isValid = await bcryptjs.compare(password, storedHash);

    if (!isValid) {
      return redirect("/_emdash/admin/login?error=invalid_credentials&message=Invalid email or password");
    }

    // Mark credential used (increments counter + updates lastUsedAt)
    await adapter.updateCredentialCounter(passwordCred.id, passwordCred.counter + 1);

    // Create Astro session
    if (session) {
      session.set("user", { id: user.id });
    }

    return redirect("/_emdash/admin");
  } catch (error) {
    console.error("[password-login] Error:", error);
    return redirect("/_emdash/admin/login?error=server_error&message=Internal server error");
  }
};
