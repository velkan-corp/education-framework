import { fail } from "./errors.mjs";

const UTF8 = new TextDecoder("utf-8", { fatal: true });

export function decodeUtf8(buffer, label, maximumBytes) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    fail("INVALID_TEXT", `${label} is not byte input.`);
  }
  if (buffer.byteLength > maximumBytes) fail("INVALID_TEXT", `${label} exceeds its byte bound.`);
  try {
    return UTF8.decode(buffer);
  } catch (error) {
    fail("INVALID_TEXT", `${label} is not canonical UTF-8.`, { cause: error });
  }
}
