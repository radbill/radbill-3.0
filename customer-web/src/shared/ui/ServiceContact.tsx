import { useEffect, useState } from 'react';
import { fetchPublicApi } from '../api';
import './ServiceContact.css';

interface PublicContact {
  contact_phone?: string;
  contact_email?: string;
  contact_whatsapp_url?: string;
}

export function ServiceContact() {
  const [contact, setContact] = useState<PublicContact>();

  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicApi<PublicContact>('/public/hotspot/voucher-branding', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setContact(data); })
      .catch(() => { /* Contact availability must not block customer access. */ });
    return () => controller.abort();
  }, []);

  if (!contact?.contact_phone && !contact?.contact_email) return null;

  return (
    <aside className="service-contact" aria-label="Kontak layanan">
      <strong>Butuh bantuan? Hubungi admin</strong>
      {contact.contact_phone ? (
        contact.contact_whatsapp_url ? (
          <a href={contact.contact_whatsapp_url} target="_blank" rel="noopener noreferrer">
            WhatsApp: {contact.contact_phone}
          </a>
        ) : <span>Telepon: {contact.contact_phone}</span>
      ) : null}
      {contact.contact_email ? (
        <a href={`mailto:${contact.contact_email}`}>Email: {contact.contact_email}</a>
      ) : null}
    </aside>
  );
}
