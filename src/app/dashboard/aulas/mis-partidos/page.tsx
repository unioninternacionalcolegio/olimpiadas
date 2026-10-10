"use client";

import { useState, useEffect } from "react";

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

export default function MisPartidosPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [studentSurnames, setStudentSurnames] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Filtros
    const [selectedDiscipline, setSelectedDiscipline] = useState("");
    const [selectedTeamLetter, setSelectedTeamLetter] = useState("");

    // Modal de Nómina
    const [selectedMatch, setSelectedMatch] = useState<any>(null);

    useEffect(() => {
        fetchMyFixture();
    }, []);

    const fetchMyFixture = async () => {
        try {
            const res = await fetch("/api/my-matches");
            if (res.ok) {
                const data = await res.json();
                setMatches(data.matches);

                // Inteligencia: Extraer apellidos de los estudiantes para detectar padres adoptivos
                const surnames = new Set<string>();
                data.myClassroomTeams.forEach((team: any) => {
                    team.players.forEach((tp: any) => {
                        if (!tp.player.isParent) {
                            const parts = tp.player.lastName.trim().split(/\s+/);
                            parts.forEach((part: string) => surnames.add(normalizeString(part)));
                        }
                    });
                });
                setStudentSurnames(surnames);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Extraer disciplinas únicas para el filtro
    const uniqueDisciplines = Array.from(new Set(matches.map(m => m.subDiscipline.discipline.name)));

    // Filtrar los partidos
    const filteredMatches = matches.filter(m => {
        const matchDiscipline = m.subDiscipline.discipline.name;
        // Revisar si la letra está en el equipo Home, Away o Competidor
        const hasLetter =
            (!selectedTeamLetter) ||
            (m.homeTeam?.letter === selectedTeamLetter) ||
            (m.awayTeam?.letter === selectedTeamLetter) ||
            (m.competitors?.some((c: any) => c.team?.letter === selectedTeamLetter));

        return (selectedDiscipline === "" || matchDiscipline === selectedDiscipline) && hasLetter;
    });

    // Funciones de Inteligencia para la UI
    const maskDNI = (dni: string) => `****${dni.slice(-4)}`;

    const renderParentBadge = (player: any) => {
        if (!player.isParent) return null;
        const firstSurname = normalizeString(player.lastName.trim().split(/\s+/)[0]);
        const isAdoptive = !studentSurnames.has(firstSurname);

        if (isAdoptive) {
            return <span className="text-[10px] bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">🤝 Unión / P. Adoptivo</span>;
        }
        return <span className="text-[10px] bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap">👨‍👦 Padre Biológico</span>;
    };

    const renderDuplicateBadge = (player: any, currentSubDisciplineId: string, currentTeamId: string) => {
        // Verifica si los equipos vienen del API
        if (!player.teams) return null;

        const otherTeams = player.teams.filter((t: any) =>
            t.team.subDisciplineId === currentSubDisciplineId && t.teamId !== currentTeamId
        );

        if (otherTeams.length > 0) {
            const letters = otherTeams.map((t: any) => t.team.letter).join(', ');
            return <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm block mt-1 text-center w-fit">🚨 Juega en Eq. {letters}</span>;
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#0B1A28] text-white p-4 md:p-8 font-sans">
            {/* ENCABEZADO ESTILO FIXTURE */}
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest drop-shadow-lg mb-2">FIXTURE</h1>
                <h2 className="text-xl md:text-2xl font-bold text-[#00E5FF] uppercase tracking-widest">Copa Colegio Unión Internacional</h2>
                <div className="mt-4 flex justify-center gap-2">
                    <span className="bg-white/10 px-4 py-1 rounded-full text-sm font-bold text-gray-300 backdrop-blur-sm border border-white/20">Mis Partidos Oficiales</span>
                </div>
            </div>

            {/* FILTROS */}
            <div className="max-w-4xl mx-auto bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md mb-10 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Filtrar Disciplina</label>
                    <select
                        value={selectedDiscipline}
                        onChange={(e) => setSelectedDiscipline(e.target.value)}
                        className="w-full bg-[#1A2C3D] border border-white/20 rounded-xl p-3 font-bold text-white focus:outline-none focus:border-[#00E5FF]"
                    >
                        <option value="">Todas las disciplinas</option>
                        {uniqueDisciplines.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Filtrar Equipo (A, B, C)</label>
                    <select
                        value={selectedTeamLetter}
                        onChange={(e) => setSelectedTeamLetter(e.target.value)}
                        className="w-full bg-[#1A2C3D] border border-white/20 rounded-xl p-3 font-bold text-white focus:outline-none focus:border-[#00E5FF]"
                    >
                        <option value="">Todos los equipos</option>
                        <option value="A">Equipo A</option>
                        <option value="B">Equipo B</option>
                        <option value="C">Equipo C</option>
                    </select>
                </div>
            </div>

            {/* LISTA DE PARTIDOS */}
            {isLoading ? (
                <div className="text-center py-20 text-[#00E5FF] font-bold animate-pulse text-xl">Cargando fixture...</div>
            ) : filteredMatches.length === 0 ? (
                <div className="text-center py-20 text-gray-500 font-bold text-xl">No hay partidos programados para tu salón con estos filtros.</div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                    {filteredMatches.map((match) => {
                        const isCompetencia = !match.homeTeam && match.competitors && match.competitors.length > 0;

                        return (
                            <div key={match.id} className="relative bg-white rounded-[2.5rem] shadow-2xl p-2 md:p-6 flex flex-col items-center justify-between border-4 border-gray-100 hover:scale-[1.02] transition-transform duration-300 pb-8">

                                {/* CABECERA COMÚN */}
                                <div className="absolute top-0 right-6 bg-[#0B1A28] text-white text-[10px] font-bold px-4 py-1.5 rounded-b-xl uppercase tracking-widest shadow-md">
                                    {match.subDiscipline.discipline.name} - {match.subDiscipline.name}
                                </div>

                                {isCompetencia ? (
                                    /* === DISEÑO PARA ATLETISMO (COMPETENCIA) === */
                                    <div className="w-full flex flex-col items-center mt-6">
                                        <div className="text-3xl md:text-4xl font-black text-[#00E5FF] italic mb-3" style={{ WebkitTextStroke: '1.5px #0B1A28' }}>COMPETENCIA</div>
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">{match.competitors.length} Equipos Participantes</p>

                                        <div className="flex flex-wrap justify-center gap-3">
                                            {match.competitors.map((comp: any) => (
                                                <div key={comp.id} className="bg-gray-100 border-2 border-gray-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                                                    <span className="text-xl">🏃</span>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{comp.team?.classroom?.name || "Sin Aula"}</p>
                                                        <p className="text-[10px] font-bold text-gray-500">EQUIPO {comp.team?.letter || "?"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* === DISEÑO PARA ENFRENTAMIENTOS 1vs1 === */
                                    <div className="w-full flex flex-col md:flex-row items-center justify-between mt-4">
                                        {/* EQUIPO LOCAL */}
                                        <div className="flex-1 w-full flex items-center justify-center md:justify-end gap-3 md:gap-4 p-2 text-center md:text-right">
                                            <div>
                                                <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight uppercase">
                                                    {match.homeTeam ? match.homeTeam.classroom.name : "Por definir"}
                                                </h3>
                                                <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Eq. {match.homeTeam?.letter || "?"}</p>
                                            </div>
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center border-4 border-white shadow-md text-2xl">
                                                🛡️
                                            </div>
                                        </div>

                                        {/* EL "VS" CENTRAL */}
                                        <div className="flex flex-col items-center justify-center px-4 py-2 md:py-0 z-10">
                                            <span className="text-4xl md:text-5xl font-black text-[#00E5FF] drop-shadow-md italic" style={{ WebkitTextStroke: '1.5px #0B1A28' }}>VS</span>
                                        </div>

                                        {/* EQUIPO VISITANTE */}
                                        <div className="flex-1 w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 p-2 text-center md:text-left flex-row-reverse md:flex-row">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center border-4 border-white shadow-md text-2xl">
                                                ⚔️
                                            </div>
                                            <div>
                                                <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight uppercase">
                                                    {match.awayTeam ? match.awayTeam.classroom.name : "Por definir"}
                                                </h3>
                                                <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Eq. {match.awayTeam?.letter || "?"}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* BOTÓN VER NÓMINAS */}
                                <button
                                    onClick={() => setSelectedMatch(match)}
                                    className="absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#00E5FF] to-blue-500 text-black font-black px-6 py-1.5 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform uppercase text-xs tracking-wider"
                                >
                                    Ver Nóminas
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE NÓMINAS (INTELIGENTE Y DINÁMICO) */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-[#00E5FF]">

                        {/* Header del Modal */}
                        <div className="bg-[#0B1A28] p-4 flex justify-between items-center shrink-0 border-b-4 border-[#00E5FF]">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{selectedMatch.subDiscipline.discipline.name} - {selectedMatch.subDiscipline.name}</h2>
                                <p className="text-[#00E5FF] font-bold text-sm mt-1">Cancha: {selectedMatch.court} | Etapa: {selectedMatch.stage?.name}</p>
                            </div>
                            <button onClick={() => setSelectedMatch(null)} className="bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        {/* Contenido (Nóminas extraídas dinámicamente) */}
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {(() => {
                                    // 1. Recolectar todos los equipos a mostrar sin repetirlos
                                    const teamsToShow: any[] = [];
                                    if (selectedMatch.homeTeam) teamsToShow.push(selectedMatch.homeTeam);
                                    if (selectedMatch.awayTeam) teamsToShow.push(selectedMatch.awayTeam);

                                    if (selectedMatch.competitors) {
                                        selectedMatch.competitors.forEach((comp: any) => {
                                            if (comp.team && !teamsToShow.find(t => t.id === comp.team.id)) {
                                                teamsToShow.push(comp.team);
                                            }
                                        });
                                    }

                                    if (teamsToShow.length === 0) {
                                        return <p className="col-span-full text-center text-gray-500 font-bold italic py-10">Ningún equipo ha registrado su nómina aún.</p>;
                                    }

                                    // 2. Dibujar una tarjeta de tabla por cada equipo
                                    return teamsToShow.map(team => (
                                        <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                                            <div className="bg-gray-200 text-gray-900 p-3 font-black text-center border-b border-gray-300 uppercase">
                                                {team.classroom?.name || "Sin Aula"} (Eq. {team.letter})
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {team.players && team.players.length > 0 ? (
                                                    team.players.map((tp: any, idx: number) => (
                                                        <div key={tp.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-black text-gray-500 text-xs shrink-0">
                                                                    {tp.jerseyNumber ? `👕${tp.jerseyNumber}` : idx + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="font-black text-gray-900 text-sm leading-tight">{tp.player.lastName}, {tp.player.firstName}</p>
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        <span className="font-mono text-xs text-gray-500 font-bold">{maskDNI(tp.player.dni)}</span>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${tp.isStarter ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                            {tp.isStarter ? 'TITULAR' : 'SUPLENTE'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1.5 flex gap-1 flex-wrap">
                                                                        {renderParentBadge(tp.player)}
                                                                        {renderDuplicateBadge(tp.player, selectedMatch.subDisciplineId, team.id)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="p-4 text-center text-gray-400 font-bold italic text-sm">Nómina no registrada</p>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}