import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, CheckCircle, Camera,
  RefreshCw, Mic, MicOff, Volume2, Globe, Check, ShieldAlert,
  AlertTriangle, Image, ChevronDown, ChevronUp, XCircle, RotateCcw
} from 'lucide-react';
import {
  processChatMessage,
  SUPPORTED_LANGUAGES,
  speakAloud,
  stopSpeaking
} from '../services/nlpEngine';
import { api } from '../services/api';

// BMW Rules 2016 bin colour map for display
const BIN_COLORS = {
  White:  { bg: '#F8FAFC', border: '#94A3B8', text: '#1E293B', emoji: '⚪' },
  Yellow: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', emoji: '🟡' },
  Red:    { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', emoji: '🔴' },
  Blue:   { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', emoji: '🔵' },
  Green:  { bg: '#F0FDF4', border: '#22C55E', text: '#166534', emoji: '🟢' },
};

const AIAssistant = ({ role = 'worker', onSuggest }) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);       // { uncertain, reason, items[] } from vision API
  const [textResult, setTextResult] = useState(null); // NLP-based result for text queries
  const [conversationalAdvice, setConversationalAdvice] = useState('');
  const [selectedVoiceLang, setSelectedVoiceLang] = useState('en-IN');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [expandedItemIdx, setExpandedItemIdx] = useState(null);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) recognitionRef.current.abort();
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller. Please compress or choose a smaller photo.');
      return;
    }

    setSelectedImage(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    setResult(null);
    setTextResult(null);
    setConversationalAdvice('');
    setHasApplied(false);
    setSelectedItemIdx(0);
    setExpandedItemIdx(null);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const startSpeech = () => {
    setSpeechError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported. Please use Chrome or Edge.');
      setTimeout(() => setSpeechError(''), 4000);
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = selectedVoiceLang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.onstart = () => setIsListening(true);
      rec.onresult = (evt) => {
        const transcript = Array.from(evt.results).map(r => r[0].transcript).join('');
        setInputText(transcript);
      };
      rec.onerror = (evt) => {
        if (evt.error !== 'no-speech') setSpeechError(`Microphone notice: ${evt.error}`);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Speech error:', err);
      setIsListening(false);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() && !selectedImage) {
      setError('Please speak, enter a description, or upload a photo of the waste item.');
      return;
    }
    setError('');

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setAnalyzing(true);
    setResult(null);
    setTextResult(null);
    setConversationalAdvice('');
    setHasApplied(false);
    setSelectedItemIdx(0);
    setExpandedItemIdx(null);

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      if (selectedImage) {
        // ── Path A: Real Gemini vision classification ────────────────────
        const visionResult = await api.classifyImage(selectedImage, abortRef.current.signal);
        setResult(visionResult);

        // Auto-apply if single non-uncertain item with high confidence
        if (!visionResult.uncertain && visionResult.items?.length === 1 && visionResult.items[0].confidence >= 0.6) {
          const item = visionResult.items[0];
          if (onSuggest) {
            onSuggest({ type: item.category, bin: item.bin, guidance: item.disposal, confidence: Math.round(item.confidence * 100) });
          }
          setHasApplied(true);
        }
      } else {
        // ── Path B: NLP text classification (rule-table first, fallback to NLP) ──
        await new Promise(resolve => setTimeout(resolve, 600));
        const langKey = selectedVoiceLang.startsWith('ta') ? 'ta'
          : (selectedVoiceLang.startsWith('hi') ? 'hi'
          : (selectedVoiceLang.startsWith('te') ? 'te'
          : (selectedVoiceLang.startsWith('ml') ? 'ml'
          : (selectedVoiceLang.startsWith('kn') ? 'kn' : 'en'))));
        const analysis = processChatMessage(inputText, false, langKey);
        setConversationalAdvice(analysis.text);
        if (analysis.result) {
          setTextResult(analysis.result);
          if (onSuggest) {
            onSuggest({ type: analysis.result.category || analysis.result.type, bin: analysis.result.bin, guidance: analysis.result.guidance, confidence: analysis.result.confidence });
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // Request was cancelled, ignore
      let msg = err.message || 'Something went wrong. Please try again.';
      if (err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY') {
        msg = 'Vision AI is not configured. The hospital admin needs to set up the Gemini API key on the server.';
      } else if (err.code === 'RATE_LIMIT' || err.status === 429) {
        msg = 'AI service is temporarily busy. Please wait a moment and try again.';
      } else if (err.code === 'FILE_TOO_LARGE') {
        msg = 'Image is too large (max 5 MB). Please choose a smaller photo.';
      } else if (!navigator.onLine) {
        msg = 'No internet connection. Please check your network and try again.';
      }
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    stopSpeaking();
    if (abortRef.current) abortRef.current.abort();
    setInputText('');
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setTextResult(null);
    setConversationalAdvice('');
    setHasApplied(false);
    setError('');
    setSelectedItemIdx(0);
    setExpandedItemIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyItem = (item) => {
    if (onSuggest && item) {
      onSuggest({ type: item.category, bin: item.bin, guidance: item.disposal, confidence: Math.round((item.confidence || 0) * 100) });
      setHasApplied(true);
    }
  };

  const handleApplyTextResult = () => {
    if (textResult && onSuggest) {
      onSuggest({ type: textResult.category || textResult.type, bin: textResult.bin, guidance: textResult.guidance, confidence: textResult.confidence });
      setHasApplied(true);
    }
  };

  const selectedItem = result?.items?.[selectedItemIdx];
  const confidencePct = selectedItem ? Math.round((selectedItem.confidence || 0) * 100) : 0;
  const isLowConfidence = selectedItem && selectedItem.confidence < 0.6;
  const binStyle = selectedItem ? (BIN_COLORS[selectedItem.bin] || BIN_COLORS.Green) : null;

  return (
    <div className="card shadow-md" style={{ border: '2px solid var(--accent-teal, #16A085)', borderRadius: '12px' }}>
      <div className="card-header flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <h3 className="flex items-center gap-2" style={{ color: 'var(--accent-teal, #16A085)', margin: 0, fontSize: '1.2rem' }}>
          <Sparkles size={22} className="pulse" />
          AI Waste Identifier — Vision + Voice
        </h3>
        {role === 'worker' && (
          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Worker Collection Helper</span>
        )}
      </div>

      <p style={{ marginTop: '0.75rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        📸 Upload a photo for <strong>Gemini Vision AI</strong> classification, or describe waste in any language for text analysis. The AI uses <strong>BMW Rules 2016</strong> bin mapping.
      </p>

      {/* Language Selector */}
      <div style={{ padding: '0.4rem 0.6rem', backgroundColor: '#F1F5F9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569' }}>
          <Globe size={14} color="#0D9488" />
          <span>Speech Language:</span>
        </div>
        <select value={selectedVoiceLang} onChange={(e) => setSelectedVoiceLang(e.target.value)} style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.76rem', backgroundColor: '#fff' }}>
          {SUPPORTED_LANGUAGES.map(l => (<option key={l.code} value={l.code}>{l.flag} {l.label}</option>))}
        </select>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '0.6rem 0.8rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <XCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '0.82rem', color: '#991B1B' }}>{error}</span>
        </div>
      )}

      {speechError && (
        <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: '0.5rem' }}>⚠️ {speechError}</div>
      )}

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />

      {/* Upload Button */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
        <button type="button" className="btn btn-outline flex items-center justify-center gap-2" onClick={triggerFileInput} style={{ flex: 1, borderColor: '#0D9488', color: '#0D9488', padding: '0.45rem' }}>
          <Camera size={16} /> Take Photo / Upload Image
        </button>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div style={{ position: 'relative', borderRadius: '10px', border: '2px solid #0D9488', backgroundColor: '#F0FDFA', textAlign: 'center', maxHeight: '180px', padding: '0.5rem', marginBottom: '0.75rem', overflow: 'hidden' }}>
          <img src={imagePreview} alt="Waste Preview" style={{ maxHeight: '155px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }} />
          <button onClick={() => { setSelectedImage(null); setImagePreview(null); setResult(null); setError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
          <div style={{ fontSize: '0.7rem', color: '#0F766E', marginTop: '4px' }}>
            📷 {selectedImage?.name} ({(selectedImage?.size / 1024).toFixed(0)} KB) — Ready to analyze with Gemini Vision
          </div>
        </div>
      )}

      {/* Speech + Text Input */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button type="button" onClick={startSpeech} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isListening ? '#EF4444' : '#E0F2FE', border: isListening ? '2px solid #DC2626' : '1px solid #BAE6FD', color: isListening ? '#FFF' : '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} title={isListening ? 'Stop listening' : 'Click to speak'}>
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input type="text" className="form-control" placeholder={isListening ? 'Listening...' : 'Or type: scissors, syringe, cotton, etc.'} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze(); }} style={{ flex: 1, fontSize: '0.85rem', border: isListening ? '2px solid #EF4444' : undefined, backgroundColor: isListening ? '#FEF2F2' : undefined }} />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="btn btn-primary flex items-center justify-center gap-2" onClick={handleAnalyze} disabled={analyzing || (!inputText.trim() && !selectedImage)} style={{ flex: 1, backgroundColor: '#0D9488', color: '#FFF', padding: '0.55rem' }}>
          {analyzing ? <><RefreshCw size={16} className="spin" /> {selectedImage ? 'Analyzing with Gemini Vision...' : 'Analyzing with NLP...'}</> : <><Sparkles size={16} /> {selectedImage ? 'Identify Waste (Vision AI)' : 'Analyze with AI'}</>}
        </button>
        {(result || textResult || conversationalAdvice || selectedImage || inputText) && (
          <button className="btn btn-outline" onClick={handleReset} style={{ padding: '0.55rem 0.8rem' }}>Reset</button>
        )}
      </div>

      {/* ── Uncertain / Retake Notice ─────────────────────────────────── */}
      {result?.uncertain && (
        <div style={{ marginTop: '0.85rem', padding: '0.85rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#92400E', fontSize: '0.9rem' }}>Not sure — please confirm manually</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#78350F' }}>{result.reason || 'The image was unclear or no identifiable waste was detected.'}</p>
            </div>
          </div>
          {result.items?.length > 0 && (
            <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#92400E' }}>
              Partial detections shown below with low confidence. Please verify before logging.
            </p>
          )}
          <button onClick={handleReset} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#0D9488', background: 'none', border: '1px solid #0D9488', borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer' }}>
            <RotateCcw size={14} /> Retake / Try Different Photo
          </button>
        </div>
      )}

      {/* ── Vision Result Cards (multi-item) ────────────────────────── */}
      {result && result.items && result.items.length > 0 && (
        <div className="fade-in" style={{ marginTop: '0.85rem' }}>
          {/* Item selector tabs if multiple items */}
          {result.items.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', alignSelf: 'center' }}>{result.items.length} items detected:</span>
              {result.items.map((item, idx) => (
                <button key={idx} onClick={() => setSelectedItemIdx(idx)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', border: selectedItemIdx === idx ? '2px solid #0D9488' : '1px solid #CBD5E1', backgroundColor: selectedItemIdx === idx ? '#F0FDFA' : '#F8FAFC', color: selectedItemIdx === idx ? '#0F766E' : '#475569' }}>
                  {item.name.length > 18 ? item.name.slice(0, 18) + '…' : item.name}
                </button>
              ))}
            </div>
          )}

          {/* Selected item card */}
          {selectedItem && (() => {
            const bins = BIN_COLORS[selectedItem.bin] || BIN_COLORS.Green;
            const pct = Math.round((selectedItem.confidence || 0) * 100);
            const low = selectedItem.confidence < 0.6;
            return (
              <div style={{ padding: '1rem', backgroundColor: bins.bg, borderRadius: '10px', border: `1.5px solid ${bins.border}` }}>
                {/* Header */}
                <div className="flex justify-between items-center" style={{ marginBottom: '0.65rem' }}>
                  <h4 className="flex items-center gap-2" style={{ color: bins.text, margin: 0, fontSize: '0.95rem' }}>
                    <CheckCircle size={18} color={bins.border} />
                    {selectedItem.name}
                    {selectedItem.binCorrected && <span style={{ fontSize: '0.65rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>Rule-corrected</span>}
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: low ? '#DC2626' : bins.text, backgroundColor: low ? '#FEE2E2' : bins.bg, border: `1px solid ${low ? '#FECACA' : bins.border}`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {pct}% {low ? '⚠️ low' : '✓'}
                  </span>
                </div>

                {low && (
                  <div style={{ fontSize: '0.78rem', color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '0.4rem 0.6rem', marginBottom: '0.6rem' }}>
                    ⚠️ <strong>Low confidence — not auto-filled.</strong> Please verify this classification manually before logging.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.55rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>Category</span>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.1rem 0 0 0', color: '#0F172A' }}>{selectedItem.category}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>Assigned Bin</span>
                    <div style={{ marginTop: '0.2rem' }}>
                      <span className={`bin-tag bin-${selectedItem.bin.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                        {bins.emoji} {selectedItem.bin} Bin
                      </span>
                    </div>
                    {selectedItem.binCorrected && <p style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '4px' }}>ℹ️ {selectedItem.binCorrectionReason}</p>}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase' }}>Disposal Method</span>
                    <p style={{ fontSize: '0.82rem', margin: '0.1rem 0 0 0', color: '#334155', backgroundColor: '#FFF', padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>{selectedItem.disposal}</p>
                  </div>
                  {selectedItem.hazard_warning && (
                    <div style={{ padding: '0.5rem 0.7rem', backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444', borderRadius: '4px', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <ShieldAlert size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '0.78rem', color: '#991B1B' }}><strong>Hazard:</strong> {selectedItem.hazard_warning}</span>
                    </div>
                  )}
                  {selectedItem.ppe && (
                    <div style={{ fontSize: '0.78rem', color: '#1E40AF', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.4rem 0.6rem' }}>
                      🥼 <strong>PPE required:</strong> {selectedItem.ppe}
                    </div>
                  )}
                </div>

                {/* Apply button */}
                {onSuggest && !low && (
                  <button onClick={() => handleApplyItem(selectedItem)} disabled={hasApplied}
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', backgroundColor: hasApplied ? '#10B981' : '#0D9488', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: hasApplied ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {hasApplied ? <><Check size={14} /> Applied to Form</> : <><Sparkles size={14} /> Apply to Form</>}
                  </button>
                )}
                {onSuggest && low && (
                  <button onClick={() => handleApplyItem(selectedItem)}
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.45rem', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} /> Apply Anyway (Low Confidence — Verify First)
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Text NLP result (when no image) ─────────────────────────── */}
      {conversationalAdvice && (
        <div style={{ marginTop: '0.85rem', padding: '0.75rem 0.9rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', lineHeight: 1.5, color: '#1E293B', whiteSpace: 'pre-line' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>{conversationalAdvice}</div>
            <button onClick={() => speakAloud(conversationalAdvice, selectedVoiceLang)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0D9488', marginLeft: '6px' }} title="Speak aloud">
              <Volume2 size={16} />
            </button>
          </div>
        </div>
      )}

      {textResult && (
        <div className="fade-in" style={{ marginTop: '0.65rem', padding: '0.85rem', backgroundColor: '#F0FDFA', borderRadius: '10px', border: '1px solid #99F6E4' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <h4 className="flex items-center gap-2" style={{ color: '#0F766E', margin: 0, fontSize: '0.9rem' }}>
              <CheckCircle size={16} color="#0D9488" /> Text Classification
            </h4>
            <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#0F766E', backgroundColor: '#CCFBF1', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              {textResult.confidence}% Match
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{textResult.category || textResult.type} → <span className={`bin-tag bin-${(textResult.bin || 'green').toLowerCase()}`}>{textResult.bin} Bin</span></p>
          {onSuggest && (
            <button onClick={handleApplyTextResult} disabled={hasApplied} style={{ marginTop: '0.6rem', width: '100%', padding: '0.45rem', backgroundColor: hasApplied ? '#10B981' : '#0D9488', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: hasApplied ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {hasApplied ? <><Check size={13} /> Applied to Form</> : <><Sparkles size={13} /> Apply to Form</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
