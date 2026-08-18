import { hashPassword } from "@/lib/admin/auth";

/**
 * Offline helper for generating ADMIN_PASSWORD_HASH — the plaintext
 * password is never written to disk, never sent anywhere, and never
 * touches the database. Run this locally/on the VPS, copy the printed
 * hash into your production .env, then discard the terminal history if
 * shared.
 *
 * Usage:
 *   npm run admin:hash-password -- 'your-password-here'
 */
function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npm run admin:hash-password -- 'your-password-here'");
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error("Refusing a password shorter than 12 characters — this protects a single admin panel, but it's still the only thing standing between the public internet and your operational data.");
    process.exitCode = 1;
    return;
  }

  const hash = hashPassword(password);
  console.log("\nADMIN_PASSWORD_HASH=" + hash);
  console.log("\nCopy the line above into your production .env. Never commit it.");
}

main();
