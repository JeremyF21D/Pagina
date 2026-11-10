import React from 'react';
import { formatUSD } from '../../utils/formatters';
import { formatVES } from '../../services/exchangeRatesService';
import { useCurrency } from '../../context/CurrencyContext';
import logoImg from '../../assets/logo.png';

export function ReceiptModal({ isOpen, order, onClose }) {
  const { rates } = useCurrency();

  if (!isOpen || !order) return null;

  const binanceTotalVES = (order.totalPrice || 0) * (rates.binance || 0);
  const bcvTotalVES = (order.totalPrice || 0) * (rates.bcv || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleSendToWhatsApp = () => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('58') ? phone : (phone.startsWith('0') ? `58${phone.slice(1)}` : `58${phone}`);

    const message = 
`🧾 *COMPROBANTE DE COMPRA • JF AUTO PARTS*
━━━━━━━━━━━━━━━━━━━━
📌 *Orden #:* ${order.orderId}
📅 *Fecha:* ${order.timestamp || new Date().toLocaleString()}
👤 *Cliente:* ${order.customerName}
📞 *Teléfono:* ${order.customerPhone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
⚙️ *Repuesto:* ${order.coilName}
🔢 *Cantidad:* ${order.qty} unidad(es)
💵 *Total USD:* ${formatUSD(order.totalPrice)}
📱 *Equivalente Binance:* ${formatVES(binanceTotalVES)}
🏛️ *Equivalente BCV:* ${formatVES(bcvTotalVES)}
💳 *Método de Pago / Ref:* ${order.paymentRef || 'Pendiente'}
🛡️ *Garantía:* 12 meses por defecto de fábrica
━━━━━━━━━━━━━━━━━━━━
¡Gracias por confiar en JF Auto Parts! Para soporte comunícate al 0412-6497478.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-modal-pop print:border-none print:shadow-none print:bg-white print:text-black"
        onClick={e => e.stopPropagation()}
      >
        {/* Barra de Acciones Superior (Oculta en Impresión) */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Comprobante Digital de Venta
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              title="Imprimir ticket o guardar como PDF"
            >
              <i className="fa-solid fa-print text-cyan-400"></i>
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleSendToWhatsApp}
              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              title="Enviar recibo al cliente por WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-emerald-400"></i>
              <span>Enviar WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Cuerpo del Recibo Formal */}
        <div className="p-5 sm:p-6 space-y-4 print:p-4 print:text-black">
          {/* Header del Ticket */}
          <div className="text-center border-b border-dashed border-slate-700/80 pb-4 print:border-gray-400">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white print:text-black">
                JF AUTO PARTS, C.A.
              </h2>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold print:text-gray-600">
              RIF: J-50000000-0 • Repuestos & Encendido Automotriz
            </p>
            <p className="text-[10px] text-slate-400 print:text-gray-600">
              Valencia, Edo. Carabobo • WhatsApp: 0412-6497478
            </p>
          </div>

          {/* Datos de la Orden */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono print:text-gray-600">Nº de Orden</span>
              <strong className="text-white font-mono font-bold print:text-black">#{order.orderId}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-mono print:text-gray-600">Fecha y Hora</span>
              <span className="text-slate-300 font-mono text-[11px] print:text-black">{order.timestamp || 'Reciente'}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-800/80 print:border-gray-200">
              <span className="text-[10px] text-slate-400 block uppercase font-mono print:text-gray-600">Cliente</span>
              <span className="text-white font-bold print:text-black">{order.customerName}</span>
              {order.customerPhone && (
                <span className="text-slate-400 text-[11px] ml-2 font-mono print:text-gray-700">({order.customerPhone})</span>
              )}
            </div>
          </div>

          {/* Detalle del Repuesto */}
          <div className="border border-slate-800 rounded-xl overflow-hidden print:border-gray-300">
            <div className="bg-slate-950 p-2 text-[10px] font-mono uppercase text-slate-400 flex justify-between print:bg-gray-200 print:text-gray-700">
              <span>Descripción</span>
              <span>Subtotal</span>
            </div>
            <div className="p-3 bg-slate-900/50 flex items-center justify-between text-xs print:bg-white">
              <div>
                <p className="font-bold text-white print:text-black">{order.coilName}</p>
                <p className="text-[10px] text-slate-400 font-mono print:text-gray-600">
                  Cant: {order.qty} x {formatUSD((order.totalPrice || 0) / (order.qty || 1))}
                </p>
              </div>
              <span className="font-mono font-bold text-white text-sm print:text-black">
                {formatUSD(order.totalPrice)}
              </span>
            </div>
          </div>

          {/* Totales y Conversión */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800 print:border-gray-300 text-xs">
            <div className="flex justify-between items-center text-slate-300 print:text-gray-700">
              <span>Total en Divisas:</span>
              <span className="font-mono font-extrabold text-base text-emerald-400 print:text-black">
                {formatUSD(order.totalPrice)} USD
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-amber-300/90 print:text-gray-800">
              <span>Monto a Tasa Binance P2P ({formatVES(rates.binance)}):</span>
              <span className="font-mono font-bold">{formatVES(binanceTotalVES)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 print:text-gray-800">
              <span>Monto a Tasa Oficial BCV ({formatVES(rates.bcv)}):</span>
              <span className="font-mono font-bold">{formatVES(bcvTotalVES)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 print:text-gray-800 pt-1 border-t border-slate-800/60">
              <span>Método y Referencia:</span>
              <span className="font-mono text-slate-200 print:text-black">{order.paymentRef || 'Efectivo / Acordado'}</span>
            </div>
          </div>

          {/* Garantía y Pie de Página */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1 print:bg-gray-100 print:border-gray-300 print:text-gray-700">
            <div className="flex items-center gap-1.5 text-white font-bold print:text-black">
              <i className="fa-solid fa-shield-halved text-rose-400"></i>
              <span>Póliza de Garantía Oficial</span>
            </div>
            <p>
              Garantía de 12 meses continuos contra defecto de fábrica. Conserve este comprobante digital o físico para cualquier cambio o revisión técnica.
            </p>
          </div>
        </div>

        {/* Footer Cerrar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
