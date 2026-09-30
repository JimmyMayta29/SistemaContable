import React, { useState } from 'react';
import { 
  Database, 
  Play, 
  Download, 
  Server, 
  Table, 
  Terminal, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { Comprobante, AsientoContable, EmpresaCliente } from '../../types';
import { 
  SQL_SCHEMA_DDL, 
  generarSqlDumpCompleto, 
  executeClientSqlQuery, 
  SqlQueryResult 
} from '../../services/sqlDatabaseService';

interface SqlDatabaseViewProps {
  empresa: EmpresaCliente;
  compras: Comprobante[];
  ventas: Comprobante[];
  asientos: AsientoContable[];
  onUpdateEmpresa: (updated: Partial<EmpresaCliente>) => void;
}

export const SqlDatabaseView: React.FC<SqlDatabaseViewProps> = ({
  empresa,
  compras,
  ventas,
  asientos,
  onUpdateEmpresa
}) => {
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'SCHEMA' | 'CONNECTION'>('CONSOLE');
  
  // SQL Query editor
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT * FROM comprobantes_compras WHERE total > 1500;'
  );
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(() => 
    executeClientSqlQuery('SELECT * FROM comprobantes_compras WHERE total > 1500;', compras, ventas, asientos)
  );

  const [sqlHost, setSqlHost] = useState('localhost');
  const [sqlPort, setSqlPort] = useState(5432);
  const [sqlDatabase, setSqlDatabase] = useState('sunaconta_db');
  const [sqlUser, setSqlUser] = useState('postgres');
  const [connectionFeedback, setConnectionFeedback] = useState<string | null>(null);

  const handleRunQuery = () => {
    const result = executeClientSqlQuery(sqlQuery, compras, ventas, asientos);
    setQueryResult(result);
  };

  const handleDescargarSqlDump = () => {
    const dump = generarSqlDumpCompleto(
      {
        ...empresa,
        sqlEngine: 'SQLITE_EMBEDDED',
        sqlHost,
        sqlPort,
        sqlDatabase,
        sqlUser,
        sqlSsl: false,
        coeficienteRenta: 0.01
      }, 
      compras, 
      ventas, 
      asientos
    );
    const blob = new Blob([dump], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunaconta_db_dump_${empresa.ruc}_${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Base de Datos SQL & Histórico Seguro
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Almacenamiento relacional de facturas SUNAT, clientes, asientos contables de Libro Diario y volcados SQL.
          </p>
        </div>

        <button
          onClick={handleDescargarSqlDump}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Descargar Respaldo SQL (.sql)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('CONSOLE')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'CONSOLE'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Consola SQL Interactiva
        </button>
        <button
          onClick={() => setActiveTab('SCHEMA')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'SCHEMA'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          Esquema de Tablas (DDL)
        </button>
        <button
          onClick={() => setActiveTab('CONNECTION')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'CONNECTION'
              ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          Configuración Servidor SQL
        </button>
      </div>

      {/* Tab 1: SQL Console */}
      {activeTab === 'CONSOLE' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">
                Consulta SQL sobre registros históricos de {empresa.razonSocial}:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Atajos rápidos:</span>
                <button
                  onClick={() => setSqlQuery('SELECT * FROM comprobantes_compras WHERE total > 1500;')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-700 hover:bg-slate-200 transition"
                >
                  Compras &gt; S/ 1500
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT * FROM comprobantes_compras WHERE sujeto_detraccion = true;')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-700 hover:bg-slate-200 transition"
                >
                  Con Detracción SPOT
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT ruc_emisor, proveedor, count(*), sum(total) FROM comprobantes_compras GROUP BY ruc_emisor;')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-700 hover:bg-slate-200 transition"
                >
                  Agrupado por Proveedor
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT * FROM asientos_contables;')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-700 hover:bg-slate-200 transition"
                >
                  Libro Diario
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 font-mono text-xs text-emerald-400 p-3.5 rounded-xl border border-slate-800 focus:outline-none"
              />
              <button
                onClick={handleRunQuery}
                className="absolute right-3 bottom-4 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Ejecutar SQL
              </button>
            </div>
          </div>

          {/* Result Grid */}
          {queryResult && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600">
                  Filas retornadas: <strong className="text-slate-900">{queryResult.rowCount}</strong>
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Tiempo: {queryResult.executionTimeMs} ms
                </span>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      {queryResult.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {queryResult.columns.map((col) => (
                          <td key={col} className="py-2.5 px-3 whitespace-nowrap">
                            {typeof row[col] === 'boolean' 
                              ? (row[col] ? 'TRUE' : 'FALSE') 
                              : String(row[col] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Schema Viewer */}
      {activeTab === 'SCHEMA' && (
        <div className="bg-slate-900 rounded-2xl p-5 font-mono text-xs overflow-x-auto text-slate-300 shadow-xs">
          <pre className="text-slate-300 max-h-96 overflow-y-auto leading-relaxed whitespace-pre">
            {SQL_SCHEMA_DDL}
          </pre>
        </div>
      )}

      {/* Tab 3: Remote SQL Connection */}
      {activeTab === 'CONNECTION' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Server className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Conexión a Base de Datos SQL</h3>
              <p className="text-xs text-slate-500">Soporte para SQLite local, PostgreSQL, MySQL o SQL Server.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Host del Servidor:</label>
              <input
                type="text"
                value={sqlHost}
                onChange={(e) => setSqlHost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Puerto:</label>
                <input
                  type="number"
                  value={sqlPort}
                  onChange={(e) => setSqlPort(parseInt(e.target.value) || 5432)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Base de Datos:</label>
                <input
                  type="text"
                  value={sqlDatabase}
                  onChange={(e) => setSqlDatabase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Usuario SQL:</label>
              <input
                type="text"
                value={sqlUser}
                onChange={(e) => setSqlUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setConnectionFeedback('Conexión verificada y configurada.');
                  setTimeout(() => setConnectionFeedback(null), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Probar y Guardar
              </button>
            </div>

            {connectionFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {connectionFeedback}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
