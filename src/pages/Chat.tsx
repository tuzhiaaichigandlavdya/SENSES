
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { deriveSharedSecret, encryptMessage, decryptMessage } from '@/lib/crypto';
import { LogOut, Send, Search, User, Lock, Loader2, Settings, X, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_username: string;
  recipient_username: string;
  encrypted_content: string;
  iv: string;
  created_at: string;
  decryptedContent?: string;
  is_read: boolean;
}

interface ChatUser {
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  public_key?: string;
  is_online?: boolean;
}

export default function Chat() {
  const { user, privateKey, logout, setAuth, token } = useAuthStore();
  
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [sending, setSending] = useState(false);

  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<any>(null);

  // 1. Load Conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<{ conversations: ChatUser[] }>('/messages/conversations');
      setConversations(data.conversations || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    // Refresh conversations every 30s
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // 2. Handle Search
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const data = await api.get<{ users: ChatUser[] }>(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.users || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 3. Select User & Derive Key
  const handleSelectUser = async (chatUser: ChatUser) => {
    setSelectedUser(chatUser);
    setSearchQuery(''); // Clear search
    setSearchResults([]);
    setMessages([]); // Clear previous messages while loading
    setSharedKey(null);

    try {
      // If user comes from conversation list, we might not have public_key if API didn't return it
      // So fetch full profile to be sure
      const profile = await api.get<{ user: ChatUser }>(`/users/${chatUser.username}`);
      const fullUser = profile.user;
      
      if (fullUser.public_key && privateKey) {
        const key = await deriveSharedSecret(privateKey, fullUser.public_key);
        setSharedKey(key);
        // Add to conversations if not present
        if (!conversations.find(c => c.username === fullUser.username)) {
            setConversations(prev => [fullUser, ...prev]);
        }
      } else {
          console.error("Missing keys");
      }
    } catch (e) {
      console.error("Failed to setup chat", e);
    }
  };

  // 4. Poll Messages & Decrypt
  useEffect(() => {
    if (!selectedUser || !sharedKey) return;

    const fetchMessages = async () => {
      try {
        // In a real app, track 'since' timestamp. For demo, fetch last 100.
        const data = await api.get<{ messages: Message[] }>('/messages/receive');
        
        // Filter for current chat
        const relevantMessages = data.messages.filter(
            m => m.sender_username === selectedUser.username || m.recipient_username === selectedUser.username
        );

        // Decrypt
        const decryptedPromises = relevantMessages.map(async (msg) => {
            try {
                if (msg.decryptedContent) return msg; // Already decrypted
                const decrypted = await decryptMessage(msg.encrypted_content, msg.iv, sharedKey);
                return { ...msg, decryptedContent: decrypted };
            } catch (e) {
                console.error("Decryption failed", e);
                return { ...msg, decryptedContent: "⚠️ Decryption Failed" };
            }
        });

        const decryptedMsgs = await Promise.all(decryptedPromises);
        
        // Update state if different
        setMessages(prev => {
            if (prev.length !== decryptedMsgs.length || decryptedMsgs.some((m, i) => m.id !== prev[i]?.id)) {
                return decryptedMsgs;
            }
            return prev;
        });

      } catch (e) {
        console.error(e);
      }
    };

    fetchMessages();
    pollingInterval.current = setInterval(fetchMessages, 3000); // Poll every 3s

    return () => clearInterval(pollingInterval.current);
  }, [selectedUser, sharedKey]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. Send Message
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim() || !selectedUser || !sharedKey) return;

    setSending(true);
    try {
      const { ciphertext, iv } = await encryptMessage(messageInput, sharedKey);
      
      await api.post('/messages/send', {
        recipient: selectedUser.username,
        encrypted_content: ciphertext,
        iv: iv
      });

      // Optimistic update
      const newMsg: Message = {
          id: 'temp-' + Date.now(),
          sender_username: user?.username || '',
          recipient_username: selectedUser.username,
          encrypted_content: ciphertext,
          iv: iv,
          created_at: new Date().toISOString(),
          decryptedContent: messageInput,
          is_read: false
      };
      
      setMessages(prev => [...prev, newMsg]);
      setMessageInput('');
    } catch (e) {
      console.error(e);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const openProfileModal = () => {
      setEditDisplayName(user?.display_name || '');
      setEditBio(user?.bio || '');
      setEditAvatarUrl(user?.avatar_url || '');
      setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
      setSavingProfile(true);
      try {
          await api.put('/users/profile', {
              display_name: editDisplayName,
              bio: editBio,
              avatar_url: editAvatarUrl
          });
          
          // Update local store
          if (user && token && privateKey) {
              setAuth({
                  ...user,
                  display_name: editDisplayName,
                  bio: editBio,
                  avatar_url: editAvatarUrl
              }, token, privateKey);
          }
          setShowProfileModal(false);
      } catch (e) {
          console.error(e);
          alert("Failed to update profile");
      } finally {
          setSavingProfile(false);
      }
  };

  return (
    <div className="flex h-screen bg-[#0F0F23] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-black/20 border-r border-white/10 flex flex-col backdrop-blur-sm">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={openProfileModal}>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-sm overflow-hidden">
               {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user?.display_name[0]}
             </div>
             <span className="font-medium truncate max-w-[120px]">{user?.display_name}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={openProfileModal} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Settings">
                <Settings className="w-5 h-5 text-white/60" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Logout">
                <LogOut className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-pink-500/50 text-white placeholder-white/30"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 animate-spin" />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
             <div className="space-y-1">
                 <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Search Results</div>
                 {searchResults.map(u => (
                     <div 
                        key={u.username}
                        onClick={() => handleSelectUser(u)}
                        className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                     >
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 overflow-hidden">
                             {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{u.display_name}</div>
                            <div className="text-xs text-white/40 truncate">@{u.username}</div>
                        </div>
                     </div>
                 ))}
                 {searchResults.length === 0 && !isSearching && (
                     <div className="px-4 py-3 text-sm text-white/40 text-center">No users found</div>
                 )}
             </div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">Recent Chats</div>
              {conversations.map((conv) => (
                <div 
                    key={conv.username}
                    className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${selectedUser?.username === conv.username ? 'bg-white/10 border-r-2 border-pink-500' : 'hover:bg-white/5'}`}
                    onClick={() => handleSelectUser(conv)}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                        {conv.avatar_url ? <img src={conv.avatar_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-white/60" />}
                        {conv.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0F0F23]"></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{conv.display_name}</div>
                        <div className="text-xs text-white/40 truncate flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Encrypted
                        </div>
                    </div>
                </div>
              ))}
              {conversations.length === 0 && (
                  <div className="p-8 text-center text-white/20 text-sm flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-50" />
                      <p>Search for a username to start a secure conversation.</p>
                  </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0F0F23] to-[#1a1a2e] relative">
        {selectedUser ? (
            <>
                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5 backdrop-blur-md shadow-sm z-10">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                         {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="font-bold flex items-center gap-2">
                            {selectedUser.display_name}
                            <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[10px] border border-pink-500/20 font-mono">
                                E2EE
                            </span>
                        </div>
                        <div className="text-xs text-white/40">
                            @{selectedUser.username}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex justify-center my-4">
                        <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/40 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Messages are end-to-end encrypted
                        </span>
                    </div>
                    
                    {messages.map((msg) => {
                        const isMe = msg.sender_username === user?.username;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${isMe ? 'bg-gradient-to-br from-pink-600 to-purple-700 text-white rounded-tr-sm' : 'bg-white/10 border border-white/5 text-white rounded-tl-sm'}`}>
                                    <div className="text-sm break-words">
                                        {msg.decryptedContent || <span className="italic opacity-50 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Decrypting...</span>}
                                    </div>
                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-white/40'}`}>
                                        {format(new Date(msg.created_at), 'HH:mm')}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white/5 border-t border-white/10">
                    <form onSubmit={handleSend} className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a secure message..."
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-pink-500/50 text-white placeholder-white/30"
                            disabled={!sharedKey}
                        />
                        <button 
                            type="submit" 
                            disabled={!messageInput.trim() || sending || !sharedKey}
                            className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 animate-pulse">
                    <Lock className="w-10 h-10 opacity-50" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-white/40">CipherChat</h2>
                <p className="max-w-md text-center px-4">
                    Select a contact from the sidebar or search for a user to start a secure, end-to-end encrypted conversation.
                </p>
            </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Edit Profile</h3>
                      <button onClick={() => setShowProfileModal(false)} className="text-white/60 hover:text-white">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Display Name</label>
                          <input 
                              type="text" 
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Avatar URL</label>
                          <input 
                              type="text" 
                              value={editAvatarUrl}
                              onChange={(e) => setEditAvatarUrl(e.target.value)}
                              placeholder="https://example.com/avatar.jpg"
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Bio</label>
                          <textarea 
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[100px]"
                          />
                      </div>
                      
                      <div className="pt-4 flex justify-end gap-2">
                          <button 
                              onClick={() => setShowProfileModal(false)}
                              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleSaveProfile}
                              disabled={savingProfile}
                              className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 font-bold flex items-center gap-2"
                          >
                              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save Changes
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
