import { Injectable, signal } from '@angular/core';

export type ConfirmVariant = 'primary' | 'danger';

export type ConfirmRequest = {
  title?: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

export type ConfirmState = {
  open: boolean;
  title: string;
  text: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmVariant;
};

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  // Estado observable para el Host
  readonly state = signal<ConfirmState>({
    open: false,
    title: 'Confirmar',
    text: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'primary',
  });

  private resolver: ((value: boolean) => void) | null = null;

  ask(req: ConfirmRequest): Promise<boolean> {
    // Si había uno abierto, lo cancelamos (evita estados raros)
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }

    this.state.set({
      open: true,
      title: req.title ?? 'Confirmar',
      text: req.text,
      confirmText: req.confirmText ?? 'Confirmar',
      cancelText: req.cancelText ?? 'Cancelar',
      variant: req.variant ?? 'primary',
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirm(): void {
    if (this.resolver) this.resolver(true);
    this.resolver = null;
    this.close();
  }

  cancel(): void {
    if (this.resolver) this.resolver(false);
    this.resolver = null;
    this.close();
  }

  private close(): void {
    const prev = this.state();
    this.state.set({ ...prev, open: false });
  }
}
