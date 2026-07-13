import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const userId = params.get('user_id');
      const userName = params.get('user_name');
      const userEmail = params.get('user_email');
      const userAvatar = params.get('user_avatar');

      if (accessToken && refreshToken && userId) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        const user = {
          id: userId,
          name: userName,
          email: userEmail,
          avatarUrl: userAvatar || undefined
        };
        
        toast.success('Logged in with Google! 🎉');
        
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
        navigate(redirect, { replace: true });
      } else {
        const error = searchParams.get('error');
        if (error) {
          toast.error(`Google OAuth failed: ${error}`);
        } else {
          toast.error('Google OAuth failed - no tokens received');
        }
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0b0e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />
      
      <div style={{
        position: 'fixed', zIndex: 0, pointerEvents: 'none',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '400px',
        margin: '0 var(--space-lg)',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '32px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="31.4" style={{ animation: 'spin 1s linear infinite' }}>
                <animate attributeName="strokeDashoffset" from="31.4" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f5f5f7' }}>Completing sign in...</span>
        </div>
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}