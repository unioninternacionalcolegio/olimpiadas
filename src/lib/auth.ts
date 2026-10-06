import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credenciales",
            credentials: {
                username: { label: "Usuario", type: "text", placeholder: "admin" },
                password: { label: "Contraseña", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("Credenciales incompletas");
                }

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username },
                });

                if (!user) {
                    throw new Error("Usuario no encontrado");
                }

                const isValidPassword = await bcrypt.compare(credentials.password, user.password);

                if (!isValidPassword) {
                    throw new Error("Contraseña incorrecta");
                }

                return {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    classroomId: user.classroomId,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.classroomId = user.classroomId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.role = token.role;
                session.user.classroomId = token.classroomId;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};