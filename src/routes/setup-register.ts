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
import bcryptjs from "bcryptjs";
import {
  finalizeSetup,
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
    const db = emdash.db as import("kysely").Kysely<any>;
    const now = new Date().toISOString();

    // First-user check — setup wizard can only create one admin
    const options = new OptionsRepository(emdash.db);
    const setupComplete = await options.get("emdash:setup_complete");

    if (setupComplete === true || setupComplete === "true") {
      return new Response(
        JSON.stringify({ error: "Setup is already complete. Please use an existing account or contact the admin." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Hash password
    const HASH_ROUNDS = 12;
    const hashedPassword = await bcryptjs.hash(password, HASH_ROUNDS);

    // Insert user directly into the users table (no @emdash-cms/auth dependency)
    const userId = crypto.randomUUID();
    await db
      .insertInto("users")
      .values({
        id: userId,
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        avatar_url: null,
        role: 50, // ADMIN
        email_verified: 1,
        disabled: 0,
        data: "{}",
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirst();

    // Insert credential row with password hash
    const credId = crypto.randomUUID();
    const insertData: any = {
      id: credId,
      user_id: userId,
      public_key: new TextEncoder().encode(hashedPassword),
      counter: 0,
      device_type: "singleDevice",
      backed_up: 0,
      transports: null,
      name: "password",
      created_at: now,
      last_used_at: now,
    };
    // Only include algorithm if the column exists (added in migration 037)
    const tableInfo = await db.selectFrom("sqlite_master").select("sql").where("name", "=", "credentials").executeTakeFirst();
    if (tableInfo?.sql?.includes("algorithm")) {
      insertData.algorithm = 1; // password hash (not a COSE algorithm)
    }
    await db
      .insertInto("credentials")
      .values(insertData)
      .executeTakeFirst();

    // Mark setup complete
    await finalizeSetup(emdash.db);
    console.log(`[password-auth] Setup complete: created admin user via password (${normalizedEmail})`);

    // Create Astro session
    if (session) {
      session.set("user", { id: userId, email: normalizedEmail });
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
