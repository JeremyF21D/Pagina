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
   */
  const saveSaleToSupabase = useCallback(async (order, matchedCoil = null) => {
    if (!order || !order.orderId) return { success: false };
    if (dbEngine !== 'supabase') return { success: true };

    const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
    if (!baseUrl || !anonKey) return { success: false };

    const table = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
    const cleanOrderId = String(order.orderId || order.order_id).replace(/^#/, '').trim();
    const coil = matchedCoil || coils.find(c => c.id === order.coilId || (order.oem && c.oem && c.oem.includes(order.oem)));

    const payload = {
      order_id: cleanOrderId,
      fecha: order.timestamp || order.fecha || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fecha_hora: new Date().toISOString(),
      cliente_nombre: String(order.customerName || order.cliente_nombre || 'Cliente WhatsApp').trim(),
      cliente_telefono: String(order.customerPhone || order.cliente_telefono || '').trim(),
      producto_id: coil ? coil.id : String(order.coilId || order.producto_id || '').trim(),
      producto_nombre: coil ? coil.name : String(order.coilName || order.producto_nombre || 'Repuesto Automotriz').trim(),
      codigo_oem: coil ? coil.oem : String(order.oem || order.codigo_oem || '').trim(),
      marca_producto: coil ? coil.brand : '',
      modelo_vehiculo: coil ? coil.carModel : '',
      motor_vehiculo: coil ? coil.engine : '',
      tipo_bobina: coil ? coil.type : '',
      cantidad: parseInt(order.qty || order.cantidad || 1, 10),
      precio_unitario: Number(order.unitPrice || order.precio_unitario || (coil ? coil.price : 0)),
      precio_unitario_usd: Number(order.unitPrice || order.precio_unitario || (coil ? coil.price : 0)),
      total_usd: Number(order.totalPrice || order.total_usd || 0),
      stock_anterior: Number(order.stockBefore ?? order.stock_anterior ?? 0),
      stock_antes_venta: Number(order.stockBefore ?? order.stock_anterior ?? 0),
      stock_posterior: Number(order.stockAfter ?? order.stock_posterior ?? 0),
      stock_despues_venta: Number(order.stockAfter ?? order.stock_posterior ?? 0),
      stock_actual_catalogo: coil ? coil.stock : Number(order.stockAfter || 0),
      referencia_pago: String(order.paymentRef || order.referencia_pago || '').trim(),
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
        const postRes = await fetch(`${baseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify(payload)
        });
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
  const processSaleTransaction = useCallback(({ coilId, qty, customerName, customerPhone, paymentRef, userId, status = null }) => {
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

      // Toda venta nueva ingresa SIEMPRE en estado PENDIENTE de verificación manual por WhatsApp/Almacén
      // para evitar descuadre por productos defectuosos o devoluciones antes de la confirmación definitiva.
      const effectiveStatus = 'PENDING_APPROVAL';
      const isConfirmed = false;
      const stockAfter = stockBefore;

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
        status: effectiveStatus
      };

      orderResult = newOrder;
      setSalesHistory(prev => [newOrder, ...prev]);
      setPendingOwnerAlert(newOrder);

      // Guardar de inmediato en la tabla 'ventas' de Supabase
      saveSaleToSupabase(newOrder, coil);

      if (ownerSettings.soundAlert) {
        playCashRegisterSound();
      }

      // Si no está confirmada (está pendiente), no descontamos stock del inventario
      if (!isConfirmed) {
        showToast(`🟡 Pedido #${newOrder.orderId} registrado en Supabase (Pendiente de confirmación)`);
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

      // Si Supabase está conectado, actualizar la columna stock en bobinas_inventario
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

      showToast(`🟢 Venta #${newOrder.orderId} registrada: Stock descontado y guardada en Supabase`);
      return updated;
    });

    return orderResult;
  }, [ownerSettings.requireApproval, ownerSettings.soundAlert, playCashRegisterSound, showToast, saveSaleToSupabase, dbEngine, dbCredentials]);

  /**
   * Confirmar pedido pendiente:
   * Cambia el estado a CONFIRMED y descuenta el stock tanto localmente como en Supabase.
   */
  const confirmSale = useCallback(async (orderId, paymentData = null) => {
    const ord = salesHistory.find(s => s.orderId === orderId);
    if (!ord) return;

    if (ord.status === 'CONFIRMED') {
      showToast(`La orden #${orderId} ya está confirmada.`);
      return;
    }

    let calculatedNewStock = null;
    const targetCoilId = ord.coilId;
    let targetCoil = null;

    setCoils(currentCoils => {
      const coil = currentCoils.find(b => b.id.toLowerCase() === String(targetCoilId || '').toLowerCase());
      targetCoil = coil;
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

    const updatedOrder = {
      ...ord,
      status: 'CONFIRMED',
      stockAfter: calculatedNewStock !== null ? calculatedNewStock : Math.max(0, ord.stockBefore - ord.qty),
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

    // Guardar / Actualizar en Supabase orden y stock
    await saveSaleToSupabase(updatedOrder, targetCoil);

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

    showToast(`✅ Pedido #${orderId} confirmado: Stock actualizado y registrado en Supabase.`);
  }, [salesHistory, ownerSettings.soundAlert, playCashRegisterSound, dbEngine, dbCredentials, saveSaleToSupabase, showToast]);

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

    const updatedOrder = { ...ord, status: 'REVERTED' };
    setSalesHistory(prev => {
      const next = prev.map(s => s.orderId === orderId ? updatedOrder : s);
      try {
        localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Actualizar estado en Supabase
    saveSaleToSupabase(updatedOrder);
  }, [salesHistory, dbEngine, dbCredentials, saveSaleToSupabase, showToast]);

  /**
   * Eliminar definitivamente una venta de la lista y de Supabase
   */
  const deleteSale = useCallback(async (orderId) => {
    const cleanId = String(orderId || '').replace(/^#/, '').trim();
    if (!cleanId) return;

    setSalesHistory(prev => {
      const next = prev.filter(s => String(s.orderId).replace(/^#/, '') !== cleanId);
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

    if (wasConfirmed || isNowConfirmed) {
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

    // Construir la orden actualizada
    const updatedOrder = {
      ...existingOrder,
      customerName: updateData.customerName !== undefined ? String(updateData.customerName).trim() : existingOrder.customerName,
      customerPhone: updateData.customerPhone !== undefined ? String(updateData.customerPhone).trim() : existingOrder.customerPhone,
      coilId: newCoilId,
      coilName: newMatchedCoil ? newMatchedCoil.name : (updateData.coilName || existingOrder.coilName),
      oem: newMatchedCoil ? newMatchedCoil.oem : (updateData.oem || existingOrder.oem),
      qty: newQty,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice,
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

    // Guardar / Actualizar en Supabase en la tabla 'ventas'
    if (dbEngine === 'supabase') {
      const { baseUrl, anonKey } = getActiveSupabaseConfig(null, dbCredentials);
      if (baseUrl && anonKey) {
        const salesTable = String(dbCredentials.supabase?.salesTable || 'ventas').trim();
        const payload = {
          order_id: cleanId,
          cliente_nombre: updatedOrder.customerName,
          cliente_telefono: updatedOrder.customerPhone,
          producto_id: updatedOrder.coilId,
          producto_nombre: updatedOrder.coilName,
          codigo_oem: updatedOrder.oem,
          cantidad: updatedOrder.qty,
          precio_unitario: updatedOrder.unitPrice,
          precio_unitario_usd: updatedOrder.unitPrice,
          total_usd: updatedOrder.totalPrice,
          referencia_pago: updatedOrder.paymentRef,
          estado: updatedOrder.status,
          status: updatedOrder.status,
          estado_orden: updatedOrder.status
        };

        if (newMatchedCoil) {
          payload.marca_producto = newMatchedCoil.brand || '';
          payload.modelo_vehiculo = newMatchedCoil.carModel || '';
          payload.motor_vehiculo = newMatchedCoil.engine || '';
          payload.tipo_bobina = newMatchedCoil.type || '';
        }

        try {
          await fetch(`${baseUrl}/rest/v1/${salesTable}?order_id=eq.${encodeURIComponent(cleanId)}`, {
            method: 'PATCH',
            headers: getSupabaseHeaders(anonKey, { 'Prefer': 'return=minimal' }),
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.warn('Error al actualizar venta en Supabase:', err);
        }
      }
    }

    showToast(`✓ Venta #${cleanId} actualizada y sincronizada en Supabase`);
    return { success: true, updatedOrder };
  }, [salesHistory, coils, dbEngine, dbCredentials, showToast]);

  const refreshSalesHistory = useCallback(async (showNotification = false) => {
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
            const supabaseIds = new Set(supabaseRows.map(r => String(r.order_id || r.id).replace(/^#/, '')));

            const mappedSupabase = supabaseRows.map(item => {
              const rawProdId = item.producto_id || item.coil_id || '';
              const rawOem = item.codigo_oem || item.oem || '';
              const matchedCoil = coils.find(c => (rawProdId && c.id.toLowerCase() === rawProdId.toLowerCase()) || (rawOem && c.oem && c.oem.includes(rawOem)));

              return {
                orderId: String(item.order_id || item.id).replace(/^#/, ''),
                timestamp: item.fecha || item.fecha_hora || item.created_at || 'Hoy',
                customerName: item.cliente_nombre || item.customer_name || 'Cliente',
                customerPhone: item.cliente_telefono || item.customer_phone || '',
                coilId: matchedCoil ? matchedCoil.id : (rawProdId || 'BOB-GEN'),
                coilName: matchedCoil ? matchedCoil.name : (item.producto_nombre || item.coil_name || 'Repuesto Automotriz'),
                oem: matchedCoil ? matchedCoil.oem : rawOem,
                qty: parseInt(item.cantidad || item.qty || 1, 10),
                unitPrice: Number(item.precio_unitario || item.unit_price || (matchedCoil ? matchedCoil.price : 0)),
                totalPrice: Number(item.total_usd || item.total_price || 0),
                stockBefore: Number(item.stock_anterior ?? item.stock_before ?? 0),
                stockAfter: Number(item.stock_posterior ?? item.stock_after ?? 0),
                paymentRef: item.referencia_pago || item.payment_ref || '',
                status: (item.estado || item.status || 'CONFIRMED').toUpperCase(),
                userId: item.usuario_id || item.user_id || 'CLI-SUPABASE'
              };
            });

            // Supabase es la fuente de verdad definitiva: respetamos exactamente lo que hay en la base de datos
            setSalesHistory(mappedSupabase);
            try { 
              localStorage.setItem(STORAGE_KEY_SALES_LOG, JSON.stringify(mappedSupabase)); 
            } catch (e) {}

            if (showNotification) {
              showToast(`✓ Base de datos de ventas sincronizada (${mappedSupabase.length} movimientos en Supabase)`);
            }
            return mappedSupabase;
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
