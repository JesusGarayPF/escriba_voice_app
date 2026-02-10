import { Injectable } from '@angular/core';
import { HistoryStore, HistoryListQuery } from '../contracts/history-store';
import { HistoryItemModel } from '../models/history-item.model';

type StoreName = 'items' | 'audio';

const DB_NAME = 'escriba_db';
const DB_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class IndexedDbHistoryStore implements HistoryStore {
  private dbp: Promise<IDBDatabase>;

  constructor() {
    this.dbp = this.openDb();
  }

  async clearCategory(category: HistoryItemModel['category']): Promise<number> {
    const db = await this.dbp;

    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(['items', 'audio'], 'readwrite');
      const itemsStore = tx.objectStore('items');
      const audioStore = tx.objectStore('audio');

      const idx = itemsStore.index('byCategoryCreatedAt');
      const range = IDBKeyRange.bound([category, 0], [category, Number.MAX_SAFE_INTEGER]);

      let deleted = 0;

      const req = idx.openCursor(range);
      req.onerror = () => reject(req.error);

      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) return; // terminará por tx.oncomplete

        const item = cursor.value as HistoryItemModel;

        // borrar item
        itemsStore.delete(cursor.primaryKey);

        // borrar audio asociado (si no hay, no pasa nada)
        const audioId = item.audioId ?? item.id;
        audioStore.delete(audioId);

        deleted++;
        cursor.continue();
      };

      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.dbp;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['items', 'audio'], 'readwrite');
      const itemsStore = tx.objectStore('items');
      const audioStore = tx.objectStore('audio');

      itemsStore.clear();
      audioStore.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async upsertItem(item: HistoryItemModel): Promise<void> {
    const db = await this.dbp;
    await this.tx(db, 'items', 'readwrite', store => store.put(item));
  }

  async list(query: HistoryListQuery): Promise<HistoryItemModel[]> {
    const { category, limit = 200, offset = 0 } = query;
    const db = await this.dbp;

    const results: HistoryItemModel[] = [];
    const range = IDBKeyRange.bound([category, 0], [category, Number.MAX_SAFE_INTEGER]);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const idx = store.index('byCategoryCreatedAt');

      let skipped = 0;
      const req = idx.openCursor(range, 'prev'); // newest first

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve();

        if (skipped < offset) {
          skipped++;
          cursor.continue();
          return;
        }

        results.push(cursor.value as HistoryItemModel);

        if (results.length >= limit) return resolve();
        cursor.continue();
      };
    });

    return results;
  }

  async rename(id: string, name: string): Promise<void> {
    const db = await this.dbp;
    const item = await this.getItem(db, id);
    if (!item) return;

    item.name = name;
    await this.tx(db, 'items', 'readwrite', store => store.put(item));
  }

  async delete(id: string): Promise<void> {
    const db = await this.dbp;

    // Borra item
    await this.tx(db, 'items', 'readwrite', store => store.delete(id));

    // Borra audio asociado (si lo usas con id = id)
    await this.deleteAudio(id);
  }

  async putAudio(id: string, blob: Blob, mimeType?: string): Promise<void> {
    const db = await this.dbp;
    const payload = { id, blob, mimeType: mimeType ?? blob.type ?? '' };
    await this.tx(db, 'audio', 'readwrite', store => store.put(payload));
  }

  async getAudio(id: string): Promise<Blob | null> {
    const db = await this.dbp;
    const tx = db.transaction('audio', 'readonly');
    const store = tx.objectStore('audio');

    const row = await this.req<{ id: string; blob: Blob; mimeType: string } | undefined>(store.get(id));
    return row?.blob ?? null;
  }

  async deleteAudio(id: string): Promise<void> {
    const db = await this.dbp;
    await this.tx(db, 'audio', 'readwrite', store => store.delete(id));
  }

  // --- DB bootstrap ---
  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);

      req.onupgradeneeded = () => {
        const db = req.result;

        if (!db.objectStoreNames.contains('items')) {
          const items = db.createObjectStore('items', { keyPath: 'id' });
          items.createIndex('byCategoryCreatedAt', ['category', 'createdAt']);
        }

        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio', { keyPath: 'id' });
        }
      };

      req.onsuccess = () => resolve(req.result);
    });
  }

  private async getItem(db: IDBDatabase, id: string): Promise<HistoryItemModel | null> {
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const item = await this.req<HistoryItemModel | undefined>(store.get(id));
    return item ?? null;
  }

  private tx<T = unknown>(
    db: IDBDatabase,
    storeName: StoreName,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T | void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      try {
        const req = fn(store) as IDBRequest<T> | void;

        tx.oncomplete = () => resolve(req ? (req.result as T) : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  private req<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }
}
