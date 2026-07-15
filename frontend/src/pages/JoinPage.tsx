import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    if (!token) {
      toast.error('Invalid invite link');
      navigate('/');
      return;
    }
    triggered.current = true;

    api.post('/workspaces/join', { token })
      .then(() => {
        toast.success('Successfully joined workspace! 🎉');
      })
      .catch((err) => {
        toast.error(err?.response?.data?.error?.message || 'Failed to join workspace');
      })
      .finally(() => {
        navigate('/');
      });
  }, [token, navigate]);

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07070a', fontFamily: 'Inter, sans-serif', color: '#f5f5f7'
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#a855f7',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13.5px', fontWeight: 500, margin: 0 }}>
          Joining workspace, please wait...
        </p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
