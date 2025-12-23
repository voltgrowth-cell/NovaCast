
import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  Settings, 
  Zap, 
  Wifi, 
  Usb, 
  Cpu, 
  MessageSquare, 
  Maximize2, 
  Activity,
  Play,
  Layers,
  Sparkles,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  X,
  Info,
  CheckCircle2,
  Copy,
  Radio,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  YAxis, 
  XAxis, 
  Tooltip 
} from 'recharts';
import Peer from 'peerjs';
import { ConnectionStatus, AppRole, StreamMetrics, ChatMessage } from './types';
import { analyzeScreenContent, chatWithScreenAssistant } from './geminiService';

// --- Components ---

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
  const [activeTab, setActiveTab] = useState<'display' | 'stats' | 'settings'>('display');
  const [retinaMode, setRetinaMode] = useState(true);
  const [metrics, setMetrics] = useState<StreamMetrics>({ latency: 0, bandwidth: 0, fps: 0, resolution: '...' });
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize PeerJS
  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', (call) => {
      if (role === AppRole.CLIENT) {
        call.answer(); // Client just receives
        call.on('stream', (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            setStatus(ConnectionStatus.CONNECTED);
          }
        });
      }
    });

    peer.on('error', (err) => {
      console.error("PeerJS Error:", err);
      setStatus(ConnectionStatus.ERROR);
    });

    return () => {
      peer.destroy();
    };
  }, [role]);

  // Host specific: Capture and Call
  const startHosting = async () => {
    try {
      setRole(AppRole.HOST);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60, width: { ideal: 3840 }, height: { ideal: 2160 } },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus(ConnectionStatus.WAITING);
    } catch (err) {
      console.error(err);
      setStatus(ConnectionStatus.ERROR);
    }
  };

  const connectToHost = () => {
    if (!targetId || !peerRef.current) return;
    setRole(AppRole.CLIENT);
    setStatus(ConnectionStatus.CONNECTING);
    // Client initiates contact, Host answers with stream
    // In our simplified logic, the Client asks the Host to "Call" them
    // Or we can reverse it: Host waits for Client connection via DataChannel then starts call
    // For simplicity with PeerJS: The Client sends a small message to the Host, then Host calls.
    const conn = peerRef.current.connect(targetId);
    conn.on('open', () => {
      conn.send({ type: 'REQUEST_STREAM', clientId: peerId });
    });
  };

  useEffect(() => {
    if (!peerRef.current) return;
    peerRef.current.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        if (data.type === 'REQUEST_STREAM' && streamRef.current) {
          peerRef.current?.call(data.clientId, streamRef.current);
          setStatus(ConnectionStatus.CONNECTED);
        }
      });
    });
  }, []);

  const handleClarityCheck = async () => {
    if (!videoRef.current) return;
    setIsAiOpen(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const res = await analyzeScreenContent(dataUrl, "Analyze the clarity of this remote screen stream.");
    setMessages(prev => [...prev, { role: 'model', text: res, timestamp: new Date() }]);
  };

  const copyId = () => {
    navigator.clipboard.writeText(peerId);
    alert("Connection ID Copied!");
  };

  if (!role) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Host Card */}
          <div className="glass p-10 rounded-[3rem] border border-blue-500/20 hover:border-blue-500/40 transition-all group flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Monitor size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">HOST (The Mac)</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              Open NovaCast on your Mac to broadcast your screen to your Android tablet.
            </p>
            <button 
              onClick={startHosting}
              className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center space-x-3"
            >
              <span>Start Sharing</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Client Card */}
          <div className="glass p-10 rounded-[3rem] border border-indigo-500/20 hover:border-indigo-500/40 transition-all group flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Smartphone size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">CLIENT (The Tablet)</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              Open NovaCast on your Android Tablet to view your Mac's screen wirelessly.
            </p>
            <div className="w-full space-y-4">
              <input 
                type="text" 
                placeholder="Enter Connection ID"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-lg font-bold outline-none focus:border-indigo-500 transition-all"
              />
              <button 
                onClick={() => { setRole(AppRole.CLIENT); connectToHost(); }}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center space-x-3"
              >
                <span>View Screen</span>
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
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col p-8 space-y-10 bg-[#080808]">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 ring-1 ring-white/10">
            <Monitor className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter leading-none">NovaCast</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{role === AppRole.HOST ? 'Host Mode' : 'View Mode'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2.5">
          <button onClick={() => setActiveTab('display')} className={`w-full flex items-center space-x-3 p-3.5 rounded-2xl transition-all ${activeTab === 'display' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <Monitor size={20} /> <span className="font-bold text-sm">Monitor</span>
          </button>
          <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center space-x-3 p-3.5 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <Activity size={20} /> <span className="font-bold text-sm">Performance</span>
          </button>
        </nav>

        <div className="p-6 rounded-[2rem] glass border border-white/5 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest">
            <span>Connection ID</span>
            <button onClick={copyId} className="hover:text-white transition-colors"><Copy size={12} /></button>
          </div>
          <div className="bg-black/40 p-4 rounded-xl text-xs font-mono break-all text-blue-400 border border-white/5">
            {peerId || 'Generating...'}
          </div>
          {role === AppRole.HOST && status === ConnectionStatus.WAITING && (
            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center animate-pulse">
              <p className="text-[10px] font-bold text-blue-400 uppercase">Waiting for Tablet...</p>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-black relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#080808]/80 backdrop-blur-2xl z-20">
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-2.5 text-[11px] font-black tracking-widest uppercase px-4 py-2 rounded-full border ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
              <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span>{status}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={handleClarityCheck} className="flex items-center space-x-2 px-4 py-2 glass rounded-xl text-blue-400 hover:text-white transition-all">
              <Sparkles size={16} /> <span className="text-[11px] font-black uppercase">Check Clarity</span>
            </button>
            <button onClick={() => setRole(null)} className="p-2.5 text-zinc-500 hover:text-red-400 transition-colors bg-white/5 rounded-xl">
              <X size={18} />
            </button>
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
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: retinaMode ? 'high-quality' : 'auto' }}
              />
              {status === ConnectionStatus.WAITING && role === AppRole.HOST && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-6 animate-bounce">
                    <Radio size={40} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Broadcasting...</h3>
                  <p className="text-zinc-400 mt-2">Enter this ID on your tablet: <span className="text-white font-mono">{peerId}</span></p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-12 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 content-start h-full overflow-y-auto">
              <MetricCard label="Stream Health" value="OPTIMAL" icon={<ShieldCheck size={20} />} color="text-emerald-400" />
              <MetricCard label="Native Resolution" value={`${videoRef.current?.videoWidth || 0}x${videoRef.current?.videoHeight || 0}`} icon={<Maximize2 size={20} />} />
              <MetricCard label="Rendering" value={retinaMode ? "RETINA" : "STANDARD"} icon={<Layers size={20} />} />
              
              <div className="md:col-span-3 glass rounded-[3rem] p-10 border border-white/5 h-80">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-8">Data Throughput (Simulation)</p>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[{v:50},{v:52},{v:51},{v:58},{v:54},{v:60},{v:59}]}>
                       <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={4} dot={false} />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* AI Chat Drawer */}
        <div className={`absolute right-10 bottom-10 w-96 glass rounded-[2.5rem] border border-white/10 shadow-2xl transition-all duration-500 flex flex-col ${isAiOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`} style={{ height: '500px' }}>
          <header className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3 text-blue-400">
               <Sparkles size={18} /> <span className="font-black text-xs uppercase tracking-widest">Clarity AI</span>
            </div>
            <button onClick={() => setIsAiOpen(false)}><X size={18} /></button>
          </header>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 ml-8' : 'bg-white/5 mr-8 border border-white/5'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-6 flex space-x-2">
            <input 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && (async () => {
                const txt = chatInput; setChatInput("");
                setMessages(prev => [...prev, { role: 'user', text: txt, timestamp: new Date() }]);
                const res = await chatWithScreenAssistant([], txt);
                setMessages(prev => [...prev, { role: 'model', text: res, timestamp: new Date() }]);
              })()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500" 
              placeholder="Ask AI..." 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
