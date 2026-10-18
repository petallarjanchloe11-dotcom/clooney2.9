import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  autoDetectLanguage?: boolean;
  lang?: string;
  onTranscriptUpdate?: (fullText: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

// Helper to auto-detect browser language locale
export const getAutoDetectedLanguage = (): string => {
  if (typeof navigator !== 'undefined') {
    if (navigator.languages && navigator.languages.length > 0) {
      return navigator.languages[0];
    }
    if (navigator.language) {
      return navigator.language;
    }
  }
  return 'en-US';
};

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    continuous = true,
    interimResults = true,
    autoDetectLanguage = true,
    lang,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 1 for live audio reactive bars
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(() =>
    autoDetectLanguage ? getAutoDetectedLanguage() : (lang || 'en-US')
  );

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isExplicitlyStoppedRef = useRef(false);
  const liveTranscriptRef = useRef('');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Language auto-detection listener on system language changes
  useEffect(() => {
    if (autoDetectLanguage && typeof window !== 'undefined') {
      const handleLanguageChange = () => {
        const detected = getAutoDetectedLanguage();
        setDetectedLanguage(detected);
      };
      window.addEventListener('languagechange', handleLanguageChange);
      return () => {
        window.removeEventListener('languagechange', handleLanguageChange);
      };
    }
  }, [autoDetectLanguage]);

  useEffect(() => {
    const hasWebSpeech =
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia;

    setIsSupported(hasWebSpeech || hasMediaDevices);
  }, []);

  // Audio Level Visualizer loop
  const startVolumeMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize roughly between 0.1 and 1
        const normalized = Math.min(1, Math.max(0.1, average / 128));
        setVolumeLevel(normalized);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn('AudioContext volume meter could not start:', e);
    }
  }, []);

  const stopVolumeMeter = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore
      }
      audioContextRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  const stopListening = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    stopVolumeMeter();

    // 1. Stop Web Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }

    // 2. Stop MediaRecorder and trigger AI Audio Transcription for high clarity
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    setIsListening(false);
    setInterimTranscript('');
  }, [stopVolumeMeter]);

  const startListening = useCallback(async () => {
    isExplicitlyStoppedRef.current = false;
    liveTranscriptRef.current = '';
    setError(null);
    setInterimTranscript('');

    let stream: MediaStream | null = null;

    // 1. Acquire clean microphone stream with echo cancellation and noise suppression
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        streamRef.current = stream;
        startVolumeMeter(stream);
      } catch (micErr: any) {
        console.error('Microphone access denied:', micErr);
        let msg = 'Could not access microphone.';
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          msg = 'Microphone permission was denied. Please allow microphone access in browser settings.';
        }
        setError(msg);
        optionsRef.current.onError?.(msg);
        setIsListening(false);
        return;
      }
    }

    // 2. Start MediaRecorder to capture audio for Gemini 3.5 high-clarity transcription
    let recorderMimeType = 'audio/webm';
    if (stream && typeof MediaRecorder !== 'undefined') {
      try {
        audioChunksRef.current = [];
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          recorderMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          recorderMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          recorderMimeType = 'audio/ogg';
        }

        const recorder = new MediaRecorder(stream, { mimeType: recorderMimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }

          const blob = new Blob(audioChunksRef.current, { type: recorderMimeType });
          if (blob.size < 100) return; // Very short click, skip

          // Send to Gemini 3.5 Audio Model for crystal-clear transcription
          setIsTranscribing(true);
          try {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              try {
                const res = await fetch('/api/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioData: base64Audio, mimeType: recorderMimeType }),
                });
                const data = await res.json();
                if (data.text && data.text.trim().length > 0) {
                  // High-clarity Gemini result replaces/cleans up any phonetic misinterpretations
                  optionsRef.current.onTranscriptUpdate?.(data.text.trim(), true);
                }
              } catch (apiErr) {
                console.warn('Gemini transcription API call error, using live speech result:', apiErr);
              } finally {
                setIsTranscribing(false);
              }
            };
          } catch (e) {
            setIsTranscribing(false);
          }
        };

        recorder.start(200);
      } catch (recErr) {
        console.warn('MediaRecorder setup error:', recErr);
      }
    }

    // 3. Start Web Speech API for zero-latency live visual feedback as words are spoken
    const SpeechRecognitionAPI =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        // Configure continuous recognition mode, interim results, and auto-detected language
        const targetLang = autoDetectLanguage ? getAutoDetectedLanguage() : (lang || 'en-US');
        setDetectedLanguage(targetLang);

        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = targetLang;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let finalTotal = '';
          let interimTotal = '';

          // Rebuild complete transcript accurately across the entire session results
          // to prevent repeated words or chopped phrases
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            const text = res[0]?.transcript ? res[0].transcript.trim() : '';
            if (res.isFinal) {
              finalTotal += (finalTotal ? ' ' : '') + text;
            } else {
              interimTotal += (interimTotal ? ' ' : '') + text;
            }
          }

          if (finalTotal) {
            liveTranscriptRef.current = finalTotal;
            optionsRef.current.onTranscriptUpdate?.(finalTotal, false);
          }

          setInterimTranscript(interimTotal);
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech recognition event warning:', event.error);
          if (event.error === 'no-speech') return;
          if (event.error === 'network' || event.error === 'service-not-allowed') {
            // MediaRecorder handles audio regardless
            return;
          }
          if (event.error === 'not-allowed') {
            setError('Microphone permission was denied.');
          }
        };

        recognition.onend = () => {
          // In continuous mode, if the user didn't explicitly click stop, resume listening
          if (!isExplicitlyStoppedRef.current && isListening && continuous) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore
            }
          }
        };

        recognition.start();
        setIsListening(true);
      } catch (speechErr) {
        console.warn('Web Speech API start error, fallback active:', speechErr);
        setIsListening(true);
      }
    } else {
      setIsListening(true);
    }
  }, [lang, continuous, interimResults, autoDetectLanguage, startVolumeMeter, isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up
  useEffect(() => {
    return () => {
      stopListening();
      stopVolumeMeter();
    };
  }, [stopListening, stopVolumeMeter]);

  return {
    isSupported,
    isListening,
    isTranscribing,
    volumeLevel,
    interimTranscript,
    detectedLanguage,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearError: () => setError(null),
  };
}
