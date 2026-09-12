import { createHash, randomBytes } from "node:crypto";

export const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

export function createInvitationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashInvitationToken(token),
    expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
  };
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
