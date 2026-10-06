import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { studentClassrooms: true, parentClassrooms: true }
                }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("Error obteniendo grupos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

        const newGroup = await prisma.group.create({ data: { name } });
        return NextResponse.json({ message: "Grupo creado", group: newGroup }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}