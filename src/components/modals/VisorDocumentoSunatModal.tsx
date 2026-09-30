import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Code2, 
  CheckCircle2, 
  Download, 
  Copy, 
  Printer, 
  Building, 
  QrCode, 
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Comprobante } from '../../types';
import { generarXmlUblMock } from '../../services/sunatScraperAndSync';

interface VisorDocumentoSunatModalProps {
  comprobante: Comprobante | null;
  onClose: () => void;
}

export const VisorDocumentoSunatModal: React.FC<VisorDocumentoSunatModalProps> = ({
  comprobante,
  onClose
}) => {
  const [tab, setTab] = useState<'PDF' | 'XML' | 'CDR'>('PDF');
  const [copied, setCopied] = useState(false);

  if (!comprobante) return null;

  const xmlContent = comprobante.xmlData || generarXmlUblMock(comprobante);

  const handleCopyXml = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${comprobante.rucEmisor}-${comprobante.tipoDoc}-${comprobante.serie}-${comprobante.numero}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCdr = () => {
    const cdrText = JSON.stringify(comprobante.cdrData, null, 2);
    const blob = new Blob([cdrText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `R-${comprobante.rucEmisor}-${comprobante.tipoDoc}-${comprobante.serie}-${comprobante.numero}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {comprobante.tipoDoc === '01' ? 'FT' : 'BV'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  {comprobante.tipoDoc === '01' ? 'Factura Electrónica' : 'Boleta de Venta Electrónica'} {comprobante.serie}-{comprobante.numero}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> SUNAT Aceptado
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Emisor: {comprobante.razonSocialEmisor} | RUC: {comprobante.rucEmisor}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-white">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('PDF')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                tab === 'PDF' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Representación Impresa (PDF Oficial)
            </button>
            <button
              onClick={() => setTab('XML')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                tab === 'XML' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Archivo XML (UBL 2.1)
            </button>
            <button
              onClick={() => setTab('CDR')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                tab === 'CDR' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Constancia de Recepción CDR
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {tab === 'PDF' && (
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir A4
              </button>
            )}
            {tab === 'XML' && (
              <>
                <button
                  onClick={handleCopyXml}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copiado' : 'Copiar XML'}
                </button>
                <button
                  onClick={handleDownloadXml}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar .XML
                </button>
              </>
            )}
            {tab === 'CDR' && (
              <button
                onClick={handleDownloadCdr}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar CDR (.json/.xml)
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          {tab === 'PDF' && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-3xl mx-auto shadow-sm text-xs space-y-6">
              {/* Header Invoice Layout */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div className="space-y-1.5 max-w-[420px]">
                  <div className="font-extrabold text-blue-900 text-base">
                    {comprobante.razonSocialEmisor}
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {comprobante.direccionEmisor || 'Dirección fiscal registrada en ficha RUC'}
                  </p>
                  <div className="text-[11px] text-slate-600">
                    Email: facturacion@{comprobante.rucEmisor}.pe | Tel: (01) 612-4000
                  </div>
                </div>

                {/* Right Box: RUC / Tipo / Serie-Numero */}
                <div className="border-2 border-blue-700 rounded-xl p-4 text-center min-w-[240px] bg-blue-50/30">
                  <div className="font-bold text-slate-800 text-xs">R.U.C. {comprobante.rucEmisor}</div>
                  <div className="font-extrabold text-blue-900 text-sm my-1 uppercase">
                    {comprobante.tipoDoc === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-base">
                    N° {comprobante.serie}-{comprobante.numero}
                  </div>
                </div>
              </div>

              {/* Client & Date Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cliente / Receptor:</span>
                  <div className="font-bold text-slate-800">{comprobante.razonSocialReceptor}</div>
                  <div className="font-mono text-slate-600">RUC: {comprobante.rucReceptor}</div>
                  <div className="text-slate-500 text-[11px]">{comprobante.direccionReceptor || 'Dirección fiscal Lima, Perú'}</div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold mr-2">Fecha de Emisión:</span>
                    <strong className="text-slate-800 font-mono">{comprobante.fechaEmision}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold mr-2">Fecha de Vencimiento:</span>
                    <strong className="text-slate-800 font-mono">{comprobante.fechaVencimiento || comprobante.fechaEmision}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold mr-2">Moneda:</span>
                    <strong className="text-slate-800">{comprobante.moneda === 'PEN' ? 'Soles (S/)' : 'Dólares Americanos ($)'}</strong>
                  </div>
                  {comprobante.tipoCambio > 1 && (
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold mr-2">Tipo de Cambio:</span>
                      <strong className="text-slate-800 font-mono">{comprobante.tipoCambio.toFixed(3)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Cant.</th>
                    <th className="py-2 px-3">Unidad</th>
                    <th className="py-2 px-3">Descripción</th>
                    <th className="py-2 px-3 text-right">V. Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {comprobante.items && comprobante.items.length > 0 ? (
                    comprobante.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-mono">{it.cantidad}</td>
                        <td className="py-2.5 px-3 font-mono">{it.unidadMedida}</td>
                        <td className="py-2.5 px-3">{it.descripcion}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {comprobante.moneda === 'PEN' ? 'S/' : '$'} {it.valorUnitario.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {comprobante.moneda === 'PEN' ? 'S/' : '$'} {it.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 font-mono">1</td>
                      <td className="py-2.5 px-3 font-mono">ZZ</td>
                      <td className="py-2.5 px-3">{comprobante.observaciones || 'Prestación de servicios y suministros comerciales'}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {comprobante.moneda === 'PEN' ? 'S/' : '$'} {comprobante.baseImponibleGravada.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {comprobante.moneda === 'PEN' ? 'S/' : '$'} {comprobante.baseImponibleGravada.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Spot Detraction Banner */}
              {comprobante.sujetoADetraccion && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Operación sujeta al Sistema de Detracciones SPOT ({comprobante.tasaDetraccion}%). Cta Banco de la Nación: 00-068-192830</span>
                  </div>
                  <div className="font-mono font-bold text-amber-900">
                    Monto Detracción: S/ {comprobante.montoDetraccion?.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="flex justify-between items-start pt-2">
                <div className="space-y-3 max-w-[340px]">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg flex items-center justify-center p-1">
                      <QrCode className="w-14 h-14 text-slate-800" />
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      Representación impresa de la Factura Electrónica autorizada por SUNAT. Consulte la validez en www.sunat.gob.pe
                      <div className="font-mono text-slate-700 mt-1 truncate">
                        Hash: {comprobante.hashCpe?.substring(0, 20)}...
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-64 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Op. Gravada:</span>
                    <span>{comprobante.moneda === 'PEN' ? 'S/' : '$'} {comprobante.baseImponibleGravada.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>I.G.V. (18%):</span>
                    <span>{comprobante.moneda === 'PEN' ? 'S/' : '$'} {comprobante.igv.toFixed(2)}</span>
                  </div>
                  {comprobante.adquisicionesNoGravadas > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Op. Inafecta/Exonerada:</span>
                      <span>{comprobante.moneda === 'PEN' ? 'S/' : '$'} {comprobante.adquisicionesNoGravadas.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-200 pt-2 text-sm">
                    <span>IMPORTE TOTAL:</span>
                    <span className="text-blue-900">{comprobante.moneda === 'PEN' ? 'S/' : '$'} {comprobante.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'XML' && (
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
              <pre className="whitespace-pre">{xmlContent}</pre>
            </div>
          )}

          {tab === 'CDR' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Constancia de Recepción (CDR) ACEPTADA por SUNAT
                  </h4>
                  <p className="text-xs text-emerald-800">
                    El comprobante ha sido validado satisfactoriamente por el Servicio Web OSE / SUNAT.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-sans">Código de Respuesta:</span>
                  <span className="font-bold text-slate-800">{comprobante.cdrData?.codigoRespuesta || '0 (ACEPTADO)'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-sans">Descripción Oficial:</span>
                  <span className="font-bold text-slate-800">{comprobante.cdrData?.descripcionRespuesta || `La Factura ${comprobante.serie}-${comprobante.numero} ha sido ACEPTADA`}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-sans">Fecha y Hora de Recepción:</span>
                  <span className="text-slate-800">{comprobante.cdrData?.fechaRecepcion || comprobante.fechaEmision} {comprobante.cdrData?.horaRecepcion || '10:45:12'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-sans">N° de Ticket SUNAT:</span>
                  <span className="text-slate-800">{comprobante.cdrData?.ticketSunat || '202609001293847'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-sans block mb-1">Hash CPE / DigestValue:</span>
                  <span className="text-slate-800 break-all text-[11px]">{comprobante.hashCpe}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex justify-between items-center text-xs text-slate-500">
          <span>Código CAR SIRE: <strong className="font-mono text-slate-700">{comprobante.car}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};
