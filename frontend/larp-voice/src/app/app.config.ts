import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

// History store DI
import { HISTORY_STORE } from './history/contracts/history-store.token';
import { IndexedDbHistoryStore } from './history/stores/indexeddb-history.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),

    // ✅ persistencia desacoplable: en wrapper cambias esto por NativeFsHistoryStore
    { provide: HISTORY_STORE, useExisting: IndexedDbHistoryStore },
  ],
};
