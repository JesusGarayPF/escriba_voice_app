import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  VoiceEngine,
  SttResult,
  SttOptions,
  TtsOptions,
} from '../contracts/voice-engine';

@Injectable({ providedIn: 'root' })
export class HttpVoiceEngine implements VoiceEngine {
  private readonly baseUrl = 'http://127.0.0.1:3000';

  constructor(private http: HttpClient) {}

  async stt(audio: Blob, options?: SttOptions): Promise<SttResult> {
  const form = new FormData();
  form.append('audio', audio);

  if (options?.language) {
    form.append('language', options.language);
  }

  const res = await firstValueFrom(
    this.http.post<any>(`${this.baseUrl}/stt`, form)
  );

  const text =
    typeof res === 'string'
      ? res
      : (res?.text ?? res?.transcript ?? res?.result ?? '');

  return { text: String(text ?? '') };
}

  async tts(text: string, options?: TtsOptions): Promise<Blob> {
    const payload: any = { text };

    if (options?.voice) payload.voice = options.voice;
    if (options?.language) payload.language = options.language;

    return await firstValueFrom(
      this.http.post(`${this.baseUrl}/tts`, payload, {
        responseType: 'blob',
      })
    );
  }
}
