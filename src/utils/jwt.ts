import { config } from "../config/env";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

async function createSignature(
  header: string,
  payload: string,
  secret: string
): Promise<string> {
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(m|h|d)$/);
  if (!match) return 900;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900;
  }
}

export async function signAccessToken(
  payload: Omit<JwtPayload, "sub"> & { sub: string }
): Promise<string> {
  return sign(payload, config.jwt.accessSecret, config.jwt.accessExpiresIn);
}

export async function signRefreshToken(
  payload: Omit<JwtPayload, "sub"> & { sub: string }
): Promise<string> {
  return sign(payload, config.jwt.refreshSecret, config.jwt.refreshExpiresIn);
}

async function sign(
  payload: JwtPayload,
  secret: string,
  expiresIn: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiresIn(expiresIn);

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(
    JSON.stringify({ ...payload, iat: now, exp })
  );
  const signature = await createSignature(headerEncoded, payloadEncoded, secret);

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  return verify(token, config.jwt.accessSecret);
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  return verify(token, config.jwt.refreshSecret);
}

async function verify(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token inválido");

  const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
  const expectedSignature = await createSignature(
    headerEncoded,
    payloadEncoded,
    secret
  );

  if (signatureEncoded !== expectedSignature) {
    throw new Error("Firma del token inválida");
  }

  const payload = JSON.parse(base64UrlDecode(payloadEncoded));

  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error("Token expirado");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  };
}
