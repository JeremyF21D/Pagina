import React from 'react';
import { formatUSD, formatOrderDate } from '../../utils/formatters';
import logoImg from '../../assets/logo.png';
import logoCompleto from '../../assets/brand/logo_jf_completo.png';

export function ReceiptModal({ isOpen, order, onClose }) {
  if (!isOpen || !order) return null;

  const items = (order.items && Array.isArray(order.items) && order.items.length > 0)
    ? order.items
    : [{
        name: order.coilName || 'Repuesto Automotriz',
        oem: order.oem || 'N/A',
        qty: order.qty || 1,
        unitPrice: (order.totalPrice || 0) / (order.qty || 1),
        subtotal: order.totalPrice || 0
      }];

  const totalUSD = Number(order.totalPrice || order.totalUSD || 0);
  const formattedDate = formatOrderDate(order.timestamp, true);
  const binanceRate = order.exchangeRateBinance || null;
  const totalVES = order.totalVES || null;

  // Imprimir factura formal aislada (Garantiza 1 sola hoja sin fondos de la tienda ni WhatsApp)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      window.print();
      return;
    }

    const itemsRows = items.map((it, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; width: 40px;">${idx + 1}</td>
        <td style="width: 50px; text-align: center; font-weight: bold;">${it.qty}</td>
        <td style="font-family: monospace; font-size: 11px; width: 140px;">${it.oem || 'N/A'}</td>
        <td>
          <strong style="color: #0f172a;">${it.name}</strong>
        </td>
        <td style="text-align: right; font-family: monospace; width: 85px;">${formatUSD(it.unitPrice)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; width: 95px;">${formatUSD(it.subtotal || (it.unitPrice * it.qty))}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Factura_${order.orderId}_JF_Auto_Parts</title>
        <style>
          @page { size: letter portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
          body { background: #ffffff; color: #1e293b; padding: 15px; font-size: 12px; line-height: 1.4; }
          .ticket-container { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background: #fff; }
          
          /* Encabezado */
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #de2420; padding-bottom: 16px; margin-bottom: 16px; }
          .brand-title { font-size: 22px; font-weight: 900; color: #0f172a; font-family: 'Orbitron', -apple-system, sans-serif; letter-spacing: -0.5px; }
          .brand-title span { color: #de2420; }
          .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .brand-contact { font-size: 11px; color: #334155; margin-top: 4px; font-weight: 500; }
          
          .invoice-box { text-align: right; }
          .invoice-tag { display: inline-block; background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .invoice-num { font-size: 18px; font-weight: 900; color: #de2420; font-family: monospace; }
          .invoice-date { font-size: 11px; color: #64748b; margin-top: 2px; }

          /* Datos del Cliente y Despacho */
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 18px; }
          .info-block p { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 2px; }
          .info-block span { font-size: 13px; font-weight: 700; color: #0f172a; }

          /* Tabla de Artículos */
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) td { background: #f8fafc; }

          /* Resumen de Totales */
          .totals-wrapper { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
          .payment-box { flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; }
          .payment-box h4 { font-size: 10px; text-transform: uppercase; color: #166534; font-weight: 800; margin-bottom: 4px; }
          .payment-box p { font-family: monospace; font-size: 11px; color: #15803d; font-weight: 600; word-break: break-all; }

          .totals-table { width: 280px; border-collapse: collapse; }
          .totals-table td { padding: 5px 8px; border: none; font-size: 12px; }
          .totals-table tr.total-final td { border-top: 2px solid #0f172a; font-size: 15px; font-weight: 900; color: #0f172a; padding-top: 8px; }
          .rate-note { font-size: 10px; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 3px 6px; border-radius: 4px; margin-top: 4px; font-weight: bold; display: inline-block; }

          /* Pie de Página */
          .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #64748b; }
          .footer p:first-child { font-weight: 700; color: #334155; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <!-- Encabezado -->
          <div class="header">
            <div>
              <div class="brand-title">JF <span>AUTO PARTS</span>, C.A.</div>
              <div class="brand-sub">RIF: J-50000000-0 • Especialistas en Encendido & Inyección Automotriz</div>
              <div class="brand-contact">Maracaibo, Edo. Zulia • Atención al Cliente: 0412-6497478</div>
            </div>
            <div class="invoice-box">
              <div class="invoice-tag">Comprobante de Venta</div>
              <div class="invoice-num">#${order.orderId}</div>
              <div class="invoice-date">${formattedDate}</div>
            </div>
          </div>

          <!-- Datos de la Venta -->
          <div class="info-grid">
            <div class="info-block">
              <p>Cliente / Razón Social</p>
              <span>${order.customerName || 'Cliente'}</span>
              ${order.customerPhone ? `<div style="font-family: monospace; font-size: 11px; color: #475569; margin-top: 2px;">Tel: ${order.customerPhone}</div>` : ''}
            </div>
            <div class="info-block">
              <p>Estado del Despacho</p>
              <span style="color: #059669;">DESPACHADO / ENTREGADO</span>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">${items.length} ${items.length === 1 ? 'repuesto entregado' : 'repuestos entregados'}</div>
            </div>
          </div>

          <!-- Tabla de Artículos -->
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">#</th>
                <th style="text-align: center;">Cant</th>
                <th>Código OEM</th>
                <th>Descripción del Repuesto</th>
                <th style="text-align: right;">Precio U.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Totales y Pago -->
          <div class="totals-wrapper">
            <div class="payment-box">
              <h4>Método de Pago & Comprobante</h4>
              <p>${order.paymentRef || 'Pago verificado'}</p>
              ${binanceRate ? `
                <div style="margin-top: 6px;">
                  <span class="rate-note">Tasa de Cambio: ${binanceRate} Bs/USD</span>
                </div>
              ` : ''}
            </div>

            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal Artículos:</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatUSD(totalUSD)}</td>
              </tr>
              ${totalVES ? `
                <tr>
                  <td style="color: #64748b;">Total en Bolívares:</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #b45309;">${totalVES}</td>
                </tr>
              ` : ''}
              <tr class="total-final">
                <td>TOTAL USD:</td>
                <td style="text-align: right; font-family: monospace;">${formatUSD(totalUSD)} USD</td>
              </tr>
            </table>
          </div>

          <!-- Pie de Página -->
          <div class="footer">
            <p>¡Gracias por su compra en JF Auto Parts!</p>
            <p>Documento de control interno y comprobante para el cliente • Sistema Administrativo JF Auto Parts</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const handleSendToWhatsApp = () => {
    const phone = (order.customerPhone || '').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('58') ? phone : (phone.startsWith('0') ? `58${phone.slice(1)}` : `58${phone}`);

    const itemsSummary = items.map((it, idx) => 
      `${idx + 1}. *${it.name}* (Cant: ${it.qty}) → ${formatUSD(it.subtotal || (it.unitPrice * it.qty))}`
    ).join('\n');

    const rateText = order.exchangeRateBinance 
      ? `\n💱 *Tasa de Cambio:* ${order.exchangeRateBinance} Bs/USD (${order.totalVES || ''})`
      : '';

    const message = 
`🧾 *COMPROBANTE DE COMPRA • JF AUTO PARTS*
━━━━━━━━━━━━━━━━━━━━
📌 *Orden #:* ${order.orderId}
📅 *Fecha:* ${formattedDate}
👤 *Cliente:* ${order.customerName}
📞 *Teléfono:* ${order.customerPhone || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
📦 *Detalle de Repuestos:*
${itemsSummary}
━━━━━━━━━━━━━━━━━━━━
💵 *Total USD:* ${formatUSD(totalUSD)} USD${rateText}
💳 *Pago / Ref:* ${order.paymentRef || 'Acordado'}
━━━━━━━━━━━━━━━━━━━━
¡Gracias por confiar en JF Auto Parts! Para soporte comunícate al 0412-6497478.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in print:hidden">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-modal-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Barra de Acciones Superior FIJA (Nunca se corta) */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              Factura / Comprobante #{order.orderId}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-sky-600/20 active:scale-95"
              title="Abrir vista de impresión y guardar como PDF"
            >
              <i className="fa-solid fa-print"></i>
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSendToWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-emerald-600/20 active:scale-95"
              title="Enviar recibo al cliente por WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span className="hidden sm:inline">Enviar WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>
          </div>
        </div>

        {/* Cuerpo del Recibo con Scroll Interno Limpio */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Header del Ticket */}
          <div className="text-center border-b border-dashed border-slate-700/80 pb-4">
            <div className="flex items-center justify-center mb-2">
              <img src={logoCompleto} alt="JF Auto Parts" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              RIF: J-50000000-0 • Repuestos & Encendido Automotriz
            </p>
            <p className="text-[10px] text-slate-400">
              Maracaibo, Edo. Zulia • WhatsApp: 0412-6497478
            </p>
          </div>

          {/* Datos de la Orden */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Nº de Orden</span>
              <strong className="text-white font-mono font-bold text-sm">#{order.orderId}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Fecha y Hora</span>
              <span className="text-slate-300 font-mono text-[11px]">{formattedDate}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Cliente</span>
              <span className="text-white font-bold">{order.customerName}</span>
              {order.customerPhone && (
                <span className="text-slate-400 text-[11px] ml-2 font-mono">({order.customerPhone})</span>
              )}
            </div>
          </div>

          {/* Detalle de los Repuestos */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-950 p-2 text-[10px] font-mono uppercase text-slate-400 flex justify-between">
              <span>Descripción ({items.length} {items.length === 1 ? 'repuesto' : 'repuestos'})</span>
              <span>Subtotal</span>
            </div>
            <div className="divide-y divide-slate-850 bg-slate-900/50">
              {items.map((it, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                  <div className="pr-2 min-w-0">
                    <p className="font-bold text-white truncate">{it.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Cant: {it.qty} x {formatUSD(it.unitPrice)} · OEM: {it.oem || 'N/A'}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-white text-xs shrink-0">
                    {formatUSD(it.subtotal || (it.unitPrice * it.qty))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totales y Forma de Pago */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-bold">Total USD:</span>
              <span className="font-mono font-extrabold text-base text-emerald-400">
                {formatUSD(totalUSD)} USD
              </span>
            </div>

            {binanceRate > 0 && (
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                <span>Tasa de Cambio:</span>
                <span className="text-amber-300 font-bold">{binanceRate} Bs/USD</span>
              </div>
            )}

            {totalVES && (
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>Total Calculado en Bolívares:</span>
                <span className="text-slate-200 font-bold">{totalVES}</span>
              </div>
            )}

            <div className="flex justify-between items-start text-[11px] text-slate-300 pt-1 border-t border-slate-800/60 gap-2">
              <span className="shrink-0 text-slate-400">Método y Referencia:</span>
              <span className="font-mono font-semibold text-amber-300 text-right break-words">{order.paymentRef || 'Acordado en tienda'}</span>
            </div>
          </div>
        </div>

        {/* Footer Cerrar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right shrink-0">
          <button
            type="button"
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
