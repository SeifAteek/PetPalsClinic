import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { PetPalsBrand } from '@petpals/theme/PetPalsLogo.jsx'
import MeshBackground from '@petpals/theme/MeshBackground.jsx';
import ThemeToggle from '@petpals/theme/ThemeToggle.jsx';
import { Stethoscope, Mail, ShieldCheck, ArrowLeft, Heart, Sparkles } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else if (data.user) {
            onLoginSuccess(data.user);
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
        if (error) {
            setError(error.message);
        } else {
            setResetSent(true);
        }
        setResetLoading(false);
    };

    return (
        <div className="relative flex min-h-screen overflow-hidden text-[var(--pp-text-primary)]">
            <MeshBackground />
            <div className="absolute right-4 top-4 z-20">
                <ThemeToggle />
            </div>

            {/* Brand panel */}
            <div className="pp-login-brand-panel relative z-10 hidden w-1/2 flex-col border-r border-[var(--pp-card-border)] p-12 xl:p-16 lg:flex">
                <div className="flex items-center gap-3">
                    <PetPalsBrand logoSize="md" subtitle="Clinic portal" />
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-lg mt-12">
                    <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cerulean w-fit">
                        <Sparkles size={14} />
                        Veterinary OS
                    </div>
                    <h2 className="text-4xl font-black leading-tight mb-6">
                        The intelligent operating system for{' '}
                        <span className="bg-gradient-to-r from-brand-400 via-cerulean-light to-pp-blush bg-clip-text text-transparent">
                            modern clinics
                        </span>
                    </h2>
                    <ul className="space-y-6 text-slate-300">
                        <li className="flex items-start gap-4">
                            <ShieldCheck className="w-6 h-6 text-brand-400 shrink-0" />
                            <span><strong className="text-white">Secure records.</strong> Encrypted patient and clinic data.</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <Stethoscope className="w-6 h-6 text-brand-400 shrink-0" />
                            <span><strong className="text-white">Seamless care.</strong> Appointments, billing, and history in one place.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Auth form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative z-10">
                <div className="pp-card w-full max-w-md p-8 sm:p-10">
                    {!showReset ? (
                        <>
                            <div className="mb-8 text-center lg:text-left">
                                <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
                                <p className="text-slate-400">Sign in to your clinic portal to continue.</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 text-red-300 p-4 rounded-xl text-sm mb-6 border border-red-500/20 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="clinic-label">Work email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="clinic-input pl-10"
                                            placeholder="doctor@clinic.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="clinic-label">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="clinic-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex items-center justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setShowReset(true); setResetEmail(email); setError(null); }}
                                        className="text-sm font-medium text-brand-400 hover:text-brand-300"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary keep-white w-full">
                                    {loading ? 'Authenticating…' : 'Sign in'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => { setShowReset(false); setResetSent(false); setError(null); }}
                                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to sign in
                            </button>
                            <div className="mb-6">
                                <h2 className="text-3xl font-bold text-white mb-2">Reset password</h2>
                                <p className="text-slate-400">Enter your work email and we&apos;ll send a reset link.</p>
                            </div>
                            {error && (
                                <div className="bg-red-500/10 text-red-300 p-4 rounded-xl text-sm mb-6 border border-red-500/20">{error}</div>
                            )}
                            {resetSent ? (
                                <div className="bg-emerald-500/10 text-emerald-300 p-5 rounded-xl border border-emerald-500/20 font-semibold text-sm">
                                    ✓ Reset link sent to <strong>{resetEmail}</strong>. Check your inbox.
                                </div>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    <div>
                                        <label className="clinic-label">Work email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-500" />
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                className="clinic-input pl-10"
                                                placeholder="doctor@clinic.com"
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={resetLoading} className="btn-primary w-full">
                                        {resetLoading ? 'Sending…' : 'Send reset link'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
