const { useState, useMemo, useRef, useEffect } = React;

const I = {
  Doc: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Truck: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6h12v10H3zM15 9h4l2 3v4h-6" stroke="currentColor" strokeWidth="1.6"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Map: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Form: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Home: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  ChevronDown: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Chevron: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Bell: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Plus: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Check: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Spark: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
};

const SIDEBAR = [
  { id: "home", label: "홈",       icon: I.Home },
  { id: "order", label: "발주서",  icon: I.Doc },
  { id: "tracking", label: "운송장", icon: I.Truck },
  { id: "mapping", label: "매핑관리", icon: I.Map, badge: 3 },
  { id: "form", label: "양식관리",  icon: I.Form },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand__mark">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M3 6c4 0 4 12 8 12s4-12 8-12" stroke="#3182F6" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
            <circle cx="20" cy="5" r="2" fill="#3182F6"/>
          </svg>
        </div>
        <div className="brand__text">
          <div className="brand__name">WithLab</div>
          <div className="brand__sub">과일 발주 시스템</div>
        </div>
      </div>
      <nav className="sidebar__nav">
        <div className="nav__section">메인</div>
        {SIDEBAR.map((it) => {
          const active = it.id === "home";
          const IcoX = it.icon;
          return (
            <a key={it.id} className={`nav__item ${active ? "is-active" : ""}`} href="#">
              <IcoX width="20" height="20" />
              <span>{it.label}</span>
              {it.badge && <span className="nav__badge">{it.badge}</span>}
            </a>
          );
        })}
      </nav>
      <div className="sidebar__foot">
        <div className="user">
          <div className="user__avatar">박</div>
          <div className="user__info">
            <div className="user__name">박운영</div>
            <div className="user__role">운영팀 · withlab</div>
          </div>
          <I.ChevronDown width="16" height="16" color="#8B95A1" />
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="crumb">
          <span className="crumb__strong">홈</span>
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="알림"><I.Bell width="18" height="18" /></button>
        <div className="topbar__divider" />
        <button className="ghostbtn">사용 가이드</button>
      </div>
    </header>
  );
}

// ───────── Greeting ─────────
function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "이른 새벽이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "오늘도 수고 많으세요";
  return "오늘도 고생 많으셨어요";
}

function Greet() {
  const today = "2026년 5월 9일 토요일";
  return (
    <section className="greet">
      <div>
        <div className="greet__hello">{greeting()}, <span className="greet__name">박운영</span>님</div>
        <div className="greet__date">{today} · WithLab 과일 발주 시스템</div>
      </div>
      <div className="greet__stats">
        <div className="gstat">
          <div className="gstat__num">3</div>
          <div className="gstat__lbl">진행중 작업</div>
        </div>
        <div className="gstat">
          <div className="gstat__num">218</div>
          <div className="gstat__lbl">이달 처리 주문</div>
        </div>
        <div className="gstat">
          <div className="gstat__num t-warn">2</div>
          <div className="gstat__lbl">미매핑 품목</div>
        </div>
      </div>
    </section>
  );
}

// ───────── Quick action cards ─────────
function QuickAction({ icon, eyebrow, title, desc, accent, illust }) {
  return (
    <a href="#" className={`qa qa--${accent}`}>
      <div className="qa__head">
        <div className="qa__icon">{icon}</div>
        <div className="qa__eyebrow">{eyebrow}</div>
      </div>
      <div className="qa__title">{title}</div>
      <div className="qa__desc">{desc}</div>
      <div className="qa__cta">
        시작하기
        <I.Chevron width="14" height="14"/>
      </div>
      <div className="qa__art">{illust}</div>
    </a>
  );
}

const OrderArt = (
  <svg viewBox="0 0 200 140" width="200" height="140">
    <defs>
      <linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3182F6"/>
        <stop offset="1" stopColor="#1B64DA"/>
      </linearGradient>
    </defs>
    <rect x="14" y="20" width="120" height="100" rx="10" fill="white" opacity="0.16"/>
    <rect x="28" y="34" width="120" height="100" rx="10" fill="white"/>
    <rect x="44" y="50" width="48" height="6" rx="3" fill="#E5E8EB"/>
    <rect x="44" y="62" width="80" height="6" rx="3" fill="#E5E8EB"/>
    <rect x="44" y="74" width="64" height="6" rx="3" fill="#E5E8EB"/>
    <rect x="44" y="92" width="40" height="20" rx="6" fill="url(#og)"/>
    <circle cx="148" cy="106" r="22" fill="#fff"/>
    <path d="M148 96v20M138 106h20" stroke="#3182F6" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const TrackArt = (
  <svg viewBox="0 0 200 140" width="200" height="140">
    <rect x="20" y="46" width="100" height="60" rx="6" fill="white"/>
    <rect x="120" y="62" width="36" height="44" rx="6" fill="white"/>
    <path d="M120 72h22l14 18v16h-36z" fill="white"/>
    <circle cx="50" cy="112" r="10" fill="#191F28"/>
    <circle cx="50" cy="112" r="4" fill="white"/>
    <circle cx="138" cy="112" r="10" fill="#191F28"/>
    <circle cx="138" cy="112" r="4" fill="white"/>
    <rect x="32" y="58" width="36" height="6" rx="3" fill="#E5E8EB"/>
    <rect x="32" y="70" width="56" height="6" rx="3" fill="#E5E8EB"/>
    <path d="M84 84l4 4 8-8" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

function QuickActions() {
  return (
    <section className="qarow">
      <QuickAction
        accent="blue"
        icon={<I.Doc width="22" height="22"/>}
        eyebrow="STEP 01"
        title="새 발주 작업 시작"
        desc="주문 엑셀을 업로드하고 공급처별 발주서를 자동으로 만들어요."
        illust={OrderArt}
      />
      <QuickAction
        accent="dark"
        icon={<I.Truck width="22" height="22"/>}
        eyebrow="STEP 02"
        title="운송장 매칭 시작"
        desc="공급처에서 받은 운송장 파일을 올리면 주문번호와 자동으로 연결돼요."
        illust={TrackArt}
      />
    </section>
  );
}

// ───────── Recent jobs ─────────
const JOBS = [
  { id: 1, name: "2026-05-08 오전 발주", createdAt: "2026-05-08 09:14", suppliers: 4, orders: 86, status: "in-progress",
    progress: 60, step: "공급처 분류 완료 · 발주서 생성 대기" },
  { id: 2, name: "2026-05-07 오전 발주", createdAt: "2026-05-07 09:08", suppliers: 5, orders: 124, status: "done",
    progress: 100, step: "운송장 매칭 완료" },
  { id: 3, name: "2026-05-06 오전 발주", createdAt: "2026-05-06 09:21", suppliers: 4, orders: 92, status: "done",
    progress: 100, step: "운송장 매칭 완료" },
  { id: 4, name: "2026-05-05 오전 발주", createdAt: "2026-05-05 10:02", suppliers: 3, orders: 64, status: "done",
    progress: 100, step: "운송장 매칭 완료" },
];

const STATUS_MAP = {
  "in-progress": { label: "진행중", className: "jstat jstat--prog" },
  "done":        { label: "완료",   className: "jstat jstat--done" },
};

function JobItem({ j }) {
  const s = STATUS_MAP[j.status];
  return (
    <a href="#" className="job">
      <div className="job__col-name">
        <div className="job__name">{j.name}</div>
        <div className="job__sub">{j.createdAt} · 공급처 {j.suppliers} · 주문 {j.orders}건</div>
      </div>
      <div className="job__col-progress">
        <div className="job__step">{j.step}</div>
        <div className="job__bar"><div className="job__bar-fill" style={{ width: `${j.progress}%` }}/></div>
      </div>
      <div className="job__col-status">
        <span className={s.className}>
          {j.status === "in-progress" ? <span className="jstat__pulse"/> : <I.Check width="11" height="11"/>}
          {s.label}
        </span>
      </div>
      <div className="job__col-go">
        <I.Chevron width="16" height="16" color="#8B95A1"/>
      </div>
    </a>
  );
}

function RecentJobs() {
  return (
    <section className="rjobs">
      <div className="rjobs__head">
        <div>
          <h2 className="section__title">최근 작업건</h2>
          <p className="section__sub">진행중·완료된 발주 작업을 한눈에 볼 수 있어요</p>
        </div>
        <a href="#" className="textbtn">전체 보기 →</a>
      </div>
      <div className="rjobs__list">
        {JOBS.map(j => <JobItem key={j.id} j={j}/>)}
      </div>
    </section>
  );
}

// ───────── Bottom shortcuts ─────────
const SHORTCUTS = [
  { id: "mapping", title: "매핑 관리",  desc: "품목 ↔ 공급처 연결 관리", icon: <I.Map width="20" height="20"/>, count: "248개", warn: 3 },
  { id: "form",    title: "양식 관리",  desc: "공급처별 발주 양식 관리", icon: <I.Form width="20" height="20"/>, count: "9개",   warn: 0 },
  { id: "supplier",title: "공급처 관리", desc: "거래처와 연락처 관리",     icon: <I.Doc width="20" height="20"/>, count: "12개",  warn: 0 },
];

function Shortcuts() {
  return (
    <section className="shortcuts">
      <div className="shortcuts__head">
        <h2 className="section__title">바로가기</h2>
      </div>
      <div className="shortcuts__grid">
        {SHORTCUTS.map(s => (
          <a key={s.id} className="shortcut" href="#">
            <div className="shortcut__icon">{s.icon}</div>
            <div className="shortcut__body">
              <div className="shortcut__title">{s.title}</div>
              <div className="shortcut__desc">{s.desc}</div>
            </div>
            <div className="shortcut__meta">
              <span className="shortcut__count">{s.count}</span>
              {s.warn > 0 && <span className="shortcut__warn">미매핑 {s.warn}</span>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ───────── App ─────────
function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner main__inner--home">
          <Greet/>
          <QuickActions/>
          <RecentJobs/>
          <Shortcuts/>
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
