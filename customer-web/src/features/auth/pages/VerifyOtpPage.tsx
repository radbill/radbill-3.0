import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../shared/api';
import { Button, Input } from '../../../shared/ui';
import './VerifyOtpPage.css';

interface VerifyOTPResult {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const otpHint = location.state?.otpHint as string | undefined;
  const otpBypass = location.state?.otpBypass === true;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length < 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi<VerifyOTPResult>('/customer/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp_code: otp }),
      });

      localStorage.setItem('customer_access_token', response.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-shell">
        <section className="glass-card auth-card">
          <div className="auth-card__head">
            <span className="auth-card__eyebrow">Verifikasi OTP</span>
            <h2 className="auth-card__title">Verifikasi kode OTP</h2>
            <p className="auth-card__description">
              Masukkan kode 6 digit yang Anda terima melalui email untuk melanjutkan ke portal pelanggan.
            </p>
            <div className="auth-otp-mail auth-otp-mail--inline">
              <span>Email tujuan</span>
              <strong>{email}</strong>
            </div>
            {otpBypass ? (
              <p className="auth-card__description">
                Mode testing aktif. Gunakan kode OTP <strong>{otpHint || '000000'}</strong>.
              </p>
            ) : null}
          </div>

          <form onSubmit={handleVerify} className="auth-form">
            <Input
              type="text"
              maxLength={6}
              placeholder="• • • • • •"
              className="text-center text-h2 otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              error={error}
              label="Kode OTP"
            />
            <Button type="submit" isLoading={loading}>
              Verifikasi & Masuk
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/login')}>
              Ganti Email
            </Button>
          </form>

          <div className="auth-note">
            {otpBypass
              ? 'Mode bypass OTP aktif. Email OTP tidak dikirim selama mode testing ini dinyalakan.'
              : 'Jika kode tidak cocok atau sudah kedaluwarsa, kembali ke halaman sebelumnya untuk meminta OTP baru.'}
          </div>
        </section>
      </div>
    </div>
  );
}
