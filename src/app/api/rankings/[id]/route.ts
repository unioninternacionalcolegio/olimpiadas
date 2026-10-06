import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Extraemos los campos correctos del nuevo esquema
        const { points, position, observation, goalsFor, goalsAgainst } = body;

        const updatedRanking = await prisma.ranking.update({
            where: { id },
            data: {
                points: points !== undefined ? Number(points) : undefined,
                position: position !== undefined ? Number(position) : null,
                observation: observation !== undefined ? observation : undefined,
                goalsFor: goalsFor !== undefined ? Number(goalsFor) : undefined,
                goalsAgainst: goalsAgainst !== undefined ? Number(goalsAgainst) : undefined,
            },
        });

        return NextResponse.json(updatedRanking);
    } catch (error) {
        console.error("Error updating ranking:", error);
        return NextResponse.json(
            { error: "Error al actualizar el ranking" },
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

        await prisma.ranking.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Ranking eliminado correctamente" });
    } catch (error) {
        console.error("Error deleting ranking:", error);
        return NextResponse.json(
            { error: "Error al eliminar el ranking" },
            { status: 500 }
        );
    }
}