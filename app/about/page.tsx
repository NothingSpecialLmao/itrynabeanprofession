import Link from 'next/link';
import AntiInspect from '../AntiInspect';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Về nhóm | MindMate AI' };

const TEAM = [
  {
    name: 'Nguyễn Hoàng Quân',
    initials: 'HQ',
    role: 'Lập trình',
    desc: 'Phụ trách toàn bộ phần code của MindMate AI.'
  },
  {
    name: 'Nguyễn Ngọc Bảo Hân',
    initials: 'BH',
    role: 'Ý tưởng và dẫn dắt nhóm',
    desc: 'Người nghĩ ra ý tưởng, định hướng sản phẩm và dẫn dắt cả nhóm (team leader).'
  }
];

export default function AboutPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg text-ink">
      <AntiInspect />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="stars" />
        <div className="stars-2" />
        <div className="anim-drift absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full blur-[110px] opacity-40" style={{ background: '#1d4ed8' }} />
        <div className="anim-drift absolute top-1/2 -right-40 h-[480px] w-[480px] rounded-full blur-[120px] opacity-30" style={{ background: '#1fb6c9', animationDelay: '-8s' }} />
      </div>

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <Link href="/" className="anim-rise inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quay lại trò chuyện
        </Link>

        <div className="mt-12 text-center">
          <span
            className="anim-rise anim-float mx-auto block h-16 w-16 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #fff 0%, #1fb6c9 38%, #0a2350 100%)',
              boxShadow: '0 0 40px 6px #1fb6c9'
            }}
          />
          <h1 className="anim-rise shimmer mt-8 text-5xl sm:text-6xl font-extrabold tracking-tight" style={{ animationDelay: '120ms, 120ms' }}>
            MindMate AI
          </h1>
          <p className="anim-rise mt-4 text-muted max-w-md mx-auto leading-relaxed" style={{ animationDelay: '240ms' }}>
            Không gian lắng nghe ẩn danh dành cho học sinh THPT, được tạo ra bởi một nhóm học sinh THPT Đinh Tiên Hoàng.
          </p>
          <p className="anim-rise mt-2 text-xs text-muted" style={{ animationDelay: '320ms' }}>
            Dự án dự thi Bảng B
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {TEAM.map((p, i) => (
            <div
              key={p.name}
              style={{ animationDelay: `${420 + i * 140}ms` }}
              className="anim-rise group rounded-3xl border border-line bg-panel backdrop-blur-xl p-6 transition-all hover:-translate-y-1 hover:border-accent/50"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-on-accent transition-transform group-hover:rotate-6"
                style={{ background: 'linear-gradient(135deg, #5bd1d7, #7aa2ff)' }}
              >
                {p.initials}
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">{p.name}</h2>
              <p className="mt-1 text-sm font-medium text-accent">{p.role}</p>
              <p className="mt-3 text-sm text-muted leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <p className="anim-rise mt-14 text-center text-xs text-muted" style={{ animationDelay: '800ms' }}>
          MindMate AI là công cụ hỗ trợ tinh thần, không thay thế chuyên gia tâm lý. Cần giúp ngay, hãy gọi 111.
        </p>
      </main>
    </div>
  );
}