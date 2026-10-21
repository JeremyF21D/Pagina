/**
 * CONFIGURACIÓN CENTRAL DE SUPABASE (JF AUTO PARTS)
 * 
 * Conexión oficial y permanente a la base de datos de Supabase.
 * Todos los usuarios y visitantes nuevos cargan el catálogo directamente desde aquí.
 */

export const SUPABASE_CONFIG = {
  url: 'https://peyvpeloxhjumgwlclkm.supabase.co/rest/v1',
  anonKey: 'sb_publishable_DXASx1SFxoVRKd_K22U3qA_OiQkaTc_',
  table: 'bobinas_inventario'
};
