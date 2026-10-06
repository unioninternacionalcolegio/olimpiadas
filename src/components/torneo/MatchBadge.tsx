import React from 'react';

export function MatchBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDIENTE": return <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-600 shadow-sm">Pendiente</span>;
        case "EN_JUEGO": return <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-700 shadow-sm">En Juego</span>;
        case "FINALIZADO": return <span className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-green-400 shadow-sm">Finalizado</span>;
        case "WALKOVER": return <span className="bg-red-900 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold border border-red-800 shadow-sm">W.O.</span>;
        default: return null;
    }
}