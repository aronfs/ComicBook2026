import { app } from "./app";
import { config } from "./config/env";

const startServer = async () => {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log(`[DB] Conexión a PostgreSQL establecida`);
    await prisma.$disconnect();
  } catch (error) {
    console.error(`[DB] Error al conectar a PostgreSQL:`, error);
    process.exit(1);
  }

  app.listen(
    {
      port: config.port,
      hostname: config.host,
    },
    () => {
      console.log(
        `[Server] ComicBook 2.0 API corriendo en http://${config.host}:${config.port}`
      );
      if (config.swagger.enabled) {
        console.log(
          `[Swagger] Documentación disponible en http://${config.host}:${config.port}/api/docs`
        );
      }
    }
  );
};

startServer();
