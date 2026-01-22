import { Injectable } from '@angular/core';

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private prefix = 'escriba.session.';

  getString(key: string, fallback = ''): string {
    const v = sessionStorage.getItem(this.prefix + key);
    return v === null ? fallback : v;
  }

  setString(key: string, value: string): void {
    sessionStorage.setItem(this.prefix + key, value ?? '');
  }

  getBool(key: string, fallback = false): boolean {
    const v = sessionStorage.getItem(this.prefix + key);
    if (v === null) return fallback;
    return v === 'true';
  }

  setBool(key: string, value: boolean): void {
    sessionStorage.setItem(this.prefix + key, value ? 'true' : 'false');
  }

  getJson<T extends JsonValue>(key: string, fallback: T): T {
    const raw = sessionStorage.getItem(this.prefix + key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setJson(key: string, value: JsonValue): void {
    sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }

  clearAll(): void {
    // borra solo lo nuestro
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(this.prefix)) keys.push(k);
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  }
}
