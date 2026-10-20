/**
 * Robust CSV parser implementing RFC-4180
 * Correctly handles fields enclosed in double quotes containing commas, newlines, and escaped quotes ("")
 */
export function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF after CR
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    throw new Error('El archivo CSV debe contener al menos la cabecera y 1 fila de datos.');
  }

  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : '';
    });
    records.push(obj);
  }

  return records;
}

/**
 * Exports database items to CSV string format
 */
export function exportToCSV(items) {
  const headers = ['id', 'name', 'brand', 'carModel', 'engine', 'oem', 'type', 'connector', 'price', 'oldPrice', 'stock', 'warranty', 'badge'];
  
  const escapeField = val => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.join(',');
  const dataRows = items.map(item => headers.map(h => escapeField(item[h])).join(','));
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Exports database items to SQL statements
 */
export function exportToSQL(items) {
  const safe = str => String(str ?? '').replace(/'/g, "''");
  const inserts = items.map(b => 
    `INSERT INTO bobinas_inventario (id, name, brand, car_model, engine, oem, type, connector, price, old_price, stock, warranty, badge) VALUES ('${safe(b.id)}', '${safe(b.name)}', '${safe(b.brand)}', '${safe(b.carModel)}', '${safe(b.engine)}', '${safe(b.oem)}', '${safe(b.type)}', '${safe(b.connector)}', ${Number(b.price).toFixed(2)}, ${Number(b.oldPrice || b.price * 1.2).toFixed(2)}, ${b.stock}, '${safe(b.warranty)}', '${safe(b.badge)}');`
  ).join('\n');

  return `-- ========================================================\n-- DUMP SQL GENERADO POR BOBINAS EXPRESS\n-- Fecha: ${new Date().toISOString()}\n-- Total bobinas: ${items.length}\n-- ========================================================\n\n${inserts}`;
}

/**
 * Triggers browser file download
 */
export function downloadFile(content, fileName, mimeType = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const escapeCSVField = val => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Exports sales history to CSV format optimized for Supabase / SQL database import,
 * deeply linked to available catalog products.
 */
export function exportSalesToCSV(salesList, catalogCoils = []) {
  const headers = [
    'order_id',
    'fecha_hora',
    'cliente_nombre',
    'cliente_telefono',
    'producto_id',
    'producto_nombre',
    'codigo_oem',
    'marca_producto',
    'modelo_vehiculo',
    'motor_vehiculo',
    'tipo_bobina',
    'cantidad',
    'precio_unitario_usd',
    'total_usd',
    'stock_antes_venta',
    'stock_despues_venta',
    'stock_actual_catalogo',
    'referencia_pago',
    'estado_orden',
    'usuario_id'
  ];

  const rows = salesList.map(s => {
    // Cross-link with catalog product
    const coil = catalogCoils.find(c => c.id === s.coilId || (s.oem && c.oem && c.oem.includes(s.oem)));
    const prodId = coil ? coil.id : (s.coilId || '');
    const prodName = coil ? coil.name : (s.coilName || '');
    const oem = coil ? coil.oem : (s.oem || '');
    const brand = coil ? (coil.brand || '') : '';
    const carModel = coil ? (coil.carModel || '') : '';
    const engine = coil ? (coil.engine || '') : '';
    const type = coil ? (coil.type || '') : '';
    const currentStock = coil ? coil.stock : (s.stockAfter ?? '');

    const record = [
      s.orderId || '',
      s.timestamp || '',
      s.customerName || 'Cliente General',
      s.customerPhone || '',
      prodId,
      prodName,
      oem,
      brand,
      carModel,
      engine,
      type,
      s.qty || 1,
      Number(s.unitPrice || (s.totalPrice / (s.qty || 1)) || 0).toFixed(2),
      Number(s.totalPrice || 0).toFixed(2),
      s.stockBefore ?? '',
      s.stockAfter ?? '',
      currentStock,
      s.paymentRef || '',
      s.status || 'CONFIRMED',
      s.userId || 'CLI-WA'
    ];

    return record.map(escapeCSVField).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates SQL DDL + INSERT statements for the 'ventas' table in Supabase
 */
export function exportSalesToSQL(salesList, catalogCoils = []) {
  const safe = str => String(str ?? '').replace(/'/g, "''");
  const inserts = salesList.map(s => {
    const coil = catalogCoils.find(c => c.id === s.coilId || (s.oem && c.oem && c.oem.includes(s.oem)));
    const prodId = coil ? coil.id : (s.coilId || '');
    const prodName = coil ? coil.name : (s.coilName || '');
    const oem = coil ? coil.oem : (s.oem || '');
    const brand = coil ? (coil.brand || '') : '';
    const carModel = coil ? (coil.carModel || '') : '';
    const engine = coil ? (coil.engine || '') : '';
    const type = coil ? (coil.type || '') : '';
    const currentStock = coil ? coil.stock : (s.stockAfter ?? 0);

    return `INSERT INTO public.ventas (order_id, fecha, cliente_nombre, cliente_telefono, producto_id, producto_nombre, codigo_oem, marca_producto, modelo_vehiculo, motor_vehiculo, tipo_bobina, cantidad, precio_unitario, total_usd, stock_anterior, stock_posterior, stock_actual_catalogo, referencia_pago, estado, usuario_id) VALUES ('${safe(s.orderId)}', '${safe(s.timestamp)}', '${safe(s.customerName)}', '${safe(s.customerPhone)}', '${safe(prodId)}', '${safe(prodName)}', '${safe(oem)}', '${safe(brand)}', '${safe(carModel)}', '${safe(engine)}', '${safe(type)}', ${Number(s.qty || 1)}, ${Number(s.unitPrice || 0).toFixed(2)}, ${Number(s.totalPrice || 0).toFixed(2)}, ${Number(s.stockBefore || 0)}, ${Number(s.stockAfter || 0)}, ${Number(currentStock || 0)}, '${safe(s.paymentRef)}', '${safe(s.status || 'CONFIRMED')}', '${safe(s.userId || 'CLI-WA')}');`;
  }).join('\n');

  return `-- ========================================================
-- SCRIPT SQL INTEGRAL SUPABASE | JF AUTO PARTS
-- Crea y actualiza las tablas del Catálogo y Auditoría de Ventas
-- Fecha: ${new Date().toISOString()}
-- Total registros de venta: ${salesList.length}
-- ========================================================

-- 1. TABLA CATÁLOGO DE BOBINAS / REPUESTOS
CREATE TABLE IF NOT EXISTS public.bobinas_inventario (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  car_model TEXT,
  engine TEXT,
  oem TEXT,
  type TEXT DEFAULT 'Tipo Lápiz Individual',
  connector TEXT DEFAULT '4 Pines',
  price NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  old_price NUMERIC(10,2) DEFAULT 32.00,
  stock INTEGER NOT NULL DEFAULT 0,
  warranty TEXT DEFAULT '12 meses',
  badge TEXT DEFAULT 'OEM Spec',
  image TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA AUDITORÍA DE VENTAS Y DESPACHOS
CREATE TABLE IF NOT EXISTS public.ventas (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  fecha TEXT,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  producto_id TEXT,
  producto_nombre TEXT,
  codigo_oem TEXT,
  marca_producto TEXT,
  modelo_vehiculo TEXT,
  motor_vehiculo TEXT,
  tipo_bobina TEXT,
  cantidad INTEGER DEFAULT 1,
  precio_unitario NUMERIC(10,2),
  total_usd NUMERIC(10,2),
  stock_anterior INTEGER,
  stock_posterior INTEGER,
  stock_actual_catalogo INTEGER,
  referencia_pago TEXT,
  estado TEXT DEFAULT 'CONFIRMED',
  status TEXT DEFAULT 'CONFIRMED',
  usuario_id TEXT DEFAULT 'CLI-WA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MIGRACIÓN AUTOMÁTICA: Asegura que todas las columnas existan si la tabla ya fue creada previamente
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'CONFIRMED';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'CONFIRMED';
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS producto_id TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS producto_nombre TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS codigo_oem TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS marca_producto TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS modelo_vehiculo TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS motor_vehiculo TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_bobina TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 1;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS total_usd NUMERIC(10,2);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS stock_anterior INTEGER;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS stock_posterior INTEGER;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS stock_actual_catalogo INTEGER;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS cliente_nombre TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS cliente_telefono TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS referencia_pago TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS fecha TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS usuario_id TEXT;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS order_id TEXT;

-- 4. RELACIONAR CLAVE FORÁNEA CON EL CATÁLOGO (Integridad Referencial)
DO $$
BEGIN
  -- 4.1 Asegurar que bobinas_inventario tenga restricción UNIQUE o PRIMARY KEY en 'id' (Evita error 42830)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.bobinas_inventario'::regclass 
      AND (conname IN ('bobinas_inventario_pkey', 'bobinas_inventario_id_unique') OR contype = 'p')
  ) THEN
    ALTER TABLE public.bobinas_inventario ADD CONSTRAINT bobinas_inventario_id_unique UNIQUE (id);
  END IF;

  -- 4.2 Agregar clave foránea en ventas hacia bobinas_inventario
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.ventas'::regclass 
      AND conname = 'fk_ventas_producto_catalogo'
  ) THEN
    ALTER TABLE public.ventas 
      ADD CONSTRAINT fk_ventas_producto_catalogo 
      FOREIGN KEY (producto_id) 
      REFERENCES public.bobinas_inventario(id) 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. DESACTIVAR RLS PARA PERMITIR OPERACIONES DE LECTURA/ESCRITURA DIRECTAS
ALTER TABLE public.bobinas_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas DISABLE ROW LEVEL SECURITY;

-- 6. RECARGAR LA CACHÉ DE POSTGREST (Corrige de inmediato el error PGRST204)
NOTIFY pgrst, 'reload schema';

-- 7. REGISTROS DE VENTAS INSERTABLES:
${inserts}`;
}

/**
 * Parses sales CSV and auto-connects each record with available products in the catalog
 */
export function parseSalesCSV(csvText, catalogCoils = []) {
  const rawRows = parseCSV(csvText);
  let matchedCount = 0;

  const sales = rawRows.map((r, idx) => {
    // Read raw fields flexibly (supports both Spanish snake_case and camelCase)
    const rawOrderId = r.order_id || r.orderId || r.orden || r.id || `ORD-${Date.now().toString().slice(-4)}${idx}`;
    const rawProdId = r.producto_id || r.coilId || r.coil_id || r.id_producto || '';
    const rawOem = r.codigo_oem || r.oem || r.cod_oem || '';
    const rawProdName = r.producto_nombre || r.coilName || r.coil_name || r.nombre || r.producto || '';
    const rawCustomer = r.cliente_nombre || r.cliente || r.customerName || r.customer_name || 'Cliente Mostrador';
    const rawPhone = r.cliente_telefono || r.telefono || r.customerPhone || r.customer_phone || '';
    const rawQty = Math.max(1, parseInt(r.cantidad || r.qty || r.unidades || 1, 10));
    const rawPrice = parseFloat(r.precio_unitario || r.precio_unitario_usd || r.unitPrice || r.unit_price || r.precio || 0);
    const rawTotal = parseFloat(r.total_usd || r.totalPrice || r.total || 0);
    const rawPayRef = r.referencia_pago || r.paymentRef || r.pago || r.referencia || 'Transferencia / Pago Móvil';
    const rawStatus = (r.estado_orden || r.estado || r.status || 'CONFIRMED').toUpperCase();
    const rawDate = r.fecha_hora || r.fecha || r.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // CONNECT WITH CATALOG PRODUCT:
    // 1. By ID
    let matchedCoil = catalogCoils.find(c => c.id && rawProdId && c.id.toLowerCase() === rawProdId.toLowerCase());
    // 2. By OEM
    if (!matchedCoil && rawOem) {
      matchedCoil = catalogCoils.find(c => c.oem && c.oem.toLowerCase().includes(rawOem.toLowerCase()));
    }
    // 3. By Name
    if (!matchedCoil && rawProdName) {
      matchedCoil = catalogCoils.find(c => c.name && c.name.toLowerCase().includes(rawProdName.toLowerCase()));
    }

    if (matchedCoil) matchedCount++;

    const finalProdId = matchedCoil ? matchedCoil.id : (rawProdId || 'BOB-GENERICA');
    const finalProdName = matchedCoil ? matchedCoil.name : (rawProdName || 'Bobina de Encendido Estándar');
    const finalOem = matchedCoil ? matchedCoil.oem : (rawOem || 'N/A');
    const finalUnitPrice = rawPrice > 0 ? rawPrice : (matchedCoil ? matchedCoil.price : 25.00);
    const finalTotalPrice = rawTotal > 0 ? rawTotal : (finalUnitPrice * rawQty);
    const stockAfter = matchedCoil ? matchedCoil.stock : parseInt(r.stock_despues_venta || r.stockAfter || 10, 10);
    const stockBefore = parseInt(r.stock_antes_venta || r.stockBefore || (stockAfter + rawQty), 10);

    return {
      orderId: String(rawOrderId).replace(/^#/, ''),
      timestamp: rawDate,
      userId: r.usuario_id || r.userId || 'CLI-IMPORT',
      customerName: rawCustomer,
      customerPhone: rawPhone,
      coilId: finalProdId,
      coilName: finalProdName,
      oem: finalOem,
      qty: rawQty,
      unitPrice: finalUnitPrice,
      totalPrice: finalTotalPrice,
      stockBefore,
      stockAfter,
      paymentRef: rawPayRef,
      status: ['CONFIRMED', 'REVERTED', 'PENDING_APPROVAL'].includes(rawStatus) ? rawStatus : 'CONFIRMED',
      isMatched: Boolean(matchedCoil)
    };
  });

  return { sales, matchedCount, totalCount: sales.length };
}
