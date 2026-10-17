const DEV_SECRET = "local-development-secret-change-me";

/** Production refuses to sign sessions unless AUTH_SECRET is long enough. Development keeps a local fallback. */
export function authSecretBytes(): Uint8Array {
  const configured = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!configured || configured.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters in production");
    }
    return new TextEncoder().encode(configured);
  }
  return new TextEncoder().encode(configured || DEV_SECRET);
}
