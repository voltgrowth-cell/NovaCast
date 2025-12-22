
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
  Pause,
  Layers,
  Sparkles,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  X,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  YAxis, 
  XAxis, 
  Tooltip 
} from 'recharts';
import { ConnectionStatus, ConnectionMode, StreamMetrics, ChatMessage } from './types';
import { analyzeScreenContent, chatWithScreenAssistant } from './geminiService';

// --- Sub-components ---

const SetupStep: React.FC<{ number: number, title: string, description: string, icon: React.ReactNode }> = ({ number, title, description, icon }) => (
  <div className="flex items-start space-x-4 p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-black border border-blue-500/20 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center space-x-2">
        <span>Step {number}:</span>
        <span>{title}</span>
      </h4>
      <p className="text-xs text-zinc-500 font-medium leading-relaxed">{description}</p>
    </div>
  </div>
);

const MetricCard: React.FC<{ label: string, value: string | number, icon: React.ReactNode, color?: string }> = ({ label, value, icon, color = "text-blue-400" }) => (
  <div className="glass p-5 rounded-[2rem] flex items-center space-x-4 border border-white/5 hover:border-white/20 transition-all duration-500 hover:scale-[1.02] active:scale-95 cursor-default">
    <div className={`p-3 bg-white/5 rounded-2xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">{label}</p>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
    </div>
  </div>
);

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
  >
    <div className="flex items-center space-x-3">
      <div className={`${active ? 'text-white' : 'group-hover:text-blue-400'} transition-colors`}>{icon}</div>
      <span className="font-semibold text-sm tracking-tight">{label}</span>
    </div>
    {active && <ChevronRight size={14} className="opacity-50" />}
  </button>
);

// --- Main App ---

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [mode, setMode] = useState<ConnectionMode>(ConnectionMode.WIRELESS);
  const [activeTab, setActiveTab] = useState<'display' | 'stats' | 'settings'>('display');
  const [showGuide, setShowGuide] = useState(false);
  const [retinaMode, setRetinaMode] = useState(true);
  const [bitrate, setBitrate] = useState(85);
  const [metrics, setMetrics] = useState<StreamMetrics>({
    latency: 5,
    bandwidth: 92.4,
    fps: 60,
    resolution: '5120x2880'
  });
  
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (status === ConnectionStatus.CONNECTED) {
        setMetrics(prev => ({
          ...prev,
          latency: Math.max(2, prev.latency + (Math.random() - 0.5) * 1),
          bandwidth: Math.max(70, bitrate + (Math.random() - 0.5) * 8),
          fps: 60
        }));
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [status, bitrate]);

  const handleConnect = async () => {
    setStatus(ConnectionStatus.CONNECTING);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            frameRate: 60, 
            width: { ideal: 5120 }, 
            height: { ideal: 2880 },
          },
          audio: true 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus(ConnectionStatus.CONNECTED);
        setShowGuide(false);
      } catch (err) {
        console.error(err);
        setStatus(ConnectionStatus.ERROR);
      }
    }, 1200);
  };

  const handleClarityCheck = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);
    setIsAiOpen(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const analysis = await analyzeScreenContent(dataUrl, "Check text legibility and sub-pixel clarity. Suggest the best scaling factor for this Android tablet to match the Mac's native resolution.");
    setMessages(prev => [...prev, { role: 'model', text: analysis || "Stream clarity verified. You are receiving 1:1 pixel mapping.", timestamp: new Date() }]);
    setIsAnalyzing(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    const response = await chatWithScreenAssistant([], userMsg);
    setMessages(prev => [...prev, { role: 'model', text: response || "Optimizing your display pipeline...", timestamp: new Date() }]);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden mac-cursor selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col p-8 space-y-10 bg-[#080808]">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 ring-1 ring-white/10">
            <Monitor className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter leading-none">NovaCast</h1>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest bg-blue-400/10 px-1.5 py-0.5 rounded-md">Retina</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">PRO</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2.5">
          <SidebarItem icon={<Monitor size={20} />} label="Live Mirror" active={activeTab === 'display'} onClick={() => setActiveTab('display')} />
          <SidebarItem icon={<Activity size={20} />} label="Diagnostics" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <SidebarItem icon={<Settings size={20} />} label="Pro Engine" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <button 
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center space-x-3 p-3.5 rounded-2xl text-zinc-500 hover:bg-white/5 hover:text-white transition-all"
          >
            <HelpCircle size={20} />
            <span className="font-semibold text-sm tracking-tight">How to Connect</span>
          </button>
        </nav>

        <div className="p-6 rounded-[2.5rem] glass border border-white/5 space-y-5 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Interface</span>
            <div className="flex items-center space-x-1 text-emerald-400">
              <ShieldCheck size={12} />
              <span className="text-[11px] font-black uppercase tracking-wider">Secure</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setMode(ConnectionMode.WIRELESS)}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${mode === ConnectionMode.WIRELESS ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
            >
              <Wifi size={18} className="mb-1" />
              <span className="text-[10px] font-bold uppercase">Wi-Fi 6</span>
            </button>
            <button 
              onClick={() => setMode(ConnectionMode.USB)}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${mode === ConnectionMode.USB ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
            >
              <Usb size={18} className="mb-1" />
              <span className="text-[10px] font-bold uppercase">USB-C</span>
            </button>
          </div>
          <button 
            onClick={status === ConnectionStatus.DISCONNECTED ? handleConnect : () => setStatus(ConnectionStatus.DISCONNECTED)}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 ${status === ConnectionStatus.CONNECTED ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-white text-black hover:bg-blue-50 shadow-xl shadow-white/5'}`}
          >
            {status === ConnectionStatus.DISCONNECTED ? 'Start Mirroring' : 'Stop Feed'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col bg-black">
        {/* Header Bar */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#080808]/80 backdrop-blur-2xl z-20">
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-2.5 text-[11px] font-black tracking-widest uppercase px-4 py-2 rounded-full border ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
              <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`} />
              <span>{status}</span>
            </div>
            {status === ConnectionStatus.CONNECTED && (
              <div className="flex items-center space-x-4">
                <div className="h-5 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Target Resolution</span>
                  <span className="text-xs font-black text-white uppercase tracking-tight">5K Ultra High-Def</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={handleClarityCheck} 
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:text-white hover:border-blue-500/40 transition-all group"
            >
              <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-wider">Check Clarity</span>
            </button>
            <div className="h-8 w-px bg-white/10" />
            <button className="p-2.5 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-xl">
              <Maximize2 size={18} />
            </button>
          </div>
        </header>

        {/* Display Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'display' && (
            <div className={`flex-1 relative flex items-center justify-center transition-all duration-1000 ${status === ConnectionStatus.CONNECTED ? 'p-0' : 'p-20'}`}>
              {status === ConnectionStatus.CONNECTED ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-all duration-700 ${retinaMode ? 'brightness-[1.01] contrast-[1.01]' : ''}`}
                    style={{ 
                      imageRendering: retinaMode ? 'high-quality' : 'auto',
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="max-w-2xl w-full text-center">
                   <div className="relative inline-block mb-12">
                    <div className="absolute inset-0 bg-blue-600/20 blur-[80px] animate-pulse rounded-full" />
                    <div className="relative w-36 h-36 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-[3rem] flex items-center justify-center text-white shadow-2xl border border-white/20">
                      <Smartphone size={56} strokeWidth={2.5} />
                    </div>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter mb-6 text-white leading-tight">Android Mirroring.<br/><span className="text-zinc-600">Pixel Perfect Clarity.</span></h2>
                  <p className="text-zinc-500 text-lg font-medium leading-relaxed mb-12 max-w-lg mx-auto">
                    To begin, open this app on your Android tablet and connect to your Mac via cable or Wi-Fi.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                    <button 
                      onClick={handleConnect}
                      className="py-5 bg-white text-black rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Connect Now
                    </button>
                    <button 
                      onClick={() => setShowGuide(true)}
                      className="py-5 bg-white/5 text-white border border-white/10 rounded-[2rem] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Setup Guide
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-12 space-y-12 overflow-y-auto h-full scroll-smooth">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">Diagnostics</h2>
                  <p className="text-zinc-500 font-medium mt-2">High-resolution performance tracking.</p>
                </div>
                <div className="glass px-6 py-3 rounded-2xl border border-white/5 flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Signal Clarity</p>
                    <p className="text-sm font-black text-emerald-400">EXCELLENT</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <ShieldCheck size={20} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCard label="Frame Latency" value={`${metrics.latency.toFixed(1)} ms`} icon={<Zap size={20} />} />
                <MetricCard label="Bitrate Speed" value={`${metrics.bandwidth.toFixed(1)} Mb/s`} icon={<Cpu size={20} />} />
                <MetricCard label="Consistency" value="100.0%" icon={<Activity size={20} />} color="text-emerald-400" />
              </div>

              <div className="glass rounded-[3rem] p-8 border border-white/5">
                <p className="text-xs font-black text-zinc-400 mb-8 uppercase tracking-widest flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span>Real-time Throughput (5K Stream)</span>
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      {t: '10s', v: 85}, {t: '9s', v: 88}, {t: '8s', v: 86}, {t: '7s', v: 92}, {t: '6s', v: 89}, {t: '5s', v: 91}, {t: '4s', v: metrics.bandwidth}
                    ]}>
                      <XAxis dataKey="t" hide />
                      <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip contentStyle={{ background: '#111', border: 'none', borderRadius: '20px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={4} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-12 max-w-3xl space-y-16 overflow-y-auto h-full">
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Resolution Engine</h3>
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-400/10 px-2 py-1 rounded-md">RETINA ACTIVE</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 rounded-3xl glass border border-white/5">
                    <div className="flex items-center space-x-5">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Layers size={24} /></div>
                      <div>
                        <p className="font-black text-lg tracking-tight">Retina High-DPI Scaling</p>
                        <p className="text-sm text-zinc-500 font-medium">Matches tablet resolution to Mac desktop real estate</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setRetinaMode(!retinaMode)}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 ${retinaMode ? 'bg-blue-600' : 'bg-zinc-800'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${retinaMode ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex flex-col p-6 rounded-3xl glass border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                      <p className="font-black text-lg tracking-tight">Bandwidth (Fidelity)</p>
                      <span className="text-xl font-black text-blue-400">{bitrate} Mbps</span>
                    </div>
                    <input 
                      type="range" min="20" max="150" value={bitrate} 
                      onChange={(e) => setBitrate(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Setup Guide Modal */}
        {showGuide && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-10 overflow-y-auto">
             <div className="max-w-4xl w-full">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black">
                         <Info size={28} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black tracking-tighter">Setup Instructions</h2>
                         <p className="text-zinc-500 font-medium">Follow these steps to connect your Mac and Tablet.</p>
                      </div>
                   </div>
                   <button onClick={() => setShowGuide(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                      <X size={24} />
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-6">
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest px-1">Hardware Setup</h3>
                      <SetupStep 
                        number={1} 
                        title="Open on Android" 
                        description="Launch this exact web app in Chrome on your Android Tablet or Phone."
                        icon={<Smartphone size={18} />}
                      />
                      <SetupStep 
                        number={2} 
                        title="Choose Connection" 
                        description="USB-C (Recommended) for zero-lag or 5GHz Wi-Fi for wireless freedom."
                        icon={<Usb size={18} />}
                      />
                   </div>
                   <div className="space-y-6">
                      <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest px-1">System Config</h3>
                      <SetupStep 
                        number={3} 
                        title="Authorize Mac" 
                        description="Click 'Start Mirroring' and select the Mac screen or window to share."
                        icon={<CheckCircle2 size={18} />}
                      />
                      <SetupStep 
                        number={4} 
                        title="Enable Retina" 
                        description="Toggle Retina Mode in settings to match your tablet's high-res display."
                        icon={<Layers size={18} />}
                      />
                   </div>
                </div>

                <div className="mt-12 p-8 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="text-center md:text-left">
                      <h4 className="text-xl font-black tracking-tight mb-1">Ready to go?</h4>
                      <p className="text-white/70 text-sm font-medium">Ensure your Mac is unlocked and your browser has permissions.</p>
                   </div>
                   <button 
                    onClick={handleConnect}
                    className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                   >
                      Connect Now
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* AI Assistant Overlay */}
        <div className={`absolute right-10 bottom-10 w-[420px] flex flex-col transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) z-50 ${isAiOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
          <div className="glass rounded-[3rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[600px] bg-[#0c0c0c]/90">
            <header className="p-8 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-base tracking-tight leading-none">Clarity Engine</h4>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1.5 flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span>Optimizing Pixels</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="text-center py-20 px-10">
                   <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-600">
                      <MessageSquare size={32} />
                   </div>
                   <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                     Ask me about optimizing your display or summarizing the content currently on your Mac screen.
                   </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 text-zinc-300 border border-white/5 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-5 rounded-[2rem] rounded-tl-none flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scanning Screen</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/50 border-t border-white/5 flex items-center space-x-4">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask NovaCast..."
                className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="w-12 h-12 bg-blue-600 rounded-2xl text-white disabled:opacity-30 transition-all flex items-center justify-center shadow-xl shadow-blue-600/20"
              >
                <Play size={18} fill="white" />
              </button>
            </div>
          </div>
        </div>

        {/* Floating Toggle button for AI */}
        {!isAiOpen && (
          <button 
            onClick={() => setIsAiOpen(true)}
            className="absolute bottom-10 right-10 w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-700 rounded-[1.75rem] flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-90 transition-all duration-500 group z-50 border border-white/10"
          >
            <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </main>
    </div>
  );
}
