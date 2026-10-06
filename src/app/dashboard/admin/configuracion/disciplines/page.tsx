"use client";

import { useState, useEffect } from "react";

type Stage = {
    id?: string;
    name: string;
    stageOrder: number;
    stageType: "ACUMULACION_PUNTOS" | "ELIMINACION_DIRECTA";
    pointsForWin: number;
    pointsForTie: number;
    pointsForLoss: number;
};

type SubDiscipline = {
    id?: string;
    name: string;
    maxStarters: number;
    maxSubs: number;
    sumsToGeneralRanking: boolean;
    stages: Stage[];
};

type Discipline = {
    id: string;
    name: string;
    audience: "ESTUDIANTES" | "PADRES" | "MIXTO";
    format: "ENFRENTAMIENTO" | "COMPETENCIA";
    rankingScope: "POR_GRUPO" | "GLOBAL";
    subDisciplines: SubDiscipline[];
};

export default function DisciplinesPage() {
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialFormState: Omit<Discipline, "id"> = {
        name: "",
        audience: "ESTUDIANTES",
        format: "ENFRENTAMIENTO",
        rankingScope: "POR_GRUPO",
        subDisciplines: [],
    };

    const [formData, setFormData] = useState<Omit<Discipline, "id">>(initialFormState);

    const fetchDisciplines = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/disciplines");
            if (res.ok) {
                const data = await res.json();
                setDisciplines(data);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDisciplines();
    }, []);

    const openModal = (discipline?: Discipline) => {
        if (discipline) {
            setEditingId(discipline.id);
            setFormData({
                name: discipline.name,
                audience: discipline.audience,
                format: discipline.format,
                rankingScope: discipline.rankingScope,
                subDisciplines: discipline.subDisciplines,
            });
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData(initialFormState);
        setEditingId(null);
    };

    // --- MANEJO DE SUBDISCIPLINAS ---
    const addSubDiscipline = () => {
        setFormData((prev) => ({
            ...prev,
            subDisciplines: [
                ...prev.subDisciplines,
                {
                    name: "",
                    maxStarters: 5,
                    maxSubs: 4,
                    sumsToGeneralRanking: true,
                    stages: [
                        {
                            name: "Etapa 1: Grupos",
                            stageOrder: 1,
                            stageType: "ACUMULACION_PUNTOS",
                            pointsForWin: 3,
                            pointsForTie: 1,
                            pointsForLoss: 0,
                        }
                    ],
                },
            ],
        }));
    };

    const removeSubDiscipline = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            subDisciplines: prev.subDisciplines.filter((_, i) => i !== index),
        }));
    };

    const handleSubDisciplineChange = (index: number, field: keyof SubDiscipline, value: any) => {
        const updated = [...formData.subDisciplines];
        updated[index] = { ...updated[index], [field]: value };
        setFormData((prev) => ({ ...prev, subDisciplines: updated }));
    };

    // --- MANEJO DE ETAPAS (STAGES) ---
    const addStage = (subIndex: number) => {
        const updatedSubs = [...formData.subDisciplines];
        const newStageOrder = updatedSubs[subIndex].stages.length + 1;
        updatedSubs[subIndex].stages.push({
            name: `Etapa ${newStageOrder}: Nueva`,
            stageOrder: newStageOrder,
            stageType: "ELIMINACION_DIRECTA",
            pointsForWin: 3,
            pointsForTie: 1,
            pointsForLoss: 0,
        });
        setFormData((prev) => ({ ...prev, subDisciplines: updatedSubs }));
    };

    const removeStage = (subIndex: number, stageIndex: number) => {
        const updatedSubs = [...formData.subDisciplines];
        updatedSubs[subIndex].stages = updatedSubs[subIndex].stages.filter((_, i) => i !== stageIndex);
        setFormData((prev) => ({ ...prev, subDisciplines: updatedSubs }));
    };

    const handleStageChange = (subIndex: number, stageIndex: number, field: keyof Stage, value: any) => {
        const updatedSubs = [...formData.subDisciplines];
        updatedSubs[subIndex].stages[stageIndex] = { ...updatedSubs[subIndex].stages[stageIndex], [field]: value };
        setFormData((prev) => ({ ...prev, subDisciplines: updatedSubs }));
    };

    // --- GUARDAR ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingId ? `/api/disciplines/${editingId}` : "/api/disciplines";
        const method = editingId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert("Configuración guardada exitosamente");
                fetchDisciplines();
                closeModal();
            } else {
                alert("Error al guardar la disciplina");
            }
        } catch (error) {
            console.error("Error al guardar:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("PELIGRO: ¿Eliminar esta disciplina, todas sus categorías y etapas? Se perderán partidos asociados.")) return;
        try {
            const res = await fetch(`/api/disciplines/${id}`, { method: "DELETE" });
            if (res.ok) fetchDisciplines();
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Configuración de Disciplinas y Etapas</h1>
                    <p className="text-gray-700 text-sm font-medium mt-1">Administra las reglas del campeonato (Puntajes, Grupos, Fases).</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg"
                >
                    + Nueva Disciplina
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10 font-bold text-gray-700">Cargando datos...</div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {disciplines.map((d) => (
                        <div key={d.id} className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
                            <div className="bg-gray-100 px-5 py-4 border-b-2 border-gray-200 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-lg text-gray-900 uppercase">{d.name}</h3>
                                    <span className="text-xs font-bold text-indigo-700">{d.audience} | {d.format}</span>
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={() => openModal(d)} className="text-indigo-600 hover:text-indigo-900 font-bold bg-white px-3 py-1.5 rounded border border-indigo-200 shadow-sm text-sm">
                                        Editar Reglas
                                    </button>
                                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-white hover:bg-red-600 font-bold bg-white px-2 py-1.5 rounded border border-red-200 shadow-sm transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                {d.subDisciplines.length === 0 ? (
                                    <p className="text-gray-500 italic font-medium">No hay subcategorías registradas.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {d.subDisciplines.map((sub) => (
                                            <div key={sub.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-3 border-b-2 border-gray-200 pb-2">
                                                    <div className="font-black text-gray-800">{sub.name}</div>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${sub.sumsToGeneralRanking ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                                        {sub.sumsToGeneralRanking ? 'SUMA AL SALÓN' : 'NO SUMA'}
                                                    </span>
                                                </div>

                                                <div className="space-y-2 mt-2">
                                                    <p className="text-xs font-black text-gray-500 uppercase">Etapas configuradas:</p>
                                                    {sub.stages.map((st) => (
                                                        <div key={st.id} className="bg-white border border-gray-200 p-2 rounded flex justify-between items-center shadow-sm">
                                                            <div>
                                                                <div className="font-bold text-sm text-gray-900">{st.stageOrder}. {st.name}</div>
                                                                <div className="text-xs text-gray-500 font-semibold">{st.stageType.replace("_", " ")}</div>
                                                            </div>
                                                            <div className="text-right text-xs font-bold">
                                                                <span className="text-green-700">G: +{st.pointsForWin}</span> |
                                                                <span className="text-yellow-700"> E: +{st.pointsForTie}</span> |
                                                                <span className="text-red-700"> P: +{st.pointsForLoss}</span>
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
                    ))}
                </div>
            )}

            {/* MODAL CREAR/EDITAR DINÁMICO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b-2 border-gray-200 flex justify-between items-center bg-gray-900 text-white shrink-0">
                            <h2 className="text-xl font-black">
                                {editingId ? "Editar Reglas de Disciplina" : "Nueva Disciplina y Reglas"}
                            </h2>
                            <button onClick={closeModal} className="text-gray-300 hover:text-white">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 bg-gray-50">
                            {/* CONFIGURACIÓN GENERAL */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-gray-200 mb-6">
                                <h3 className="font-black text-indigo-900 mb-4 border-b-2 pb-2">1. Ajustes Principales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-black text-gray-900 mb-1">Nombre (Ej. Fulbito)</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full border-2 border-gray-300 rounded-lg p-2.5 font-bold text-gray-900 focus:border-indigo-500"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-black text-gray-900 mb-1">Público Objetivo</label>
                                        <select
                                            className="w-full border-2 border-gray-300 rounded-lg p-2.5 font-bold text-gray-900"
                                            value={formData.audience}
                                            onChange={(e) => setFormData({ ...formData, audience: e.target.value as any })}
                                        >
                                            <option value="ESTUDIANTES">Estudiantes</option>
                                            <option value="PADRES">Padres de Familia</option>
                                            <option value="MIXTO">Mixto</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-black text-gray-900 mb-1">Formato</label>
                                        <select
                                            className="w-full border-2 border-gray-300 rounded-lg p-2.5 font-bold text-gray-900"
                                            value={formData.format}
                                            onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                                        >
                                            <option value="ENFRENTAMIENTO">1 vs 1 (Con Balón)</option>
                                            <option value="COMPETENCIA">Grupal (Atletismo)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-black text-gray-900 mb-1">Clasificación</label>
                                        <select
                                            className="w-full border-2 border-gray-300 rounded-lg p-2.5 font-bold text-gray-900"
                                            value={formData.rankingScope}
                                            onChange={(e) => setFormData({ ...formData, rankingScope: e.target.value as any })}
                                        >
                                            <option value="POR_GRUPO">Por Grupos/Edades</option>
                                            <option value="GLOBAL">Tabla General Única</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SUBCATEGORÍAS Y ETAPAS */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-indigo-900 text-lg">2. Subcategorías y Etapas</h3>
                                    <button
                                        type="button"
                                        onClick={addSubDiscipline}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm"
                                    >
                                        + Agregar Subcategoría
                                    </button>
                                </div>

                                {formData.subDisciplines.length === 0 && (
                                    <p className="text-gray-500 font-bold text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
                                        Comienza agregando una subcategoría (Ej. Varones, Damas, 100M).
                                    </p>
                                )}

                                <div className="space-y-6">
                                    {formData.subDisciplines.map((sub, subIdx) => (
                                        <div key={subIdx} className="bg-white border-2 border-gray-300 p-5 rounded-xl relative shadow-md">
                                            <button
                                                type="button"
                                                onClick={() => removeSubDiscipline(subIdx)}
                                                className="absolute top-4 right-4 text-white bg-red-600 hover:bg-red-700 rounded p-1.5 shadow"
                                                title="Eliminar Subcategoría"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>

                                            {/* DATOS DE SUBCATEGORÍA */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-10">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-black text-gray-600 mb-1 uppercase">Nombre (Ej. Equipo A)</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full border-2 border-gray-300 rounded-lg p-2 font-bold text-gray-900 focus:border-indigo-500"
                                                        value={sub.name}
                                                        onChange={(e) => handleSubDisciplineChange(subIdx, "name", e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-gray-600 mb-1 uppercase">Jugadores</label>
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="number" min="1" required placeholder="Tit" title="Titulares"
                                                            className="w-1/2 border-2 border-gray-300 rounded-lg p-2 font-bold text-center text-gray-900"
                                                            value={sub.maxStarters}
                                                            onChange={(e) => handleSubDisciplineChange(subIdx, "maxStarters", Number(e.target.value))}
                                                        />
                                                        <input
                                                            type="number" min="0" required placeholder="Sup" title="Suplentes"
                                                            className="w-1/2 border-2 border-gray-300 rounded-lg p-2 font-bold text-center text-gray-900"
                                                            value={sub.maxSubs}
                                                            onChange={(e) => handleSubDisciplineChange(subIdx, "maxSubs", Number(e.target.value))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-end">
                                                    <label className="flex items-center space-x-2 bg-indigo-50 border-2 border-indigo-200 p-2 rounded-lg cursor-pointer w-full h-[42px]">
                                                        <input
                                                            type="checkbox"
                                                            checked={sub.sumsToGeneralRanking}
                                                            onChange={(e) => handleSubDisciplineChange(subIdx, "sumsToGeneralRanking", e.target.checked)}
                                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                                        />
                                                        <span className="text-xs font-black text-indigo-900">SUMAR AL SALÓN</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* ETAPAS (STAGES) DE ESTA SUBCATEGORÍA */}
                                            <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-200">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-black text-gray-800 text-sm uppercase">Etapas (Fases del Torneo)</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => addStage(subIdx)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-bold"
                                                    >
                                                        + Nueva Etapa
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {sub.stages.map((stage, stageIdx) => (
                                                        <div key={stageIdx} className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-300 shadow-sm relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeStage(subIdx, stageIdx)}
                                                                className="absolute -top-2 -right-2 text-white bg-red-500 hover:bg-red-700 rounded-full p-1 shadow"
                                                                disabled={sub.stages.length === 1}
                                                                title={sub.stages.length === 1 ? "Debe haber al menos 1 etapa" : "Eliminar Etapa"}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                            </button>

                                                            <div className="w-16">
                                                                <label className="block text-[10px] font-black text-gray-500 uppercase">Orden</label>
                                                                <input type="number" min="1" required className="w-full border-2 rounded p-1.5 font-bold text-center text-gray-900" value={stage.stageOrder} onChange={(e) => handleStageChange(subIdx, stageIdx, "stageOrder", Number(e.target.value))} />
                                                            </div>
                                                            <div className="flex-1 min-w-[150px]">
                                                                <label className="block text-[10px] font-black text-gray-500 uppercase">Nombre Etapa</label>
                                                                <input type="text" required placeholder="Ej. Semifinal" className="w-full border-2 rounded p-1.5 font-bold text-gray-900" value={stage.name} onChange={(e) => handleStageChange(subIdx, stageIdx, "name", e.target.value)} />
                                                            </div>
                                                            <div className="w-40">
                                                                <label className="block text-[10px] font-black text-gray-500 uppercase">Tipo</label>
                                                                <select className="w-full border-2 rounded p-1.5 font-bold text-xs text-gray-900" value={stage.stageType} onChange={(e) => handleStageChange(subIdx, stageIdx, "stageType", e.target.value as any)}>
                                                                    <option value="ACUMULACION_PUNTOS">Acumulación (Ptos)</option>
                                                                    <option value="ELIMINACION_DIRECTA">Eliminación Directa</option>
                                                                </select>
                                                            </div>

                                                            {/* PUNTOS */}
                                                            <div className="w-20">
                                                                <label className="block text-[10px] font-black text-green-700 uppercase">{formData.format === "COMPETENCIA" ? "1º Lugar" : "Ganar"}</label>
                                                                <input type="number" required className="w-full border-2 border-green-300 bg-green-50 rounded p-1.5 font-black text-center text-green-900" value={stage.pointsForWin} onChange={(e) => handleStageChange(subIdx, stageIdx, "pointsForWin", Number(e.target.value))} />
                                                            </div>
                                                            <div className="w-20">
                                                                <label className="block text-[10px] font-black text-yellow-700 uppercase">{formData.format === "COMPETENCIA" ? "2º Lugar" : "Empate"}</label>
                                                                <input type="number" required className="w-full border-2 border-yellow-300 bg-yellow-50 rounded p-1.5 font-black text-center text-yellow-900" value={stage.pointsForTie} onChange={(e) => handleStageChange(subIdx, stageIdx, "pointsForTie", Number(e.target.value))} />
                                                            </div>
                                                            <div className="w-20">
                                                                <label className="block text-[10px] font-black text-red-700 uppercase">{formData.format === "COMPETENCIA" ? "3º Lugar" : "Perder"}</label>
                                                                <input type="number" required className="w-full border-2 border-red-300 bg-red-50 rounded p-1.5 font-black text-center text-red-900" value={stage.pointsForLoss} onChange={(e) => handleStageChange(subIdx, stageIdx, "pointsForLoss", Number(e.target.value))} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        {/* FOOTER DEL MODAL */}
                        <div className="bg-gray-100 p-5 border-t-2 border-gray-200 flex justify-end space-x-4 shrink-0">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 bg-white hover:bg-gray-50 font-black shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-black shadow-lg"
                            >
                                {editingId ? "Actualizar Todo" : "Guardar Configuración"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}