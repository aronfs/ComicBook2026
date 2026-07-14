import swagger from "@elysiajs/swagger";
import { config } from "./env";

export function getSwaggerConfig() {
  if (!config.swagger.enabled) return null;

  return swagger({
    path: "/api/docs",
    documentation: {
      info: {
        title: "ComicBook 2.0 API",
        version: "2.0.0",
        description:
          "API REST para la gestión y catálogo de cómics. Sistema de administración con autenticación JWT, roles (USER, EDITOR, ADMIN) y control completo de catálogo.",
      },
      tags: [
        { name: "Auth", description: "Autenticación y registro de usuarios" },
        { name: "Users", description: "Gestión del perfil del usuario" },
        { name: "Comics", description: "Catálogo público de cómics" },
        {
          name: "Comic Types",
          description: "Tipos de cómic disponibles",
        },
        { name: "Favorites", description: "Gestión de favoritos" },
        { name: "Admin", description: "Administración del sistema" },
        { name: "Health", description: "Estado del servicio" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
}
