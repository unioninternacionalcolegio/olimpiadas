import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Si no hay sesión activa, expulsarlo al login
    if (!session) {
        redirect("/login");
    }

    const { role, name, username } = session.user;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido, {name}</h1>
                <p className="text-gray-600 mb-6">Usuario: {username} | Rol: <span className="font-semibold text-blue-600">{role}</span></p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VISTAS PARA EL ADMIN */}
                    {role === "ADMIN" && (
                        <>
                            <Link href="/dashboard/admin/configuracion" className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                                <h2 className="text-xl font-bold text-blue-800">Configuración General</h2>
                                <p className="text-blue-600 mt-2">Crea aulas, disciplinas, usuarios y gestiona puntajes.</p>
                            </Link>
                            <Link href="/dashboard/admin/pagos" className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition">
                                <h2 className="text-xl font-bold text-green-800">Control de Pagos</h2>
                                <p className="text-green-600 mt-2">Verifica inscripciones económicas de cada salón.</p>
                            </Link>
                        </>
                    )}

                    {/* VISTAS PARA EL ASISTENTE (Y ADMIN TAMBIÉN PUEDE VERLO) */}
                    {(role === "ADMIN" || role === "ASISTENTE") && (
                        <>
                            <Link href="/dashboard/asistente/nominaciones" className="block p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition">
                                <h2 className="text-xl font-bold text-purple-800">Nóminas (Inscripciones)</h2>
                                <p className="text-purple-600 mt-2">Sube las listas de estudiantes por disciplinas.</p>
                            </Link>
                            <Link href="/dashboard/asistente/control-partidos" className="block p-6 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                                <h2 className="text-xl font-bold text-red-800">Control de Partidos en Vivo</h2>
                                <p className="text-red-600 mt-2">Registra goles, puntos, observaciones y walkovers.</p>
                            </Link>
                        </>
                    )}

                    {/* VISTAS PARA DELEGADOS / ASESORES */}
                    {(role === "ASESOR" || role === "DELEGADO") && (
                        <>
                            <Link href="/dashboard/aulas/mis-partidos" className="block p-6 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                                <h2 className="text-xl font-bold text-orange-800">Mis Partidos</h2>
                                <p className="text-orange-600 mt-2">Visualiza con quién y cuándo le toca jugar a tu salón.</p>
                            </Link>
                            <Link href="/dashboard/aulas/mis-nominas" className="block p-6 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition">
                                <h2 className="text-xl font-bold text-teal-800">Mi Nómina</h2>
                                <p className="text-teal-600 mt-2">Revisa a los titulares y suplentes de tus equipos.</p>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}