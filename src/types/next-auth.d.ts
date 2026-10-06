import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            username: string;
            role: string;
            classroomId?: string | null;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        id: string;
        username: string;
        role: string;
        classroomId?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        username: string;
        role: string;
        classroomId?: string | null;
    }
}