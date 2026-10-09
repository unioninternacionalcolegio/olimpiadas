import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.classroomId) {
            return NextResponse.json({ error: "No autorizado o sin aula asignada" }, { status: 403 });
        }

        // Ya NO filtramos por Grupo. Traemos TODAS las nóminas de todo el colegio
        const teams = await prisma.team.findMany({
            include: {
                subDiscipline: { include: { discipline: true } },
                classroom: true,
                players: {
                    include: {
                        player: {
                            include: {
                                teams: { include: { team: { include: { classroom: true } } } }
                            }
                        }
                    },
                    orderBy: [
                        { isStarter: 'desc' },
                        { player: { lastName: 'asc' } }
                    ]
                }
            },
            orderBy: [
                { classroom: { name: 'asc' } },
                { subDiscipline: { discipline: { name: 'asc' } } }
            ]
        });

        return NextResponse.json(teams);
    } catch (error) {
        console.error("Error fetching global teams:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}