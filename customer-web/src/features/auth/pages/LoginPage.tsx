import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, fetchPublicApi } from '../../../shared/api';
import { Button, Input } from '../../../shared/ui';
import './LoginPage.css';
import { ServiceContact } from '../../../shared/ui/ServiceContact';
import { TurnstileWidget } from '../../../shared/ui/TurnstileWidget';

interface RequestOTPResult {
  sent: boolean;
  bypass?: boolean;
  otp_hint?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaConfig, setCaptchaConfig] = useState<{ captcha_enabled: boolean; captcha_site_key: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchPublicApi<{ captcha_enabled: boolean; captcha_site_key: string }>('/customer/config')
      .then((response) => setCaptchaConfig(response.data))
      .catch(() => setError('Konfigurasi verifikasi keamanan gagal dimuat. Muat ulang halaman.'));
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Email wajib diisi');
      return;
    }
    if (!captchaConfig) return;
    if (captchaConfig.captcha_enabled && !captchaToken) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi<RequestOTPResult>('/customer/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email, captcha_token: captchaToken || undefined })
      });
      
      // Navigate to OTP verification with email state
      navigate('/verify-otp', {
        state: {
          email,
          otpHint: response.data.otp_hint,
          otpBypass: response.data.bypass === true,
        },
      });
    } catch (err: any) {
      setError(err.message);
      if (captchaConfig.captcha_enabled) setCaptchaResetKey((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-shell">
        <section className="glass-card auth-card">
          <div className="auth-card__head">
            <span className="auth-card__eyebrow">Portal Pelanggan</span>
            <h2 className="auth-card__title">Masukkan email pelanggan</h2>
            <p className="auth-card__description">
              Kami akan mengirim kode OTP ke email yang terdaftar pada akun pelanggan Anda.
            </p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <Input
              type="email"
              placeholder="nama@email.com"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />
            {captchaConfig?.captcha_enabled ? (
              <TurnstileWidget siteKey={captchaConfig.captcha_site_key} resetKey={captchaResetKey} onToken={setCaptchaToken} />
            ) : null}
            <Button type="submit" isLoading={loading} disabled={!captchaConfig || (captchaConfig.captcha_enabled && !captchaToken)}>
              Kirim Kode OTP
            </Button>
          </form>

          <div className="auth-note">
            Pastikan email sesuai data pelanggan. Jika salah, kode OTP tidak akan masuk ke akun Anda.
          </div>
          <ServiceContact />
        </section>
      </div>
    </div>
  );
}
