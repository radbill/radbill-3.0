import { NavLink, Outlet } from "react-router-dom";
import { Button } from '../../../shared/ui';
import { buildPublicApiUrl } from '../../../shared/api/client';
import { PortalSkeleton } from '../components/PortalSkeleton';
import { PortalProvider } from '../PortalProvider';
import { usePortal } from '../usePortal';

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13.5 12 6l8 7.5M7 12.5v6h10v-6" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h8l3 3v12H7zM15 4.5v3h3M9.5 11h5M9.5 14h5M9.5 17h3" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function AddonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 9.5a11 11 0 0 1 15 0M7.5 13a7 7 0 0 1 9 0M10.5 16.5a2.5 2.5 0 0 1 3 0M12 19h.01" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 6.5H7.5A1.5 1.5 0 0 0 6 8v8a1.5 1.5 0 0 0 1.5 1.5H10M14 8.5l4 3.5-4 3.5M18 12H10" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 17.5H9m8-1.5H7l1.1-1.6c.3-.5.4-1 .4-1.6V10a3.5 3.5 0 1 1 7 0v2.8c0 .6.1 1.1.4 1.6L17 16Zm-6.5 1.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

function PortalLayoutInner() {
  const {
    loading,
    me,
    logoutLoading,
    handleLogout,
    screenError,
    pushPromptVisible,
    pushPromptLoading,
    pushPromptError,
    handlePushPromptEnable,
    dismissPushPrompt,
  } = usePortal();

  if (loading) {
    return <PortalSkeleton rows={4} />;
  }

  const brandTitle = me?.branding?.app_title?.trim() || 'RadBill';
  const brandSubtitle = me?.branding?.app_description?.trim() || 'Radius & Billing';
  const rawBrandIconURL = me?.branding?.icon_url?.trim() || '';
  const brandIconURL = rawBrandIconURL
    ? /^(?:https?:|data:)/i.test(rawBrandIconURL)
      ? rawBrandIconURL
      : buildPublicApiUrl(rawBrandIconURL)
    : '';

  return (
    <div className="portal-shell">
      <div className="portal-app">
        <div className="portal-topbar">
          <div className="portal-topbar__brand">
            {brandIconURL ? (
              <img className="portal-brandmark portal-brandmark--image" src={brandIconURL} alt="" />
            ) : (
              <span className="portal-brandmark">RB</span>
            )}
            <div>
              <p className="portal-topbar__brand-title">{brandTitle}</p>
              <span className="portal-topbar__brand-subtitle">{brandSubtitle}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => void handleLogout()}
            isLoading={logoutLoading}
            className="portal-icon-button"
            aria-label="Logout"
            title="Logout"
          >
            <LogoutIcon />
          </Button>
        </div>

        <div className="portal-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `portal-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-nav__icon">
              <OverviewIcon />
            </span>
            Ringkasan
          </NavLink>
          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              `portal-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-nav__icon">
              <InvoiceIcon />
            </span>
            Invoice
          </NavLink>
          <NavLink
            to="/addons"
            className={({ isActive }) =>
              `portal-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-nav__icon">
              <AddonIcon />
            </span>
            Add-on
          </NavLink>
          <NavLink
            to="/wifi"
            className={({ isActive }) =>
              `portal-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-nav__icon">
              <WifiIcon />
            </span>
            Wi-Fi
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `portal-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-nav__icon">
              <ProfileIcon />
            </span>
            Profil
          </NavLink>
        </div>

        <div className="portal-content">
          {screenError && (
            <div className="portal-alert portal-alert--error">
              {screenError}
            </div>
          )}
          {pushPromptVisible && (
            <section className="portal-push-prompt glass-card">
              <div className="portal-push-prompt__icon" aria-hidden="true">
                <BellIcon />
              </div>
              <div className="portal-push-prompt__content">
                <span className="portal-push-prompt__eyebrow">
                  Notifikasi Browser
                </span>
                <h2>Aktifkan notifikasi tagihan dan status layanan?</h2>
                <p>
                  Kami bisa memberi tahu Anda lebih cepat saat ada invoice baru,
                  pengingat jatuh tempo, atau perubahan status layanan.
                </p>
              </div>
              <div className="portal-push-prompt__actions">
                <Button
                  type="button"
                  onClick={() => void handlePushPromptEnable()}
                  isLoading={pushPromptLoading}
                >
                  Aktifkan
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={dismissPushPrompt}
                  disabled={pushPromptLoading}
                >
                  Nanti
                </Button>
              </div>
              {pushPromptError && (
                <div className="portal-alert portal-alert--error">
                  {pushPromptError}
                </div>
              )}
            </section>
          )}
          <Outlet />
        </div>

        <div className="portal-tabbar">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `portal-tabbar__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-tabbar__icon">
              <OverviewIcon />
            </span>
            <span>Ringkasan</span>
          </NavLink>
          <NavLink
            to="/invoices"
            className={({ isActive }) =>
              `portal-tabbar__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-tabbar__icon">
              <InvoiceIcon />
            </span>
            <span>Invoice</span>
          </NavLink>
          <NavLink
            to="/addons"
            className={({ isActive }) =>
              `portal-tabbar__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-tabbar__icon">
              <AddonIcon />
            </span>
            <span>Add-on</span>
          </NavLink>
          <NavLink
            to="/wifi"
            className={({ isActive }) =>
              `portal-tabbar__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-tabbar__icon">
              <WifiIcon />
            </span>
            <span>Wi-Fi</span>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `portal-tabbar__item ${isActive ? "is-active" : ""}`
            }
          >
            <span className="portal-tabbar__icon">
              <ProfileIcon />
            </span>
            <span>Profil</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default function PortalLayout() {
  return (
    <PortalProvider>
      <PortalLayoutInner />
    </PortalProvider>
  );
}
