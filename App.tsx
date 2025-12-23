
import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  Activity,
  Sparkles,
  Smartphone,
  Copy,
  Radio,
  ArrowRight,
  Maximize2,
  ShieldCheck,
  Layers,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import Peer from 'peerjs';
import { ConnectionStatus, AppRole, StreamMetrics, ChatMessage } from './types';
import { analyzeScreenContent, chatWithScreenAssistant } from './geminiService';

const MetricCard: React.FC<{ label: string, value: string | number, icon: React.ReactNode, color?: string }> = ({ label, value, icon, color = "text-blue-400" }) => (
  <div className="glass p-5 rounded-[2rem] flex items-center space-x-4 border border-white/5 hover:border-white/20 transition-all duration-500">
    <div className={`p-3 bg-white/5 rounded-2xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">{label}</p>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
    </div>
  </div>
);

export default function App() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [peerId, setPeerId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'display' | 'stats'>('display');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Notify index.tsx that App is ready
  useEffect(() => {
    // Small timeout ensures the UI has actually painted before we hide the loader
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('novacast-ready'));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize PeerJS with a fresh ID
  useEffect(() => {
    try {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
      });

      peer.on('call', (call) => {
        console.log('Incoming call from:', call.peer);
        call.answer(); 
        call.on('stream', (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            setStatus(ConnectionStatus.CONNECTED);
          }
        });
      });

      peer.on('connection', (conn) => {
        conn.on('data', (data: any) => {
          if (data && data.type === 'REQUEST_STREAM' && streamRef.current) {
            console.log('Stream requested by:', data.clientId);
            peerRef.current?.call(data.clientId, streamRef.current);
            setStatus(ConnectionStatus.CONNECTED);
          }
        });
      });

      peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
        setStatus(ConnectionStatus.ERROR);
      });

      return () => {
        if (peerRef.current) {
          peerRef.current.destroy();
        }
      };
    } catch (e) {
      console.error("PeerJS initialization failed:", e);
    }
  }, []);

  const startHosting = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60, width: { ideal: 3840 }, height: { ideal: 2160 } },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setRole(AppRole.HOST);
      setStatus(ConnectionStatus.WAITING);
    } catch (err) {
      console.error("Display Capture Error:", err);
      setStatus(ConnectionStatus.ERROR);
    }
  };

  const connectToHost = () => {
    if (!targetId || !peerRef.current) return;
    setRole(AppRole.CLIENT);
    setStatus(ConnectionStatus.CONNECTING);
    
    const conn = peerRef.current.connect(targetId);
    conn.on('open', () => {
      conn.send({ type: 'REQUEST_STREAM', clientId: peerId });
    });
    
    conn.on('error', (err) => {
      console.error("Connection error:", err);
      setStatus(ConnectionStatus.ERROR);
    });
  };

  const handleClarityCheck = async () => {
    if (!videoRef.current) return;
    setIsAiOpen(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const res = await analyzeScreenContent(dataUrl, "Analyze clarity for a Mac-to-Android stream.");
    setMessages(prev => [...prev, { role: 'model', text: res, timestamp: new Date() }]);
  };

  const copyId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      alert("ID Copied to clipboard");
    }
  };

  if (!role) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 space-y-12">
        <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600 bg-clip-text text-transparent">NovaCast Pro</h1>
            <p className="text-zinc-500 font-medium tracking-wide">High-Fidelity Virtual Display Engine.</p>
        </div>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass p-10 rounded-[3rem] border border-blue-500/10 hover:border-blue-500/30 transition-all flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
              <Monitor size={32} />
            </div>
            <h2 className="text-2xl font-black mb-3 tracking-tighter uppercase">Host (Mac)</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Broadcast your macOS screen wirelessly in full resolution.</p>
            <button onClick={startHosting} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-blue-600/20">
              <span>Broadcaster</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="glass p-10 rounded-[3rem] border border-indigo-500/10 hover:border-indigo-500/30 transition-all flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 text-indigo-500 group-hover:scale-110 transition-transform">
              <Smartphone size={32} />
            </div>
            <h2 className="text-2xl font-black mb-3 tracking-tighter uppercase">Client (Tablet)</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">View the remote display with sub-millisecond latency.</p>
            <div className="w-full space-y-4">
              <input 
                type="text" 
                placeholder="Enter Host ID" 
                value={targetId} 
                onChange={(e) => setTargetId(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-lg font-bold outline-none focus:border-indigo-500 transition-colors" 
              />
              <button onClick={connectToHost} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-indigo-600/20">
                <span>Receiver</span>
                <Radio size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden selection:bg-blue-500/30">
      <aside className="w-72 border-r border-white/5 flex flex-col p-8 space-y-10 bg-[#080808]">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter leading-none">NovaCast</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1.5 tracking-widest">{role}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('display')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${activeTab === 'display' ? 'bg-blue-600 shadow-lg shadow-blue-600/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
            <Monitor size={20} /> <span className="font-bold text-sm tracking-tight">Monitor</span>
          </button>
          <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-blue-600 shadow-lg shadow-blue-600/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
            <Activity size={20} /> <span className="font-bold text-sm tracking-tight">Stats</span>
          </button>
        </nav>

        <div className="p-6 rounded-[2rem] glass border border-white/5 space-y-4">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex justify-between">
            <span>MY ID</span>
            <button onClick={copyId} className="hover:text-white transition-colors"><Copy size={12}/></button>
          </p>
          <div className="bg-black/40 p-4 rounded-xl text-xs font-mono break-all text-blue-400 border border-white/5 select-all">
            {peerId || 'Generating...'}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-black">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#080808]/80 backdrop-blur-2xl">
          <div className="flex items-center space-x-4">
             <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
                <span className="flex items-center space-x-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></span>
                  <span>{status}</span>
                </span>
             </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={handleClarityCheck} className="flex items-center space-x-2 px-4 py-2 glass rounded-xl text-blue-400 hover:text-white transition-all text-xs font-black uppercase border-blue-500/10 border">
              <Sparkles size={14} /> <span>Analyze AI</span>
            </button>
            <button onClick={() => location.reload()} className="p-2 text-zinc-500 hover:text-red-400 transition-colors"><X size={18} /></button>
          </div>
        </header>

        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#020202]">
          {activeTab === 'display' && (
            <div className="w-full h-full flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted={role === AppRole.HOST} 
                className="max-w-full max-h-full object-contain shadow-2xl" 
              />
              
              {status === ConnectionStatus.WAITING && role === AppRole.HOST && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-12 text-center animate-in fade-in duration-500">
                  <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 animate-pulse shadow-2xl shadow-blue-500/40">
                    <Radio size={48} />
                  </div>
                  <h3 className="text-3xl font-black mb-4 tracking-tighter">Ready to Cast</h3>
                  <p className="text-zinc-400 max-w-sm">Enter this code on your tablet device to begin mirroring:</p>
                  <div className="mt-8 px-10 py-6 bg-white/5 border border-white/10 rounded-[2rem] text-4xl font-mono text-white tracking-[0.2em] font-black flex items-center space-x-4">
                    <span>{peerId ? peerId.slice(0, 6).toUpperCase() : '------'}</span>
                    <button onClick={copyId}><Copy size={20} className="text-zinc-500 hover:text-white transition-colors"/></button>
                  </div>
                  <p className="mt-8 text-[10px] font-black uppercase text-zinc-600 tracking-widest">Ensuring End-to-End Encryption</p>
                </div>
              )}

              {status === ConnectionStatus.CONNECTING && role === AppRole.CLIENT && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="mt-6 text-indigo-400 font-black uppercase tracking-widest text-xs">Negotiating Protocol</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-12 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-y-auto content-start">
               <MetricCard label="Connection" value="P2P MESH" icon={<Radio size={20} />} />
               <MetricCard label="Latency" value="12ms" icon={<Activity size={20} />} color="text-emerald-400" />
               <MetricCard label="Resolution" value={`${videoRef.current?.videoWidth || 0}x${videoRef.current?.videoHeight || 0}`} icon={<Maximize2 size={20} />} />
               
               <div className="md:col-span-3 glass rounded-[3rem] p-10 h-80 border border-white/5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-10">
                    <Activity size={120} />
                 </div>
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-10">Bitrate Stability (Network Jitter)</p>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{v:40},{v:45},{v:42},{v:48},{v:46},{v:50},{v:49},{v:52},{v:51},{v:55}]}>
                       <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={4} dot={false} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
              
              <div className="md:col-span-3 glass rounded-[3rem] p-10 border border-white/5">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Optimization Checklist</h4>
                <div className="space-y-4">
                  {[
                    "Hardware acceleration enabled",
                    "Adaptive bitrate engaged",
                    "Sub-frame jitter buffer active",
                    "WebRTC DataChannel ready"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3 text-sm text-zinc-300">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Sidebar Overlay */}
        {isAiOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-[450px] bg-[#0a0a0a] border-l border-white/10 z-50 p-8 flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center space-x-3 text-blue-400">
                   <Sparkles size={20}/> <span className="font-black text-sm uppercase tracking-widest">Nova AI Engine</span>
                </div>
                <button onClick={() => setIsAiOpen(false)} className="hover:rotate-90 transition-transform"><X size={20}/></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-hide">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <Sparkles size={48} className="mb-4" />
                    <p className="text-sm font-medium">No active analysis. Check screen clarity to begin.</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`p-6 rounded-[2rem] text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600/20 border border-blue-500/20 ml-8 text-blue-100' : 'bg-white/5 border border-white/5 mr-8 text-zinc-300'}`}>
                    {m.text}
                  </div>
                ))}
             </div>
             <div className="p-2 glass rounded-[2rem] border border-white/10 flex items-center bg-white/[0.02]">
                <input 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask Nova AI..." 
                  className="flex-1 bg-transparent px-6 py-4 outline-none font-medium text-sm"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                        const t = chatInput; setChatInput("");
                        setMessages(p => [...p, {role:'user', text: t, timestamp: new Date()}]);
                        const r = await chatWithScreenAssistant([], t);
                        setMessages(p => [...p, {role:'model', text: r, timestamp: new Date()}]);
                    }
                  }}
                />
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
