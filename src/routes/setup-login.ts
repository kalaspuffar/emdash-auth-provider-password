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
import bcryptjs from "bcryptjs";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, session, redirect }) => {
  try {
    const { emdash } = locals;

    if (!emdash?.db) {
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return redirect("/_emdash/admin/login?error=invalid_credentials&message=Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = emdash.db as any;

    // Find user by email
    const user = await db
      .selectFrom("users")
      .where("email", "=", normalizedEmail)
      .selectAll()
      .executeTakeFirst();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Check disabled
    if (user.disabled !== 0) {
      return new Response(
        JSON.stringify({ error: "Account disabled" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Find password credential
    const credentials = await db
      .selectFrom("credentials")
      .where("user_id", "=", user.id)
      .where("name", "=", "password")
      .selectAll()
      .executeTakeFirst();

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: "This account does not have a password set. Please use passkey or contact the admin." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Decode and verify password
    const storedHash = new TextDecoder().decode(credentials.public_key as Uint8Array);
    const isValid = await bcryptjs.compare(password, storedHash);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Update last_used_at on credential
    if (credentials.id) {
      await db
        .updateTable("credentials")
        .set({ last_used_at: new Date().toISOString() })
        .where("id", "=", credentials.id)
        .executeTakeFirst();
    }

    // Create Astro session
    if (session) {
      session.set("user", { id: user.id });
    }

    // Return JSON for the frontend — SetupWizard reads the response then redirects.
    // The redirect can't be server-side because the wizard's fetch() won't follow it.
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[password-login] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
