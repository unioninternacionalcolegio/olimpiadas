import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// 1. Definimos las opciones de menú fuera del componente para mantener el código limpio
const adminMenu = [
    {
        href: "/dashboard/admin/configuracion",
        title: "Configuración General",
        description: "Crea aulas, disciplinas, usuarios y gestiona puntajes.",
        classes: { card: "bg-blue-50 border-blue-200 hover:bg-blue-100", title: "text-blue-800", text: "text-blue-600" }
    },
    {
        href: "/dashboard/admin/pagos",
        title: "Control de Pagos",
        description: "Verifica inscripciones económicas de cada salón.",
        classes: { card: "bg-green-50 border-green-200 hover:bg-green-100", title: "text-green-800", text: "text-green-600" }
    }
];

const asistenteMenu = [
    {
        href: "/dashboard/asistente/nominaciones",
        title: "Nóminas (Inscripciones)",
        description: "Sube las listas de estudiantes por disciplinas.",
        classes: { card: "bg-purple-50 border-purple-200 hover:bg-purple-100", title: "text-purple-800", text: "text-purple-600" }
    },
    {
        href: "/dashboard/asistente/control-partidos",
        title: "Control de Partidos en Vivo",
        description: "Registra goles, puntos, observaciones y walkovers.",
        classes: { card: "bg-red-50 border-red-200 hover:bg-red-100", title: "text-red-800", text: "text-red-600" }
    }
];

const aulasMenu = [
    {
        href: "/dashboard/aulas/mis-partidos",
        title: "Mis Partidos",
        description: "Visualiza con quién y cuándo le toca jugar a tu salón.",
        classes: { card: "bg-orange-50 border-orange-200 hover:bg-orange-100", title: "text-orange-800", text: "text-orange-600" }
    },
    {
        href: "/dashboard/aulas/mis-nominas",
        title: "Mi Nómina",
        description: "Revisa a los titulares y suplentes de tus equipos.",
        classes: { card: "bg-teal-50 border-teal-200 hover:bg-teal-100", title: "text-teal-800", text: "text-teal-600" }
    },
    {
        href: "/dashboard/aulas/nominas",
        title: "Participantes",
        description: "Total de participantes del Día de la Familia.",
        classes: { card: "bg-rose-50 border-rose-200 hover:bg-rose-100", title: "text-rose-800", text: "text-rose-600" }
    },
    {
        href: "/dashboard/aulas/delegados",
        title: "Delegados",
        description: "Lista de delegados e impresión de credenciales.",
        classes: { card: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100", title: "text-indigo-800", text: "text-indigo-600" }
    },
    {
        href: "/dashboard/aulas/resultados",
        title: "Resultados",
        description: "Tabla general de resultados de los encuentros.",
        classes: { card: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", title: "text-emerald-800", text: "text-emerald-600" }
    }
];

// 2. Definimos la estructura de datos (TypeScript) para el subcomponente
interface MenuCardProps {
    href: string;
    title: string;
    description: string;
    classes: {
        card: string;
        title: string;
        text: string;
    };
}

// 3. Subcomponente reutilizable con sus tipos ya definidos
const MenuCard = ({ href, title, description, classes }: MenuCardProps) => (
    <Link href={href} className={`block p-6 border rounded-lg transition-colors duration-200 ${classes.card}`}>
        <h2 className={`text-xl font-bold ${classes.title}`}>{title}</h2>
        <p className={`mt-2 text-sm md:text-base ${classes.text}`}>{description}</p>
    </Link>
);

// 4. Página principal (Dashboard)
export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Si no hay sesión activa, expulsarlo al login
    if (!session) {
        redirect("/login");
    }

    const { role, name, username } = session.user;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido, {name}</h1>
                <p className="text-gray-600 mb-6">
                    Usuario: {username} | Rol: <span className="font-semibold text-blue-600">{role}</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* VISTAS PARA EL ADMIN */}
                    {role === "ADMIN" && adminMenu.map((item) => (
                        <MenuCard key={item.href} {...item} />
                    ))}

                    {/* VISTAS PARA EL ASISTENTE (Y ADMIN TAMBIÉN PUEDE VERLO) */}
                    {(role === "ADMIN" || role === "ASISTENTE") && asistenteMenu.map((item) => (
                        <MenuCard key={item.href} {...item} />
                    ))}

                    {/* VISTAS PARA DELEGADOS / ASESORES */}
                    {(role === "ASESOR" || role === "DELEGADO") && aulasMenu.map((item) => (
                        <MenuCard key={item.href} {...item} />
                    ))}
                </div>
            </div>
        </div>
    );
}