import { NotificationPreferencesForm } from '../components/NotificationPreferencesForm';
import { ProfileForm } from '../components/ProfileForm';
import { usePortal } from '../usePortal';

export default function ProfilePage() {
  const {
    profileForm,
    profileSaving,
    profileError,
    profileSuccess,
    notificationPreferences,
    notificationPreferenceLoading,
    notificationPreferenceSaving,
    notificationPreferenceError,
    notificationPreferenceSuccess,
    setProfileField,
    clearProfileMessages,
    setNotificationPreferenceField,
    clearNotificationPreferenceMessages,
    handleProfileSubmit,
    handleNotificationPreferenceSubmit,
  } = usePortal();

  return (
    <div className="portal-stack">
      <section className="glass-card portal-panel">
        <div className="portal-panel__header">
          <div>
            <h2 className="text-h2">Perbarui Profil</h2>
            <p className="text-muted">Anda bisa mengubah data kontak yang dipakai portal pelanggan.</p>
          </div>
        </div>
        <ProfileForm
          form={profileForm}
          saving={profileSaving}
          error={profileError}
          success={profileSuccess}
          onFieldChange={setProfileField}
          onBeforeChange={clearProfileMessages}
          onSubmit={handleProfileSubmit}
        />
      </section>
      <section className="glass-card portal-panel">
        <div className="portal-panel__header">
          <div>
            <h2 className="text-h2">Preferensi Notifikasi</h2>
            <p className="text-muted">Push dicoba lebih dulu, lalu WhatsApp dan Email dipakai sebagai fallback berurutan bila channel sebelumnya gagal atau tidak tersedia.</p>
          </div>
        </div>
        <NotificationPreferencesForm
          form={notificationPreferences}
          loading={notificationPreferenceLoading}
          saving={notificationPreferenceSaving}
          error={notificationPreferenceError}
          success={notificationPreferenceSuccess}
          onFieldChange={setNotificationPreferenceField}
          onBeforeChange={clearNotificationPreferenceMessages}
          onSubmit={handleNotificationPreferenceSubmit}
        />
      </section>
    </div>
  );
}
