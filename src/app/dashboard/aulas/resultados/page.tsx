"use client";

import { useState, useEffect } from "react";

// ==========================================
// 1. TIPOS Y DEFINICIONES
// ==========================================
type Match = {
    id: string; subDisciplineId: string; stageId: string; status: string;
    homeScore: number; awayScore: number; homeTablePts: number; awayTablePts: number;
    groupId: string | null; group?: { name: string };
    subDiscipline: { id: string; name: string; discipline: { id: string; name: string; format: string; audience: string }; };
    homeTeam?: { classroomId: string; classroom: { name: string }, letter: string };
    awayTeam?: { classroomId: string; classroom: { name: string }, letter: string };
    competitors?: { points: number; team: { classroomId: string; classroom: { name: string }, letter: string } }[];
};

export default function ResultadosDelegadoPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [disciplines, setDisciplines] = useState<any[]>([]);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Datos del usuario (Delegado)
    const [myGroupId, setMyGroupId] = useState<string | null>(null);
    const [myGroupName, setMyGroupName] = useState<string>("");

    // Filtros
    const [audienceFilter, setAudienceFilter] = useState<string>("");
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
    const [selectedSubDisciplineId, setSelectedSubDisciplineId] = useState<string>("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();
            const currentClassroomId = session?.user?.classroomId;

            const [mRes, dRes, cRes, gRes] = await Promise.all([
                fetch("/api/matches"), fetch("/api/disciplines"), fetch("/api/classrooms"), fetch("/api/groups")
            ]);

            let fetchedClassrooms = [];
            let fetchedGroups = [];

            if (cRes.ok) fetchedClassrooms = await cRes.json();
            if (gRes.ok) fetchedGroups = await gRes.json();
            if (dRes.ok) setDisciplines(await dRes.json());
            if (mRes.ok) setMatches(await mRes.json());

            setClassrooms(fetchedClassrooms);

            if (currentClassroomId) {
                const myClass = fetchedClassrooms.find((c: any) => c.id === currentClassroomId);
                if (myClass && myClass.studentGroupId) {
                    setMyGroupId(myClass.studentGroupId);
                    const groupInfo = fetchedGroups.find((g: any) => g.id === myClass.studentGroupId);
                    if (groupInfo) setMyGroupName(groupInfo.name);
                }
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { setSelectedDisciplineId(""); setSelectedSubDisciplineId(""); }, [audienceFilter]);
    useEffect(() => { setSelectedSubDisciplineId(""); }, [selectedDisciplineId]);

    // ==========================================
    // LÓGICAS DE CLASIFICACIÓN SEPARADAS
    // ==========================================
    
    // 1. LÓGICA PARA ESTUDIANTES: Acumula todos los equipos (A, B, C) en 1 SOLA AULA
    const getStandingsByClassroom = (matchList: Match[]) => {
        const standings: Record<string, any> = {};

        const initClassroom = (classroomId: string, classroomName: string) => {
            if (!standings[classroomId]) {
                standings[classroomId] = {
                    classroomId, classroomName, totalPts: 0,
                    gf: 0, gc: 0, dg: 0, pj: 0, pg: 0, pe: 0, pp: 0
                };
            }
            return standings[classroomId];
        };

        // Armar tabla base con ceros
        matchList.forEach(m => {
            if (m.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
                if (m.homeTeam) initClassroom(m.homeTeam.classroomId, m.homeTeam.classroom.name);
                if (m.awayTeam) initClassroom(m.awayTeam.classroomId, m.awayTeam.classroom.name);
            } else {
                m.competitors?.forEach((c: any) => {
                    if (c.team) initClassroom(c.team.classroomId, c.team.classroom.name);
                });
            }
        });

        // Sumar puntos
        matchList.forEach(m => {
            if (m.status !== "FINALIZADO" && m.status !== "WALKOVER") return;

            if (m.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
                if (m.homeTeam && m.awayTeam) {
                    const home = standings[m.homeTeam.classroomId];
                    const away = standings[m.awayTeam.classroomId];

                    home.pj++; away.pj++;
                    home.gf += m.homeScore; home.gc += m.awayScore;
                    away.gf += m.awayScore; away.gc += m.homeScore;

                    if (m.homeScore > m.awayScore) { home.pg++; away.pp++; }
                    else if (m.awayScore > m.homeScore) { away.pg++; home.pp++; }
                    else { home.pe++; away.pe++; }

                    home.totalPts += m.homeTablePts || 0;
                    away.totalPts += m.awayTablePts || 0;
                }
            } else {
                m.competitors?.forEach((c: any) => {
                    if (c.team) {
                        const team = standings[c.team.classroomId];
                        team.pj++;
                        team.totalPts += (c.points || 0);
                    }
                });
            }
        });

        Object.values(standings).forEach((st: any) => st.dg = st.gf - st.gc);
        let result = Object.values(standings);

        // Filtro estricto: Solo estudiantes ven su grupo
        if (myGroupId) {
            result = result.filter((st: any) => {
                const c = classrooms.find(cls => cls.id === st.classroomId);
                return c && c.studentGroupId === myGroupId;
            });
        }

        return result.sort((a: any, b: any) => {
            if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
            if (b.dg !== a.dg) return b.dg - a.dg;
            return b.gf - a.gf;
        });
    };

    // 2. LÓGICA PARA PADRES: Separa los equipos (Eq A, Eq B) para verlos por etapas y GRUPOS
    const getStandingsByTeam = (matchList: Match[]) => {
        const standings: Record<string, any> = {};

        const initTeam = (classroomId: string, classroomName: string, letter: string) => {
            const key = `${classroomId}_${letter}`;
            if (!standings[key]) {
                standings[key] = {
                    classroomId, classroomName, letter, totalPts: 0,
                    gf: 0, gc: 0, dg: 0, pj: 0, pg: 0, pe: 0, pp: 0
                };
            }
            return standings[key];
        };

        // Armar tabla base con ceros
        matchList.forEach(m => {
            if (m.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
                if (m.homeTeam) initTeam(m.homeTeam.classroomId, m.homeTeam.classroom.name, m.homeTeam.letter);
                if (m.awayTeam) initTeam(m.awayTeam.classroomId, m.awayTeam.classroom.name, m.awayTeam.letter);
            } else {
                m.competitors?.forEach((c: any) => {
                    if (c.team) initTeam(c.team.classroomId, c.team.classroom.name, c.team.letter);
                });
            }
        });

        // Sumar puntos
        matchList.forEach(m => {
            if (m.status !== "FINALIZADO" && m.status !== "WALKOVER") return;

            if (m.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
                if (m.homeTeam && m.awayTeam) {
                    const home = standings[`${m.homeTeam.classroomId}_${m.homeTeam.letter}`];
                    const away = standings[`${m.awayTeam.classroomId}_${m.awayTeam.letter}`];

                    if(home && away) {
                        home.pj++; away.pj++;
                        home.gf += m.homeScore; home.gc += m.awayScore;
                        away.gf += m.awayScore; away.gc += m.homeScore;

                        if (m.homeScore > m.awayScore) { home.pg++; away.pp++; }
                        else if (m.awayScore > m.homeScore) { away.pg++; home.pp++; }
                        else { home.pe++; away.pe++; }

                        home.totalPts += m.homeTablePts || 0;
                        away.totalPts += m.awayTablePts || 0;
                    }
                }
            } else {
                m.competitors?.forEach((c: any) => {
                    if (c.team) {
                        const team = standings[`${c.team.classroomId}_${c.team.letter}`];
                        if(team) {
                            team.pj++;
                            team.totalPts += (c.points || 0);
                        }
                    }
                });
            }
        });

        Object.values(standings).forEach((st: any) => st.dg = st.gf - st.gc);
        let result = Object.values(standings);

        return result.sort((a: any, b: any) => {
            if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
            if (b.dg !== a.dg) return b.dg - a.dg;
            return b.gf - a.gf;
        });
    };

    // Filtros base
    const filteredDisciplines = disciplines.filter(d => audienceFilter === "" || d.audience === audienceFilter);
    const activeDiscipline = disciplines.find(d => d.id === selectedDisciplineId);
    const activeSubDiscipline = activeDiscipline?.subDisciplines?.find((s: any) => s.id === selectedSubDisciplineId);
    const isParents = activeDiscipline?.audience === "PADRES";

    // Partidos válidos para toda la vista
    const validMatches = matches.filter(m => {
        if (selectedSubDisciplineId) return m.subDisciplineId === selectedSubDisciplineId;
        return m.subDiscipline.discipline.id === selectedDisciplineId;
    });

    // ==========================================
    // RENDERIZADO DE TABLAS
    // ==========================================
    const renderTableUI = (title: string, data: any[], isGlobal: boolean, showTeamLetter: boolean) => {
        if (data.length === 0) return null;

        return (
            <div className={`bg-white rounded-[2rem] shadow-xl border overflow-hidden mb-10 ${isGlobal ? 'border-[#00E5FF]' : 'border-gray-200'}`}>
                <div className={`${isGlobal ? 'bg-[#0B1A28] text-white' : 'bg-gray-100 text-[#0B1A28] border-b-2 border-gray-200'} p-6 relative overflow-hidden`}>
                    {isGlobal && <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF] rounded-full mix-blend-overlay filter blur-[40px] opacity-40"></div>}
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest relative z-10">
                        {isGlobal ? '🏆' : '📌'} {title}
                    </h2>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-center text-sm whitespace-nowrap">
                        <thead className={`${isGlobal ? 'bg-gray-100' : 'bg-gray-50'} text-gray-500 font-black uppercase tracking-wider text-[10px] border-b-2 border-gray-200`}>
                            <tr>
                                <th className="p-4 w-16">Rank</th>
                                <th className="p-4 text-left">Aula / Salón</th>
                                <th className="p-4 w-10 text-[#0B1A28]">PJ</th>
                                <th className="p-4 w-10 text-green-600">G</th>
                                <th className="p-4 w-10 text-yellow-600">E</th>
                                <th className="p-4 w-10 text-red-600">P</th>
                                <th className="p-4 w-10 text-[#0B1A28]">GF</th>
                                <th className="p-4 w-10 text-[#0B1A28]">GC</th>
                                <th className="p-4 w-10 bg-gray-200 text-[#0B1A28]">DG</th>
                                <th className={`p-4 w-16 ${isGlobal ? 'text-[#00E5FF] bg-[#0B1A28]' : 'text-white bg-indigo-600'} text-xs`}>PTS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((st: any, idx: number) => (
                                <tr key={`${st.classroomId}-${st.letter || 'aula'}`} className={`hover:bg-[#E6FCFF]/50 transition-colors ${idx === 0 ? 'bg-yellow-50/50' : idx === 1 ? 'bg-gray-50/50' : idx === 2 ? 'bg-orange-50/30' : ''}`}>
                                    <td className="p-4 text-center">
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-white mx-auto text-sm shadow-sm ${idx === 0 ? 'bg-yellow-500 scale-110' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : (isGlobal ? 'bg-[#0B1A28]' : 'bg-indigo-600')}`}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="p-4 font-black text-gray-900 text-left text-lg">
                                        {st.classroomName} {showTeamLetter && <span className="text-[10px] text-gray-500 uppercase ml-1">Eq. {st.letter}</span>}
                                    </td>
                                    <td className="p-4 font-black text-[#0B1A28] text-base">{st.pj}</td>
                                    <td className="p-4 font-bold text-green-600">{st.pg}</td>
                                    <td className="p-4 font-bold text-yellow-600">{st.pe}</td>
                                    <td className="p-4 font-bold text-red-600">{st.pp}</td>
                                    <td className="p-4 font-black text-gray-700">{st.gf}</td>
                                    <td className="p-4 font-black text-gray-500">{st.gc}</td>
                                    <td className="p-4 bg-gray-50 font-black text-gray-900">{st.dg > 0 ? `+${st.dg}` : st.dg}</td>
                                    <td className={`p-4 font-black text-xl text-white shadow-inner ${isGlobal ? 'bg-[#0B1A28]' : 'bg-indigo-600'}`}>{st.totalPts}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderPrintTable = (title: string, data: any[], isGlobal: boolean, showTeamLetter: boolean) => {
        if (data.length === 0) return null;
        return (
            <div className="mb-12 page-break-inside-avoid">
                <h3 className={`text-xl font-black uppercase bg-gray-200 p-2 border-l-4 border-black mb-4 text-black`}>
                    {isGlobal ? '🏆' : '📌'} {title}
                </h3>
                <table className="w-full text-sm border-collapse border border-black text-black text-center">
                    <thead>
                        <tr className="bg-gray-200 border-b-2 border-black">
                            <th className="border border-black p-2 w-12">Rank</th>
                            <th className="border border-black p-2 text-left pl-4">Aula / Salón</th>
                            <th className="border border-black p-2 w-10">PJ</th>
                            <th className="border border-black p-2 w-10">G</th>
                            <th className="border border-black p-2 w-10">E</th>
                            <th className="border border-black p-2 w-10">P</th>
                            <th className="border border-black p-2 w-10">GF</th>
                            <th className="border border-black p-2 w-10">GC</th>
                            <th className="border border-black p-2 w-10 bg-gray-300">DG</th>
                            <th className="border border-black p-2 w-16 font-black text-base">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((st: any, idx: number) => (
                            <tr key={`${st.classroomId}-${st.letter || 'aula'}`} className="border-b border-black">
                                <td className="border border-black p-2 font-bold">{idx + 1}</td>
                                <td className="border border-black p-2 font-bold text-left pl-4">{st.classroomName} {showTeamLetter ? `(Eq. ${st.letter})` : ''}</td>
                                <td className="border border-black p-2">{st.pj}</td>
                                <td className="border border-black p-2">{st.pg}</td>
                                <td className="border border-black p-2">{st.pe}</td>
                                <td className="border border-black p-2">{st.pp}</td>
                                <td className="border border-black p-2">{st.gf}</td>
                                <td className="border border-black p-2">{st.gc}</td>
                                <td className="border border-black p-2 font-bold bg-gray-100">{st.dg}</td>
                                <td className="border border-black p-2 font-black text-base">{st.totalPts}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* === VISTA EN PANTALLA (NO SE IMPRIME) === */}
            <div className="p-4 md:p-8 print:hidden max-w-[1200px] mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-[#0B1A28] p-6 rounded-3xl shadow-lg text-white border-b-4 border-[#00E5FF]">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Resultados Oficiales</h1>
                        <p className="text-gray-300 font-medium mt-1">Sigue de cerca la clasificación de tu grupo y del torneo.</p>
                        <div className="mt-3 flex gap-2">
                            <span className="inline-block bg-[#00E5FF]/20 border border-[#00E5FF]/50 text-[#00E5FF] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                                {isParents ? "🌍 Torneo General (Todos los salones)" : `🔒 Torneo de Grupo: ${myGroupName}`}
                            </span>
                        </div>
                    </div>
            
                </div>

                {/* FILTROS */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-2">1. Categoría</label>
                        <select className="w-full border-2 border-gray-300 rounded-xl p-3 font-bold text-[#0B1A28] focus:border-[#00E5FF] outline-none" value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}>
                            <option value="">TODAS</option>
                            <option value="ESTUDIANTES">Estudiantes</option>
                            <option value="PADRES">Padres</option>
                            <option value="MIXTO">Mixto</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-2">2. Disciplina</label>
                        <select className="w-full border-2 border-gray-300 rounded-xl p-3 font-bold text-[#0B1A28] focus:border-[#00E5FF] outline-none disabled:opacity-50 disabled:bg-gray-100" value={selectedDisciplineId} onChange={(e) => setSelectedDisciplineId(e.target.value)} disabled={!audienceFilter}>
                            <option value="">-- Seleccione Disciplina --</option>
                            {filteredDisciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-2">3. Subdisciplina (Opcional)</label>
                        <select className="w-full border-2 border-gray-300 rounded-xl p-3 font-bold text-[#0B1A28] focus:border-[#00E5FF] outline-none disabled:opacity-50 disabled:bg-gray-100" value={selectedSubDisciplineId} onChange={(e) => setSelectedSubDisciplineId(e.target.value)} disabled={!selectedDisciplineId}>
                            <option value="">Resumen General Acumulado</option>
                            {activeDiscipline?.subDisciplines?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-[#00E5FF] font-black animate-pulse text-xl">Calculando posiciones...</div>
                ) : !selectedDisciplineId ? (
                    <div className="text-center py-20 text-gray-500 font-bold border-2 border-dashed border-gray-300 rounded-3xl bg-white shadow-sm">
                        <span className="text-4xl block mb-2">👆</span>
                        Selecciona los filtros de arriba para ver las tablas de posiciones.
                    </div>
                ) : validMatches.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-200">
                        <div className="text-6xl mb-4">🏟️</div>
                        <h3 className="text-xl font-black text-gray-800">Torneo no iniciado</h3>
                        <p className="text-gray-500 font-medium mt-2">Aún no hay partidos programados en esta categoría.</p>
                    </div>
                ) : (
                    <div>
                        {/* A) LÓGICA PARA PADRES (Por Etapas y GRUPOS, Separado por Equipos) */}
                        {isParents ? (
                            <>
                                {selectedSubDisciplineId && activeSubDiscipline?.stages?.map((stage: any) => {
                                    const stageMatches = validMatches.filter(m => m.stageId === stage.id);
                                    if (stageMatches.length === 0) return null;

                                    // Agrupar los partidos de esta etapa por nombre de grupo
                                    const matchesByGroup = stageMatches.reduce((acc: any, m: Match) => {
                                        const gn = m.group?.name || "Fase Única / Llaves";
                                        if (!acc[gn]) acc[gn] = [];
                                        acc[gn].push(m);
                                        return acc;
                                    }, {});

                                    return (
                                        <div key={stage.id}>
                                            {Object.entries(matchesByGroup).map(([groupName, gMatches]: [string, any]) => {
                                                const stageGroupData = getStandingsByTeam(gMatches);
                                                if (stageGroupData.length === 0) return null;
                                                
                                                const titleSuffix = groupName === "Fase Única / Llaves" ? "" : ` - ${groupName}`;
                                                const title = `Etapa: ${stage.name}${titleSuffix}`;

                                                return (
                                                    <div key={`${stage.id}-${groupName}`}>
                                                        {renderTableUI(title, stageGroupData, false, true)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                                {/* Tabla Global Acumulada para Padres (También separado por Equipos) */}
                                {renderTableUI(`Clasificación General (Acumulada por Equipos)`, getStandingsByTeam(validMatches), true, true)}
                            </>
                        ) : (
                            /* B) LÓGICA PARA ESTUDIANTES/MIXTO (Acumulado por Aula y Solo 1 Tabla) */
                            <>
                                {renderTableUI(`Clasificación General (Acumulado por Aula)`, getStandingsByClassroom(validMatches), true, false)}
                            </>
                        )}

                        <div className="bg-gray-100 p-3 text-center border border-gray-200 rounded-xl mt-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Leyenda: PJ (Partidos Jugados) | G (Ganados) | E (Empatados) | P (Perdidos) | GF (Goles a Favor) | GC (Goles en Contra) | DG (Dif. Goles) | PTS (Puntos)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* === VISTA EXCLUSIVA PARA IMPRESIÓN === */}
            {selectedDisciplineId && validMatches.length > 0 && (
                <div className="hidden print:block bg-white text-black w-full text-xs p-8">
                    <div className="text-center mb-8 border-b-4 border-black pb-4">
                        <h1 className="text-3xl font-black uppercase mb-2 text-black">Reporte Oficial de Posiciones</h1>
                        <h2 className="text-xl font-bold mt-1 text-black">
                            {activeDiscipline?.name} {activeSubDiscipline ? `- ${activeSubDiscipline.name}` : '(Resumen General)'}
                        </h2>
                        <p className="text-sm font-bold mt-2 text-gray-800">Colegio Unión Internacional - Campeonato Deportivo 2026</p>
                        {!isParents && (
                            <p className="text-xs font-black mt-1 bg-gray-200 inline-block px-3 py-1 border border-black uppercase">
                                Filtro de Grupo: {myGroupName}
                            </p>
                        )}
                    </div>

                    {isParents ? (
                        <>
                            {selectedSubDisciplineId && activeSubDiscipline?.stages?.map((stage: any) => {
                                const stageMatches = validMatches.filter(m => m.stageId === stage.id);
                                if (stageMatches.length === 0) return null;

                                const matchesByGroup = stageMatches.reduce((acc: any, m: Match) => {
                                    const gn = m.group?.name || "Fase Única / Llaves";
                                    if (!acc[gn]) acc[gn] = [];
                                    acc[gn].push(m);
                                    return acc;
                                }, {});

                                return (
                                    <div key={stage.id}>
                                        {Object.entries(matchesByGroup).map(([groupName, gMatches]: [string, any]) => {
                                            const stageGroupData = getStandingsByTeam(gMatches);
                                            if (stageGroupData.length === 0) return null;
                                            
                                            const titleSuffix = groupName === "Fase Única / Llaves" ? "" : ` - ${groupName}`;
                                            const title = `Etapa: ${stage.name}${titleSuffix}`;

                                            return (
                                                <div key={`${stage.id}-${groupName}`}>
                                                    {renderPrintTable(title, stageGroupData, false, true)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {renderPrintTable(`Clasificación General Acumulada`, getStandingsByTeam(validMatches), true, true)}
                        </>
                    ) : (
                        <>
                            {renderPrintTable(`Clasificación General Acumulada`, getStandingsByClassroom(validMatches), true, false)}
                        </>
                    )}

                    <div className="mt-20 flex justify-around">
                        <div className="text-center">
                            <div className="w-64 border-t-2 border-black mb-2 mx-auto"></div>
                            <p className="text-sm font-bold text-black uppercase">Firma del Delegado General</p>
                        </div>
                        <div className="text-center">
                            <div className="w-64 border-t-2 border-black mb-2 mx-auto"></div>
                            <p className="text-sm font-bold text-black uppercase">Mesa de Control Oficial</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}