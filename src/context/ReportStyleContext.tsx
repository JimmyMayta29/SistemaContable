import React, { createContext, useContext, useState, useEffect } from 'react';

export type ReportStyle = 'estandar' | 'actual';
export const REPORT_STYLE: ReportStyle = 'estandar';

interface ReportStyleContextType {
  reportStyle: ReportStyle;
  setReportStyle: (style: ReportStyle) => void;
  toggleReportStyle: () => void;
  mostrarFechaHoraImpresion: boolean;
  setMostrarFechaHoraImpresion: (mostrar: boolean) => void;
}

const ReportStyleContext = createContext<ReportStyleContextType | undefined>(undefined);

const STORAGE_KEY = 'sunaconta_report_style';
const FECHA_HORA_STORAGE_KEY = 'sunaconta_report_show_datetime';

export const ReportStyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reportStyle, setReportStyleState] = useState<ReportStyle>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'actual' || saved === 'estandar') ? saved : REPORT_STYLE;
  });

  const [mostrarFechaHoraImpresion, setMostrarFechaHoraImpresionState] = useState<boolean>(() => {
    return localStorage.getItem(FECHA_HORA_STORAGE_KEY) === 'true'; // Oculto por defecto
  });

  const setReportStyle = (style: ReportStyle) => {
    setReportStyleState(style);
    localStorage.setItem(STORAGE_KEY, style);
  };

  const toggleReportStyle = () => {
    const nextStyle: ReportStyle = reportStyle === 'estandar' ? 'actual' : 'estandar';
    setReportStyle(nextStyle);
  };

  const setMostrarFechaHoraImpresion = (mostrar: boolean) => {
    setMostrarFechaHoraImpresionState(mostrar);
    localStorage.setItem(FECHA_HORA_STORAGE_KEY, String(mostrar));
  };

  return (
    <ReportStyleContext.Provider value={{
      reportStyle,
      setReportStyle,
      toggleReportStyle,
      mostrarFechaHoraImpresion,
      setMostrarFechaHoraImpresion
    }}>
      {children}
    </ReportStyleContext.Provider>
  );
};

export const useReportStyle = (): ReportStyleContextType => {
  const context = useContext(ReportStyleContext);
  if (!context) {
    throw new Error('useReportStyle debe usarse dentro de un ReportStyleProvider');
  }
  return context;
};
