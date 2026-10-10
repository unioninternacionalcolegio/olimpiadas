"use client";

import { useState, useEffect } from "react";

type Classroom = { id: string; name: string };
type UserDelegate = {
    id: string;
    name: string;
    dni: string;
    phone: string;
    classroom: Classroom | null;
};

export default function DelegadosPage() {
    const [session, setSession] = useState<any>(null);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [delegates, setDelegates] = useState<UserDelegate[]>([]);
    const [selectedClassroomId, setSelectedClassroomId] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Estado para saber a quiénes vamos a imprimir
    const [delegatesToPrint, setDelegatesToPrint] = useState<UserDelegate[]>([]);

    useEffect(() => {
        // Obtenemos la sesión para saber qué rol tiene el usuario
        fetch("/api/auth/session")
            .then(res => res.json())
            .then(data => {
                setSession(data);
                if (data?.user) {
                    if (["ADMIN", "ASISTENTE"].includes(data.user.role)) {
                        // Si tiene privilegios, cargamos todos los salones para el filtro
                        fetchClassrooms();
                    } else {
                        // Si es Delegado, fijamos automáticamente su salón
                        setSelectedClassroomId(data.user.classroomId || "");
                    }
                }
            });
    }, []);

    useEffect(() => {
        if (session) {
            fetchDelegates(selectedClassroomId);
        }
    }, [selectedClassroomId, session]);

    const fetchClassrooms = async () => {
        try {
            const res = await fetch("/api/classrooms");
            if (res.ok) setClassrooms(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDelegates = async (classroomId: string) => {
        setIsLoading(true);
        try {
            const url = classroomId ? `/api/users/delegados?classroomId=${classroomId}` : "/api/users/delegados";
            const res = await fetch(url);
            if (res.ok) setDelegates(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintSingle = (delegate: UserDelegate) => {
        setDelegatesToPrint([delegate]);
        setTimeout(() => window.print(), 100);
    };

    const handlePrintAll = () => {
        if (delegates.length === 0) return alert("No hay delegados para imprimir en esta vista.");
        setDelegatesToPrint(delegates);
        setTimeout(() => window.print(), 100);
    };

    // Variable para saber si mostramos los filtros
    const isPrivileged = session?.user?.role === "ADMIN" || session?.user?.role === "ASISTENTE";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ==========================================
                VISTA WEB (Interfaz de Gestión - Se oculta al imprimir)
            ========================================== */}
            <div className="p-6 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                            {isPrivileged ? "Gestión de Delegados" : "Mi Credencial Oficial"}
                        </h1>
                        <p className="text-gray-600 text-sm font-medium mt-1">
                            {isPrivileged ? "Filtra por salón e imprime las credenciales." : "Imprime tu credencial para presentarla en la mesa de control."}
                        </p>
                    </div>
                    <button
                        onClick={handlePrintAll}
                        disabled={delegates.length === 0}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        {isPrivileged ? "Imprimir Lista Actual" : "Imprimir Mi Credencial"}
                    </button>
                </div>

                {/* FILTRO: Solo visible para ADMIN y ASISTENTE */}
                {isPrivileged && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Filtrar por Aula</label>
                        <select
                            className="w-full md:w-1/3 border-2 border-gray-300 rounded-xl p-3 font-bold text-gray-900 focus:border-blue-600 bg-gray-50"
                            value={selectedClassroomId}
                            onChange={(e) => setSelectedClassroomId(e.target.value)}
                        >
                            <option value="">TODOS LOS SALONES</option>
                            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                {/* TABLA DE DELEGADOS */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                        <h3 className="font-black text-lg">Lista de Delegados</h3>
                        {!isPrivileged && session?.user?.classroom?.name && (
                            <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">
                                Tu Salón: {session.user.classroom.name}
                            </span>
                        )}
                    </div>
                    {isLoading ? (
                        <p className="text-center py-10 font-bold text-gray-500">Cargando delegados...</p>
                    ) : delegates.length === 0 ? (
                        <p className="text-center py-10 font-bold text-gray-500 italic">No se encontraron delegados registrados en esta vista.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-600 font-black uppercase text-xs tracking-wider border-b-2 border-gray-200">
                                    <tr>
                                        <th className="p-4">DNI</th>
                                        <th className="p-4">Nombres Completos</th>
                                        <th className="p-4">Aula Asignada</th>
                                        <th className="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {delegates.map((d) => (
                                        <tr key={d.id} className="hover:bg-blue-50 transition-colors">
                                            <td className="p-4 font-mono font-bold text-gray-700">{d.dni}</td>
                                            <td className="p-4 font-black text-gray-900 uppercase">{d.name}</td>
                                            <td className="p-4">
                                                <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded border border-blue-200">
                                                    {d.classroom?.name || "Sin Aula"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handlePrintSingle(d)}
                                                    className="bg-gray-800 hover:bg-black text-white px-4 py-1.5 rounded font-bold text-xs shadow transition-all flex items-center gap-2 mx-auto"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                                    Imprimir Carnet
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ==========================================
                VISTA DE IMPRESIÓN (CARNETS PROFESIONALES)
            ========================================== */}
            {/* Se agrega estilos globales para forzar la impresión de colores de fondo */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page { margin: 10mm; size: auto; }
                }
            `}} />

            <div className="hidden print:flex flex-wrap gap-5 justify-start items-start p-2 bg-white">
                {delegatesToPrint.map((delegate) => (
                    // Tamaño estándar de gafete para lanyard (65mm x 100mm aprox)
                    <div key={delegate.id} className="w-[65mm] h-[100mm] bg-white border-[2px] border-[#0033a0] rounded-xl overflow-hidden flex flex-col relative page-break-inside-avoid shadow-sm outline outline-1 outline-gray-200">

                        {/* MARCA DE AGUA (Fondo sutil) */}
                        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.04]">
                            {/* Usa el mismo logo de la app como marca de agua en el centro */}
                            <img src="/logo.png" alt="watermark" className="w-[45mm] grayscale" />
                        </div>

                        {/* HEADER: AZUL Y ROJO (Profesional) */}
                        <div className="w-full bg-gradient-to-r from-[#002277] to-[#0033a0] h-[24mm] flex flex-col justify-center px-2 relative z-10 border-b-4 border-[#da291c]">
                            <div className="flex justify-between items-center w-full">
                                {/* ESPACIO PARA DOS LOGOS .PNG */}
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-[12mm] h-[14mm] bg-white/0 rounded-md flex items-center justify-center p-0.5 shadow-sm">
                                        <img src="/logo.png" alt="Logo 1" className="max-w-full max-h-full object-contain drop-shadow-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <span className="text-[5px] font-black text-[#0033a0] text-center absolute z-[-1]">LOGO 1<br />(public/logo1.png)</span>
                                    </div>
                                    <div className="w-[12mm] h-[14mm] bg-white/0 rounded-md flex items-center justify-center p-0.5 shadow-sm">
                                        <img src="/logo2.png" alt="Logo 2" className="max-w-full max-h-full object-contain drop-shadow-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <span className="text-[5px] font-black text-[#0033a0] text-center absolute z-[-1]">LOGO 2<br />(public/logo2.png)</span>
                                    </div>
                                </div>

                                <div className="text-right text-white">
                                    <h2 className="font-black text-[17px] tracking-widest uppercase m-0 leading-none drop-shadow-md">CREDENCIAL</h2>
                                    <h3 className="font-black text-[7px] tracking-widest text-[#FFD100] uppercase mt-1 leading-tight border-t border-white/30 pt-0.5">OFICIAL DE CAMPO</h3>
                                </div>
                            </div>
                        </div>

                        {/* CUERPO DEL CARNET */}
                        <div className="flex flex-col items-center px-3 pt-3 flex-1 relative z-10">
                            {/* RECUADRO FOTOGRAFÍA ESTILO ID */}
                            <div className="w-[28mm] h-[35mm] border-[2px] border-blue-900/20 bg-gray-50 flex items-center justify-center relative mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-sm">
                                {/* Icono de silueta sutil */}
                                <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <div className="absolute bottom-1 w-full text-center">
                                    <span className="text-[6px] font-bold text-gray-400 tracking-widest">FOTO<br />TAMAÑO CARNET</span>
                                </div>
                            </div>

                            {/* DATOS DEL DELEGADO */}
                            <div className="w-full text-center">
                                <p className="font-black text-[13px] text-[#002277] uppercase leading-none mb-1">
                                    {delegate.name}
                                </p>
                                <p className="font-bold text-[9px] text-gray-500 m-0 tracking-widest">ID / DNI: <span className="text-gray-900">{delegate.dni}</span></p>

                                <div className="mt-2 w-full bg-gradient-to-r from-[#da291c] to-red-600 rounded-sm py-1 shadow-sm">
                                    <p className="font-black text-[10px] text-white uppercase m-0 leading-none tracking-widest drop-shadow-sm">
                                        {delegate.classroom?.name || "SIN AULA ASIGNADA"}
                                    </p>
                                </div>
                            </div>

                            {/* CAMPOS A RELLENAR A MANO (Diseño Formulario) */}
                            <div className="w-full mt-4 flex flex-col gap-3">
                                <div className="flex items-end gap-1">
                                    <span className="text-[7px] font-black text-[#0033a0] uppercase tracking-widest mb-0.5 whitespace-nowrap">Disciplina:</span>
                                    <div className="flex-1 border-b-[1.5px] border-dotted border-gray-500 h-[2mm]"></div>
                                </div>
                                <div className="flex items-end gap-1">
                                    <span className="text-[7px] font-black text-[#0033a0] uppercase tracking-widest mb-0.5 whitespace-nowrap">Subdisciplina:</span>
                                    <div className="flex-1 border-b-[1.5px] border-dotted border-gray-500 h-[2mm]"></div>
                                </div>
                            </div>

                            {/* CÓDIGO DE BARRAS DECORATIVO (Para profesionalismo) */}
                            <div className="mt-auto w-full flex flex-col items-center opacity-80 mb-2">
                                <div className="h-[5mm] w-3/4 flex gap-[1px]">
                                    {/* Generando un código de barras visual fake */}
                                    {[...Array(30)].map((_, i) => (
                                        <div key={i} className="bg-black h-full" style={{ width: `${Math.random() * 2 + 0.5}px` }}></div>
                                    ))}
                                </div>
                                <span className="text-[5px] font-mono mt-0.5 tracking-[0.2em]">{delegate.id.split('-')[0].toUpperCase()}-{delegate.dni}</span>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="w-full bg-[#002277] h-[6mm] flex items-center justify-center absolute bottom-0 z-10 border-t border-[#001144]">
                            <p className="text-[6px] text-white font-black tracking-[0.15em] uppercase m-0">UNIÓN INTERNACIONAL - CAMPEONATO 2026</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}