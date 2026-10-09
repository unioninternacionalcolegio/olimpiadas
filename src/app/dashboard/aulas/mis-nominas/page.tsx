"use client";

import { useState, useEffect } from "react";

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

export default function MisNominasDelegadoPage() {
    const [annotatedSavedTeams, setAnnotatedSavedTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [classroomName, setClassroomName] = useState<string>("Mi Salón");

    useEffect(() => {
        fetchMyTeams();
    }, []);

    const fetchMyTeams = async () => {
        try {
            // 1. Obtener la sesión para saber de qué salón es este delegado
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();

            if (!session?.user?.classroomId) {
                console.error("El usuario no tiene un salón asignado.");
                setIsLoading(false);
                return;
            }

            const currentClassroomId = session.user.classroomId;

            // 2. Traer los equipos solo de su salón
            const res = await fetch(`/api/teams?classroomId=${currentClassroomId}`);
            if (!res.ok) throw new Error("Error al obtener nóminas");

            const savedTeams = await res.json();

            if (savedTeams.length > 0) {
                setClassroomName(savedTeams[0].classroom.name);
            }

            // 3. Aplicar toda la Lógica Inteligente (Igual que el Asistente)
            const newTeams = JSON.parse(JSON.stringify(savedTeams));

            const studentSurnames = new Set<string>();
            newTeams.forEach((team: any) => {
                team.players.forEach((tp: any) => {
                    if (!tp.player.isParent) {
                        const parts = tp.player.lastName.trim().split(/\s+/);
                        parts.forEach((part: string) => studentSurnames.add(normalizeString(part)));
                    }
                });
            });

            const subDisciplineMap = new Map();
            newTeams.forEach((team: any) => {
                const subId = team.subDisciplineId;
                if (!subDisciplineMap.has(subId)) subDisciplineMap.set(subId, []);
                subDisciplineMap.get(subId).push(team);
            });

            subDisciplineMap.forEach((teamsInSubDisc: any[]) => {
                const dniToTeams = new Map<string, string[]>();

                teamsInSubDisc.forEach((team) => {
                    team.players.forEach((p: any) => {
                        const dni = p.player.dni;
                        const teamName = `Equipo ${team.letter}`;
                        if (!dniToTeams.has(dni)) dniToTeams.set(dni, []);
                        dniToTeams.get(dni)?.push(teamName);
                    });
                });

                teamsInSubDisc.forEach((team) => {
                    team.players.forEach((tp: any) => {
                        const player = tp.player;
                        const dni = player.dni;

                        // A) Duplicados en misma Subdisciplina
                        const teamsWithDni = dniToTeams.get(dni);
                        if (teamsWithDni && teamsWithDni.length > 1) {
                            tp.isDuplicated = true;
                            const otherTeams = teamsWithDni.filter((t: string) => t !== `Equipo ${team.letter}`);
                            if (otherTeams.length > 0) {
                                tp.duplicateMsg = `También en ${otherTeams.join(', ')}`;
                            } else {
                                tp.duplicateMsg = `DNI repetido en este equipo`;
                            }
                        } else {
                            tp.isDuplicated = false;
                        }

                        // B) Inteligencia de Padres
                        if (player.isParent) {
                            const firstSurname = normalizeString(player.lastName.trim().split(/\s+/)[0]);
                            tp.isAdoptive = !studentSurnames.has(firstSurname);
                        }

                        // C) Inteligencia de Otros Salones
                        const otherClassrooms = new Set<string>();
                        if (player.teams && player.teams.length > 0) {
                            player.teams.forEach((tJoin: any) => {
                                if (tJoin.team.classroomId !== currentClassroomId) {
                                    otherClassrooms.add(tJoin.team.classroom.name);
                                }
                            });
                        }
                        tp.otherClassrooms = Array.from(otherClassrooms);
                    });
                });
            });

            setAnnotatedSavedTeams(newTeams);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Agrupar para la vista y la impresión
    const groupedForPrint = annotatedSavedTeams.reduce((acc, team) => {
        const audience = team.subDiscipline.discipline.audience;
        const discName = team.subDiscipline.discipline.name;

        if (!acc[audience]) acc[audience] = {};
        if (!acc[audience][discName]) acc[audience][discName] = [];

        acc[audience][discName].push(team);
        return acc;
    }, {} as Record<string, Record<string, any[]>>);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">

            {/* === VISTA EN PANTALLA (NO SE IMPRIME) === */}
            <div className="p-4 md:p-8 print:hidden max-w-7xl mx-auto">
                {/* ENCABEZADO TEAL */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-teal-800 p-6 rounded-3xl shadow-lg text-white">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Mis Nóminas Oficiales</h1>
                        <p className="text-teal-100 font-medium mt-1">Revisa a los titulares y suplentes de los equipos de tu salón.</p>
                        <div className="mt-3 inline-block bg-teal-900/50 px-4 py-1 rounded-full text-sm font-bold border border-teal-600">
                            Aula: {classroomName}
                        </div>
                    </div>
                </div>


                {/* CONTENIDO PRINCIPAL */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-teal-50 border-b border-teal-100 p-4">
                        <h3 className="font-black text-teal-900 text-lg">Equipos Registrados</h3>
                    </div>

                    <div className="p-4 md:p-6 space-y-8">
                        {isLoading ? (
                            <div className="text-center py-20 text-teal-600 font-black animate-pulse text-xl">Cargando nóminas...</div>
                        ) : annotatedSavedTeams.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">📋</div>
                                <h3 className="text-xl font-black text-gray-800">Aún no hay equipos</h3>
                                <p className="text-gray-500 font-medium mt-2">La comisión organizadora o el asistente aún no han subido las nóminas de tu salón.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {(Object.entries(groupedForPrint) as [string, Record<string, any[]>][]).map(([audience, disciplinesObj]) => (
                                    <div key={audience} className="border-4 border-gray-100 rounded-2xl overflow-hidden">
                                        <h2 className="text-xl font-black text-center bg-gray-100 text-gray-800 py-3 uppercase tracking-widest border-b-4 border-white">
                                            CATEGORÍA: {audience}
                                        </h2>

                                        <div className="p-4 md:p-6 space-y-8">
                                            {(Object.entries(disciplinesObj) as [string, any[]][]).map(([discName, teamsArr]) => (
                                                <div key={discName}>
                                                    <h3 className="text-lg font-black uppercase text-teal-800 border-l-4 border-teal-500 pl-3 mb-4">
                                                        {discName}
                                                    </h3>
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                        {teamsArr.map((team: any) => (
                                                            <div key={team.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="bg-teal-50 px-4 py-3 border-b border-teal-100">
                                                                    <h4 className="font-black text-teal-900 uppercase">
                                                                        {team.subDiscipline.name} - Equipo {team.letter}
                                                                    </h4>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-wider border-b border-gray-200">
                                                                            <tr>
                                                                                <th className="p-3 text-center">Nº</th>
                                                                                <th className="p-3">DNI / Jugador</th>
                                                                                <th className="p-3 text-center">Gen</th>
                                                                                <th className="p-3 text-center">Condición</th>
                                                                                <th className="p-3 text-center">Camiseta</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {team.players.map((tp: any, idx: number) => (
                                                                                <tr key={tp.id} className={`${tp.isDuplicated ? 'bg-orange-50' : 'hover:bg-gray-50'} transition-colors`}>
                                                                                    <td className="p-3 font-bold text-gray-400 text-center">{idx + 1}</td>
                                                                                    <td className="p-3">
                                                                                        <div className="font-mono text-xs text-gray-500 font-bold">****{tp.player.dni.slice(-4)}</div>
                                                                                        <div className="font-black text-gray-900 text-sm">{tp.player.lastName}, {tp.player.firstName}</div>

                                                                                        {/* ETIQUETA PADRE/ADOPTIVO */}
                                                                                        {tp.player.isParent && (
                                                                                            <div className={`text-[9px] px-2 py-0.5 rounded mt-1 inline-block font-black tracking-widest ${tp.isAdoptive ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                                                                                {tp.isAdoptive ? 'PADRE' : 'PADRE'}
                                                                                            </div>
                                                                                        )}

                                                                                        {/* ADVERTENCIA DUPLICADO MISMA CATEGORÍA */}
                                                                                        {tp.isDuplicated && (
                                                                                            <div className="text-[9px] font-black text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded mt-1 inline-block whitespace-normal">
                                                                                                🚨 {tp.duplicateMsg}
                                                                                            </div>
                                                                                        )}

                                                                                        {/* ADVERTENCIA OTROS SALONES */}
                                                                                        {tp.otherClassrooms && tp.otherClassrooms.length > 0 && (
                                                                                            <div className="text-[9px] font-black text-white bg-red-500 px-2 py-0.5 rounded mt-1 inline-block shadow-sm">
                                                                                                🚨 JUEGA TAMBIÉN EN: {tp.otherClassrooms.join(', ')}
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="p-3 text-center font-bold text-gray-500">{tp.player.gender}</td>
                                                                                    <td className="p-3 text-center">
                                                                                        <span className={`text-[9px] font-black px-2 py-1 rounded tracking-widest border ${tp.isStarter ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                                                                                            {tp.isStarter ? 'TITULAR' : 'SUPLENTE'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-3 text-center font-black text-teal-700 text-base">
                                                                                        {tp.jerseyNumber ? `👕 ${tp.jerseyNumber}` : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                            {team.players.length === 0 && (
                                                                                <tr>
                                                                                    <td colSpan={5} className="p-6 text-center text-gray-400 font-bold italic">Nómina vacía</td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === VISTA EXCLUSIVA PARA IMPRESIÓN (MUY COMPACTA Y EN BLANCO/NEGRO) === */}
            <div className="hidden print:block bg-white text-black w-full text-xs">
                <div className="text-center mb-4 border-b-4 border-black pb-2">
                    <h1 className="text-xl font-black uppercase mb-1 text-black">Nómina Oficial - {classroomName}</h1>
                    <p className="text-[10px] font-bold mt-1 text-black">Colegio Unión Internacional - Campeonato Deportivo 2026</p>
                </div>

                {annotatedSavedTeams.length > 0 && (
                    <div className="space-y-4">
                        {(Object.entries(groupedForPrint) as [string, Record<string, any[]>][]).map(([audience, disciplinesObj]) => (
                            <div key={audience} className="mb-4">
                                <h2 className="text-lg font-black text-center bg-gray-300 border-t-2 border-b-2 border-black py-1 mb-2 uppercase tracking-widest text-black break-after-avoid">
                                    CATEGORÍA: {audience}
                                </h2>

                                {(Object.entries(disciplinesObj) as [string, any[]][]).map(([discName, teamsArr]) => (
                                    <div key={discName} className="mb-3">
                                        <h3 className="text-sm font-black uppercase underline mb-1 ml-2 text-black break-after-avoid">
                                            {discName}
                                        </h3>
                                        <div className="space-y-3">
                                            {teamsArr.map((team: any) => (
                                                <div key={team.id} className="pl-4 break-inside-avoid mb-2">
                                                    <h4 className="text-[11px] font-black mb-1 text-black">
                                                        ▶ {team.subDiscipline.name} - Equipo {team.letter}
                                                    </h4>
                                                    {team.players.length > 0 && (
                                                        <table className="w-full text-[10px] border-collapse border border-black mb-1">
                                                            <thead>
                                                                <tr className="bg-gray-200">
                                                                    <th className="border border-black py-1 px-1 text-center w-6 font-black text-black">Nº</th>
                                                                    <th className="border border-black py-1 px-1 text-center w-14 font-black text-black">DNI</th>
                                                                    <th className="border border-black py-1 px-2 text-left font-black text-black">Apellidos y Nombres</th>
                                                                    <th className="border border-black py-1 px-1 text-center w-6 font-black text-black">Gen</th>
                                                                    <th className="border border-black py-1 px-1 text-center w-10 font-black text-black">Dorsal</th>
                                                                    <th className="border border-black py-1 px-1 text-center w-14 font-black text-black">Condición</th>
                                                                    <th className="border border-black py-1 px-2 text-center w-20 font-black text-black">Firma</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {team.players.map((tp: any, idx: number) => (
                                                                    <tr key={tp.id}>
                                                                        <td className="border border-black py-1 px-1 font-bold text-center text-black">{idx + 1}</td>
                                                                        <td className="border border-black py-1 px-1 text-center font-bold text-black">****{tp.player.dni.slice(-4)}</td>
                                                                        <td className="border border-black py-1 px-2 font-black text-black">
                                                                            {tp.player.lastName}, {tp.player.firstName}
                                                                            {tp.player.isParent ? (tp.isAdoptive ? " [P.Adoptivo/Unión]" : " [Padre]") : ""}
                                                                        </td>
                                                                        <td className="border border-black py-1 px-1 text-center font-bold text-black">{tp.player.gender}</td>
                                                                        <td className="border border-black py-1 px-1 text-center font-black text-black">
                                                                            {tp.jerseyNumber ? `👕 ${tp.jerseyNumber}` : "-"}
                                                                        </td>
                                                                        <td className="border border-black py-1 px-1 text-center font-bold text-black">
                                                                            {tp.isStarter ? "Titular" : "Suplente"}
                                                                        </td>
                                                                        <td className="border border-black py-1 px-2"></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}