import React, { useState, useEffect } from 'react';
import { Sesion } from '../../api/authApi';
import { apiClient } from '../../api/client';
import { 
  Building2, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  BookOpen,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';

interface AsistenteSetupInicialProps {
  onSetupCompletado: (sesion: Sesion) => Promise<void>;
}

export const AsistenteSetupInicial: React.FC<AsistenteSetupInicialProps> = ({
  onSetupCompletado
}) => {
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Datos del Estudio Contable
  const [nombreEstudio, setNombreEstudio] = useState('');
  const [rucEstudio, setRucEstudio] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [direccionFiscal, setDireccionFiscal] = useState('');

  // Paso 2: Cuenta del Administrador Principal
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Paso 3: 2FA TOTP
  const [mfaSecret, setMfaSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [codigoMfa, setCodigoMfa] = useState('');
  const [cargandoMfa, setCargandoMfa] = useState(false);

  // Estados de proceso y errores
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  // Validación de RUC Módulo 11 en cliente
  const validarRuc = (ruc: string) => {
    if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false;
    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += parseInt(ruc[i], 10) * factores[i];
    }
    const residuo = suma % 11;
    let esperado = 11 - residuo;
    if (esperado === 10) esperado = 0;
    else if (esperado === 11) esperado = 1;
    return parseInt(ruc[10], 10) === esperado;
  };

  const rucEsValido = rucEstudio ? validarRuc(rucEstudio) : false;

  // Validación de robustez de contraseña
  const passwordCriteria = {
    length: adminPassword.length >= 8,
    upper: /[A-Z]/.test(adminPassword),
    lower: /[a-z]/.test(adminPassword),
    number: /[0-9]/.test(adminPassword),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(adminPassword)
  };
  const passwordValida = Object.values(passwordCriteria).every(Boolean);

  // Cargar secreto MFA al pasar al paso 3
  useEffect(() => {
    if (paso === 3 && !mfaSecret && adminEmail) {
      setCargandoMfa(true);
      apiClient.get(`/setup/mfa-secret?email=${encodeURIComponent(adminEmail)}`)
        .then((data: any) => {
          if (data.data) {
            setMfaSecret(data.data.secret);
            setOtpauthUrl(data.data.otpauthUrl);
          } else {
            throw new Error('No se pudo generar el secreto de autenticación.');
          }
        })
        .catch(err => {
          console.error('Error cargando secreto MFA:', err);
          setErrorMensaje('No se pudo generar el secreto 2FA. Intente de nuevo.');
        })
        .finally(() => setCargandoMfa(false));
    }
  }, [paso, mfaSecret, adminEmail]);

  const handleSiguientePaso1 = () => {
    setErrorMensaje(null);
    if (!nombreEstudio.trim()) {
      setErrorMensaje('Ingrese la Razón Social o Nombre del Estudio Contable.');
      return;
    }
    if (!validarRuc(rucEstudio)) {
      setErrorMensaje('El RUC del Estudio es inválido (debe cumplir el algoritmo Módulo 11 de SUNAT).');
      return;
    }
    if (!emailContacto.includes('@')) {
      setErrorMensaje('Ingrese un correo electrónico de contacto válido.');
      return;
    }
    setPaso(2);
  };

  const handleSiguientePaso2 = () => {
    setErrorMensaje(null);
    if (!adminNombre.trim()) {
      setErrorMensaje('Ingrese el nombre completo del Administrador.');
      return;
    }
    if (!adminEmail.includes('@')) {
      setErrorMensaje('Ingrese un correo electrónico válido para la cuenta.');
      return;
    }
    if (!passwordValida) {
      setErrorMensaje('La contraseña no cumple con todas las directivas de seguridad.');
      return;
    }
    if (adminPassword !== adminPasswordConfirm) {
      setErrorMensaje('Las contraseñas ingresadas no coinciden.');
      return;
    }
    setPaso(3);
  };

  const handleSiguientePaso3 = () => {
    setErrorMensaje(null);
    if (!codigoMfa || codigoMfa.trim().length !== 6) {
      setErrorMensaje('Ingrese el código de 6 dígitos generado por su aplicación de autenticación.');
      return;
    }
    setPaso(4);
  };

  const handleFinalizarInicializacion = async () => {
    setErrorMensaje(null);
    setProcesando(true);

    try {
      const data: any = await apiClient.post('/setup/inicializar', {
        nombreEstudio,
        rucEstudio,
        emailContacto,
        telefonoContacto,
        direccionFiscal,
        adminNombre,
        adminEmail,
        adminPassword,
        mfaSecret,
        mfaCodigoVerificacion: codigoMfa.trim()
      });
      if (!data.success || !data.data?.accessToken) {
        throw new Error(data.error || 'Error al completar la inicialización del sistema.');
      }
      await onSetupCompletado(data.data);
    } catch (err: any) {
      setErrorMensaje(err.message || 'Error en la inicialización.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Cabecera del Asistente */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center relative">
          <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SUNAConta PRO — Configuración Inicial</h1>
          <p className="text-xs text-indigo-200/80 mt-1">
            Asistente de Primer Arranque para el Estudio Contable
          </p>

          {/* Indicador de pasos */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[
              { num: 1, label: 'Estudio' },
              { num: 2, label: 'Administrador' },
              { num: 3, label: 'Doble Factor' },
              { num: 4, label: 'Catálogos' }
            ].map(s => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                  paso === s.num
                    ? 'bg-indigo-500 text-white shadow-md ring-2 ring-indigo-300'
                    : paso > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {paso > s.num ? '✓' : s.num}
                </div>
                {s.num < 4 && (
                  <div className={`w-8 h-0.5 mx-1 ${paso > s.num ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenido del Paso */}
        <div className="p-6 md:p-8">
          {errorMensaje && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMensaje}</span>
            </div>
          )}

          {/* PASO 1: ESTUDIO CONTABLE */}
          {paso === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Paso 1: Identificación del Estudio Contable
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ingrese la información principal del estudio contable o titular del sistema.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razón Social o Nombre del Estudio Contable *
                </label>
                <input
                  type="text"
                  value={nombreEstudio}
                  onChange={e => setNombreEstudio(e.target.value)}
                  placeholder="Ej: ESTUDIO CONTABLE & ASOCIADOS S.A.C."
                  className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RUC del Estudio (11 dígitos) *
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={rucEstudio}
                    onChange={e => setRucEstudio(e.target.value.replace(/\D/g, ''))}
                    placeholder="20100000001"
                    className={`w-full text-sm px-3.5 py-2 border rounded-lg focus:outline-none ${
                      rucEstudio.length === 11 
                        ? (rucEsValido ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500' : 'border-rose-500 focus:ring-2 focus:ring-rose-500')
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {rucEstudio.length === 11 && (
                    <p className={`text-[11px] mt-1 font-medium ${rucEsValido ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {rucEsValido ? '✓ RUC válido bajo algoritmo Módulo 11' : '✗ RUC no cumple con el algoritmo Módulo 11'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={telefonoContacto}
                    onChange={e => setTelefonoContacto(e.target.value)}
                    placeholder="+51 987 654 321"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico de Contacto *
                  </label>
                  <input
                    type="email"
                    value={emailContacto}
                    onChange={e => setEmailContacto(e.target.value)}
                    placeholder="contacto@estudiocontable.pe"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección Fiscal
                  </label>
                  <input
                    type="text"
                    value={direccionFiscal}
                    onChange={e => setDireccionFiscal(e.target.value)}
                    placeholder="Av. Javier Prado Este 1234, Lima"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSiguientePaso1}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: ADMINISTRADOR PRINCIPAL */}
          {paso === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  Paso 2: Cuenta del Administrador Principal (ADMINISTRADOR)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina las credenciales de la cuenta principal con privilegios totales de administración.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo del Administrador *
                  </label>
                  <input
                    type="text"
                    value={adminNombre}
                    onChange={e => setAdminNombre(e.target.value)}
                    placeholder="Carlos Mendoza Quispe"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico (Usuario de Login) *
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@estudiocontable.pe"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Contraseña Maestra *
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
                    >
                      {mostrarPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={adminPasswordConfirm}
                    onChange={e => setAdminPasswordConfirm(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Checklist de complejidad de contraseña */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Requisitos de Seguridad de Contraseña (Fase 7 & 13)
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className={passwordCriteria.length ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {passwordCriteria.length ? '✓' : '○'} Mínimo 8 caracteres
                  </span>
                  <span className={passwordCriteria.upper ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {passwordCriteria.upper ? '✓' : '○'} Una letra mayúscula
                  </span>
                  <span className={passwordCriteria.lower ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {passwordCriteria.lower ? '✓' : '○'} Una letra minúscula
                  </span>
                  <span className={passwordCriteria.number ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {passwordCriteria.number ? '✓' : '○'} Al menos un número
                  </span>
                  <span className={passwordCriteria.special ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {passwordCriteria.special ? '✓' : '○'} Un carácter especial (!@#$...)
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleSiguientePaso2}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <span>Continuar al 2FA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: DOBLE FACTOR DE AUTENTICACIÓN (MFA TOTP) */}
          {paso === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Paso 3: Segundo Factor de Autenticación (2FA / TOTP Obligatorio)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conforme a la normativa de seguridad de información contable, el rol Administrador requiere 2FA.
                </p>
              </div>

              {cargandoMfa ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Generando clave secreta criptográfica Base32...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-col md:flex-row items-center gap-4">
                    <div className="w-24 h-24 bg-white border border-indigo-200 rounded-lg flex items-center justify-center p-2 shadow-inner shrink-0">
                      <QrCode className="w-20 h-20 text-slate-800" />
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-xs font-semibold text-slate-900">
                        1. Vincule su aplicación de autenticación
                      </p>
                      <p className="text-xs text-slate-600">
                        Abra una aplicación de autenticación en su teléfono y agregue la siguiente clave secreta:
                      </p>
                      <div className="mt-2 inline-block px-3 py-1.5 bg-white border border-indigo-200 rounded-md font-mono text-xs font-bold text-indigo-700 select-all tracking-wider">
                        {mfaSecret || 'CARGANDO_SECRETO...'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      2. Ingrese el código de 6 dígitos que muestra su aplicación *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={codigoMfa}
                      onChange={e => setCodigoMfa(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-widest text-lg font-mono font-bold px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 text-center">
                      El código se actualiza cada 30 segundos conforme al protocolo RFC 6238.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleSiguientePaso3}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <span>Verificar y Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: CATÁLOGOS BASE Y CONFIRMACIÓN */}
          {paso === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Paso 4: Inicialización de Catálogos Oficiales y Base de Datos
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  El sistema se inicializará con los catálogos normativos oficiales sin datos ficticios en producción.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
                    title: 'Plan Contable General Empresarial (PCGE 2019 modificado 2020)',
                    desc: 'Carga oficial completa a 2, 3, 4 y 5 dígitos con clasificación de activo, pasivo, patrimonio, gastos por naturaleza/función e ingresos.'
                  },
                  {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
                    title: 'Tablas Oficiales SUNAT (Catálogos 01 al 54)',
                    desc: 'Tipos de comprobante, tipos de documento de identidad, monedas ISO, regímenes de detracción, medios de pago bancarizados.'
                  },
                  {
                    icon: <Building2 className="w-4 h-4 text-blue-600" />,
                    title: 'Subdiarios estándar (00 al 99)',
                    desc: 'Apertura (00), Compras (01), Ventas (02), Cobranzas (03), Pagos (04), Diario General (05), Honorarios (06), Planillas (07).'
                  },
                  {
                    icon: <Sparkles className="w-4 h-4 text-amber-600" />,
                    title: 'Plantillas de Asientos Automáticos',
                    desc: 'Destino automático de compras 60/40/42 -> 20/61, destino de gastos elemento 9 y cancelación con bancarización.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setPaso(3)}
                  disabled={procesando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalizarInicializacion}
                  disabled={procesando}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  {procesando ? (
                    <span>Inicializando Sistema...</span>
                  ) : (
                    <>
                      <span>Completar Inicialización</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
