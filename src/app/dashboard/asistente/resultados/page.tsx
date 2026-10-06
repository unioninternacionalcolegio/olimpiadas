"use client";

import { useState, useEffect } from "react";

type Group = { id: string; name: string };
type Classroom = { id: string; name: string; studentGroup: Group; parentGroup: Group | null };
type Discipline = { id: string; name: string; format: string; audience: string; rankingScope: string };
type Ranking = { id: string; position: number | null; pointsAwarded: number; observation: string; classroom: Classroom };
type Match = { status: string; homeScore: number; awayScore: number; homeTablePts: number; awayTablePts: number; homeTeam: { classroom: Classroom }; awayTeam: { classroom: Classroom } };

export default function ResultadosPage() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState("");

    // Estados para Competencias (Atletismo, Pasacalle)
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [rankingForm, setRankingForm] = useState({ classroomId: "", position: "", pointsAwarded: "0", observation: "" });
    const [editingRankingId, setEditingRankingId] = useState<string | null>(null);

    // Estados para Enfrentamientos (Voley, Fulbito)
    const [matches, setMatches] = useState<Match[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        const initFetch = async () => {
            const [resD, resC] = await Promise.all([fetch("/api/disciplines"), fetch("/api/classrooms")]);
            if (resD.ok) setDisciplines(await resD.json());
            if (resC.ok) setClassrooms(await resC.json());
        };
        initFetch();
    }, []);

    const selectedDiscipline = disciplines.find(d => d.id === selectedDisciplineId);

    useEffect(() => {
        if (selectedDiscipline) {
            if (selectedDiscipline.format === "COMPETENCIA") {
                fetchRankings();
            } else {
                fetchMatches();
            }
        }
    }, [selectedDisciplineId]);

    const fetchRankings = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/rankings?disciplineId=${selectedDisciplineId}`);
        if (res.ok) setRankings(await res.json());
        setIsLoading(false);
    };

    const fetchMatches = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/matches?disciplineId=${selectedDisciplineId}`);
        if (res.ok) setMatches(await res.json());
        setIsLoading(false);
    };

    // ================= CRUD RANKINGS (ATLETISMO / PASACALLE) =================
    const handleRankingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });
        try {
            const url = editingRankingId ? `/api/rankings/${editingRankingId}` : "/api/rankings";
            const method = editingRankingId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...rankingForm, disciplineId: selectedDisciplineId })
            });
            if (!res.ok) throw new Error((await res.json()).error);

            setMessage({ type: "success", text: "Resultado guardado correctamente" });
            setRankingForm({ classroomId: "", position: "", pointsAwarded: "0", observation: "" });
            setEditingRankingId(null);
            fetchRankings();
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        }
    };

    const handleEditRanking = (r: Ranking) => {
        setEditingRankingId(r.id);
        setRankingForm({
            classroomId: r.classroom.id,
            position: r.position?.toString() || "",
            pointsAwarded: r.pointsAwarded.toString(),
            observation: r.observation || ""
        });
    };

    const handleDeleteRanking = async (id: string) => {
        if (!window.confirm("¿Eliminar este resultado?")) return;
        const res = await fetch(`/api/rankings/${id}`, { method: "DELETE" });
        if (res.ok) fetchRankings();
    };

    // ================= CÁLCULO DE TABLA (VOLEY / FULBITO) =================
    const generateStandings = () => {
        if (!selectedDiscipline) return {};

        // key: classroomId -> value: { data }
        const standings: Record<string, any> = {};

        matches.forEach(match => {
            if (match.status === "PENDIENTE") return;

            const homeC = match.homeTeam.classroom;
            const awayC = match.awayTeam.classroom;

            // Inicializar si no existen
            if (!standings[homeC.id]) standings[homeC.id] = { classroom: homeC, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 };
            if (!standings[awayC.id]) standings[awayC.id] = { classroom: awayC, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 };

            // Sumar partidos jugados
            standings[homeC.id].pj += 1;
            standings[awayC.id].pj += 1;

            // Puntos de tabla
            standings[homeC.id].pts += match.homeTablePts;
            standings[awayC.id].pts += match.awayTablePts;

            // Goles/Puntos
            standings[homeC.id].gf += match.homeScore;
            standings[homeC.id].gc += match.awayScore;
            standings[awayC.id].gf += match.awayScore;
            standings[awayC.id].gc += match.homeScore;

            // PG, PE, PP (Inferido por puntos)
            if (match.homeScore > match.awayScore || (match.status === "WALKOVER" && match.homeTablePts > match.awayTablePts)) {
                standings[homeC.id].pg += 1;
                standings[awayC.id].pp += 1;
            } else if (match.awayScore > match.homeScore || (match.status === "WALKOVER" && match.awayTablePts > match.homeTablePts)) {
                standings[awayC.id].pg += 1;
                standings[homeC.id].pp += 1;
            } else {
                standings[homeC.id].pe += 1;
                standings[awayC.id].pe += 1;
            }
        });

        // Agrupar por el grupo correcto (Estudiantes o Padres)
        const groupedStandings: Record<string, any[]> = {};

        Object.values(standings).forEach(s => {
            // AQUÍ ESTÁ LA SOLUCIÓN AL ERROR: Buscamos el salón completo en la lista general de aulas
            const fullClassroom = classrooms.find(c => c.id === s.classroom.id);

            let groupName = "Grupo no asignado";
            if (fullClassroom) {
                groupName = selectedDiscipline.audience === "PADRES"
                    ? (fullClassroom.parentGroup?.name || "Sin Grupo Padres")
                    : (fullClassroom.studentGroup?.name || "Sin Grupo Estudiantes");
            }

            if (!groupedStandings[groupName]) groupedStandings[groupName] = [];
            groupedStandings[groupName].push(s);
        });

        // Ordenar cada grupo por puntos (mayor a menor) y diferencia de goles
        Object.keys(groupedStandings).forEach(group => {
            groupedStandings[group].sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts; // 1ro por puntos
                return (b.gf - b.gc) - (a.gf - a.gc); // 2do por diferencia goles/puntos
            });
        });

        return groupedStandings;
    };

    const standingsData = generateStandings();

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Resultados y Tabla de Posiciones</h1>
                <p className="text-gray-600 mt-1">Registra los ganadores de atletismo o visualiza los clasificados de los partidos.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Selecciona la Disciplina:</label>
                <div className="flex flex-wrap gap-2">
                    {disciplines.map(d => (
                        <button
                            key={d.id}
                            onClick={() => {
                                setSelectedDisciplineId(d.id);
                                setMessage({ type: "", text: "" });
                            }}
                            className={`px-4 py-2 rounded-md font-bold text-sm transition ${selectedDisciplineId === d.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            {d.name} ({d.audience})
                        </button>
                    ))}
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-md font-medium ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {message.text}
                </div>
            )}

            {!selectedDiscipline && (
                <div className="text-center p-8 bg-white border border-dashed text-gray-500 rounded">
                    Selecciona una disciplina arriba para ver o ingresar resultados.
                </div>
            )}

            {/* ================= VISTA DE COMPETENCIAS (CRUD) ================= */}
            {selectedDiscipline?.format === "COMPETENCIA" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-1 h-fit">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{editingRankingId ? "Editar Puntos" : "Asignar Puntos"}</h3>
                        <form onSubmit={handleRankingSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salón / Aula</label>
                                <select value={rankingForm.classroomId} onChange={e => setRankingForm({ ...rankingForm, classroomId: e.target.value })} className="w-full px-3 py-2 border rounded-md text-black bg-white" required disabled={!!editingRankingId}>
                                    <option value="">-- Seleccionar --</option>
                                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Puesto (Ej: 1)</label>
                                    <input type="number" min={1} value={rankingForm.position} onChange={e => setRankingForm({ ...rankingForm, position: e.target.value })} className="w-full px-3 py-2 border rounded-md text-black" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Puntos *</label>
                                    <input type="number" value={rankingForm.pointsAwarded} onChange={e => setRankingForm({ ...rankingForm, pointsAwarded: e.target.value })} className="w-full px-3 py-2 border rounded-md text-black" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                                <input type="text" value={rankingForm.observation} onChange={e => setRankingForm({ ...rankingForm, observation: e.target.value })} placeholder="Ej: Bonificación extra" className="w-full px-3 py-2 border rounded-md text-black" />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 text-sm">
                                    {editingRankingId ? "Actualizar" : "Guardar"}
                                </button>
                                {editingRankingId && (
                                    <button type="button" onClick={() => { setEditingRankingId(null); setRankingForm({ classroomId: "", position: "", pointsAwarded: "0", observation: "" }); }} className="bg-gray-200 py-2 px-4 rounded font-bold text-sm text-black hover:bg-gray-300">Cancelar</button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Tabla de Resultados ({selectedDiscipline.rankingScope.replace("_", " ")})</h3>
                        {isLoading ? <p className="text-gray-500">Cargando...</p> : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-indigo-50 text-indigo-900 border-b-2 border-indigo-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Salón</th>
                                            <th className="px-4 py-3 font-semibold">Grupo</th>
                                            <th className="px-4 py-3 font-semibold">Puesto</th>
                                            <th className="px-4 py-3 font-semibold text-center">Puntos Obtenidos</th>
                                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-gray-800">
                                        {rankings.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-bold">{r.classroom.name}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {selectedDiscipline.audience === "PADRES" ? r.classroom.parentGroup?.name : r.classroom.studentGroup.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.position === 1 ? '🥇 1er' : r.position === 2 ? '🥈 2do' : r.position === 3 ? '🥉 3er' : `${r.position}º`}
                                                </td>
                                                <td className="px-4 py-3 text-center text-lg font-extrabold text-indigo-600">{r.pointsAwarded}</td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button onClick={() => handleEditRanking(r)} className="text-blue-600 text-xs font-bold hover:underline">Editar</button>
                                                    <button onClick={() => handleDeleteRanking(r.id)} className="text-red-600 text-xs font-bold hover:underline">Quitar</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= VISTA DE ENFRENTAMIENTOS (TABLA GENERADA) ================= */}
            {selectedDiscipline?.format === "ENFRENTAMIENTO" && (
                <div className="space-y-8">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded text-sm text-indigo-800 font-medium">
                        Esta es una tabla dinámica. Los puntos se calculan automáticamente según los partidos <strong>FINALIZADOS</strong> o con <strong>WALKOVER</strong> desde el módulo de "Control de Partidos".
                    </div>

                    {isLoading ? <p className="text-gray-500">Generando tabla...</p> : Object.keys(standingsData).length === 0 ? (
                        <p className="text-center bg-white p-8 border rounded text-gray-500 border-dashed">No hay partidos jugados todavía en esta disciplina.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.keys(standingsData).map(groupName => (
                                <div key={groupName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-800 text-white p-3 font-bold text-center">
                                        {groupName}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-center text-sm">
                                            <thead className="bg-gray-100 text-gray-700 border-b">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Equipo</th>
                                                    <th className="px-2 py-2" title="Partidos Jugados">PJ</th>
                                                    <th className="px-2 py-2" title="Partidos Ganados">PG</th>
                                                    <th className="px-2 py-2" title="Partidos Empatados">PE</th>
                                                    <th className="px-2 py-2" title="Partidos Perdidos">PP</th>
                                                    <th className="px-2 py-2" title="Goles/Puntos a Favor">GF</th>
                                                    <th className="px-2 py-2 text-indigo-700 font-extrabold text-base" title="Puntos en Tabla">PTS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 text-gray-800">
                                                {standingsData[groupName].map((row: any, index: number) => (
                                                    <tr key={row.classroom.id} className={index === 0 ? "bg-green-50 font-bold" : "hover:bg-gray-50"}>
                                                        <td className="px-3 py-2 text-left font-bold">{row.classroom.name}</td>
                                                        <td className="px-2 py-2">{row.pj}</td>
                                                        <td className="px-2 py-2">{row.pg}</td>
                                                        <td className="px-2 py-2">{row.pe}</td>
                                                        <td className="px-2 py-2">{row.pp}</td>
                                                        <td className="px-2 py-2 text-gray-500">{row.gf}</td>
                                                        <td className="px-2 py-2 text-indigo-700 font-extrabold text-base">{row.pts}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}