import { getCachedExchangeRates, formatVES } from '../services/exchangeRatesService';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_BOBINAS_SEED } from '../data/seedData';
import { normalizeCoilRecord } from '../utils/formatters';
import { OFFICIAL_WA_RAW } from '../utils/whatsapp';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useToast } from './ToastContext';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';

const InventoryContext = createContext(null);

const STORAGE_KEY_INVENTORY = 'BOBINAS_EXPRESS_STORE_V5';
const STORAGE_KEY_ENGINE = 'BOBINAS_EXPRESS_ENGINE_V5';
const STORAGE_KEY_SALES_LOG = 'BOBINAS_EXPRESS_SALES_V5';
const STORAGE_KEY_OWNER_PREFS = 'BOBINAS_EXPRESS_PREFS_V5';
const STORAGE_KEY_CREDENTIALS = 'BOBINAS_EXPRESS_CREDS_V5';
const SYNC_CHANNEL_NAME = 'bobinas_express_sync_v5';

const broadcastSync = (items) => {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage({ type: 'SYNC_INVENTORY', coils: items });
      channel.close();
    } catch (e) {}
  }
};

const pushToApi = (items, currentEngine = null, currentCreds = null) => {
  try {
    const payload = { coils: Array.isArray(items) ? items : [] };
    if (currentEngine) payload.dbEngine = currentEngine;
    if (currentCreds) payload.dbCredentials = currentCreds;

    fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Genera los encabezados compatibles tanto con las claves tradicionales JWT (eyJ...)
 * como con las nuevas claves públicas de Supabase (sb_publishable_...).
 * Evita el error 401 que ocurre cuando se envía una clave sb_publishable_ en el header Authorization: Bearer.
 */
export const getSupabaseHeaders = (key, extraHeaders = {}) => {
  const cleanKey = String(key || '').trim();
  const headers = {
    'apikey': cleanKey,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  // Solo las claves legacy JWT ('eyJ...') se envían como Bearer token
  if (cleanKey.startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }
  return headers;
};

/**
 * Retorna la configuración activa de Supabase garantizando que NUNCA quede vacía.
 * Si las credenciales del usuario están vacías, son de prueba o están corruptas,
 * recurre de inmediato a los valores oficiales de SUPABASE_CONFIG.
 */
export const getActiveSupabaseConfig = (customCreds = null, allCreds = null) => {
  const supa = customCreds || allCreds?.supabase || {};
  
  const rawUrl = (supa.url && !supa.url.includes('...') && !supa.url.includes('vznqrxvblgghjswdmsaa'))
    ? supa.url
    : SUPABASE_CONFIG.url;

  const rawKey = (supa.anonKey && !supa.anonKey.includes('...'))
    ? supa.anonKey
    : SUPABASE_CONFIG.anonKey;

  const table = (supa.table && !supa.table.includes('...'))
    ? supa.table
    : (SUPABASE_CONFIG.table || 'bobinas_inventario');

  let cleanUrl = String(rawUrl || '').trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  let baseUrl = cleanUrl;
  try {
    baseUrl = new URL(cleanUrl).origin;
  } catch (e) {
    baseUrl = cleanUrl.replace(/\/+$/, '').replace(/\/rest\/v1.*$/, '');
  }

  return {
    rawUrl,
    baseUrl,
    restUrl: `${baseUrl}/rest/v1`,
    anonKey: String(rawKey || '').trim(),
    table: String(table || 'bobinas_inventario').trim()
  };
};

/**
 * Codifica metadatos extendidos de una orden (items multi-artículo, tasas históricas, garantías)
 * dentro del campo TEXT 'referencia_pago' para persistencia garantizada en Supabase sin alterar schema.
 */
export const encodeOrderPaymentRef = (rawRef = '', order = {}) => {
  const cleanRef = String(rawRef || '')
    .replace(/\s*\|\s*\[JF_META_START\][\s\S]*?\[JF_META_END\]/gs, '')
    .replace(/\[JF_META_START\][\s\S]*?\[JF_META_END\]/gs, '')
    .replace(/\s*\|\s*\[JF_ORDER_META:\s*[\s\S]*?\]/gs, '')
    .replace(/\s*\|\s*\[JF_ORDER_ITEMS:\s*[\s\S]*?\]/gs, '')
    .trim();

  const meta = {
    items: Array.isArray(order.items) && order.items.length > 0 ? order.items : null,
    status: order.status || null,
    rateBinance: order.exchangeRateBinance ?? null,
    rateBCV: order.exchangeRateBCV ?? null,
    totalVES: order.totalVES ?? null,
    rateDate: order.rateSnapshotDate ?? null,
    warrantyEvents: Array.isArray(order.warrantyEvents) ? order.warrantyEvents : [],
    customerCar: order.customerCar ?? '',
    notes: order.notes ?? ''
  };

  if (meta.items || meta.status || meta.rateBinance || (meta.warrantyEvents && meta.warrantyEvents.length > 0) || meta.notes) {
    try {
      const metaString = JSON.stringify(meta);
      return cleanRef ? `${cleanRef} | [JF_META_START]${metaString}[JF_META_END]` : `[JF_META_START]${metaString}[JF_META_END]`;
    } catch (e) {
      console.warn('Error serializing order meta:', e);
    }
  }

  return cleanRef;
};

/**
 * Decodifica metadatos extendidos del campo 'referencia_pago' de Supabase
 */
export const decodeOrderPaymentRef = (rawRef = '') => {
  const str = String(rawRef || '');
  const match = str.match(/\[JF_META_START\]([\s\S]*?)\[JF_META_END\]/)
    || str.match(/\[JF_ORDER_META:\s*({[\s\S]*?})\](?:\s*$|\s*\|)/)
    || str.match(/\[JF_ORDER_ITEMS:\s*({[\s\S]*?})\](?:\s*$|\s*\|)/);

  let cleanRef = str
    .replace(/\s*\|\s*\[JF_META_START\][\s\S]*?\[JF_META_END\]/gs, '')
    .replace(/\[JF_META_START\][\s\S]*?\[JF_META_END\]/gs, '')
    .replace(/\s*\|\s*\[JF_ORDER_META:\s*[\s\S]*?\]/gs, '')
    .replace(/\s*\|\s*\[JF_ORDER_ITEMS:\s*[\s\S]*?\]/gs, '')
    .trim();

  let meta = null;
  if (match && match[1]) {
    try {
      meta = JSON.parse(match[1]);
    } catch (e) {
      console.warn('Error parsing order meta from paymentRef:', e);
    }
  }

  return { cleanRef, meta };
};


const DEFAULT_CREDENTIALS = {
  supabase: {
    url: SUPABASE_CONFIG.url,
    anonKey: SUPABASE_CONFIG.anonKey,
    table: SUPABASE_CONFIG.table || 'bobinas_inventario'
  },
  mongodb: {
    uri: 'https://data.mongodb-api.com/app/data-express/endpoint/data/v1',
    apiKey: 'mongo_sec_token_88921...',
    database: 'bobinas_express_db',
    collection: 'bobinas'
  },
  mysql: {
    apiUrl: 'https://api.bobinasexpress.com/v1/inventory',
    bearerToken: 'bearer_token_sql_live_4492',
    table: 'bobinas'
  }
};

export function InventoryProvider({ children }) {
  const { showToast } = useToast();
  const { playCashRegisterSound } = useSoundEffects();

  // 1. Estado de bobinas: Solo muestra lo que esté cargado en la base de datos conectada.
  // No inyecta productos de prueba de forma persistente.
  const [coils, setCoils] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeCoilRecord);
        }
      }
    } catch (e) {}
    return DEFAULT_BOBINAS_SEED.map(normalizeCoilRecord);
  });

  const [isDbLoading, setIsDbLoading] = useState(true);

  // Motor activo: Siempre Supabase por defecto. Eliminado LocalStorage como base de datos.
  const [dbEngine, setDbEngine] = useState(() => {
    // Si había 'local' guardado en LocalStorage, forzar 'supabase'
    try {
      const savedEngine = localStorage.getItem(STORAGE_KEY_ENGINE);
      if (!savedEngine || savedEngine === 'local') {
        localStorage.setItem(STORAGE_KEY_ENGINE, 'supabase');
        return 'supabase';
      }
      return savedEngine;
    } catch (e) {}
    return 'supabase';
  });

  const [salesHistory, setSalesHistory] = useState(() => {
    try {
      // 0. Asegurar que las órdenes eliminadas, de prueba o semillas huérfanas (ORD-9480, ORD-8901) no persistan
      let deletedIdsSet = new Set(['ORD-9480', '9480', 'ORD-8901', '8901']);
      try {
        const deletedArr = JSON.parse(localStorage.getItem('JF_DELETED_SALES_IDS') || '[]');
        if (Array.isArray(deletedArr)) {
          deletedArr.forEach(id => {
            const clean = String(id).replace(/^#/, '').trim();
            if (clean) {
              deletedIdsSet.add(clean);
              deletedIdsSet.add(clean.replace(/^ORD-/, ''));
            }
          });
        }
      } catch (e) {}
      try {
        localStorage.setItem('JF_DELETED_SALES_IDS', JSON.stringify([...deletedIdsSet]));
      } catch (e) {}

      const saved = localStorage.getItem(STORAGE_KEY_SALES_LOG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleanHistory = parsed.filter(s => {
            const sid = String(s.orderId || s.order_id || s.id || '').replace(/^#/, '').trim();
            const bareId = sid.replace(/^ORD-/, '');
            return sid && !deletedIdsSet.has(sid) && !deletedIdsSet.has(bareId) && !deletedIdsSet.has(`ORD-${bareId}`);
          });
          try {
            localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(cleanHistory));
          } catch (e) {}
          return cleanHistory;
        }
      }
    } catch (e) {}
    return [];
  });

  const [ownerSettings, setOwnerSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OWNER_PREFS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          requireApproval: true
        };
      }
    } catch (e) {}
    return {
      ownerPhone: OFFICIAL_WA_RAW,
      ownerName: 'Administrador Principal',
      autoDeductStock: true,
      soundAlert: true,
      requireApproval: true,
      systemPrompt: `Eres el Asesor y Agente Oficial de IA de "JF Auto Parts" para WhatsApp (0412-6497478).
Tu misión es asistir a mecánicos y dueños de vehículos a encontrar el repuesto exacto para su auto consultando la base de datos activa en tiempo real.

Directrices de conversación:
1. Responde de forma cálida, experta en mecánica automotriz, concisa y profesional.
2. Verifica siempre la disponibilidad y columna 'stock' del registro. Si stock > 0, confirma stock y precio. Si stock === 0, informa que está temporalmente agotado y ofrece encargarla bajo pedido.
3. Cuando el cliente confirme una compra o envíe su referencia de pago, emite la orden y notifica al dueño al 0412-6497478.`
    };
  });

  const [pendingOwnerAlert, setPendingOwnerAlert] = useState(null);

  const [dbCredentials, setDbCredentials] = useState(() => {
    try {
      // Purgar claves antiguas que puedan tener credenciales vacías o corruptas
      try {
        localStorage.removeItem('BOBINAS_EXPRESS_CREDS_V4');
        localStorage.removeItem('BOBINAS_EXPRESS_STORE_V4');
        localStorage.removeItem('BOBINAS_EXPRESS_ENGINE_V4');
      } catch (e) {}

      const saved = localStorage.getItem(STORAGE_KEY_CREDENTIALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const supa = parsed?.supabase || {};
        const isSupaValid = Boolean(
          supa.url &&
          !supa.url.includes('...') &&
          !supa.url.includes('vznqrxvblgghjswdmsaa') &&
          supa.anonKey &&
          !supa.anonKey.includes('...')
        );

        return {
          ...DEFAULT_CREDENTIALS,
          ...parsed,
          supabase: isSupaValid ? supa : DEFAULT_CREDENTIALS.supabase
        };
      }
    } catch (e) {}
    return DEFAULT_CREDENTIALS;
  });

  const [apiConnectionStatus, setApiConnectionStatus] = useState({
    status: 'idle', // 'idle' | 'checking' | 'connected' | 'error' | 'missing_table'
    latency: null,
    lastChecked: null,
    message: '',
    itemCount: 0
  });

  // Guardar credenciales en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CREDENTIALS, JSON.stringify(dbCredentials));
    } catch (e) {}
  }, [dbCredentials]);

  // Guardar coils en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(coils));
    } catch (e) {}
  }, [coils]);

  // Guardar ventas en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(salesHistory));
    } catch (e) {}
  }, [salesHistory]);

  // Guardar motor en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENGINE, dbEngine);
    } catch (e) {}
  }, [dbEngine]);

  // Guardar configuración del dueño en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OWNER_PREFS, JSON.stringify(ownerSettings));
    } catch (e) {}
  }, [ownerSettings]);

  /**
   * Chequea la base de datos conectada, crea la tabla si no existe,
   * y verifica los elementos para sincronizar el catálogo con todos los usuarios.
   */
  const checkAndSyncDatabase = useCallback(async (engine = dbEngine, customCreds = null, showNotification = false) => {
    setIsDbLoading(true);
    setApiConnectionStatus({
      status: 'checking',
      latency: null,
      lastChecked: new Date(),
      message: `Sincronizando inventario con la base de datos...`,
      itemCount: 0
    });

    const startTime = performance.now();
    let targetEngine = (engine === 'local' || !engine) ? 'supabase' : engine;
    let creds = customCreds || dbCredentials[targetEngine] || {};

    try {
      let rawElements = [];
      let tableCreated = false;

      // 0. Sincronizar estado global desde el servidor
      try {
        const serverCheck = await fetch('/api/inventory', { cache: 'no-store' });
        if (serverCheck.ok) {
          const contentType = serverCheck.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const serverData = await serverCheck.json();
            if (serverData) {
              if (serverData.dbEngine && serverData.dbEngine !== 'local' && !customCreds) {
                targetEngine = serverData.dbEngine;
                if (targetEngine !== dbEngine) setDbEngine(targetEngine);
              }
              if (serverData.dbCredentials && !customCreds) {
                creds = serverData.dbCredentials[targetEngine] || creds;
                setDbCredentials(prev => ({ ...prev, ...serverData.dbCredentials }));
              }
            }
          }
        }
      } catch (e) {}

      // 1. Si el motor activo es Supabase
      if (targetEngine === 'supabase') {
        const { baseUrl, anonKey, table } = getActiveSupabaseConfig(customCreds, dbCredentials);

        if (!baseUrl || !anonKey) {
          throw new Error('No fue posible conectar con Supabase: URL o Anon Key no configurados.');
        }

        const endpoint = `${baseUrl}/rest/v1/${table}?select=*`;

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: getSupabaseHeaders(anonKey, { 'Prefer': 'count=exact' })
        });

        if (response.ok) {
          const rows = await response.json();
          rawElements = Array.isArray(rows) ? rows : [];
        } else {
          const errText = await response.text();
          let parsedError = errText;
          try {
            const errObj = JSON.parse(errText);
            parsedError = errObj.message || errObj.hint || errObj.details || errText;
          } catch (e) {}

          if (response.status === 404 || parsedError.includes('relation') || parsedError.includes('does not exist')) {
            throw new Error(`La tabla '${table}' no fue encontrada en Supabase. Verifica el nombre o URL.`);
          } else if (response.status === 401 || response.status === 403) {
            throw new Error(`Acceso no autorizado en Supabase (Error ${response.status}). Revisa tu Anon Key o permisos de RLS.`);
          } else {
            throw new Error(`Error Supabase HTTP ${response.status}: ${parsedError.slice(0, 140)}`);
          }
        }
      } else if (targetEngine === 'mongodb') {
        const uri = String(creds.uri || '').replace(/\/+$/, '');
        const apiKey = creds.apiKey || '';
        const database = creds.database || 'bobinas_express_db';
        const collection = creds.collection || 'bobinas';

        if (!uri || !apiKey || apiKey.includes('...')) {
          throw new Error('Faltan credenciales válidas de MongoDB.');
        }

        const res = await fetch(`${uri}/action/find`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
          },
          body: JSON.stringify({
            dataSource: 'Cluster0',
            database,
            collection,
            filter: {}
          })
        });
        if (res.ok) {
          const data = await res.json();
          rawElements = data.documents || [];
        } else {
          throw new Error(`Error al consultar MongoDB (${res.status})`);
        }
      } else if (targetEngine === 'mysql') {
        const apiUrl = String(creds.apiUrl || '').replace(/\/+$/, '');
        if (!apiUrl || apiUrl.includes('bobinasexpress.com')) {
          throw new Error('Faltan credenciales válidas de MySQL / REST API.');
        }
        const headers = { 'Content-Type': 'application/json' };
        if (creds.bearerToken) headers['Authorization'] = `Bearer ${creds.bearerToken}`;
        const res = await fetch(apiUrl, { method: 'GET', headers });
        if (res.ok) {
          const data = await res.json();
          rawElements = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
        } else {
          throw new Error(`Error al consultar MySQL (${res.status})`);
        }
      }

      // --- VERIFICACIÓN Y NORMALIZACIÓN DE LOS ELEMENTOS DE LA BASE DE DATOS ---
      const verifiedElements = (Array.isArray(rawElements) ? rawElements : [])
        .map(item => normalizeCoilRecord(item))
        .filter(item => Boolean(item && (item.id || item.name)));

      const elapsed = Math.round(performance.now() - startTime);

      // Actualizar el estado únicamente con los elementos que existen en la base de datos
      setCoils(verifiedElements);
      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(verifiedElements));
      } catch (e) {}

      broadcastSync(verifiedElements);

      const statusMsg = `Conectado a ${targetEngine.toUpperCase()}: ${verifiedElements.length} artículos en la base de datos (${Math.max(14, elapsed)}ms)`;

      setApiConnectionStatus({
        status: 'connected',
        latency: Math.max(14, elapsed),
        lastChecked: new Date(),
        message: statusMsg,
        itemCount: verifiedElements.length,
        hasZeroItems: verifiedElements.length === 0
      });

      if (showNotification) {
        showToast(`🟢 ${statusMsg}`);
      }

      return { success: true, count: verifiedElements.length, elements: verifiedElements };
    } catch (err) {
      console.warn('Sync error:', err);
      // Si no fue posible conectar con la base de datos, vaciar el catálogo y marcar estado de error
      setCoils([]);
      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify([]));
      } catch (e) {}

      setApiConnectionStatus({
        status: 'error',
        latency: 0,
        lastChecked: new Date(),
        message: err.message,
        itemCount: 0
      });

      if (showNotification) {
        showToast(`⚠️ No fue posible conectar con la base de datos: ${err.message}`, 'error');
      }

      return { success: false, error: err.message };
    } finally {
      setIsDbLoading(false);
    }
  }, [dbEngine, dbCredentials, showToast]);

  // Sincronización en tiempo real entre pestañas (BroadcastChannel)
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_INVENTORY' && Array.isArray(event.data.coils)) {
          setCoils(event.data.coils.map(normalizeCoilRecord));
        }
      };
      return () => channel.close();
    }
  }, []);

  // Sincronización fallback entre ventanas (storage event)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_INVENTORY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setCoils(parsed.map(normalizeCoilRecord));
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Cambiar motor de base de datos y sincronizar de inmediato
  const changeDbEngine = useCallback((engine) => {
    setDbEngine(engine);
    showToast(`Conectando con ${engine.toUpperCase()} y sincronizando inventario...`);
    pushToApi(coils, engine, dbCredentials);
    checkAndSyncDatabase(engine, null, true);
  }, [checkAndSyncDatabase, coils, dbCredentials, showToast]);

  const updateOwnerSettings = useCallback((newSettings) => {
    setOwnerSettings(prev => ({ ...prev, ...newSettings }));
    showToast('Configuración del Agente IA y Webhook guardada');
  }, [showToast]);

  const upsertCoil = useCallback(async (rawCoil, originalId = null) => {
    const coil = normalizeCoilRecord(rawCoil);
    if (!coil || !coil.id) return { success: false, error: 'Artículo inválido' };

    const cleanOriginalId = originalId ? String(originalId).trim() : null;
    const isIdChanged = Boolean(cleanOriginalId && cleanOriginalId.toLowerCase() !== coil.id.toLowerCase());

    // Guardar imagen personalizada localmente para no perderla si la tabla no tiene columna 'image'
    if (typeof localStorage !== 'undefined') {
      try {
        const storedImages = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        if (isIdChanged && storedImages[cleanOriginalId]) {
          storedImages[coil.id] = coil.image || storedImages[cleanOriginalId];
          delete storedImages[cleanOriginalId];
        } else if (coil.image) {
          storedImages[coil.id] = coil.image;
        }
        localStorage.setItem('JF_PRODUCT_CUSTOM_IMAGES', JSON.stringify(storedImages));
      } catch (e) {}
    }

    // Actualizar estado de inventario inmediatamente
    setCoils(prev => {
      let next;
      if (isIdChanged) {
        const origIdx = prev.findIndex(b => b.id.toLowerCase() === cleanOriginalId.toLowerCase());
        if (origIdx >= 0) {
          next = [...prev];
          next[origIdx] = coil;
          // Eliminar cualquier duplicado previo del nuevo ID si existiera
          next = next.filter((b, idx) => idx === origIdx || b.id.toLowerCase() !== coil.id.toLowerCase());
        } else {
          const idx = prev.findIndex(b => b.id.toLowerCase() === coil.id.toLowerCase());
          if (idx >= 0) {
            next = [...prev];
            next[idx] = coil;
          } else {
            next = [coil, ...prev];
          }
        }
      } else {
        const idx = prev.findIndex(b => b.id.toLowerCase() === coil.id.toLowerCase());
        if (idx >= 0) {
          next = [...prev];
          next[idx] = coil;
        } else {
          next = [coil, ...prev];
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(next));
      } catch (e) {}
      broadcastSync(next);
      pushToApi(next);
      return next;
    });

    // Si Supabase está activo, guardar en la base de datos remota
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        try {
          // Si el ID cambió al editar, eliminar el registro con el ID anterior en Supabase para evitar duplicación
          if (isIdChanged) {
            try {
              await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(cleanOriginalId)}`, {
                method: 'DELETE',
                headers: getSupabaseHeaders(anonKey)
              });
            } catch (delErr) {
              console.warn('Aviso al eliminar ID previo en Supabase:', delErr);
            }
          }

          // Columnas exactas de la tabla bobinas_inventario en Supabase (camelCase):
          const supabasePayload = {
            id: String(coil.id).trim(),
            name: String(coil.name || '').trim(),
            brand: String(coil.brand || '').trim(),
            carModel: String(coil.carModel || '').trim(),
            engine: String(coil.engine || '').trim(),
            oem: String(coil.oem || '').trim(),
            type: String(coil.type || '').trim(),
            connector: String(coil.connector || '').trim(),
            price: Number(coil.price) || 0,
            oldPrice: Number(coil.oldPrice) || 0,
            stock: parseInt(coil.stock, 10) || 0,
            warranty: String(coil.warranty || '12 meses').trim(),
            badge: String(coil.badge || 'OEM Spec').trim(),
            image: String(coil.image || '').trim()
          };

          let res = await fetch(`${baseUrl}/rest/v1/${table}?on_conflict=id`, {
            method: 'POST',
            headers: getSupabaseHeaders(anonKey, { 
              'Prefer': 'resolution=merge-duplicates,return=representation' 
            }),
            body: JSON.stringify(supabasePayload)
          });

          // Si falla porque la columna 'image' aún no ha sido agregada en Supabase (PGRST204)
          if (!res.ok) {
            const errBody = await res.text();
            if (errBody.includes("'image' column") || errBody.includes('image')) {
              console.warn("Columna 'image' no encontrada en Supabase. Guardando resto de campos y alertando...");
              const fallbackPayload = { ...supabasePayload };
              delete fallbackPayload.image;

              res = await fetch(`${baseUrl}/rest/v1/${table}?on_conflict=id`, {
                method: 'POST',
                headers: getSupabaseHeaders(anonKey, { 
                  'Prefer': 'resolution=merge-duplicates,return=representation' 
                }),
                body: JSON.stringify(fallbackPayload)
              });

              if (res.ok) {
                showToast(`⚠️ Repuesto guardado. Para que la foto sea visible para todos, agrega la columna 'image' en Supabase.`);
                setTimeout(() => {
                  checkAndSyncDatabase(dbEngine, null, false);
                }, 300);
                return { success: true };
              }
            }

            console.error('Error insertando en Supabase:', res.status, errBody);
            showToast(`⚠️ No se pudo guardar en Supabase (${res.status}): ${errBody.slice(0, 90)}`, 'error');
            return { success: false, error: errBody };
          }

          if (isIdChanged) {
            showToast(`🟢 Repuesto actualizado: ID cambiado de ${cleanOriginalId} a ${coil.id}`);
          } else {
            showToast(`🟢 Repuesto ${coil.id} guardado con éxito en Supabase`);
          }
          
          // Re-sincronizar el catálogo con la base de datos
          setTimeout(() => {
            checkAndSyncDatabase(dbEngine, null, false);
          }, 300);
          return { success: true };
        } catch (err) {
          console.error('Error de red al guardar en Supabase:', err);
          showToast(`⚠️ Error de red con Supabase: ${err.message}`, 'error');
          return { success: false, error: err.message };
        }
      }
    }

    showToast(`Repuesto ${coil.id} guardado localmente`);
    return { success: true };
  }, [dbEngine, dbCredentials, showToast, checkAndSyncDatabase]);

  const deleteCoil = useCallback(async (id) => {
    const target = String(id || '').trim();
    
    // Quitar de imagen local
    if (typeof localStorage !== 'undefined') {
      try {
        const storedImages = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        if (storedImages[target]) {
          delete storedImages[target];
          localStorage.setItem('JF_PRODUCT_CUSTOM_IMAGES', JSON.stringify(storedImages));
        }
      } catch (e) {}
    }

    setCoils(prev => {
      const next = prev.filter(b => String(b.id || '').trim().toLowerCase() !== target.toLowerCase());
      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(next));
      } catch (e) {}
      broadcastSync(next);
      pushToApi(next);
      return next;
    });

    // Si Supabase está activo, borrar de la tabla remota
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        try {
          const res = await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(target)}`, {
            method: 'DELETE',
            headers: getSupabaseHeaders(anonKey)
          });
          if (res.ok) {
            showToast(`🗑️ Repuesto ${target} eliminado de Supabase`);
            checkAndSyncDatabase(dbEngine, null, false);
          }
        } catch (err) {
          console.error('Error eliminando de Supabase:', err);
        }
      }
    } else {
      showToast(`Repuesto ${target} eliminado`);
    }
  }, [dbEngine, dbCredentials, showToast, checkAndSyncDatabase]);

  const clearInventory = useCallback(async () => {
    setCoils([]);
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify([]));
    } catch (e) {}
    broadcastSync([]);
    pushToApi([], dbEngine, dbCredentials);

    // Enviar DELETE a la API de Vercel
    fetch('/api/inventory', { method: 'DELETE' }).catch(() => {});

    // Si Supabase está activo, vaciar la tabla remota
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        try {
          await fetch(`${baseUrl}/rest/v1/${table}?id=neq.CLEAR_ALL`, {
            method: 'DELETE',
            headers: getSupabaseHeaders(anonKey)
          });
        } catch (e) {}
      }
    }

    showToast('Base de datos vaciada por completo (0 bobinas)');
  }, [dbEngine, dbCredentials, showToast]);

  const restoreSeedData = useCallback(() => {
    const fresh = DEFAULT_BOBINAS_SEED.map(normalizeCoilRecord);
    setCoils(fresh);
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(fresh));
    } catch (e) {}
    broadcastSync(fresh);
    pushToApi(fresh);
    showToast(`Inventario restaurado a los ${fresh.length} productos originales`);
  }, [showToast]);

  const bulkImport = useCallback((records, replaceAll = false) => {
    const normalized = records.map(normalizeCoilRecord);
    setCoils(prev => {
      let next;
      if (replaceAll) {
        next = normalized;
      } else {
        const map = new Map();
        prev.forEach(item => map.set(item.id.toLowerCase(), item));
        normalized.forEach(item => map.set(item.id.toLowerCase(), item));
        next = Array.from(map.values());
      }
      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(next));
      } catch (e) {}
      broadcastSync(next);
      pushToApi(next);
      return next;
    });
    showToast(`¡Carga masiva completada! ${normalized.length} productos procesados.`);
  }, [showToast]);

  /**
   * Guarda o actualiza una orden de venta directamente en la tabla 'ventas' de Supabase en tiempo real.
   * Preserva permanentemente los repuestos múltiples (items), tasas históricas y notas extendidas
   * serializadas en el campo TEXT 'referencia_pago' con tags delimitados indestructibles [JF_META_START]...[JF_META_END].
   */
  const saveSaleToSupabase = useCallback(async (order, matchedCoil = null) => {
    if (!order || !order.orderId) return { success: false };
    if (dbEngine !== 'supabase') return { success: true };

    const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
    if (!baseUrl || !anonKey) return { success: false };

    const table = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
    const cleanOrderId = String(order.orderId || order.order_id).replace(/^#/, '').trim();

    // 1. Resolver el repuesto para la relación de catálogo y Foreign Key en Supabase
    const firstItem = (order.items && Array.isArray(order.items) && order.items.length > 0) ? order.items[0] : null;
    const targetCoilId = String(firstItem?.coilId || order.coilId || '').toLowerCase();
    const targetOem = String(firstItem?.oem || order.oem || '').toLowerCase();

    const coil = matchedCoil || coils.find(c => 
      (c.id && c.id.toLowerCase() === targetCoilId) || 
      (targetOem && c.oem && c.oem.toLowerCase().includes(targetOem))
    ) || coils[0] || null;

    const hasMultipleItems = order.items && Array.isArray(order.items) && order.items.length > 1;

    const displayProdName = hasMultipleItems
      ? `${order.items.length} repuestos: ${order.items.map(i => `${i.qty || 1}x ${i.name}`).join(', ')}`.slice(0, 500)
      : (order.coilName || (coil ? coil.name : 'Repuesto Automotriz'));

    const displayOem = hasMultipleItems
      ? order.items.map(i => i.oem).filter(Boolean).join(', ').slice(0, 255)
      : (order.oem || (coil ? coil.oem : ''));

    const encodedPaymentRef = encodeOrderPaymentRef(order.paymentRef || order.referencia_pago, order);

    const payload = {
      order_id: cleanOrderId,
      fecha: order.timestamp && order.timestamp.includes('T') ? order.timestamp : (order.fecha || new Date().toISOString()),
      fecha_hora: (order.timestamp && order.timestamp.includes('T')) ? order.timestamp : new Date().toISOString(),
      cliente_nombre: String(order.customerName || order.cliente_nombre || 'Cliente WhatsApp').trim(),
      cliente_telefono: String(order.customerPhone || order.cliente_telefono || '').trim(),
      producto_id: coil ? coil.id : String(firstItem?.coilId || order.coilId || 'CON-SENTRA16').trim(),
      producto_nombre: displayProdName,
      codigo_oem: displayOem,
      marca_producto: coil ? coil.brand : (firstItem?.brand || 'JF'),
      modelo_vehiculo: coil ? coil.carModel : '',
      motor_vehiculo: coil ? coil.engine : '',
      tipo_bobina: coil ? coil.type : '',
      cantidad: parseInt(order.qty || order.cantidad || 1, 10),
      precio_unitario: Number(order.unitPrice || order.precio_unitario || (coil ? coil.price : 0)),
      precio_unitario_usd: Number(order.unitPrice || order.precio_unitario || (coil ? coil.price : 0)),
      total_usd: Number(order.totalPrice ?? order.totalUSD ?? order.total_usd ?? 0),
      stock_anterior: Number(order.stockBefore ?? order.stock_anterior ?? 0),
      stock_antes_venta: Number(order.stockBefore ?? order.stock_anterior ?? 0),
      stock_posterior: Number(order.stockAfter ?? order.stock_posterior ?? 0),
      stock_despues_venta: Number(order.stockAfter ?? order.stock_posterior ?? 0),
      stock_actual_catalogo: coil ? coil.stock : Number(order.stockAfter || 0),
      referencia_pago: encodedPaymentRef,
      estado: String(order.status || order.estado || 'CONFIRMED').toUpperCase(),
      status: String(order.status || order.estado || 'CONFIRMED').toUpperCase(),
      estado_orden: String(order.status || order.estado || 'CONFIRMED').toUpperCase(),
      usuario_id: String(order.userId || order.usuario_id || 'CLI-WEB').trim()
    };

    try {
      // 1. Verificar si la orden ya existe en Supabase
      const checkRes = await fetch(`${baseUrl}/rest/v1/${table}?order_id=eq.${encodeURIComponent(cleanOrderId)}&select=order_id`, {
        headers: getSupabaseHeaders(anonKey)
      });
      const existing = checkRes.ok ? await checkRes.json() : [];

      if (Array.isArray(existing) && existing.length > 0) {
        // Actualizar registro existente
        const patchRes = await fetch(`${baseUrl}/rest/v1/${table}?order_id=eq.${encodeURIComponent(cleanOrderId)}`, {
          method: 'PATCH',
          headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify(payload)
        });
        return { success: patchRes.ok };
      } else {
        // Insertar nuevo registro
        let postRes = await fetch(`${baseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify(payload)
        });

        // En caso de conflicto de FK con producto_id en catálogo Supabase, reintentar con el primer producto existente
        if (!postRes.ok && postRes.status === 409 && coils.length > 0) {
          payload.producto_id = coils[0].id;
          postRes = await fetch(`${baseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
            body: JSON.stringify(payload)
          });
        }

        return { success: postRes.ok };
      }
    } catch (err) {
      console.warn('Error al guardar venta en Supabase:', err);
      return { success: false, error: err.message };
    }
  }, [dbEngine, dbCredentials, coils]);

  /**
   * Cierre transaccional de ventas y pedidos
   * Los pedidos creados por clientes entran por defecto en estado 'PENDING_APPROVAL' (Pendiente)
   * sin descontar stock hasta que el dueño/administrador los confirme.
   */
    const processSaleTransaction = useCallback(({ 
    coilId, 
    qty, 
    items = null,
    totalUSD = null,
    customerName, 
    customerPhone, 
    customerCar,
    paymentRef, 
    userId, 
    status = null,
    exchangeRateBinance = null,
    exchangeRateBCV = null,
    totalVES = null
  }) => {
    let orderResult = null;

    setCoils(currentCoils => {
      // 1. Resolver lista de items (sea orden multi-artículo de carrito o venta manual directa)
      let resolvedItems = [];
      let totalAmountUSD = 0;

      if (items && Array.isArray(items) && items.length > 0) {
        resolvedItems = items.map(it => ({
          coilId: it.coilId || it.id,
          name: it.name || 'Repuesto Automotriz',
          oem: (it.oem || '').split('/')[0].trim(),
          qty: Math.max(1, parseInt(it.qty, 10) || 1),
          unitPrice: Number(it.unitPrice || it.price || 0),
          subtotal: Number(it.subtotal || ((it.unitPrice || it.price || 0) * (it.qty || 1)).toFixed(2)),
          image: it.image || null,
          brand: it.brand || 'JF'
        }));
        totalAmountUSD = totalUSD !== null ? Number(totalUSD) : resolvedItems.reduce((acc, it) => acc + it.subtotal, 0);
      } else {
        const targetId = String(coilId || '').toLowerCase();
        const coil = currentCoils.find(b => b.id.toLowerCase() === targetId);
        if (!coil) return currentCoils;

        const requestedQty = Math.max(1, parseInt(qty, 10) || 1);
        resolvedItems = [{
          coilId: coil.id,
          name: coil.name,
          oem: (coil.oem || '').split('/')[0].trim(),
          qty: requestedQty,
          unitPrice: coil.price,
          subtotal: Number((coil.price * requestedQty).toFixed(2)),
          image: coil.image || null,
          brand: coil.brand || 'JF'
        }];
        totalAmountUSD = Number((coil.price * requestedQty).toFixed(2));
      }

      // Stock de referencia para historial inicial
      const firstItem = resolvedItems[0];
      const coilRef = currentCoils.find(b => b.id.toLowerCase() === String(firstItem?.coilId || '').toLowerCase());
      const stockBefore = coilRef ? coilRef.stock : 0;

      // 2. Snapshot de Tasa Histórica Inalterable (Congelada en el momento exacto)
      const cachedRates = getCachedExchangeRates() || {};
      const rateBinance = exchangeRateBinance || cachedRates.binance || 0;
      const rateBCV = exchangeRateBCV || cachedRates.bcv || 0;
      const calculatedVES = totalVES || (rateBinance > 0 ? formatVES(totalAmountUSD * rateBinance) : null);

      const effectiveStatus = status || 'PENDING_APPROVAL';
      const isConfirmed = effectiveStatus === 'CONFIRMED';
      const stockAfter = isConfirmed ? Math.max(0, stockBefore - (firstItem?.qty || 1)) : stockBefore;

      const newOrder = {
        orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        userId: userId || 'CLI-GUEST',
        customerName: customerName || 'Cliente WhatsApp Directo',
        customerPhone: customerPhone || 'No especificado',
        customerCar: customerCar || '',
        // Modelo unificado multi-artículo
        items: resolvedItems,
        // Compatibilidad hacia atrás con vistas individuales
        coilId: resolvedItems[0]?.coilId || '',
        coilName: resolvedItems.length === 1 ? resolvedItems[0]?.name : `${resolvedItems.length} repuestos: ${resolvedItems.map(i => i.name).join(', ')}`,
        oem: resolvedItems.map(i => i.oem).filter(Boolean).join(', '),
        qty: resolvedItems.reduce((acc, it) => acc + it.qty, 0),
        unitPrice: resolvedItems[0]?.unitPrice || 0,
        totalPrice: Number(totalAmountUSD.toFixed(2)),
        totalUSD: Number(totalAmountUSD.toFixed(2)),
        // Snapshot de Tasa de Cambio Inalterable
        exchangeRateBinance: rateBinance,
        exchangeRateBCV: rateBCV,
        totalVES: calculatedVES,
        rateSnapshotDate: new Date().toISOString(),
        // Historial de garantías
        warrantyEvents: [],
        stockBefore,
        stockAfter,
        paymentRef: paymentRef || 'A coordinar por WhatsApp',
        status: effectiveStatus
      };

      orderResult = newOrder;
      setSalesHistory(prev => {
        const next = [newOrder, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setPendingOwnerAlert(newOrder);

      // Guardar de inmediato en Supabase
      saveSaleToSupabase(newOrder, coilRef);

      if (ownerSettings.soundAlert) {
        playCashRegisterSound();
      }

      if (!isConfirmed) {
        showToast(`🟡 Pedido #${newOrder.orderId} registrado (${resolvedItems.length} ${resolvedItems.length === 1 ? 'repuesto' : 'repuestos'}) - Pendiente`);
        return currentCoils;
      }

      // Si fue confirmada directamente, descontar stock de CADA repuesto
      let updatedCoils = [...currentCoils];
      resolvedItems.forEach(it => {
        updatedCoils = updatedCoils.map(c => {
          if (c.id.toLowerCase() === it.coilId.toLowerCase()) {
            const nextStock = Math.max(0, c.stock - it.qty);
            return { ...c, stock: nextStock, inStock: nextStock > 0 };
          }
          return c;
        });
      });

      broadcastSync(updatedCoils);
      pushToApi(updatedCoils);
      showToast(`🟢 Venta #${newOrder.orderId} registrada: Stock descontado`);
      return updatedCoils;
    });

    return orderResult;
  }, [ownerSettings.requireApproval, ownerSettings.soundAlert, playCashRegisterSound, showToast, saveSaleToSupabase, dbEngine, dbCredentials]);

  /**
   * Confirmar pedido pendiente:
   * Cambia el estado a CONFIRMED y descuenta el stock tanto localmente como en Supabase.
   */
    /**
   * Confirmar pedido pendiente:
   * Cambia el estado a CONFIRMED y descuenta el stock de CADA repuesto incluido en la orden.
   */
  const confirmSale = useCallback(async (orderId, paymentData = null) => {
    const ord = salesHistory.find(s => s.orderId === orderId);
    if (!ord) return;

    if (ord.status === 'CONFIRMED') {
      showToast(`La orden #${orderId} ya está confirmada.`);
      return;
    }

    const orderItems = (ord.items && Array.isArray(ord.items) && ord.items.length > 0)
      ? ord.items
      : [{ coilId: ord.coilId, qty: ord.qty || 1, name: ord.coilName }];

    let updatedCoilList = [];

    setCoils(currentCoils => {
      let nextCoils = [...currentCoils];

      orderItems.forEach(item => {
        const tId = String(item.coilId || '').toLowerCase();
        nextCoils = nextCoils.map(c => {
          if (c.id.toLowerCase() === tId) {
            const newStock = Math.max(0, c.stock - (item.qty || 1));
            return {
              ...c,
              stock: newStock,
              inStock: newStock > 0
            };
          }
          return c;
        });
      });

      updatedCoilList = nextCoils;
      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(nextCoils));
      } catch (e) {}

      broadcastSync(nextCoils);
      pushToApi(nextCoils);
      return nextCoils;
    });

    const updatedOrder = {
      ...ord,
      status: 'CONFIRMED',
      paymentRef: paymentData?.paymentRef ? String(paymentData.paymentRef).trim() : (ord.paymentRef || 'PAGO CONFIRMADO'),
      paymentMethod: paymentData?.paymentMethod || ord.paymentMethod || 'OTRO',
      paymentDetails: paymentData?.paymentDetails || ord.paymentDetails || null
    };

    setSalesHistory(prev => {
      const next = prev.map(s => s.orderId === orderId ? updatedOrder : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Guardar en Supabase orden
    await saveSaleToSupabase(updatedOrder);

    if (ownerSettings.soundAlert) {
      playCashRegisterSound();
    }

    // Descontar cada ítem en Supabase si está activo
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        orderItems.forEach(async (it) => {
          const finalCoil = updatedCoilList.find(c => c.id.toLowerCase() === String(it.coilId).toLowerCase());
          if (finalCoil) {
            try {
              await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(it.coilId)}`, {
                method: 'PATCH',
                headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
                body: JSON.stringify({ stock: finalCoil.stock })
              });
            } catch (err) {
              console.warn('Error al actualizar stock en Supabase:', err);
            }
          }
        });
      }
    }

    showToast(`✅ Pedido #${orderId} confirmado: Stock actualizado para ${orderItems.length} ${orderItems.length === 1 ? 'repuesto' : 'repuestos'}.`);
    return updatedOrder;
  }, [salesHistory, ownerSettings.soundAlert, playCashRegisterSound, dbEngine, dbCredentials, saveSaleToSupabase, showToast]);

  /**
   * Revertir o Cancelar orden:
   * - Si estaba CONFIRMED: regresa el stock de CADA ítem tanto en memoria como en Supabase.
   * - Si estaba PENDING_APPROVAL: simplemente se cancela sin alterar stock.
   */
  const revertSale = useCallback(async (orderId) => {
    const ord = salesHistory.find(s => s.orderId === orderId);
    if (!ord) return;

    if (ord.status === 'REVERTED') {
      showToast(`La orden #${orderId} ya está cancelada o revertida.`);
      return;
    }

    const wasConfirmed = ord.status === 'CONFIRMED';
    const orderItems = (ord.items && Array.isArray(ord.items) && ord.items.length > 0)
      ? ord.items
      : [{ coilId: ord.coilId, qty: ord.qty || 1, name: ord.coilName }];

    let updatedCoilList = [];

    if (wasConfirmed) {
      setCoils(currentCoils => {
        let nextCoils = [...currentCoils];

        orderItems.forEach(item => {
          const tId = String(item.coilId || '').toLowerCase();
          nextCoils = nextCoils.map(c => {
            if (c.id.toLowerCase() === tId) {
              const restoredStock = c.stock + (item.qty || 1);
              return {
                ...c,
                stock: restoredStock,
                inStock: restoredStock > 0
              };
            }
            return c;
          });
        });

        updatedCoilList = nextCoils;
        try {
          localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(nextCoils));
        } catch (e) {}

        broadcastSync(nextCoils);
        pushToApi(nextCoils);
        return nextCoils;
      });

      // Actualizar en Supabase si está activo
      if (dbEngine === 'supabase') {
        const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
        if (baseUrl && anonKey) {
          orderItems.forEach(async (it) => {
            const finalCoil = updatedCoilList.find(c => c.id.toLowerCase() === String(it.coilId).toLowerCase());
            if (finalCoil) {
              try {
                await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(it.coilId)}`, {
                  method: 'PATCH',
                  headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
                  body: JSON.stringify({ stock: finalCoil.stock })
                });
              } catch (err) {
                console.warn('Error al restaurar stock en Supabase:', err);
              }
            }
          });
        }
      }

      showToast(`↩️ Venta #${orderId} revertida: Piezas devueltas al inventario`);
    } else {
      showToast(`❌ Orden #${orderId} cancelada (no modificó el stock)`);
    }

    const updatedOrder = { ...ord, status: 'REVERTED' };
    setSalesHistory(prev => {
      const next = prev.map(s => s.orderId === orderId ? updatedOrder : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    saveSaleToSupabase(updatedOrder);
  }, [salesHistory, dbEngine, dbCredentials, saveSaleToSupabase, showToast]);

  /**
   * Gestión de Garantía: Opción 1 - Cambio por Reemplazo Físico
   * - Descuenta 1 unidad de stock del repuesto nuevo entregado.
   * - La pieza dañada NO regresa al stock disponible (queda en mermas).
   * - Anota el evento de garantía en la orden.
   */
  const processWarrantyReplacement = useCallback(async ({
    orderId,
    defectiveCoilId,
    defectiveItemName,
    replacementCoilId,
    replacementCoilName,
    reason
  }) => {
    const ord = salesHistory.find(s => s.orderId === orderId);
    if (!ord) return;

    let updatedNewStock = 0;

    // Descontar 1 unidad del repuesto nuevo de reemplazo
    setCoils(currentCoils => {
      const updated = currentCoils.map(c => {
        if (c.id.toLowerCase() === String(replacementCoilId).toLowerCase()) {
          const nextStock = Math.max(0, c.stock - 1);
          updatedNewStock = nextStock;
          return { ...c, stock: nextStock, inStock: nextStock > 0 };
        }
        return c;
      });

      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updated));
      } catch (e) {}

      broadcastSync(updated);
      pushToApi(updated);
      return updated;
    });

    // Actualizar en Supabase stock del reemplazo
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        try {
          await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(replacementCoilId)}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ stock: updatedNewStock })
          });
        } catch (err) {}
      }
    }

    const newWarrantyEvent = {
      id: `WAR-${Date.now()}`,
      type: 'REPLACEMENT',
      date: new Date().toISOString(),
      defectiveCoilId,
      defectiveItemName: defectiveItemName || 'Repuesto',
      replacementCoilId,
      replacementCoilName: replacementCoilName || 'Reemplazo',
      reason: reason || 'Defecto de fábrica'
    };

    const existingEvents = ord.warrantyEvents || [];
    const updatedOrder = {
      ...ord,
      warrantyEvents: [...existingEvents, newWarrantyEvent],
      hasWarrantyApplied: true,
      notes: `${ord.notes ? ord.notes + ' | ' : ''}[CAMBIO GARANTÍA: ${replacementCoilName} entregado por ${defectiveItemName} (${new Date().toLocaleDateString('es-VE')})]`
    };

    setSalesHistory(prev => {
      const next = prev.map(s => s.orderId === orderId ? updatedOrder : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    await saveSaleToSupabase(updatedOrder);
    showToast(`🛡️ Garantía procesada: 1x ${replacementCoilName} entregado y descontado de stock.`);
  }, [salesHistory, dbEngine, dbCredentials, saveSaleToSupabase, showToast]);

  /**
   * Gestión de Garantía: Opción 2 - Devolución de Dinero (Reembolso)
   * - La pieza defectuosa NO regresa al inventario vendible.
   * - Se anota el reembolso en la orden y en el libro de caja.
   */
  const processWarrantyRefund = useCallback(async ({
    orderId,
    defectiveCoilId,
    defectiveItemName,
    refundAmountUSD,
    refundRef,
    reason
  }) => {
    const ord = salesHistory.find(s => s.orderId === orderId);
    if (!ord) return;

    const newWarrantyEvent = {
      id: `WAR-${Date.now()}`,
      type: 'REFUND',
      date: new Date().toISOString(),
      defectiveCoilId,
      defectiveItemName: defectiveItemName || 'Repuesto',
      refundAmountUSD: Number(refundAmountUSD),
      refundRef: refundRef || 'Reembolso acordado',
      reason: reason || 'Pieza defectuosa'
    };

    const existingEvents = ord.warrantyEvents || [];
    const updatedOrder = {
      ...ord,
      warrantyEvents: [...existingEvents, newWarrantyEvent],
      hasRefundApplied: true,
      notes: `${ord.notes ? ord.notes + ' | ' : ''}[REEMBOLSO GARANTÍA: -$${Number(refundAmountUSD).toFixed(2)} USD | Ref: ${refundRef} (${new Date().toLocaleDateString('es-VE')})]`
    };

    setSalesHistory(prev => {
      const next = prev.map(s => s.orderId === orderId ? updatedOrder : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    await saveSaleToSupabase(updatedOrder);
    showToast(`🛡️ Reembolso por garantía registrado: $${Number(refundAmountUSD).toFixed(2)} USD devueltos al cliente.`);
  }, [salesHistory, saveSaleToSupabase, showToast]);

  /**
   * Eliminar definitivamente una venta de la lista y de Supabase
   */
  const deleteSale = useCallback(async (orderId) => {
    const cleanId = String(orderId || '').replace(/^#/, '').trim();
    if (!cleanId) return;
    const bareId = cleanId.replace(/^ORD-/, '');

    // Registrar en blacklist persistente para que no resucite al re-sincronizar
    try {
      const deletedArr = JSON.parse(localStorage.getItem('JF_DELETED_SALES_IDS') || '[]');
      const deletedSet = new Set(Array.isArray(deletedArr) ? deletedArr : []);
      deletedSet.add(cleanId);
      deletedSet.add(bareId);
      deletedSet.add(`ORD-${bareId}`);
      localStorage.setItem('JF_DELETED_SALES_IDS', JSON.stringify([...deletedSet]));
    } catch (e) {}

    setSalesHistory(prev => {
      const next = prev.filter(s => {
        const sid = String(s.orderId || s.order_id || s.id || '').replace(/^#/, '').trim();
        const sBare = sid.replace(/^ORD-/, '');
        return sid !== cleanId && sBare !== bareId;
      });
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        const table = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
        try {
          await fetch(`${baseUrl}/rest/v1/${table}?order_id=eq.${encodeURIComponent(cleanId)}`, {
            method: 'DELETE',
            headers: getSupabaseHeaders(anonKey)
          });
        } catch (err) {
          console.warn('Error al eliminar venta en Supabase:', err);
        }
      }
    }

    showToast(`🗑️ Venta #${cleanId} eliminada.`);
  }, [dbEngine, dbCredentials, showToast]);

  /**
   * Vaciar todo el registro de ventas tanto local como en Supabase
   */
  const clearAllSales = useCallback(async () => {
    setSalesHistory([]);
    try {
      localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify([]));
    } catch (e) {}

    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        const table = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
        try {
          await fetch(`${baseUrl}/rest/v1/${table}?order_id=neq.EMPTY_GUARD`, {
            method: 'DELETE',
            headers: getSupabaseHeaders(anonKey)
          });
        } catch (err) {
          console.warn('Error al vaciar ventas en Supabase:', err);
        }
      }
    }

    showToast('🗑️ Todas las ventas han sido eliminadas.');
  }, [dbEngine, dbCredentials, showToast]);

  /**
   * Actualizar una venta existente (Edición / Cambio de Repuesto / Ajuste de Precio)
   * Gestiona automáticamente el stock en memoria y en Supabase si se cambió de repuesto o cantidad.
   */
  const updateSaleTransaction = useCallback(async (orderId, updateData) => {
    const cleanId = String(orderId || '').replace(/^#/, '').trim();
    if (!cleanId) return { success: false, error: 'ID de orden inválido' };

    const existingOrder = salesHistory.find(s => String(s.orderId).replace(/^#/, '') === cleanId);
    if (!existingOrder) return { success: false, error: 'Orden no encontrada' };

    const wasConfirmed = existingOrder.status === 'CONFIRMED';
    const oldCoilId = String(existingOrder.coilId || '').trim();
    const oldQty = Number(existingOrder.qty) || 1;

    const newCoilId = String(updateData.coilId || oldCoilId).trim();
    const newQty = Number(updateData.qty) || 1;
    const newUnitPrice = Number(updateData.unitPrice ?? existingOrder.unitPrice);
    const newTotalPrice = Number(updateData.totalPrice ?? (newUnitPrice * newQty));
    const newStatus = (updateData.status || existingOrder.status || 'CONFIRMED').toUpperCase();
    const isNowConfirmed = newStatus === 'CONFIRMED';

    const newMatchedCoil = coils.find(c => c.id.toLowerCase() === newCoilId.toLowerCase()) || null;
    const oldMatchedCoil = coils.find(c => c.id.toLowerCase() === oldCoilId.toLowerCase()) || null;

    // Calcular ajustes de inventario si la orden estaba confirmada o pasa a estar confirmada
    const inventoryAdjustments = []; // Array de { coilId, newStock }

    if (updateData.inventoryAdjustments && Array.isArray(updateData.inventoryAdjustments)) {
      for (const adj of updateData.inventoryAdjustments) {
        const c = coils.find(item => item.id.toLowerCase() === String(adj.coilId).toLowerCase());
        const curStock = c ? c.stock : 0;
        inventoryAdjustments.push({ coilId: adj.coilId, newStock: Math.max(0, curStock + Number(adj.delta || 0)) });
      }
    } else if (wasConfirmed || isNowConfirmed) {
      if (oldCoilId.toLowerCase() === newCoilId.toLowerCase()) {
        if (wasConfirmed && !isNowConfirmed) {
          // Ya no está confirmada: devolver stock
          const curStock = oldMatchedCoil ? oldMatchedCoil.stock : 0;
          inventoryAdjustments.push({ coilId: oldCoilId, newStock: curStock + oldQty });
        } else if (!wasConfirmed && isNowConfirmed) {
          // Ahora está confirmada: descontar stock
          const curStock = oldMatchedCoil ? oldMatchedCoil.stock : 0;
          inventoryAdjustments.push({ coilId: oldCoilId, newStock: Math.max(0, curStock - newQty) });
        } else if (wasConfirmed && isNowConfirmed && oldQty !== newQty) {
          // Cambió la cantidad
          const curStock = oldMatchedCoil ? oldMatchedCoil.stock : 0;
          const diff = oldQty - newQty;
          inventoryAdjustments.push({ coilId: oldCoilId, newStock: Math.max(0, curStock + diff) });
        }
      } else {
        // Hubo cambio de repuesto
        if (wasConfirmed) {
          // Devolver repuesto anterior al inventario
          const curOldStock = oldMatchedCoil ? oldMatchedCoil.stock : 0;
          inventoryAdjustments.push({ coilId: oldCoilId, newStock: curOldStock + oldQty });
        }
        if (isNowConfirmed) {
          // Descontar nuevo repuesto del inventario
          const curNewStock = newMatchedCoil ? newMatchedCoil.stock : 0;
          inventoryAdjustments.push({ coilId: newCoilId, newStock: Math.max(0, curNewStock - newQty) });
        }
      }
    }

    // Aplicar ajustes en estado de coils (memoria y LocalStorage)
    if (inventoryAdjustments.length > 0) {
      setCoils(currentCoils => {
        const updated = currentCoils.map(item => {
          const adj = inventoryAdjustments.find(a => a.coilId.toLowerCase() === item.id.toLowerCase());
          if (adj) {
            return {
              ...item,
              stock: adj.newStock,
              inStock: adj.newStock > 0
            };
          }
          return item;
        });
        try {
          localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Actualizar stock en Supabase
      if (dbEngine === 'supabase') {
        const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
        if (baseUrl && anonKey) {
          for (const adj of inventoryAdjustments) {
            try {
              await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(adj.coilId)}`, {
                method: 'PATCH',
                headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
                body: JSON.stringify({ stock: adj.newStock })
              });
            } catch (err) {
              console.warn(`Error al actualizar stock de ${adj.coilId} en Supabase:`, err);
            }
          }
        }
      }
    }

    // Calcular stock anterior y posterior para la auditoría de la venta
    let calculatedStockBefore = existingOrder.stockBefore ?? 0;
    let calculatedStockAfter = existingOrder.stockAfter ?? 0;

    if (oldCoilId.toLowerCase() !== newCoilId.toLowerCase()) {
      // Hubo cambio de repuesto: reflejar el stock del nuevo artículo entregado
      const curNewStock = newMatchedCoil ? newMatchedCoil.stock : 0;
      if (isNowConfirmed) {
        calculatedStockBefore = curNewStock;
        calculatedStockAfter = Math.max(0, curNewStock - newQty);
      } else {
        calculatedStockBefore = curNewStock;
        calculatedStockAfter = curNewStock;
      }
    } else {
      // Mismo repuesto: si cambió la cantidad
      if (isNowConfirmed) {
        const baseStock = existingOrder.stockBefore || ((oldMatchedCoil ? oldMatchedCoil.stock : 0) + oldQty);
        calculatedStockBefore = baseStock;
        calculatedStockAfter = Math.max(0, baseStock - newQty);
      }
    }

    // Construir la orden actualizada
    const updatedOrder = {
      ...existingOrder,
      items: updateData.items !== undefined ? updateData.items : existingOrder.items,
      customerName: updateData.customerName !== undefined ? String(updateData.customerName).trim() : existingOrder.customerName,
      customerPhone: updateData.customerPhone !== undefined ? String(updateData.customerPhone).trim() : existingOrder.customerPhone,
      coilId: newCoilId,
      coilName: newMatchedCoil ? newMatchedCoil.name : (updateData.coilName || existingOrder.coilName),
      oem: newMatchedCoil ? newMatchedCoil.oem : (updateData.oem || existingOrder.oem),
      qty: newQty,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice,
      stockBefore: calculatedStockBefore,
      stockAfter: calculatedStockAfter,
      paymentRef: updateData.paymentRef !== undefined ? String(updateData.paymentRef).trim() : existingOrder.paymentRef,
      status: newStatus,
      notes: updateData.notes !== undefined ? String(updateData.notes).trim() : (existingOrder.notes || '')
    };

    // Actualizar historial de ventas en estado y LocalStorage
    setSalesHistory(prev => {
      const next = prev.map(s => String(s.orderId).replace(/^#/, '') === cleanId ? updatedOrder : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Guardar / Actualizar en Supabase garantizando persistencia de metadatos multi-artículo
    if (dbEngine === 'supabase') {
      await saveSaleToSupabase(updatedOrder, newMatchedCoil);
    }

    showToast(`✓ Venta #${cleanId} actualizada y sincronizada en Supabase`);
    return { success: true, updatedOrder };
  }, [salesHistory, coils, dbEngine, dbCredentials, showToast]);

  const refreshSalesHistory = useCallback(async (showNotification = false) => {
    // 0. Leer historial local actual para preservación defensiva de artículos
    let localSales = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SALES_LOG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localSales = parsed;
      }
    } catch (e) {}

    const localMap = new Map();
    localSales.forEach(s => {
      const id = String(s.orderId || s.order_id || '').replace(/^#/, '').trim();
      if (id) localMap.set(id, s);
    });

    // 1. Sincronizar en doble vía con la tabla 'ventas' de Supabase
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        try {
          const table = dbCredentials.supabase?.salesTable || 'ventas';
          const endpoint = `${baseUrl}/rest/v1/${table}?select=*`;
          const resp = await fetch(endpoint, {
            headers: getSupabaseHeaders(anonKey)
          });
          if (resp.ok) {
            const data = await resp.json();
            const supabaseRows = Array.isArray(data) ? data : [];
            const supabaseIdSet = new Set();

            const mappedSupabase = supabaseRows.map(item => {
              const cleanId = String(item.order_id || item.id).replace(/^#/, '').trim();
              supabaseIdSet.add(cleanId);

              const rawProdId = item.producto_id || item.coil_id || '';
              const rawOem = item.codigo_oem || item.oem || '';
              const matchedCoil = coils.find(c => 
                (rawProdId && c.id.toLowerCase() === rawProdId.toLowerCase()) || 
                (rawOem && c.oem && c.oem.includes(rawOem))
              );

              const rawPaymentRef = item.referencia_pago || item.payment_ref || '';
              const { cleanRef, meta } = decodeOrderPaymentRef(rawPaymentRef);

              // Recuperar de local si no vino en el tag de Supabase
              const existingLocal = localMap.get(cleanId);

              // Resolver items de forma infalible
              let resolvedItems = null;
              if (meta && Array.isArray(meta.items) && meta.items.length > 0) {
                resolvedItems = meta.items;
              } else if (existingLocal && Array.isArray(existingLocal.items) && existingLocal.items.length > 0) {
                resolvedItems = existingLocal.items;
              } else {
                // Fallback a artículo único del catálogo
                resolvedItems = [{
                  coilId: matchedCoil ? matchedCoil.id : (rawProdId || 'CON-SENTRA16'),
                  name: matchedCoil ? matchedCoil.name : (item.producto_nombre || item.coil_name || 'Repuesto Automotriz'),
                  oem: matchedCoil ? matchedCoil.oem : rawOem,
                  qty: parseInt(item.cantidad || item.qty || 1, 10),
                  unitPrice: Number(item.precio_unitario || item.precio_unitario_usd || (matchedCoil ? matchedCoil.price : 0)),
                  subtotal: Number(item.total_usd || item.total_price || 0),
                  image: matchedCoil ? matchedCoil.image : null,
                  brand: matchedCoil ? matchedCoil.brand : 'JF'
                }];
              }

              // Resolver tasas históricas inalterables
              const rateBinance = meta?.rateBinance ?? existingLocal?.exchangeRateBinance ?? null;
              const rateBCV = meta?.rateBCV ?? existingLocal?.exchangeRateBCV ?? null;
              const totalVES = meta?.totalVES ?? existingLocal?.totalVES ?? null;
              const rateSnapshotDate = meta?.rateDate ?? existingLocal?.rateSnapshotDate ?? null;
              const warrantyEvents = meta?.warrantyEvents ?? existingLocal?.warrantyEvents ?? [];
              const customerCar = meta?.customerCar ?? existingLocal?.customerCar ?? (item.modelo_vehiculo || '');
              const notes = meta?.notes ?? existingLocal?.notes ?? '';

              const mappedOrder = {
                orderId: cleanId,
                timestamp: item.fecha_hora || item.created_at || item.fecha || new Date().toISOString(),
                customerName: item.cliente_nombre || item.customer_name || 'Cliente',
                customerPhone: item.cliente_telefono || item.customer_phone || '',
                customerCar,
                items: resolvedItems,
                coilId: resolvedItems[0]?.coilId || (matchedCoil ? matchedCoil.id : (rawProdId || 'CON-SENTRA16')),
                coilName: resolvedItems.length === 1 
                  ? (resolvedItems[0]?.name || item.producto_nombre || 'Repuesto Automotriz')
                  : `${resolvedItems.length} repuestos: ${resolvedItems.map(i => i.name).join(', ')}`,
                oem: resolvedItems.map(i => i.oem).filter(Boolean).join(', ') || rawOem,
                qty: resolvedItems.reduce((acc, it) => acc + (it.qty || 1), 0),
                unitPrice: resolvedItems[0]?.unitPrice || Number(item.precio_unitario || 0),
                totalPrice: Number(item.total_usd || item.total_price || 0),
                totalUSD: Number(item.total_usd || item.total_price || 0),
                stockBefore: Number(item.stock_anterior ?? item.stock_before ?? 0),
                stockAfter: Number(item.stock_posterior ?? item.stock_after ?? 0),
                paymentRef: cleanRef,
                status: (item.estado || item.status || meta?.status || existingLocal?.status || 'CONFIRMED').toUpperCase(),
                userId: item.usuario_id || item.user_id || 'CLI-SUPABASE',
                exchangeRateBinance: rateBinance,
                exchangeRateBCV: rateBCV,
                totalVES: totalVES,
                rateSnapshotDate: rateSnapshotDate,
                warrantyEvents: warrantyEvents,
                notes: notes
              };

              // Si local tenía multi-artículos pero Supabase aún no tenía el tag guardado, sincronizarlo en background
              if ((!meta || !meta.items) && resolvedItems.length > 1) {
                saveSaleToSupabase(mappedOrder).catch(() => {});
              }

              return mappedOrder;
            });

            // Respetar lista de órdenes eliminadas para que no resuciten
            let deletedIdsSet = new Set(['ORD-9480', '9480', 'ORD-8901', '8901']);
            try {
              const deletedArr = JSON.parse(localStorage.getItem('JF_DELETED_SALES_IDS') || '[]');
              if (Array.isArray(deletedArr)) {
                deletedArr.forEach(id => {
                  const clean = String(id).replace(/^#/, '').trim();
                  if (clean) {
                    deletedIdsSet.add(clean);
                    deletedIdsSet.add(clean.replace(/^ORD-/, ''));
                  }
                });
              }
            } catch (e) {}

            const filteredSupabase = mappedSupabase.filter(o => {
              const sid = String(o.orderId || o.order_id || o.id || '').replace(/^#/, '').trim();
              const bareId = sid.replace(/^ORD-/, '');
              return !deletedIdsSet.has(sid) && !deletedIdsSet.has(bareId);
            });

            // Preservar órdenes locales que aún no hayan impactado Supabase
            const unsyncedLocals = localSales.filter(s => {
              const id = String(s.orderId || s.order_id || s.id || '').replace(/^#/, '').trim();
              const bareId = id.replace(/^ORD-/, '');
              return id && !supabaseIdSet.has(id) && !supabaseIdSet.has(bareId) && !deletedIdsSet.has(id) && !deletedIdsSet.has(bareId) && !deletedIdsSet.has(`ORD-${bareId}`);
            });

            const mergedHistory = [...filteredSupabase, ...unsyncedLocals];

            setSalesHistory(mergedHistory);
            try { 
              localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(mergedHistory)); 
            } catch (e) {}

            if (showNotification) {
              showToast(`✓ Base de datos de ventas sincronizada (${mergedHistory.length} movimientos)`);
            }
            return mergedHistory;
          }
        } catch (e) {
          console.warn('Error al consultar ventas en Supabase:', e);
        }
      }
    }

    // 2. Fallback a LocalStorage & broadcast
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SALES_LOG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSalesHistory(parsed);
          if (showNotification) showToast(`✓ Registro de ventas sincronizado (${parsed.length} órdenes activas)`);
          return parsed;
        }
      }
    } catch (e) {}

    return salesHistory;
  }, [dbCredentials, dbEngine, coils, saveSaleToSupabase, showToast]);

  const importSalesBatch = useCallback((newRecords, replaceAll = false) => {
    setSalesHistory(prev => {
      let next;
      if (replaceAll) {
        next = newRecords;
      } else {
        const existingIds = new Set(prev.map(s => String(s.orderId)));
        const nonDups = newRecords.filter(s => !existingIds.has(String(s.orderId)));
        next = [...nonDups, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Guardar también cada registro nuevo en Supabase
    if (dbEngine === 'supabase') {
      newRecords.forEach(rec => saveSaleToSupabase(rec));
    }

    showToast(`✓ ${newRecords.length} ventas importadas y conectadas con el catálogo`);
  }, [dbEngine, saveSaleToSupabase, showToast]);

  const pushSalesToSupabase = useCallback(async () => {
    const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
    if (!baseUrl || !anonKey) {
      throw new Error('Configura primero la URL y Anon Key de Supabase.');
    }

    const table = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
    let successCount = 0;

    for (const ord of salesHistory) {
      const res = await saveSaleToSupabase(ord);
      if (res && res.success) successCount++;
    }

    showToast(`✓ ${salesHistory.length} movimientos de venta sincronizados exitosamente en Supabase (tabla '${table}')`);
    return true;
  }, [dbCredentials, salesHistory, saveSaleToSupabase, showToast]);

  const dismissOwnerAlert = useCallback(() => {
    setPendingOwnerAlert(null);
  }, []);

  const updateDbCredentials = useCallback((engine, newFields) => {
    const nextCreds = {
      ...dbCredentials,
      [engine]: {
        ...dbCredentials[engine],
        ...newFields
      }
    };
    setDbCredentials(nextCreds);
    pushToApi(coils, dbEngine, nextCreds);
    showToast(`Credenciales para ${engine.toUpperCase()} guardadas`);
  }, [coils, dbCredentials, dbEngine, showToast]);

  const testApiConnection = useCallback(async (engine = dbEngine, customCreds = null) => {
    return await checkAndSyncDatabase(engine, customCreds, true);
  }, [checkAndSyncDatabase, dbEngine]);

  const syncWithApi = useCallback(async (direction = 'pull', customCreds = null) => {
    const targetCreds = customCreds || dbCredentials[dbEngine] || {};
    if (direction === 'pull') {
      showToast(`Consultando inventario en ${dbEngine.toUpperCase()}...`);
      return await checkAndSyncDatabase(dbEngine, targetCreds, true);
    } else {
      showToast(`Guardando ${coils.length} bobinas en ${dbEngine.toUpperCase()}...`);
      if (dbEngine === 'supabase') {
        const { baseUrl, anonKey, table } = getActiveSupabaseConfig(customCreds, dbCredentials);
        if (baseUrl && anonKey) {
          try {
            const endpoint = `${baseUrl}/rest/v1/${table}?on_conflict=id`;
            const formatted = coils.map(c => ({
              id: c.id,
              name: c.name,
              brand: c.brand,
              car_model: c.carModel,
              engine: c.engine,
              oem: c.oem,
              type: c.type,
              connector: c.connector,
              price: c.price,
              old_price: c.oldPrice,
              stock: c.stock,
              warranty: c.warranty,
              badge: c.badge,
              image: c.image
            }));
            await fetch(endpoint, {
              method: 'POST',
              headers: getSupabaseHeaders(anonKey, { 'Prefer': 'resolution=merge-duplicates' }),
              body: JSON.stringify(formatted)
            });
          } catch (e) {}
        }
      }
      pushToApi(coils, dbEngine, targetCreds);
      showToast(`✅ Sincronizados ${coils.length} productos con ${dbEngine.toUpperCase()}.`);
    }
  }, [checkAndSyncDatabase, coils, dbCredentials, dbEngine, showToast]);

  // Chequeo inicial automático al cargar la aplicación (después de inicializar todos los callbacks)
  const initialCheckRef = useRef(false);
  useEffect(() => {
    if (!initialCheckRef.current) {
      initialCheckRef.current = true;
      checkAndSyncDatabase(dbEngine, null, false).then(() => {
        if (typeof refreshSalesHistory === 'function') {
          refreshSalesHistory(false);
        }
      });
    }
  }, [checkAndSyncDatabase, refreshSalesHistory, dbEngine]);

  return (
    <InventoryContext.Provider value={{
      coils,
      isDbLoading,
      dbEngine,
      changeDbEngine,
      dbCredentials,
      updateDbCredentials,
      apiConnectionStatus,
      testApiConnection,
      syncWithApi,
      checkAndSyncDatabase,
      upsertCoil,
      deleteCoil,
      clearInventory,
      restoreSeedData,
      bulkImport,
      salesHistory,
      refreshSalesHistory,
      importSalesBatch,
      pushSalesToSupabase,
      ownerSettings,
      updateOwnerSettings,
      processSaleTransaction,
      confirmSale,
      revertSale,
      processWarrantyReplacement,
      processWarrantyRefund,
      deleteSale,
      clearAllSales,
      updateSaleTransaction,
      pendingOwnerAlert,
      dismissOwnerAlert
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
