import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// OBTENER TODOS LOS USUARIOS
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                dni: true,
                phone: true,
                role: true,
                classroomId: true, // NUEVO: Saber el ID de su salón
                classroom: {       // NUEVO: Traer el nombre del salón
                    select: { name: true }
                },
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// CREAR UN NUEVO USUARIO
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        // NUEVO: Agregamos classroomId que viene del frontend
        const { name, username, dni, phone, password, role, classroomId } = body;

        // Validaciones básicas (No obligamos classroomId porque el Admin o Asistente no tienen salón)
        if (!name || !username || !dni || !phone || !password || !role) {
            return NextResponse.json({ error: "Todos los campos principales son obligatorios" }, { status: 400 });
        }

        // Si es Asesor o Delegado, lo ideal es que tengan un salón asignado (validación opcional pero recomendada)
        if ((role === "ASESOR" || role === "DELEGADO") && !classroomId) {
            return NextResponse.json({ error: "Un Asesor o Delegado debe tener un salón asignado" }, { status: 400 });
        }

        // Verificar si el usuario o DNI ya existen
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { dni: dni }
                ]
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "El nombre de usuario o DNI ya está registrado" },
                { status: 400 }
            );
        }

        // Encriptar la contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el usuario
        const newUser = await prisma.user.create({
            data: {
                name,
                username,
                dni,
                phone,
                password: hashedPassword,
                role,
                classroomId: classroomId || null, // NUEVO: Guardamos el ID del salón si existe
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                classroom: { select: { name: true } }
            }
        });

        return NextResponse.json({ message: "Usuario creado con éxito", user: newUser }, { status: 201 });

    } catch (error) {
        console.error("Error creando usuario:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}