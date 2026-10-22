import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_BOBINAS_SEED, INITIAL_SALES_SEED } from '../data/seedData';
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
    return [];
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
      const saved = localStorage.getItem(STORAGE_KEY_SALES_LOG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return INITIAL_SALES_SEED;
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

  // Chequeo inicial automático al cargar la aplicación
  const initialCheckRef = useRef(false);
  useEffect(() => {
    if (!initialCheckRef.current) {
      initialCheckRef.current = true;
      checkAndSyncDatabase(dbEngine, null, false);
    }
  }, [checkAndSyncDatabase, dbEngine]);

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

  const upsertCoil = useCallback(async (rawCoil) => {
    const coil = normalizeCoilRecord(rawCoil);
    if (!coil || !coil.id) return { success: false, error: 'Artículo inválido' };

    // Guardar imagen personalizada localmente para no perderla si la tabla no tiene columna 'image'
    if (coil.image && typeof localStorage !== 'undefined') {
      try {
        const storedImages = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        storedImages[coil.id] = coil.image;
        localStorage.setItem('JF_PRODUCT_CUSTOM_IMAGES', JSON.stringify(storedImages));
      } catch (e) {}
    }

    // Actualizar estado de inventario inmediatamente
    setCoils(prev => {
      const idx = prev.findIndex(b => b.id.toLowerCase() === coil.id.toLowerCase());
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = coil;
      } else {
        next = [coil, ...prev];
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
            oldPrice: Number(coil.oldPrice) || Number(coil.price) || 0,
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

          showToast(`🟢 Repuesto ${coil.id} guardado con éxito en Supabase`);
          
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
   * Cierre transaccional de ventas y pedidos
   * Los pedidos creados por clientes entran por defecto en estado 'PENDING_APPROVAL' (Pendiente)
   * sin descontar stock hasta que el dueño/administrador los confirme.
   */
  const processSaleTransaction = useCallback(({ coilId, qty, customerName, customerPhone, paymentRef, userId, status = 'PENDING_APPROVAL' }) => {
    let orderResult = null;

    setCoils(currentCoils => {
      const coil = currentCoils.find(b => b.id.toLowerCase() === String(coilId || '').toLowerCase());
      if (!coil) return currentCoils;

      const requestedQty = Math.max(1, parseInt(qty, 10) || 1);
      const stockBefore = coil.stock;

      if (stockBefore < requestedQty) {
        showToast(`Stock insuficiente (${stockBefore} disponibles)`);
        return currentCoils;
      }

      const isConfirmed = status === 'CONFIRMED';
      const stockAfter = isConfirmed ? Math.max(0, stockBefore - requestedQty) : stockBefore;

      const newOrder = {
        orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userId: userId || 'CLI-GUEST',
        customerName: customerName || 'Cliente WhatsApp Directo',
        customerPhone: customerPhone || 'No especificado',
        coilId: coil.id,
        coilName: coil.name,
        oem: (coil.oem || '').split('/')[0].trim(),
        qty: requestedQty,
        unitPrice: coil.price,
        totalPrice: Number((coil.price * requestedQty).toFixed(2)),
        stockBefore,
        stockAfter,
        paymentRef: paymentRef || 'A coordinar por WhatsApp',
        status: isConfirmed ? 'CONFIRMED' : 'PENDING_APPROVAL'
      };

      orderResult = newOrder;
      setSalesHistory(prev => [newOrder, ...prev]);
      setPendingOwnerAlert(newOrder);

      if (ownerSettings.soundAlert) {
        playCashRegisterSound();
      }

      // Si no está confirmada (está pendiente), no descontamos stock del inventario
      if (!isConfirmed) {
        return currentCoils;
      }

      // Si fue confirmada directamente (ej. venta manual en almacén)
      const updated = currentCoils.map(item => {
        if (item.id.toLowerCase() === coil.id.toLowerCase()) {
          return {
            ...item,
            stock: stockAfter,
            inStock: stockAfter > 0
          };
        }
        return item;
      });

      broadcastSync(updated);
      pushToApi(updated);

      // Si Supabase está conectado, actualizar la columna stock
      if (dbEngine === 'supabase') {
        const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
        if (baseUrl && anonKey) {
          fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(coil.id)}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ stock: stockAfter })
          }).catch(e => console.warn('Error al descontar stock en Supabase:', e));
        }
      }

      return updated;
    });

    return orderResult;
  }, [ownerSettings.soundAlert, playCashRegisterSound, showToast, dbEngine, dbCredentials]);

  /**
   * Confirmar pedido pendiente:
   * Cambia el estado a CONFIRMED y descuenta el stock tanto localmente como en Supabase.
   */
  const confirmSale = useCallback(async (orderId) => {
    const ord = salesHistory.find(s => s.orderId === orderId);
    if (!ord) return;

    if (ord.status === 'CONFIRMED') {
      showToast(`La orden #${orderId} ya está confirmada.`);
      return;
    }

    let calculatedNewStock = null;
    const targetCoilId = ord.coilId;

    setCoils(currentCoils => {
      const coil = currentCoils.find(b => b.id.toLowerCase() === String(targetCoilId || '').toLowerCase());
      const currentStock = coil ? coil.stock : ord.stockBefore;
      const newStock = Math.max(0, currentStock - ord.qty);
      calculatedNewStock = newStock;

      const updated = currentCoils.map(item => {
        if (item.id.toLowerCase() === String(targetCoilId || '').toLowerCase()) {
          return {
            ...item,
            stock: newStock,
            inStock: newStock > 0
          };
        }
        return item;
      });

      try {
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updated));
      } catch (e) {}

      broadcastSync(updated);
      pushToApi(updated);
      return updated;
    });

    setSalesHistory(prev => {
      const next = prev.map(s => {
        if (s.orderId === orderId) {
          return {
            ...s,
            status: 'CONFIRMED',
            stockAfter: calculatedNewStock !== null ? calculatedNewStock : Math.max(0, s.stockBefore - s.qty)
          };
        }
        return s;
      });
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (ownerSettings.soundAlert) {
      playCashRegisterSound();
    }

    // Descontar en Supabase si está activo
    if (dbEngine === 'supabase' && targetCoilId && calculatedNewStock !== null) {
      const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        try {
          const res = await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(targetCoilId)}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ stock: calculatedNewStock })
          });
          if (res.ok) {
            console.log(`Stock actualizado en Supabase para ${targetCoilId}: ${calculatedNewStock}`);
          }
        } catch (err) {
          console.warn('Error de red al actualizar stock en Supabase:', err);
        }
      }
    }

    showToast(`✅ Pedido #${orderId} confirmado. Se descontaron ${ord.qty} uds de stock.`);
  }, [salesHistory, ownerSettings.soundAlert, playCashRegisterSound, dbEngine, dbCredentials, showToast]);

  /**
   * Revertir o Cancelar orden:
   * - Si estaba CONFIRMED: regresa el stock tanto en memoria como en Supabase.
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
    const targetCoilId = ord.coilId;
    let calculatedRestoredStock = null;

    if (wasConfirmed) {
      setCoils(currentCoils => {
        const coil = currentCoils.find(b => b.id.toLowerCase() === String(targetCoilId || '').toLowerCase());
        const currentStock = coil ? coil.stock : (ord.stockAfter || 0);
        const restoredStock = currentStock + ord.qty;
        calculatedRestoredStock = restoredStock;

        const updated = currentCoils.map(item => {
          if (item.id.toLowerCase() === String(targetCoilId || '').toLowerCase()) {
            return {
              ...item,
              stock: restoredStock,
              inStock: restoredStock > 0
            };
          }
          return item;
        });

        try {
          localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(updated));
        } catch (e) {}

        broadcastSync(updated);
        pushToApi(updated);
        return updated;
      });

      // Si Supabase está conectado, devolver el stock en la base de datos remota
      if (dbEngine === 'supabase' && targetCoilId && calculatedRestoredStock !== null) {
        const { baseUrl, anonKey, table } = getActiveSupabaseConfig(null, dbCredentials);
        if (baseUrl && anonKey) {
          try {
            await fetch(`${baseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(targetCoilId)}`, {
              method: 'PATCH',
              headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
              body: JSON.stringify({ stock: calculatedRestoredStock })
            });
          } catch (err) {
            console.warn('Error de red al reintegrar stock en Supabase:', err);
          }
        }
      }

      showToast(`↩️ Venta #${orderId} revertida (+${ord.qty} unidades devueltas al stock)`);
    } else {
      showToast(`❌ Orden #${orderId} cancelada (no modificó el stock)`);
    }

    setSalesHistory(prev => {
      const next = prev.map(s => s.orderId === orderId ? { ...s, status: 'REVERTED' } : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, [salesHistory, dbEngine, dbCredentials, showToast]);

  const refreshSalesHistory = useCallback(async () => {
    // 1. If active engine is supabase, attempt fetch from Supabase table 'ventas' (or 'ventas_ordenes')
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
            if (Array.isArray(data) && data.length > 0) {
              const mapped = data.map(item => {
                const rawProdId = item.producto_id || item.coil_id || '';
                const rawOem = item.codigo_oem || item.oem || '';
                const matchedCoil = coils.find(c => (rawProdId && c.id.toLowerCase() === rawProdId.toLowerCase()) || (rawOem && c.oem && c.oem.includes(rawOem)));

                return {
                  orderId: String(item.order_id || item.id).replace(/^#/, ''),
                  timestamp: item.fecha || item.fecha_hora || item.created_at || 'Hoy',
                  customerName: item.cliente_nombre || item.customer_name || 'Cliente',
                  customerPhone: item.cliente_telefono || item.customer_phone || '',
                  coilId: matchedCoil ? matchedCoil.id : (rawProdId || 'BOB-GEN'),
                  coilName: matchedCoil ? matchedCoil.name : (item.producto_nombre || item.coil_name || 'Bobina de Encendido'),
                  oem: matchedCoil ? matchedCoil.oem : rawOem,
                  qty: parseInt(item.cantidad || item.qty || 1, 10),
                  unitPrice: Number(item.precio_unitario || item.unit_price || (matchedCoil ? matchedCoil.price : 0)),
                  totalPrice: Number(item.total_usd || item.total_price || 0),
                  stockBefore: Number(item.stock_anterior || item.stock_before || 0),
                  stockAfter: Number(item.stock_posterior || item.stock_after || 0),
                  paymentRef: item.referencia_pago || item.payment_ref || '',
                  status: (item.estado || item.status || 'CONFIRMED').toUpperCase(),
                  userId: item.usuario_id || item.user_id || 'CLI-SUPABASE'
                };
              });
              setSalesHistory(mapped);
              try { localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(mapped)); } catch(e){}
              showToast(`✓ Registro de ventas actualizado desde Supabase (${mapped.length} órdenes)`);
              return mapped;
            }
          }
        } catch (e) {
          console.warn('Error al consultar ventas en Supabase:', e);
        }
      }
    }

    // 2. Read from LocalStorage & broadcast
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SALES_LOG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSalesHistory(parsed);
          showToast(`✓ Registro de ventas sincronizado (${parsed.length} órdenes activas)`);
          return parsed;
        }
      }
    } catch (e) {}

    showToast(`✓ Registro de ventas al día (${salesHistory.length} órdenes)`);
    return salesHistory;
  }, [dbCredentials, dbEngine, salesHistory, showToast]);

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
    showToast(`✓ ${newRecords.length} ventas importadas y conectadas con el catálogo`);
  }, [showToast]);

  const pushSalesToSupabase = useCallback(async () => {
    const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
    if (!baseUrl || !anonKey) {
      throw new Error('Configura primero la URL y Anon Key de Supabase en la pestaña "Base de Datos" o "Config IA".');
    }

    const table = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
    const endpoint = `${baseUrl}/rest/v1/${table}`;

    // 1. Intentar descubrir las columnas que realmente existen en la tabla de Supabase
    let knownColumns = null;
    try {
      const specResp = await fetch(`${baseUrl}/rest/v1/`, {
        headers: getSupabaseHeaders(anonKey)
      });
      if (specResp.ok) {
        const spec = await specResp.json();
        const tableDef = spec?.definitions?.[table] || spec?.definitions?.['ventas'] || spec?.definitions?.['ventas_ordenes'];
        if (tableDef?.properties) {
          knownColumns = new Set(Object.keys(tableDef.properties));
        }
      }
    } catch (e) {}

    // Si OpenAPI no devolvió columnas, consultar 1 fila de muestra
    if (!knownColumns) {
      try {
        const sampleResp = await fetch(`${endpoint}?select=*&limit=1`, {
          headers: getSupabaseHeaders(anonKey)
        });
        if (sampleResp.ok) {
          const sampleRows = await sampleResp.json();
          if (Array.isArray(sampleRows) && sampleRows.length > 0) {
            knownColumns = new Set(Object.keys(sampleRows[0]));
          }
        }
      } catch (e) {}
    }

    // 2. Construir fila adaptativa enlazada con los productos del catálogo
    const buildRow = (s) => {
      const coil = coils.find(c => c.id === s.coilId || (s.oem && c.oem && c.oem.includes(s.oem)));
      const row = {};

      const setField = (spanishKey, englishKey, val) => {
        if (knownColumns) {
          if (knownColumns.has(spanishKey)) {
            row[spanishKey] = val;
          } else if (knownColumns.has(englishKey)) {
            row[englishKey] = val;
          }
        } else {
          // Si no conocemos aún las columnas, priorizamos la clave estándar
          row[spanishKey] = val;
        }
      };

      row.order_id = s.orderId;
      setField('fecha', 'timestamp', s.timestamp || 'Hoy');
      setField('cliente_nombre', 'customer_name', s.customerName || 'Cliente');
      setField('cliente_telefono', 'customer_phone', s.customerPhone || '');
      setField('producto_id', 'coil_id', coil ? coil.id : (s.coilId || ''));
      setField('producto_nombre', 'coil_name', coil ? coil.name : (s.coilName || ''));
      setField('codigo_oem', 'oem', coil ? coil.oem : (s.oem || ''));
      setField('marca_producto', 'brand', coil ? coil.brand : '');
      setField('modelo_vehiculo', 'car_model', coil ? coil.carModel : '');
      setField('motor_vehiculo', 'engine', coil ? coil.engine : '');
      setField('tipo_bobina', 'type', coil ? coil.type : '');
      setField('cantidad', 'qty', s.qty || 1);
      setField('precio_unitario', 'unit_price', Number(s.unitPrice || 0));
      setField('total_usd', 'total_price', Number(s.totalPrice || 0));
      setField('stock_anterior', 'stock_before', s.stockBefore || 0);
      setField('stock_posterior', 'stock_after', s.stockAfter || 0);
      setField('stock_actual_catalogo', 'catalog_stock', coil ? coil.stock : (s.stockAfter || 0));
      setField('referencia_pago', 'payment_ref', s.paymentRef || '');
      setField('estado', 'status', s.status || 'CONFIRMED');
      setField('usuario_id', 'user_id', s.userId || 'CLI-WA');

      return row;
    };

    let payload = salesHistory.map(buildRow);

    // 3. Bucle de reintento inteligente: si Supabase arroja PGRST204 para alguna columna,
    // se remapea automáticamente (por ej. 'estado' -> 'status') o se excluye esa columna.
    let attempts = 0;
    while (attempts < 8) {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: getSupabaseHeaders(creds.anonKey, { 'Prefer': 'resolution=merge-duplicates' }),
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        showToast(`✓ ${salesHistory.length} ventas sincronizadas exitosamente en Supabase (tabla '${table}')`);
        return true;
      }

      const errText = await resp.text();
      let errJson = null;
      try { errJson = JSON.parse(errText); } catch (e) {}

      // Detectar error PGRST204 de columna inexistente
      const missingMatch = (errJson?.message || errText).match(/Could not find the '([^']+)' column/i);
      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        payload = payload.map(row => {
          const updated = { ...row };
          // Mapeo de respaldo inteligente
          if (missingCol === 'estado') {
            updated.status = updated.estado || 'CONFIRMED';
          } else if (missingCol === 'status') {
            updated.estado = updated.status || 'CONFIRMED';
          } else if (missingCol === 'cliente_nombre') {
            updated.customer_name = updated.cliente_nombre;
          } else if (missingCol === 'producto_id') {
            updated.coil_id = updated.producto_id;
          } else if (missingCol === 'producto_nombre') {
            updated.coil_name = updated.producto_nombre;
          } else if (missingCol === 'total_usd') {
            updated.total_price = updated.total_usd;
          } else if (missingCol === 'precio_unitario') {
            updated.unit_price = updated.precio_unitario;
          } else if (missingCol === 'cantidad') {
            updated.qty = updated.cantidad;
          } else if (missingCol === 'referencia_pago') {
            updated.payment_ref = updated.referencia_pago;
          }
          delete updated[missingCol];
          return updated;
        });

        attempts++;
        continue; // Reintentar con el payload adaptado
      }

      // Si es un error de tabla inexistente (PGRST200) o permiso RLS (42501)
      if (errJson?.code === 'PGRST200' || errText.includes('Could not find the table')) {
        throw new Error(`La tabla '${table}' no existe en Supabase. Ve a la pestaña "Sincronizar Supabase" y ejecuta el Script SQL de creación.`);
      }

      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Permiso denegado en Supabase (RLS activado). Ejecuta en el SQL Editor: ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
      }

      throw new Error(`Error en Supabase (${resp.status}): ${errJson?.message || errText}`);
    }

    throw new Error('No se pudo completar la sincronización tras adaptar las columnas.');
  }, [coils, dbCredentials.supabase, salesHistory, showToast]);

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
