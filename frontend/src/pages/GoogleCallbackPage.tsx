import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userId = params.get('user_id');

    if (accessToken && refreshToken && userId) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      toast.success('Logged in with Google! 🎉');
      
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect') || '/dashboard';
      
      window.location.hash = '';
      window.location.replace(redirect);
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      const error = searchParams.get('error');
      if (error) {
        toast.error(`Google OAuth failed: ${error}`);
      } else {
        toast.error('Google OAuth failed - no tokens received');
      }
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  return null;
}