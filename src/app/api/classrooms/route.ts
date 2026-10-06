//src/app/api/classrooms/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const classrooms = await prisma.classroom.findMany({
            include: {
                studentGroup: true,
                parentGroup: true
            },
            orderBy: [
                { studentGroup: { name: "asc" } },
                { name: "asc" }
            ]
        });

        return NextResponse.json(classrooms);
    } catch (error) {
        console.error("Error obteniendo salones:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { name, studentGroupId, parentGroupId } = await request.json();

        if (!name || !studentGroupId) {
            return NextResponse.json({ error: "Nombre y Grupo de Estudiantes son obligatorios" }, { status: 400 });
        }

        const newClassroom = await prisma.classroom.create({
            data: {
                name,
                studentGroupId,
                parentGroupId: parentGroupId || null
            },
            include: { studentGroup: true, parentGroup: true }
        });

        return NextResponse.json({ message: "Salón creado", classroom: newClassroom }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}