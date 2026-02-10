
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User as UserIcon, Shield, Unlock } from 'lucide-react';
import { api } from '../lib/api';
import { decryptPrivateKey } from '../lib/crypto';
import { useAuthStore, User } from '../store/authStore';

interface LoginResponse {
  user: User;
  token: string;
  encrypted_private_key: string;
}

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'decrypt'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Login API
      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password
      });

      setStep('decrypt');

      // 2. Decrypt Private Key
      // Add a small delay to show the UI state (optional, for UX)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const privateKey = await decryptPrivateKey(response.encrypted_private_key, password);

      // 3. Set State
      setAuth(response.user, response.token, privateKey);
      
      navigate('/chat');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Check your credentials.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl text-white">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-white/60">Sign in to decrypt your messages</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 'decrypt' ? (
          <div className="text-center py-8 space-y-4">
            <div className="animate-bounce inline-block">
              <Unlock className="w-12 h-12 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold">Decrypting Vault...</h3>
            <p className="text-white/60 text-sm">
              Unlocking your private key using your password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="unique_username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              Unlock & Sign In
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-white/60">
          New here?{' '}
          <Link to="/register" className="text-pink-400 hover:text-pink-300 font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
