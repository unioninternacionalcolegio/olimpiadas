import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function ConfiguracionGeneralPage() {
    // 1. Verificación de sesión y permisos
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    // 2. Obtener estadísticas rápidas directamente desde Prisma
    const [totalUsers, totalGroups, totalClassrooms, totalDisciplines] = await Promise.all([
        prisma.user.count(),
        prisma.group.count(),
        prisma.classroom.count(),
        prisma.discipline.count(),
    ]);

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Panel de Configuración</h1>
                <p className="text-gray-600 mt-1">
                    Gestiona la estructura base del campeonato. Selecciona un módulo para empezar.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* MÓDULO DE USUARIOS */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-blue-600 p-4">
                        <h2 className="text-xl font-bold text-white">Usuarios y Roles</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <p className="text-gray-600 mb-4">
                            Crea y administra los accesos para administradores, asistentes de mesa, asesores y delegados.
                        </p>
                        <div className="mt-auto">
                            <div className="flex items-center justify-between mb-4 bg-blue-50 p-3 rounded">
                                <span className="text-blue-800 font-semibold">Usuarios registrados:</span>
                                <span className="text-2xl font-bold text-blue-600">{totalUsers}</span>
                            </div>
                            <Link
                                href="/dashboard/admin/configuracion/usuarios"
                                className="block text-center w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition"
                            >
                                Gestionar Usuarios
                            </Link>
                        </div>
                    </div>
                </div>

                {/* MÓDULO DE AULAS Y GRUPOS */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-green-600 p-4">
                        <h2 className="text-xl font-bold text-white">Grupos y Aulas</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <p className="text-gray-600 mb-4">
                            Configura los grupos de estudiantes y padres, y asigna los salones (aulas) a cada grupo correspondiente.
                        </p>
                        <div className="mt-auto">
                            <div className="flex flex-col gap-2 mb-4 bg-green-50 p-3 rounded">
                                <div className="flex items-center justify-between">
                                    <span className="text-green-800 font-semibold">Grupos:</span>
                                    <span className="text-xl font-bold text-green-600">{totalGroups}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-green-200 pt-2">
                                    <span className="text-green-800 font-semibold">Aulas:</span>
                                    <span className="text-xl font-bold text-green-600">{totalClassrooms}</span>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/admin/configuracion/aulas"
                                className="block text-center w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition"
                            >
                                Gestionar Aulas
                            </Link>
                        </div>
                    </div>
                </div>

                {/* MÓDULO DE DISCIPLINAS */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-purple-600 p-4">
                        <h2 className="text-xl font-bold text-white">Disciplinas</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <p className="text-gray-600 mb-4">
                            Crea los deportes, establece el sistema de puntuación, el límite de jugadores y la modalidad de juego.
                        </p>
                        <div className="mt-auto">
                            <div className="flex items-center justify-between mb-4 bg-purple-50 p-3 rounded">
                                <span className="text-purple-800 font-semibold">Deportes/Eventos:</span>
                                <span className="text-2xl font-bold text-purple-600">{totalDisciplines}</span>
                            </div>
                            <Link
                                href="/dashboard/admin/configuracion/disciplines"
                                className="block text-center w-full bg-purple-600 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 transition"
                            >
                                Gestionar Disciplinas
                            </Link>
                        </div>
                    </div>
                </div>

            </div>

            {/* SECCIÓN DE ACCIONES RÁPIDAS (Próximos módulos) */}
            <div className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Otros Módulos del Sistema</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/dashboard" className="flex items-center justify-center p-4 bg-white border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-700">
                        Volver al Inicio
                    </Link>
                    <Link href="/dashboard/admin/pagos" className="flex items-center justify-center p-4 bg-white border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-700">
                        Control de Pagos
                    </Link>
                    <Link href="/dashboard/asistente/nominaciones" className="flex items-center justify-center p-4 bg-white border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-700">
                        Ver Nóminas
                    </Link>
                    <Link href="/dashboard/asistente/control-partidos" className="flex items-center justify-center p-4 bg-white border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-700">
                        Control de Partidos
                    </Link>
                </div>
            </div>
        </div>
    );
}