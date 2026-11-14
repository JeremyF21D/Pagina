import { useState, useCallback } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { getEngineLabel, formatUSD, detectProductCategory } from '../utils/formatters';
import { getCachedExchangeRates, formatVES } from '../services/exchangeRatesService';

// ─── Stop words — ignoring these helps focus on meaningful search terms ──────
const STOP_WORDS = new Set([
  'hola', 'buenas', 'tardes', 'dias', 'noches', 'tienen', 'tiene', 'tienes',
  'disponible', 'disponibilidad', 'precio', 'cuanto', 'cuesta', 'vale', 'para',
  'una', 'un', 'el', 'la', 'los', 'las', 'de', 'del', 'por', 'favor',
  'con', 'en', 'stock', 'hay', 'busco', 'necesito',
  'amigo', 'que', 'cual', 'es', 'codigo', 'oem', 'quiero', 'comprar', 'confirmo',
  'compra', 'pague', 'pago', 'movil', 'zelle', 'binance', 'ref', 'comprobante',
  'transferencia', 'hice', 'nene', 'hermano', 'bro', 'chamo', 'pana',
  'amig', 'ese', 'esa', 'mio', 'mia', 'me', 'si', 'no', 'ok', 'dale',
  'puede', 'ser', 'mi', 'su', 'tu', 'yo', 'y', 'o', 'a', 'lo', 'le'
]);

/**
 * Detect explicit category intent in user query (e.g., "bobina", "conector", "sensor", "inyector", "estopera", etc.)
 */
function detectQueryCategory(rawText) {
  const t = String(rawText || '').toLowerCase();
  if (/\b(bobina|bobinas|cop)\b/i.test(t)) return 'bobina';
  if (/\b(conector|conectores|enchufe|enchufes|ramal|ramales|arnes|arneses|pigtail)\b/i.test(t)) return 'conector';
  if (/\b(inyector|inyectores|inyeccion)\b/i.test(t)) return 'inyector';
  if (/\b(sensor|sensores|maf|map|ckp|cmp|oxigeno|tps|presostato|valvula)\b/i.test(t)) return 'sensor';
  if (/\b(estopera|estoperas|reten|retenes)\b/i.test(t)) return 'estopera';
  if (/\b(bujia|bujias)\b/i.test(t)) return 'bujia';
  if (/\b(bomba|bombas|pila|pilas)\b/i.test(t)) return 'bomba';
  if (/\b(empacadura|empacaduras|junta|juntas)\b/i.test(t)) return 'empacadura';
  return null;
}

// ─── Alias / abbreviation dictionary ─────────────────────────────────────────
// Maps common typos, abbreviations and Venezuelan slang to canonical search terms
const ALIASES = {
  // Brands
  'chevy': 'chevrolet', 'chevi': 'chevrolet', 'cheby': 'chevrolet', 'chev': 'chevrolet',
  'opel': 'chevrolet', 'gm': 'chevrolet',
  'toy': 'toyota', 'toyot': 'toyota', 'toyoya': 'toyota', 'toyoyta': 'toyota',
  'ford': 'ford', 'frd': 'ford',
  'nisan': 'nissan', 'nisam': 'nissan', 'nissa': 'nissan', 'nisaan': 'nissan',
  'hundai': 'hyundai', 'hyudai': 'hyundai', 'hiundai': 'hyundai', 'hunday': 'hyundai',
  'reno': 'renault', 'renol': 'renault', 'renault': 'renault', 'renaut': 'renault',
  'vw': 'volkswagen', 'volks': 'volkswagen',
  'mitsu': 'mitsubishi', 'mitsubi': 'mitsubishi',
  'kia': 'kia', 'kiia': 'kia',
  'honda': 'honda', 'onda': 'honda',

  // Models — Chevrolet
  'captiva': 'captiva', 'captiba': 'captiva', 'captivaa': 'captiva', 'cap': 'captiva',
  'aveo': 'aveo', 'abeo': 'aveo', 'aveoo': 'aveo', 'abio': 'aveo',
  'corsa': 'corsa', 'corza': 'corsa', 'corso': 'corsa',
  'cruze': 'cruze', 'cruse': 'cruze', 'cruce': 'cruze',
  'spark': 'spark', 'spart': 'spark', 'espark': 'spark',
  'tracker': 'tracker', 'traker': 'tracker',
  'optra': 'optra', 'optar': 'optra',
  'malibu': 'malibu',
  'equinox': 'equinox',
  'orlando': 'orlando',

  // Toyota
  'corol': 'corolla', 'corola': 'corolla', 'corona': 'corolla', 'corolaa': 'corolla',
  'camri': 'camry', 'camrry': 'camry',
  'yari': 'yaris', 'yars': 'yaris', 'yariz': 'yaris',
  'hilux': 'hilux', 'ilux': 'hilux',
  'prad': 'prado', 'pradoo': 'prado',
  'rav4': 'rav4', 'rav': 'rav4',

  // Ford
  'fiesta': 'fiesta', 'fiesta': 'fiesta', 'fieesta': 'fiesta',
  'focus': 'focus', 'focuss': 'focus', 'focuz': 'focus',
  'ecosport': 'ecosport', 'eco': 'ecosport',
  'fusion': 'fusion',
  'escape': 'escape',
  'explorer': 'explorer',
  'expedition': 'expedition',

  // Nissan
  'sentra': 'sentra', 'sentr': 'sentra', 'ssentra': 'sentra',
  'tiida': 'tiida', 'tida': 'tiida', 'tyda': 'tiida',
  'versa': 'versa', 'bersa': 'versa',
  'rogue': 'rogue', 'roge': 'rogue',
  'qashqai': 'qashqai', 'kashkai': 'qashqai',
  'kicks': 'kicks', 'kick': 'kicks',
  'almera': 'almera',
  'frontier': 'frontier', 'frontera': 'frontier',
  'pathfinder': 'pathfinder',
  'xtrail': 'x-trail', 'xtrail': 'x-trail', 'xtrai': 'x-trail',
  'altima': 'altima', 'altimma': 'altima',
  'murano': 'murano',
  'conector': 'conector', 'conectores': 'conector', 'enchufe': 'conector', 'ramal': 'conector',

  // Hyundai
  'tucson': 'tucson', 'tuczon': 'tucson', 'tukson': 'tucson',
  'elantra': 'elantra', 'elantra': 'elantra',
  'accent': 'accent', 'acent': 'accent',
  'santa': 'santa fe', 'santafe': 'santa fe',
  'ioniq': 'ioniq',
  'creta': 'creta',

  // Renault
  'logam': 'logan', 'loga': 'logan', 'lagan': 'logan',
  'sandero': 'sandero', 'sanero': 'sandero',
  'duster': 'duster', 'dusteer': 'duster',
  'stepway': 'stepway',
  'megane': 'megane', 'megan': 'megane',

  // Dong Feng / Chinese
  'dong': 'dong feng', 'dongfeng': 'dong feng', 'dfm': 'dong feng',
  'zotye': 'zotye',
  'chery': 'chery', 'cherry': 'chery',
  'jac': 'jac',

  // Common engine sizes (e.g. "1.6" typed as "16" or "uno punto seis")
  '16': '1.6', '18': '1.8', '20': '2.0', '14': '1.4', '24': '2.4', '32': '3.2',
  'v6': 'v6', 'v8': 'v8',
};

/**
 * Normalize and expand a raw user query:
 * - Lowercase, strip accents, strip punctuation
 * - Replace aliases and known typos
 * - Remove stop words
 * Returns both the original cleaned string and an array of meaningful tokens.
 */
function normalizeQuery(rawText) {
  // 1. Lowercase + remove accents (é→e, á→a, etc.)
  let text = String(rawText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Preserve engine sizes with dots/decimals (1.8, 1.6, 2.0, 2.4, 3.2, etc.)
  text = text.replace(/(\d+)[.,](\d+)/g, '$1_$2');

  // Strip punctuation except underscores
  text = text
    .replace(/[¿?¡!.,;:#()\-_\/\\]/g, (m) => m === '_' ? '_' : ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Apply alias substitutions word by word and restore engine numbers
  const words = text.split(' ').map(w => w.replace('_', '.').trim()).filter(Boolean);
  const expanded = words.map(w => ALIASES[w] || w);
  text = expanded.join(' ');

  // 3. Tokenize and filter stop words, keep tokens ≥ 2 chars
  const tokens = text
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));

  return { cleanText: text, tokens };
}

/**
 * Levenshtein distance between two strings (for fuzzy matching).
 * Optimized for short tokens.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Only compare if strings are reasonably similar in length
  if (Math.abs(a.length - b.length) > 4) return 99;

  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Score a single product against search tokens and category intent.
 * Highly discriminative:
 *   - High weight for product.name matches (user searches what it is)
 *   - Massive category alignment bonus (+40) / severe penalty (-35) for category clash
 *   - Differentiated weights for name, OEM/id, engine, brand, carModel
 *   - Bonus when ALL query tokens match the product
 */
function scoreProduct(product, tokens, queryCategory) {
  if (!tokens || !tokens.length) return 0;

  const productCat = detectProductCategory(product);

  const nameNorm = (product.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const modelNorm = (product.carModel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const brandNorm = (product.brand || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const oemNorm = (product.oem || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const idNorm = (product.id || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const engineNorm = (product.engine || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const typeNorm = (product.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const connectorNorm = (product.connector || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const highPriorityHaystack = `${nameNorm} ${brandNorm} ${modelNorm} ${engineNorm} ${oemNorm} ${idNorm}`;
  const lowPriorityHaystack = `${typeNorm} ${connectorNorm}`;

  // Pre-tokenize product words for fuzzy fallback
  const productWords = highPriorityHaystack
    .replace(/[^a-z0-9\s\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  let totalScore = 0;
  let matchedTokensCount = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    // 1. Direct match in Name (highest priority indicator of what the part actually is)
    if (nameNorm.includes(token)) {
      tokenScore = Math.max(tokenScore, token.length >= 4 ? 14 : 9);
    }

    // 2. Exact match in OEM code or product ID
    if (oemNorm.includes(token) || idNorm.includes(token)) {
      tokenScore = Math.max(tokenScore, token.length >= 4 ? 16 : 10);
    }

    // 3. Exact match in Engine displacement
    if (engineNorm.includes(token)) {
      tokenScore = Math.max(tokenScore, 10);
    }

    // 4. Exact match in Car Model compatibility
    if (modelNorm.includes(token)) {
      tokenScore = Math.max(tokenScore, token.length >= 4 ? 7 : 4);
    }

    // 5. Match in Brand
    if (brandNorm.includes(token)) {
      tokenScore = Math.max(tokenScore, 5);
    }

    // 6. Secondary / low priority fields
    if (tokenScore === 0 && lowPriorityHaystack.includes(token)) {
      tokenScore = 2;
    }

    // 7. Fuzzy match against words in high priority haystack (for slight typos)
    if (tokenScore === 0 && token.length >= 3) {
      for (const pw of productWords) {
        if (Math.abs(pw.length - token.length) > 3) continue;
        const dist = levenshtein(token, pw);
        if (dist === 1) { tokenScore = Math.max(tokenScore, 3); break; }
        if (dist === 2 && token.length >= 5) { tokenScore = Math.max(tokenScore, 1); }
      }
    }

    if (tokenScore > 0) {
      matchedTokensCount++;
    }
    totalScore += tokenScore;
  }

  // Bonus if all search tokens were found in the product
  if (matchedTokensCount === tokens.length && tokens.length > 1) {
    totalScore += 16;
  }

  // Category matching logic:
  // If user explicitly asks for "bobina" or "conector" or "sensor", heavily weight items of that category
  if (queryCategory) {
    if (productCat === queryCategory) {
      totalScore += 40; // Decisive boost
    } else {
      totalScore -= 35; // Severe penalty so conflicting categories never override
    }
  }

  // Stock tie-breaker (prefer in-stock products if otherwise tied)
  if (product.stock > 0) {
    totalScore += 1;
  }

  return totalScore;
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useAIAgent() {
  const { coils, dbEngine, ownerSettings, processSaleTransaction } = useInventory();
  const { deviceId, isAdmin } = useAuth();
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [lastInteractedProduct, setLastInteractedProduct] = useState(null);

  const logConsoleQuery = useCallback((query, count, latencyMs = 28) => {
    const entry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      query,
      count,
      engine: getEngineLabel(dbEngine),
      latency: latencyMs
    };
    setConsoleLogs(prev => [entry, ...prev.slice(0, 49)]);
  }, [dbEngine]);

  const generateResponse = useCallback((userPrompt, explicitProduct = null) => {
    const rawPrompt = String(userPrompt || '');
    const { cleanText, tokens } = normalizeQuery(rawPrompt);
    const latency = Math.floor(20 + Math.random() * 40);

    // ── Purchase / payment confirmation intent ──────────────────────────────
    const isPurchaseConfirmation =
      cleanText.includes('quiero comprar') ||
      cleanText.includes('confirmo compra') ||
      cleanText.includes('confirmar compra') ||
      cleanText.includes('ya pague') ||
      cleanText.includes('ya pago') ||
      cleanText.includes('hice el pago') ||
      cleanText.includes('comprobante') ||
      cleanText.includes('ref #') ||
      cleanText.includes('ref:') ||
      cleanText.includes('me llevo') ||
      cleanText.includes('la quiero') ||
      cleanText.includes('voy a llevar');

    // ── Score every product against query ────────────────────────────────────
    const queryCategory = detectQueryCategory(rawPrompt);
    let bestMatch = explicitProduct || null;
    let highestScore = explicitProduct ? 99 : 0;
    let secondMatch = null;
    let secondScore = 0;

    if (!explicitProduct) {
      for (const item of coils) {
        const score = scoreProduct(item, tokens, queryCategory);
        if (score > highestScore) {
          secondMatch = bestMatch;
          secondScore = highestScore;
          highestScore = score;
          bestMatch = item;
        } else if (score > secondScore) {
          secondMatch = item;
          secondScore = score;
        }
      }
    }

    // Minimum score threshold to count as a real match (avoids random matches)
    const MIN_SCORE = 6;
    const targetProduct =
      (bestMatch && highestScore >= MIN_SCORE) ? bestMatch : lastInteractedProduct;

    // ── Exchange rate intent ────────────────────────────────────────────────
    const isRateQuery =
      cleanText.includes('tasa') ||
      cleanText.includes('dolar') ||
      cleanText.includes('bolivar') ||
      cleanText.includes('bolivares') ||
      cleanText.includes('a como') ||
      cleanText.includes('precio en bs');

    if (isRateQuery && !explicitProduct && (!bestMatch || highestScore < 3)) {
      const cached = getCachedExchangeRates() || { binance: 1067.45, bcv: 899.27, lastUpdated: 'En vivo' };
      logConsoleQuery(`RATE QUERY: BINANCE=${cached.binance} BCV=${cached.bcv}`, 1, latency);
      return {
        product: targetProduct,
        hasAction: false,
        badge: 'Monitor de Tasas en Vivo',
        html: `📊 <strong>Tasas de Cambio Activas Hoy:</strong><br><br>
• 🟡 <strong>Binance P2P:</strong> ${formatVES(cached.binance)} / USDT<br>
• 🏛️ <strong>Dólar Oficial BCV:</strong> ${formatVES(cached.bcv)} / USD<br><br>
Aceptamos <strong>Pago Móvil, Binance Pay, Zelle y Efectivo</strong>. Si me indicas qué repuesto o carro tienes, ¡te calculo el precio exacto en Bolívares al instante!`
      };
    }

    // ── 1. Transactional purchase closing ────────────────────────────────────
    if (isPurchaseConfirmation && targetProduct) {
      if (targetProduct.stock <= 0) {
        logConsoleQuery(`ABORT TX: STOCK=0 [${targetProduct.id}]`, 0, latency);
        return {
          product: targetProduct,
          hasAction: true,
          badge: `[TX ABORTADA] Stock agotado (0 uds)`,
          html: `⚠️ Intenté procesar tu compra de <strong>${targetProduct.name}</strong>, pero figura con <strong>Stock: 0 unidades</strong>.<br><br>¿Deseas encargarla bajo pedido para reservarla en el próximo lote?`
        };
      }

      const qtyMatch = rawPrompt.match(/\b([1-9])\s*(bobina|bobinas|unidades|uds|de)?\b/);
      const requestedQty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      let detectedMethod = 'Pago Móvil / Transferencia';
      if (cleanText.includes('zelle')) detectedMethod = 'Zelle USD';
      else if (cleanText.includes('binance') || cleanText.includes('usdt')) detectedMethod = 'Binance Pay (USDT)';
      else if (cleanText.includes('efectivo')) detectedMethod = 'Efectivo USD';
      else if (cleanText.includes('pago movil') || cleanText.includes('pago mobil')) detectedMethod = 'Pago Móvil Interbancario';

      const refMatch = rawPrompt.match(/#?([0-9]{4,10})/);
      const detectedRef = refMatch ? `REF-${refMatch[1]}` : `WA-${Math.floor(100000 + Math.random() * 900000)}`;

      const order = processSaleTransaction({
        coilId: targetProduct.id,
        qty: requestedQty,
        customerName: 'Cliente WhatsApp Directo',
        customerPhone: '+58 412-ClienteWA',
        paymentRef: `${detectedMethod} (${detectedRef})`,
        userId: deviceId
      });

      if (!order) {
        return {
          product: targetProduct,
          hasAction: true,
          badge: `[TX ABORTADA] Stock insuficiente`,
          html: `⚠️ No se pudo procesar la compra: la cantidad solicitada supera el stock disponible en almacén (${targetProduct.stock} uds).`
        };
      }

      logConsoleQuery(`TX COMMIT: ORDER #${order.orderId} [${targetProduct.id}] -${requestedQty} UDS`, 1, latency);
      return {
        product: null,
        hasAction: false,
        badge: `[TX COMMIT ${getEngineLabel(dbEngine)}] Orden #${order.orderId} | Stock: ${order.stockBefore} → ${order.stockAfter}`,
        html: `🎉 <strong>¡VENTA REGISTRADA Y CONFIRMADA! (#${order.orderId})</strong><br><br>
He procesado tu reporte de pago y confirmado tu orden:<br>
• <strong>Repuesto:</strong> ${order.qty}x ${order.coilName}<br>
• <strong>Código OEM:</strong> <code>${order.oem}</code><br>
• <strong>Total Cancelado:</strong> <span class="text-emerald-400 font-extrabold">${formatUSD(order.totalPrice)} USD</span><br>
• <strong>Método / Ref:</strong> ${order.paymentRef}<br>
${isAdmin
  ? `• <strong>Nuevo Stock en Base de Datos:</strong> De ${order.stockBefore} ➔ <strong>${order.stockAfter} uds</strong><br><br>`
  : `• <strong>Estado del Pedido:</strong> <span class="text-emerald-400 font-bold">Aprobado y en preparación para despacho</span><br><br>`}
📲 <em>Se ha enviado la confirmación al WhatsApp oficial (${ownerSettings.ownerPhone}) para autorizar la entrega inmediata.</em>`
      };
    }

    // ── 2. Full catalog / listing request ────────────────────────────────────
    const isCatalogRequest =
      cleanText.includes('inventario') ||
      cleanText.includes('catalogo') ||
      cleanText.includes('todas') ||
      cleanText.includes('todo') ||
      cleanText.includes('que tienen') ||
      cleanText.includes('que bobinas') ||
      cleanText.includes('lista') ||
      (cleanText.includes('tienen') && tokens.length <= 2);

    if (isCatalogRequest) {
      const inStockList = coils.filter(b => b.stock > 0);
      logConsoleQuery('SELECT * FROM bobinas_inventario WHERE stock > 0', inStockList.length, latency);
      const summaryLines = inStockList.slice(0, 8).map(b =>
        `• <strong>${b.name}</strong> — ${b.brand} | ${formatUSD(b.price)} | Stock: <span class="text-emerald-400">${b.stock} uds</span>`
      ).join('<br>');
      const extra = inStockList.length > 8 ? `<br><em>...y ${inStockList.length - 8} referencias más. Dime tu modelo de auto para afinar la búsqueda.</em>` : '';
      return {
        product: null,
        hasAction: false,
        badge: `DB: ${inStockList.length} en stock de ${coils.length} totales`,
        html: `Actualmente disponemos de <strong>${inStockList.length} referencias con stock inmediato</strong>:<br><br>${summaryLines}${extra}<br><br>Indícame tu modelo de vehículo o código OEM para darte todos los detalles y coordinar tu pedido.`
      };
    }

    // ── 3. Product match found ────────────────────────────────────────────────
    if (bestMatch && highestScore >= MIN_SCORE) {
      setLastInteractedProduct(bestMatch);
      logConsoleQuery(
        `SELECT * FROM bobinas_inventario WHERE haystack LIKE '%${tokens.slice(0, 3).join(' ')}%' — score:${highestScore}`,
        1,
        latency
      );

      // If there's a strong second match, mention it too
      const altHint = (secondMatch && secondScore >= MIN_SCORE && secondMatch.id !== bestMatch.id)
        ? `<br>💡 <em>También tenemos disponible la <strong>${secondMatch.name}</strong> (${formatUSD(secondMatch.price)} USD) — escríbeme si deseas verla.</em>`
        : '';

      if (bestMatch.stock > 0) {
        return {
          product: bestMatch,
          hasAction: true,
          badge: `[${getEngineLabel(dbEngine)}] ID: ${bestMatch.id} | Stock: ${bestMatch.stock} uds`,
          html: `✅ ¡Sí, tenemos disponibilidad inmediata en almacén de la <strong>${bestMatch.name}</strong>!<br><br>
• <strong>Aplicación:</strong> ${bestMatch.carModel}<br>
• <strong>Motor:</strong> ${bestMatch.engine}<br>
• <strong>Precio:</strong> <span class="text-brand-400 font-bold">${formatUSD(bestMatch.price)} USD</span><br>
• <strong>Stock en vivo:</strong> <span class="text-emerald-400 font-bold">${bestMatch.stock} unidades listas para despacho</span><br>
• <strong>Código OEM:</strong> <code>${bestMatch.oem}</code><br>
• <strong>Conector / Garantía:</strong> ${bestMatch.connector} (${bestMatch.warranty})<br><br>
💡 <em>Para comprarla ahora mismo y descontarla del stock, haz clic en <strong>"Cerrar Venta en WA"</strong> abajo o responde: <code>"Quiero comprar 1 ref #12345"</code>.</em>${altHint}`
        };
      } else {
        return {
          product: bestMatch,
          hasAction: true,
          badge: `[${getEngineLabel(dbEngine)}] ID: ${bestMatch.id} | STOCK: 0 (AGOTADO)`,
          html: `⚠️ He consultado la base de datos para la <strong>${bestMatch.name}</strong> (OEM: <code>${bestMatch.oem}</code>).<br><br>
En este momento figura con <strong>Stock: 0 unidades (Agotada temporalmente)</strong>.<br>
• <strong>Precio de lista:</strong> ${formatUSD(bestMatch.price)} USD<br><br>
Pulsa el botón de abajo si deseas encargarla bajo pedido para reservártela en el próximo lote.${altHint}`
        };
      }
    }

    // ── 4. Greeting ───────────────────────────────────────────────────────────
    const isGreeting =
      cleanText.includes('hola') ||
      cleanText.includes('buenas') ||
      cleanText.includes('buenos') ||
      cleanText.includes('saludos') ||
      cleanText.includes('buen dia') ||
      cleanText.includes('que tal') ||
      cleanText.includes('como estan') ||
      rawPrompt.trim().length < 8;

    if (isGreeting) {
      logConsoleQuery('PING_SESSION', coils.length, 12);
      return {
        product: null,
        hasAction: false,
        badge: `Conectado a ${getEngineLabel(dbEngine)} (${coils.length} referencias)`,
        html: `¡Hola! 👋 Con gusto te asesoro. Indícame la <strong>marca, modelo de auto, año o código OEM</strong> de la bobina que necesitas y reviso nuestro stock al instante.`
      };
    }

    // ── 5. Not found — suggest closest possible ───────────────────────────────
    // Even if below MIN_SCORE, show the best guess if score > 0
    const searchKeyword = tokens.join(' ') || rawPrompt.trim();
    logConsoleQuery(`SEARCH MISS: '%${searchKeyword}%' (best_score:${highestScore})`, 0, latency);

    const guessHint = (bestMatch && highestScore > 0)
      ? `<br><br>💡 Lo más parecido que tenemos es <strong>${bestMatch.name}</strong> (${formatUSD(bestMatch.price)} USD, stock: ${bestMatch.stock} uds). ¿Es lo que buscas?`
      : '';

    return {
      product: bestMatch && highestScore > 0 ? bestMatch : null,
      hasAction: bestMatch && highestScore > 0,
      badge: `[${getEngineLabel(dbEngine)}] 0 coincidencias para "${searchKeyword}"`,
      html: isAdmin
        ? `Consulté la base de datos para <em>"${rawPrompt}"</em> y no encontré un registro exacto (score: ${highestScore}).<br><br>💡 <em>Tip Admin: Puedes agregarla desde el panel de <strong>"Base de Datos &amp; Stock"</strong> o importarla por CSV.</em>${guessHint}`
        : `No encontramos una coincidencia exacta en catálogo para <em>"${rawPrompt}"</em>.<br><br>Por favor verifica el año, modelo o código OEM, o escríbenos por WhatsApp directamente para que un especialista te atienda.${guessHint}`
    };
  }, [coils, dbEngine, deviceId, isAdmin, lastInteractedProduct, logConsoleQuery, ownerSettings.ownerPhone, processSaleTransaction]);

  return {
    generateResponse,
    consoleLogs,
    clearLogs: () => setConsoleLogs([])
  };
}
