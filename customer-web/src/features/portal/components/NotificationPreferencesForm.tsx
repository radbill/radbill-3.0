import { type FormEvent } from 'react';
import { Button } from '../../../shared/ui';
import type { NotificationPreferenceFormState } from '../types';

interface NotificationPreferencesFormProps {
  form: NotificationPreferenceFormState;
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  onFieldChange: (field: keyof NotificationPreferenceFormState, value: boolean) => void;
  onBeforeChange: () => void;
  onSubmit: () => Promise<void>;
}

export function NotificationPreferencesForm({
  form,
  loading,
  saving,
  error,
  success,
  onFieldChange,
  onBeforeChange,
  onSubmit,
}: NotificationPreferencesFormProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      <label className="portal-checkbox">
        <input
          type="checkbox"
          checked={form.pushEnabled}
          disabled={loading || saving}
          onChange={(event) => {
            onBeforeChange();
            onFieldChange('pushEnabled', event.target.checked);
          }}
        />
        <span>
          <strong>Push Browser</strong>
          <small className="text-muted">Dicoba lebih dulu ke browser yang sudah Anda aktifkan untuk menerima notifikasi.</small>
        </span>
      </label>

      <label className="portal-checkbox">
        <input
          type="checkbox"
          checked={form.whatsAppEnabled}
          disabled={loading || saving}
          onChange={(event) => {
            onBeforeChange();
            onFieldChange('whatsAppEnabled', event.target.checked);
          }}
        />
        <span>
          <strong>WhatsApp Fallback</strong>
          <small className="text-muted">Dipakai jika push gagal atau tidak tersedia, selama nomor WhatsApp Anda sudah opt-in dan bisa menerima pesan.</small>
        </span>
      </label>

      <label className="portal-checkbox">
        <input
          type="checkbox"
          checked={form.emailEnabled}
          disabled={loading || saving}
          onChange={(event) => {
            onBeforeChange();
            onFieldChange('emailEnabled', event.target.checked);
          }}
        />
        <span>
          <strong>Email Fallback</strong>
          <small className="text-muted">Dipakai sebagai fallback terakhir bila channel sebelumnya gagal atau tidak tersedia.</small>
        </span>
      </label>

      {error && <div className="portal-alert portal-alert--error">{error}</div>}
      {success && <div className="portal-alert portal-alert--success">{success}</div>}

      <div className="portal-form__actions">
        <Button type="submit" isLoading={saving} disabled={loading}>
          Simpan Preferensi
        </Button>
      </div>
    </form>
  );
}
