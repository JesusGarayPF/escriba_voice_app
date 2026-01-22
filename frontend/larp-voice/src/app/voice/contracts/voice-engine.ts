export interface SttOptions {
  language?: string;
}

export interface TtsOptions {
  voice?: string;
  language?: string;
}

export interface SttResult {
  text: string;
  durationMs?: number;
}

export interface VoiceEngine {
  stt(audio: Blob, options?: SttOptions): Promise<SttResult>;
  tts(text: string, options?: TtsOptions): Promise<Blob>;
}
