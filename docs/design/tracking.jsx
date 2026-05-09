const { useState, useMemo, useRef, useEffect } = React;

const I = {
  Doc: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Truck: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6h12v10H3zM15 9h4l2 3v4h-6" stroke="currentColor" strokeWidth="1.6"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Map: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Form: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Check: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Alert: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 8v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Chevron: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  ChevronDown: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  ChevronLeft: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Bell: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Search: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  X: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Link: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
};

const SIDEBAR = [
  { id: "order", label: "발주서", icon: I.Doc, badge: 12 },
  { id: "tracking", label: "운송장", icon: I.Truck },
  { id: "mapping", label: "매핑관리", icon: I.Map },
  { id: "form", label: "양식관리", icon: I.Form },
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
          const active = it.id === "tracking";
          const IcoX = it.icon;
          return (
            <a key={it.id} className={`nav__item ${active ? "is-active" : ""}`} href="#">
              <IcoX width="20" height="20" />
              <span>{it.label}</span>
              {it.badge && !active && <span className="nav__badge">{it.badge}</span>}
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

// ───────── Job dropdown ─────────
const JOBS = [
  { id: "WL-260508-AM", title: "2026-05-08 오전 발주", orders: 158, status: "운송장 매칭", current: true },
  { id: "WL-260507-PM", title: "2026-05-07 오후 발주", orders: 92,  status: "완료" },
  { id: "WL-260507-AM", title: "2026-05-07 오전 발주", orders: 134, status: "완료" },
  { id: "WL-260506-AM", title: "2026-05-06 오전 발주", orders: 121, status: "완료" },
];

function JobDropdown() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(JOBS[0]);
  const ref = useRef(null);
  useEffect(() => {
    function h(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="jobpick" ref={ref}>
      <button className="jobpick__trigger" onClick={() => setOpen(o => !o)}>
        <div className="jobpick__icon"><I.Truck width="20" height="20"/></div>
        <div className="jobpick__main">
          <div className="jobpick__row">
            <span className="jobpick__title">{picked.title}</span>
            <span className="crumb__chip">{picked.status}</span>
          </div>
          <div className="jobpick__sub">
            <span className="mono">{picked.id}</span> · 주문 {picked.orders}건
          </div>
        </div>
        <I.ChevronDown width="16" height="16" color="#8B95A1"/>
      </button>
      {open && (
        <div className="popover popover--job">
          <div className="popover__searchwrap">
            <I.Search width="14" height="14" color="#8B95A1"/>
            <input placeholder="작업건 검색" autoFocus />
          </div>
          <div className="popover__list">
            {JOBS.map(j => (
              <button key={j.id} className={`joboption ${picked.id === j.id ? "is-cur" : ""}`}
                onClick={() => { setPicked(j); setOpen(false); }}>
                <div>
                  <div className="joboption__title">{j.title}</div>
                  <div className="joboption__sub"><span className="mono">{j.id}</span> · {j.orders}건</div>
                </div>
                <span className={`badge ${j.status === "완료" ? "badge--success" : "badge--info"}`}>
                  {j.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="crumb">
          <span className="crumb__muted">운송장</span>
          <I.Chevron width="14" height="14" color="#C9CDD2" />
          <span className="crumb__strong">매칭 결과</span>
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="검색"><I.Search width="18" height="18" /></button>
        <button className="iconbtn" aria-label="알림">
          <I.Bell width="18" height="18" />
          <span className="iconbtn__dot" />
        </button>
        <div className="topbar__divider" />
        <button className="ghostbtn">매칭 다시 실행</button>
      </div>
    </header>
  );
}

function Tabs() {
  const tabs = [
    { id: "upload", label: "운송장 업로드", step: "1" },
    { id: "match",  label: "매칭 결과",     step: "2" },
    { id: "down",   label: "플랫폼 파일 다운로드", step: "3" },
  ];
  return (
    <div className="tabs">
      {tabs.map((t, i) => {
        const active = t.id === "match";
        const done = i < 1;
        return (
          <a key={t.id} href="#" className={`tab ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
            <span className="tab__step">{done ? <I.Check width="14" height="14" /> : t.step}</span>
            <span className="tab__label">{t.label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ───────── Summary cards ─────────
function StatHero({ tone, label, value, hint, icon }) {
  return (
    <div className={`hero hero--${tone}`}>
      <div className="hero__top">
        <span className="hero__icon">{icon}</span>
        <span className="hero__label">{label}</span>
      </div>
      <div className="hero__value">{value.toLocaleString()}<span>건</span></div>
      <div className="hero__hint">{hint}</div>
    </div>
  );
}

// ───────── Filter ─────────
function FilterBar({ filter, setFilter, counts }) {
  const items = [
    { id: "all",      label: "전체",   count: counts.all },
    { id: "matched",  label: "매칭됨", count: counts.matched },
    { id: "unmatched",label: "미매칭", count: counts.unmatched, tone: "warn" },
    { id: "dup",      label: "중복",   count: counts.dup, tone: "warn" },
    { id: "error",    label: "오류",   count: counts.error, tone: "error" },
  ];
  return (
    <div className="filterbar">
      <div className="chips">
        {items.map(it => (
          <button key={it.id}
            className={`chip ${filter === it.id ? "is-active" : ""} ${it.tone || ""}`}
            onClick={() => setFilter(it.id)}>
            {it.label}
            <span className="chip__num">{it.count}</span>
          </button>
        ))}
      </div>
      <div className="filterbar__right">
        <div className="search search--sm">
          <I.Search width="14" height="14" color="#8B95A1"/>
          <input placeholder="주문번호, 운송장, 수취인 검색" />
        </div>
      </div>
    </div>
  );
}

// ───────── Data ─────────
const COURIERS = ["CJ대한통운", "롯데택배", "한진택배", "우체국", "로젠택배"];

const ROWS = [
  { kind: "matched", orderId: "21100189144417", platform: "coupang",
    product: "정품 한라봉 중소과 5kg", recipient: "박종금",
    courier: "CJ대한통운", tracking: "6978-8423-7233", courierMapped: true },
  { kind: "matched", orderId: "21100189144932", platform: "coupang",
    product: "성주 참외 5kg 가정용", recipient: "김철수",
    courier: "CJ대한통운", tracking: "6978-8423-7301", courierMapped: true },
  { kind: "matched", orderId: "TS-26050801", platform: "toss",
    product: "성주 참외 5kg 가정용", recipient: "이영희",
    courier: "롯데택배", tracking: "4520-1187-0034", courierMapped: true },
  { kind: "matched", orderId: "21100189145011", platform: "coupang",
    product: "성주 참외 5kg 선물용", recipient: "박지원",
    courier: "한진택배", tracking: "6011-2278-9904", courierMapped: false },
  { kind: "unmatched", originalKey: "7100189258437", platform: "coupang",
    product: "성주 꿀참외 가정용 (구버전)", recipient: "최민호",
    reason: "해당 주문 없음" },
  { kind: "unmatched", originalKey: "TS-26050899", platform: "toss",
    product: "한라봉 중소과 5kg", recipient: "한도윤",
    reason: "주문번호 형식 불일치" },
  { kind: "dup", orderId: "21100189144417", platform: "coupang",
    product: "정품 한라봉 중소과 5kg", recipient: "박종금",
    courier: "CJ대한통운", tracking: "6978-8423-7234",
    note: "동일 주문에 운송장 2건이 매칭됨" },
  { kind: "error", row: 15, reason: "운송장번호 없음", raw: "21100189145200,성주 참외,,,," },
];

// ───────── Rows ─────────
function PlatformBadge({ kind }) {
  if (kind === "coupang") return <span className="plogo plogo--coupang plogo--xs">쿠</span>;
  return <span className="plogo plogo--toss plogo--xs">토</span>;
}

function StatusPill({ kind, sub }) {
  const map = {
    matched:   { tone: "success", label: "매칭됨" },
    unmatched: { tone: "warning", label: "미매칭" },
    dup:       { tone: "warning", label: "중복" },
    error:     { tone: "error",   label: "오류" },
  }[kind];
  return (
    <span className={`badge badge--${map.tone}`}>
      <span className="badge__dot"/>{map.label}
    </span>
  );
}

function MatchTable({ rows }) {
  return (
    <div className="mtbl">
      <div className="mtbl__head">
        <div className="mc-status">상태</div>
        <div className="mc-platform">플랫폼</div>
        <div className="mc-order">주문번호 / 원본키</div>
        <div className="mc-product">상품명 / 수취인</div>
        <div className="mc-courier">택배사</div>
        <div className="mc-tracking">운송장번호 / 사유</div>
        <div className="mc-action"></div>
      </div>
      {rows.map((r, i) => (
        <Row key={i} r={r}/>
      ))}
    </div>
  );
}

function Row({ r }) {
  if (r.kind === "matched") {
    return (
      <div className="mtbl__row">
        <div className="mc-status"><StatusPill kind="matched"/></div>
        <div className="mc-platform">
          <PlatformBadge kind={r.platform}/>
          <span className="muted">{r.platform === "coupang" ? "쿠팡" : "토스"}</span>
        </div>
        <div className="mc-order mono">{r.orderId}</div>
        <div className="mc-product">
          <div className="prod__name">{r.product}</div>
          <div className="prod__opt">{r.recipient}</div>
        </div>
        <div className="mc-courier">
          {r.courierMapped ? (
            <span className="courier">
              <span className="courier__dot" style={{background: "#3182F6"}}/>
              {r.courier}
            </span>
          ) : (
            <div className="courier courier--warn">
              <span className="courier__name">{r.courier}</span>
              <span className="badge badge--error">매핑 필요</span>
            </div>
          )}
        </div>
        <div className="mc-tracking mono">{r.tracking}</div>
        <div className="mc-action">
          <button className="iconbtn iconbtn--sm" aria-label="추적"><I.Link width="14" height="14"/></button>
        </div>
      </div>
    );
  }
  if (r.kind === "unmatched") {
    return (
      <div className="mtbl__row mtbl__row--flag">
        <div className="mc-status"><StatusPill kind="unmatched"/></div>
        <div className="mc-platform">
          <PlatformBadge kind={r.platform}/>
          <span className="muted">{r.platform === "coupang" ? "쿠팡" : "토스"}</span>
        </div>
        <div className="mc-order mono">{r.originalKey}</div>
        <div className="mc-product">
          <div className="prod__name">{r.product}</div>
          <div className="prod__opt">{r.recipient}</div>
        </div>
        <div className="mc-courier"><span className="empty">—</span></div>
        <div className="mc-tracking">
          <span className="reason">{r.reason}</span>
        </div>
        <div className="mc-action">
          <button className="btn btn--ghost btn--sm">수동 매칭</button>
        </div>
      </div>
    );
  }
  if (r.kind === "dup") {
    return (
      <div className="mtbl__row mtbl__row--dup">
        <div className="mc-status"><StatusPill kind="dup"/></div>
        <div className="mc-platform">
          <PlatformBadge kind={r.platform}/>
          <span className="muted">{r.platform === "coupang" ? "쿠팡" : "토스"}</span>
        </div>
        <div className="mc-order mono">{r.orderId}</div>
        <div className="mc-product">
          <div className="prod__name">{r.product}</div>
          <div className="prod__opt">{r.recipient} · {r.note}</div>
        </div>
        <div className="mc-courier">
          <span className="courier">
            <span className="courier__dot" style={{background: "#3182F6"}}/>
            {r.courier}
          </span>
        </div>
        <div className="mc-tracking mono">{r.tracking}</div>
        <div className="mc-action">
          <button className="btn btn--ghost btn--sm">선택</button>
        </div>
      </div>
    );
  }
  if (r.kind === "error") {
    return (
      <div className="mtbl__row mtbl__row--err">
        <div className="mc-status"><StatusPill kind="error"/></div>
        <div className="mc-platform">
          <span className="rownum">행 {r.row}</span>
        </div>
        <div className="mc-order"><span className="empty">—</span></div>
        <div className="mc-product">
          <div className="prod__name reason">{r.reason}</div>
          <div className="prod__opt mono" style={{color: "var(--t-faint)"}}>{r.raw}</div>
        </div>
        <div className="mc-courier"><span className="empty">—</span></div>
        <div className="mc-tracking"><span className="empty">—</span></div>
        <div className="mc-action">
          <button className="btn btn--ghost btn--sm">건너뛰기</button>
        </div>
      </div>
    );
  }
  return null;
}

// ───────── Footer ─────────
function FooterCTA({ unmatched, errors }) {
  const issues = unmatched + errors;
  return (
    <div className="footcta">
      <div className="footcta__left">
        {issues > 0 ? (
          <span className="footcta__warn">
            <I.Alert width="16" height="16"/>
            처리되지 않은 항목이 {issues}건 있어요. 그대로 진행하면 해당 건은 다음 단계에서 제외됩니다.
          </span>
        ) : (
          <span className="footcta__ok">
            <I.Check width="16" height="16"/>
            모든 운송장이 정상 매칭되었어요.
          </span>
        )}
      </div>
      <div className="footcta__right">
        <button className="ghostbtn"><I.ChevronLeft width="14" height="14"/> 이전</button>
        <button className="btn btn--primary">
          다음: 플랫폼 파일 다운로드
          <I.Chevron width="16" height="16"/>
        </button>
      </div>
    </div>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "filter": "all",
  "showCourierWarning": true,
  "matchedCount": 150
}/*EDITMODE-END*/;

function useT(defaults){
  const [s, setS] = window.useTweaks(defaults);
  return React.useMemo(() => new Proxy({}, {
    get(_, k){
      if (k === "set") return (key, val) => setS({ [key]: val });
      return s[k];
    }
  }), [s]);
}

function App() {
  const t = useT(TWEAK_DEFAULTS);

  const counts = {
    all: t.matchedCount + 5 + 2 + 1,
    matched: t.matchedCount,
    unmatched: 5,
    dup: 2,
    error: 1,
  };

  const filtered = useMemo(() => {
    let rs = ROWS;
    if (!t.showCourierWarning) {
      rs = rs.map(r => r.kind === "matched" ? { ...r, courierMapped: true } : r);
    }
    if (t.filter === "all") return rs;
    return rs.filter(r => r.kind === t.filter);
  }, [t.filter, t.showCourierWarning]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner">
          <div className="page-head">
            <div>
              <h1 className="page-head__title">운송장 매칭 결과</h1>
              <p className="page-head__sub">업로드한 운송장을 발주 주문에 자동 매칭했어요. 미매칭/오류 건은 수동으로 처리하거나 다음 발주에서 다시 시도할 수 있어요.</p>
            </div>
            <div className="page-head__right">
              <JobDropdown />
            </div>
          </div>

          <Tabs />

          <section className="herorow">
            <StatHero tone="primary"  label="매칭됨" value={counts.matched} hint={`전체의 ${Math.round(counts.matched/counts.all*100)}%`} icon={<I.Check width="16" height="16"/>}/>
            <StatHero tone="warning"  label="미매칭" value={counts.unmatched} hint="수동 매칭 필요" icon={<I.Alert width="16" height="16"/>}/>
            <StatHero tone="warning2" label="중복"   value={counts.dup} hint="둘 중 하나 선택" icon={<I.Alert width="16" height="16"/>}/>
            <StatHero tone="error"    label="오류"   value={counts.error} hint="형식/누락" icon={<I.X width="16" height="16"/>}/>
          </section>

          <FilterBar filter={t.filter} setFilter={(v) => t.set("filter", v)} counts={counts}/>

          <MatchTable rows={filtered}/>

          <div className="tablefoot">
            <span>표시된 결과 <b>{filtered.length}건</b> / 전체 {counts.all}건</span>
            <div className="tablefoot__right">
              <button className="linkbtn">CSV로 내보내기 <I.Chevron width="12" height="12"/></button>
            </div>
          </div>
        </div>
        <FooterCTA unmatched={counts.unmatched} errors={counts.error}/>
      </main>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="필터">
        <TweakSelect label="현재 필터" value={t.filter}
          onChange={v=>t.set("filter", v)}
          options={[
            {value:"all", label:"전체"},
            {value:"matched", label:"매칭됨"},
            {value:"unmatched", label:"미매칭"},
            {value:"dup", label:"중복"},
            {value:"error", label:"오류"},
          ]}/>
      </TweakSection>
      <TweakSection label="표시">
        <TweakToggle label="택배사 매핑 경고 표시" value={t.showCourierWarning} onChange={v=>t.set("showCourierWarning", v)}/>
        <TweakSlider label="매칭됨 건수" value={t.matchedCount} min={50} max={500} step={10}
          onChange={v=>t.set("matchedCount", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
