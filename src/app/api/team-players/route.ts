import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "ASISTENTE"].includes(session.user.role)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { teamId, dni, firstName, lastName, gender, isParent, isStarter } = await request.json();

        if (!teamId || !dni || !firstName || !lastName || !gender) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        // 1. Guardar o actualizar al jugador general
        const player = await prisma.player.upsert({
            where: { dni },
            update: { firstName, lastName, gender, isParent: Boolean(isParent) },
            create: { dni, firstName, lastName, gender, isParent: Boolean(isParent) }
        });

        // 2. Verificar si ya está en ESTE equipo
        const existingLink = await prisma.teamPlayer.findUnique({
            where: { teamId_playerId: { teamId, playerId: player.id } }
        });

        if (existingLink) {
            return NextResponse.json({ error: "El jugador ya está inscrito en este equipo específico." }, { status: 400 });
        }

        // 3. Vincular jugador al equipo (Nómina)
        const newTeamPlayer = await prisma.teamPlayer.create({
            data: {
                teamId,
                playerId: player.id,
                isStarter: Boolean(isStarter)
            },
            include: { player: true }
        });

        return NextResponse.json({ message: "Jugador agregado al equipo", teamPlayer: newTeamPlayer }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}