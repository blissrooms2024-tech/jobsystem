import { DefaultSession } from "next-auth";

export type Role = "boss" | "admin" | "supervisor" | "employee";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    role: Role;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    username: string;
    role: Role;
    mustChangePassword: boolean;
  }
}
