"use client";

import { useState, useEffect } from "react";

type Group = {
    id: string;
    name: string;
    _count?: { studentClassrooms: number, parentClassrooms: number };
};

type Classroom = {
    id: string;
    name: string;
    studentGroupId: string;
    parentGroupId?: string | null;
    studentGroup: { id: string; name: string };
    parentGroup?: { id: string; name: string } | null;
};

export default function AulasGruposPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupFormData, setGroupFormData] = useState({ name: "" });
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [groupMessage, setGroupMessage] = useState({ type: "", text: "" });

    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [classroomFormData, setClassroomFormData] = useState({ name: "", studentGroupId: "", parentGroupId: "" });
    const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
    const [classroomMessage, setClassroomMessage] = useState({ type: "", text: "" });

    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [resGroups, resClassrooms] = await Promise.all([
                fetch("/api/groups"),
                fetch("/api/classrooms")
            ]);
            if (resGroups.ok) setGroups(await resGroups.json());
            if (resClassrooms.ok) setClassrooms(await resClassrooms.json());
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // LÓGICA GRUPOS
    const handleGroupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGroupMessage({ type: "", text: "" });
        try {
            const url = editingGroupId ? `/api/groups/${editingGroupId}` : "/api/groups";
            const method = editingGroupId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupFormData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setGroupMessage({ type: "success", text: "Grupo guardado correctamente" });
            setGroupFormData({ name: "" });
            setEditingGroupId(null);
            fetchData();
        } catch (error: any) {
            setGroupMessage({ type: "error", text: error.message });
        }
    };

    const handleEditGroup = (group: Group) => {
        setGroupMessage({ type: "", text: "" });
        setEditingGroupId(group.id);
        setGroupFormData({ name: group.name });
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!window.confirm(`¿Eliminar el grupo ${name}?`)) return;
        try {
            const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setGroupMessage({ type: "success", text: "Grupo eliminado" });
            fetchData();
        } catch (error: any) {
            setGroupMessage({ type: "error", text: error.message });
        }
    };

    // LÓGICA SALONES
    const handleClassroomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setClassroomMessage({ type: "", text: "" });
        try {
            const url = editingClassroomId ? `/api/classrooms/${editingClassroomId}` : "/api/classrooms";
            const method = editingClassroomId ? "PUT" : "POST";

            const payload = {
                name: classroomFormData.name,
                studentGroupId: classroomFormData.studentGroupId,
                parentGroupId: classroomFormData.parentGroupId === "" ? null : classroomFormData.parentGroupId
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setClassroomMessage({ type: "success", text: "Salón guardado correctamente" });
            setClassroomFormData({ name: "", studentGroupId: "", parentGroupId: "" });
            setEditingClassroomId(null);
            fetchData();
        } catch (error: any) {
            setClassroomMessage({ type: "error", text: error.message });
        }
    };

    const handleEditClassroom = (classroom: Classroom) => {
        setClassroomMessage({ type: "", text: "" });
        setEditingClassroomId(classroom.id);
        setClassroomFormData({
            name: classroom.name,
            studentGroupId: classroom.studentGroupId,
            parentGroupId: classroom.parentGroupId || ""
        });
    };

    const handleDeleteClassroom = async (id: string, name: string) => {
        if (!window.confirm(`¿Eliminar el salón ${name}?`)) return;
        try {
            const res = await fetch(`/api/classrooms/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setClassroomMessage({ type: "success", text: "Salón eliminado" });
            fetchData();
        } catch (error: any) {
            setClassroomMessage({ type: "error", text: error.message });
        }
    };

    if (isLoading) return <div className="p-8 text-gray-500">Cargando módulos...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Aulas y Grupos</h1>
                <p className="text-gray-600 mt-1">Asigna a cada aula en qué grupo competirán sus estudiantes y en cuál sus padres.</p>
            </div>

            {/* SECCIÓN GRUPOS */}
            <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">1. Configuración de Grupos</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-1 h-fit border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{editingGroupId ? "Editar Grupo" : "Nuevo Grupo"}</h3>
                        {groupMessage.text && (
                            <div className={`p-3 mb-4 rounded text-sm ${groupMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {groupMessage.text}
                            </div>
                        )}
                        <form onSubmit={handleGroupSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Grupo</label>
                                <input
                                    type="text"
                                    value={groupFormData.name}
                                    onChange={(e) => setGroupFormData({ name: e.target.value })}
                                    placeholder="Ej: Grupo 1 Estudiantes, Grupo A Padres"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700">
                                    {editingGroupId ? "Actualizar" : "Guardar"}
                                </button>
                                {editingGroupId && (
                                    <button type="button" onClick={() => { setEditingGroupId(null); setGroupFormData({ name: "" }); setGroupMessage({ type: "", text: "" }); }} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-md hover:bg-gray-300">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-2 border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Grupos Registrados</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold rounded-tl-md">Nombre</th>
                                        <th className="px-4 py-3 font-semibold">Salones asignados</th>
                                        <th className="px-4 py-3 font-semibold text-right rounded-tr-md">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-800">
                                    {groups.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No hay grupos.</td></tr>
                                    ) : (
                                        groups.map((group) => (
                                            <tr key={group.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{group.name}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">Estudiantes: {group._count?.studentClassrooms || 0}</span>
                                                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Padres: {group._count?.parentClassrooms || 0}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button onClick={() => handleEditGroup(group)} className="text-blue-600 font-semibold hover:underline">Editar</button>
                                                    <button onClick={() => handleDeleteGroup(group.id, group.name)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN SALONES */}
            <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">2. Configuración de Salones (Aulas)</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-1 h-fit border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{editingClassroomId ? "Editar Salón" : "Nuevo Salón"}</h3>
                        {classroomMessage.text && (
                            <div className={`p-3 mb-4 rounded text-sm ${classroomMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {classroomMessage.text}
                            </div>
                        )}
                        <form onSubmit={handleClassroomSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Salón</label>
                                <input
                                    type="text"
                                    value={classroomFormData.name}
                                    onChange={(e) => setClassroomFormData({ ...classroomFormData, name: e.target.value })}
                                    placeholder="Ej: 1A Secundaria"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                    required
                                />
                            </div>

                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                <label className="block text-sm font-bold text-blue-800 mb-1">Grupo para ESTUDIANTES *</label>
                                <select
                                    value={classroomFormData.studentGroupId}
                                    onChange={(e) => setClassroomFormData({ ...classroomFormData, studentGroupId: e.target.value })}
                                    className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-blue-500 text-black bg-white"
                                    required
                                >
                                    <option value="" disabled>Selecciona un grupo</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div className="bg-orange-50 p-3 rounded border border-orange-100">
                                <label className="block text-sm font-bold text-orange-800 mb-1">Grupo para PADRES (Opcional)</label>
                                <select
                                    value={classroomFormData.parentGroupId}
                                    onChange={(e) => setClassroomFormData({ ...classroomFormData, parentGroupId: e.target.value })}
                                    className="w-full px-3 py-2 border border-orange-200 rounded-md focus:ring-orange-500 text-black bg-white"
                                >
                                    <option value="">Sin grupo asignado aún</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700">
                                    {editingClassroomId ? "Actualizar" : "Guardar Salón"}
                                </button>
                                {editingClassroomId && (
                                    <button type="button" onClick={() => { setEditingClassroomId(null); setClassroomFormData({ name: "", studentGroupId: "", parentGroupId: "" }); setClassroomMessage({ type: "", text: "" }); }} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-md hover:bg-gray-300">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm lg:col-span-2 border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Salones Registrados</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold rounded-tl-md">Salón (Aula)</th>
                                        <th className="px-4 py-3 font-semibold">Grupo Estudiantes</th>
                                        <th className="px-4 py-3 font-semibold">Grupo Padres</th>
                                        <th className="px-4 py-3 font-semibold text-right rounded-tr-md">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-800">
                                    {classrooms.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No hay salones.</td></tr>
                                    ) : (
                                        classrooms.map((classroom) => (
                                            <tr key={classroom.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{classroom.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                                        {classroom.studentGroup?.name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {classroom.parentGroup ? (
                                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                                                            {classroom.parentGroup.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Sin grupo</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button onClick={() => handleEditClassroom(classroom)} className="text-blue-600 font-semibold hover:underline">Editar</button>
                                                    <button onClick={() => handleDeleteClassroom(classroom.id, classroom.name)} className="text-red-600 font-semibold hover:underline">Eliminar</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}