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

// ✅ Voice engine DI
import { VOICE_ENGINE } from './voice/contracts/voice-engine.token';
import { HttpVoiceEngine } from './voice/adapters/http-voice-engine.service';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),

    // History
    { provide: HISTORY_STORE, useExisting: IndexedDbHistoryStore },

    // ✅ Voice (mismo patrón: implementación swappeable sin refactor)
    HttpVoiceEngine,
    { provide: VOICE_ENGINE, useExisting: HttpVoiceEngine },
  ],
};
