import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

import { VOICE_ENGINE } from './voice/contracts/voice-engine.token';
import { HttpVoiceEngine } from './voice/adapters/http-voice-engine.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),

    // 🔑 Motor de voz activo (HTTP local)
    { provide: VOICE_ENGINE, useClass: HttpVoiceEngine },
  ],
};
