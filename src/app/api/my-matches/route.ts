import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user.classroomId) {
            return NextResponse.json({ error: "No tienes un salón asignado." }, { status: 403 });
        }

        const classroomId = session.user.classroomId;

        // 1. Obtener los partidos donde participe el salón (Como Home, Away o Competidor)
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { homeTeam: { classroomId: classroomId } },
                    { awayTeam: { classroomId: classroomId } },
                    { competitors: { some: { team: { classroomId: classroomId } } } }
                ]
            },
            include: {
                subDiscipline: { include: { discipline: true } },
                stage: true,
                homeTeam: {
                    include: {
                        classroom: true,
                        players: {
                            include: { player: { include: { teams: { include: { team: true } } } } },
                            orderBy: [{ isStarter: 'desc' }, { player: { lastName: 'asc' } }]
                        }
                    }
                },
                awayTeam: {
                    include: {
                        classroom: true,
                        players: {
                            include: { player: { include: { teams: { include: { team: true } } } } },
                            orderBy: [{ isStarter: 'desc' }, { player: { lastName: 'asc' } }]
                        }
                    }
                },
                competitors: {
                    include: {
                        team: { include: { classroom: true } },
                        player: { include: { teams: { include: { team: true } } } }
                    }
                }
            },
            orderBy: {
                createdAt: 'asc' // O por matchOrder si prefieres
            }
        });

        // 2. Obtener TODAS las nóminas del salón para la inteligencia de "Padres"
        const myClassroomTeams = await prisma.team.findMany({
            where: { classroomId },
            include: { players: { include: { player: true } } }
        });

        return NextResponse.json({ matches, myClassroomTeams });
    } catch (error) {
        console.error("Error fetching my matches:", error);
        return NextResponse.json({ error: "Error al obtener el fixture" }, { status: 500 });
    }
}