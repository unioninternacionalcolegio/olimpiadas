import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "ASISTENTE"].includes(session.user.role)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { id } = await params;
        await prisma.team.delete({ where: { id } });

        return NextResponse.json({ message: "Equipo eliminado correctamente" });
    } catch (error) {
        return NextResponse.json({ error: "Error al eliminar equipo" }, { status: 500 });
    }
}