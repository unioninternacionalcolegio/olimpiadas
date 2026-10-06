import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, audience, format, rankingScope, subDisciplines } = body;

        // 1. Actualizamos datos principales de la disciplina
        await prisma.discipline.update({
            where: { id },
            data: { name, audience, format, rankingScope },
        });

        // 2. Filtramos IDs de las subdisciplinas entrantes y borramos las que el usuario eliminó
        const incomingSubIds = subDisciplines.map((s: any) => s.id).filter(Boolean);
        await prisma.subDiscipline.deleteMany({
            where: {
                disciplineId: id,
                id: { notIn: incomingSubIds },
            },
        });

        // 3. Upsert de Subdisciplinas y sus Etapas (Stages)
        for (const sub of subDisciplines) {
            if (sub.id) {
                // Actualizar Subdisciplina existente
                await prisma.subDiscipline.update({
                    where: { id: sub.id },
                    data: {
                        name: sub.name,
                        maxStarters: Number(sub.maxStarters),
                        maxSubs: Number(sub.maxSubs),
                        sumsToGeneralRanking: Boolean(sub.sumsToGeneralRanking),
                    },
                });

                // Manejar borrado de Etapas
                const incomingStageIds = sub.stages.map((st: any) => st.id).filter(Boolean);
                await prisma.subDisciplineStage.deleteMany({
                    where: {
                        subDisciplineId: sub.id,
                        id: { notIn: incomingStageIds },
                    },
                });

                // Upsert de Etapas
                for (const [index, stage] of sub.stages.entries()) {
                    const stageData = {
                        name: stage.name,
                        stageOrder: Number(stage.stageOrder) || (index + 1),
                        stageType: stage.stageType,
                        pointsForWin: Number(stage.pointsForWin),
                        pointsForTie: Number(stage.pointsForTie),
                        pointsForLoss: Number(stage.pointsForLoss),
                    };

                    if (stage.id) {
                        await prisma.subDisciplineStage.update({
                            where: { id: stage.id },
                            data: stageData,
                        });
                    } else {
                        await prisma.subDisciplineStage.create({
                            data: { ...stageData, subDisciplineId: sub.id },
                        });
                    }
                }
            } else {
                // Crear Subdisciplina nueva con sus etapas
                await prisma.subDiscipline.create({
                    data: {
                        disciplineId: id,
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
                    },
                });
            }
        }

        const finalDiscipline = await prisma.discipline.findUnique({
            where: { id },
            include: {
                subDisciplines: {
                    include: { stages: { orderBy: { stageOrder: 'asc' } } }
                }
            },
        });

        return NextResponse.json(finalDiscipline);
    } catch (error) {
        console.error("Error updating discipline:", error);
        return NextResponse.json(
            { error: "Error al actualizar la configuración" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.discipline.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Disciplina eliminada correctamente" });
    } catch (error) {
        console.error("Error deleting discipline:", error);
        return NextResponse.json(
            { error: "Error al eliminar la disciplina" },
            { status: 500 }
        );
    }
}