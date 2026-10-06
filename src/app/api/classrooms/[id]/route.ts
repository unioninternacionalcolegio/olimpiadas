import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { id } = await params;
        const { name, studentGroupId, parentGroupId } = await request.json();

        if (!name || !studentGroupId) return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });

        const updatedClassroom = await prisma.classroom.update({
            where: { id },
            data: {
                name,
                studentGroupId,
                parentGroupId: parentGroupId || null
            },
            include: { studentGroup: true, parentGroup: true }
        });

        return NextResponse.json({ message: "Salón actualizado", classroom: updatedClassroom });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { id } = await params;
        await prisma.classroom.delete({ where: { id } });

        return NextResponse.json({ message: "Salón eliminado" });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json({ error: "No se puede eliminar el salón porque ya tiene datos asignados." }, { status: 400 });
        }
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}