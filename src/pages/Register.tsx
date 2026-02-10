
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Shield, Key } from 'lucide-react';
import { api } from '../lib/api';
import { generateKeyPair, encryptPrivateKey } from '../lib/crypto';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'keys'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStep('keys');

    try {
      // 1. Generate Keys
      const keyPair = await generateKeyPair();
      
      // 2. Encrypt Private Key
      const encryptedPrivateKey = await encryptPrivateKey(keyPair.privateKey, password);
      
      // 3. Register API
      const response = await api.post('/auth/register', {
        username,
        display_name: displayName,
        password,
        public_key: keyPair.publicKey,
        encrypted_private_key: encryptedPrivateKey
      });

      // 4. Set State
      setAuth(response.user, response.token, keyPair.privateKey);
      
      navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-white/60">Secure, end-to-end encrypted messaging</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 'keys' ? (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin inline-block">
              <Key className="w-12 h-12 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold">Generating Crypto Keys...</h3>
            <p className="text-white/60 text-sm">
              Creating your unique 256-bit encryption keys locally.
              <br />
              Your private key never leaves your device unencrypted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
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
              <label className="block text-sm font-medium text-white/80 mb-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Your Name"
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
                  minLength={8}
                />
              </div>
              <p className="text-xs text-white/40 mt-1 ml-1">
                Used to encrypt your private key. Don't forget it!
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              Start Encrypted Chat
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-white/60">
          Already have an account?{' '}
          <Link to="/login" className="text-pink-400 hover:text-pink-300 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
