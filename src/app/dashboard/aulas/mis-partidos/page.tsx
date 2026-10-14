"use client";

import { useState, useEffect } from "react";

export default function MisPartidosPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtros
    const [audienceFilter, setAudienceFilter] = useState("");
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
        const matchAudience = m.subDiscipline.discipline.audience;

        const hasAudience = audienceFilter === "" || matchAudience === audienceFilter;
        const hasDiscipline = selectedDiscipline === "" || matchDiscipline === selectedDiscipline;
        
        // Revisar si la letra está en el equipo Home, Away o Competidor
        const hasLetter =
            (!selectedTeamLetter) ||
            (m.homeTeam?.letter === selectedTeamLetter) ||
            (m.awayTeam?.letter === selectedTeamLetter) ||
            (m.competitors?.some((c: any) => c.team?.letter === selectedTeamLetter));

        return hasAudience && hasDiscipline && hasLetter;
    });

    // Funciones de UI
    const maskDNI = (dni: string) => `****${dni.slice(-4)}`;

    const renderParentBadge = (player: any) => {
        if (!player.isParent) return null;
        return (
            <span className="text-[9px] bg-green-100 text-green-800 border border-green-400 px-2 py-0.5 rounded font-black tracking-widest uppercase shadow-sm whitespace-nowrap mt-1 inline-block">
                👨‍👦 PADRE / APODERADO
            </span>
        );
    };

    const renderDuplicateBadge = (player: any, currentSubDisciplineId: string, currentTeamId: string) => {
        if (!player.teams) return null;

        const otherTeams = player.teams.filter((t: any) =>
            t.team.subDisciplineId === currentSubDisciplineId && t.teamId !== currentTeamId
        );

        if (otherTeams.length > 0) {
            const letters = otherTeams.map((t: any) => t.team.letter).join(', ');
            return (
                <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-black shadow-sm mt-1 inline-block uppercase tracking-widest whitespace-nowrap">
                    🚨 Juega en Eq. {letters}
                </span>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#0B1A28] text-white p-4 md:p-8 font-sans">
            {/* ENCABEZADO ESTILO FIXTURE */}
            <div className="text-center mb-8 relative">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest drop-shadow-lg mb-2">FIXTURE</h1>
                <h2 className="text-xl md:text-2xl font-bold text-[#00E5FF] uppercase tracking-widest">Copa Colegio Unión Internacional</h2>
                <div className="mt-4 flex justify-center gap-2">
                    <span className="bg-white/10 text-[#00E5FF] px-4 py-1.5 rounded-full text-xs font-black border border-white/20 uppercase tracking-widest backdrop-blur-sm">
                        ⚔️ Mis Partidos Oficiales
                    </span>
                </div>
            </div>

            {/* FILTROS */}
            <div className="max-w-5xl mx-auto bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md mb-10 flex flex-col md:flex-row gap-4 shadow-xl">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">1. Categoría</label>
                    <select
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value)}
                        className="w-full bg-[#1A2C3D] border border-white/10 rounded-2xl p-3.5 font-bold text-white focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all"
                    >
                        <option value="">Todos los públicos</option>
                        <option value="ESTUDIANTES">Estudiantes</option>
                        <option value="PADRES">Padres</option>
                        <option value="MIXTO">Mixto</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">2. Disciplina</label>
                    <select
                        value={selectedDiscipline}
                        onChange={(e) => setSelectedDiscipline(e.target.value)}
                        className="w-full bg-[#1A2C3D] border border-white/10 rounded-2xl p-3.5 font-bold text-white focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all"
                    >
                        <option value="">Todas las disciplinas</option>
                        {uniqueDisciplines.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">3. Equipo</label>
                    <select
                        value={selectedTeamLetter}
                        onChange={(e) => setSelectedTeamLetter(e.target.value)}
                        className="w-full bg-[#1A2C3D] border border-white/10 rounded-2xl p-3.5 font-bold text-white focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all"
                    >
                        <option value="">Todos mis equipos (A, B, C)</option>
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
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 max-w-4xl mx-auto shadow-inner">
                    <div className="text-5xl mb-4 opacity-50">🏟️</div>
                    <p className="text-gray-400 font-bold text-lg">No hay partidos programados con estos filtros.</p>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                    {filteredMatches.map((match) => {
                        const isCompetencia = !match.homeTeam && match.competitors && match.competitors.length > 0;
                        const groupName = match.group?.name || "Fase de Llaves";
                        
                        // Estados del partido
                        const isFinished = match.status === "FINALIZADO" || match.status === "WALKOVER";
                        const isPlaying = match.status === "EN_JUEGO";

                        return (
                            <div key={match.id} className="relative bg-white rounded-[2.5rem] shadow-2xl p-3 md:p-6 flex flex-col items-center justify-between border-4 border-gray-100 hover:scale-[1.02] transition-transform duration-300 pb-10">

                                {/* CABECERA COMÚN */}
                                <div className="absolute top-0 right-6 bg-[#0B1A28] text-[#00E5FF] text-[10px] font-black px-4 py-1.5 rounded-b-xl uppercase tracking-widest shadow-md border-x-2 border-b-2 border-[#00E5FF]">
                                    {match.subDiscipline.discipline.name} - {match.subDiscipline.name}
                                </div>

                                {/* ETIQUETA DE ETAPA IZQUIERDA */}
                                <div className="absolute top-0 left-6 bg-gray-200 text-gray-800 text-[10px] font-black px-4 py-1.5 rounded-b-xl uppercase tracking-widest shadow-md">
                                    {match.stage?.name || 'Clasificatorias'}
                                </div>

                                {isCompetencia ? (
                                    /* === DISEÑO PARA ATLETISMO (COMPETENCIA) === */
                                    <div className="w-full flex flex-col items-center mt-10">
                                        <div className="text-3xl md:text-4xl font-black text-[#00E5FF] italic mb-1" style={{ WebkitTextStroke: '1.5px #0B1A28' }}>COMPETENCIA</div>
                                        
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="bg-[#0B1A28] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                                                {groupName} • {match.competitors.length} Participantes
                                            </div>
                                            {isFinished && <div className="bg-gray-200 text-gray-800 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">FINALIZADO</div>}
                                            {isPlaying && <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">EN VIVO</div>}
                                        </div>

                                        <div className="flex flex-wrap justify-center gap-3">
                                            {match.competitors.map((comp: any) => {
                                                const hasPosition = isFinished && comp.position;
                                                const medal = comp.position === 1 ? '🥇' : comp.position === 2 ? '🥈' : comp.position === 3 ? '🥉' : '🏃';

                                                return (
                                                    <div key={comp.id} className={`border-2 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm ${hasPosition && comp.position <= 3 ? 'bg-[#E6FCFF] border-[#00E5FF]' : 'bg-gray-100 border-gray-200'}`}>
                                                        <span className="text-2xl">{medal}</span>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-sm">{comp.team?.classroom?.name || "Sin Aula"}</p>
                                                            <p className="text-[10px] font-bold text-gray-500">EQUIPO {comp.team?.letter || "?"}</p>
                                                        </div>
                                                        {hasPosition && (
                                                            <div className="ml-2 bg-[#0B1A28] text-[#00E5FF] px-2 py-1 rounded font-black text-xs">
                                                                {comp.position}º
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    /* === DISEÑO PARA ENFRENTAMIENTOS 1vs1 === */
                                    <div className="w-full flex flex-col md:flex-row items-center justify-between mt-8">
                                        {/* EQUIPO LOCAL */}
                                        <div className="flex-1 w-full flex items-center justify-center md:justify-end gap-3 md:gap-4 p-2 text-center md:text-right">
                                            <div>
                                                <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight uppercase">
                                                    {match.homeTeam ? match.homeTeam.classroom.name : "Por definir"}
                                                </h3>
                                                <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Eq. {match.homeTeam?.letter || "?"}</p>
                                            </div>
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center border-4 border-white shadow-md text-2xl">
                                                🛡️
                                            </div>
                                        </div>

                                        {/* EL "VS" O EL RESULTADO CENTRAL */}
                                        <div className="flex flex-col items-center justify-center px-4 py-2 md:py-0 z-10 min-w-[120px]">
                                            {(isFinished || isPlaying) ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-4xl md:text-6xl font-black text-[#00E5FF] drop-shadow-md tracking-widest" style={{ WebkitTextStroke: '1.5px #0B1A28' }}>
                                                        {match.homeScore} - {match.awayScore}
                                                    </span>
                                                    {isPlaying && <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded animate-pulse mt-1 tracking-widest">EN VIVO</span>}
                                                    {isFinished && <span className="text-[10px] bg-gray-200 text-gray-800 font-black px-2 py-0.5 rounded mt-1 tracking-widest">FINALIZADO</span>}
                                                </div>
                                            ) : (
                                                <span className="text-4xl md:text-5xl font-black text-[#00E5FF] drop-shadow-md italic" style={{ WebkitTextStroke: '1.5px #0B1A28' }}>VS</span>
                                            )}
                                            
                                            <div className="bg-[#0B1A28] text-white text-[9px] font-black px-3 py-1 rounded-full mt-2 uppercase tracking-widest whitespace-nowrap shadow-sm border border-gray-700">
                                                {groupName}
                                            </div>
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
                                                <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Eq. {match.awayTeam?.letter || "?"}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* BOTÓN VER NÓMINAS (ACTUALMENTE OCULTO) */}
                                {/* 
                                <button
                                    onClick={() => setSelectedMatch(match)}
                                    className="absolute bottom-[-16px] left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#00E5FF] to-blue-500 text-[#0B1A28] font-black px-8 py-2 rounded-full shadow-lg border-2 border-white hover:scale-110 hover:shadow-cyan-500/50 transition-all uppercase text-[11px] tracking-widest"
                                >
                                    Ver Nóminas
                                </button>
                                */}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE NÓMINAS (Dejado en el código por si lo reactivas luego) */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-[#0B1A28]/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,229,255,0.2)] border-4 border-[#00E5FF]">

                        {/* Header del Modal */}
                        <div className="bg-[#0B1A28] p-5 flex justify-between items-center shrink-0 border-b-4 border-[#00E5FF]">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
                                    {selectedMatch.subDiscipline.discipline.name} - {selectedMatch.subDiscipline.name}
                                </h2>
                                <p className="text-[#00E5FF] font-bold text-xs md:text-sm mt-1.5 uppercase tracking-widest">
                                    📍 {selectedMatch.court} | 🏆 {selectedMatch.stage?.name} {selectedMatch.group ? `| 🏷️ ${selectedMatch.group.name}` : ''}
                                </p>
                            </div>
                            <button onClick={() => setSelectedMatch(null)} className="bg-white/10 hover:bg-red-500 text-white rounded-full p-2 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {(() => {
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

                                    return teamsToShow.map(team => (
                                        <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                                            <div className="bg-[#0B1A28] text-[#00E5FF] p-3 font-black text-center border-b-4 border-[#00E5FF] uppercase tracking-widest text-sm">
                                                {team.classroom?.name || "Sin Aula"} <span className="text-gray-400 text-[10px]">(Eq. {team.letter})</span>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {team.players && team.players.length > 0 ? (
                                                    team.players.map((tp: any, idx: number) => (
                                                        <div key={tp.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-[#E6FCFF]/50 rounded-lg transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 flex items-center justify-center bg-[#0B1A28] text-[#00E5FF] rounded-full font-black text-xs shrink-0 shadow-inner">
                                                                    {tp.jerseyNumber ? `👕${tp.jerseyNumber}` : idx + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="font-black text-[#0B1A28] text-sm leading-tight uppercase">{tp.player.lastName}, {tp.player.firstName}</p>
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{maskDNI(tp.player.dni)}</span>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border ${tp.isStarter ? 'bg-[#0B1A28] text-[#00E5FF] border-[#0B1A28]' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                                                            {tp.isStarter ? 'TITULAR' : 'SUPLENTE'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1 flex gap-1 flex-wrap">
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