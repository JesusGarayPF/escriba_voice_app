import { InjectionToken } from '@angular/core';
import { VoiceEngine } from './voice-engine';

export const VOICE_ENGINE = new InjectionToken<VoiceEngine>('VOICE_ENGINE');
