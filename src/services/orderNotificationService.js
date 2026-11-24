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
    return `${idx + 1}. (${qty}x) ${it.name}${brand}${oem} - $${price} c/u = $${sub} USD`;
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

  const subject = `[JF AUTO PARTS] ${isApproved ? 'VENTA APROBADA' : 'NUEVA ORDEN'}: #${orderId} - $${totalUSD} USD - ${customerName}`;

  // Resumen completo formateado para el cuerpo del mensaje
  const fullSummary = [
    '========================================',
    '       JF AUTO PARTS - DETALLE DE VENTA',
    '========================================',
    `NOTIFICACIÓN: ${isApproved ? 'VENTA APROBADA Y CONFIRMADA' : 'NUEVA ORDEN REGISTRADA (PENDIENTE)'}`,
    `ORDEN: #${orderId}`,
    `FECHA: ${dateFormatted}`,
    `CLIENTE: ${customerName}`,
    `TELÉFONO: ${customerPhone}`,
    `VEHÍCULO: ${customerCar}`,
    '',
    'REPUESTOS COMPRADOS:',
    formattedItems,
    '',
    'TOTALES:',
    `Total USD: $${totalUSD} USD`,
    `Total VES: ${totalVES}`,
    '',
    'MÉTODO Y PAGO:',
    `Método de Pago: ${paymentMethod}`,
    `Referencia: ${paymentRef}`,
    `Estado de Orden: ${isApproved ? 'CONFIRMADA' : 'PENDIENTE DE APROBACIÓN'}`,
    `Notas: ${notes}`,
    '----------------------------------------',
    'Plataforma: https://jfautoparts.vercel.app',
    '========================================'
  ].join('\n');

  // Payload estándar JSON 100% compatible con FormSubmit AJAX
  const payload = {
    _subject: subject,
    _template: 'table',
    _captcha: 'false',
    name: customerName,
    message: fullSummary,
    Tipo_Notificacion: isApproved ? 'VENTA APROBADA Y CONFIRMADA' : 'NUEVA ORDEN REGISTRADA',
    Numero_Orden: `#${orderId}`,
    Fecha: dateFormatted,
    Cliente: customerName,
    Telefono: customerPhone,
    Vehiculo: customerCar,
    Repuestos: formattedItems,
    Total_USD: `$${totalUSD} USD`,
    Total_VES: String(totalVES),
    Metodo_Pago: paymentMethod,
    Referencia_Pago: paymentRef,
    Estado: isApproved ? 'CONFIRMADA' : 'PENDIENTE',
    Notas: notes
  };

  try {
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
    console.warn(`[OrderNotification] Envío JSON con advertencia, intentando FormData de respaldo:`, error);
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => formData.append(k, String(v)));
      const fallbackResponse = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanRecipient)}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });
      const dataFallback = await fallbackResponse.json();
      return { 
        success: true, 
        message: `Notificación enviada a ${cleanRecipient}`, 
        data: dataFallback 
      };
    } catch (fbErr) {
      console.warn(`[OrderNotification] Advertencia al enviar correo a ${cleanRecipient}:`, fbErr);
      return { 
        success: false, 
        error: fbErr.message || error.message || 'Error de conexión al enviar correo' 
      };
    }
  }
}
