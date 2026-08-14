import { createHash, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE = "maestria_lab_access";

export function getAccessPassword() {
  return process.env.APP_ACCESS_PASSWORD?.trim() || null;
}

export function accessTokenFor(password: string) {
  return createHash("sha256").update(`maestria-lab:v1:${password}`).digest("hex");
}

export function isValidAccessPassword(candidate: string) {
  const expected = getAccessPassword();
  if (!expected) return true;
  const left = Buffer.from(accessTokenFor(candidate));
  const right = Buffer.from(accessTokenFor(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}
