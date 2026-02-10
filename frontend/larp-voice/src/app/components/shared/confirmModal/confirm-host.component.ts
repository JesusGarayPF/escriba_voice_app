import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ConfirmModalComponent } from './confirm-modal.component';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-host',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  template: `
    <app-confirm-modal
      [open]="svc.state().open"
      [title]="svc.state().title"
      [text]="svc.state().text"
      [confirmText]="svc.state().confirmText"
      [cancelText]="svc.state().cancelText"
      [variant]="svc.state().variant"
      (confirm)="svc.confirm()"
      (cancel)="svc.cancel()"
    />
  `,
})
export class ConfirmHostComponent {
  svc = inject(ConfirmService);
}
