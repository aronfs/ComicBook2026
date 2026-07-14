import "elysia";

export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "EDITOR" | "ADMIN";
  sessionId: string;
}

declare module "elysia" {
  interface ElysiaRequestMeta {
    user?: AuthUser;
    requestId?: string;
  }
}
