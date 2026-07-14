import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { config } from "../config/env";
import type { AuthPayload } from "../types/auth.types";

export class TokenService {
  async generateTokens(
    payload: AuthPayload
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await signAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    });

    const refreshToken = await signRefreshToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    });

    return { accessToken, refreshToken };
  }

  async verifyRefresh(token: string): Promise<AuthPayload> {
    const payload = await verifyRefreshToken(token);
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as AuthPayload["role"],
      sessionId: payload.sessionId,
    };
  }

  async hashToken(token: string): Promise<string> {
    const hash = await Bun.password.hash(token, {
      algorithm: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
    });
    return hash;
  }

  async verifyTokenHash(token: string, hash: string): Promise<boolean> {
    return Bun.password.verify(token, hash);
  }

  parseExpiresIn(expiresIn: string = config.jwt.refreshExpiresIn): Date {
    const match = expiresIn.match(/^(\d+)(m|h|d)$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      m: 60 * 1000,
      h: 3600 * 1000,
      d: 86400 * 1000,
    };
    return new Date(Date.now() + value * (multipliers[unit] || multipliers.d));
  }
}

export const tokenService = new TokenService();
