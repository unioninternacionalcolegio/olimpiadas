"use client";

import { useState, useEffect } from "react";

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

export default function TodasLasNominasPage() {
    const [annotatedTeams, setAnnotatedTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);

    useEffect(() => {
        fetchRivalTeams();
    }, []);

    const fetchRivalTeams = async () => {
        try {
            const res = await fetch(`/api/teams/rivals`);
            if (!res.ok) throw new Error("Error al obtener nóminas");

            const fetchedTeams = await res.json();
            const newTeams = JSON.parse(JSON.stringify(fetchedTeams));

            // 1. Recolectar apellidos para la lógica de Padres
            const classroomSurnames = new Map<string, Set<string>>();
            newTeams.forEach((team: any) => {
                if (!classroomSurnames.has(team.classroomId)) {
                    classroomSurnames.set(team.classroomId, new Set());
                }
                team.players.forEach((tp: any) => {
                    if (!tp.player.isParent) {
                        const parts = tp.player.lastName.trim().split(/\s+/);
                        parts.forEach((part: string) => classroomSurnames.get(team.classroomId)?.add(normalizeString(part)));
                    }
                });
            });

            // 2. Mapeos Frontend seguros (Evitan crasheos de API)
            const subDiscDniMap = new Map<string, string[]>();
            const dniClassroomMap = new Map<string, string[]>();

            newTeams.forEach((team: any) => {
                team.players.forEach((tp: any) => {
                    const dni = tp.player.dni;

                    // Mapa de subdisciplina
                    const subKey = `${team.subDisciplineId}_${dni}`;
                    const teamDesc = `${team.classroom.name} (Eq. ${team.letter})`;
                    if (!subDiscDniMap.has(subKey)) subDiscDniMap.set(subKey, []);
                    subDiscDniMap.get(subKey)?.push(teamDesc);

                    // Mapa de salones
                    const classroomName = team.classroom.name;
                    if (!dniClassroomMap.has(dni)) dniClassroomMap.set(dni, []);
                    if (!dniClassroomMap.get(dni)?.includes(classroomName)) {
                        dniClassroomMap.get(dni)?.push(classroomName);
                    }
                });
            });

            // 3. Evaluamos a cada jugador UNA SOLA VEZ
            newTeams.forEach((team: any) => {
                team.players.forEach((tp: any) => {
                    const player = tp.player;
                    const dni = player.dni;

                    // A) Lógica de Padres
                    if (player.isParent) {
                        const firstSurname = normalizeString(player.lastName.trim().split(/\s+/)[0]);
                        const surnamesInThisClass = classroomSurnames.get(team.classroomId);
                        tp.isAdoptive = surnamesInThisClass ? !surnamesInThisClass.has(firstSurname) : true;
                    }

                    // B) Lógica de Alertas Unificadas (Ámbar)
                    const warnings = new Set<string>();

                    const subKey = `${team.subDisciplineId}_${dni}`;
                    const sameSubTeams = subDiscDniMap.get(subKey) || [];
                    const currentTeamDesc = `${team.classroom.name} (Eq. ${team.letter})`;
                    const otherTeamsSameSub = sameSubTeams.filter(t => t !== currentTeamDesc);

                    const classroomsForDni = dniClassroomMap.get(dni) || [];
                    const otherClassrooms = classroomsForDni.filter(c => c !== team.classroom.name);

                    // Revisa si choca en su mismo salón
                    const otherEqSameClass = otherTeamsSameSub.filter(t => t.startsWith(team.classroom.name));
                    if (otherEqSameClass.length > 0) {
                        const letras = otherEqSameClass.map(t => t.split('(Eq. ')[1].replace(')', ''));
                        warnings.add(`MISMO SALÓN (Eq. ${letras.join(', ')})`);
                    }

                    // Revisa si choca con otros salones
                    if (otherClassrooms.length > 0) {
                        warnings.add(`(${otherClassrooms.join(', ')})`);
                    }

                    if (warnings.size > 0) {
                        tp.hasWarning = true;
                        tp.warningMsg = `R: ${Array.from(warnings).join(' | ')}`;
                    } else {
                        tp.hasWarning = false;
                    }
                });
            });

            setAnnotatedTeams(newTeams);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const groupedData = annotatedTeams.reduce((acc, team) => {
        const classroomName = team.classroom.name;
        const audience = team.subDiscipline.discipline.audience;
        const discName = team.subDiscipline.discipline.name;

        if (!acc[classroomName]) acc[classroomName] = {};
        if (!acc[classroomName][audience]) acc[classroomName][audience] = {};
        if (!acc[classroomName][audience][discName]) acc[classroomName][audience][discName] = [];

        acc[classroomName][audience][discName].push(team);
        return acc;
    }, {} as Record<string, Record<string, Record<string, any[]>>>);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* === VISTA PRINCIPAL (NO SE IMPRIME) === */}
            <div className="p-4 md:p-8 print:hidden max-w-[1600px] mx-auto">
                {/* ENCABEZADO ESTILO FIXTURE (Azul oscuro / Cyan) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 bg-[#0B1A28] p-6 rounded-3xl shadow-lg text-white border-b-4 border-[#00E5FF]">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Nóminas Globales del Torneo</h1>
                        <p className="text-gray-300 font-medium mt-1">Modo transparencia total: Revisa las nóminas de estudiantes y padres de todos los salones.</p>
                        <div className="mt-3 flex gap-2">
                            <span className="inline-block bg-white/10 text-[#00E5FF] px-4 py-1.5 rounded-full text-xs font-black border border-white/20 uppercase tracking-widest backdrop-blur-sm">
                                Visibilidad Global Activada
                            </span>
                        </div>
                    </div>

                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-[#00E5FF] font-black animate-pulse text-xl">Cargando la base de datos general...</div>
                ) : Object.keys(groupedData).length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-200">
                        <div className="text-6xl mb-4"></div>
                        <h3 className="text-xl font-black text-gray-800">Aún no hay nóminas en el sistema</h3>
                        <p className="text-gray-500 font-medium mt-2">Ningún salón ha registrado equipos todavía.</p>
                    </div>
                ) : (
                    /* DISEÑO DE TARJETAS TIPO MASONRY */
                    <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6 space-y-6">
                        {Object.entries(groupedData).map(([classroomName, audiencesObj]) => {
                            let totalTeams = 0;
                            Object.values(audiencesObj as Record<string, Record<string, any[]>>).forEach(disciplines => {
                                Object.values(disciplines).forEach(teams => {
                                    totalTeams += teams.length;
                                });
                            });

                            return (
                                <div
                                    key={classroomName}
                                    onClick={() => setSelectedClassroom(classroomName)}
                                    className="break-inside-avoid bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100 hover:border-[#00E5FF] hover:shadow-xl transition-all cursor-pointer flex flex-col items-center text-center group relative overflow-hidden"
                                >
                                    {/* Borde superior decorativo */}
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0B1A28] to-[#00E5FF]"></div>

                                    <h2 className="text-2xl font-black text-[#0B1A28] uppercase tracking-widest mt-4">{classroomName}</h2>

                                    <p className="text-xs font-bold text-[#0B1A28] mt-3 bg-[#E6FCFF] px-4 py-1.5 rounded-full border border-[#00E5FF]/30">
                                        {totalTeams} {totalTeams === 1 ? 'Equipo' : 'Equipos'} inscritos
                                    </p>

                                    <button className="mt-6 bg-[#0B1A28] text-white font-bold py-2.5 px-6 rounded-xl text-xs tracking-widest uppercase group-hover:bg-[#00E5FF] group-hover:text-[#0B1A28] transition-colors w-full shadow-md">
                                        Ver Nóminas
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* === MODAL DE NÓMINA (Diseño oscuro/cyan) === */}
            {selectedClassroom && (
                <div className="fixed inset-0 bg-[#0B1A28]/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 print:hidden">
                    <div className="bg-gray-100 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-[#00E5FF]">

                        {/* Header del Modal */}
                        <div className="bg-[#0B1A28] p-5 flex justify-between items-center shrink-0 border-b-4 border-[#00E5FF]">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">{selectedClassroom}</h2>
                                    <p className="text-[#00E5FF] font-bold text-sm tracking-widest mt-1">VISOR DE NÓMINAS OFICIALES</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClassroom(null)} className="bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-8">
                            {(Object.entries(groupedData[selectedClassroom] as Record<string, Record<string, any[]>>)).map(([audience, disciplinesObj]) => (
                                <div key={audience} className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                                    <h3 className="text-sm font-black text-center bg-[#0B1A28] text-white py-2 uppercase tracking-widest">
                                        CATEGORÍA: {audience}
                                    </h3>

                                    <div className="p-4 space-y-6">
                                        {(Object.entries(disciplinesObj as Record<string, any[]>)).map(([discName, teamsArr]) => (
                                            <div key={discName}>
                                                <h4 className="text-sm font-black uppercase text-[#0B1A28] border-l-4 border-[#00E5FF] pl-3 mb-3 bg-[#E6FCFF] py-1.5">
                                                    {discName}
                                                </h4>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {teamsArr.map((team: any) => (
                                                        <div key={team.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                                                <h5 className="font-black text-gray-800 uppercase text-xs">
                                                                    {team.subDiscipline.name} - Eq. {team.letter}
                                                                </h5>
                                                                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full text-[#0B1A28] border border-gray-300">
                                                                    {team.players.length} jug.
                                                                </span>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left whitespace-nowrap">
                                                                    <thead className="bg-white text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100">
                                                                        <tr>
                                                                            <th className="p-2 text-center w-8">Nº</th>
                                                                            <th className="p-2">Jugador</th>
                                                                            <th className="p-2 text-center w-12">Condición</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-50">
                                                                        {team.players.map((tp: any, idx: number) => (
                                                                            <tr key={tp.id} className={`${tp.hasWarning ? 'bg-amber-50/60' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                                                                                <td className="p-2 font-bold text-gray-400 text-center text-xs">{idx + 1}</td>
                                                                                <td className="p-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="font-black text-[#0B1A28] text-xs uppercase">
                                                                                            {tp.player.lastName}, {tp.player.firstName}
                                                                                        </div>
                                                                                        <div className="font-mono text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                                                                                            ****{tp.player.dni.slice(-4)}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* ETIQUETA DE PADRES */}
                                                                                    {tp.player.isParent && (
                                                                                        <div className={`text-[8px] px-1.5 py-0.5 rounded mt-1 inline-block font-black tracking-widest ${tp.isAdoptive ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-[#E6FCFF] text-[#0B1A28] border border-[#00E5FF]/40'}`}>
                                                                                            {tp.isAdoptive ? 'PADRE' : 'PADRE'}
                                                                                        </div>
                                                                                    )}

                                                                                    {/* ALERTA UNIFICADA ÁMBAR (1 SOLA VEZ) */}
                                                                                    {tp.hasWarning && (
                                                                                        <div className="text-[9px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded mt-1 inline-block whitespace-normal leading-tight shadow-sm">
                                                                                            {tp.warningMsg}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-2 text-center">
                                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest border block w-fit mx-auto ${tp.isStarter ? 'bg-[#0B1A28] text-[#00E5FF] border-[#0B1A28]' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                                                                        {tp.isStarter ? 'TITULAR' : 'SUPL'}
                                                                                    </span>
                                                                                    {tp.jerseyNumber && (
                                                                                        <div className="text-[10px] font-black text-gray-600 mt-1">
                                                                                            👕 {tp.jerseyNumber}
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {team.players.length === 0 && (
                                                                            <tr>
                                                                                <td colSpan={3} className="p-4 text-center text-gray-400 font-bold italic text-xs">Nómina vacía</td>
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
                    </div>
                </div>
            )}

            {/* === VISTA EXCLUSIVA PARA IMPRESIÓN (MANTENIDA B/N PARA PAPEL) === */}
            <div className="hidden print:block bg-white text-black w-full text-xs">
                <div className="text-center mb-6 border-b-4 border-black pb-2">
                    <h1 className="text-2xl font-black uppercase mb-1 text-black">Reporte Global de Nóminas Visibles</h1>
                    <p className="text-[11px] font-bold mt-1 text-black">Colegio Unión Internacional - Campeonato Deportivo 2026</p>
                </div>

                {annotatedTeams.length > 0 && (
                    <div className="space-y-6">
                        {Object.entries(groupedData).map(([classroomName, audiencesObj]) => (
                            <div key={classroomName} className="mb-6 break-inside-avoid">
                                <h2 className="text-xl font-black bg-gray-300 border-t-2 border-b-2 border-black py-1 px-4 mb-3 uppercase tracking-widest text-black">
                                    AULA: {classroomName}
                                </h2>

                                {(Object.entries(audiencesObj as Record<string, Record<string, any[]>>)).map(([audience, disciplinesObj]) => (
                                    <div key={audience} className="pl-2 mb-4">
                                        <h3 className="text-sm font-black uppercase underline mb-2 text-black">
                                            Categoría: {audience}
                                        </h3>

                                        {(Object.entries(disciplinesObj as Record<string, any[]>)).map(([discName, teamsArr]) => (
                                            <div key={discName} className="pl-4 mb-3">
                                                <h4 className="text-[11px] font-black uppercase text-black mb-1">▶ {discName}</h4>

                                                <div className="space-y-2">
                                                    {teamsArr.map((team: any) => (
                                                        <div key={team.id} className="pl-2 break-inside-avoid mb-2">
                                                            <h5 className="text-[10px] font-bold text-black mb-1">
                                                                {team.subDiscipline.name} - Equipo {team.letter}
                                                            </h5>
                                                            {team.players.length > 0 && (
                                                                <table className="w-full text-[9px] border-collapse border border-black mb-1">
                                                                    <thead>
                                                                        <tr className="bg-gray-200">
                                                                            <th className="border border-black py-1 px-1 text-center w-6 font-black text-black">Nº</th>
                                                                            <th className="border border-black py-1 px-1 text-center w-12 font-black text-black">DNI</th>
                                                                            <th className="border border-black py-1 px-2 text-left font-black text-black">Apellidos y Nombres</th>
                                                                            <th className="border border-black py-1 px-1 text-center w-6 font-black text-black">Gen</th>
                                                                            <th className="border border-black py-1 px-1 text-center w-8 font-black text-black">Dorsal</th>
                                                                            <th className="border border-black py-1 px-1 text-center w-12 font-black text-black">Condición</th>
                                                                            <th className="border border-black py-1 px-2 text-center w-16 font-black text-black">Firma</th>
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
                                                                                    {tp.hasWarning ? " [!]" : ""}
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}