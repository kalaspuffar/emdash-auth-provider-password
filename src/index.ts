/**
 * Password authentication provider for EmDash CMS
 *
 * Adds email/password as a login method alongside passkey.
 * Users can sign up during setup wizard or login afterward.
 *
 * @example
 * ```ts
 * import { password } from "@emdash-cms/auth-provider-password";
 *
 * export default defineConfig({
 *   integrations: [
 *     emdash({
 *       authProviders: [password()],
 *     }),
 *   ],
 * });
 * ```
 */

import type { AuthProviderDescriptor } from "emdash";

/**
 * Configure password authentication as a pluggable auth provider.
 *
 * @param _config Not used yet — reserved for future options (e.g., email verification)
 * @returns AuthProviderDescriptor for use in `emdash({ authProviders: [...] })`
 */
export function password(_config?: {
  /** Require email verification before first login */
  requireEmailVerification?: boolean;
  /** Minimum password length */
  minLength?: number;
}): AuthProviderDescriptor {
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
