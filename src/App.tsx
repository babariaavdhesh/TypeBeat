import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  Download, 
  Type, 
  Palette, 
  Zap, 
  Maximize, 
  Smartphone, 
  Square, 
  Image as ImageIcon,
  ChevronRight,
  Plus,
  Loader2
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from './lib/utils';
import { PALETTES, PRESETS, FONTS } from './constants';
import { AspectRatio, AppState, MotionSpeed, MotionIntensity } from './types';

export default function App() {
  const [state, setState] = useState<AppState>({
    text: "BHAI YE DEAL\nMISS MAT KAR!",
    aspectRatio: '9:16',
    presetId: 'hype',
    paletteId: 'zomato',
    speed: 'medium',
    intensity: 'normal',
    fontSize: 64,
    bgImage: null,
    textPosition: { x: 0, y: 0 }
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'style' | 'motion'>('text');
  const previewRef = useRef<HTMLDivElement>(null);

  const currentPalette = useMemo(() => 
    PALETTES.find(p => p.id === state.paletteId) || PALETTES[0], 
  [state.paletteId]);

  const currentPreset = useMemo(() => 
    PRESETS.find(p => p.id === state.presetId) || PRESETS[0],
  [state.presetId]);

  const lines = useMemo(() => state.text.split('\n'), [state.text]);

  const handleExport = async () => {
    if (!previewRef.current) return;
    
    // Check if WebCodecs is supported
    if (!('VideoEncoder' in window)) {
      alert("High-quality video export is not supported in this browser. Try Chrome or Edge desktop.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    const targetWidth = state.aspectRatio === '9:16' ? 1080 : state.aspectRatio === '1:1' ? 1440 : 1920;
    const targetHeight = state.aspectRatio === '9:16' ? 1920 : state.aspectRatio === '1:1' ? 1440 : 1080;
    
    const containerWidth = previewRef.current.offsetWidth;
    const pixelRatio = targetWidth / containerWidth;

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: targetWidth,
        height: targetHeight,
        frameRate: 60,
      },
      fastStart: false
    });
    
    let videoEncoder: any;
    try {
      const VideoEncoderAPI = (window as any).VideoEncoder;
      videoEncoder = new VideoEncoderAPI({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: any) => console.error("Encoder Error:", e)
      });
      
      videoEncoder.configure({
        codec: 'vp09.00.10.08',
        width: targetWidth,
        height: targetHeight,
        bitrate: 10_000_000, // 10 Mbps
        framerate: 60,
      });
    } catch (err: any) {
      alert("Video Encoder initialization failed: " + err.message);
      setIsExporting(false);
      setExportProgress(null);
      return;
    }

    const durationSeconds = 5;
    const fps = 60;
    const totalFrames = durationSeconds * fps;
    const frameDurationMs = 1000 / fps;

    let rafCallbacks: FrameRequestCallback[] = [];
    const origRaf = window.requestAnimationFrame;
    const origCancelRaf = window.cancelAnimationFrame;
    const origPerf = performance.now;
    const origDate = Date.now;
    
    let mockTime = origPerf.call(performance);

    const startMocking = () => {
      window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return 999;
      }) as any;
      window.cancelAnimationFrame = () => {};
      performance.now = () => mockTime;
      Date.now = () => mockTime;
    };

    const stopMocking = () => {
      window.requestAnimationFrame = origRaf;
      window.cancelAnimationFrame = origCancelRaf;
      performance.now = origPerf;
      Date.now = origDate;
    };

    try {
      // 1. Reset animation
      setIsPlaying(false);
      await new Promise(r => setTimeout(r, 100)); // allow React to unmount

      // 2. Start mocking & start animation
      startMocking();
      setIsPlaying(true);
      
      // Wait for React to process the re-mount
      await new Promise(r => setTimeout(r, 50));
      
      // Initial ticks to flush Framer Motion's boot sequence
      for(let j=0; j<3; j++) {
        mockTime += 1;
        const currentCbs = rafCallbacks;
        rafCallbacks = [];
        currentCbs.forEach(cb => { try { cb(mockTime); } catch (e) { } });
      }

      // 3. Render loop
      for (let i = 0; i < totalFrames; i++) {
        // Tick time
        mockTime += frameDurationMs;
        const currentCbs = rafCallbacks;
        rafCallbacks = [];
        
        // Framer Motion reads time during these callbacks and applies styles
        currentCbs.forEach(cb => { try { cb(mockTime); } catch(e) {} });

        // Let browser paint or settle DOM changes.
        // We restore original functions so htmlToImage works normally.
        stopMocking();
        
        // Render current DOM state offline
        const frameCanvas = await htmlToImage.toCanvas(previewRef.current, {
           quality: 1,
           pixelRatio: pixelRatio,
           canvasWidth: targetWidth,
           canvasHeight: targetHeight,
           skipFonts: false,
        });
        
        const timestampMicroseconds = (i * 1000000) / fps;
        const VideoFrameAPI = (window as any).VideoFrame;
        const frame = new VideoFrameAPI(frameCanvas, { timestamp: timestampMicroseconds });
        const keyFrame = (i % 60 === 0); // 1 keyframe per second
        
        videoEncoder.encode(frame, { keyFrame });
        frame.close();
        
        setExportProgress(Math.round((i / totalFrames) * 100));
        
        // Let React update the progress bar UI smoothly
        await new Promise(r => setTimeout(r, 0));

        // Resume mocking for the next tick
        startMocking();
      }

      // Flush and Finalize
      stopMocking();
      await videoEncoder.flush();
      videoEncoder.close();
      muxer.finalize();

      const buffer = muxer.target.buffer;
      const blob = new Blob([buffer], { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'TypeBeat-2K.webm';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to export high quality video: ' + err.message);
    } finally {
      stopMocking();
      setIsExporting(false);
      setExportProgress(null);
      setIsPlaying(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, bgImage: url }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 font-sans text-neutral-200 overflow-hidden lg:flex-row">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-96 flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-900 overflow-y-auto">
        <header className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zomato rounded-lg flex items-center justify-center font-black text-white italic">T</div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">TypeBeat</h1>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {isExporting ? `Exporting ${exportProgress}%...` : 'Export 2K'}
          </button>
        </header>

        <nav className="flex border-b border-neutral-800">
          {[
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'style', icon: Palette, label: 'Style' },
            { id: 'motion', icon: Zap, label: 'Motion' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center py-3 gap-1 text-[10px] uppercase font-bold tracking-widest transition-colors",
                activeTab === tab.id ? "text-white bg-neutral-800" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 flex-1 space-y-8">
          {activeTab === 'text' && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Source Text</label>
                <textarea
                  value={state.text}
                  onChange={(e) => setState(prev => ({ ...prev, text: e.target.value.toUpperCase() }))}
                  className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-white font-display text-xl focus:ring-2 focus:ring-zomato focus:border-transparent outline-none transition-all resize-none"
                  placeholder="TYPE SOMETHING..."
                />
                <p className="text-[10px] text-neutral-500 italic">Pro-tip: Use line breaks for multiple screens/lines.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Canvas Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '9:16', icon: Smartphone, label: 'Story' },
                    { id: '1:1', icon: Square, label: 'Feed' },
                    { id: '16:9', icon: Maximize, label: 'Post' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setState(prev => ({ ...prev, aspectRatio: ratio.id as AspectRatio }))}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                        state.aspectRatio === ratio.id 
                          ? "bg-neutral-800 border-neutral-600 border-b-4 border-b-zomato scale-95" 
                          : "bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                      )}
                    >
                      <ratio.icon size={20} className={state.aspectRatio === ratio.id ? "text-zomato" : "text-neutral-400"} />
                      <span className="text-[10px] font-bold mt-1 text-neutral-400">{ratio.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'style' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setState(prev => ({ ...prev, presetId: preset.id }))}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-xl border transition-all text-left group",
                        state.presetId === preset.id 
                          ? "bg-neutral-800 border-neutral-600" 
                          : "bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-tighter mb-1 transition-colors",
                        state.presetId === preset.id ? "text-zomato" : "text-neutral-500"
                      )}>
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 leading-tight">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Color Palette</label>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => setState(prev => ({ ...prev, paletteId: palette.id }))}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl border transition-all text-left",
                        state.paletteId === palette.id 
                          ? "bg-neutral-800 border-neutral-600" 
                          : "bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
                      )}
                    >
                      <div className="flex -space-x-1">
                        <div className="w-4 h-4 rounded-full ring-2 ring-neutral-900" style={{ backgroundColor: palette.background }} />
                        <div className="w-4 h-4 rounded-full ring-2 ring-neutral-900" style={{ backgroundColor: palette.text }} />
                        <div className="w-4 h-4 rounded-full ring-2 ring-neutral-900" style={{ backgroundColor: palette.accent }} />
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Typo Size</label>
                <input 
                  type="range" 
                  min="32" 
                  max="128" 
                  value={state.fontSize} 
                  onChange={(e) => setState(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="w-full accent-zomato h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-bold">
                  <span>SMALL</span>
                  <span>{state.fontSize}PX</span>
                  <span>HUGE</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Background Image</label>
                <div className="flex gap-2 items-center">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 p-3 rounded-xl cursor-pointer transition-colors text-sm font-bold text-neutral-300">
                    <ImageIcon size={16} />
                    {state.bgImage ? 'Change Image' : 'Upload Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {state.bgImage && (
                    <button 
                      onClick={() => setState(prev => ({ ...prev, bgImage: null }))}
                      className="p-3 bg-red-950 text-red-500 rounded-xl hover:bg-red-900 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'motion' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Speed</label>
                <div className="grid grid-cols-3 gap-2">
                  {['slow', 'medium', 'fast'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setState(prev => ({ ...prev, speed: s as MotionSpeed }))}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                        state.speed === s 
                          ? "bg-zomato border-transparent text-white" 
                          : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest px-1">Intensity</label>
                <div className="grid grid-cols-3 gap-2">
                  {['subtle', 'normal', 'aggressive'].map((i) => (
                    <button
                      key={i}
                      onClick={() => setState(prev => ({ ...prev, intensity: i as MotionIntensity }))}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                        state.intensity === i 
                          ? "bg-zomato border-transparent text-white" 
                          : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800"
                      )}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700 mt-8">
                <h3 className="text-xs font-bold mb-2 flex items-center gap-2">
                  <Plus size={14} className="text-zomato" />
                  Upcoming Feature
                </h3>
                <p className="text-[10px] text-neutral-400 leading-relaxed italic">
                  Music Sync: Automatically detect beat peaks and sync transitions to the rhythm. Coming in V2.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Preview Canvas */}
      <main className="flex-1 bg-black flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 hidden lg:flex items-center gap-4 bg-neutral-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-800">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition-colors"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <div className="w-px h-4 bg-neutral-700" />
          <button 
            className="text-neutral-400 hover:text-white transition-colors"
            onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 10); }}
          >
            <RefreshCcw size={16} />
          </button>
          <div className="w-px h-4 bg-neutral-700" />
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            Preview Rendering: {isPlaying ? 'Live' : 'Paused'}
          </span>
        </div>

        <div 
          ref={previewRef}
          className={cn(
            "relative bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 animate-in zoom-in-95",
            state.aspectRatio === '9:16' ? 'w-[360px] h-[640px]' : 
            state.aspectRatio === '1:1' ? 'w-[500px] h-[500px]' : 
            'w-[640px] h-[360px]'
          )}
          style={{ 
            backgroundColor: state.bgImage ? 'transparent' : currentPalette.background,
            backgroundImage: state.bgImage ? `url(${state.bgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Tint overlay if using bg image */}
          {state.bgImage && (
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          )}

          <AnimatePresence mode="wait">
            {isPlaying && (
              <MotionCanvas 
                key={`${state.text}-${state.presetId}-${state.paletteId}-${state.speed}-${state.intensity}`}
                lines={lines}
                state={state}
                palette={currentPalette}
                preset={currentPreset}
              />
            )}
          </AnimatePresence>

          {/* Grain/Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 contrast-150 mix-blend-overlay">
            <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          </div>
        </div>

        {/* Mobile controls bar */}
        <div className="mt-8 flex lg:hidden items-center gap-6">
           <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition-colors shadow-lg"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 10); }}
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}

function MotionCanvas({ 
  lines, 
  state, 
  palette, 
  preset 
}: { 
  lines: string[], 
  state: AppState, 
  palette: any, 
  preset: any 
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const speedFactor = state.speed === 'fast' ? 0.3 : state.speed === 'slow' ? 1.2 : 0.6;
  const intensityFactor = state.intensity === 'aggressive' ? 1.5 : state.intensity === 'subtle' ? 0.5 : 1;

  // Background Shape Components
  const BackgroundShapes = () => {
    switch (preset.motionType) {
      case 'sale':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] border-[40px] border-dotted opacity-20"
              style={{ borderColor: palette.accent }}
            />
          </div>
        );
      case 'tapori':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: Math.random() * 500 - 250, y: Math.random() * 800 - 400 }}
                animate={{ 
                  opacity: [0, 0.1, 0],
                  scale: [0.5, 1.5, 0.5],
                  rotate: [0, 90, 0]
                }}
                transition={{ 
                  duration: 2 + Math.random() * 3, 
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
                className="absolute text-4xl font-black italic"
                style={{ color: palette.accent }}
              >
                MASALA
              </motion.div>
            ))}
          </div>
        );
      case 'bollywood':
        return (
          <div className="absolute inset-0">
             <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
            />
          </div>
        );
      case 'retro':
        return (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />
            <motion.div 
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 0.1, repeat: Infinity }}
              className="absolute inset-0 opacity-10 bg-white mix-blend-overlay"
            />
          </div>
        );
      case 'liquid':
        return (
          <div className="absolute inset-0 overflow-hidden opacity-30">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  x: [0, 100, 0],
                  y: [0, 50, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 10 + i * 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute blur-[100px] w-full h-full rounded-full"
                style={{ backgroundColor: palette.accent, left: `${i * 30}%`, top: `${i * 20}%` }}
              />
            ))}
          </div>
        );
      case 'news':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 w-full h-1 bg-red-600 z-50 shadow-[0_0_10px_red]" />
            <div className="absolute bottom-0 w-full h-1 bg-red-600 z-50 shadow-[0_0_10px_red]" />
          </div>
        );
      case 'cyberpunk':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(0,255,255,0.2)_100%)] bg-[length:100%_20px]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_95%,rgba(255,0,255,0.2)_100%)] bg-[length:20px_100%]" />
            <motion.div
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.1, repeat: Infinity, repeatType: "mirror" }}
              className="absolute inset-0 bg-white mix-blend-overlay"
            />
          </div>
        );
      case 'horror':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-overlay opacity-30">
            <motion.div
              animate={{ x: [-10, 10, -5, 5, 0], y: [-5, 5, 10, -10, 0] }}
              transition={{ duration: 0.2, repeat: Infinity }}
              className="absolute inset-0 bg-black"
              style={{ filter: 'contrast(200%) brightness(150%) url(#noise)' }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full p-8 relative overflow-hidden"
    >
      <BackgroundShapes />

      {/* Draggable Text Container */}
      <motion.div
        drag
        dragMomentum={false}
        className="absolute inline-flex flex-col items-center justify-center gap-1 cursor-move x-auto y-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ zIndex: 50 }}
      >
        {lines.map((line, idx) => {
        const lineVariants = {
          initial: { 
            opacity: 0, 
            scale: (preset.motionType === 'hype' || preset.motionType === 'comedy') ? 0 : preset.motionType === 'beat' ? 0.8 : 1,
            y: (preset.motionType === 'hype' || preset.motionType === 'bounce') ? 100 : preset.motionType === 'comedy' ? 50 : 0,
            x: preset.motionType === 'bollywood' ? (idx % 2 === 0 ? -100 : 100) : preset.motionType === 'news' ? 200 : preset.motionType === 'horror' ? 20 : 0,
            filter: preset.motionType === 'bollywood' ? 'blur(10px)' : preset.motionType === 'horror' ? 'blur(5px) contrast(200%)' : 'blur(0px)',
            rotate: preset.motionType === 'tapori' ? (idx % 2 === 0 ? -10 : 10) : preset.motionType === 'comedy' ? (idx % 2 === 0 ? -5 : 5) : 0,
            skewX: preset.motionType === 'liquid' ? 20 : preset.motionType === 'horror' ? 10 : 0,
          },
          animate: { 
            opacity: 1, 
            scale: preset.motionType === 'beat' ? [1, 1.1, 1] : preset.motionType === 'comedy' ? [0, 1.2, 1] : 1,
            y: preset.motionType === 'liquid' ? [0, -10, 0] : preset.motionType === 'comedy' ? [50, -20, 0] : 0,
            x: preset.motionType === 'horror' ? [-5, 5, -2, 2, 0] : 0,
            filter: 'blur(0px) contrast(100%)',
            rotate: preset.motionType === 'comedy' ? [0, (idx % 2===0 ? -10 : 10), 0] : 0,
            skewX: preset.motionType === 'horror' ? [-10, 10, -5, 5, 0] : 0,
            transition: { 
              type: ['beat', 'comedy', 'liquid', 'horror'].includes(preset.motionType) ? 'tween' : 'spring',
              damping: preset.motionType === 'bounce' ? 8 : (15 / intensityFactor),
              stiffness: preset.motionType === 'bounce' ? 200 : (150 * intensityFactor),
              delay: idx * 0.15 * speedFactor,
              duration: preset.motionType === 'liquid' ? 2 : preset.motionType === 'horror' ? 0.3 : (0.8 * speedFactor),
              repeat: (preset.motionType === 'beat' || preset.motionType === 'liquid' || preset.motionType === 'horror') ? Infinity : 0,
              repeatType: preset.motionType === 'horror' ? 'mirror' : undefined
            } 
          },
          exit: { 
            opacity: 0, 
            scale: 1.2,
            transition: { duration: 0.2 }
          }
        };

        return (
          <motion.div
            key={idx}
            variants={lineVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "relative z-10 text-center leading-[0.85] tracking-tighter uppercase whitespace-nowrap px-6 py-2",
              preset.motionType === 'glitch' && "animate-glitch",
              preset.motionType === 'flash' && "animate-pulse",
              preset.motionType === 'sale' && "italic"
            )}
            style={{ 
              color: palette.text,
              fontFamily: preset.font,
              fontSize: `${state.fontSize}px`,
              textShadow: preset.motionType === 'bollywood' ? `0 10px 30px rgba(0,0,0,0.5)` : 'none'
            }}
          >
            {/* Box effect for Sale/Minimal preset - FIXED LAYERING */}
            {(preset.motionType === 'sale' || preset.motionType === 'minimal') && (
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: idx * 0.15 * speedFactor, duration: 0.3 }}
                className="absolute inset-x-0 inset-y-1 origin-left -z-10"
                style={{ backgroundColor: palette.accent }}
              />
            )}

            {/* Underline effect for Hype preset - FIXED LAYERING */}
            {preset.motionType === 'hype' && idx === lines.length - 1 && (
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '110%' }}
                transition={{ delay: (idx + 1) * 0.15 * speedFactor, duration: 0.4 }}
                className="absolute -bottom-2 -left-[5%] h-3 -z-10"
                style={{ backgroundColor: palette.accent }}
              />
            )}

            <span 
              className="relative z-10 block"
              style={preset.motionType === 'sale' ? { color: palette.background, mixBlendMode: 'normal' } : {}}
            >
              {line || '\u00A0'}
            </span>
          </motion.div>
        );
      })}
      </motion.div>

      {/* Frame accents */}
      <div className="absolute inset-4 border border-white/10 pointer-events-none" />
      <div className="absolute top-4 left-4 flex gap-1 opacity-20 pointer-events-none">
        <div className="w-1 h-1 rounded-full bg-white" />
        <div className="w-1 h-1 rounded-full bg-white" />
      </div>
    </div>
  );
}
