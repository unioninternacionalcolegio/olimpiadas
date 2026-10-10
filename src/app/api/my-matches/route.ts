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

        // MAGIA QUIRÚRGICA: Creamos la regla de búsqueda de jugadores una sola vez 
        // para reciclarla en Locales, Visitantes y Corredores (Competidores).
        // Incluye la inteligencia para detectar si juegan en otros salones.
        const playersInclude = {
            include: {
                player: {
                    include: {
                        teams: {
                            include: {
                                team: {
                                    include: { classroom: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { isStarter: 'desc' as const },
                { player: { lastName: 'asc' as const } }
            ]
        };

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
                        players: playersInclude
                    }
                },
                awayTeam: {
                    include: {
                        classroom: true,
                        players: playersInclude
                    }
                },
                competitors: {
                    include: {
                        // ¡AQUÍ ESTÁ LA SOLUCIÓN DE LOS CORREDORES!
                        team: {
                            include: {
                                classroom: true,
                                players: playersInclude // Ya trae la nómina completa
                            }
                        },
                        player: true
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