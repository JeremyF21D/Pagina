import React, { useState, useEffect } from 'react';
import './SparkOrderOverlay.css';
import jfEmblem from '../../../assets/jf_emblem_clean.png';
import { formatUSD } from '../../../utils/formatters';

export function SparkOrderOverlay({ isOpen, orderData, onClose }) {
  const [phase, setPhase] = useState('SPARKING'); // 'SPARKING' | 'CONFIRMED'
  const [progressWidth, setProgressWidth] = useState(0);
  const [statusText, setStatusText] = useState('Generando orden de despacho...');

  useEffect(() => {
    if (!isOpen) {
      setPhase('SPARKING');
      setProgressWidth(0);
      setStatusText('Generando orden de despacho...');
      return;
    }

    setPhase('SPARKING');
    setProgressWidth(0);
    setStatusText('Generando orden de despacho...');

    // Iniciar llenado de barra suavemente
    const timerFill = setTimeout(() => {
      setProgressWidth(100);
    }, 50);

    // Texto intermedio a mitad de carga
    const timerMid = setTimeout(() => {
      setStatusText('¡Chispa de ignición lista! Confirmando...');
    }, 1000);

    // Finalizar animación de chispa y pasar a pantalla de confirmación con WhatsApp
    const timerDone = setTimeout(() => {
      setPhase('CONFIRMED');
    }, 1900);

    return () => {
      clearTimeout(timerFill);
      clearTimeout(timerMid);
      clearTimeout(timerDone);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const order = orderData?.order;
  const whatsappUrl = orderData?.whatsappUrl;
  const totalVal = orderData?.totalVal || order?.totalPrice || 0;
  const totalVES = orderData?.totalVES || order?.totalVES;
  const itemsCount = order?.items?.length || 1;
  const orderId = order?.orderId || 'ORD-WA';

  return (
    <div
      id="jf-spark-overlay"
      className={`jf-spark-overlay ${isOpen ? 'is-active' : ''}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="jf-spark-card">
        {/* Botón de cierre superior (disponible en fase de confirmación) */}
        {phase === 'CONFIRMED' && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Cerrar ventana"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        )}

        {/* Logo de fondo como marca de agua iluminada (Emblema Oficial JF Auto Parts) */}
        <div className="jf-watermark-bg">
          <img
            src={jfEmblem}
            alt="JF Auto Parts"
            className="w-36 h-auto object-contain opacity-30 select-none pointer-events-none"
          />
        </div>

        {/* Halo de energía rojo/azul detrás de la bujía */}
        <div className="jf-energy-glow"></div>

        {/* FASE 1: ANIMACIÓN DE LA BUJÍA Y ALTO VOLTAJE */}
        {phase === 'SPARKING' ? (
          <>
            {/* SVG Bujía de Encendido + Arco Eléctrico de Alto Voltaje */}
            <div className="jf-plug-wrapper">
              <svg viewBox="0 0 140 220" width="120" height="190" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ceramicGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#D4D4D8" />
                    <stop offset="45%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#A1A1AA" />
                  </linearGradient>
                  <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#52525B" />
                    <stop offset="50%" stopColor="#E4E4E7" />
                    <stop offset="100%" stopColor="#3F3F46" />
                  </linearGradient>
                  <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Terminal superior */}
                <rect x="61" y="10" width="18" height="16" rx="3" fill="url(#metalGrad)" />
                <rect x="64" y="26" width="12" height="8" fill="#71717A" />

                {/* Aislador cerámico con costillas */}
                <rect x="52" y="34" width="36" height="58" rx="6" fill="url(#ceramicGrad)" />
                <rect x="50" y="44" width="40" height="5" rx="2.5" fill="#E4E4E7" />
                <rect x="50" y="56" width="40" height="5" rx="2.5" fill="#E4E4E7" />
                <rect x="50" y="68" width="40" height="5" rx="2.5" fill="#E4E4E7" />

                {/* Tuerca hexagonal metálica */}
                <rect x="44" y="92" width="52" height="22" rx="3" fill="url(#metalGrad)" stroke="#27272A" strokeWidth="1.5" />
                <line x1="57" y1="92" x2="57" y2="114" stroke="#27272A" strokeWidth="1.5" />
                <line x1="83" y1="92" x2="83" y2="114" stroke="#27272A" strokeWidth="1.5" />

                {/* Cuerpo roscado */}
                <rect x="53" y="114" width="34" height="36" fill="url(#metalGrad)" />
                <g stroke="#27272A" strokeWidth="2">
                  <line x1="53" y1="120" x2="87" y2="123" />
                  <line x1="53" y1="127" x2="87" y2="130" />
                  <line x1="53" y1="134" x2="87" y2="137" />
                  <line x1="53" y1="141" x2="87" y2="144" />
                </g>

                {/* Punta aislante y electrodo central */}
                <polygon points="58,150 82,150 77,162 63,162" fill="#E4E4E7" />
                <rect x="67" y="162" width="6" height="10" fill="#FBBF24" />

                {/* Electrodo lateral de masa (J-Gap) */}
                <path d="M 82 150 L 82 178 Q 82 184 75 184 L 65 184" stroke="#A1A1AA" strokeWidth="4.5" strokeLinecap="round" fill="none" />

                {/* DESTELLO CENTRAL DE ALTO VOLTAJE */}
                <circle className="jf-spark-core" cx="70" cy="177" r="10" fill="#60A5FA" filter="url(#sparkGlow)" />
                <circle className="jf-spark-core-white" cx="70" cy="177" r="5" fill="#FFFFFF" />

                {/* Rayos eléctricos principales */}
                <g filter="url(#sparkGlow)" strokeLinecap="round" strokeLinejoin="round">
                  <polyline className="jf-bolt jf-bolt-1" points="70,172 66,176 73,179 69,183" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
                  <polyline className="jf-bolt jf-bolt-2" points="68,176 54,170 46,175 36,168" stroke="#38BDF8" strokeWidth="2" fill="none" />
                  <polyline className="jf-bolt jf-bolt-3" points="73,177 88,171 97,177 107,172" stroke="#E12D27" strokeWidth="2.2" fill="none" />
                  <polyline className="jf-bolt jf-bolt-4" points="70,182 61,192 67,199 58,208" stroke="#93C5FD" strokeWidth="1.8" fill="none" />
                  <polyline className="jf-bolt jf-bolt-5" points="74,181 84,191 79,198 89,206" stroke="#F87171" strokeWidth="1.8" fill="none" />
                </g>
              </svg>
            </div>

            {/* Texto y barra de progreso técnico */}
            <div className="jf-spark-status">
              <span className="jf-spark-badge">IGNICIÓN OEM • JF AUTO PARTS</span>
              <h3 className="jf-spark-title">{statusText}</h3>
              <div className="jf-progress-track">
                <div
                  className="jf-progress-fill"
                  style={{ width: `${progressWidth}%` }}
                ></div>
              </div>
            </div>
          </>
        ) : (
          /* FASE 2: ORDEN GENERADA CON OPCIÓN PARA CONTACTAR POR WHATSAPP */
          <div className="relative z-10 w-full flex flex-col items-center text-center space-y-4 animate-modal-pop">
            {/* Badge de Orden Confirmada */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold font-mono">
              <i className="fa-solid fa-circle-check text-xs"></i>
              <span>ORDEN #{orderId} GENERADA</span>
            </div>

            {/* Título de Confirmación */}
            <div>
              <h3 className="text-lg font-black text-white font-sans tracking-tight">
                ¡Tu orden está lista para despacho!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Haz clic abajo para contactarnos vía WhatsApp y finalizar tu compra.
              </p>
            </div>

            {/* Tarjeta de Resumen Rápido */}
            <div className="w-full bg-[#18191f] border border-[#2d2f35] rounded-xl p-3 text-left space-y-1.5 text-xs font-sans">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white truncate max-w-[170px]">{order?.customerName || 'Cliente'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Artículos:</span>
                <span className="font-bold text-slate-200">{itemsCount} {itemsCount === 1 ? 'repuesto' : 'repuestos'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#2d2f35] pt-1.5 mt-1.5">
                <span className="text-slate-300 font-bold">Total a Pagar:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {formatUSD(totalVal)} USD
                </span>
              </div>
              {totalVES && (
                <div className="flex justify-between items-center text-[11px] text-amber-400 font-mono">
                  <span>En Bolívares (VES):</span>
                  <span className="font-bold">{totalVES}</span>
                </div>
              )}
            </div>

            {/* BOTÓN PRINCIPAL: CONTACTAR POR WHATSAPP PARA LA COMPRA */}
            <div className="w-full pt-1 space-y-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xl glow-whatsapp-order transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                <span>Contactar por WhatsApp para la compra</span>
              </a>

              {/* Aviso de seguridad: Factura oficial solo emitida por la tienda tras verificar pago */}
              <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-400">
                <i className="fa-solid fa-shield-halved text-emerald-400 text-xs"></i>
                <span>Factura oficial emitida tras verificación del pago</span>
              </div>

              {/* Botón para seguir comprando */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                Seguir explorando el catálogo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
