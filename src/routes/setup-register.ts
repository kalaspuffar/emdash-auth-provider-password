/**
 * Setup wizard route: register a new admin account via email/password.
 *
 * Accepts email, name, and password. Creates a User directly in the database,
 * stores a BCrypt password hash in the Credential table, and marks setup complete.
 * This is the "create admin account" step when a site has the password provider enabled.
 *
 * POST /_emdash/api/setup/password-register
 * Body: { email, name, password }
 * Response: { user: { id, email } } (uses Astro's session.set + redirect for login)
 */

import type { APIRoute } from "astro";

import { findOrCreateOAuthUser, Role } from "@emdash-cms/auth";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { generateSessionId, passwordHash } from "@oslojs/crypto/bcrypt";
import {
  finalizeSetup,
  getPublicOrigin,
  OptionsRepository,
} from "emdash/api/route-utils";

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

    // Parse request body
    const body = await request.json();
    const { email, name, password } = body as {
      email?: string | null;
      name?: string | null;
      password?: string | null;
    };

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adapter = createKyselyAdapter(emdash.db);

    // First-user check — setup wizard can only create one admin
    const options = new OptionsRepository(emdash.db);
    const setupComplete = await options.get("emdash:setup_complete");

    if (setupComplete === true || setupComplete === "true") {
      return new Response(
        JSON.stringify({ error: "Setup is already complete. Please use an existing account or contact the admin." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const isFirstUser = true;

    // Build password profile
    const profile = {
      id: "password",
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      avatarUrl: null,
      emailVerified: true,
    };

    // Use shared find-or-create
    const user = await findOrCreateOAuthUser(adapter, "password", profile, async () => {
      return { allowed: true, role: Role.ADMIN };
    });

    // Write the password hash into the credential table
    const hashedPassword = await passwordHash(password);
    const credId = generateSessionId().slice(0, 43);

    await adapter.createCredential({
      id: credId,
      userId: user.id,
      publicKey: new TextEncoder().encode(hashedPassword),
      algorithm: 1, // BCrypt password hash (credential storage only, not a COSE algorithm)
      counter: 0,
      deviceType: "singleDevice",
      backedUp: false,
      transports: [],
      name: "password",
    });

    // Mark setup complete
    await finalizeSetup(emdash.db);
    console.log(`[password-auth] Setup complete: created admin user via password (${normalizedEmail})`);

    // Create Astro session
    if (session) {
      session.set("user", { id: user.id, email: normalizedEmail });
    }

    return redirect("/_emdash/admin");
  } catch (error) {
    console.error("[password-register] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
