import React, { useEffect, useState } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [status, setStatus] = useState('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!uid || !token) {
      setStatus('error');
      setErrorMessage('This verification link is missing required parameters.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await authService.verifyEmail(uid, token);
        if (cancelled) return;

        if (data.tokens && data.user) {
          loginWithTokens(data.tokens, data.user);
          // Brief pause so the user sees the success state before redirect
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        } else {
          // Fallback: already verified or old token without tokens in response
          setTimeout(() => navigate('/signin', { replace: true }), 1500);
        }
        setStatus('success');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(err.response?.data?.detail || err.message || 'This verification link is invalid or has expired.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uid, token, loginWithTokens, navigate]);

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center p-4 bg-light" style={{ fontFamily: 'sans-serif' }}>
      <div className="w-100 bg-white rounded-4 shadow-sm p-4 p-sm-5 text-center" style={{ maxWidth: '420px' }}>
        <div
          className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-4"
          style={{ width: '48px', height: '48px', backgroundColor: '#3B82F6', fontSize: '18px' }}
        >
          O
        </div>

        {status === 'verifying' && (
          <>
            <Loader2 size={40} className="text-primary mb-3 spin-icon" />
            <h2 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '22px' }}>Verifying your email...</h2>
            <p className="text-muted small mb-0">Just a moment while we confirm your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-3" style={{ fontSize: '40px' }}>✅</div>
            <h2 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '22px' }}>Email verified!</h2>
            <p className="text-muted small mb-0">Taking you to your dashboard...</p>
            <div className="mt-3">
              <Loader2 size={20} className="text-primary spin-icon" />
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-danger mb-3" />
            <h2 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '22px' }}>Verification failed</h2>
            <p className="text-muted small mb-4">{errorMessage}</p>
            <Link
              to="/signin"
              className="btn btn-outline-secondary w-100 py-2 rounded-3 fw-medium"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>

      <style>{`
        .spin-icon {
          animation: spinIcon 1s linear infinite;
        }
        @keyframes spinIcon {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VerifyEmailPage;
