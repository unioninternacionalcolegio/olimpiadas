"use client";

import { useState, useEffect } from "react";

type Player = {
    isStarter: boolean;
    player: { firstName: string; lastName: string; dni: string; isParent: boolean };
};

type TeamWithPlayers = {
    id: string;
    name: string;
    letter: string;
    classroom: { id: string; name: string };
    players: Player[];
};

type Stage = {
    id: string;
    name: string;
};

type Match = {
    id: string;
    stage: Stage;
    court: string;
    matchOrder: number;
    status: "PENDIENTE" | "EN_JUEGO" | "FINALIZADO" | "WALKOVER";
    homeScore: number;
    awayScore: number;
    observation: string;
    group?: { name: string };
    subDiscipline: {
        name: string;
        discipline: { name: string; format: "ENFRENTAMIENTO" | "COMPETENCIA"; audience: string };
    };
    homeTeam?: TeamWithPlayers;
    awayTeam?: TeamWithPlayers;
    competitors?: {
        id: string;
        score: number;
        position: number | null;
        team: TeamWithPlayers;
    }[];
};

type Classroom = { id: string; name: string };

export default function MisPartidosPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    const [isNominasModalOpen, setIsNominasModalOpen] = useState(false);
    // CORRECCIÓN: Match | null (Antes estaba "Match null |")
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    useEffect(() => {
        fetchClassrooms();
    }, []);

    useEffect(() => {
        if (selectedClassroomId) {
            fetchMatches(selectedClassroomId);
        } else {
            setMatches([]);
            setIsLoading(false);
        }
    }, [selectedClassroomId]);

    const fetchClassrooms = async () => {
        try {
            const res = await fetch("/api/classrooms");
            if (res.ok) setClassrooms(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchMatches = async (classroomId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/matches?classroomId=${classroomId}`);
            if (res.ok) setMatches(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (s: string) => {
        switch (s) {
            case "PENDIENTE": return <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded text-xs font-bold border border-yellow-300">PENDIENTE</span>;
            case "EN_JUEGO": return <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-bold border border-blue-300">EN JUEGO</span>;
            case "FINALIZADO": return <span className="bg-green-200 text-green-900 px-2 py-1 rounded text-xs font-bold border border-green-300">FINALIZADO</span>;
            case "WALKOVER": return <span className="bg-red-200 text-red-900 px-2 py-1 rounded text-xs font-bold border border-red-300">W.O.</span>;
            default: return null;
        }
    };

    const renderTeamPlayers = (team: TeamWithPlayers) => {
        const isMyTeam = team.classroom.id === selectedClassroomId;
        return (
            <div className={`mb-4 p-4 rounded-xl border-2 shadow-sm ${isMyTeam ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className={`font-black mb-3 border-b pb-2 ${isMyTeam ? 'text-indigo-900 border-indigo-200' : 'text-gray-800 border-gray-200'}`}>
                    {team.classroom.name} <span className="text-sm font-bold text-gray-500">({team.name})</span> {isMyTeam && " ⭐ (Mi Salón)"}
                </h3>
                {team.players.length === 0 ? (
                    <p className="text-sm text-red-500 font-bold bg-white p-2 rounded border border-red-100">Nómina vacía.</p>
                ) : (
                    <ul className="grid grid-cols-1 gap-2 text-sm">
                        {team.players.map((p, i) => (
                            <li key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                <span className="font-semibold text-gray-800 truncate pr-2">{p.player.lastName}, {p.player.firstName}</span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded tracking-wider ${p.isStarter ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                                    {p.isStarter ? 'TITULAR' : 'SUPLENTE'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Fixture y Partidos Programados</h1>
                <p className="text-gray-600 text-sm font-medium mb-6">Selecciona tu salón para ver el rol de partidos y consultar las nóminas de los rivales.</p>

                <div className="max-w-md">
                    <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Filtrar por Salón</label>
                    <select
                        className="w-full border-2 border-indigo-200 rounded-xl p-3 text-indigo-900 font-bold focus:border-indigo-600 bg-indigo-50/50 outline-none transition-colors"
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                    >
                        <option value="">-- Selecciona un Aula --</option>
                        {classrooms.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedClassroomId ? (
                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold text-lg">
                    Selecciona un salón arriba para ver sus partidos.
                </div>
            ) : isLoading ? (
                <div className="text-center py-20 font-black text-gray-400 text-xl animate-pulse">Buscando partidos...</div>
            ) : matches.length === 0 ? (
                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold text-lg">
                    Este salón no tiene eventos programados aún.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {matches.map((match) => (
                        <div key={match.id} className="bg-white border-2 border-gray-200 rounded-xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
                            <div>
                                <div className="flex justify-between items-start mb-4 border-b-2 border-gray-100 pb-3">
                                    <div className="pr-4">
                                        <div className="text-xs text-gray-500 font-black uppercase tracking-widest mb-1">{match.subDiscipline.discipline.name} - {match.subDiscipline.name}</div>
                                        <div className="text-sm font-black text-indigo-900 bg-indigo-50 px-2 py-1 rounded inline-block border border-indigo-100">
                                            {match.stage?.name} {match.group ? `| Grupo ${match.group.name}` : ""}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 mt-2">Lugar: {match.court} | Orden: {match.matchOrder}</div>
                                    </div>
                                    {getStatusBadge(match.status)}
                                </div>

                                {match.subDiscipline.discipline.format === "ENFRENTAMIENTO" && match.homeTeam && match.awayTeam && (
                                    <div className="flex justify-between items-center my-6 px-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className={`text-center w-5/12 p-3 rounded-xl transition-colors ${match.homeTeam.classroom.id === selectedClassroomId ? 'bg-indigo-100 border-2 border-indigo-300 shadow-inner' : 'bg-white border border-gray-200'}`}>
                                            <p className="font-black text-gray-900 text-sm truncate" title={match.homeTeam.classroom.name}>{match.homeTeam.classroom.name}</p>
                                            <p className="text-xs font-bold text-gray-500 mt-1">Eq. {match.homeTeam.letter}</p>
                                            <p className="text-4xl font-black mt-2 text-gray-900">{match.status === "PENDIENTE" ? '-' : match.homeScore}</p>
                                        </div>
                                        <div className="text-gray-300 font-black text-xl italic px-2">VS</div>
                                        <div className={`text-center w-5/12 p-3 rounded-xl transition-colors ${match.awayTeam.classroom.id === selectedClassroomId ? 'bg-indigo-100 border-2 border-indigo-300 shadow-inner' : 'bg-white border border-gray-200'}`}>
                                            <p className="font-black text-gray-900 text-sm truncate" title={match.awayTeam.classroom.name}>{match.awayTeam.classroom.name}</p>
                                            <p className="text-xs font-bold text-gray-500 mt-1">Eq. {match.awayTeam.letter}</p>
                                            <p className="text-4xl font-black mt-2 text-gray-900">{match.status === "PENDIENTE" ? '-' : match.awayScore}</p>
                                        </div>
                                    </div>
                                )}

                                {match.subDiscipline.discipline.format === "COMPETENCIA" && match.competitors && (
                                    <div className="my-5">
                                        <p className="text-xs text-gray-700 mb-2 font-black uppercase tracking-widest">Participantes ({match.competitors.length}):</p>
                                        <ul className="text-sm space-y-2">
                                            {/* CORRECCIÓN: Agregado (c: any) aquí */}
                                            {match.competitors.map((c: any) => (
                                                <li key={c.id} className={`flex justify-between items-center border border-gray-100 pb-1 px-3 py-2 rounded-lg ${c.team.classroom.id === selectedClassroomId ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white'}`}>
                                                    <span className="font-bold text-gray-900">{c.team.classroom.name} {c.team.classroom.id === selectedClassroomId && <span className="text-indigo-600">⭐ (Tú)</span>}</span>
                                                    <span className="text-gray-700 font-black text-xs bg-gray-200 px-2 py-1 rounded">{c.position ? `${c.position}º lugar` : "Sin marca"}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {match.observation && (
                                    <div className="mt-4 text-xs bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 font-bold">
                                        <span className="block text-red-500 uppercase tracking-widest mb-1">Observación:</span>
                                        {match.observation}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => { setSelectedMatch(match); setIsNominasModalOpen(true); }}
                                className="w-full mt-6 bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-sm font-black transition-transform hover:scale-[1.02] shadow-lg tracking-widest uppercase"
                            >
                                Ver Nóminas de Jugadores
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL PARA VER NÓMINAS (Lectura) --- */}
            {isNominasModalOpen && selectedMatch && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gray-900 text-white p-5 flex justify-between items-center shrink-0">
                            <h2 className="font-black text-lg">Nóminas: {selectedMatch.subDiscipline.name}</h2>
                            <button onClick={() => setIsNominasModalOpen(false)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                            {selectedMatch.subDiscipline.discipline.format === "ENFRENTAMIENTO" && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {selectedMatch.homeTeam && renderTeamPlayers(selectedMatch.homeTeam)}
                                    {selectedMatch.awayTeam && renderTeamPlayers(selectedMatch.awayTeam)}
                                </div>
                            )}
                            {selectedMatch.subDiscipline.discipline.format === "COMPETENCIA" && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* CORRECCIÓN: Agregado (c: any) aquí también */}
                                    {selectedMatch.competitors?.map((c: any) => <div key={c.id}>{renderTeamPlayers(c.team)}</div>)}
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-5 shrink-0 border-t-2 border-gray-100 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => setIsNominasModalOpen(false)} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black hover:bg-black shadow-lg uppercase tracking-widest text-sm transition-transform hover:scale-105">
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}