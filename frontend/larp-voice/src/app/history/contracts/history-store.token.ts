import { InjectionToken } from '@angular/core';
import { HistoryStore } from './history-store';

export const HISTORY_STORE = new InjectionToken<HistoryStore>('HISTORY_STORE');
