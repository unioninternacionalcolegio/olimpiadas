import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const subDisciplineId = searchParams.get("subDisciplineId");
        const stageId = searchParams.get("stageId");
        const classroomId = searchParams.get("classroomId");
        const disciplineId = searchParams.get("disciplineId"); // NUEVO FILTRO PARA LA SUMA GLOBAL

        const whereClause: any = {};
        if (subDisciplineId) whereClause.subDisciplineId = subDisciplineId;
        if (stageId) whereClause.stageId = stageId;
        if (disciplineId) whereClause.subDiscipline = { disciplineId: disciplineId };

        if (classroomId) {
            whereClause.OR = [
                { homeTeam: { classroomId } },
                { awayTeam: { classroomId } },
                { competitors: { some: { team: { classroomId } } } }
            ];
        }

        const matches = await prisma.match.findMany({
            where: whereClause,
            include: {
                subDiscipline: { include: { discipline: true } },
                stage: true,
                group: true,
                winnerTeam: true,
                homeTeam: { include: { classroom: true, players: { include: { player: true }, orderBy: { isStarter: 'desc' } } } },
                awayTeam: { include: { classroom: true, players: { include: { player: true }, orderBy: { isStarter: 'desc' } } } },
                competitors: {
                    include: { team: { include: { classroom: true, players: { include: { player: true }, orderBy: { isStarter: 'desc' } } } } },
                    orderBy: { position: 'asc' }
                },
            },
            orderBy: [
                { stage: { stageOrder: 'asc' } },
                { matchOrder: 'asc' },
                { createdAt: 'desc' }
            ],
        });

        return NextResponse.json(matches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        return NextResponse.json({ error: "Error al obtener los partidos" }, { status: 500 });
    }
}

async function getOrCreateTeamId(classroomId: string, subDisciplineId: string, letter: string) {
    if (!classroomId || !letter) return null;

    let team = await prisma.team.findUnique({
        where: { classroomId_subDisciplineId_letter: { classroomId, subDisciplineId, letter } }
    });

    if (!team) {
        const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
        if (!classroom) return null;

        team = await prisma.team.create({
            data: {
                name: `Equipo ${letter}`,
                letter,
                classroomId,
                subDisciplineId
            }
        });
    }

    return team.id;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subDisciplineId, stageId, groupId, court, matchOrder, format, homeClassroomId, homeTeamLetter, awayClassroomId, awayTeamLetter, classroomIds } = body;

        if (!subDisciplineId || !stageId) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const matchData: any = {
            subDisciplineId,
            stageId,
            groupId: groupId || null,
            court: court || "Campo Principal",
            matchOrder: Number(matchOrder) || 1,
            status: "PENDIENTE",
        };

        if (format === "ENFRENTAMIENTO") {
            if (!homeClassroomId) {
                return NextResponse.json({ error: "Debe seleccionar al menos un Aula Local para armar la llave" }, { status: 400 });
            }

            const homeTeamId = await getOrCreateTeamId(homeClassroomId, subDisciplineId, homeTeamLetter);
            if (homeTeamId) matchData.homeTeamId = homeTeamId;

            if (awayClassroomId) {
                const awayTeamId = await getOrCreateTeamId(awayClassroomId, subDisciplineId, awayTeamLetter);
                if (awayTeamId) matchData.awayTeamId = awayTeamId;
            }
        }

        const newMatch = await prisma.match.create({ data: matchData });

        // LÓGICA PARA COMPETENCIA (ATLETISMO) - Inscribe a todas las aulas seleccionadas en la carrera
        if (format === "COMPETENCIA" && classroomIds && classroomIds.length > 0) {
            for (const cId of classroomIds) {
                const teamId = await getOrCreateTeamId(cId, subDisciplineId, "A"); // En Atletismo generalmente es Equipo A
                if (teamId) {
                    await prisma.matchCompetitor.create({
                        data: { matchId: newMatch.id, teamId: teamId }
                    });
                }
            }
        }

        return NextResponse.json(newMatch, { status: 201 });
    } catch (error) {
        console.error("Error creating match:", error);
        return NextResponse.json({ error: "Error al programar el evento" }, { status: 500 });
    }
}