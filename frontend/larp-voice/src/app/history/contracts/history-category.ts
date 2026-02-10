export type HistoryCategory = 'stt' | 'tts' | 'diarization' | 'summaries';

export const HISTORY_CATEGORIES: ReadonlyArray<{
  id: HistoryCategory;
  label: string;
}> = [
  { id: 'stt', label: 'Voz a Texto' },
  { id: 'tts', label: 'Texto a Voz' },
  { id: 'diarization', label: 'Diarización' },
  { id: 'summaries', label: 'Resúmenes' },
] as const;
