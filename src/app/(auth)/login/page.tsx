"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await signIn("credentials", {
            redirect: false,
            username,
            password,
        });

        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            // Redirige al enrutador general del dashboard
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1A28] relative overflow-hidden font-sans">

            {/* ELEMENTOS DECORATIVOS DE FONDO */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#00E5FF] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md p-8 relative z-10">

                {/* TARJETA PRINCIPAL TIPO GLASSMORPHISM */}
                <div className="bg-[#112233]/80 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">

                    {/* LOGO O ÍCONO CENTRAL */}
                    {/* LOGO DEL COLEGIO */}
                    <div className="flex justify-center mb-6">
                        <div className="w-28 h-28 relative flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                            {/* Efecto de luz neón detrás del logo */}
                            <div className="absolute inset-0 bg-[#00E5FF] blur-xl opacity-20 rounded-full animate-pulse"></div>

                            <Image
                                src="/logo.png"
                                alt="Logo Colegio Unión Internacional"
                                fill
                                className="object-contain relative z-10 drop-shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                                priority
                            />
                        </div>
                    </div>
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">Olimpiadas</h1>
                        <h2 className="text-lg font-bold text-[#00E5FF] uppercase tracking-widest mt-1">Colegio Unión</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ALERTA DE ERROR ESTILIZADA */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-xs font-bold text-center animate-pulse">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Usuario
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-5 py-4 bg-[#0B1A28]/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#00E5FF] focus:border-transparent text-white font-bold placeholder-gray-600 transition-all outline-none"
                                placeholder="Ingresa tu usuario"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-[#0B1A28]/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[#00E5FF] focus:border-transparent text-white font-bold placeholder-gray-600 transition-all outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#00E5FF] to-blue-500 text-[#0B1A28] font-black py-4 px-4 rounded-2xl hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 mt-4 text-sm uppercase tracking-widest"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-[#0B1A28]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    ACCEDIENDO...
                                </span>
                            ) : (
                                "Ingresar al Sistema"
                            )}
                        </button>
                    </form>
                </div>

                {/* FOOTER DEL LOGIN */}
                <p className="text-center text-gray-500 text-xs font-bold mt-8 uppercase tracking-widest">
                    Plataforma Deportiva Oficial
                </p>
            </div>
        </div>
    );
}