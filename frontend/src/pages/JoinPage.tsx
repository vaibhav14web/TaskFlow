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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto var(--space-lg)' }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)', fontWeight: 500 }}>
          Joining workspace, please wait...
        </p>
      </div>
    </div>
  );
}
