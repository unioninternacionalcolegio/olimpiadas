import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ==========================================================
// FUNCIÓN PARA RECALCULAR LA TABLA GLOBAL DEL SALÓN EN BD
// ==========================================================
async function recalculateRanking(classroomId: string, subDisciplineId: string, stageId: string) {
    const homeMatches = await prisma.match.findMany({
        where: { homeTeam: { classroomId }, subDisciplineId, stageId, status: "FINALIZADO" }
    });

    const awayMatches = await prisma.match.findMany({
        where: { awayTeam: { classroomId }, subDisciplineId, stageId, status: "FINALIZADO" }
    });

    const competitions = await prisma.matchCompetitor.findMany({
        where: { team: { classroomId }, match: { subDisciplineId, stageId, status: "FINALIZADO" } }
    });

    let totalPoints = 0;
    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;

    homeMatches.forEach(m => {
        totalPoints += m.homeTablePts;
        totalGoalsFor += m.homeScore;
        totalGoalsAgainst += m.awayScore;
    });

    awayMatches.forEach(m => {
        totalPoints += m.awayTablePts;
        totalGoalsFor += m.awayScore;
        totalGoalsAgainst += m.homeScore;
    });

    competitions.forEach(c => {
        totalPoints += c.points;
    });

    await prisma.ranking.upsert({
        where: {
            stageId_classroomId: {
                stageId,
                classroomId,
            }
        },
        update: {
            points: totalPoints,
            goalsFor: totalGoalsFor,
            goalsAgainst: totalGoalsAgainst
        },
        create: {
            subDisciplineId,
            stageId,
            classroomId,
            points: totalPoints,
            goalsFor: totalGoalsFor,
            goalsAgainst: totalGoalsAgainst
        }
    });
}

// ==========================================================
// ACTUALIZAR PARTIDO Y RESULTADOS (PUT)
// ==========================================================
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { format, status, observation } = body;

        const match = await prisma.match.findUnique({
            where: { id },
            include: {
                stage: true,
                subDiscipline: true,
                homeTeam: true,
                awayTeam: true,
                competitors: { include: { team: true } }
            }
        });

        if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

        // --- LÓGICA PARA FULBITO, VÓLEY, ETC (1vs1) ---
        if (format === "ENFRENTAMIENTO") {
            const { homeScore, awayScore } = body;

            let homeTablePts = 0;
            let awayTablePts = 0;
            let winnerId = null;

            if (status === "FINALIZADO" || status === "WALKOVER") {
                if (homeScore > awayScore) {
                    homeTablePts = match.stage.pointsForWin;
                    awayTablePts = match.stage.pointsForLoss;
                    winnerId = match.homeTeamId;
                } else if (awayScore > homeScore) {
                    homeTablePts = match.stage.pointsForLoss;
                    awayTablePts = match.stage.pointsForWin;
                    winnerId = match.awayTeamId;
                } else {
                    homeTablePts = match.stage.pointsForTie;
                    awayTablePts = match.stage.pointsForTie;
                }
            }

            await prisma.match.update({
                where: { id },
                data: { status, homeScore, awayScore, homeTablePts, awayTablePts, winnerId, observation }
            });

            if (status === "FINALIZADO" || status === "WALKOVER") {
                if (match.homeTeam?.classroomId) await recalculateRanking(match.homeTeam.classroomId, match.subDisciplineId, match.stageId);
                if (match.awayTeam?.classroomId) await recalculateRanking(match.awayTeam.classroomId, match.subDisciplineId, match.stageId);
            }

            // --- LÓGICA PARA ATLETISMO (Carreras y Múltiples Competidores) ---
        } else if (format === "COMPETENCIA") {
            const { competitorsData } = body;

            await prisma.match.update({
                where: { id },
                data: { status, observation }
            });

            if (competitorsData && competitorsData.length > 0) {
                for (const comp of competitorsData) {
                    await prisma.matchCompetitor.update({
                        where: { id: comp.id },
                        data: {
                            score: Number(comp.score) || 0,
                            position: comp.position ? Number(comp.position) : null,
                            points: Number(comp.points) || 0,
                            playerName: comp.playerName || null // GUARDA EL NOMBRE DEL ATLETA AQUÍ
                        }
                    });
                }
            }

            if (status === "FINALIZADO") {
                for (const comp of match.competitors) {
                    await recalculateRanking(comp.team.classroomId, match.subDisciplineId, match.stageId);
                }
            }
        }

        return NextResponse.json({ message: "Partido actualizado y rankings recalculados" });

    } catch (error) {
        console.error("Error updating match:", error);
        return NextResponse.json({ error: "Error al actualizar el evento" }, { status: 500 });
    }
}

// ==========================================================
// ELIMINAR PARTIDO (DELETE)
// ==========================================================
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        await prisma.match.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Evento eliminado correctamente" });
    } catch (error) {
        console.error("Error deleting match:", error);
        return NextResponse.json({ error: "Error al eliminar el evento" }, { status: 500 });
    }
}