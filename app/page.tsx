'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AntiInspect from './AntiInspect';
import {
  ArrowUp, Menu, X, Plus, Wind, Flame, Activity, ShieldAlert,
  PhoneCall, Lock, CheckCircle2, Check
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mood?: string;
  risk?: number;
  action?: string;
  done?: boolean;
  fresh?: boolean;
}

type Panel = null | 'breathe' | 'burn' | 'insight' | 'sos';

const SUGGESTIONS = [
  'Áp lực thi cử cuối cấp làm mình thấy ngộp thở quá...',
  'Mình cảm thấy bị cô lập và không ai hiểu mình ở lớp.',
  'Sợ làm bố mẹ thất vọng vì điểm số vừa rồi...',
  'Mình mệt mỏi quá, chỉ muốn biến mất đi cho xong...'
];

const PHASES = [
  { label: 'Hít vào', sec: 4, scale: 1 },
  { label: 'Giữ hơi', sec: 7, scale: 1 },
  { label: 'Thở ra', sec: 8, scale: 0.55 }
];

const auraOf = (risk: number) => (risk >= 75 ? '#e0455f' : risk >= 40 ? '#e0a23b' : '#1fb6c9');

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Chào buổi sáng';
  if (h >= 11 && h < 14) return 'Chào buổi trưa';
  if (h >= 14 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function Orb({ size = 28, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {thinking && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'var(--aura)', opacity: 0.35 }} />}
      <span
        className="relative inline-block rounded-full"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, var(--aura) 38%, #0a2350 100%)',
          boxShadow: '0 0 18px 2px var(--aura)',
          transition: 'box-shadow 1.5s, width 0.6s, height 0.6s',
          animation: `breathe ${thinking ? 1 : 5}s ease-in-out infinite`
        }}
      />
    </span>
  );
}

function Reveal({ text, animate, onTick, onDone }: { text: string; animate: boolean; onTick?: () => void; onDone?: () => void }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      onDone?.();
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i = Math.min(text.length, i + 2);
      setN(i);
      if (i % 40 === 0) onTick?.();
      if (i >= text.length) {
        clearInterval(t);
        onDone?.();
      }
    }, 16);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="inline-block w-[2px] h-4 ml-0.5 align-middle bg-accent animate-pulse" />}
    </>
  );
}

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) return <p className="text-xs text-muted">Nhịp cảm xúc sẽ hiện sau vài tin nhắn.</p>;
  const w = 200, h = 40;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (Math.min(v, 100) / 100) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" aria-label="Biểu đồ nhịp cảm xúc">
      <polyline points={pts} fill="none" stroke="var(--aura)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="anim-rise w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-line bg-[#071322]/95 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="h-8 w-8 rounded-full hover:bg-surface flex items-center justify-center text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MindMateApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [sessionId, setSessionId] = useState('MM-0000');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [mood, setMood] = useState('Sẵn sàng lắng nghe');
  const [riskScore, setRiskScore] = useState(10);
  const [suggestedAction, setSuggestedAction] = useState('');

  const [panel, setPanel] = useState<Panel>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [burst, setBurst] = useState<number | null>(null);

  const [phase, setPhase] = useState(2);
  const [burnText, setBurnText] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [burned, setBurned] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setSessionId(`MM-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!input && textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input]);

  useEffect(() => {
    if (panel !== 'breathe') return;
    let i = 2;
    let timer: ReturnType<typeof setTimeout>;
    setPhase(2);
    const step = () => {
      i = (i + 1) % 3;
      setPhase(i);
      timer = setTimeout(step, PHASES[i].sec * 1000);
    };
    timer = setTimeout(step, 80);
    return () => clearTimeout(timer);
  }, [panel]);

  if (!isMounted) return null;

  const aura = auraOf(riskScore);
  const history = messages.filter((m) => m.role === 'assistant' && typeof m.risk === 'number').map((m) => m.risk as number);
  const doneCount = messages.filter((m) => m.done).length;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const updated: Message[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated.map(({ role, content }) => ({ role, content })) })
      });
      const data = await res.json();
      const risk = typeof data.riskScore === 'number' ? data.riskScore : 25;
      const action = typeof data.suggestedAction === 'string' ? data.suggestedAction : '';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || 'Mình vẫn đang nghe bạn đây.', mood: data.mood, risk, action, fresh: true }
      ]);
      if (data.mood) setMood(data.mood);
      setRiskScore(risk);
      setSuggestedAction(action);
      if (data.sos) setPanel('sos');
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Kết nối hơi gián đoạn một chút, nhưng mình vẫn ở đây nghe bạn nói nhé.', fresh: true }]);
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setRiskScore(10);
    setMood('Sẵn sàng lắng nghe');
    setSuggestedAction('');
    setSidebarOpen(false);
  };

  const openPanel = (p: Panel) => {
    setPanel(p);
    setSidebarOpen(false);
  };

  const burn = () => {
    if (!burnText.trim()) return;
    setIsBurning(true);
    setTimeout(() => {
      setBurnText('');
      setIsBurning(false);
      setBurned(true);
    }, 1500);
  };

  const toggleDone = (idx: number) => {
    if (!messages[idx]?.done) {
      setBurst(idx);
      setTimeout(() => setBurst(null), 900);
    }
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, done: !m.done } : m)));
  };

  const finishTyping = (idx: number) =>
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, fresh: false } : m)));

  const navBtn = 'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface hover:translate-x-0.5 transition-all text-left';

  return (
    <div
      ref={rootRef}
      onMouseMove={(e) => {
        rootRef.current?.style.setProperty('--mx', `${e.clientX}px`);
        rootRef.current?.style.setProperty('--my', `${e.clientY}px`);
      }}
      className="relative flex h-dvh overflow-hidden bg-bg text-ink"
      style={{ '--aura': aura } as React.CSSProperties}
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="stars" />
        <div className="stars-2" />
        <div className="anim-drift absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full blur-[110px] opacity-40" style={{ background: '#1d4ed8' }} />
        <div className="anim-drift absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full blur-[120px] opacity-30 transition-colors duration-[2000ms]" style={{ background: 'var(--aura)', animationDelay: '-8s' }} />
        <div className="anim-drift absolute -bottom-48 left-1/4 h-[420px] w-[420px] rounded-full blur-[110px] opacity-25 transition-colors duration-[2000ms]" style={{ background: 'var(--aura)', animationDelay: '-15s' }} />
        <div className="hidden md:block absolute inset-0" style={{ background: 'radial-gradient(520px circle at var(--mx, 50%) var(--my, 30%), rgba(91,209,215,0.07), transparent 60%)' }} />
      </div>

      <AntiInspect />

      <Link
        href="/about"
        className="fixed right-2 top-1/2 z-20 hidden lg:block -translate-y-1/2 rotate-180 text-[10px] tracking-[0.25em] text-muted/60 hover:text-accent transition-colors [writing-mode:vertical-rl]"
      >
        MINDMATE AI, NGUYỄN HOÀNG QUÂN VÀ NGUYỄN NGỌC BẢO HÂN
      </Link>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col border-r border-line bg-panel backdrop-blur-xl p-3 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <Orb size={26 + Math.min(doneCount, 6) * 2} />
          <span className="font-semibold tracking-tight">MindMate</span>
        </div>

        <button onClick={newChat} className={`${navBtn} border border-line bg-surface font-medium mb-3`}>
          <Plus className="h-4 w-4" /> Cuộc trò chuyện mới
        </button>

        <nav className="space-y-0.5">
          <button onClick={() => openPanel('breathe')} className={navBtn}><Wind className="h-4 w-4 text-muted" /> Trạm thở 4-7-8</button>
          <button onClick={() => { setBurned(false); openPanel('burn'); }} className={navBtn}><Flame className="h-4 w-4 text-muted" /> Hộp đốt nỗi buồn</button>
          <button onClick={() => openPanel('insight')} className={navBtn}><Activity className="h-4 w-4 text-muted" /> Phân tích cảm xúc</button>
        </nav>

        <div className="mt-5 rounded-2xl border border-line bg-surface p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Nhịp cảm xúc</span>
            <span className="font-medium" style={{ color: 'var(--aura)' }}>{mood}</span>
          </div>
          <Spark data={history} />
          <p className="text-xs text-muted">Việc nhỏ đã làm: <span className="text-ink font-medium">{doneCount}</span>. Quả cầu lớn dần mỗi lần bạn hoàn thành một việc.</p>
        </div>

        <div className="mt-auto space-y-3">
          <button onClick={() => openPanel('sos')} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger border border-danger/40 hover:bg-danger/10 transition-colors">
            <ShieldAlert className="h-4 w-4" /> Cần giúp ngay
          </button>
          <div className="px-2 text-xs text-muted leading-relaxed">
            <p className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Ẩn danh, mã phiên {sessionId}</p>
            <p className="mt-1">Cuộc trò chuyện mất khi bạn đóng tab. THPT Đinh Tiên Hoàng, Bảng B.</p>
            <Link href="/about" className="mt-2 inline-block hover:text-accent transition-colors">
              Về nhóm tác giả MindMate AI
            </Link>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-3 sm:px-5 h-14 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} aria-label="Mở menu" className="md:hidden h-9 w-9 rounded-full hover:bg-surface flex items-center justify-center">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-medium text-[15px] md:hidden">MindMate</span>
          </div>
          <button onClick={() => openPanel('insight')} className="flex items-center gap-2 rounded-full border border-line bg-panel backdrop-blur px-3 py-1.5 text-xs text-muted hover:text-ink transition-colors">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--aura)', boxShadow: '0 0 8px var(--aura)' }} />
            {mood}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 pb-6">
            {messages.length === 0 ? (
              <div className="pt-[10vh] sm:pt-[14vh]">
                <div className="anim-rise anim-float inline-block"><Orb size={56} /></div>
                <h1 className="anim-rise mt-6 text-3xl sm:text-4xl font-semibold tracking-tight" style={{ animationDelay: '120ms' }}>
                  {greeting()}. Hôm nay bạn thế nào?
                </h1>
                <p className="anim-rise mt-3 text-muted max-w-md leading-relaxed" style={{ animationDelay: '240ms' }}>
                  Đây là chỗ để nói ra điều đang nặng lòng. Không ai chấm điểm, không lưu tên bạn.
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{ animationDelay: `${380 + i * 110}ms` }}
                      className="anim-rise text-left text-sm leading-relaxed rounded-2xl border border-line bg-panel backdrop-blur p-4 hover:border-accent/50 hover:bg-surface hover:-translate-y-0.5 transition-all"
                    >
                      {s}
                      {i === 3 && <span className="block mt-2 text-xs text-danger">Thử chức năng SOS</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-7 pt-4">
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="flex justify-end anim-rise">
                      <div className="max-w-[85%] rounded-3xl border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-3 anim-rise">
                      <div className="mt-1"><Orb size={24} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-[1.8] whitespace-pre-wrap">
                          <Reveal
                            text={m.content}
                            animate={!!m.fresh}
                            onTick={() => endRef.current?.scrollIntoView({ behavior: 'auto' })}
                            onDone={() => finishTyping(i)}
                          />
                        </p>
                        {!m.fresh && m.mood && (
                          <span className="anim-rise mt-3 inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: auraOf(m.risk ?? 0) }} />
                            {m.mood}
                          </span>
                        )}
                        {!m.fresh && m.action && (
                          <div className={`anim-rise mt-3 flex items-start gap-3 rounded-2xl border p-3.5 transition-colors ${m.done ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface'}`}>
                            <button
                              onClick={() => toggleDone(i)}
                              aria-label={m.done ? 'Bỏ đánh dấu đã làm' : 'Đánh dấu đã làm'}
                              aria-pressed={!!m.done}
                              className={`relative mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-colors ${m.done ? 'bg-accent border-accent text-on-accent' : 'border-muted hover:border-accent'}`}
                            >
                              {m.done && <Check className="h-3 w-3" />}
                              {burst === i &&
                                Array.from({ length: 8 }).map((_, k) => {
                                  const a = (k / 8) * Math.PI * 2;
                                  return (
                                    <span
                                      key={k}
                                      aria-hidden
                                      className="anim-sparkle absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-accent"
                                      style={{ '--dx': `${Math.cos(a) * 30}px`, '--dy': `${Math.sin(a) * 30}px` } as React.CSSProperties}
                                    />
                                  );
                                })}
                            </button>
                            <div className="min-w-0">
                              <p className="text-xs text-muted">Việc nhỏ cho bạn</p>
                              <p className={`text-sm leading-relaxed ${m.done ? 'text-muted' : ''}`}>{m.action}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
                {loading && (
                  <div className="flex items-center gap-3" aria-label="MindMate đang trả lời">
                    <Orb size={24} thinking />
                    <span className="text-xs text-muted">Đang nghe và suy nghĩ...</span>
                  </div>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="group relative mx-auto max-w-3xl overflow-hidden rounded-3xl p-px">
            <div
              aria-hidden
              className={`absolute -inset-[150%] animate-[spin_6s_linear_infinite] transition-opacity duration-500 group-focus-within:opacity-100 ${loading ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'conic-gradient(from 0deg, transparent 0 65%, var(--aura) 85%, transparent 100%)' }}
            />
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="relative flex items-end gap-2 rounded-[23px] border border-line bg-[#07111f] p-2"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Nhắn cho MindMate..."
                className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted max-h-40"
              />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Gửi" className="h-9 w-9 shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition-all">
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
          </div>
          <p className="mx-auto max-w-3xl mt-2 text-center text-xs text-muted">
            MindMate là AI, không thay thế chuyên gia tâm lý. Cần giúp ngay, hãy gọi 111.
          </p>
        </div>
      </main>

      {panel === 'insight' && (
        <Modal title="Phân tích cảm xúc" onClose={() => setPanel(null)}>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted mb-1">Trạng thái nhận diện</p>
              <p className="font-medium">{mood}</p>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>Mức căng thẳng</span>
                <span className="font-semibold" style={{ color: 'var(--aura)' }}>{riskScore}/100</span>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${riskScore}%`, background: 'var(--aura)' }} />
              </div>
            </div>
            <Spark data={history} />
            {suggestedAction && (
              <div className="rounded-2xl bg-accent-soft border border-accent/30 p-4">
                <p className="text-xs text-muted mb-1">Việc nhỏ cho bạn</p>
                <p className="text-sm leading-relaxed">{suggestedAction}</p>
              </div>
            )}
            <p className="text-xs text-muted leading-relaxed">
              Hai lớp bảo vệ: từ khóa nguy cấp mở ngay cửa sổ trợ giúp, và AI chấm điểm ngữ cảnh để phát hiện dấu hiệu tinh vi hơn.
            </p>
          </div>
        </Modal>
      )}

      {panel === 'breathe' && (
        <Modal title="Trạm thở 4-7-8" onClose={() => setPanel(null)}>
          <p className="text-sm text-muted text-center leading-relaxed">Hít vào 4 giây, giữ 7 giây, thở ra 8 giây. Lặp lại 3 lần.</p>
          <div className="relative mx-auto my-8 h-56 w-56 flex items-center justify-center">
            {[1, 0.8, 0.6].map((s, k) => (
              <div
                key={k}
                className="absolute inset-0 rounded-full border"
                style={{
                  borderColor: 'var(--aura)',
                  opacity: 0.35 + k * 0.2,
                  background: k === 2 ? 'color-mix(in srgb, var(--aura) 18%, transparent)' : 'transparent',
                  transform: `scale(${PHASES[phase].scale * s})`,
                  transition: `transform ${PHASES[phase].sec}s ease-in-out`
                }}
              />
            ))}
            <div className="relative text-center">
              <p className="text-lg font-semibold">{PHASES[phase].label}</p>
              <p className="text-sm text-muted">{PHASES[phase].sec} giây</p>
            </div>
          </div>
        </Modal>
      )}

      {panel === 'burn' && (
        <Modal title="Hộp đốt nỗi buồn" onClose={() => setPanel(null)}>
          {burned ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-accent mx-auto" />
              <p className="font-medium">Đã xóa sạch.</p>
              <p className="text-sm text-muted">Nó không được lưu ở đâu cả. Bạn muốn viết thêm không?</p>
              <button onClick={() => setBurned(false)} className="mt-3 rounded-full border border-line px-4 py-2 text-sm hover:bg-surface">Viết tiếp</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted leading-relaxed">Viết ra điều bạn không nói được với ai. Khi bấm đốt, nội dung biến mất hoàn toàn.</p>
              <div className="relative">
                <textarea
                  value={burnText}
                  onChange={(e) => setBurnText(e.target.value)}
                  placeholder="Viết vào đây..."
                  rows={6}
                  className={`w-full rounded-2xl border border-line bg-surface p-4 text-sm outline-none focus:border-accent/60 resize-none transition-all duration-1000 ${isBurning ? 'opacity-0 scale-95 blur-sm' : ''}`}
                />
                {isBurning && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    {Array.from({ length: 16 }).map((_, k) => (
                      <span
                        key={k}
                        className="anim-ember absolute bottom-2 h-1.5 w-1.5 rounded-full"
                        style={{ left: `${((k * 37) % 96) + 2}%`, animationDelay: `${(k % 6) * 120}ms`, background: k % 2 ? '#f2b45a' : '#ff6b81' }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button onClick={burn} disabled={!burnText.trim() || isBurning} className="w-full rounded-full bg-accent text-on-accent py-2.5 text-sm font-medium disabled:opacity-30 flex items-center justify-center gap-2">
                <Flame className="h-4 w-4" /> {isBurning ? 'Đang đốt...' : 'Đốt bỏ'}
              </button>
            </div>
          )}
        </Modal>
      )}

      {panel === 'sos' && (
        <Modal title="Bạn không đơn độc" onClose={() => setPanel(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted leading-relaxed">Nếu bạn đang nghĩ đến chuyện làm hại bản thân, hãy liên hệ một trong các cách sau ngay bây giờ.</p>
            <a href="tel:111" className="flex items-center justify-between rounded-2xl bg-danger text-white p-4 font-semibold">
              <span className="flex items-center gap-2 text-sm"><PhoneCall className="h-4 w-4" /> Tổng đài bảo vệ trẻ em</span>
              <span>111</span>
            </a>
            <a href="tel:1900599930" className="flex items-center justify-between rounded-2xl border border-line p-4 text-sm hover:bg-surface">
              <span>Đường dây tư vấn tâm lý</span>
              <span className="font-semibold text-accent">1900 599 930</span>
            </a>
            <div className="rounded-2xl bg-surface p-4 space-y-3">
              <p className="text-xs text-muted leading-relaxed">Ngại gọi điện? Gửi tín hiệu ẩn danh kèm mã phiên {sessionId} tới phòng tư vấn học đường.</p>
              {sosSent ? (
                <p className="flex items-center gap-2 text-sm text-accent font-medium"><CheckCircle2 className="h-4 w-4" /> Đã gửi tín hiệu tới thầy cô phụ trách.</p>
              ) : (
                <button
                  onClick={() => setSosSent(true)}
                  className="w-full rounded-full bg-ink text-bg py-2.5 text-sm font-medium"
                >
                  Gửi tín hiệu ẩn danh
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}