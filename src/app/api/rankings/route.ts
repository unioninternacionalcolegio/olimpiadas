import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const disciplineId = searchParams.get("disciplineId");

        const whereCondition: any = {};
        if (disciplineId) whereCondition.disciplineId = disciplineId;

        const rankings = await prisma.ranking.findMany({
            where: whereCondition,
            include: {
                classroom: {
                    include: { studentGroup: true, parentGroup: true }
                },
                discipline: true
            },
            orderBy: [
                { pointsAwarded: "desc" }
            ]
        });

        return NextResponse.json(rankings);
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "ASISTENTE"].includes(session.user.role)) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { disciplineId, classroomId, position, pointsAwarded, observation } = await request.json();

        if (!disciplineId || !classroomId || pointsAwarded === undefined) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const newRanking = await prisma.ranking.create({
            data: {
                disciplineId,
                classroomId,
                position: position ? Number(position) : null,
                pointsAwarded: Number(pointsAwarded),
                observation
            },
            include: {
                classroom: { include: { studentGroup: true, parentGroup: true } }
            }
        });

        return NextResponse.json({ message: "Resultado registrado con éxito", ranking: newRanking }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}