import { join, normalize } from "node:path";
import { userInfo } from "node:os";

import { RunnerError, fail } from "./errors.mjs";
import { runBounded, runInherited, sanitizedLocalEnvironment } from "./process.mjs";
import { decodeUtf8 } from "./text.mjs";

export const SECURITY_EXECUTABLE = "/usr/bin/security";
const KEYCHAIN_TIMEOUT_MS = 10_000;
const KEYCHAIN_OUTPUT_LIMIT = 4 * 1024;

export function loginKeychainPath(homeDirectory = userInfo().homedir) {
  if (typeof homeDirectory !== "string" || !homeDirectory.startsWith("/") || /[\0\r\n]/u.test(homeDirectory)) {
    fail("KEYCHAIN_CONFIGURATION", "The local home directory is not canonical.");
  }
  return normalize(join(homeDirectory, "Library/Keychains/login.keychain-db"));
}

function decodeSingleLine(buffer, label) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > KEYCHAIN_OUTPUT_LIMIT) {
    fail("KEYCHAIN_UNAVAILABLE", `${label} returned invalid bounded metadata.`);
  }
  const value = decodeUtf8(buffer, label, KEYCHAIN_OUTPUT_LIMIT).trim();
  if (!value || /[\0\r\n]/u.test(value)) {
    fail("KEYCHAIN_UNAVAILABLE", `${label} returned invalid metadata.`);
  }
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function keychainEnvironment(home) {
  return sanitizedLocalEnvironment(home);
}

function rethrowProcessControl(error) {
  if (error instanceof RunnerError && (error.preserveLock || error.code === "PROCESS_CANCELLED")) {
    throw error;
  }
}

export async function verifyLoginKeychain(dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const home = dependencies.homeDirectory ?? userInfo().homedir;
  const expected = loginKeychainPath(home);
  const env = keychainEnvironment(home);
  let login;
  let defaultKeychain;
  try {
    login = await run({
      executable: SECURITY_EXECUTABLE,
      args: ["login-keychain"],
      cwd: home,
      env,
      timeoutMs: KEYCHAIN_TIMEOUT_MS,
      maxOutputBytes: KEYCHAIN_OUTPUT_LIMIT,
      signal: dependencies.signal,
    });
    defaultKeychain = await run({
      executable: SECURITY_EXECUTABLE,
      args: ["default-keychain", "-d", "user"],
      cwd: home,
      env,
      timeoutMs: KEYCHAIN_TIMEOUT_MS,
      maxOutputBytes: KEYCHAIN_OUTPUT_LIMIT,
      signal: dependencies.signal,
    });
  } catch (error) {
    rethrowProcessControl(error);
    fail("KEYCHAIN_UNAVAILABLE", "The local login Keychain selection could not be proven.", { cause: error });
  }
  if (
    decodeSingleLine(login.stdout, "login-keychain") !== expected ||
    decodeSingleLine(defaultKeychain.stdout, "default-keychain") !== expected
  ) {
    fail("KEYCHAIN_MISMATCH", "The login and default Keychains are not the approved local login Keychain.");
  }
  return { expectedPath: expected, env };
}

export async function credentialExists(manifest, dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const selected = dependencies.selected ?? await verifyLoginKeychain(dependencies);
  let result;
  try {
    result = await run({
      executable: SECURITY_EXECUTABLE,
      args: [
        "find-generic-password",
        "-s",
        manifest.credential.keychainService,
        "-a",
        manifest.credential.keychainAccount,
        selected.expectedPath,
      ],
      cwd: dependencies.homeDirectory ?? userInfo().homedir,
      env: selected.env,
      timeoutMs: KEYCHAIN_TIMEOUT_MS,
      maxOutputBytes: KEYCHAIN_OUTPUT_LIMIT,
      acceptedExitCodes: [0, 44],
      signal: dependencies.signal,
    });
  } catch (error) {
    rethrowProcessControl(error);
    fail("KEYCHAIN_UNAVAILABLE", "The credential's Keychain metadata could not be checked.", { cause: error });
  }
  return result.code === 0;
}

export async function readCredential(manifest, dependencies = {}) {
  const run = dependencies.run ?? runBounded;
  const selected = dependencies.selected ?? await verifyLoginKeychain(dependencies);
  let result;
  try {
    result = await run({
      executable: SECURITY_EXECUTABLE,
      args: [
        "find-generic-password",
        "-s",
        manifest.credential.keychainService,
        "-a",
        manifest.credential.keychainAccount,
        "-w",
        selected.expectedPath,
      ],
      cwd: dependencies.homeDirectory ?? userInfo().homedir,
      env: selected.env,
      timeoutMs: KEYCHAIN_TIMEOUT_MS,
      maxOutputBytes: 512,
      signal: dependencies.signal,
    });
  } catch (error) {
    rethrowProcessControl(error);
    fail("CREDENTIAL_UNAVAILABLE", "The dedicated Cloudflare credential could not be read from Keychain.", {
      cause: error,
    });
  }
  const output = result.stdout;
  let length = output.length;
  if (length > 0 && output[length - 1] === 0x0a) length -= 1;
  if (length > 0 && output[length - 1] === 0x0d) length -= 1;
  if (length < 20 || length > 512) {
    output.fill(0);
    fail("CREDENTIAL_INVALID", "Keychain returned an invalid bounded credential.");
  }
  for (let index = 0; index < length; index += 1) {
    const byte = output[index];
    if (byte < 0x21 || byte > 0x7e) {
      output.fill(0);
      fail("CREDENTIAL_INVALID", "Keychain returned an invalid bounded credential.");
    }
  }
  const credential = Buffer.from(output.subarray(0, length));
  output.fill(0);
  return credential;
}

export async function enrollCredential(manifest, dependencies = {}) {
  const inherited = dependencies.runInherited ?? runInherited;
  const tty = dependencies.isTty ?? (() => process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY);
  if (!tty()) {
    fail("TTY_REQUIRED", "Enrollment requires an inherited interactive TTY.");
  }
  const selected = await verifyLoginKeychain(dependencies);
  if (await credentialExists(manifest, { ...dependencies, selected })) {
    fail("CREDENTIAL_EXISTS", "Enrollment refuses to replace an existing exact Keychain item.");
  }
  const args = [
    "add-generic-password",
    "-s",
    manifest.credential.keychainService,
    "-a",
    manifest.credential.keychainAccount,
    "-T",
    SECURITY_EXECUTABLE,
    "-w",
  ];
  await inherited({
    executable: SECURITY_EXECUTABLE,
    args,
    cwd: dependencies.homeDirectory ?? userInfo().homedir,
    env: selected.env,
    signal: dependencies.signal,
  });
  if (!await credentialExists(manifest, { ...dependencies, selected })) {
    fail("ENROLLMENT_UNVERIFIED", "The new Keychain item could not be proven after enrollment.");
  }
}
