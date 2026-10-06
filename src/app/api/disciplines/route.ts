import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const disciplines = await prisma.discipline.findMany({
      include: {
        subDisciplines: {
          include: {
            stages: {
              orderBy: { stageOrder: 'asc' }
            }
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(disciplines);
  } catch (error) {
    console.error("Error fetching disciplines:", error);
    return NextResponse.json(
      { error: "Error al obtener las disciplinas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, audience, format, rankingScope, subDisciplines } = body;

    if (!name || !audience || !format || !rankingScope) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios de la disciplina" },
        { status: 400 }
      );
    }

    const newDiscipline = await prisma.discipline.create({
      data: {
        name,
        audience,
        format,
        rankingScope,
        subDisciplines: {
          create: subDisciplines.map((sub: any) => ({
            name: sub.name,
            maxStarters: Number(sub.maxStarters),
            maxSubs: Number(sub.maxSubs),
            sumsToGeneralRanking: Boolean(sub.sumsToGeneralRanking),
            stages: {
              create: sub.stages.map((stage: any, index: number) => ({
                name: stage.name,
                stageOrder: Number(stage.stageOrder) || (index + 1),
                stageType: stage.stageType,
                pointsForWin: Number(stage.pointsForWin),
                pointsForTie: Number(stage.pointsForTie),
                pointsForLoss: Number(stage.pointsForLoss),
              }))
            }
          })),
        },
      },
      include: {
        subDisciplines: {
          include: { stages: true }
        },
      },
    });

    return NextResponse.json(newDiscipline, { status: 201 });
  } catch (error) {
    console.error("Error creating discipline:", error);
    return NextResponse.json(
      { error: "Error al crear la disciplina" },
      { status: 500 }
    );
  }
}