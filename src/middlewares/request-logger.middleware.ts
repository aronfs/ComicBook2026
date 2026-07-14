import { Elysia } from "elysia";
import { config } from "../config/env";

export const requestLoggerMiddleware = (app: Elysia) =>
  app.onRequest(({ request }) => {
    if (config.logLevel === "debug") {
      const url = new URL(request.url);
      console.log(`[${request.method}] ${url.pathname}`);
    }
  });
