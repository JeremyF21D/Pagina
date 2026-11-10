import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCart } from '../../context/CartContext';
import { formatUSD } from '../../utils/formatters';

export function ProposalsPreviewView({ onApplyProposal }) {
  const { coils } = useInventory();
  const { toggleCart } = useCart();
  const [selectedProposal, setSelectedProposal] = useState(1);

  // Estados interactivos para Propuesta 1 (Buscador por Vehículo)
  const [p1Brand, setP1Brand] = useState('Nissan');
  const [p1Model, setP1Model] = useState('Sentra B15');
  const [p1Engine, setP1Engine] = useState('1.8L');
  const binanceRate = 43.50; // Tasa Binance USDT/VES

  // Estados interactivos para Propuesta 2 (Filtro por Marca)
  const [p2ActiveBrand, setP2ActiveBrand] = useState('ALL');

  // Estados interactivos para Propuesta 3 (Modo de Vista B2B)
  const [p3ViewMode, setP3ViewMode] = useState('TABLE'); // 'TABLE' | 'CARDS'

  // Repuestos muestra para renderizado
  const sampleCoils = coils.slice(0, 6);

  // Obtener imagen del repuesto
  const getProductImage = (coil) => {
    if (!coil) return null;
    if (coil.image) return coil.image;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        if (coil.id && stored[coil.id]) return stored[coil.id];
      } catch (e) {}
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ============================================================== */}
      {/* BARRA SUPERIOR DE CONTROL: SELECTOR DE LAS 3 PROPUESTAS */}
      {/* ============================================================== */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white text-xl shadow-lg shadow-amber-500/20">
              <i className="fa-solid fa-palette"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Laboratorio de Diseño Frontend</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  3 Propuestas en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prueba e interactúa con los 3 conceptos visuales. Haz clic en las pestañas para ver cómo lucen los colores, botones y layouts.
              </p>
            </div>
          </div>

          {/* Botones de Selección */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedProposal(1)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedProposal === 1
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <i className="fa-solid fa-flag-checkered"></i>
              <span>P1: Racing E-Commerce</span>
            </button>

            <button
              onClick={() => setSelectedProposal(2)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedProposal === 2
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span>P2: WhatsApp-First</span>
            </button>

            <button
              onClick={() => setSelectedProposal(3)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedProposal === 3
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <i className="fa-solid fa-layer-group"></i>
              <span>P3: Pro B2B & ERP</span>
            </button>
          </div>
        </div>

        {/* Resumen & Paleta del Diseño Activo */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {selectedProposal === 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-400">Paleta de Colores P1:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0b0f17] border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#0b0f17] border border-white/20"></span> Fondo #0b0f17
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#131926] border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#131926]"></span> Tarjetas #131926
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-950/60 border border-red-500/30 text-red-300 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> Acento #ef4444 (Rojo Racing)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> Tasa Binance #f59e0b
              </span>
            </div>
          )}

          {selectedProposal === 2 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-400">Paleta de Colores P2:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0f172a] border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#0f172a] border border-white/20"></span> Fondo #0f172a
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e293b] border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#1e293b]"></span> Feed #1e293b
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#25d366]"></span> WhatsApp #25d366
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-950/60 border border-sky-500/30 text-sky-300 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#38bdf8]"></span> OEM Sky #38bdf8
              </span>
            </div>
          )}

          {selectedProposal === 3 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-400">Paleta de Colores P3:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#080c14] border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#080c14] border border-white/20"></span> Base #080c14
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0d131f] border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#0d131f]"></span> Sidebar #0d131f
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> Cian Tech #06b6d4
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                <span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Métricas #10b981
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: PROPUESTA 1 (E-COMMERCE RACING TITANIUM) */}
      {/* ============================================================== */}
      {selectedProposal === 1 && (
        <div className="bg-[#0b0f17] border-2 border-red-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
          
          {/* Barra Superior con Tasa Binance */}
          <div className="bg-[#131926] border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-semibold">Tasa Oficial Binance P2P:</span>
              <span className="font-mono font-bold text-amber-400">1 USDT = Bs. {binanceRate.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span><i className="fa-solid fa-location-dot text-red-500 mr-1"></i> Maracaibo / Zulia</span>
              <span><i className="fa-solid fa-truck-fast text-sky-400 mr-1"></i> Envíos Nacionales MRW / Zoom</span>
            </div>
          </div>

          {/* Hero: Buscador por Vehículo (3 Pasos) */}
          <div className="bg-gradient-to-r from-[#131926] via-[#1c2438] to-[#131926] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="max-w-xl space-y-1.5 mb-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-red-500 font-bold flex items-center gap-1.5">
                <i className="fa-solid fa-wrench"></i>
                Buscador Técnico de Compatibilidad
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Encuentra el repuesto exacto para tu vehículo
              </h3>
              <p className="text-xs text-slate-400">
                Filtra por modelo y motor para evitar devoluciones de sensores o bobinas no compatibles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-black/60 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase font-mono">1. Marca</label>
                <select 
                  value={p1Brand}
                  onChange={e => setP1Brand(e.target.value)}
                  className="w-full bg-[#131926] border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="Nissan">Nissan</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Chevrolet">Chevrolet</option>
                  <option value="Ford">Ford</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase font-mono">2. Modelo</label>
                <select 
                  value={p1Model}
                  onChange={e => setP1Model(e.target.value)}
                  className="w-full bg-[#131926] border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="Sentra B15">Sentra B15</option>
                  <option value="Tiida">Tiida 1.8</option>
                  <option value="Almera">Almera</option>
                  <option value="Murano">Murano 3.5</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase font-mono">3. Motorización</label>
                <select 
                  value={p1Engine}
                  onChange={e => setP1Engine(e.target.value)}
                  className="w-full bg-[#131926] border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="1.8L">1.8L QG18DE</option>
                  <option value="2.0L">2.0L QR20DE</option>
                  <option value="2.5L">2.5L QR25DE</option>
                </select>
              </div>

              <div className="flex items-end">
                <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Filtrar Piezas</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tarjetas de Repuestos con Precios Duales (USD + Bs Binance) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sampleCoils.slice(0, 3).map(coil => {
              const img = getProductImage(coil);
              const priceUSD = Number(coil.price || 15);
              const priceVES = priceUSD * binanceRate;

              return (
                <div key={coil.id} className="bg-[#131926] border border-slate-800 hover:border-red-500/60 rounded-2xl p-4 transition-all duration-300 shadow-xl space-y-3 group">
                  <div className="h-36 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden p-2">
                    <span className="absolute top-2 left-2 bg-red-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow">
                      OEM CERTIFICADO
                    </span>
                    <span className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                      Stock: {coil.stock} uds
                    </span>
                    {img ? (
                      <img src={img} alt={coil.name} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition" />
                    ) : (
                      <i className="fa-solid fa-bolt text-4xl text-slate-700"></i>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-mono text-red-400 font-bold block">
                      {coil.brand} • {coil.carModel || 'Universal'}
                    </span>
                    <h4 className="font-bold text-xs text-white line-clamp-2 mt-0.5 group-hover:text-red-400 transition">
                      {coil.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">OEM: {coil.oem}</span>
                  </div>

                  <div className="bg-black/50 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">Precio USD</span>
                      <span className="text-base font-black text-white font-mono">{formatUSD(priceUSD)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-semibold">Tasa Binance (Bs)</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        Bs. {priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95">
                    <i className="fa-solid fa-cart-plus"></i>
                    <span>Agregar al Pedido</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: PROPUESTA 2 (OMNICANAL WHATSAPP-FIRST) */}
      {/* ============================================================== */}
      {selectedProposal === 2 && (
        <div className="max-w-lg mx-auto bg-[#0f172a] border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
          
          {/* Header Móvil con Estado en Vivo */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-emerald-500/20">
                JF
              </div>
              <div>
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                  <span>JF Auto Parts</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </h4>
                <p className="text-[10px] text-emerald-400 font-medium">Asesores en línea por WhatsApp</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 block font-mono">TASA BINANCE</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 block">
                1$ = Bs. 43.50
              </span>
            </div>
          </div>

          {/* Burbujas de Marcas Estilo Historias */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">
                Marcas Populares:
              </span>
              <span className="text-[10px] text-slate-500">Toca para filtrar</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {[
                { name: 'Todas', icon: 'fa-cubes', color: 'border-slate-700' },
                { name: 'Nissan', icon: 'fa-car-side', color: 'border-emerald-500' },
                { name: 'Chevrolet', icon: 'fa-truck-pickup', color: 'border-slate-700' },
                { name: 'Toyota', icon: 'fa-car', color: 'border-slate-700' },
                { name: 'Ford', icon: 'fa-truck', color: 'border-slate-700' }
              ].map(b => (
                <button
                  key={b.name}
                  onClick={() => setP2ActiveBrand(b.name)}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                >
                  <div className={`w-13 h-13 rounded-full bg-slate-800 border-2 ${
                    p2ActiveBrand === b.name ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/20' : b.color
                  } flex items-center justify-center text-lg text-slate-300 group-hover:text-emerald-400 transition`}>
                    <i className={`fa-solid ${b.icon}`}></i>
                  </div>
                  <span className={`text-[10px] font-bold ${p2ActiveBrand === b.name ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {b.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta Feed Móvil con Botón WA Gigante */}
          {sampleCoils.slice(0, 2).map(coil => {
            const img = getProductImage(coil);
            const priceUSD = Number(coil.price || 15);
            const priceVES = priceUSD * binanceRate;

            return (
              <div key={coil.id} className="bg-[#1e293b] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    <i className="fa-solid fa-circle-check mr-1"></i> Stock Disponible ({coil.stock} uds)
                  </span>
                  <span className="font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/20 text-[10px]">
                    OEM: {coil.oem}
                  </span>
                </div>

                <div className="w-full h-40 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                  {img ? (
                    <img src={img} alt={coil.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  ) : (
                    <i className="fa-solid fa-bolt text-4xl text-slate-700"></i>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white">{coil.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Compatible con {coil.carModel || 'modelos seleccionados'}</p>
                </div>

                {/* Métodos Aceptados */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">📱 Pago Móvil</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">🟡 Binance</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">💜 Zelle</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">💵 Efectivo</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold">Total en Divisas</span>
                    <span className="text-base font-black text-white font-mono">{formatUSD(priceUSD)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-semibold">Pago Móvil (Aprox)</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      Bs. {priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Botón WhatsApp Gigante */}
                <a
                  href={`https://wa.me/584140000000?text=${encodeURIComponent(`¡Hola JF Auto Parts! Me interesa el repuesto: ${coil.name} (OEM: ${coil.oem}) por ${formatUSD(priceUSD)}. ¿Tienen entrega inmediata?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25d366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-black py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 block text-center"
                >
                  <i className="fa-brands fa-whatsapp text-base"></i>
                  <span>Pedir por WhatsApp en 1 Clic</span>
                </a>
              </div>
            );
          })}

          {/* Dock Fijo Inferior Móvil */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-around text-xs shadow-2xl">
            <div className="flex flex-col items-center text-emerald-400 font-bold cursor-pointer">
              <i className="fa-solid fa-house text-sm"></i>
              <span className="text-[9px]">Catálogo</span>
            </div>
            <div className="flex flex-col items-center text-slate-400 hover:text-white cursor-pointer">
              <i className="fa-solid fa-magnifying-glass text-sm"></i>
              <span className="text-[9px]">Buscar OEM</span>
            </div>
            <div className="flex flex-col items-center text-slate-400 hover:text-white cursor-pointer relative" onClick={toggleCart}>
              <i className="fa-solid fa-cart-shopping text-sm"></i>
              <span className="text-[9px]">Pedido</span>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">1</span>
            </div>
            <div className="flex flex-col items-center text-slate-400 hover:text-emerald-400 cursor-pointer">
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span className="text-[9px]">Asesor WA</span>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 3: PROPUESTA 3 (PORTAL PRO B2B & CENTRO ERP) */}
      {/* ============================================================== */}
      {selectedProposal === 3 && (
        <div className="bg-[#080c14] border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
          
          {/* Métricas Superiores B2B */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#0d131f] border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Ventas del Día (USD)</span>
              <span className="text-lg font-black text-emerald-400 font-mono">$185.00</span>
              <span className="text-[10px] text-slate-500 block">6 pedidos confirmados</span>
            </div>
            <div className="bg-[#0d131f] border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Tasa Binance Hoy</span>
              <span className="text-lg font-black text-amber-400 font-mono">Bs. 43.50</span>
              <span className="text-[10px] text-slate-500 block">Cálculo en vivo</span>
            </div>
            <div className="bg-[#0d131f] border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Stock Crítico (&lt;3 uds)</span>
              <span className="text-lg font-black text-red-400 font-mono">2 repuestos</span>
              <span className="text-[10px] text-slate-500 block">Requiere reposición</span>
            </div>
            <div className="bg-[#0d131f] border border-slate-800 p-3.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Supabase Sincronizado</span>
              <span className="text-lg font-black text-cyan-400 font-mono">En Línea</span>
              <span className="text-[10px] text-slate-500 block">Base de Datos Activa</span>
            </div>
          </div>

          {/* Barra de Controles y Selector de Vista Dual */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d131f] border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="font-bold text-sm text-white">Inventario Automotriz para Talleres y Mayoristas</h4>
              <p className="text-xs text-slate-400">Cotización por lotes, búsqueda por OEM y stock directo de almacén.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setP3ViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  p3ViewMode === 'TABLE' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-table-list"></i>
                <span>Tabla Rápida B2B</span>
              </button>
              <button 
                onClick={() => setP3ViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  p3ViewMode === 'CARDS' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-grip"></i>
                <span>Tarjetas Visuales</span>
              </button>
            </div>
          </div>

          {/* Renderizado según Vista (Tabla o Tarjetas) */}
          {p3ViewMode === 'TABLE' ? (
            <div className="bg-[#0d131f] border border-slate-800 rounded-xl overflow-x-auto shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Código OEM</th>
                    <th className="py-2.5 px-3">Descripción de la Pieza</th>
                    <th className="py-2.5 px-3">Marca</th>
                    <th className="py-2.5 px-3 text-center">Stock DB</th>
                    <th className="py-2.5 px-3">Precio USD</th>
                    <th className="py-2.5 px-3 text-right">Cotización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sampleCoils.map(coil => (
                    <tr key={coil.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{coil.oem}</td>
                      <td className="py-2.5 px-3 font-semibold text-white">{coil.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{coil.brand}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          coil.stock <= 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {coil.stock} uds
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{formatUSD(coil.price)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer active:scale-95">
                          + Cotizar Lote
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sampleCoils.slice(0, 3).map(coil => {
                const img = getProductImage(coil);
                return (
                  <div key={coil.id} className="bg-[#0d131f] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 space-y-2.5">
                    <div className="h-28 bg-slate-950 rounded-lg flex items-center justify-center p-1">
                      {img ? <img src={img} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" /> : <i className="fa-solid fa-box text-3xl text-slate-700"></i>}
                    </div>
                    <span className="font-mono text-cyan-400 text-[10px] font-bold">{coil.oem}</span>
                    <h5 className="font-bold text-xs text-white truncate">{coil.name}</h5>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-bold">{formatUSD(coil.price)}</span>
                      <span className="text-slate-400 text-[10px]">{coil.stock} en stock</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
