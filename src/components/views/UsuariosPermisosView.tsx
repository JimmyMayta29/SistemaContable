import React, { useState } from 'react';
import { Users, UserCheck, Shield, Plus, CheckCircle2, Lock, Key, Mail, Calendar } from 'lucide-react';
import { useEmpresaPeriodo, RolEmpresa } from '../../context/EmpresaPeriodoContext';
import { useToast } from '../../context/ToastContext';

interface UsuarioEmpresaItem {
  id: string;
  nombre: string;
  email: string;
  rol: RolEmpresa;
  estado: 'ACTIVO' | 'INACTIVO';
  asignadoEn: string;
}

export const UsuariosPermisosView: React.FC = () => {
  const { empresaActiva, rolEnEmpresa } = useEmpresaPeriodo();
  const { success } = useToast();

  const [usuarios, setUsuarios] = useState<UsuarioEmpresaItem[]>([
    {
      id: 'usr-admin-01',
      nombre: 'CPC. Carlos Mendoza R.',
      email: 'admin@sunaconta.pe',
      rol: 'ADMINISTRADOR',
      estado: 'ACTIVO',
      asignadoEn: '2026-01-01'
    },
    {
      id: 'usr-contador-01',
      nombre: 'CPC. Ana María Morales',
      email: 'contador@sunaconta.pe',
      rol: 'CONTADOR',
      estado: 'ACTIVO',
      asignadoEn: '2026-02-15'
    },
    {
      id: 'usr-asistente-01',
      nombre: 'Bach. Jorge Valdivia P.',
      email: 'asistente@sunaconta.pe',
      rol: 'ASISTENTE',
      estado: 'ACTIVO',
      asignadoEn: '2026-03-01'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolEmpresa>('ASISTENTE');

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoEmail) return;

    setUsuarios(prev => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        nombre: nuevoNombre,
        email: nuevoEmail,
        rol: nuevoRol,
        estado: 'ACTIVO',
        asignadoEn: new Date().toISOString().split('T')[0]
      }
    ]);
    setIsModalOpen(false);
    setNuevoNombre('');
    setNuevoEmail('');
    success(`Usuario ${nuevoNombre} asignado con rol ${nuevoRol} a ${empresaActiva?.razonSocial}`, 'Usuario Asignado');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Usuarios & Permisos en esta Empresa (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de membresías en <code className="font-mono text-blue-700 font-bold">usuario_empresa</code> para {empresaActiva?.razonSocial}.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Asignar Miembro</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Usuario / Especialista</th>
              <th className="px-5 py-3.5">Correo Corporativo</th>
              <th className="px-5 py-3.5">Rol en esta Empresa</th>
              <th className="px-5 py-3.5">Estado</th>
              <th className="px-5 py-3.5">Asignado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition">
                <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold">
                    {u.nombre.charAt(0)}
                  </div>
                  <div>
                    <span>{u.nombre}</span>
                    <span className="block text-[10px] text-slate-400 font-normal">ID: {u.id}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-slate-600">{u.email}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                    u.rol === 'ADMINISTRADOR' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    u.rol === 'CONTADOR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    u.rol === 'ASISTENTE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {u.estado}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{u.asignadoEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Asignar Acceso a Empresa</h3>
            <form onSubmit={handleAgregar} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="CPC. Mariana Ríos"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="marianarios@sunaconta.pe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rol Asignado:</label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="CONTADOR">CONTADOR (Operación Contable y Tributaria)</option>
                  <option value="ASISTENTE">ASISTENTE (Carga de Comprobantes)</option>
                  <option value="AUDITOR">AUDITOR (Solo Consulta / Revisión)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acceso Total)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-extrabold cursor-pointer"
                >
                  Guardar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
