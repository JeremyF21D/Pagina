import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { 
  exportSalesToCSV, 
  exportSalesToSQL, 
  parseSalesCSV, 
  downloadFile 
} from '../../utils/csvParser';
import { formatUSD } from '../../utils/formatters';

export function SalesDatabaseModal({ isOpen, onClose }) {
  const { 
    salesHistory, 
    coils, 
    importSalesBatch, 
    pushSalesToSupabase, 
    dbCredentials 
  } = useInventory();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import' | 'supabase'
  const [rawCsvText, setRawCsvText] = useState('');
  const [replaceAll, setReplaceAll] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Stats calculation
  const totalRevenue = useMemo(() => {
    return salesHistory.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
  }, [salesHistory]);

  const catalogConnectedCount = useMemo(() => {
    return salesHistory.filter(s => coils.some(c => c.id === s.coilId || (s.oem && c.oem && c.oem.includes(s.oem)))).length;
  }, [salesHistory, coils]);

  // Preview parsing for import tab
  const parsedPreview = useMemo(() => {
    if (!rawCsvText.trim()) return null;
    try {
      return parseSalesCSV(rawCsvText, coils);
    } catch (e) {
      return { error: e.message };
    }
  }, [rawCsvText, coils]);

  if (!isOpen) return null;

  // --- EXPORT HANDLERS ---
  const handleDownloadCSV = () => {
    if (salesHistory.length === 0) {
      showToast('No hay ventas registradas para exportar', 'warning');
      return;
    }
    const csvData = exportSalesToCSV(salesHistory, coils);
    const fileName = `jf_autoparts_ventas_supabase_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csvData, fileName, 'text/csv;charset=utf-8;');
    showToast(`✓ Archivo CSV descargado con ${salesHistory.length} registros conectados`);
  };

  const handleDownloadSQL = () => {
    if (salesHistory.length === 0) {
      showToast('No hay ventas registradas para exportar', 'warning');
      return;
    }
    const sqlData = exportSalesToSQL(salesHistory, coils);
    const fileName = `jf_autoparts_ventas_ddl_supabase_${new Date().toISOString().slice(0, 10)}.sql`;
    downloadFile(sqlData, fileName, 'application/sql;charset=utf-8;');
    showToast(`✓ Script SQL para Supabase generado exitosamente`);
  };

  const handleCopySQL = () => {
    const sqlData = exportSalesToSQL(salesHistory, coils);
    navigator.clipboard.writeText(sqlData).then(() => {
      setCopiedSql(true);
      showToast('✓ Script SQL copiado al portapapeles listo para el Editor de Supabase');
      setTimeout(() => setCopiedSql(false), 3000);
    });
  };

  // --- IMPORT HANDLERS ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawCsvText(event.target.result);
      showToast(`Archivo "${file.name}" cargado en el editor`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleCSV = () => {
    // Generate intelligent sample linked to real products in current catalog
    const sampleCoil1 = coils[0] || { id: 'BOB-CAP32', name: 'Bobina Chevrolet Captiva 3.2', oem: '12618542', price: 32 };
    const sampleCoil2 = coils[1] || { id: 'BOB-CORSA1416', name: 'Bobina Corsa 1.6', oem: '10450424', price: 34 };

    const sample = [
      'order_id,fecha_hora,cliente_nombre,cliente_telefono,producto_id,producto_nombre,codigo_oem,cantidad,precio_unitario_usd,total_usd,referencia_pago,estado_orden',
      `ORD-9021,"Hoy, 10:30 AM","Auto Repuestos Caracas","0414-2223344","${sampleCoil1.id}","${sampleCoil1.name}","${sampleCoil1.oem}",2,${sampleCoil1.price},${sampleCoil1.price * 2},"Transferencia Banesco #881923",CONFIRMED`,
      `ORD-9022,"Hoy, 11:15 AM","Taller Mecánico El Veloz","0412-9988776","${sampleCoil2.id}","${sampleCoil2.name}","${sampleCoil2.oem}",1,${sampleCoil2.price},${sampleCoil2.price},"Pago Móvil Mercantil #440192",CONFIRMED`
    ].join('\n');

    setRawCsvText(sample);
    showToast('Plantilla CSV de ejemplo cargada con productos del catálogo');
  };

  const handleProcessImport = () => {
    if (!rawCsvText.trim()) {
      showToast('Ingresa o pega el contenido CSV primero', 'warning');
      return;
    }

    try {
      const { sales, matchedCount, totalCount } = parseSalesCSV(rawCsvText, coils);
      if (sales.length === 0) {
        showToast('No se encontraron registros de ventas válidos en el CSV', 'warning');
        return;
      }

      importSalesBatch(sales, replaceAll);
      showToast(`✓ Éxito: ${totalCount} ventas procesadas (${matchedCount} vinculadas al catálogo)`);
      setRawCsvText('');
      onClose();
    } catch (err) {
      showToast(`Error al procesar el archivo CSV: ${err.message}`, 'error');
    }
  };

  // --- SUPABASE DIRECT PUSH ---
  const handlePushToSupabase = async () => {
    setIsPushing(true);
    try {
      await pushSalesToSupabase();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsPushing(false);
    }
  };

  const isSupabaseConfigured = Boolean(
    dbCredentials?.supabase?.url && 
    dbCredentials?.supabase?.anonKey && 
    !dbCredentials.supabase.url.includes('example.supabase.co')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 text-lg shrink-0">
              <i className="fa-solid fa-database"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Base de Datos de Ventas & Despachos</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  CSV / Supabase
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Importa, exporta y conecta tus registros de ventas directamente con los productos del catálogo.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Cerrar modal"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-file-export"></i>
            <span>Exportar CSV (Supabase)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-file-import"></i>
            <span>Importar CSV de Ventas</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'supabase'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-bolt text-amber-400"></i>
            <span>Sincronizar Supabase</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          
          {/* TAB 1: EXPORTAR CSV PARA SUPABASE */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Órdenes en Registro</span>
                  <span className="text-lg font-bold text-white font-mono">{salesHistory.length}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total Facturado</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">{formatUSD(totalRevenue)}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Vinculadas al Catálogo</span>
                  <span className="text-lg font-bold text-sky-400 font-mono">{catalogConnectedCount} / {salesHistory.length}</span>
                </div>
              </div>

              {/* Information Banner */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <i className="fa-solid fa-circle-check text-emerald-400"></i>
                  <span>Estructura Compatible con Supabase & PostgreSQL</span>
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  El archivo CSV exportado mapea automáticamente cada venta con los campos de los repuestos disponibles en el catálogo: 
                  <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200 ml-1">producto_id</code>, 
                  <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200 ml-1">codigo_oem</code>, 
                  <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200 ml-1">marca_producto</code>, 
                  <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200 ml-1">modelo_vehiculo</code>, 
                  <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200 ml-1">motor_vehiculo</code> y 
                  <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200 ml-1">stock_actual_catalogo</code>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition cursor-pointer active:scale-98"
                >
                  <i className="fa-solid fa-file-csv text-base"></i>
                  <span>Descargar CSV para Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSQL}
                  className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <i className="fa-solid fa-code text-base text-sky-400"></i>
                  <span>Descargar Script SQL (.sql)</span>
                </button>
              </div>

              {/* Quick SQL Copy Snippet */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    <i className="fa-solid fa-terminal text-sky-400 mr-1.5"></i>
                    Consulta SQL DDL para Supabase (Tabla `ventas`):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySQL}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <i className={`fa-solid ${copiedSql ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                    <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 rounded-lg text-[10px] text-slate-300 font-mono overflow-x-auto leading-relaxed border border-slate-800/80">
{`CREATE TABLE IF NOT EXISTS public.ventas (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  fecha TEXT,
  cliente_nombre TEXT,
  producto_id TEXT,
  codigo_oem TEXT,
  marca_producto TEXT,
  cantidad INTEGER DEFAULT 1,
  precio_unitario NUMERIC(10,2),
  total_usd NUMERIC(10,2),
  stock_actual_catalogo INTEGER,
  referencia_pago TEXT,
  estado TEXT DEFAULT 'CONFIRMED'
);
ALTER TABLE public.ventas DISABLE ROW LEVEL SECURITY;`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORTAR CSV A VENTAS */}
          {activeTab === 'import' && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer flex items-center gap-1.5 transition">
                  <i className="fa-solid fa-folder-open text-amber-400"></i>
                  <span>Subir Archivo .CSV</span>
                  <input 
                    type="file" 
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </label>

                <button 
                  type="button"
                  onClick={handleLoadSampleCSV}
                  className="px-2.5 py-1 text-sky-400 hover:text-sky-300 bg-sky-950/50 hover:bg-sky-900/50 border border-sky-500/30 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                  <span>Cargar Plantilla con Productos Reales</span>
                </button>
              </div>

              {/* Text Area */}
              <div>
                <textarea 
                  rows={7}
                  value={rawCsvText}
                  onChange={(e) => setRawCsvText(e.target.value)}
                  placeholder="Pega aquí el texto CSV de ventas (cabecera: order_id,fecha,cliente_nombre,producto_id,codigo_oem,cantidad,precio_unitario,total_usd...)"
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Live Preview / Stats of Parsed CSV */}
              {parsedPreview && !parsedPreview.error && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300">
                      Filas válidas: <strong className="text-white font-mono">{parsedPreview.totalCount}</strong>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-link text-[10px]"></i>
                      {parsedPreview.matchedCount} conectadas al catálogo
                    </span>
                  </div>
                  {parsedPreview.matchedCount < parsedPreview.totalCount && (
                    <span className="text-amber-400 text-[11px]">
                      {parsedPreview.totalCount - parsedPreview.matchedCount} sin coincidencia exacta (usarán datos del CSV)
                    </span>
                  )}
                </div>
              )}

              {parsedPreview?.error && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-[11px]">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                  {parsedPreview.error}
                </div>
              )}

              {/* Replace All Option */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={replaceAll}
                  onChange={(e) => setReplaceAll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Reemplazar todo el registro de ventas actual (desmarcado: combina agregando ventas nuevas)</span>
              </label>

              {/* Process Button */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-700/30 transition cursor-pointer"
                >
                  Procesar e Importar al Registro
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SINCRONIZAR DIRECTO CON SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isSupabaseConfigured 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <i className={`fa-solid ${isSupabaseConfigured ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-amber-400'} text-lg`}></i>
                  <div>
                    <h4 className="font-bold text-xs">
                      {isSupabaseConfigured ? 'Supabase Conectado' : 'Credenciales de Supabase Pendientes'}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {isSupabaseConfigured
                        ? `Endpoint activo: ${dbCredentials.supabase.url} (tabla: ${dbCredentials.supabase.salesTable || 'ventas'})`
                        : 'Para sincronizar en la nube directamente por API, configura tu URL y Anon Key en la pestaña "Base de Datos".'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Solución de Esquema y Error PGRST204 */}
              <div className="p-3.5 bg-gradient-to-r from-slate-950 to-amber-950/30 border border-amber-500/40 rounded-xl space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                      <i className="fa-solid fa-wrench"></i>
                    </span>
                    <h4 className="font-bold text-white text-xs">
                      Solución de Esquema & Vinculación con Catálogo (Error PGRST204)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySQL}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <i className={`fa-solid ${copiedSql ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                    <span>{copiedSql ? '¡Copiado!' : 'Copiar Script de Reparación'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Si Supabase arrojó <em>"Could not find the 'estado' column of 'ventas' in the schema cache"</em>, se debe a que la tabla fue creada sin esa columna o PostgREST no ha recargado su caché. El sistema ahora <strong>adapta automáticamente las columnas</strong> al subir, y con el script SQL de abajo aseguras todas las columnas y la <strong>clave foránea al catálogo</strong> con 1 clic en el SQL Editor de Supabase:
                </p>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-300 space-y-1">
                  <div className="text-sky-300">-- 1. Asegurar UNIQUE en bobinas_inventario(id) para permitir la clave foránea (Corrige error 42830):</div>
                  <div>ALTER TABLE public.bobinas_inventario ADD CONSTRAINT bobinas_inventario_id_unique UNIQUE (id);</div>
                  <div className="text-sky-300 mt-1">-- 2. Asegurar columnas de ventas:</div>
                  <div>ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'CONFIRMED';</div>
                  <div>ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'CONFIRMED';</div>
                  <div>ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS producto_id TEXT;</div>
                  <div className="text-sky-300 mt-1">-- 3. Vincular clave foránea con el catálogo de repuestos:</div>
                  <div>ALTER TABLE public.ventas ADD CONSTRAINT fk_ventas_producto_catalogo FOREIGN KEY (producto_id) REFERENCES public.bobinas_inventario(id) ON DELETE SET NULL;</div>
                  <div className="text-amber-400 mt-1">NOTIFY pgrst, 'reload schema'; -- Recarga la caché de Supabase</div>
                </div>
              </div>

              {/* Botón de subida */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-xs">Subida Inteligente en Lote a Supabase</h4>
                    <p className="text-[11px] text-slate-400">
                      Envía los {salesHistory.length} registros con resolución de duplicados y detección automática de columnas.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!isSupabaseConfigured || isPushing || salesHistory.length === 0}
                    onClick={handlePushToSupabase}
                    className={`px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${
                      isSupabaseConfigured && salesHistory.length > 0 && !isPushing
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-700/30 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <i className={`fa-solid ${isPushing ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
                    <span>{isPushing ? 'Subiendo y Adaptando...' : 'Subir Ventas a Supabase'}</span>
                  </button>
                </div>
              </div>

              {/* Guía paso a paso */}
              <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <strong className="text-white block font-semibold">Pasos recomendados para máxima sincronización:</strong>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Inicia sesión en tu <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Dashboard de Supabase</a> y abre <strong>SQL Editor</strong>.</li>
                  <li>Pulsa el botón de arriba <strong>"Copiar Script de Reparación"</strong>, pégalo en Supabase y pulsa <strong>Run</strong>.</li>
                  <li>Al ejecutarse, creará la relación automática entre <code>ventas.producto_id</code> y <code>bobinas_inventario.id</code>.</li>
                  <li>Vuelve aquí y pulsa <strong>"Subir Ventas a Supabase"</strong>. ¡Se sincronizará en verde sin errores!</li>
                </ol>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
