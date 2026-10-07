import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "ASISTENTE"].includes(session.user.role)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { id } = await params;
        // CORRECCIÓN: Agregamos jerseyNumber en la desestructuración
        const { firstName, lastName, gender, isParent, isStarter, jerseyNumber } = await request.json();

        const teamPlayer = await prisma.teamPlayer.findUnique({ where: { id } });
        if (!teamPlayer) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

        await prisma.player.update({
            where: { id: teamPlayer.playerId },
            data: { firstName, lastName, gender, isParent: Boolean(isParent) }
        });

        const updatedTeamPlayer = await prisma.teamPlayer.update({
            where: { id },
            data: {
                isStarter: Boolean(isStarter),
                jerseyNumber: jerseyNumber || null
            },
            include: { player: true }
        });

        return NextResponse.json({ message: "Jugador actualizado", teamPlayer: updatedTeamPlayer });
    } catch (error) {
        console.error("Error actualizando jugador:", error);
        return NextResponse.json({ error: "Error actualizando jugador" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "ASISTENTE"].includes(session.user.role)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { id } = await params;
        await prisma.teamPlayer.delete({ where: { id } });

        return NextResponse.json({ message: "Jugador removido del equipo" });
    } catch (error) {
        console.error("Error eliminando jugador:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}