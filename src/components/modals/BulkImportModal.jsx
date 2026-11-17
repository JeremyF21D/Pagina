import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { parseCSV } from '../../utils/csvParser';

export function BulkImportModal({ isOpen, onClose }) {
  const { bulkImport } = useInventory();
  const { showToast } = useToast();

  const [rawText, setRawText] = useState('');
  const [replaceAll, setReplaceAll] = useState(false);

  if (!isOpen) return null;

  const handleProcessImport = () => {
    const text = rawText.trim();
    if (!text) {
      showToast('Pega texto en formato CSV o JSON primero');
      return;
    }

    try {
      let records = [];
      if (text.startsWith('[') || text.startsWith('{')) {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : (parsed.documents || parsed.data || [parsed]);
      } else {
        // Robust RFC-4180 CSV parser
        records = parseCSV(text);
      }

      bulkImport(records, replaceAll);
      setRawText('');
      onClose();
    } catch (err) {
      showToast(`Error al procesar los datos: ${err.message}`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawText(event.target.result);
      showToast(`Archivo "${file.name}" cargado en el editor`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSample = (type) => {
    if (type === 'csv') {
      setRawText(
`id,name,brand,carModel,engine,oem,price,cost,oldPrice,stock,warranty,badge
BOB-HILUX27,Bobina Toyota Hilux 2.7 VVT-i,Toyota,"Hilux, Kavak, Fortuner (2006 - 2016)",2.7L 2TR-FE,90919-02248,33.50,0.00,40.00,20,18 meses,Más Vendido
BOB-EXPLORER40,Bobina Ford Explorer 4.0 V6,Ford,"Explorer, Ranger (2001 - 2010)",4.0L V6 SOHC,1L2U-12029-AA,42.00,0.00,50.00,12,12 meses,Oferta`
      );
    } else {
      setRawText(
JSON.stringify([
  {
    id: "BOB-CHERY16",
    name: "Bobina Chery Orinoco / Tiggo 1.6 - 1.8",
    brand: "Chery",
    carModel: "Orinoco, Tiggo, Grand Tiger (2011 - 2018)",
    engine: "1.6L / 1.8L Acteco",
    oem: "F01R00A025",
    price: 35.00,
    stock: 14,
    warranty: "12 meses",
    badge: "Nuevo"
  }
], null, 2)
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 text-slate-900 animate-scaleIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div>
          <h3 className="text-base font-bold text-slate-900 font-orbitron font-extrabold flex items-center gap-2">
            <i className="fa-solid fa-file-import text-red-600"></i>
            <span>Carga Masiva de Bobinas (CSV / JSON)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Importa inventario de hojas de cálculo o exportaciones de bases de datos. Soporta campos entre comillas y comas internas.
          </p>
        </div>

        {/* Upload file or use samples */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition">
            <i className="fa-solid fa-folder-open text-amber-400"></i>
            <span>Subir Archivo (.csv / .json)</span>
            <input 
              type="file" 
              accept=".csv,.json,.txt"
              onChange={handleFileUpload}
              className="hidden" 
            />
          </label>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Ejemplos:</span>
            <button 
              type="button"
              onClick={() => handleLoadSample('csv')}
              className="text-red-600 hover:underline"
            >
              CSV
            </button>
            <span className="text-slate-600">•</span>
            <button 
              type="button"
              onClick={() => handleLoadSample('json')}
              className="text-red-600 hover:underline font-bold"
            >
              JSON
            </button>
          </div>
        </div>

        {/* Text Area */}
        <textarea 
          rows={10}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Pega aquí el contenido de tu CSV (con cabecera id,name,brand,carModel,price,stock...) o tu arreglo JSON..."
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-base sm:text-xs text-slate-900 font-mono leading-relaxed focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition"
        />

        {/* Replace All Option */}
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
          <input 
            type="checkbox" 
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span>Reemplazar todo el inventario existente (en vez de combinar/actualizar)</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleProcessImport}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/25 transition cursor-pointer active:scale-95"
          >
            Procesar e Importar a Base de Datos
          </button>
        </div>
      </div>
    </div>
  );
}
