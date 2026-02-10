
import { Link } from 'react-router-dom';
import { Shield, Lock, Zap, Globe, MessageSquare, Key } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F0F23] text-white overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#0F0F23]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-pink-500" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
                CipherChat
              </span>
            </div>
            <div className="flex gap-4">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-[100px]" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8">
            <span className="block text-white">Private Messaging.</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
              Zero Knowledge.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-white/60 mb-10">
            End-to-end encrypted chat where only you and your recipient hold the keys. 
            No server-side decryption. No compromises.
          </p>
          
          <div className="flex justify-center gap-6">
            <Link to="/register" className="px-8 py-4 text-lg font-bold bg-white text-purple-900 rounded-xl hover:bg-gray-100 transition-colors shadow-xl">
              Create Secure Vault
            </Link>
            <Link to="/login" className="px-8 py-4 text-lg font-bold bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-colors">
              Access Vault
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Lock className="w-8 h-8 text-pink-400" />}
              title="E2E Encryption"
              description="Messages are encrypted on your device using AES-256-GCM before they ever touch our servers."
            />
            <FeatureCard 
              icon={<Key className="w-8 h-8 text-purple-400" />}
              title="Client-Side Keys"
              description="Your private key is encrypted with your password. We never see your password or your raw keys."
            />
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-indigo-400" />}
              title="Instant & Secure"
              description="Real-time delivery with ephemeral sessions. No persistent logs, no tracking."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-white/40">
        <p>&copy; 2026 CipherChat. Built for privacy.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors">
      <div className="mb-4 p-3 bg-white/5 rounded-lg inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-white/60 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
