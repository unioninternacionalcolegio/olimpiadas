import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const disciplineId = searchParams.get("disciplineId");

        if (!disciplineId) {
            return NextResponse.json({ error: "Falta disciplineId" }, { status: 400 });
        }

        // AHORA TRAEMOS EL EQUIPO CON SU SALÓN (y sus grupos) Y CON SUS JUGADORES
        const teams = await prisma.team.findMany({
            where: { disciplineId },
            include: {
                classroom: {
                    include: { studentGroup: true, parentGroup: true }
                },
                players: {
                    include: { player: true },
                    orderBy: [{ isStarter: 'desc' }, { player: { lastName: 'asc' } }]
                }
            },
            orderBy: { classroom: { name: "asc" } },
        });

        return NextResponse.json(teams);
    } catch (error) {
        console.error("Error en by-discipline:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}