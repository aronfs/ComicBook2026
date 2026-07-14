import { env } from "bun";

export const config = {
  nodeEnv: env.NODE_ENV || "development",
  host: env.HOST || "0.0.0.0",
  port: parseInt(env.PORT || "3000"),
  databaseUrl: env.DATABASE_URL || "",
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET || "dev-access-secret",
    refreshSecret: env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  cors: {
    origin: (env.CORS_ORIGIN || "http://localhost:3000").split(","),
  },
  swagger: {
    enabled: env.SWAGGER_ENABLED === "true",
  },
  logLevel: env.LOG_LEVEL || "debug",
  seed: {
    adminEmail: env.SEED_ADMIN_EMAIL || "admin@comicbook.local",
    adminPassword: env.SEED_ADMIN_PASSWORD || "ChangeMe123*",
  },
};
