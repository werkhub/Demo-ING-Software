"use client";

/**
 * React-Hook für die Web Speech API (Browser-nativ, kostenlos, kein Key).
 * Verfügbar in Chrome / Edge / Safari (teilweise). Im Firefox aktuell nicht.
 *
 * Liefert eine kontinuierliche Live-Transkription (deutsch) mit Interim-
 * Ergebnissen. Bei nicht unterstütztem Browser wird `supported === false`
 * gemeldet — die Voice-Page zeigt dann einen Fallback-Hinweis.
 *
 * Privacy: keine Audio-Persistenz, kein Server-Roundtrip — der Browser
 * spricht direkt mit der Spracherkennung des OS / Google.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal-Typen für Web Speech API (nicht in lib.dom standardmäßig). */
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEvent = {
  results: ArrayLike<SpeechRecognitionResult>;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type UseSpeechRecognitionReturn = {
  supported: boolean;
  recording: boolean;
  /** Final-Transkript (alle bestätigten Segmente zusammengefügt). */
  transkript: string;
  /** Interim-Transkript des aktuellen, noch nicht bestätigten Segments. */
  interim: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  /** Fehler-Code falls Mikro / Berechtigung scheitert. */
  error: string | null;
};

export function useSpeechRecognition(lang = "de-DE"): UseSpeechRecognitionReturn {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transkript, setTranskript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Auto-Restart nach unerwartetem `onend` (Browser stoppt nach längerer Pause).
  const wantRecordingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const ensureInstance = useCallback((): SpeechRecognitionInstance | null => {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return null;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (e) => {
      let interimAcc = "";
      let finalAcc = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0].transcript;
        if (res.isFinal) finalAcc += txt;
        else interimAcc += txt;
      }
      if (finalAcc) {
        setTranskript((prev) => (prev ? prev + " " + finalAcc.trim() : finalAcc.trim()));
      }
      setInterim(interimAcc);
    };
    r.onerror = (e) => {
      setError(e.error || "speech-recognition-error");
    };
    r.onend = () => {
      // Wenn der User noch aufnehmen will, automatisch neu starten.
      // Manche Browser stoppen nach ~60s Stille; wir bleiben aktiv.
      if (wantRecordingRef.current) {
        try {
          r.start();
          return;
        } catch {
          // ignore — Browser braucht manchmal kurze Pause
        }
      }
      setRecording(false);
      setInterim("");
    };
    recognitionRef.current = r;
    return r;
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    const r = ensureInstance();
    if (!r) {
      setError("not-supported");
      return;
    }
    wantRecordingRef.current = true;
    try {
      r.start();
      setRecording(true);
    } catch {
      // start() wirft, wenn schon läuft — ignorieren
    }
  }, [ensureInstance]);

  const stop = useCallback(() => {
    wantRecordingRef.current = false;
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      // ignore
    }
    setRecording(false);
    setInterim("");
  }, []);

  const reset = useCallback(() => {
    setTranskript("");
    setInterim("");
    setError(null);
  }, []);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      wantRecordingRef.current = false;
      const r = recognitionRef.current;
      if (r) {
        try {
          r.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    supported,
    recording,
    transkript,
    interim,
    start,
    stop,
    reset,
    error,
  };
}
