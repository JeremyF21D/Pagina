import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { buildOwnerAlertUrl } from '../../utils/whatsapp';
import { formatUSD } from '../../utils/formatters';

export function OwnerNotificationBanner() {
  const { pendingOwnerAlert, dismissOwnerAlert, ownerSettings } = useInventory();

  if (!pendingOwnerAlert) return null;

  const handleSendToOwner = () => {
    const url = buildOwnerAlertUrl({
      ownerPhone: ownerSettings.ownerPhone,
      order: pendingOwnerAlert
    });
    window.open(url, '_blank');
    dismissOwnerAlert();
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 max-w-sm w-full animate-bounce-subtle print:hidden">
      <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl shadow-emerald-950/15 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
              ¡Nueva Venta Confirmada!
            </span>
          </div>
          <button 
            onClick={dismissOwnerAlert}
            className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Cerrar notificación"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 mb-3 text-slate-700">
          <div><strong className="text-slate-900 font-bold">Orden:</strong> #{pendingOwnerAlert.orderId}</div>
          <div><strong className="text-slate-900 font-bold">Cliente:</strong> {pendingOwnerAlert.customerName}</div>
          <div><strong className="text-slate-900 font-bold">Pieza:</strong> {pendingOwnerAlert.qty}x {pendingOwnerAlert.coilName}</div>
          <div><strong className="text-slate-900 font-bold">Total:</strong> <span className="text-emerald-600 font-extrabold">{formatUSD(pendingOwnerAlert.totalPrice)} USD</span></div>
          <div><strong className="text-slate-900 font-bold">Stock en DB:</strong> {pendingOwnerAlert.stockBefore} ➔ <span className="text-emerald-600 font-extrabold">{pendingOwnerAlert.stockAfter} uds</span></div>
        </div>

        <button 
          onClick={handleSendToOwner}
          className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
        >
          <i className="fa-brands fa-whatsapp text-sm"></i>
          Notificar al Dueño ({ownerSettings.ownerPhone})
        </button>
      </div>
    </div>
  );
}
