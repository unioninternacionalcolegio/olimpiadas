import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const classroomId = searchParams.get("classroomId");

        const whereClause: any = {};
        if (classroomId) whereClause.classroomId = classroomId;

        const teams = await prisma.team.findMany({
            where: whereClause,
            include: {
                subDiscipline: {
                    include: {
                        discipline: true,
                    }
                },
                classroom: true,
                players: {
                    include: {
                        player: true,
                    },
                    orderBy: [
                        { isStarter: 'desc' },
                        { player: { lastName: 'asc' } }
                    ]
                }
            },
            orderBy: {
                subDiscipline: {
                    discipline: { name: 'asc' }
                }
            }
        });

        return NextResponse.json(teams);
    } catch (error) {
        console.error("Error fetching teams:", error);
        return NextResponse.json(
            { error: "Error al obtener los equipos y nóminas" },
            { status: 500 }
        );
    }
}