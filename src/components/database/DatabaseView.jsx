import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { InventoryTable } from './InventoryTable';
import { ApiConnectionPanel } from './ApiConnectionPanel';
import { exportToCSV, exportToSQL, downloadFile } from '../../utils/csvParser';

export function DatabaseView({
  onOpenCreateModal,
  onOpenEditModal,
  onOpenBulkModal,
  onOpenSchemaModal
}) {
  const { coils, dbEngine, changeDbEngine, deleteCoil, clearInventory } = useInventory();
  const { requireAdminAuth } = useAuth();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const engines = [
    { id: 'supabase', label: 'Supabase (PostgreSQL)', icon: 'fa-solid fa-bolt', desc: 'Base de datos principal en la nube. Conexión activa para todos los visitantes.', activeBorder: 'border-emerald-500' }
  ];

  const handleExport = (format) => {
    setIsExportOpen(false);
    if (format === 'csv') {
      const csv = exportToCSV(coils);
      downloadFile(csv, `bobinas_inventario_export_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    } else if (format === 'json') {
      const json = JSON.stringify(coils, null, 2);
      downloadFile(json, `bobinas_inventario_export_${Date.now()}.json`, 'application/json;charset=utf-8;');
    } else if (format === 'sql') {
      const sql = exportToSQL(coils);
      downloadFile(sql, `bobinas_inventario_export_${Date.now()}.sql`, 'application/sql;charset=utf-8;');
    }
  };

  const handleDelete = (id) => {
    deleteCoil(id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Base de Datos Multi-Motor & Control de Inventario
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Conecta tu aplicación a Supabase, MongoDB, MySQL o LocalStorage. Todo cambio se refleja inmediatamente en el Agente IA de WhatsApp.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> Insertar Repuesto
          </button>

          <button 
            onClick={onOpenBulkModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <i className="fa-solid fa-file-import text-sky-400"></i> Carga Masiva (CSV / JSON)
          </button>

          {/* Botón de Exportar Robusto (Controlado por Clic, sin cierres accidentales) */}
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <i className="fa-solid fa-file-export text-emerald-400"></i> Exportar
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isExportOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isExportOpen && (
              <>
                {/* Backdrop invisible para cerrar al hacer clic afuera */}
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setIsExportOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-30 space-y-0.5 animate-fade-in">
                  <button 
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-file-csv text-emerald-400 text-sm"></i> 
                    <span>Formato CSV (Excel)</span>
                  </button>
                  <button 
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-file-code text-amber-400 text-sm"></i> 
                    <span>Formato JSON</span>
                  </button>
                  <button 
                    onClick={() => handleExport('sql')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-database text-sky-400 text-sm"></i> 
                    <span>Dump SQL DDL</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={onOpenSchemaModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <i className="fa-solid fa-code text-purple-400"></i> Ver Esquemas DDL
          </button>

          {/* Botón de Vaciar Base de Datos con Modal Seguro */}
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50"
            title="Borrar todos los productos de la Base de Datos"
          >
            <i className="fa-solid fa-trash-can"></i>
            <span>Vaciar Base de Datos</span>
          </button>
        </div>
      </div>

      {/* Modal Seguro de Confirmación para Vaciar Base de Datos */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">¿Vaciar Base de Datos por Completo?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Esta acción eliminará todos los <strong className="text-rose-400 font-bold">{coils.length} artículos</strong> actualmente guardados en el inventario.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-300 flex items-center gap-2 text-left mt-2">
                <i className="fa-solid fa-circle-info text-amber-400 text-sm shrink-0"></i>
                <span>Te recomendamos descargar un respaldo desde el botón <strong>"Exportar"</strong> antes de vaciarla.</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearInventory();
                  setIsClearModalOpen(false);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-trash-can"></i>
                <span>Sí, Vaciar Base</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engine Switcher Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {engines.map(eng => {
          const isSelected = dbEngine === eng.id;
          return (
            <div 
              key={eng.id}
              onClick={() => changeDbEngine(eng.id)}
              className={`p-4 rounded-2xl bg-slate-900 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected 
                  ? `${eng.activeBorder} shadow-lg shadow-brand-500/5 bg-slate-850` 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-sm text-brand-400">
                    <i className={eng.icon}></i>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Activo
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{eng.label}</h4>
                <p className="text-[11px] text-slate-400">{eng.desc}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                {isSelected ? 'Sincronizado en tiempo real' : 'Clic para conectar motor'}
              </div>
            </div>
          );
        })}
      </div>

      {/* In-Page API & Database Connection Panel */}
      <ApiConnectionPanel />

      {/* Main Inventory Table */}
      <InventoryTable 
        onEditCoil={onOpenEditModal}
        onDeleteCoil={handleDelete}
      />
    </div>
  );
}
