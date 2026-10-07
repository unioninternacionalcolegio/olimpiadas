import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ACTUALIZAR (EDITAR) UN USUARIO
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, username, dni, phone, password, role, classroomId } = body;

        if (!name || !username || !dni || !phone || !role) {
            return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
        }

        if ((role === "ASESOR" || role === "DELEGADO") && !classroomId) {
            return NextResponse.json({ error: "Un Asesor o Delegado debe tener un salón asignado" }, { status: 400 });
        }

        const updateData: any = {
            name,
            username,
            dni,
            phone,
            role,
            classroomId: classroomId || null,
        };

        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                classroom: { select: { name: true } }
            }
        });

        return NextResponse.json({ message: "Usuario actualizado", user: updatedUser });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "El DNI o Username ya está en uso por otro usuario" }, { status: 400 });
        }
        console.error("Error actualizando usuario:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// ELIMINAR UN USUARIO
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { id } = await params;

        if (session.user.id === id) {
            return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
        console.error("Error eliminando usuario:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}