#!/usr/bin/env node
// Run this yourself: `node scripts/generate-password-hash.mjs`
// Your password is typed into your own terminal and never leaves this
// machine — it is not sent anywhere, only hashed locally with scrypt.

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === "") {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "") process.exit(130); // Ctrl+C
      if (char === "" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    stdin.on("data", onData);
  });
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.close(); // only used to keep stdin in a sane state on non-TTY input; hidden reader above does the real work

const password = await askHidden("New dashboard password: ");
const confirm = await askHidden("Confirm password: ");

if (!password) {
  console.error("No password entered.");
  process.exit(1);
}
if (password !== confirm) {
  console.error("Passwords did not match.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log("\nAdd this line to frontend/.env.local (and to the root .env if using docker compose):\n");
console.log(`APP_PASSWORD_HASH=${salt}:${hash}\n`);
console.log("Restart the Next.js server afterward — env files are only read at startup.");
