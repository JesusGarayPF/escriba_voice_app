import { HistoryCategory } from '../contracts/history-category';
import { HistoryItemModel } from '../models/history-item.model';

export interface HistoryListQuery {
  category: HistoryCategory;
  limit?: number;   // default 200
  offset?: number;  // default 0
}

export interface HistoryStore {
  /** Crear/actualizar un item (upsert por id) */
  upsertItem(item: HistoryItemModel): Promise<void>;

  /** Listar por categoría en orden descendente por fecha */
  list(query: HistoryListQuery): Promise<HistoryItemModel[]>;

  /** Renombrar un item */
  rename(id: string, name: string): Promise<void>;

  /** Borrar item (y audio si existe) */
  delete(id: string): Promise<void>;

  /** Guardar audio asociado a un id */
  putAudio(id: string, blob: Blob, mimeType?: string): Promise<void>;

  /** Obtener audio asociado a un id */
  getAudio(id: string): Promise<Blob | null>;

  /** Borrar audio asociado a un id */
  deleteAudio(id: string): Promise<void>;

  /** Vaciar una categoría (items + audios asociados) */
  clearCategory(category: HistoryCategory): Promise<number>;

  /** Vaciar todo (todas las categorías + audios) */
  clearAll(): Promise<void>;
}
