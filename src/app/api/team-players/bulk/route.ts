import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // AHORA RECIBE teamsData EN LUGAR DE subDisciplineId Y playersData SUELTOS
        const { classroomId, teamLetter, teamsData } = body;

        if (!classroomId || !teamLetter || !teamsData || !Array.isArray(teamsData)) {
            return NextResponse.json({ error: "Faltan datos obligatorios o formato incorrecto" }, { status: 400 });
        }

        const duplicateErrors: string[] = [];
        const allInputDnis = new Set<string>(); // Para verificar que no repitan DNI en distintas hojas del mismo Excel

        // ==========================================
        // 1. FASE DE VALIDACIÓN (Tu lógica original)
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

            // Buscar en qué otros equipos de esta misma disciplina ya hay jugadores inscritos
            const otherTeamsInDiscipline = await prisma.team.findMany({
                where: {
                    classroomId: classroomId,
                    subDiscipline: {
                        disciplineId: targetSubDiscipline.disciplineId
                    },
                    NOT: {
                        subDisciplineId: subDisciplineId,
                        letter: teamLetter
                    }
                },
                include: {
                    subDiscipline: true,
                    players: { include: { player: true } }
                }
            });

            for (const inputPlayer of playersData) {
                // A) Validar contra la BD si ya existe en otro equipo
                for (const otherTeam of otherTeamsInDiscipline) {
                    if (otherTeam.players.some(p => p.player.dni === inputPlayer.dni)) {
                        duplicateErrors.push(
                            `El jugador ${inputPlayer.firstName} (${inputPlayer.dni}) ya está en el Equipo ${otherTeam.letter} de ${otherTeam.subDiscipline.name}.`
                        );
                    }
                }

                // B) Validar si hay DNIs repetidos dentro de todo el Excel que enviaron
                if (allInputDnis.has(inputPlayer.dni)) {
                    duplicateErrors.push(`El DNI ${inputPlayer.dni} (${inputPlayer.firstName}) está repetido dentro del archivo enviado.`);
                } else {
                    allInputDnis.add(inputPlayer.dni);
                }
            }
        }

        if (duplicateErrors.length > 0) {
            // Filtramos los errores para que no salgan duplicados en el alert del frontend
            const uniqueErrors = Array.from(new Set(duplicateErrors));
            return NextResponse.json({ error: "Jugadores duplicados detectados", details: uniqueErrors }, { status: 400 });
        }

        // ==========================================
        // 2. FASE DE GUARDADO (Tu transacción original)
        // ==========================================
        await prisma.$transaction(async (tx) => {
            for (const teamItem of teamsData) {
                const { subDisciplineId, playersData } = teamItem;

                // Buscar o crear el equipo actual con su Letra
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

                // Vaciamos el equipo antes de volver a llenarlo (fiel a tu código)
                await tx.teamPlayer.deleteMany({
                    where: { teamId: team.id }
                });

                // Insertamos los jugadores
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

                    await tx.teamPlayer.create({
                        data: {
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

        return NextResponse.json({ message: "Nóminas guardadas exitosamente" }, { status: 201 });
    } catch (error) {
        console.error("Error bulk inserting players:", error);
        return NextResponse.json({ error: "Error al guardar la nómina masiva" }, { status: 500 });
    }
}