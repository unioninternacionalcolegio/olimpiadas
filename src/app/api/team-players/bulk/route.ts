import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { classroomId, teamLetter, teamsData } = body;

        if (!classroomId || !teamLetter || !teamsData || !Array.isArray(teamsData)) {
            return NextResponse.json({ error: "Faltan datos obligatorios o formato incorrecto" }, { status: 400 });
        }

        const duplicateWarnings: string[] = [];
        const allInputDnis = new Set<string>();

        // ==========================================
        // 1. FASE DE REVISIÓN (ADVERTENCIAS POR SUBDISCIPLINA)
        // ==========================================
        for (const teamItem of teamsData) {
            const { subDisciplineId, playersData } = teamItem;

            const targetSubDiscipline = await prisma.subDiscipline.findUnique({
                where: { id: subDisciplineId },
                include: { discipline: true }
            });

            if (!targetSubDiscipline) {
                return NextResponse.json({ error: `Subdisciplina no encontrada (ID: ${subDisciplineId})` }, { status: 404 });
            }

            // REGLA CAMBIADA: Ahora buscamos en la MISMA Subdisciplina (Ej. Fútbol), 
            // pero excluyendo la letra que estamos guardando (Ej. si guardamos A, buscamos en B y C)
            const otherTeamsInSubDiscipline = await prisma.team.findMany({
                where: {
                    classroomId: classroomId,
                    subDisciplineId: subDisciplineId, // Mismo ID de subcategoría
                    NOT: {
                        letter: teamLetter // Distinta letra de equipo
                    }
                },
                include: {
                    subDiscipline: true,
                    players: { include: { player: true } }
                }
            });

            for (const inputPlayer of playersData) {
                for (const otherTeam of otherTeamsInSubDiscipline) {
                    if (otherTeam.players.some(p => p.player.dni === inputPlayer.dni)) {
                        duplicateWarnings.push(
                            `El jugador ${inputPlayer.firstName} (${inputPlayer.dni}) ya está registrado en el Equipo ${otherTeam.letter} de esta misma categoría.`
                        );
                    }
                }

                if (allInputDnis.has(inputPlayer.dni)) {
                    duplicateWarnings.push(`El DNI ${inputPlayer.dni} (${inputPlayer.firstName}) está repetido dentro del archivo enviado.`);
                } else {
                    allInputDnis.add(inputPlayer.dni);
                }
            }
        }

        // ==========================================
        // 2. FASE DE GUARDADO (SE GUARDA TODO USANDO UPSERT)
        // ==========================================
        await prisma.$transaction(async (tx) => {
            for (const teamItem of teamsData) {
                const { subDisciplineId, playersData } = teamItem;

                let team = await tx.team.findUnique({
                    where: {
                        classroomId_subDisciplineId_letter: {
                            classroomId,
                            subDisciplineId,
                            letter: teamLetter
                        }
                    }
                });

                if (!team) {
                    team = await tx.team.create({
                        data: {
                            name: `Equipo ${teamLetter}`,
                            letter: teamLetter,
                            classroomId,
                            subDisciplineId
                        }
                    });
                }

                for (const row of playersData) {
                    const player = await tx.player.upsert({
                        where: { dni: row.dni },
                        update: {
                            firstName: row.firstName,
                            lastName: row.lastName,
                            gender: row.gender,
                            isParent: row.isParent,
                        },
                        create: {
                            dni: row.dni,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            gender: row.gender,
                            isParent: row.isParent,
                        }
                    });

                    await tx.teamPlayer.upsert({
                        where: {
                            teamId_playerId: {
                                teamId: team.id,
                                playerId: player.id
                            }
                        },
                        update: {
                            isStarter: row.isStarter,
                            jerseyNumber: row.jerseyNumber || null,
                        },
                        create: {
                            teamId: team.id,
                            playerId: player.id,
                            isStarter: row.isStarter,
                            jerseyNumber: row.jerseyNumber || null,
                        }
                    });
                }
            }
        }, {
            maxWait: 15000,
            timeout: 30000
        });

        // ==========================================
        // 3. RESPUESTA AL FRONTEND
        // ==========================================
        if (duplicateWarnings.length > 0) {
            const uniqueWarnings = Array.from(new Set(duplicateWarnings));
            return NextResponse.json(
                { error: "Jugadores duplicados detectados", details: uniqueWarnings },
                { status: 400 }
            );
        }

        return NextResponse.json({ message: "Nóminas guardadas exitosamente" }, { status: 201 });
    } catch (error) {
        console.error("Error bulk inserting players:", error);
        return NextResponse.json({ error: "Error al guardar la nómina masiva" }, { status: 500 });
    }
}