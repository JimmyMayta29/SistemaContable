import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { authApi, Sesion } from '../../api/authApi';

export function LoginView({ onAutenticado }: { onAutenticado: (sesion: Sesion) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const iniciarSesion = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcesando(true);
    setError('');
    try {
      const sesion = await authApi.login(email.trim(), password, totpCode.trim());
      await onAutenticado(sesion);
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={iniciarSesion} className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl space-y-5">
        <div className="space-y-2">
          <Lock className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="text-sm text-slate-500">Acceda a su estudio contable.</p>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
        <div>
          <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-1">Correo electrónico</label>
          <input id="login-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required disabled={procesando} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-1">Contraseña</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={procesando} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="login-totp" className="block text-sm font-semibold text-slate-700 mb-1">Código de autenticación</label>
          <input id="login-totp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} disabled={procesando} aria-describedby="login-totp-help" className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500" />
          <p id="login-totp-help" className="text-xs text-slate-500 mt-1">Ingrese los 6 dígitos si su cuenta usa doble factor.</p>
        </div>
        <button type="submit" disabled={procesando} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2">
          <LogIn className="w-4 h-4" />{procesando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
