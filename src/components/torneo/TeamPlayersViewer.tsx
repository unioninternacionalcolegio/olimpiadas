import React from 'react';

type Player = {
    isStarter: boolean;
    player: { firstName: string; lastName: string; dni: string; isParent: boolean };
};

type TeamWithPlayers = {
    id: string;
    name: string;
    letter: string;
    classroomId?: string;
    classroom: { id: string; name: string };
    players: Player[];
};

interface TeamPlayersViewerProps {
    team: TeamWithPlayers;
    isMyTeam?: boolean; // Para que el Asesor resalte su propio salón
}

export function TeamPlayersViewer({ team, isMyTeam = false }: TeamPlayersViewerProps) {
    return (
        <div className={`mb-4 p-4 rounded-xl border-2 shadow-sm ${isMyTeam ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`font-black mb-3 border-b pb-2 ${isMyTeam ? 'text-indigo-900 border-indigo-200' : 'text-gray-800 border-gray-200'}`}>
                {team.classroom.name} <span className="text-gray-500 text-sm">({team.name})</span>
                {isMyTeam && " ⭐ (Tu Salón)"}
            </h3>
            {team.players.length === 0 ? (
                <p className="text-sm text-red-500 font-bold bg-white p-2 rounded border border-red-100">Nómina vacía. Faltan inscribir jugadores.</p>
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
}