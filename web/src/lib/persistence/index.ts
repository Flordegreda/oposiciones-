export type {
  BancoCacheEntry,
  CacheMeta,
  DailyStat,
  PreguntaResultadoDetalle,
  SyncStatus,
  TestResultRecord,
  UserStatsRecord,
  BancoStatsSlice,
} from "@/lib/persistence/types";
export {
  LocalCacheService,
  getLocalCache,
  getOrCreateUsuarioId,
} from "@/lib/persistence/local-cache-service";
export { saveResultadoTest } from "@/lib/persistence/resultados-service";
export {
  EstadisticasService,
  obtenerDashboardData,
  obtenerEstadisticasResumen,
} from "@/lib/persistence/estadisticas-service";
export type {
  DashboardData,
  FiltroTiempo,
  ResumenEstadisticas,
} from "@/lib/persistence/estadisticas-service";
