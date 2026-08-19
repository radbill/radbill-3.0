import { type FormEvent } from 'react';
import { Button, Input } from '../../../shared/ui';
import type { ProfileFormState } from '../types';

interface ProfileFormProps {
  form: ProfileFormState;
  saving: boolean;
  error: string;
  success: string;
  onFieldChange: (field: keyof ProfileFormState, value: string) => void;
  onBeforeChange: () => void;
  onSubmit: () => Promise<void>;
}

export function ProfileForm({
  form,
  saving,
  error,
  success,
  onFieldChange,
  onBeforeChange,
  onSubmit,
}: ProfileFormProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      <Input
        label="Nama"
        value={form.name}
        onChange={(event) => {
          onBeforeChange();
          onFieldChange('name', event.target.value);
        }}
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(event) => {
          onBeforeChange();
          onFieldChange('email', event.target.value);
        }}
      />
      <Input
        label="Nomor HP"
        value={form.phone}
        onChange={(event) => {
          onBeforeChange();
          onFieldChange('phone', event.target.value);
        }}
      />
      <Input
        label="Alamat"
        value={form.address}
        onChange={(event) => {
          onBeforeChange();
          onFieldChange('address', event.target.value);
        }}
      />

      {error && <div className="portal-alert portal-alert--error">{error}</div>}
      {success && <div className="portal-alert portal-alert--success">{success}</div>}

      <div className="portal-form__actions">
        <Button type="submit" isLoading={saving}>
          Simpan Profil
        </Button>
      </div>
    </form>
  );
}
