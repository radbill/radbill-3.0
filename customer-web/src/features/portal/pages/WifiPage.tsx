import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Barcode,
  CircleAlert,
  CircleCheck,
  Clock,
  Cpu,
  Info,
  KeyRound,
  Laptop,
  RefreshCw,
  Router,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { ApiError, fetchApi } from '../../../shared/api';
import { Button, Input } from '../../../shared/ui';
import { PortalEmptyState } from '../components/PortalEmptyState';

type NetworkDevice = {
  id: string;
  serial_number?: string;
  manufacturer?: string;
  model_name?: string;
  device_profile_name?: string;
  wifi_snapshot: Record<string, string>;
  last_inform_at?: string;
  connectivity_status: "online" | "offline" | "unknown";
};
type WiFiChangeResult = { status: "applied" | "queued"; acs_task_id?: string };
type ConnectedClient = {
  instance: string;
  mac_address?: string;
  ip_address?: string;
  host_name?: string;
  authentication_state?: string;
  active: boolean;
  interface_type?: string;
};
type ConnectedClientsResult = {
  device_id: string;
  last_inform_at?: string;
  retrieved_at: string;
  networks: Array<{
    key: string;
    label: string;
    ssid?: string;
    clients: ConnectedClient[];
  }>;
};

function WifiFieldLabel({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <span className="portal-wifi-field__label">
      <Icon aria-hidden="true" />
      {children}
    </span>
  );
}

export default function WifiPage() {
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState("");
  const [networkKey, setNetworkKey] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [activeTab, setActiveTab] = useState<'settings' | 'devices'>('settings');
  const [connectedNetworkKey, setConnectedNetworkKey] = useState('');
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const devices = useQuery({
    queryKey: ["customer", "network-devices"],
    queryFn: () =>
      fetchApi<NetworkDevice[]>("/customer/network-devices").then(
        (r) => r.data,
      ),
  });
  const selected = useMemo(
    () => devices.data?.find((d) => d.id === deviceId) ?? devices.data?.[0],
    [devices.data, deviceId],
  );
  const connectedClients = useQuery({
    queryKey: ['customer', 'network-devices', selected?.id, 'connected-clients'],
    queryFn: () =>
      fetchApi<ConnectedClientsResult>(
        `/customer/network-devices/${encodeURIComponent(selected!.id)}/connected-clients`,
      ).then((response) => response.data),
    enabled: activeTab === 'devices' && Boolean(selected?.id),
  });
  const networks = useMemo(
    () => Object.entries(selected?.wifi_snapshot ?? {}),
    [selected],
  );
  useEffect(() => {
    if (selected && !deviceId) setDeviceId(selected.id);
  }, [selected, deviceId]);
  useEffect(() => {
    if (networks.length && !networks.some(([key]) => key === networkKey)) {
      setNetworkKey(networks[0][0]);
      setSsid(networks[0][1]);
    }
  }, [networks, networkKey]);
  useEffect(() => {
    const availableNetworks = connectedClients.data?.networks ?? [];
    if (availableNetworks.length && !availableNetworks.some((network) => network.key === connectedNetworkKey)) {
      setConnectedNetworkKey(availableNetworks[0].key);
    }
  }, [connectedClients.data, connectedNetworkKey]);
  const mutation = useMutation({
    mutationFn: () =>
      fetchApi<WiFiChangeResult>(
        `/customer/network-devices/${encodeURIComponent(selected!.id)}/wifi-credentials`,
        {
          method: "POST",
          body: JSON.stringify({ network_key: networkKey, ssid, password }),
        },
      ).then((r) => r.data),
    onSuccess: (op) => {
      setSuccess(
        op.status === "applied"
          ? "Perubahan Wi-Fi berhasil diterapkan. Sambungkan kembali perangkat Anda."
          : "Perubahan telah dikirim dan akan diterapkan saat perangkat kembali terhubung.",
      );
      setPassword("");
      setConfirm("");
      void queryClient.invalidateQueries({ queryKey: ["customer", "network-devices"] });
    },
    onError: (e) => setError(message(e)),
  });
  const connectedNetworks = connectedClients.data?.networks ?? [];
  const selectedConnectedNetwork =
    connectedNetworks.find((network) => network.key === connectedNetworkKey) ?? connectedNetworks[0];
  const connectedClientCount = connectedNetworks.reduce((total, network) => total + network.clients.length, 0);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!ssid.trim()) {
      setError("SSID wajib diisi.");
      return;
    }
    if (password.length < 8 || password.length > 63) {
      setError("Password harus terdiri dari 8–63 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    mutation.mutate();
  };
  if (devices.isLoading)
    return (
      <section className="glass-card portal-panel">
        <p className="text-muted">Memuat pengaturan Wi-Fi...</p>
      </section>
    );
  if (devices.isError)
    return (
      <section className="glass-card portal-panel">
        <div className="portal-alert portal-alert--error">
          {message(devices.error)}
        </div>
        <Button onClick={() => void devices.refetch()}>Coba lagi</Button>
      </section>
    );
  if (!devices.data?.length)
    return (
      <section className="glass-card portal-panel">
        <PortalEmptyState
          title="Perangkat Wi-Fi belum tersedia"
          description="Hubungi penyedia layanan agar perangkat TR-069 Anda dihubungkan dan self-service diaktifkan."
        />
      </section>
    );
  return (
    <div className="portal-stack">
      <section className="glass-card portal-panel">
        <div className="portal-panel__header">
          <div>
            <h2 className="text-h2">Pengaturan Wi-Fi</h2>
            <p className="text-muted">
              Kelola nama dan password Wi-Fi, serta lihat perangkat yang terhubung
              ke router Anda.
            </p>
          </div>
        </div>
        <div className="portal-wifi-tabs" role="tablist" aria-label="Menu Wi-Fi">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={activeTab === 'settings' ? 'is-active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            <SlidersHorizontal aria-hidden="true" />
            Pengaturan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'devices'}
            className={activeTab === 'devices' ? 'is-active' : ''}
            onClick={() => setActiveTab('devices')}
          >
            <Cpu aria-hidden="true" />
            Perangkat Terhubung
          </button>
        </div>

        {devices.data.length > 1 && (
          <label className="portal-wifi-field portal-wifi-device-selector">
            <WifiFieldLabel icon={Router}>Router</WifiFieldLabel>
            <select
              value={selected?.id}
              onChange={(event) => {
                setDeviceId(event.target.value);
                setNetworkKey('');
                setConnectedNetworkKey('');
              }}
            >
              {devices.data.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.manufacturer} {device.model_name} · {device.serial_number}
                </option>
              ))}
            </select>
          </label>
        )}

        {activeTab === 'settings' ? (
          <form className="portal-form" role="tabpanel" onSubmit={submit}>
            <div className="portal-alert portal-device-summary">
              <p><Router aria-hidden="true" /><span>Perangkat:</span><strong>{selected?.manufacturer} {selected?.model_name}</strong></p>
              <p><Barcode aria-hidden="true" /><span>Serial:</span><strong>{selected?.serial_number || '-'}</strong></p>
              <p><Clock aria-hidden="true" /><span>Inform terakhir:</span><strong>{formatDate(selected?.last_inform_at)}</strong></p>
              <p>
                {selected?.connectivity_status === 'offline' ? <WifiOff aria-hidden="true" /> : <Wifi aria-hidden="true" />}
                <span>Status:</span><strong>{formatConnectivityStatus(selected?.connectivity_status)}</strong>
              </p>
            </div>
            {networks.length > 1 && (
              <label className="portal-wifi-field">
                <WifiFieldLabel icon={Wifi}>Jaringan</WifiFieldLabel>
                <select
                  value={networkKey}
                  onChange={(event) => {
                    const key = event.target.value;
                    setNetworkKey(key);
                    setSsid(selected?.wifi_snapshot[key] ?? '');
                  }}
                >
                  {networks.map(([key]) => <option key={key} value={key}>{key}</option>)}
                </select>
              </label>
            )}
            <label className="portal-wifi-field">
              <WifiFieldLabel icon={Wifi}>Nama Wi-Fi (SSID)</WifiFieldLabel>
              <Input value={ssid} maxLength={32} onChange={(event) => setSsid(event.target.value)} disabled={mutation.isPending} />
            </label>
            <label className="portal-wifi-field">
              <WifiFieldLabel icon={KeyRound}>Password baru</WifiFieldLabel>
              <Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={mutation.isPending} />
            </label>
            <label className="portal-wifi-field">
              <WifiFieldLabel icon={ShieldCheck}>Konfirmasi password</WifiFieldLabel>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={mutation.isPending} />
            </label>
            <p className="text-muted portal-wifi-note">
              <Info aria-hidden="true" />
              <span>Setelah perubahan diterapkan, semua perangkat akan terputus dan perlu disambungkan kembali menggunakan password baru. Password tidak disimpan di portal.</span>
            </p>
            {error && <div className="portal-alert portal-alert--error"><CircleAlert aria-hidden="true" /><span>{error}</span></div>}
            {success && <div className="portal-alert portal-alert--success"><CircleCheck aria-hidden="true" /><span>{success}</span></div>}
            <div className="portal-form__actions">
              <Button type="submit" isLoading={mutation.isPending}><Save aria-hidden="true" />Simpan perubahan</Button>
            </div>
          </form>
        ) : (
          <div className="portal-connected-devices" role="tabpanel">
            <div className="portal-connected-devices__header">
              <div>
                <strong>{connectedClientCount} perangkat terdeteksi</strong>
                <p className="text-muted">Inform router terakhir: {formatDate(connectedClients.data?.last_inform_at)}</p>
              </div>
              <Button variant="secondary" onClick={() => void connectedClients.refetch()} isLoading={connectedClients.isFetching}>
                <RefreshCw aria-hidden="true" />Muat ulang
              </Button>
            </div>
            {connectedClients.isLoading ? <p className="text-muted">Memuat perangkat terhubung...</p> : null}
            {connectedClients.isError ? (
              <div className="portal-alert portal-alert--error"><CircleAlert aria-hidden="true" /><span>{message(connectedClients.error)}</span></div>
            ) : null}
            {connectedNetworks.length > 1 ? (
              <label className="portal-wifi-field">
                <WifiFieldLabel icon={Wifi}>Jaringan</WifiFieldLabel>
                <select value={selectedConnectedNetwork?.key ?? ''} onChange={(event) => setConnectedNetworkKey(event.target.value)}>
                  {connectedNetworks.map((network) => (
                    <option key={network.key} value={network.key}>{network.label || network.key}{network.ssid ? ` · ${network.ssid}` : ''}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedConnectedNetwork ? (
              <div className="portal-connected-list">
                <div className="portal-connected-list__heading">
                  <Wifi aria-hidden="true" />
                  <span>{selectedConnectedNetwork.label || selectedConnectedNetwork.key}</span>
                  <small>{selectedConnectedNetwork.ssid || '-'}</small>
                </div>
                {selectedConnectedNetwork.clients.length ? selectedConnectedNetwork.clients.map((client) => (
                  <div className="portal-connected-list__row" key={`${selectedConnectedNetwork.key}-${client.instance}-${client.mac_address ?? ''}`}>
                    <Laptop aria-hidden="true" />
                    <div>
                      <strong>{client.host_name || `Perangkat #${client.instance}`}</strong>
                      <span>
                        {client.ip_address || 'IP tidak tersedia'} · {client.mac_address || 'MAC tidak tersedia'} ·{' '}
                        {client.interface_type === 'Ethernet' ? 'Ethernet' : 'Wi-Fi (802.11)'}
                      </span>
                    </div>
                    <span className={`status-chip ${client.active ? 'status-chip--paid' : 'status-chip--void'}`}>
                      {client.active ? 'Aktif' : 'Tidak aktif'}
                    </span>
                  </div>
                )) : <p className="text-muted portal-connected-list__empty">Belum ada perangkat yang dilaporkan pada jaringan ini.</p>}
              </div>
            ) : connectedClients.isSuccess ? (
              <p className="text-muted">Router belum menyediakan data perangkat terhubung.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
function message(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : "Terjadi kesalahan";
}
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Belum tersedia";
}

function formatConnectivityStatus(status?: NetworkDevice['connectivity_status']) {
  if (status === 'online') return 'Online';
  if (status === 'offline') return 'Offline';
  return 'Tidak diketahui';
}
