/**
 * Servicio de Notificaciones por Correo para JF Auto Parts
 * Notifica al correo de Atención al Cliente (jfautoparts2001@gmail.com)
 * cada vez que se emite una orden o se aprueba/confirma una venta.
 */

export const DEFAULT_NOTIFICATION_EMAIL = 'jfautoparts2001@gmail.com';

/**
 * Formatea y despacha la notificación por correo electrónico con todos los datos de la orden.
 * @param {Object} params
 * @param {Object} params.order - Datos completos de la orden
 * @param {'CREATED' | 'CONFIRMED' | 'APPROVED'} [params.eventType='CREATED'] - Tipo de evento
 * @param {string} [params.recipientEmail] - Correo destino (por defecto jfautoparts2001@gmail.com)
 * @returns {Promise<{success: boolean, message: string, data?: any, error?: string}>}
 */
export async function sendOrderEmailNotification({
  order,
  eventType = 'CREATED',
  recipientEmail = DEFAULT_NOTIFICATION_EMAIL
}) {
  if (!order) {
    return { success: false, error: 'No se suministró información de la orden.' };
  }

  const cleanRecipient = String(recipientEmail || DEFAULT_NOTIFICATION_EMAIL).trim();
  const orderId = String(order.orderId || order.order_id || order.id || 'ORD-0000').replace(/^#/, '');
  const isApproved = eventType === 'CONFIRMED' || eventType === 'APPROVED' || order.status === 'CONFIRMED';
  
  // Normalizar ítems / repuestos comprados
  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{
        name: order.coilName || order.coil_name || 'Repuesto Automotriz',
        qty: Number(order.qty) || 1,
        unitPrice: Number(order.unitPrice || order.unit_price || order.totalPrice || 0),
        subtotal: Number(order.totalPrice || order.total_price || 0),
        oem: order.oem || ''
      }];

  const formattedItems = items.map((it, idx) => {
    const qty = it.qty || 1;
    const price = Number(it.unitPrice || it.unit_price || 0).toFixed(2);
    const sub = Number(it.subtotal || (qty * price)).toFixed(2);
    const oem = it.oem ? ` (OEM: ${it.oem})` : '';
    const brand = it.brand ? ` [Marca: ${it.brand}]` : '';
    return `${idx + 1}. (${qty}x) ${it.name}${brand}${oem} — $${price} c/u = $${sub} USD`;
  }).join('\n');

  const totalUSD = Number(order.totalPrice || order.total_price || order.totalUSD || 0).toFixed(2);
  const totalVES = order.totalVES || (order.exchangeRateBinance ? `Bs. ${(totalUSD * order.exchangeRateBinance).toFixed(2)}` : 'A coordinar según tasa');
  
  const customerName = order.customerName || order.customer_name || 'Cliente Web / WhatsApp';
  const customerPhone = order.customerPhone || order.customer_phone || 'No especificado';
  const customerCar = order.customerCar || order.customer_car || 'No especificado';
  const paymentMethod = order.paymentMethod || order.metodo_pago || 'A coordinar';
  const paymentRef = order.paymentRef || order.referencia_pago || 'Pendiente por confirmar';
  const notes = order.notes || 'Ninguna';
  
  const dateFormatted = new Date().toLocaleString('es-VE', { 
    timeZone: 'America/Caracas',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const subject = `[JF AUTO PARTS] ${isApproved ? '✅ VENTA APROBADA' : '🛒 NUEVA ORDEN'}: #${orderId} - $${totalUSD} USD - ${customerName}`;

  const payload = {
    _subject: subject,
    _template: 'table',
    _captcha: 'false',
    'Tipo de Notificación': isApproved ? '✅ VENTA APROBADA Y CONFIRMADA' : '🛒 NUEVA ORDEN REGISTRADA (PENDIENTE)',
    'Número de Orden': `#${orderId}`,
    'Fecha y Hora (Vzla)': dateFormatted,
    'Nombre del Cliente': customerName,
    'Teléfono / WhatsApp': customerPhone,
    'Vehículo / Modelo': customerCar,
    'Detalle de Repuestos': formattedItems,
    'Total en Dólares (USD)': `$${totalUSD} USD`,
    'Total en Bolívares (VES)': totalVES,
    'Método de Pago': paymentMethod,
    'Referencia de Pago': paymentRef,
    'Estado de la Orden': isApproved ? 'CONFIRMADA' : 'PENDIENTE DE APROBACIÓN',
    'Observaciones / Notas': notes,
    'Plataforma Web': 'https://jfautoparts.vercel.app'
  };

  try {
    // Despacho vía FormSubmit AJAX (compatible 100% en frontend estático sin API keys expuestas)
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanRecipient)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[OrderNotification] Correo enviado exitosamente a ${cleanRecipient}:`, data);
    return { 
      success: true, 
      message: `Notificación enviada a ${cleanRecipient}`,
      data 
    };
  } catch (error) {
    console.warn(`[OrderNotification] Advertencia al enviar correo a ${cleanRecipient}:`, error);
    return { 
      success: false, 
      error: error.message || 'Error de conexión al enviar correo' 
    };
  }
}
