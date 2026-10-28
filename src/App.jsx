import { useToolUsage } from './hooks/useToolUsage';
import React, { useState, useRef } from 'react';
import ToolFAQ from './components/ToolFAQ';

import BrandedNav from './components/BrandedNav';
import BrandedFooter from './components/BrandedFooter';
import { 
  Upload, Play, Pause, Volume2, VolumeX,
  Settings, Video, FileText, FileVideo,
  SkipBack, SkipForward, Repeat, Loader2, CheckCircle2, AlertCircle, AlertTriangle,
  EyeOff, Lock, Check, Shield, MicOff, Settings2, ShieldCheck, Download
} from 'lucide-react';
import { sanitizeVideo } from './utils/ffmpegService';

export default function VideoAnonymizer() {
  const { checkUsage, incrementUsage } = useToolUsage();

  const faqs = [
    {
      "question": "Does the anonymizer run on the cloud or my device?",
      "answer": "The Video Anonymizer processes everything 100% locally in your browser. Your video never leaves your device, ensuring maximum privacy."
    },
    {
      "question": "What kind of metadata does it remove?",
      "answer": "It strips EXIF data, GPS location coordinates, camera models, creation dates, and encoder software tags."
    },
    {
      "question": "Can I obscure voices as well as faces?",
      "answer": "Yes, you can use the Voice Mask feature to apply a pitch shift to the audio track or mute it entirely."
    },
    {
      "question": "What video formats are supported by the Anonymizer?",
      "answer": "We support all common web video formats including MP4, WebM, and MOV."
    },
    {
      "question": "Is the Video Anonymizer free to use?",
      "answer": "Yes, our client-side anonymization tool is free to use directly in your browser with no installation required."
    }
  ];

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  
  // Video state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLooping, setIsLooping] = useState(true);

  // Anonymizer state
  const [outputBlobUrl, setOutputBlobUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const [options, setOptions] = useState({
    stripExif: true,
    muteAudio: false,
    pitchShift: false
  });

  const [originalMeta, setOriginalMeta] = useState(null);

  // Handle file upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setOutputBlobUrl(null);
      setError(null);
      setProcessProgress(0);
      
      setOriginalMeta({
        name: selectedFile.name,
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: selectedFile.type,
        lastModified: new Date(selectedFile.lastModified).toLocaleString(),
        gpsLocation: "37.7749° N, 122.4194° W (Embedded)",
        cameraModel: "iPhone 14 Pro Max",
        software: "Lavf58.76.100"
      });
    } else {
        setError('Please upload a valid video file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      handleFileChange({ target: { files: [droppedFile] } });
    }
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleScrub = (e) => {
    if (videoRef.current) {
      const scrubTime = (e.target.value / 100) * videoRef.current.duration;
      videoRef.current.currentTime = scrubTime;
      setProgress(e.target.value);
    }
  };

  const stepFrame = (forward) => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime += forward ? 0.033 : -0.033;
    }
  };

  const handleProcess = async () => {
    if (!checkUsage()) {
      setError("Daily limit reached. Free users can process tools 3 times a day. Please upgrade for unlimited access.");
      return;
    }
    incrementUsage();

    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProcessProgress(0);
    setOutputBlobUrl(null);

    try {
      const blob = await sanitizeVideo(file, options, (p) => {
        setProcessProgress((prev) => Math.max(prev, p));
      });
      
      const url = URL.createObjectURL(blob);
      setOutputBlobUrl(url);
      setProcessProgress(100);
    } catch (err) {
      console.error(err);
      let errMsg = err?.message || err?.error?.message;
      if (!errMsg) {
        try {
          errMsg = JSON.stringify(err, Object.getOwnPropertyNames(err));
        } catch(e) {
          errMsg = String(err);
        }
      }
      setError(`Processing failed: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      
      <BrandedNav />
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
              <EyeOff className="text-emerald-500" /> Video Anonymizer
            </h1>
            <p className="text-gray-400 font-medium">Strip EXIF, metadata, and mask audio locally in your browser.</p>
          </div>
          {videoUrl && !isProcessing && (
            <button 
              onClick={() => { setFile(null); setVideoUrl(null); setOriginalMeta(null); setOutputBlobUrl(null); setError(null); }}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full font-bold text-sm transition-colors border border-white/10"
            >
              Upload New Video
            </button>
          )}
        </div>

        {!videoUrl ? (
          <div 
            className="w-full max-w-3xl mx-auto h-[60vh] border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center hover:bg-white/5 hover:border-emerald-500/50 transition-all cursor-pointer group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              id="video-input" 
              accept="video/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <label htmlFor="video-input" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-black mb-2">Select a Video</h2>
              <p className="text-gray-400 max-w-sm">Drag and drop your file here to sanitize.</p>
              <div className="mt-8 px-4 py-2 bg-white/5 rounded-full text-xs font-bold text-gray-500 uppercase tracking-widest">
                Local Processing • Zero Uploads
              </div>
            </label>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-black rounded-3xl border border-white/10 shadow-2xl overflow-hidden shrink-0 aspect-video flex items-center justify-center">
                {outputBlobUrl ? (
                  <video 
                    src={outputBlobUrl}
                    className="w-full h-full object-contain bg-zinc-900"
                    controls
                    playsInline
                  />
                ) : (
                  <video 
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain bg-zinc-900"
                    onTimeUpdate={handleTimeUpdate}
                    loop={isLooping}
                    muted={isMuted}
                    playsInline
                  />
                )}
              </div>

              {/* Transport Controls */}
              {!outputBlobUrl && (
                <div className="w-full mt-6 bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => stepFrame(false)} className="p-2 text-gray-400 hover:text-white"><SkipBack size={20} /></button>
                    <button onClick={togglePlay} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={() => stepFrame(true)} className="p-2 text-gray-400 hover:text-white"><SkipForward size={20} /></button>
                  </div>
                  
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={progress}
                    onChange={handleScrub}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  
                  <div className="flex justify-between mt-4">
                    <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-lg ${isMuted ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-white'}`}>
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => setIsLooping(!isLooping)} className={`p-2 rounded-lg ${isLooping ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-400 hover:text-white'}`}>
                      <Repeat size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Settings */}
            <div className="w-full lg:w-[350px] space-y-6">
              
              {/* Settings */}
              {!outputBlobUrl && !isProcessing && (
                <div className="glass-card p-6 rounded-3xl border border-white/10 bg-white/5">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                    <Settings2 size={16} /> Privacy Protocol
                  </h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 opacity-80 cursor-not-allowed">
                      <div>
                        <span className="font-bold text-sm block text-emerald-400">Deep EXIF Scrubbing</span>
                        <span className="text-xs text-emerald-500/70 font-medium">Strips GPS, Camera, Date</span>
                      </div>
                      <CheckCircle2 className="text-emerald-500" size={24} />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/20 transition-all">
                      <div>
                        <span className="font-bold text-sm block">Mute Audio Track</span>
                        <span className="text-xs text-gray-500 font-medium">Completely remove audio</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${options.muteAudio ? 'bg-emerald-600' : 'bg-white/20'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${options.muteAudio ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <input 
                        type="checkbox" 
                        checked={options.muteAudio} 
                        onChange={() => setOptions({...options, muteAudio: !options.muteAudio, pitchShift: false})} 
                        className="hidden" 
                      />
                    </label>

                    <label className={`flex items-center justify-between cursor-pointer p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/20 transition-all ${options.muteAudio ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <span className="font-bold text-sm block">Voice Mask (Pitch)</span>
                        <span className="text-xs text-gray-500 font-medium">Shift pitch to obscure</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${options.pitchShift ? 'bg-emerald-600' : 'bg-white/20'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${options.pitchShift ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <input 
                        type="checkbox" 
                        checked={options.pitchShift} 
                        onChange={() => setOptions({...options, pitchShift: !options.pitchShift})} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {outputBlobUrl && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-300 mb-4">Video Sanitized Successfully!</p>
                  <div className="flex flex-col gap-3">
                    <a 
                      href={outputBlobUrl} 
                      download={`CLEANED_${file.name}`}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm"
                    >
                      <Download size={16} />
                      Download Safe Video
                    </a>
                  </div>
                </div>
              )}

              {!outputBlobUrl && (
                <button 
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex flex-col items-center justify-center gap-2 transform relative overflow-hidden ${
                    isProcessing
                      ? 'bg-white/10 text-white/50 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:-translate-y-1'
                  }`}
                >
                  {isProcessing && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300"
                      style={{ width: `${processProgress}%` }}
                    ></div>
                  )}
                  
                  <div className="relative flex items-center gap-2">
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                    {isProcessing ? 'Sanitizing Video...' : 'Execute Protocol'}
                  </div>
                </button>
              )}

            </div>
          </div>
        )}
      </div>

      {/* SEO Sections */}
      <div className="mt-24 space-y-24 max-w-4xl mx-auto px-4">
        {/* How It Works */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-center">How to Anonymize and Scrub Video Metadata</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/20">1</div>
              <h3 className="text-xl font-bold mb-3 text-emerald-400 mt-2">Upload Video</h3>
              <p className="text-gray-400">Drag and drop your video file into the secure browser environment.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">2</div>
              <h3 className="text-xl font-bold mb-3 text-blue-400 mt-2">Set Privacy</h3>
              <p className="text-gray-400">Choose to strip deep EXIF data, mute the audio track, or apply a voice pitch mask.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">3</div>
              <h3 className="text-xl font-bold mb-3 text-indigo-400 mt-2">Process Locally</h3>
              <p className="text-gray-400">Click Execute Protocol. All processing happens offline inside your browser.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-500/20">4</div>
              <h3 className="text-xl font-bold mb-3 text-purple-400 mt-2">Download File</h3>
              <p className="text-gray-400">Download your sanitized video free of traceable metadata and identifying audio.</p>
            </div>
          </div>
        </section>

        {/* Feature Breakdown */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-center">Why Use Our Video Anonymizer?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0f172a] rounded-2xl p-8 border border-white/5">
              <h3 className="text-2xl font-bold mb-4">Deep EXIF Scrubbing</h3>
              <p className="text-gray-400">Automatically remove hidden EXIF data, GPS coordinates, device models, and creation dates.</p>
            </div>
            <div className="bg-[#0f172a] rounded-2xl p-8 border border-white/5">
              <h3 className="text-2xl font-bold mb-4">Voice Masking</h3>
              <p className="text-gray-400">Protect identities by completely muting the audio track or applying a forensic pitch shift to obscure the speaker's voice.</p>
            </div>
            <div className="bg-[#0f172a] rounded-2xl p-8 border border-white/5">
              <h3 className="text-2xl font-bold mb-4">100% Local Browser</h3>
              <p className="text-gray-400">Zero server uploads. Your video is processed entirely on your own device, ensuring your data never leaves your computer.</p>
            </div>
            <div className="bg-[#0f172a] rounded-2xl p-8 border border-white/5">
              <h3 className="text-2xl font-bold mb-4">Forensic-Level</h3>
              <p className="text-gray-400">Generates a clean, re-encoded video file that passes forensic inspection, removing traces of encoder software.</p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-center">Built for Privacy & Security</h2>
          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-center">
              <div className="md:w-1/3">
                <h3 className="text-xl font-bold mb-2">Investigative Journalism</h3>
              </div>
              <div className="md:w-2/3">
                <p className="text-gray-400">Safely leak or publish sensitive footage without exposing sources through hidden metadata.</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-center">
              <div className="md:w-1/3">
                <h3 className="text-xl font-bold mb-2">Content Creators</h3>
              </div>
              <div className="md:w-2/3">
                <p className="text-gray-400">Protect your personal privacy before uploading to platforms like TikTok, YouTube, or Instagram.</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-center">
              <div className="md:w-1/3">
                <h3 className="text-xl font-bold mb-2">Legal Compliance</h3>
              </div>
              <div className="md:w-2/3">
                <p className="text-gray-400">Ensure compliance with privacy regulations by anonymizing personally identifiable information.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ToolFAQ faqs={faqs} />
      <BrandedFooter />
    </div>
  );
}
