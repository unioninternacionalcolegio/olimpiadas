"use client";

import { useState, useEffect } from "react";

// Tipos actualizados para incluir el classroomId y la relación classroom
type User = {
    id: string;
    name: string;
    username: string;
    dni: string;
    phone: string;
    role: string;
    classroomId: string | null;
    classroom?: { id: string, name: string } | null;
};

type Classroom = {
    id: string;
    name: string;
};

export default function UsuariosConfigPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado formData actualizado
    const [formData, setFormData] = useState({
        name: "",
        dni: "",
        phone: "",
        username: "",
        password: "",
        role: "DELEGADO",
        classroomId: "", // Añadido para el aula
    });

    // Cargar usuarios y aulas en paralelo
    const fetchData = async () => {
        try {
            const [usersRes, classroomsRes] = await Promise.all([
                fetch("/api/users"),
                fetch("/api/classrooms")
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (classroomsRes.ok) setClassrooms(await classroomsRes.json());
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Si cambia de rol y ya no es asesor/delegado, limpiamos el classroomId
        if (name === "role" && value !== "ASESOR" && value !== "DELEGADO") {
            setFormData((prev) => ({ ...prev, role: value, classroomId: "" }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            dni: "",
            phone: "",
            username: "",
            password: "",
            role: "DELEGADO",
            classroomId: "",
        });
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación: Si es Asesor o Delegado, DEBE tener un aula
        if ((formData.role === "ASESOR" || formData.role === "DELEGADO") && !formData.classroomId) {
            setMessage({ type: "error", text: "Los asesores y delegados deben estar asignados a un aula." });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            const url = editingId ? `/api/users/${editingId}` : "/api/users";
            const method = editingId ? "PUT" : "POST";

            // Asegurarnos de enviar null si el campo está vacío
            const payload = {
                ...formData,
                classroomId: formData.classroomId || null
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Ocurrió un error al guardar el usuario");
            }

            setMessage({
                type: "success",
                text: editingId ? "Usuario actualizado correctamente" : "Usuario registrado correctamente"
            });

            resetForm();
            fetchData();
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (user: User) => {
        setMessage({ type: "", text: "" });
        setEditingId(user.id);
        setFormData({
            name: user.name,
            dni: user.dni,
            phone: user.phone,
            username: user.username,
            password: "",
            role: user.role,
            classroomId: user.classroomId || "",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario ${name}?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al eliminar");
            }

            setMessage({ type: "success", text: "Usuario eliminado correctamente" });
            if (editingId === id) resetForm();
            fetchData();
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
                <p className="text-gray-600 mt-1">Crea, edita y asigna roles/aulas para el sistema.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORMULARIO */}
                <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-1 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        {editingId ? "Editar Usuario" : "Nuevo Usuario"}
                    </h2>

                    {message.text && (
                        <div className={`p-3 mb-4 rounded text-sm font-medium ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres y Apellidos</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                                <input
                                    type="text"
                                    name="dni"
                                    maxLength={8}
                                    value={formData.dni}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                                <input
                                    type="text"
                                    name="phone"
                                    maxLength={9}
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol en el sistema</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                            >
                                <option value="DELEGADO">Delegado</option>
                                <option value="ASESOR">Asesor</option>
                                <option value="ASISTENTE">Asistente de Mesa</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>

                        {/* EL NUEVO CAMPO QUE APARECE SOLO SI ES ASESOR O DELEGADO */}
                        {(formData.role === "ASESOR" || formData.role === "DELEGADO") && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mt-2">
                                <label className="block text-sm font-bold text-blue-900 mb-1">Aula Asignada (Obligatorio)</label>
                                <select
                                    name="classroomId"
                                    value={formData.classroomId}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-600 focus:border-blue-600 text-black bg-white"
                                >
                                    <option value="">-- Selecciona el Aula --</option>
                                    {classrooms.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <hr className="my-4" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña {editingId && <span className="text-xs text-gray-500 font-normal">(Dejar en blanco para mantener)</span>}
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                                required={!editingId}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isSubmitting ? "Guardando..." : (editingId ? "Actualizar" : "Registrar")}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* TABLA */}
                <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Usuarios Registrados</h2>

                    {isLoading ? (
                        <p className="text-gray-500">Cargando usuarios...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold rounded-tl-md">Nombres</th>
                                        <th className="px-4 py-3 font-semibold">Usuario</th>
                                        <th className="px-4 py-3 font-semibold">Rol</th>
                                        <th className="px-4 py-3 font-semibold">Aula Asignada</th>
                                        <th className="px-4 py-3 font-semibold text-right rounded-tr-md">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-800">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                No hay usuarios registrados aún.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">
                                                    {user.name} <br />
                                                    <span className="text-xs font-normal text-gray-500">DNI: {user.dni} | Cel: {user.phone}</span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-600">{user.username}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold
                            ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : ''}
                            ${user.role === 'ASISTENTE' ? 'bg-purple-100 text-purple-700' : ''}
                            ${user.role === 'ASESOR' ? 'bg-teal-100 text-teal-700' : ''}
                            ${user.role === 'DELEGADO' ? 'bg-blue-100 text-blue-700' : ''}
                          `}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-700">
                                                    {user.classroom ? user.classroom.name : <span className="text-gray-400 italic">No aplica</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}