import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { id } = await params;
        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

        const updatedGroup = await prisma.group.update({
            where: { id },
            data: { name },
        });

        return NextResponse.json({ message: "Grupo actualizado", group: updatedGroup });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { id } = await params;

        // Verificar si el grupo tiene aulas antes de eliminar (ya sea como estudiantes o padres)
        const studentCount = await prisma.classroom.count({ where: { studentGroupId: id } });
        const parentCount = await prisma.classroom.count({ where: { parentGroupId: id } });

        if (studentCount > 0 || parentCount > 0) {
            return NextResponse.json({ error: "No se puede eliminar un grupo que está asignado a salones." }, { status: 400 });
        }

        await prisma.group.delete({ where: { id } });
        return NextResponse.json({ message: "Grupo eliminado" });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}