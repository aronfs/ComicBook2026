import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { getCorsOptions } from "./config/cors";
import { getSwaggerConfig } from "./config/swagger";
import { setupRoutes } from "./routes/index";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware";
import { apiSuccess } from "./utils/api-response";

const app = new Elysia();

app.use(cors(getCorsOptions()));

const swaggerConfig = getSwaggerConfig();
if (swaggerConfig) {
  app.use(swaggerConfig);
}

app.use(requestLoggerMiddleware);

app.get("/health", () =>
  apiSuccess("Servicio disponible", {
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    database: "connected",
    timestamp: new Date().toISOString(),
  }),
  {
    detail: {
      tags: ["Health"],
      summary: "Verificar estado del servicio",
    },
  }
);

app.get("/api/v1/health", () =>
  apiSuccess("Servicio disponible", {
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    database: "connected",
    timestamp: new Date().toISOString(),
  }),
  {
    detail: {
      tags: ["Health"],
      summary: "Verificar estado del servicio v1",
    },
  }
);

setupRoutes(app);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
