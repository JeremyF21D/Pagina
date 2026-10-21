import { DEFAULT_BOBINAS_SEED } from '../data/seedData';

/**
 * Categorías de repuestos automotrices con sus configuraciones técnicas y prefijos oficiales
 */
export const PRODUCT_CATEGORIES = [
  {
    id: 'bobina',
    name: 'Bobinas de Encendido',
    singular: 'Bobina de Encendido',
    prefix: 'BOB',
    icon: 'fa-solid fa-bolt',
    color: 'text-amber-400',
    typeLabel: 'Tipo Físico de Bobina',
    typePlaceholder: 'Tipo Lápiz Individual (COP), Paquete 4 Torres, Módulo...',
    connectorLabel: 'Conector Eléctrico',
    connectorPlaceholder: 'Conector 3 Pines Ovalado, 4 Pines Plano...',
    defaultType: 'Tipo Lápiz Individual (COP)',
    defaultConnector: 'Conector 4 Pines'
  },
  {
    id: 'inyector',
    name: 'Inyectores de Gasolina',
    singular: 'Inyector de Gasolina',
    prefix: 'INY',
    icon: 'fa-solid fa-syringe',
    color: 'text-sky-400',
    typeLabel: 'Tipo de Inyección / Sistema',
    typePlaceholder: 'Multipunto MPFI, Secuencial, Inyección Directa GDI...',
    connectorLabel: 'Impedancia / Conector',
    connectorPlaceholder: 'Alta Impedancia (12-14 Ohms), Conector EV1...',
    defaultType: 'Multipunto MPFI',
    defaultConnector: 'Alta Impedancia (12 Ohms)'
  },
  {
    id: 'estopera',
    name: 'Estoperas / Retenes',
    singular: 'Estopera / Retén de Aceite',
    prefix: 'EST',
    icon: 'fa-solid fa-circle-notch',
    color: 'text-emerald-400',
    typeLabel: 'Posición / Ubicación del Retén',
    typePlaceholder: 'Cigüeñal Delantero, Cigüeñal Trasero, Árbol de Levas, Copa Caja...',
    connectorLabel: 'Medidas / Dimensiones (mm)',
    connectorPlaceholder: 'Ej: 42 x 55 x 7 mm, 38 x 52 x 8 mm...',
    defaultType: 'Cigüeñal Delantero',
    defaultConnector: 'Medidas Estándar OEM'
  },
  {
    id: 'bujia',
    name: 'Bujías de Encendido',
    singular: 'Bujía de Encendido',
    prefix: 'BUJ',
    icon: 'fa-solid fa-fire-flame-curved',
    color: 'text-rose-400',
    typeLabel: 'Material del Electrodo',
    typePlaceholder: 'Iridio Premium, Doble Platino, Cobre / Níquel...',
    connectorLabel: 'Calibración / Rosca',
    connectorPlaceholder: 'Calibre 1.1mm / Rosca 14mm Hexágono 16mm...',
    defaultType: 'Iridio Long Life',
    defaultConnector: 'Rosca 14mm / Calibre 1.1mm'
  },
  {
    id: 'sensor',
    name: 'Sensores Automotrices',
    singular: 'Sensor Automotriz',
    prefix: 'SEN',
    icon: 'fa-solid fa-satellite-dish',
    color: 'text-purple-400',
    typeLabel: 'Tipo de Sensor',
    typePlaceholder: 'CKP Cigüeñal, CMP Levas, Oxígeno O2, TPS Mariposa, MAP...',
    connectorLabel: 'Conector / Salida',
    connectorPlaceholder: 'Conector 3 Pines, Sensor 4 Cables...',
    defaultType: 'Sensor Posición Cigüeñal (CKP)',
    defaultConnector: 'Conector 3 Pines'
  },
  {
    id: 'bomba',
    name: 'Bombas de Gasolina',
    singular: 'Bomba / Pila de Gasolina',
    prefix: 'BOM',
    icon: 'fa-solid fa-gas-pump',
    color: 'text-orange-400',
    typeLabel: 'Tipo de Bomba / Presión',
    typePlaceholder: 'Pila Eléctrica 3.5 Bar, Módulo Completo 4.0 Bar...',
    connectorLabel: 'Voltaje / Terminales',
    connectorPlaceholder: '12V / 2 Pines con Manguera y Cedazo...',
    defaultType: 'Pila Universal 3.5 Bar',
    defaultConnector: '12V / 2 Pines'
  },
  {
    id: 'empacadura',
    name: 'Empacaduras / Sellos',
    singular: 'Empacadura / Junta de Motor',
    prefix: 'EMP',
    icon: 'fa-solid fa-layer-group',
    color: 'text-teal-400',
    typeLabel: 'Tipo de Empacadura',
    typePlaceholder: 'Cámara / Culata, Tapa Válvulas, Múltiple Admisión...',
    connectorLabel: 'Material / Composición',
    connectorPlaceholder: 'Multilámina MLS Acero, Grafito Reforzado...',
    defaultType: 'Empacadura de Cámara (MLS)',
    defaultConnector: 'Multilámina Acero'
  },
  {
    id: 'otro',
    name: 'Otros Repuestos',
    singular: 'Repuesto Automotriz',
    prefix: 'REP',
    icon: 'fa-solid fa-wrench',
    color: 'text-indigo-400',
    typeLabel: 'Especificación Técnica 1',
    typePlaceholder: 'Tipo, Material, Posición o Detalle...',
    connectorLabel: 'Especificación Técnica 2',
    connectorPlaceholder: 'Medidas, Conector o Característica adicional...',
    defaultType: 'Repuesto Original / OEM',
    defaultConnector: 'Especificación Estándar'
  }
];

export function getCategoryConfig(categoryId) {
  return PRODUCT_CATEGORIES.find(c => c.id === categoryId) || PRODUCT_CATEGORIES[0];
}

export function detectProductCategory(item) {
  if (!item) return 'otro';
  if (item.category) return item.category;
  
  const text = `${item.id || ''} ${item.name || ''} ${item.type || ''}`.toLowerCase();
  
  if (text.includes('bob-') || text.includes('bobina')) return 'bobina';
  if (text.includes('iny-') || text.includes('inyector') || text.includes('inyeccion')) return 'inyector';
  if (text.includes('est-') || text.includes('estopera') || text.includes('reten') || text.includes('retén')) return 'estopera';
  if (text.includes('buj-') || text.includes('bujia') || text.includes('bujía')) return 'bujia';
  if (text.includes('sen-') || text.includes('sensor')) return 'sensor';
  if (text.includes('bom-') || text.includes('bomba') || text.includes('pila')) return 'bomba';
  if (text.includes('emp-') || text.includes('empacadura') || text.includes('junta')) return 'empacadura';
  
  return 'otro';
}

/**
 * Genera un código / ID inteligente con la estructura solicitada:
 * [PREFIJO_3_LETRAS]-[MODELO_VEHICULO][NUMERO_MOTOR_O_VERSION]
 * Ejemplos reales:
 * - Bobina Chevrolet Aveo 1.6  -> BOB-AVEO16
 * - Bobina Nissan Tiida 1.8    -> BOB-TIIDA18
 * - Inyector Toyota Corolla 1.8 -> INY-COROLLA18
 * - Estopera Chevrolet Optra 1.8 -> EST-OPTRA18
 * - Bujía Ford Fiesta 1.6      -> BUJ-FIESTA16
 */
export function generateSmartProductId({
  category = 'bobina',
  name = '',
  carModel = '',
  engine = '',
  brand = '',
  existingItems = []
} = {}) {
  // 1. Prefijo de 3 letras según la categoría del producto
  let prefix = 'BOB';
  const catConfig = PRODUCT_CATEGORIES.find(c => c.id === category);
  if (catConfig) {
    prefix = catConfig.prefix;
  } else if (name) {
    const firstWord = name.trim().split(/\s+/)[0] || '';
    const cleanWord = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (cleanWord.length >= 3) {
      prefix = cleanWord.slice(0, 3);
    }
  }

  // 2. Modelo de vehículo (primer modelo significativo en mayúsculas)
  let modelStr = '';
  const rawModel = (carModel || '').trim();
  if (rawModel) {
    const firstChunk = rawModel.split(/[,/\\-]/)[0].trim();
    const words = firstChunk.split(/\s+/).filter(Boolean);
    let primaryWord = words[0] || '';
    if (words.length > 1 && /^(grand|new|super|sport|all)$/i.test(primaryWord)) {
      primaryWord = words[1];
    }
    const clean = primaryWord.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    modelStr = clean.slice(0, 7);
  } else if (name) {
    const nameWords = name.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/);
    const ignoreList = new Set([
      'BOBINA', 'DE', 'ENCENDIDO', 'INYECTOR', 'ESTOPERA', 'RETEN', 'RETÉN', 'BUJIA',
      'BUJÍA', 'SENSOR', 'BOMBA', 'PILA', 'EMPACADURA', 'JUNTA', 'REPUESTO',
      'CHEVROLET', 'TOYOTA', 'FORD', 'NISSAN', 'HYUNDAI', 'RENAULT', 'SUZUKI',
      'MITSUBISHI', 'KIA', 'VOLKSWAGEN', 'HONDA', 'FIAT', 'JEEP', 'DODGE', 'CHERY',
      'DFSK', 'ORIGINAL', 'OEM', 'SPORT', 'DELPHI', 'DENSO', 'BOSCH'
    ]);
    for (const w of nameWords) {
      const up = w.toUpperCase();
      if (up.length >= 3 && !ignoreList.has(up)) {
        modelStr = up.slice(0, 7);
        break;
      }
    }
  }

  if (!modelStr) {
    const cleanBrand = (brand || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    modelStr = cleanBrand.slice(0, 4) || 'REP';
  }

  // 3. Número extraído de la cilindrada o versión del motor (ej: 1.6 -> 16, 2.0 -> 20, 3.2 -> 32)
  let numStr = '';
  const searchSources = [engine || '', carModel || '', name || ''];
  for (const src of searchSources) {
    if (!src) continue;
    // Cilindrada con decimales (ej: 1.6L, 1.8, 3.2, 2.0)
    const decMatch = src.match(/(\d+)[.,](\d+)/);
    if (decMatch) {
      numStr = `${decMatch[1]}${decMatch[2]}`;
      break;
    }
    // Válvulas o versiones (ej: 16V, 24V, 8V)
    const vMatch = src.match(/(\d+)V\b/i);
    if (vMatch) {
      numStr = vMatch[1];
      break;
    }
    // Números de dos o tres cifras (ej: B16, 560)
    const intMatch = src.match(/\b(\d{2,3})\b/);
    if (intMatch) {
      numStr = intMatch[1];
      break;
    }
  }

  const baseId = `${prefix}-${modelStr}${numStr}`;

  // 4. Garantizar ID único contra el inventario existente
  let candidate = baseId;
  const isTaken = (testId) => Array.isArray(existingItems) && existingItems.some(i => i && String(i.id).toLowerCase() === testId.toLowerCase());

  if (isTaken(candidate)) {
    let suffix = 2;
    while (isTaken(`${baseId}-${suffix}`) && suffix < 99) {
      suffix++;
    }
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
}

/**
 * Mantiene compatibilidad con llamadas legadas a generateAutoCoilId
 */
export function generateAutoCoilId(existingCoils = [], brand = '', extra = {}) {
  return generateSmartProductId({
    category: extra.category || 'bobina',
    name: extra.name || '',
    carModel: extra.carModel || '',
    engine: extra.engine || '',
    brand,
    existingItems: existingCoils
  });
}

/**
 * Normalizes raw inventory object from user input, CSV, JSON, Supabase, or external DB
 * Soporta nombres de columnas tanto en inglés como en español (snake_case y camelCase)
 */
export function normalizeCoilRecord(raw, existingCoils = []) {
  if (!raw || typeof raw !== 'object') return null;

  // Price / Precio
  const rawPrice = raw.price ?? raw.precio ?? raw.costo ?? raw.valor ?? raw.precio_usd ?? 25;
  const priceVal = parseFloat(rawPrice);
  const safePrice = !isNaN(priceVal) && priceVal >= 0 ? priceVal : 25.00;

  // Old Price / Precio Anterior (solo si es un número válido > 0; de lo contrario igual al precio normal)
  const rawOldPrice = raw.oldPrice ?? raw.old_price ?? raw.precio_anterior ?? raw.precio_lista ?? raw.precio_viejo;
  const oldPriceVal = parseFloat(rawOldPrice);
  const safeOldPrice = !isNaN(oldPriceVal) && oldPriceVal > 0 ? oldPriceVal : safePrice;

  // Stock / Cantidad
  const rawStock = raw.stock ?? raw.cantidad ?? raw.existencia ?? raw.inventario ?? raw.unidades ?? raw.qty ?? 0;
  const stockVal = parseInt(rawStock, 10);
  const safeStock = !isNaN(stockVal) && stockVal >= 0 ? stockVal : 0;

  // ID / Código
  const idVal = String(raw.id ?? raw.ID ?? raw.codigo ?? raw.code ?? raw.id_bobina ?? raw.cod ?? raw._id ?? '').trim();

  // Name / Nombre
  const nameVal = String(raw.name ?? raw.nombre ?? raw.title ?? raw.titulo ?? raw.repuesto ?? raw.producto ?? raw.descripcion ?? '').trim();

  // Brand / Marca
  const brandVal = String(raw.brand ?? raw.marca ?? raw.fabricante ?? 'Chevrolet').trim();

  // Model / Modelo
  const modelVal = String(raw.carModel ?? raw.car_model ?? raw.modelo ?? raw.aplicacion ?? raw.vehiculo ?? raw.auto ?? 'Multimodelo').trim();

  // Engine / Motor
  const engineVal = String(raw.engine ?? raw.motor ?? raw.cilindrada ?? '1.6L / 2.0L').trim();

  // Category detection
  const detectedCat = detectProductCategory({ id: idVal, name: nameVal, type: raw.type || raw.tipo });

  const safeId = idVal ? idVal : generateSmartProductId({
    category: detectedCat,
    name: nameVal,
    carModel: modelVal,
    engine: engineVal,
    brand: brandVal,
    existingItems: existingCoils
  });

  // OEM / Código de Parte
  const oemVal = String(raw.oem ?? raw.codigo_oem ?? raw.oem_code ?? raw.part_number ?? raw.numero_parte ?? 'OEM-STD').trim();

  // Type / Tipo
  const typeVal = String(raw.type ?? raw.tipo ?? 'Repuesto Estándar OEM').trim();

  // Connector / Conector / Especificación 2
  const connectorVal = String(raw.connector ?? raw.conector ?? raw.pines ?? 'Medidas / Conector Estándar').trim();

  // Warranty / Garantía
  const warrantyVal = String(raw.warranty ?? raw.garantia ?? '12 meses').trim();

  // Badge / Etiqueta
  const badgeVal = String(raw.badge ?? raw.etiqueta ?? raw.tag ?? 'OEM Spec').trim();

  // Image / Imagen
  const rawImage = String(raw.image ?? raw.imageUrl ?? raw.image_url ?? raw.img ?? raw.foto ?? raw.imagen ?? raw.url_imagen ?? '').trim();

  // Si la fila remota (como en Supabase o CSV) no trae columna de imagen, enlazar con la imagen oficial del catálogo si existe
  let finalImage = rawImage;
  if (!finalImage && Array.isArray(DEFAULT_BOBINAS_SEED)) {
    const seedMatch = DEFAULT_BOBINAS_SEED.find(s => 
      s.id.toLowerCase() === safeId.toLowerCase() || 
      (s.oem && oemVal && s.oem.toLowerCase().includes(oemVal.toLowerCase()))
    );
    if (seedMatch && seedMatch.image) {
      finalImage = seedMatch.image;
    }
  }

  return {
    id: safeId,
    category: raw.category || detectedCat,
    name: nameVal || 'Repuesto Automotriz',
    brand: brandVal,
    carModel: modelVal,
    engine: engineVal,
    oem: oemVal,
    type: typeVal,
    connector: connectorVal,
    price: safePrice,
    oldPrice: safeOldPrice,
    stock: safeStock,
    inStock: safeStock > 0,
    warranty: warrantyVal,
    badge: badgeVal,
    image: finalImage
  };
}

/**
 * Maps database engine code to human-readable label
 */
export function getEngineLabel(engine) {
  const map = {
    supabase: 'Supabase (PostgreSQL)',
    mongodb: 'MongoDB Atlas',
    mysql: 'MySQL / MariaDB',
    local: 'LocalStorage DB'
  };
  return map[engine] || 'Supabase (PostgreSQL)';
}

/**
 * Formats price as USD currency string
 */
export function formatUSD(amount) {
  const num = Number(amount) || 0;
  return `$${num.toFixed(2)}`;
}
