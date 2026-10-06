"use client";

import { useState, useEffect } from "react";

// ==========================================
// 1. TIPOS Y DEFINICIONES
// ==========================================
type Player = { isStarter: boolean; player: { firstName: string; lastName: string; dni: string; isParent: boolean }; };
type TeamWithPlayers = { id: string; name: string; letter: string; classroomId: string; classroom: { id: string; name: string }; players: Player[]; };
type Stage = { id: string; name: string; stageOrder: number; stageType: string; pointsForWin: number; pointsForTie: number; pointsForLoss: number; };

type Match = {
    id: string; subDisciplineId: string; stageId: string; stage: Stage; court: string; matchOrder: number;
    status: "PENDIENTE" | "EN_JUEGO" | "FINALIZADO" | "WALKOVER";
    homeScore: number; awayScore: number; homeTablePts: number; awayTablePts: number; observation: string;
    groupId: string | null; group?: { name: string };
    subDiscipline: { id: string; name: string; discipline: { id: string; name: string; format: "ENFRENTAMIENTO" | "COMPETENCIA"; audience: "ESTUDIANTES" | "PADRES" | "MIXTO" }; };
    homeTeam?: TeamWithPlayers; awayTeam?: TeamWithPlayers;
    competitors?: { id: string; score: number; points: number; position: number | null; playerName: string | null; team: TeamWithPlayers; }[];
};

type Classroom = { id: string; name: string; studentGroupId: string; parentGroupId: string | null };

type Standing = {
    teamId: string; teamName: string; letter: string; classroomId: string; sourceStageId?: string;
    pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dg: number; pts: number;
};

// ==========================================
// 2. COMPONENTES INTERNOS (Para código limpio)
// ==========================================
const MatchBadge = ({ status }: { status: string }) => {
    switch (status) {
        case "PENDIENTE": return <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-600 shadow-sm">Pendiente</span>;
        case "EN_JUEGO": return <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-700 shadow-sm">En Juego</span>;
        case "FINALIZADO": return <span className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-green-400 shadow-sm">Finalizado</span>;
        case "WALKOVER": return <span className="bg-red-900 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold border border-red-800 shadow-sm">W.O.</span>;
        default: return null;
    }
};

const TeamPlayersViewer = ({ team }: { team: TeamWithPlayers }) => (
    <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-black text-indigo-900 mb-3 border-b border-gray-200 pb-2">
            {team.classroom.name} <span className="text-gray-500 text-sm">({team.name})</span>
        </h3>
        {team.players.length === 0 ? (
            <p className="text-sm text-red-500 font-bold bg-red-50 p-2 rounded">Nómina vacía. Faltan inscribir jugadores.</p>
        ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {team.players.map((p, i) => (
                    <li key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                        <span className="font-bold text-gray-800 truncate pr-2">{p.player.lastName}, {p.player.firstName}</span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded tracking-wider ${p.isStarter ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-600'}`}>
                            {p.isStarter ? 'TITULAR' : 'SUPLENTE'}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

// ==========================================
// 3. PÁGINA PRINCIPAL
// ==========================================
export default function ControlPartidosPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [disciplines, setDisciplines] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // FILTROS
    const [audienceFilter, setAudienceFilter] = useState<string>("");
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
    const [selectedSubDisciplineId, setSelectedSubDisciplineId] = useState<string>("");
    const [selectedGroupIdFilter, setSelectedGroupIdFilter] = useState<string>("");

    // MODALES
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<"RESULTADOS" | "NOMINAS">("RESULTADOS");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    // FORMULARIO ACTUALIZAR RESULTADO
    const [status, setStatus] = useState<string>("PENDIENTE");
    const [observation, setObservation] = useState("");
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [competitorsData, setCompetitorsData] = useState<any[]>([]);

    // FORMULARIO CREAR PARTIDO
    const [newMatch, setNewMatch] = useState({
        subDisciplineId: "", format: "ENFRENTAMIENTO", groupId: "", stageId: "", court: "Campo Principal", matchOrder: 1,
        homeClassroomId: "", homeTeamLetter: "A", awayClassroomId: "", awayTeamLetter: "B", classroomIds: [] as string[]
    });

    // ESTADO LLAVES MÁGICAS
    const [selectedTeamsForNextStage, setSelectedTeamsForNextStage] = useState<Standing[]>([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [mRes, dRes, gRes, cRes] = await Promise.all([
                fetch("/api/matches"), fetch("/api/disciplines"), fetch("/api/groups"), fetch("/api/classrooms")
            ]);
            if (mRes.ok) setMatches(await mRes.json());
            if (dRes.ok) setDisciplines(await dRes.json());
            if (gRes.ok) setGroups(await gRes.json());
            if (cRes.ok) setClassrooms(await cRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => { setSelectedDisciplineId(""); setSelectedSubDisciplineId(""); setSelectedTeamsForNextStage([]); setSelectedGroupIdFilter(""); }, [audienceFilter]);
    useEffect(() => { setSelectedSubDisciplineId(""); setSelectedTeamsForNextStage([]); setSelectedGroupIdFilter(""); }, [selectedDisciplineId]);
    useEffect(() => { setSelectedTeamsForNextStage([]); setSelectedGroupIdFilter(""); }, [selectedSubDisciplineId]);

    const handleCreateChange = (field: string, value: any) => {
        setNewMatch(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "subDisciplineId") {
                const parentDisc = disciplines.find(d => d.subDisciplines.some((s: any) => s.id === value));
                if (parentDisc) updated.format = parentDisc.format;
                const selectedSub = parentDisc?.subDisciplines.find((s: any) => s.id === value);
                updated.stageId = (selectedSub && selectedSub.stages?.length > 0) ? selectedSub.stages[0].id : "";
            }
            return updated;
        });
    };

    const handleClassroomMultiSelect = (classroomId: string) => {
        setNewMatch(prev => ({
            ...prev,
            classroomIds: prev.classroomIds.includes(classroomId) ? prev.classroomIds.filter(id => id !== classroomId) : [...prev.classroomIds, classroomId]
        }));
    };

    const handleScheduleMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/matches", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newMatch)
            });
            if (res.ok) {
                alert("Evento programado exitosamente");
                setIsCreateModalOpen(false);
                setNewMatch({ ...newMatch, homeClassroomId: "", awayClassroomId: "", classroomIds: [], matchOrder: newMatch.matchOrder + 1 });
                fetchData();
                setSelectedTeamsForNextStage([]);
            } else {
                alert((await res.json()).error || "Error al programar");
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteMatch = async (id: string) => {
        if (!confirm("¿Eliminar este evento? Se perderán sus resultados.")) return;
        try {
            const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
            if (res.ok) fetchData();
        } catch (error) { console.error(error); }
    };

    const openMatchModal = (match: Match) => {
        setSelectedMatch(match); setStatus(match.status); setObservation(match.observation || ""); setActiveModalTab("RESULTADOS");
        if (match.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
            setHomeScore(match.homeScore); setAwayScore(match.awayScore);
        } else {
            setCompetitorsData(match.competitors?.map(c => ({
                id: c.id, teamName: c.team.classroom.name, score: c.score, position: c.position || "", points: c.points, playerName: c.playerName || ""
            })) || []);
        }
        setIsMatchModalOpen(true);
    };

    const handleCompetitorChange = (index: number, field: string, value: string | number) => {
        const updated = [...competitorsData];
        updated[index] = { ...updated[index], [field]: value };
        if (field === "position" && selectedMatch?.stage) {
            const pos = Number(value);
            if (pos === 1) updated[index].points = selectedMatch.stage.pointsForWin;
            else if (pos === 2) updated[index].points = selectedMatch.stage.pointsForTie;
            else if (pos === 3) updated[index].points = selectedMatch.stage.pointsForLoss;
            else updated[index].points = 0;
        }
        setCompetitorsData(updated);
    };

    const handleSaveResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatch) return;
        const format = selectedMatch.subDiscipline.discipline.format;
        const body: any = { format, status, observation };
        if (format === "ENFRENTAMIENTO") { body.homeScore = homeScore; body.awayScore = awayScore; }
        else { body.competitorsData = competitorsData; }

        try {
            const res = await fetch(`/api/matches/${selectedMatch.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
            });
            if (res.ok) { alert("Resultado guardado"); setIsMatchModalOpen(false); fetchData(); }
        } catch (error) { console.error(error); }
    };

    // ==========================================
    // MATEMÁTICAS, TABLAS Y ARMADO DE LLAVES
    // ==========================================
    const calculateStandings = (groupMatches: Match[]): Standing[] => {
        const standings: Record<string, Standing> = {};
        const initTeam = (t: any) => {
            if (!standings[t.id]) standings[t.id] = { teamId: t.id, teamName: t.classroom.name, letter: t.letter, classroomId: t.classroomId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
            return standings[t.id];
        };

        groupMatches.forEach(m => {
            if (m.status !== "FINALIZADO" && m.status !== "WALKOVER") return;
            if (m.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
                if (m.homeTeam && m.awayTeam) {
                    const home = initTeam(m.homeTeam); const away = initTeam(m.awayTeam);
                    home.pj++; away.pj++; home.gf += m.homeScore; home.gc += m.awayScore; away.gf += m.awayScore; away.gc += m.homeScore;
                    if (m.homeScore > m.awayScore) { home.pg++; away.pp++; home.pts += m.stage.pointsForWin; }
                    else if (m.awayScore > m.homeScore) { away.pg++; home.pp++; away.pts += m.stage.pointsForWin; }
                    else { home.pe++; away.pe++; home.pts += m.stage.pointsForTie; away.pts += m.stage.pointsForTie; }
                }
            } else {
                m.competitors?.forEach((c: any) => { const team = initTeam(c.team); team.pj++; team.pts += c.points || 0; });
            }
        });

        Object.values(standings).forEach(st => { st.dg = st.gf - st.gc; });
        return Object.values(standings).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.dg !== a.dg) return b.dg - a.dg;
            return b.gf - a.gf;
        });
    };

    const calculateGlobalStandings = (): any[] => {
        if (!selectedDisciplineId) return [];

        const validMatches = matches.filter(m =>
            m.subDiscipline.discipline.id === selectedDisciplineId &&
            (m.status === "FINALIZADO" || m.status === "WALKOVER")
        );

        const globalStandings: Record<string, { classroomId: string, classroomName: string, totalPts: number }> = {};

        validMatches.forEach(m => {
            if (m.subDiscipline.discipline.format === "ENFRENTAMIENTO") {
                if (m.homeTeam && m.awayTeam) {
                    if (!globalStandings[m.homeTeam.classroomId]) globalStandings[m.homeTeam.classroomId] = { classroomId: m.homeTeam.classroomId, classroomName: m.homeTeam.classroom.name, totalPts: 0 };
                    if (!globalStandings[m.awayTeam.classroomId]) globalStandings[m.awayTeam.classroomId] = { classroomId: m.awayTeam.classroomId, classroomName: m.awayTeam.classroom.name, totalPts: 0 };

                    globalStandings[m.homeTeam.classroomId].totalPts += m.homeTablePts || 0;
                    globalStandings[m.awayTeam.classroomId].totalPts += m.awayTablePts || 0;
                }
            } else {
                m.competitors?.forEach((c: any) => {
                    if (!globalStandings[c.team.classroomId]) globalStandings[c.team.classroomId] = { classroomId: c.team.classroomId, classroomName: c.team.classroom.name, totalPts: 0 };
                    globalStandings[c.team.classroomId].totalPts += (c.points || 0);
                });
            }
        });

        return Object.values(globalStandings).sort((a, b) => b.totalPts - a.totalPts);
    };

    const handleSelectWinnerForNextStage = (stageId: string, teamId: string, teamName: string, classroomId: string, letter: string) => {
        setSelectedTeamsForNextStage(prev => {
            if (prev.some(t => t.teamId === teamId)) {
                return prev.filter(t => t.teamId !== teamId);
            }
            const newTeamInfo: Standing = { teamId, teamName, letter, classroomId, sourceStageId: stageId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
            if (prev.length === 0) return [newTeamInfo];

            if (prev[0].sourceStageId !== stageId) {
                alert("Debes seleccionar dos equipos que pertenezcan a la MISMA ETAPA para poder enfrentarlos.");
                return prev;
            }

            const subDisc = disciplines.find(d => d.id === selectedDisciplineId)?.subDisciplines?.find((s: any) => s.id === selectedSubDisciplineId);
            if (!subDisc) return prev;

            const currentStageInfo = subDisc.stages.find((s: any) => s.id === stageId);
            const nextStage = subDisc.stages.find((s: any) => s.stageOrder > (currentStageInfo?.stageOrder || 0));

            if (!nextStage) {
                alert("¡Esta ya es la etapa final! No hay más etapas configuradas en el sistema para avanzar.");
                return prev;
            }

            setNewMatch(prevMatch => ({
                ...prevMatch, subDisciplineId: selectedSubDisciplineId, stageId: nextStage.id,
                homeClassroomId: prev[0].classroomId, homeTeamLetter: prev[0].letter,
                awayClassroomId: newTeamInfo.classroomId, awayTeamLetter: newTeamInfo.letter
            }));
            setIsCreateModalOpen(true);
            return [];
        });
    };

    // ==========================================
    // FILTRADO MAESTRO DE DATOS
    // ==========================================
    const filteredDisciplines = disciplines.filter(d => audienceFilter === "" || d.audience === audienceFilter);
    const activeDiscipline = disciplines.find(d => d.id === selectedDisciplineId);
    const activeSubDiscipline = activeDiscipline?.subDisciplines?.find((s: any) => s.id === selectedSubDisciplineId);

    let displayedMatches = matches;
    if (audienceFilter) displayedMatches = displayedMatches.filter(m => m.subDiscipline.discipline.audience === audienceFilter);
    if (selectedDisciplineId) displayedMatches = displayedMatches.filter(m => m.subDiscipline.discipline.id === selectedDisciplineId);
    if (selectedSubDisciplineId) displayedMatches = displayedMatches.filter(m => m.subDisciplineId === selectedSubDisciplineId);
    if (selectedGroupIdFilter && selectedGroupIdFilter !== "null") displayedMatches = displayedMatches.filter(m => m.groupId === selectedGroupIdFilter);
    if (selectedGroupIdFilter === "null") displayedMatches = displayedMatches.filter(m => m.groupId === null);

    const newMatchActiveSub = disciplines.find(d => d.subDisciplines.some((s: any) => s.id === newMatch.subDisciplineId))?.subDisciplines.find((s: any) => s.id === newMatch.subDisciplineId);
    let filteredClassrooms = classrooms;
    if (newMatch.groupId) {
        const aud = disciplines.find(d => d.subDisciplines.some((s: any) => s.id === newMatch.subDisciplineId))?.audience;
        filteredClassrooms = aud === "PADRES" ? filteredClassrooms.filter(c => c.parentGroupId === newMatch.groupId) : filteredClassrooms.filter(c => c.studentGroupId === newMatch.groupId);
    }

    const matchesForPrintByStage = activeSubDiscipline?.stages?.reduce((acc: any, stage: any) => {
        const sMatches = displayedMatches.filter(m => m.stageId === stage.id);
        if (sMatches.length > 0) acc.push({ stage, matches: sMatches });
        return acc;
    }, []);

    const globalStandings = calculateGlobalStandings();

    return (
        <div className="p-6 bg-gray-50 min-h-screen relative pb-24">
            {/* ==========================================
          VISTA WEB (Oculta al imprimir)
      ========================================== */}
            <div className="print:hidden">
                <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Fixture y Resultados</h1>
                        <p className="text-gray-600 text-sm font-medium mt-1">Programa eventos, clasifica equipos a la siguiente etapa e imprime el reporte oficial.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} disabled={!selectedDisciplineId} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            Imprimir Resultados
                        </button>
                        <button onClick={() => { setNewMatch(prev => ({ ...prev, subDisciplineId: selectedSubDisciplineId || "", homeClassroomId: "", awayClassroomId: "" })); setIsCreateModalOpen(true); }} className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
                            + Programar Partido Libre
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">1. Público</label>
                        <select className="w-full border-2 rounded-lg p-2.5 font-bold" value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)}>
                            <option value="">TODOS</option><option value="ESTUDIANTES">Estudiantes</option><option value="PADRES">Padres</option><option value="MIXTO">Mixto</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">2. Disciplina</label>
                        <select className="w-full border-2 rounded-lg p-2.5 font-bold disabled:opacity-50" value={selectedDisciplineId} onChange={(e) => setSelectedDisciplineId(e.target.value)} disabled={!audienceFilter}>
                            <option value="">TODAS LAS DISCIPLINAS</option>
                            {filteredDisciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">3. Categoría</label>
                        <select className="w-full border-2 rounded-lg p-2.5 font-bold disabled:opacity-50" value={selectedSubDisciplineId} onChange={(e) => setSelectedSubDisciplineId(e.target.value)} disabled={!selectedDisciplineId}>
                            <option value="">TODAS LAS CATEGORÍAS</option>
                            {activeDiscipline?.subDisciplines?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-black text-indigo-500 uppercase mb-1">4. Ver Grupo (Opcional)</label>
                        <select className="w-full border-2 border-indigo-200 bg-indigo-50 rounded-lg p-2.5 font-bold disabled:opacity-50" value={selectedGroupIdFilter} onChange={(e) => setSelectedGroupIdFilter(e.target.value)} disabled={!selectedSubDisciplineId}>
                            <option value="">TODOS LOS GRUPOS</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            <option value="null">Fase de Llaves (Sin Grupo)</option>
                        </select>
                    </div>
                </div>

                {/* TABLERO DE PARTIDOS (FLEX SNAP) */}
                {isLoading ? (
                    <div className="text-center py-20 font-black text-gray-400">Cargando tablero...</div>
                ) : !selectedDisciplineId ? (
                    <div className="text-center py-20 text-gray-400 font-bold border-2 border-dashed rounded-2xl bg-white shadow-sm">Selecciona las opciones de arriba para ver el fixture y las tablas.</div>
                ) : (
                    <>
                        {!selectedSubDisciplineId ? (
                            <div className="text-center py-8 text-gray-500 font-bold bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
                                <p>👆 Selecciona una "Categoría" (Ej: Equipo A, Damas) para ver o programar sus partidos.</p>
                            </div>
                        ) : !activeSubDiscipline ? (
                            <div className="text-center py-20 text-gray-400 font-bold border-2 border-dashed rounded-2xl bg-white shadow-sm">Cargando subdisciplina...</div>
                        ) : activeSubDiscipline.stages?.length === 0 ? (
                            <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm text-red-500 font-bold">Esta subdisciplina no tiene etapas configuradas.</div>
                        ) : (
                            <div className="flex overflow-x-auto gap-8 pb-10 pt-4 px-2 snap-x">
                                {activeSubDiscipline.stages?.map((stage: any) => {
                                    const stageMatches = displayedMatches.filter(m => m.stageId === stage.id);
                                    const matchesByGroup = stageMatches.reduce((acc, m) => { const gn = m.group?.name || "Fase General / Llaves"; if (!acc[gn]) acc[gn] = []; acc[gn].push(m); return acc; }, {} as Record<string, Match[]>);

                                    return (
                                        <div key={stage.id} className="flex-none w-[420px] snap-center">

                                            {/* CABECERA DE LA ETAPA */}
                                            <div className="bg-gray-900 text-white p-4 rounded-t-2xl border-b-4 border-indigo-500 flex justify-between items-center shadow-md relative overflow-hidden">
                                                <div className="relative z-10">
                                                    <p className="text-[10px] text-indigo-300 font-black tracking-widest uppercase mb-1">Etapa {stage.stageOrder}</p>
                                                    <h3 className="font-black uppercase tracking-wider text-base">{stage.name}</h3>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-1">{stage.stageType?.replace("_", " ")}</p>
                                                </div>
                                                <span className="bg-indigo-600 text-white text-sm font-black px-3 py-1.5 rounded-lg shadow-inner relative z-10">{stageMatches.length} Partidos</span>
                                            </div>

                                            {/* CUERPO DE LA ETAPA */}
                                            <div className="bg-gray-200/60 p-3 rounded-b-2xl min-h-[400px] flex flex-col gap-4 border border-gray-200 border-t-0 shadow-inner">
                                                {stageMatches.length === 0 ? (
                                                    <div className="text-center text-gray-400 text-xs font-bold py-10 italic">Sin partidos programados</div>
                                                ) : (
                                                    Object.entries(matchesByGroup).map(([groupName, groupMatches]) => (
                                                        <div key={groupName} className="flex flex-col gap-3 mb-4">

                                                            {/* SEPARADOR DE GRUPO */}
                                                            <div className="flex items-center gap-3 my-1">
                                                                <div className="h-[2px] bg-gray-300 flex-1 rounded-full"></div>
                                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-200 px-3 py-1.5 rounded-lg shadow-sm border border-gray-300">
                                                                    {groupName}
                                                                </span>
                                                                <div className="h-[2px] bg-gray-300 flex-1 rounded-full"></div>
                                                            </div>

                                                            {/* MAPEO DE PARTIDOS DEL GRUPO */}
                                                            {groupMatches.map(match => {
                                                                const isHomeSelected = selectedTeamsForNextStage.some(t => t.teamId === match.homeTeam?.id);
                                                                const isAwaySelected = selectedTeamsForNextStage.some(t => t.teamId === match.awayTeam?.id);

                                                                return (
                                                                    <div key={match.id} onClick={() => openMatchModal(match)} className="bg-[#202124] text-gray-200 rounded-xl p-3 cursor-pointer hover:bg-[#303134] transition-all duration-200 border border-gray-700 shadow-xl relative group transform hover:-translate-y-1">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match.id); }} className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-700 hover:scale-110 z-10">
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                        </button>

                                                                        <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
                                                                            <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase bg-gray-800 px-2 py-0.5 rounded">
                                                                                Orden #{match.matchOrder}
                                                                            </span>
                                                                            <MatchBadge status={match.status} />
                                                                        </div>

                                                                        {match.subDiscipline.discipline.format === "ENFRENTAMIENTO" ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <div className="flex justify-between items-center bg-[#2a2b2e] p-2.5 rounded-t-lg">
                                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
                                                                                        <span className="font-bold text-sm truncate">{match.homeTeam?.classroom.name || '?'} <span className="text-gray-500 text-[10px]">(Eq.{match.homeTeam?.letter})</span></span>
                                                                                    </div>
                                                                                    <span className="font-black text-lg w-8 text-right bg-black/30 rounded px-1">{match.status === "PENDIENTE" ? '-' : match.homeScore}</span>
                                                                                </div>
                                                                                <div className="w-full h-px bg-gray-700"></div>
                                                                                <div className="flex justify-between items-center bg-[#2a2b2e] p-2.5 rounded-b-lg">
                                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></div>
                                                                                        <span className="font-bold text-sm truncate">{match.awayTeam?.classroom.name || '?'} <span className="text-gray-500 text-[10px]">(Eq.{match.awayTeam?.letter})</span></span>
                                                                                    </div>
                                                                                    <span className="font-black text-lg w-8 text-right bg-black/30 rounded px-1">{match.status === "PENDIENTE" ? '-' : match.awayScore}</span>
                                                                                </div>

                                                                                {/* ELIMINACIÓN DIRECTA: Botón Clasificar */}
                                                                                {stage.stageType === "ELIMINACION_DIRECTA" && (match.status === "FINALIZADO" || match.status === "WALKOVER") && (
                                                                                    <div className="mt-2 pt-2 border-t border-gray-700 flex justify-center gap-2">
                                                                                        {match.homeScore > match.awayScore && (
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleSelectWinnerForNextStage(stage.id, match.homeTeam!.id, match.homeTeam!.classroom.name, match.homeTeam!.classroomId, match.homeTeam!.letter); }} className={`w-full font-bold py-1.5 rounded text-xs border transition-colors uppercase tracking-widest ${isHomeSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-800 hover:bg-indigo-900/50 text-indigo-300 border-gray-600 hover:border-indigo-500'}`}>
                                                                                                {isHomeSelected ? '✅ Seleccionado' : '⚔️ Clasificar Ganador'}
                                                                                            </button>
                                                                                        )}
                                                                                        {match.awayScore > match.homeScore && (
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleSelectWinnerForNextStage(stage.id, match.awayTeam!.id, match.awayTeam!.classroom.name, match.awayTeam!.classroomId, match.awayTeam!.letter); }} className={`w-full font-bold py-1.5 rounded text-xs border transition-colors uppercase tracking-widest ${isAwaySelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-800 hover:bg-indigo-900/50 text-indigo-300 border-gray-600 hover:border-indigo-500'}`}>
                                                                                                {isAwaySelected ? '✅ Seleccionado' : '⚔️ Clasificar Ganador'}
                                                                                            </button>
                                                                                        )}
                                                                                        {match.homeScore === match.awayScore && (
                                                                                            <span className="text-xs text-yellow-500 font-bold italic">Esperando desempate</span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-1">
                                                                                {match.competitors?.slice(0, 3).map((c: any) => {
                                                                                    const isCompSelected = selectedTeamsForNextStage.some(t => t.teamId === c.team.id);
                                                                                    return (
                                                                                        <div key={c.id} className="flex justify-between items-center bg-[#2a2b2e] p-2 rounded text-xs border border-gray-800">
                                                                                            <div className="flex flex-col">
                                                                                                <span className="font-bold truncate text-white">{c.team.classroom.name}</span>
                                                                                                {c.playerName && <span className="text-[9px] text-gray-400">{c.playerName}</span>}
                                                                                            </div>
                                                                                            <div className="flex gap-2 items-center">
                                                                                                <span className="text-gray-300 font-black bg-black/50 px-2 py-0.5 rounded">{c.position ? `${c.position}º` : '-'}</span>
                                                                                                {stage.stageType === "ELIMINACION_DIRECTA" && (match.status === "FINALIZADO" || match.status === "WALKOVER") && (c.position === 1 || c.position === 2) && (
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleSelectWinnerForNextStage(stage.id, c.team.id, c.team.classroom.name, c.team.classroomId, c.team.letter); }} className={`ml-2 px-2 py-0.5 rounded font-black ${isCompSelected ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                                                                                        {isCompSelected ? '✅' : '⚔️'}
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                {(match.competitors?.length || 0) > 3 && (
                                                                                    <div className="text-center text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">
                                                                                        + {(match.competitors?.length || 0) - 3} participantes
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* TABLA DE POSICIONES (Acumulación de Puntos) */}
                                                            {stage.stageType === "ACUMULACION_PUNTOS" && calculateStandings(groupMatches).length > 0 && (
                                                                <div className="mt-3 bg-white rounded-xl overflow-hidden border-2 border-indigo-300 shadow-xl">
                                                                    <div className="bg-indigo-600 text-white text-[11px] font-black uppercase p-2.5 text-center">🏆 Tabla Posiciones / Desempate</div>
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-[11px] text-center whitespace-nowrap">
                                                                            <thead className="bg-indigo-50 font-black text-indigo-900 border-b-2 border-indigo-200">
                                                                                <tr>
                                                                                    <th className="text-left p-2 pl-3">Equipo</th><th className="p-2 w-6">PJ</th><th className="p-2 w-6 text-gray-400">G</th><th className="p-2 w-6 text-gray-400">E</th><th className="p-2 w-6 text-gray-400">P</th><th className="p-2 w-6">GF</th><th className="p-2 w-6 text-gray-400">GC</th><th className="p-2 w-6 bg-indigo-100">DG</th><th className="p-2 w-10 text-indigo-700 text-xs">PTS</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                                                                                {calculateStandings(groupMatches).map((st, idx) => {
                                                                                    const isClasificado = idx < 2;
                                                                                    const isSelected = selectedTeamsForNextStage.some(t => t.teamId === st.teamId);
                                                                                    return (
                                                                                        <tr key={st.teamId} className={`group hover:bg-gray-50 transition-colors ${isSelected ? "bg-indigo-50" : isClasificado ? "bg-green-50/50" : "bg-white"}`}>
                                                                                            <td className="text-left p-2 pl-3">
                                                                                                <div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${isSelected ? 'bg-indigo-600' : isClasificado ? 'bg-green-600' : 'bg-gray-400'}`}>{idx + 1}</span><div className="flex flex-col"><span className={`truncate max-w-[100px] ${isSelected ? 'text-indigo-900 font-black' : isClasificado ? 'text-green-900 font-black' : ''}`}>{st.teamName}</span><span className="text-[9px] text-gray-400 uppercase">Eq. {st.letter}</span></div></div>
                                                                                            </td>
                                                                                            <td className="p-2 font-black">{st.pj}</td><td className="p-2 text-gray-400">{st.pg}</td><td className="p-2 text-gray-400">{st.pe}</td><td className="p-2 text-gray-400">{st.pp}</td><td className="p-2 text-gray-600">{st.gf}</td><td className="p-2 text-gray-400">{st.gc}</td><td className="p-2 bg-indigo-50/50 font-black">{st.dg > 0 ? `+${st.dg}` : st.dg}</td>
                                                                                            <td className="p-2 font-black text-indigo-700 text-sm bg-indigo-50/30">
                                                                                                <div className="flex items-center justify-between gap-2">
                                                                                                    <span>{st.pts}</span>
                                                                                                    <button onClick={() => handleSelectWinnerForNextStage(stage.id, st.teamId, st.teamName, st.classroomId, st.letter)} className={`transition-all rounded p-1 ${isSelected ? 'opacity-100 bg-indigo-600 text-white scale-110' : 'opacity-0 group-hover:opacity-100 bg-gray-200 text-gray-600 hover:bg-indigo-600 hover:text-white'}`}>
                                                                                                        {isSelected ? '❌' : '⚔️'}
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                    <div className="bg-gray-100 p-2 flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase"><span>1° PTS | 2° DG | 3° GF</span><span className="text-indigo-600">👆 Haz clic en 2 equipos para armar llave</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* TABLA DE PUNTUACIÓN GENERAL DE LA DISCIPLINA */}
                        {selectedDisciplineId && globalStandings.length > 0 && (
                            <div className="mt-12 bg-white rounded-2xl shadow-xl border-2 border-indigo-600 overflow-hidden mb-8">
                                <div className="bg-indigo-700 text-white p-6 text-center">
                                    <h2 className="text-2xl font-black uppercase tracking-widest">🏆 Clasificación General: {activeDiscipline?.name}</h2>
                                    <p className="text-indigo-200 text-sm mt-1 font-bold">Suma de Puntos de todas las subcategorías (Finalizadas)</p>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-indigo-50 text-indigo-900 font-black uppercase tracking-wider text-xs border-b-2 border-indigo-200">
                                            <tr>
                                                <th className="p-4 text-center w-16">Rank</th>
                                                <th className="p-4">Aula / Salón</th>
                                                <th className="p-4 text-right">Puntaje Total Absoluto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {globalStandings.map((st: any, idx: number) => (
                                                <tr key={st.classroomId} className={`hover:bg-indigo-50 transition-colors ${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-100' : idx === 2 ? 'bg-orange-50' : ''}`}>
                                                    <td className="p-4 text-center">
                                                        <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-white mx-auto ${idx === 0 ? 'bg-yellow-500 shadow-lg scale-110' : idx === 1 ? 'bg-gray-400 shadow' : idx === 2 ? 'bg-orange-500 shadow' : 'bg-gray-800'}`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-black text-gray-900 text-lg">{st.classroomName}</td>
                                                    <td className="p-4 text-right font-black text-2xl text-indigo-700">{st.totalPts} <span className="text-sm text-gray-500">Pts</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ==========================================
          VISTA DE IMPRESIÓN (Oculta en Web)
      ========================================== */}
            {selectedDisciplineId && (
                <div className="hidden print:block text-black bg-white p-8">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-3xl font-black uppercase mb-2">Reporte de Resultados Oficiales</h1>
                        <h2 className="text-xl font-bold text-gray-800">
                            {activeDiscipline?.name} {activeSubDiscipline ? `- ${activeSubDiscipline.name}` : '(Resumen General)'}
                        </h2>
                        <p className="text-sm font-medium mt-2 text-gray-600">Colegio Unión Internacional - Campeonato 2026</p>
                    </div>

                    {selectedSubDisciplineId && matchesForPrintByStage?.map((stageItem: any) => {
                        const matchesByGroup = stageItem.matches.reduce((acc: any, m: any) => {
                            const gn = m.group?.name || "Fase General / Llaves";
                            if (!acc[gn]) acc[gn] = [];
                            acc[gn].push(m);
                            return acc;
                        }, {});

                        return (
                            <div key={stageItem.stage.id} className="mb-10 page-break-inside-avoid">
                                <h3 className="text-xl font-black uppercase bg-gray-200 p-2 border-l-4 border-black mb-4">
                                    Etapa {stageItem.stage.stageOrder}: {stageItem.stage.name} <span className="text-sm font-normal normal-case italic">({stageItem.stage.stageType.replace("_", " ")})</span>
                                </h3>

                                {Object.entries(matchesByGroup).map(([groupName, groupMatches]: [string, any]) => (
                                    <div key={groupName} className="mb-6 pl-4">
                                        <h4 className="text-lg font-bold mb-3 underline decoration-2 underline-offset-4">{groupName}</h4>

                                        <table className="w-full text-sm border-collapse border border-gray-400 mb-4">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-400 p-2 w-16 text-center">Orden</th>
                                                    <th className="border border-gray-400 p-2 w-24 text-center">Estado</th>
                                                    <th className="border border-gray-400 p-2">Partido / Competencia</th>
                                                    <th className="border border-gray-400 p-2 w-32 text-center">Resultado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupMatches.map((m: Match) => (
                                                    <tr key={m.id}>
                                                        <td className="border border-gray-400 p-2 text-center font-bold">{m.matchOrder}</td>
                                                        <td className="border border-gray-400 p-2 text-center text-xs">{m.status}</td>
                                                        <td className="border border-gray-400 p-2">
                                                            {m.subDiscipline.discipline.format === "ENFRENTAMIENTO" ? (
                                                                <span className="font-bold">
                                                                    {m.homeTeam?.classroom.name} (Eq. {m.homeTeam?.letter}) vs {m.awayTeam?.classroom.name} (Eq. {m.awayTeam?.letter})
                                                                </span>
                                                            ) : (
                                                                <ul className="list-disc pl-4 text-xs font-bold">
                                                                    {m.competitors?.map((c: any) => (
                                                                        <li key={c.id}>
                                                                            {c.position ? `${c.position}º - ` : ""}{c.team.classroom.name} {c.playerName ? `(${c.playerName})` : ""}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </td>
                                                        <td className="border border-gray-400 p-2 text-center font-black">
                                                            {m.subDiscipline.discipline.format === "ENFRENTAMIENTO" ? (
                                                                m.status === "PENDIENTE" ? "- : -" : `${m.homeScore} - ${m.awayScore}`
                                                            ) : (
                                                                "Ver Detalle"
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {stageItem.stage.stageType === "ACUMULACION_PUNTOS" && (
                                            <div className="mt-4 border-2 border-black p-2">
                                                <h5 className="font-black text-center mb-2 uppercase">Tabla de Posiciones Oficial - {groupName}</h5>
                                                <table className="w-full text-sm border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 border-b border-black">
                                                            <th className="p-1 text-left">Equipo</th>
                                                            <th className="p-1 text-center">PJ</th>
                                                            <th className="p-1 text-center">G</th>
                                                            <th className="p-1 text-center">E</th>
                                                            <th className="p-1 text-center">P</th>
                                                            <th className="p-1 text-center">GF</th>
                                                            <th className="p-1 text-center">GC</th>
                                                            <th className="p-1 text-center">DG</th>
                                                            <th className="p-1 text-center font-black">PTS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {calculateStandings(groupMatches).map((st, idx) => (
                                                            <tr key={st.teamId} className="border-b border-gray-300">
                                                                <td className="p-1 font-bold">{idx + 1}. {st.teamName} (Eq. {st.letter})</td>
                                                                <td className="p-1 text-center">{st.pj}</td>
                                                                <td className="p-1 text-center">{st.pg}</td>
                                                                <td className="p-1 text-center">{st.pe}</td>
                                                                <td className="p-1 text-center">{st.pp}</td>
                                                                <td className="p-1 text-center">{st.gf}</td>
                                                                <td className="p-1 text-center">{st.gc}</td>
                                                                <td className="p-1 text-center font-bold">{st.dg}</td>
                                                                <td className="p-1 text-center font-black">{st.pts}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {globalStandings.length > 0 && (
                        <div className="mt-10 page-break-inside-avoid">
                            <h3 className="text-xl font-black uppercase bg-gray-200 p-2 border-l-4 border-black mb-4">🏆 Clasificación General (Suma Puntos)</h3>
                            <table className="w-full text-sm border-collapse border border-gray-400">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-400 p-2 w-16 text-center">Rank</th>
                                        <th className="border border-gray-400 p-2">Aula / Salón</th>
                                        <th className="border border-gray-400 p-2 w-32 text-center">Puntaje Absoluto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {globalStandings.map((st: any, idx: number) => (
                                        <tr key={st.classroomId}>
                                            <td className="border border-gray-400 p-2 text-center font-bold">{idx + 1}</td>
                                            <td className="border border-gray-400 p-2 font-bold">{st.classroomName}</td>
                                            <td className="border border-gray-400 p-2 text-center font-black">{st.totalPts} Pts</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-16 flex justify-around">
                        <div className="text-center">
                            <div className="w-48 border-t border-black mb-2 mx-auto"></div>
                            <p className="text-sm font-bold">Firma del Juez / Árbitro</p>
                        </div>
                        <div className="text-center">
                            <div className="w-48 border-t border-black mb-2 mx-auto"></div>
                            <p className="text-sm font-bold">Mesa de Control</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
          MODALES (Ocultos al imprimir)
      ========================================== */}

            {/* BANNER FLOTANTE DE ARMADO DE LLAVES */}
            {selectedTeamsForNextStage.length > 0 && (
                <div className="print:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.4)] z-40 flex items-center gap-4 border-2 border-indigo-500 animate-[bounce_1s_ease-in-out_infinite]">
                    <span className="font-black text-sm uppercase tracking-widest hidden md:inline">Armando Llave:</span>
                    <div className="bg-indigo-900/50 px-4 py-1.5 rounded-full text-indigo-200 font-black border border-indigo-500">{selectedTeamsForNextStage[0].teamName}</div>
                    <span className="text-gray-500 italic font-black text-lg">VS</span>
                    <div className="bg-gray-800 px-4 py-1.5 rounded-full text-gray-400 font-black border border-dashed border-gray-600">Esperando rival...</div>
                    <button onClick={() => setSelectedTeamsForNextStage([])} className="ml-2 text-red-400 hover:text-white font-bold bg-red-400/10 hover:bg-red-500 transition-colors px-3 py-1 rounded-full text-xs">Cancelar</button>
                </div>
            )}

            {/* MODAL DETALLES DEL PARTIDO (ACTUALIZAR RESULTADOS) */}
            {isMatchModalOpen && selectedMatch && (
                <div className="print:hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gray-900 text-white p-5 shrink-0 relative">
                            <button onClick={() => setIsMatchModalOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <h2 className="font-black text-xl uppercase tracking-wider">{selectedMatch.subDiscipline.discipline.name} - {selectedMatch.subDiscipline.name}</h2>
                            <p className="text-sm font-bold text-indigo-400">{selectedMatch.stage?.name} {selectedMatch.group ? `| ${selectedMatch.group.name}` : ""}</p>
                        </div>

                        <div className="flex border-b-2 border-gray-200 shrink-0 bg-gray-50">
                            <button onClick={() => setActiveModalTab("RESULTADOS")} className={`flex-1 py-3 text-sm font-black uppercase ${activeModalTab === "RESULTADOS" ? "bg-white text-indigo-700 border-b-4 border-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>Resultado</button>
                            <button onClick={() => setActiveModalTab("NOMINAS")} className={`flex-1 py-3 text-sm font-black uppercase ${activeModalTab === "NOMINAS" ? "bg-white text-indigo-700 border-b-4 border-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}>Nóminas</button>
                        </div>

                        <div className="overflow-y-auto flex-1 bg-white">
                            {activeModalTab === "RESULTADOS" && (
                                <form onSubmit={handleSaveResult} className="p-6">
                                    <div className="grid grid-cols-2 gap-5 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Estado</label>
                                            <select className="w-full border-2 rounded-lg p-2.5 font-bold" value={status} onChange={(e) => setStatus(e.target.value)}>
                                                <option value="PENDIENTE">PENDIENTE</option>
                                                <option value="EN_JUEGO">EN JUEGO</option>
                                                <option value="FINALIZADO">FINALIZADO</option>
                                                <option value="WALKOVER">WALKOVER</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Observación</label>
                                            <input type="text" className="w-full border-2 rounded-lg p-2.5 font-medium" placeholder="Opcional..." value={observation} onChange={(e) => setObservation(e.target.value)} />
                                        </div>
                                    </div>

                                    {selectedMatch.subDiscipline.discipline.format === "ENFRENTAMIENTO" ? (
                                        <div className="flex justify-around items-center py-8">
                                            <div className="text-center w-5/12">
                                                <p className="font-black text-xl mb-1">{selectedMatch.homeTeam?.classroom.name}</p>
                                                <p className="text-sm font-bold text-gray-500 mb-3">(Eq. {selectedMatch.homeTeam?.letter})</p>
                                                <input type="number" min="0" className="w-32 text-center text-5xl font-black border-2 border-gray-300 rounded-2xl p-4 text-gray-900 focus:border-indigo-600 bg-gray-50 shadow-inner" value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} />
                                            </div>
                                            <div className="text-gray-300 font-black text-3xl italic">VS</div>
                                            <div className="text-center w-5/12">
                                                <p className="font-black text-xl mb-1">{selectedMatch.awayTeam?.classroom.name}</p>
                                                <p className="text-sm font-bold text-gray-500 mb-3">(Eq. {selectedMatch.awayTeam?.letter})</p>
                                                <input type="number" min="0" className="w-32 text-center text-5xl font-black border-2 border-gray-300 rounded-2xl p-4 text-gray-900 focus:border-indigo-600 bg-gray-50 shadow-inner" value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
                                            <table className="w-full text-left text-sm border-collapse">
                                                <thead className="bg-gray-100 text-gray-700 font-black sticky top-0 shadow-sm">
                                                    <tr>
                                                        <th className="p-3">Salón y Atleta</th>
                                                        <th className="p-3 text-center">Marca (Seg)</th>
                                                        <th className="p-3 text-center">Puesto</th>
                                                        <th className="p-3 text-center">Pts</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {competitorsData.map((c, idx) => {
                                                        const originalComp = selectedMatch.competitors?.find(comp => comp.id === c.id);
                                                        const classPlayers = originalComp?.team.players || [];
                                                        return (
                                                            <tr key={c.id} className="border-b border-gray-100">
                                                                <td className="p-3">
                                                                    <div className="font-black mb-1 text-gray-900">{c.teamName}</div>
                                                                    <select className="w-full border-2 border-gray-200 rounded p-1 text-xs font-bold text-gray-700" value={c.playerName || ""} onChange={(e) => handleCompetitorChange(idx, "playerName", e.target.value)}>
                                                                        <option value="">-- Seleccionar Atleta --</option>
                                                                        {classPlayers.map((tp: any) => (
                                                                            <option key={tp.player.dni} value={`${tp.player.lastName}, ${tp.player.firstName}`}>
                                                                                {tp.player.lastName}, {tp.player.firstName}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input type="number" step="0.01" className="w-20 border-2 rounded-lg p-1.5 text-center font-bold" value={c.score} onChange={(e) => handleCompetitorChange(idx, "score", e.target.value)} />
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input type="number" min="1" className="w-16 border-2 rounded-lg p-1.5 text-center font-bold" value={c.position} onChange={(e) => handleCompetitorChange(idx, "position", e.target.value)} />
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input type="number" className="w-16 border-2 border-indigo-200 bg-indigo-50 text-indigo-800 font-black rounded-lg p-1.5 text-center" value={c.points} onChange={(e) => handleCompetitorChange(idx, "points", e.target.value)} />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="mt-8 flex justify-end">
                                        <button type="submit" className="w-full md:w-auto px-8 py-3 bg-gray-900 text-white rounded-xl font-black uppercase hover:bg-black">
                                            Guardar Resultado
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeModalTab === "NOMINAS" && (
                                <div className="p-6">
                                    {selectedMatch.subDiscipline.discipline.format === "ENFRENTAMIENTO" ? (
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {selectedMatch.homeTeam && <TeamPlayersViewer team={selectedMatch.homeTeam} />}
                                            {selectedMatch.awayTeam && <TeamPlayersViewer team={selectedMatch.awayTeam} />}
                                        </div>
                                    ) : (
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {selectedMatch.competitors?.map((c: any) => <div key={c.id}><TeamPlayersViewer team={c.team} /></div>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PROGRAMAR NUEVO EVENTO / ARMAR LLAVE */}
            {isCreateModalOpen && (
                <div className="print:hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                        <div className="bg-gray-900 text-white p-5 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-xl uppercase tracking-wider">Programar Evento</h2>
                            <button onClick={() => { setIsCreateModalOpen(false); setSelectedTeamsForNextStage([]); }} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleScheduleMatch} className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-5 mb-5 bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Subdisciplina a Jugar</label>
                                    <select required className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold focus:border-indigo-500 bg-white" value={newMatch.subDisciplineId} onChange={(e) => handleCreateChange("subDisciplineId", e.target.value)}>
                                        <option value="">Seleccione...</option>
                                        {disciplines.map(d => (
                                            <optgroup key={d.id} label={`${d.name} (${d.audience})`} className="font-black text-indigo-900">
                                                {d.subDisciplines.map((s: any) => (
                                                    <option key={s.id} value={s.id} className="font-medium text-gray-800">{s.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Etapa (Fase del Torneo)</label>
                                    <select required className="w-full border-2 border-indigo-300 rounded-lg p-3 text-indigo-900 font-black bg-indigo-50 disabled:opacity-50" value={newMatch.stageId} onChange={(e) => handleCreateChange("stageId", e.target.value)} disabled={!newMatchActiveSub}>
                                        <option value="">{newMatchActiveSub ? "Seleccione la etapa..." : "Primero seleccione subdisciplina"}</option>
                                        {newMatchActiveSub?.stages?.map((st: any) => (
                                            <option key={st.id} value={st.id}>{st.stageOrder}. {st.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Grupo de Aulas</label>
                                    <select className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold bg-white focus:border-indigo-500" value={newMatch.groupId} onChange={(e) => handleCreateChange("groupId", e.target.value)}>
                                        <option value="">Todos los grupos</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Orden / Llave</label>
                                    <input type="number" min="1" required className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold bg-white focus:border-indigo-500 text-center" value={newMatch.matchOrder} onChange={(e) => handleCreateChange("matchOrder", Number(e.target.value))} />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Cancha / Lugar</label>
                                    <input type="text" required className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold bg-white focus:border-indigo-500" value={newMatch.court} onChange={(e) => handleCreateChange("court", e.target.value)} />
                                </div>
                            </div>

                            {newMatch.subDisciplineId && (
                                <div className="mt-6 border-t border-gray-200 pt-6">
                                    <h3 className="font-black text-indigo-900 mb-4 text-lg">Aulas Participantes</h3>

                                    {newMatch.format === "ENFRENTAMIENTO" ? (
                                        <div className="flex gap-4">
                                            <div className="w-1/2 flex flex-col gap-2">
                                                <label className="block text-xs font-black text-gray-500 uppercase bg-indigo-100 p-2 text-center rounded text-indigo-900">🏠 Local</label>
                                                <select required className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold focus:border-indigo-500" value={newMatch.homeClassroomId} onChange={(e) => handleCreateChange("homeClassroomId", e.target.value)}>
                                                    <option value="">Aula Local...</option>
                                                    {filteredClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <select required className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold focus:border-indigo-500 bg-gray-50" value={newMatch.homeTeamLetter} onChange={(e) => handleCreateChange("homeTeamLetter", e.target.value)}>
                                                    <option value="A">Equipo A</option>
                                                    <option value="B">Equipo B</option>
                                                    <option value="C">Equipo C</option>
                                                </select>
                                            </div>
                                            <div className="w-1/2 flex flex-col gap-2">
                                                <label className="block text-xs font-black text-gray-500 uppercase bg-red-100 p-2 text-center rounded text-red-900">✈️ Visitante</label>
                                                <select className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold focus:border-indigo-500" value={newMatch.awayClassroomId} onChange={(e) => handleCreateChange("awayClassroomId", e.target.value)}>
                                                    <option value="">Por definir (Llave abierta)</option>
                                                    {filteredClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <select className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 font-bold focus:border-indigo-500 bg-gray-50" value={newMatch.awayTeamLetter} onChange={(e) => handleCreateChange("awayTeamLetter", e.target.value)}>
                                                    <option value="A">Equipo A</option>
                                                    <option value="B">Equipo B</option>
                                                    <option value="C">Equipo C</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 mb-3 uppercase">Seleccionar Competidores</label>
                                            <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-xl p-3 grid grid-cols-2 gap-3 bg-gray-50">
                                                {filteredClassrooms.map(c => (
                                                    <label key={c.id} className="flex items-center space-x-3 bg-white p-3 border border-gray-200 shadow-sm rounded-lg cursor-pointer hover:border-indigo-500 transition-all">
                                                        <input type="checkbox" checked={newMatch.classroomIds.includes(c.id)} onChange={() => handleClassroomMultiSelect(c.id)} className="w-5 h-5 rounded text-indigo-600" />
                                                        <span className="text-sm font-bold text-gray-900">{c.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end mt-8">
                                <button type="submit" disabled={!newMatch.subDisciplineId || !newMatch.stageId || (newMatch.format === "COMPETENCIA" && newMatch.classroomIds.length === 0)} className="w-full md:w-auto px-8 py-3 bg-indigo-700 text-white rounded-xl font-black uppercase disabled:opacity-50">
                                    Guardar Evento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}