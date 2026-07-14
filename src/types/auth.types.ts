export interface AuthPayload {
  sub: string;
  email: string;
  role: "USER" | "EDITOR" | "ADMIN";
  sessionId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserPublic {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface RefreshInput {
  refreshToken: string;
}
