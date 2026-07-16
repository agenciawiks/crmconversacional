import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, Loader2 } from 'lucide-react';
import OpusMediaRecorder from 'opus-media-recorder';

// Default worker options for opus-media-recorder
const workerOptions = {
  encoderWorkerFactory: function () {
    return new Worker('/encoderWorker.umd.js');
  },
  OggOpusEncoderWasmPath: '/OggOpusEncoder.wasm',
  WebMOpusEncoderWasmPath: '/WebMOpusEncoder.wasm'
};

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      stopStream();
      clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    if (streamRef.current || isInitializing) return;
    try {
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const options = { mimeType: 'audio/ogg' };
      mediaRecorderRef.current = new OpusMediaRecorder(stream, options, workerOptions);
      
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        audioRef.current.src = url;
        stopStream();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsInitializing(false);
      setRecordingTime(0);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setIsInitializing(false);
      alert("Não foi possível acessar o microfone.");
      if (onCancel) onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `voice_note_${Date.now()}.ogg`, {
        type: 'audio/ogg; codecs=opus'
      });
      onSend(file);
    }
  };

  const handleDiscard = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setIsRecording(false);
    setIsPlaying(false);
    if (onCancel) onCancel();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Auto-start recording when component mounts if not already recording or reviewing
  useEffect(() => {
    if (!isRecording && !audioBlob && !isInitializing) {
      startRecording();
    }
  }, []);

  return (
    <div className="voice-recorder-container" style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px',
      background: 'var(--bg-panel)', borderRadius: '24px', flex: 1, border: '1px solid var(--border-glass)'
    }}>
      
      {isInitializing && !isRecording && !audioBlob ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Loader2 size={18} className="spin" />
          <span style={{ fontSize: '14px' }}>Iniciando microfone...</span>
        </div>
      ) : isRecording ? (
        <>
          <div className="recording-pulse" style={{ 
            width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444',
            animation: 'pulse 1.5s infinite' 
          }} />
          <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '16px', fontWeight: '500' }}>
            {formatTime(recordingTime)}
          </span>
          <div style={{ flex: 1 }} />
          <button 
            onClick={stopRecording}
            style={{ 
              background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', 
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Square size={16} fill="currentColor" />
          </button>
        </>
      ) : audioBlob ? (
        <>
          <button 
            onClick={handleDiscard}
            style={{ 
              background: 'transparent', color: 'var(--text-secondary)', border: 'none', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '8px'
            }}
          >
            <Trash2 size={20} />
          </button>
          
          <button 
            onClick={togglePlayback}
            style={{ 
              background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '50%', 
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          <div style={{ flex: 1, height: '4px', background: 'var(--border-glass)', borderRadius: '2px', position: 'relative' }}>
             {/* Simple waveform placeholder */}
             <div style={{ 
               position: 'absolute', left: 0, top: 0, bottom: 0, background: 'var(--primary-color)', borderRadius: '2px',
               width: isPlaying ? '100%' : '0%', transition: 'width 0.1s linear'
             }} />
          </div>

          <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '14px' }}>
            {formatTime(recordingTime)}
          </span>

          <button 
            onClick={handleSend}
            style={{ 
              background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '50%', 
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Send size={16} />
          </button>
        </>
      ) : null}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default VoiceRecorder;
