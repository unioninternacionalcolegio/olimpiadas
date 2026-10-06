import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { searchParams } = new URL(request.url);
        // Ahora filtramos por la nueva estructura
        const subDisciplineId = searchParams.get("subDisciplineId");
        const stageId = searchParams.get("stageId");

        const whereCondition: any = {};
        if (subDisciplineId) whereCondition.subDisciplineId = subDisciplineId;
        if (stageId) whereCondition.stageId = stageId;

        const rankings = await prisma.ranking.findMany({
            where: whereCondition,
            include: {
                classroom: {
                    include: { studentGroup: true, parentGroup: true }
                },
                subDiscipline: true,
                stage: true // Incluimos la etapa también
            },
            orderBy: [
                { points: "desc" } // Corregido: antes decía pointsAwarded
            ]
        });

        return NextResponse.json(rankings);
    } catch (error) {
        console.error("Error GET rankings:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "ASISTENTE"].includes(session.user.role)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Extraemos los campos del nuevo modelo
        const { subDisciplineId, stageId, classroomId, position, points, observation, goalsFor, goalsAgainst } = await request.json();

        if (!subDisciplineId || !stageId || !classroomId || points === undefined) {
            return NextResponse.json({ error: "Faltan campos obligatorios (subDiscipline, stage, classroom, points)" }, { status: 400 });
        }

        // Usamos upsert por la regla @@unique([stageId, classroomId])
        // Si el salón ya tiene ranking en esta etapa, lo actualiza. Si no, lo crea.
        const newRanking = await prisma.ranking.upsert({
            where: {
                stageId_classroomId: {
                    stageId,
                    classroomId
                }
            },
            update: {
                position: position ? Number(position) : null,
                points: Number(points),
                goalsFor: goalsFor ? Number(goalsFor) : 0,
                goalsAgainst: goalsAgainst ? Number(goalsAgainst) : 0,
                observation
            },
            create: {
                subDisciplineId,
                stageId,
                classroomId,
                position: position ? Number(position) : null,
                points: Number(points),
                goalsFor: goalsFor ? Number(goalsFor) : 0,
                goalsAgainst: goalsAgainst ? Number(goalsAgainst) : 0,
                observation
            },
            include: {
                classroom: { include: { studentGroup: true, parentGroup: true } },
                subDiscipline: true,
                stage: true
            }
        });

        return NextResponse.json({ message: "Resultado registrado con éxito", ranking: newRanking }, { status: 201 });
    } catch (error) {
        console.error("Error POST rankings:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}