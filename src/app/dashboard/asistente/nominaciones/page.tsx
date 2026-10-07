"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

type Classroom = { id: string; name: string };
type Discipline = {
    id: string;
    name: string;
    audience: string;
    subDisciplines: any[]
};

type ParsedPlayer = {
    dni: string;
    firstName: string;
    lastName: string;
    gender: string;
    isStarter: boolean;
    isParent: boolean;
    jerseyNumber?: string;
    rawStatus: "SAVED" | "NEW" | "DUPLICATED";
    duplicateMsg?: string;
};

type ParsedTeam = {
    subDisciplineId: string;
    subDisciplineName: string;
    players: ParsedPlayer[];
};

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

export default function NominacionesPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);

    const [selectedClassroomId, setSelectedClassroomId] = useState("");
    const [selectedSubDisciplineId, setSelectedSubDisciplineId] = useState("");
    const [selectedTeamLetter, setSelectedTeamLetter] = useState("A");

    const [pasteData, setPasteData] = useState("");
    const [parsedTeams, setParsedTeams] = useState<ParsedTeam[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [savedTeams, setSavedTeams] = useState<any[]>([]);
    const [annotatedSavedTeams, setAnnotatedSavedTeams] = useState<any[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(false);

    const [editingPlayer, setEditingPlayer] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClassroomId) {
            fetchSavedTeams(selectedClassroomId);
        } else {
            setSavedTeams([]);
        }
    }, [selectedClassroomId]);

    // --- LÓGICA CAMBIADA: Agrupar por SUB-DISCIPLINA para validar Equipo A vs Equipo B ---
    useEffect(() => {
        const newTeams = JSON.parse(JSON.stringify(savedTeams));
        const subDisciplineMap = new Map();

        newTeams.forEach((team: any) => {
            const subId = team.subDisciplineId;
            if (!subDisciplineMap.has(subId)) subDisciplineMap.set(subId, []);
            subDisciplineMap.get(subId).push(team);
        });

        subDisciplineMap.forEach((teamsInSubDisc: any[]) => {
            const dniToTeams = new Map<string, string[]>();

            teamsInSubDisc.forEach((team) => {
                team.players.forEach((p: any) => {
                    const dni = p.player.dni;
                    const teamName = `Equipo ${team.letter}`;
                    if (!dniToTeams.has(dni)) dniToTeams.set(dni, []);
                    dniToTeams.get(dni)?.push(teamName);
                });
            });

            teamsInSubDisc.forEach((team) => {
                team.players.forEach((p: any) => {
                    const dni = p.player.dni;
                    const teamsWithDni = dniToTeams.get(dni);
                    if (teamsWithDni && teamsWithDni.length > 1) {
                        p.isDuplicated = true;
                        const otherTeams = teamsWithDni.filter((t: string) => t !== `Equipo ${team.letter}`);
                        if (otherTeams.length > 0) {
                            p.duplicateMsg = `Advertencia: Juega también en ${otherTeams.join(', ')}`;
                        } else {
                            p.duplicateMsg = `Advertencia: DNI repetido en este mismo equipo`;
                        }
                    } else {
                        p.isDuplicated = false;
                    }
                });
            });
        });

        setAnnotatedSavedTeams(newTeams);
    }, [savedTeams]);

    const fetchInitialData = async () => {
        try {
            const [classroomsRes, disciplinesRes] = await Promise.all([
                fetch("/api/classrooms"),
                fetch("/api/disciplines")
            ]);
            if (classroomsRes.ok) setClassrooms(await classroomsRes.json());
            if (disciplinesRes.ok) setDisciplines(await disciplinesRes.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSavedTeams = async (classroomId: string) => {
        setIsLoadingTeams(true);
        try {
            const res = await fetch(`/api/teams?classroomId=${classroomId}`);
            if (res.ok) setSavedTeams(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingTeams(false);
        }
    };

    const handleDownloadTemplate = (discipline: Discipline) => {
        if (!discipline.subDisciplines || discipline.subDisciplines.length === 0) {
            alert(`La disciplina ${discipline.name} no tiene categorías registradas aún.`);
            return;
        }

        const wb = XLSX.utils.book_new();
        const headers = [["DNI", "NOMBRES", "APELLIDOS", "GENERO", "CONDICION", "ES_PADRE", "N° CAMISETA"]];

        discipline.subDisciplines.forEach((sub: any) => {
            const ws = XLSX.utils.aoa_to_sheet(headers);

            ws['!cols'] = [
                { wch: 12 },
                { wch: 25 },
                { wch: 25 },
                { wch: 10 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 },
            ];

            const safeSheetName = sub.name.replace(/[\\\/\?\*\[\]:]/g, "").substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        });

        XLSX.writeFile(wb, `${discipline.name}.xlsx`);
    };

    const processRawRows = (rows: any[][]): ParsedPlayer[] => {
        const players: ParsedPlayer[] = [];
        rows.forEach(cols => {
            if (cols.length >= 6) {
                const dni = String(cols[0] || "").trim();
                const firstName = String(cols[1] || "").trim();
                const lastName = String(cols[2] || "").trim();
                const gender = String(cols[3] || "").toUpperCase().startsWith('M') ? 'M' : 'F';
                const condicion = String(cols[4] || "").toUpperCase();
                const esPadreStr = String(cols[5] || "").toUpperCase();
                const jerseyNum = cols[6] ? String(cols[6]).trim() : undefined;

                if (!dni || dni.toUpperCase() === 'DNI' || firstName.toUpperCase() === 'NOMBRES') return;

                players.push({
                    dni,
                    firstName,
                    lastName,
                    gender,
                    isStarter: condicion === 'TITULAR',
                    isParent: esPadreStr === 'SI' || esPadreStr === 'SÍ',
                    jerseyNumber: jerseyNum,
                    rawStatus: "NEW"
                });
            }
        });
        return players;
    };

    // --- LÓGICA CAMBIADA: Valida la vista previa comparando con la misma SUBDISCIPLINA ---
    const validateAllDuplicates = (teams: ParsedTeam[]): ParsedTeam[] => {
        if (!selectedClassroomId) return teams;

        return teams.map(team => {
            // Buscamos si en la base de datos ya existe otro equipo (distinta letra) para esta misma subdisciplina
            const dbTeamsInSameSubDiscipline = savedTeams.filter(t =>
                t.subDisciplineId === team.subDisciplineId && t.letter !== selectedTeamLetter
            );

            const existingDnis = new Map<string, string>();

            dbTeamsInSameSubDiscipline.forEach(t => {
                t.players.forEach((p: any) => {
                    existingDnis.set(p.player.dni, `Equipo ${t.letter}`);
                });
            });

            const seenDnisInUpload = new Set<string>();

            const validatedPlayers = team.players.map(player => {
                if (existingDnis.has(player.dni)) {
                    return { ...player, rawStatus: "DUPLICATED" as const, duplicateMsg: `Advertencia: Ya juega en el ${existingDnis.get(player.dni)}` };
                }
                if (seenDnisInUpload.has(player.dni)) {
                    return { ...player, rawStatus: "DUPLICATED" as const, duplicateMsg: "Advertencia: Repetido en este Excel" };
                }
                seenDnisInUpload.add(player.dni);
                return player;
            });
            return { ...team, players: validatedPlayers };
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedClassroomId) {
            alert("Selecciona un aula primero.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setPasteData("");
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

        const matchedDiscipline = disciplines.find(d => normalizeString(d.name) === normalizeString(fileNameWithoutExt));

        if (!matchedDiscipline) {
            alert(`El archivo "${fileNameWithoutExt}" no coincide con ninguna Disciplina.\nDisciplinas válidas: ${disciplines.map(d => d.name).join(', ')}`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            if (typeof bstr === 'string') {
                const wb = XLSX.read(bstr, { type: 'binary' });
                const newParsedTeams: ParsedTeam[] = [];

                wb.SheetNames.forEach(sheetName => {
                    const matchedSub = matchedDiscipline.subDisciplines.find((s: any) => normalizeString(s.name) === normalizeString(sheetName));
                    if (matchedSub) {
                        const ws = wb.Sheets[sheetName];
                        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                        const players = processRawRows(data);
                        if (players.length > 0) {
                            newParsedTeams.push({
                                subDisciplineId: matchedSub.id,
                                subDisciplineName: matchedSub.name,
                                players
                            });
                        }
                    }
                });

                if (newParsedTeams.length === 0) {
                    alert(`No se encontraron hojas que coincidan con las categorías de ${matchedDiscipline.name}.`);
                } else {
                    setParsedTeams(validateAllDuplicates(newParsedTeams)); // Llama sin el segundo parámetro
                }
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePasteProcess = (text: string) => {
        setPasteData(text);
        if (!text.trim()) {
            setParsedTeams([]);
            return;
        }
        if (!selectedSubDisciplineId) {
            alert("Para pegar manualmente, debes seleccionar la Categoría (Paso 2).");
            return;
        }

        const parentDiscipline = disciplines.find(d => d.subDisciplines.some((s: any) => s.id === selectedSubDisciplineId));
        const matchedSub = parentDiscipline?.subDisciplines.find((s: any) => s.id === selectedSubDisciplineId);

        if (!parentDiscipline || !matchedSub) return;

        const rows = text.split("\n").filter(row => row.trim() !== "");
        const rawData = rows.map(row => row.split("\t"));
        const players = processRawRows(rawData);

        const newTeam: ParsedTeam = {
            subDisciplineId: matchedSub.id,
            subDisciplineName: matchedSub.name,
            players
        };

        setParsedTeams(validateAllDuplicates([newTeam])); // Llama sin el segundo parámetro
    };

    const handleSaveBulk = async () => {
        if (!selectedClassroomId || parsedTeams.length === 0) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/team-players/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classroomId: selectedClassroomId,
                    teamLetter: selectedTeamLetter,
                    teamsData: parsedTeams.map(t => ({
                        subDisciplineId: t.subDisciplineId,
                        playersData: t.players
                    }))
                })
            });

            if (res.ok) {
                alert("¡Nóminas guardadas exitosamente!");
                setParsedTeams([]);
                setPasteData("");
                fetchSavedTeams(selectedClassroomId);
            } else {
                const err = await res.json();
                if (err.error === "Jugadores duplicados detectados") {
                    alert("Se guardaron los datos, pero ten en cuenta que hay jugadores repetidos en otros equipos de la misma categoría.");
                    setParsedTeams([]);
                    setPasteData("");
                    fetchSavedTeams(selectedClassroomId);
                } else {
                    alert(err.error || "Error al guardar");
                    if (err.details) alert(err.details.join("\n"));
                }
            }
        } catch (error) {
            console.error(error);
            alert("Ocurrió un error inesperado.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTeam = async (teamId: string, teamName: string) => {
        if (!confirm(`¿Estás seguro de eliminar todo el ${teamName}? Esta acción no se puede deshacer.`)) return;
        try {
            const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
            if (res.ok) fetchSavedTeams(selectedClassroomId);
            else alert("Error al eliminar la nómina.");
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeletePlayer = async (teamPlayerId: string, playerName: string) => {
        if (!confirm(`¿Remover a ${playerName} de la nómina?`)) return;
        try {
            const res = await fetch(`/api/team-players/${teamPlayerId}`, { method: "DELETE" });
            if (res.ok) fetchSavedTeams(selectedClassroomId);
            else alert("Error al eliminar jugador.");
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdatePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlayer) return;
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/team-players/${editingPlayer.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: editingPlayer.player.firstName,
                    lastName: editingPlayer.player.lastName,
                    gender: editingPlayer.player.gender,
                    isParent: editingPlayer.player.isParent,
                    isStarter: editingPlayer.isStarter,
                    jerseyNumber: editingPlayer.jerseyNumber
                })
            });
            if (res.ok) {
                setEditingPlayer(null);
                fetchSavedTeams(selectedClassroomId);
            } else {
                alert("Error al actualizar jugador.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const groupedForPrint = annotatedSavedTeams.reduce((acc, team) => {
        const audience = team.subDiscipline.discipline.audience;
        const discName = team.subDiscipline.discipline.name;

        if (!acc[audience]) acc[audience] = {};
        if (!acc[audience][discName]) acc[audience][discName] = [];

        acc[audience][discName].push(team);
        return acc;
    }, {} as Record<string, Record<string, any[]>>);

    const selectedClassroomName = classrooms.find(c => c.id === selectedClassroomId)?.name || "Aula";

    const hasWarnings = parsedTeams.some(team => team.players.some(p => p.rawStatus === "DUPLICATED"));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* === SECCIÓN DE INTERFAZ NORMAL (NO SE IMPRIME) === */}
            <div className="p-6 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Nóminas</h1>
                        <p className="text-gray-600 text-sm font-medium mt-1">Sube un Excel (múltiples hojas) o gestiona las nóminas guardadas.</p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        disabled={annotatedSavedTeams.length === 0}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Imprimir Reportes
                    </button>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">1. Seleccionar Aula (Obligatorio)</label>
                        <select className="w-full border-2 border-indigo-200 rounded-xl p-3 font-bold text-indigo-900 focus:border-indigo-600 bg-indigo-50/50" value={selectedClassroomId} onChange={(e) => setSelectedClassroomId(e.target.value)}>
                            <option value="">-- Seleccione un Salón --</option>
                            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">2. Categoría (Solo si pegas manual)</label>
                        <select className="w-full border-2 border-indigo-200 rounded-xl p-3 font-bold text-indigo-900 focus:border-indigo-600 bg-indigo-50/50" value={selectedSubDisciplineId} onChange={(e) => setSelectedSubDisciplineId(e.target.value)}>
                            <option value="">-- Automático por Excel --</option>
                            {disciplines.map(d => (
                                <optgroup key={d.id} label={`${d.name} (${d.audience})`} className="font-black text-gray-900">
                                    {d.subDisciplines.map((s: any) => (
                                        <option key={s.id} value={s.id} className="font-medium text-gray-700">{s.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">3. Letra del Equipo</label>
                        <div className="flex gap-2">
                            {["A", "B", "C"].map(letter => (
                                <label key={letter} className={`flex-1 cursor-pointer text-center px-4 py-3 border-2 rounded-xl font-black transition-colors ${selectedTeamLetter === letter ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300'}`}>
                                    <input type="radio" name="teamLetter" value={letter} checked={selectedTeamLetter === letter} onChange={(e) => setSelectedTeamLetter(e.target.value)} className="hidden" />
                                    Equipo {letter}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
                            <div className="mb-6">
                                <h3 className="font-black text-lg text-gray-900 mb-2">4. Subir Archivo Excel</h3>
                                <p className="text-xs text-gray-500 mb-3 font-medium">Nombre archivo = Disciplina.<br />Nombre hoja = Subdisciplina.</p>
                                <label className="flex items-center justify-center w-full h-16 px-4 transition bg-white border-2 border-indigo-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 focus:outline-none">
                                    <span className="flex items-center space-x-2 text-indigo-700 font-bold">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <span>Seleccionar Excel (.xlsx)</span>
                                    </span>
                                    <input type="file" ref={fileInputRef} name="file_upload" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                                </label>
                            </div>

                            {disciplines.length > 0 && (
                                <div className="mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <p className="text-[11px] font-black text-indigo-800 uppercase tracking-wider mb-2">📥 Descargar Plantillas Base:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {disciplines.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => handleDownloadTemplate(d)}
                                                className="text-[10px] bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-2.5 py-1.5 rounded-lg font-bold shadow-sm transition-all"
                                                title={`Descargar plantilla para ${d.name}`}
                                            >
                                                {d.name} ({d.audience.charAt(0)})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center mb-6">
                                <div className="flex-grow border-t border-gray-300"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 font-bold text-xs">O PEGAR MANUALMENTE</span>
                                <div className="flex-grow border-t border-gray-300"></div>
                            </div>

                            <textarea
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl p-4 font-mono text-sm text-gray-700 focus:border-indigo-500 focus:bg-indigo-50 transition-colors resize-none"
                                placeholder="DNI | NOMBRES | APELLIDOS | GENERO | CONDICION | ES_PADRE | N° CAMISETA"
                                value={pasteData}
                                onChange={(e) => handlePasteProcess(e.target.value)}
                            ></textarea>

                            <div className="mt-6 flex flex-col gap-3">
                                {hasWarnings && (
                                    <p className="text-xs text-orange-600 font-bold bg-orange-50 p-2 rounded-lg text-center border border-orange-200">
                                        ⚠️ Jugadores en otro equipo de esta categoría. Puedes guardar y editarlos más tarde si es necesario.
                                    </p>
                                )}
                                <button
                                    onClick={handleSaveBulk}
                                    disabled={isSaving || parsedTeams.length === 0 || !selectedClassroomId}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-black shadow-md disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm transition-transform active:scale-95"
                                >
                                    {isSaving ? "Guardando..." : "Guardar Vista Previa"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-2 space-y-6">
                        {/* VISTA PREVIA (NO SE IMPRIME) */}
                        {parsedTeams.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-200 overflow-hidden flex flex-col">
                                <div className="bg-indigo-600 text-white p-4 shrink-0 flex justify-between items-center">
                                    <h3 className="font-black text-lg">VISTA PREVIA (Falta Guardar)</h3>
                                </div>
                                <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
                                    {parsedTeams.map((team, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-indigo-50 px-4 py-2 font-bold text-indigo-900 border-b border-gray-200 flex justify-between">
                                                <span>Subdisciplina: {team.subDisciplineName}</span>
                                                <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">{team.players.length} jugadores</span>
                                            </div>
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="bg-gray-100 text-gray-600 font-black uppercase text-xs tracking-wider">
                                                    <tr>
                                                        <th className="p-3">DNI</th>
                                                        <th className="p-3">Apellidos, Nombres</th>
                                                        <th className="p-3 text-center">Gen</th>
                                                        <th className="p-3 text-center">Condición</th>
                                                        <th className="p-3 text-center">Camiseta</th>
                                                        <th className="p-3 text-center">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {team.players.map((p, pIdx) => (
                                                        <tr key={pIdx} className={p.rawStatus === 'DUPLICATED' ? 'bg-orange-50' : 'bg-white'}>
                                                            <td className={`p-3 font-mono font-bold ${p.rawStatus === 'DUPLICATED' ? 'text-orange-700' : 'text-gray-700'}`}>{p.dni}</td>
                                                            <td className="p-3 font-bold text-gray-900">{p.lastName}, {p.firstName}</td>
                                                            <td className="p-3 text-center font-bold text-gray-600">{p.gender}</td>
                                                            <td className="p-3 text-center">
                                                                <span className={`text-[10px] font-black px-2 py-1 rounded tracking-wider ${p.isStarter ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                                                    {p.isStarter ? 'TITULAR' : 'SUPLENTE'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center font-black text-indigo-600">{p.jerseyNumber || '-'}</td>
                                                            <td className="p-3 text-center font-bold">
                                                                {p.rawStatus === "DUPLICATED" ? (
                                                                    <span className="text-[10px] text-orange-800 bg-orange-200 px-2 py-1 rounded block whitespace-normal">{p.duplicateMsg}</span>
                                                                ) : <span className="text-indigo-600">✓ Listo</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DATOS GUARDADOS EN VIVO (Muestra duplicados) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="bg-gray-900 text-white p-4 shrink-0 flex justify-between items-center">
                                <h3 className="font-black text-lg">Nóminas Oficiales Guardadas</h3>
                                <span className="text-xs font-bold text-gray-300">Aula: {selectedClassroomName}</span>
                            </div>
                            <div className="p-4 space-y-6">
                                {isLoadingTeams ? (
                                    <p className="text-center font-bold text-gray-500 py-10">Cargando nóminas...</p>
                                ) : annotatedSavedTeams.length === 0 ? (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        <p className="font-bold">No hay equipos registrados en este salón.</p>
                                    </div>
                                ) : (
                                    annotatedSavedTeams.map((team: any) => (
                                        <div key={team.id} className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex justify-between items-center">
                                                <div>
                                                    <span className="text-xs font-black text-gray-500 uppercase block">{team.subDiscipline.discipline.name}</span>
                                                    <span className="font-black text-gray-900">{team.subDiscipline.name} - Equipo {team.letter}</span>
                                                </div>
                                                <button onClick={() => handleDeleteTeam(team.id, `Equipo ${team.letter} de ${team.subDiscipline.name}`)} className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    Eliminar Nómina
                                                </button>
                                            </div>
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                                    <tr>
                                                        <th className="p-3">Nº</th>
                                                        <th className="p-3">DNI / Jugador</th>
                                                        <th className="p-3 text-center">Gen</th>
                                                        <th className="p-3 text-center">Condición</th>
                                                        <th className="p-3 text-center">Camiseta</th>
                                                        <th className="p-3 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {team.players.map((tp: any, idx: number) => (
                                                        <tr key={tp.id} className={`${tp.isDuplicated ? 'bg-orange-50' : 'hover:bg-gray-50'} transition-colors`}>
                                                            <td className="p-3 font-bold text-gray-400">{idx + 1}</td>
                                                            <td className="p-3">
                                                                <div className="font-mono text-xs text-gray-500">{tp.player.dni}</div>
                                                                <div className="font-bold text-gray-900">{tp.player.lastName}, {tp.player.firstName}</div>
                                                                {tp.isDuplicated && (
                                                                    <div className="text-[10px] text-orange-800 bg-orange-200 px-2 py-1 rounded mt-1 inline-block whitespace-normal max-w-xs">
                                                                        {tp.duplicateMsg}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center font-bold text-gray-600">{tp.player.gender}</td>
                                                            <td className="p-3 text-center">
                                                                <span className={`text-[10px] font-black px-2 py-1 rounded tracking-wider ${tp.isStarter ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                                                    {tp.isStarter ? 'TITULAR' : 'SUPLENTE'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center font-black text-indigo-600">{tp.jerseyNumber || '-'}</td>
                                                            <td className="p-3 text-center flex justify-center gap-3">
                                                                <button onClick={() => setEditingPlayer(JSON.parse(JSON.stringify(tp)))} className="text-blue-500 hover:text-blue-700 transition-colors mt-2" title="Editar Jugador">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                                </button>
                                                                <button onClick={() => handleDeletePlayer(tp.id, tp.player.firstName)} className="text-red-400 hover:text-red-700 transition-colors mt-2" title="Quitar Jugador">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === MODAL DE EDICIÓN === */}
            {editingPlayer && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-black mb-4">Editar Jugador</h2>
                        <form onSubmit={handleUpdatePlayer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">DNI (No editable)</label>
                                <input type="text" value={editingPlayer.player.dni} disabled className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombres</label>
                                    <input type="text" value={editingPlayer.player.firstName} onChange={e => setEditingPlayer({ ...editingPlayer, player: { ...editingPlayer.player, firstName: e.target.value } })} required className="w-full border rounded-lg p-2 uppercase" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Apellidos</label>
                                    <input type="text" value={editingPlayer.player.lastName} onChange={e => setEditingPlayer({ ...editingPlayer, player: { ...editingPlayer.player, lastName: e.target.value } })} required className="w-full border rounded-lg p-2 uppercase" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Género</label>
                                    <select value={editingPlayer.player.gender} onChange={e => setEditingPlayer({ ...editingPlayer, player: { ...editingPlayer.player, gender: e.target.value } })} className="w-full border rounded-lg p-2">
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Condición</label>
                                    <select value={editingPlayer.isStarter ? "true" : "false"} onChange={e => setEditingPlayer({ ...editingPlayer, isStarter: e.target.value === "true" })} className="w-full border rounded-lg p-2">
                                        <option value="true">Titular</option>
                                        <option value="false">Suplente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Camiseta</label>
                                    <input type="text" value={editingPlayer.jerseyNumber || ""} onChange={e => setEditingPlayer({ ...editingPlayer, jerseyNumber: e.target.value })} placeholder="Opc." className="w-full border rounded-lg p-2" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input type="checkbox" checked={editingPlayer.player.isParent} onChange={e => setEditingPlayer({ ...editingPlayer, player: { ...editingPlayer.player, isParent: e.target.checked } })} className="w-4 h-4" />
                                <span className="text-sm font-bold text-gray-700">Es Padre/Madre de familia</span>
                            </label>

                            <div className="flex gap-3 mt-6 pt-4 border-t">
                                <button type="button" onClick={() => setEditingPlayer(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-bold">Cancelar</button>
                                <button type="submit" disabled={isUpdating} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold disabled:opacity-50">
                                    {isUpdating ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* === VISTA EXCLUSIVA PARA IMPRESIÓN (SIN ESPACIOS GIGANTES) === */}
            <div className="hidden print:block bg-white text-black w-full text-xs">
                <div className="text-center mb-4 border-b-2 border-black pb-2">
                    <h1 className="text-xl font-black uppercase mb-1">Reporte Oficial de Nóminas</h1>
                    <h2 className="text-lg font-bold">Salón: {selectedClassroomName}</h2>
                    <p className="text-[10px] font-medium mt-1">Colegio Unión Internacional - Campeonato Deportivo 2026</p>
                </div>

                {annotatedSavedTeams.length === 0 ? (
                    <p className="text-center italic font-bold">No hay nóminas registradas para este salón.</p>
                ) : (
                    <div className="space-y-4">
                        {(Object.entries(groupedForPrint) as [string, Record<string, any[]>][]).map(([audience, disciplinesObj]) => (
                            <div key={audience} className="mb-4">
                                <h2 className="text-lg font-black text-center bg-gray-200 border-t-2 border-b-2 border-black py-1 mb-2 uppercase tracking-widest break-after-avoid">
                                    CATEGORÍA: {audience}
                                </h2>

                                {(Object.entries(disciplinesObj) as [string, any[]][]).map(([discName, teamsArr]) => (
                                    <div key={discName} className="mb-3">
                                        <h3 className="text-sm font-black uppercase underline mb-1 ml-2 break-after-avoid">
                                            {discName}
                                        </h3>
                                        <div className="space-y-3">
                                            {teamsArr.map((team: any) => (
                                                <div key={team.id} className="pl-4 break-inside-avoid mb-2">
                                                    <h4 className="text-[11px] font-bold mb-1">
                                                        ▶ {team.subDiscipline.name} - Equipo {team.letter}
                                                    </h4>
                                                    {team.players.length === 0 ? (
                                                        <p className="text-[10px] italic ml-4">Sin nómina.</p>
                                                    ) : (
                                                        <table className="w-full text-[10px] border-collapse border border-gray-600 mb-1">
                                                            <thead>
                                                                <tr className="bg-gray-100">
                                                                    <th className="border border-gray-400 py-1 px-1 text-center w-6">Nº</th>
                                                                    <th className="border border-gray-400 py-1 px-1 text-center w-14">DNI</th>
                                                                    <th className="border border-gray-400 py-1 px-2 text-left">Apellidos y Nombres</th>
                                                                    <th className="border border-gray-400 py-1 px-1 text-center w-6">Gen</th>
                                                                    <th className="border border-gray-400 py-1 px-1 text-center w-10">Dorsal</th>
                                                                    <th className="border border-gray-400 py-1 px-1 text-center w-14">Condición</th>
                                                                    <th className="border border-gray-400 py-1 px-2 text-center w-20">Firma</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {team.players.map((p: any, idx: number) => (
                                                                    <tr key={p.id}>
                                                                        <td className="border border-gray-400 py-1 px-1 font-bold text-center">{idx + 1}</td>
                                                                        <td className="border border-gray-400 py-1 px-1 text-center">{p.player.dni}</td>
                                                                        <td className="border border-gray-400 py-1 px-2 font-bold">
                                                                            {p.player.lastName}, {p.player.firstName}
                                                                            {p.player.isParent ? " (P)" : ""}
                                                                        </td>
                                                                        <td className="border border-gray-400 py-1 px-1 text-center">{p.player.gender}</td>
                                                                        <td className="border border-gray-400 py-1 px-1 text-center font-bold">{p.jerseyNumber || "-"}</td>
                                                                        <td className="border border-gray-400 py-1 px-1 text-center">
                                                                            {p.isStarter ? "Titular" : "Suplente"}
                                                                        </td>
                                                                        <td className="border border-gray-400 py-1 px-2"></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 flex justify-around print:flex break-inside-avoid">
                    <div className="text-center">
                        <div className="w-48 border-t border-black mb-1 mx-auto"></div>
                        <p className="text-[10px] font-bold">Firma del Delegado(a)</p>
                    </div>
                    <div className="text-center">
                        <div className="w-48 border-t border-black mb-1 mx-auto"></div>
                        <p className="text-[10px] font-bold">V°B° Comisión Organizadora</p>
                    </div>
                </div>
            </div>
        </div>
    );
}