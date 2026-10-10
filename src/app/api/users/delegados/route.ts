import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        let classroomId = searchParams.get("classroomId");

        // LÓGICA DE SEGURIDAD ESTRICTA: 
        // Si el usuario es DELEGADO o ASESOR, sobrescribimos su búsqueda 
        // para que SOLO pueda traer los de su propio salón asignado.
        if (["ASESOR", "DELEGADO"].includes(session.user.role)) {
            if (!session.user.classroomId) {
                return NextResponse.json({ error: "No tienes un salón asignado en el sistema." }, { status: 403 });
            }
            classroomId = session.user.classroomId; // Forzamos el ID de su salón
        }

        const whereClause: any = { role: "DELEGADO" };
        if (classroomId) {
            whereClause.classroomId = classroomId;
        }

        const delegados = await prisma.user.findMany({
            where: whereClause,
            include: { classroom: true },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(delegados);
    } catch (error) {
        console.error("Error obteniendo delegados:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}