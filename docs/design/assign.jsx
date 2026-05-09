const { useState, useMemo, useRef, useEffect } = React;

// ───────── Icons (subset) ─────────
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
  Sparkle: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Pencil: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Question: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
};

// ───────── Sidebar (shared) ─────────
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
          const active = it.id === "order";
          const IcoX = it.icon;
          const href = active ? "발주서 - 주문 업로드.html" : "#";
          return (
            <a key={it.id} className={`nav__item ${active ? "is-active" : ""}`} href={href}>
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
          <span className="crumb__muted">발주서</span>
          <I.Chevron width="14" height="14" color="#C9CDD2" />
          <span className="crumb__strong">2026-05-08 오전 발주</span>
          <span className="crumb__chip">진행중</span>
        </div>
        <div className="topbar__meta">
          작업건 <b>WL-260508-AM</b> · 마감 <b>14:00</b> · 담당자 박운영
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="검색"><I.Search width="18" height="18" /></button>
        <button className="iconbtn" aria-label="알림">
          <I.Bell width="18" height="18" />
          <span className="iconbtn__dot" />
        </button>
        <div className="topbar__divider" />
        <button className="ghostbtn">임시저장</button>
      </div>
    </header>
  );
}

function Tabs() {
  const tabs = [
    { id: "upload", label: "주문 업로드", step: "1", href: "발주서 - 주문 업로드.html" },
    { id: "assign", label: "공급처 배정", step: "2", href: "#" },
    { id: "download", label: "발주서 다운로드", step: "3", href: "#" },
  ];
  return (
    <div className="tabs">
      {tabs.map((t, i) => {
        const active = t.id === "assign";
        const done = i < 1;
        return (
          <a key={t.id} href={t.href} className={`tab ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
            <span className="tab__step">{done ? <I.Check width="14" height="14" /> : t.step}</span>
            <span className="tab__label">{t.label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ───────── Suppliers ─────────
const SUPPLIERS = [
  { id: "A", name: "A공급처", region: "성주", lead: "당일출고" },
  { id: "B", name: "B공급처", region: "제주", lead: "익일출고" },
  { id: "C", name: "C공급처", region: "충주", lead: "당일출고" },
  { id: "D", name: "D공급처", region: "영천", lead: "익일출고" },
];
const SUPPLIER_BY = Object.fromEntries(SUPPLIERS.map(s => [s.id, s]));

// ───────── Data ─────────
const GROUPS = [
  {
    id: "g1",
    product: "성주 참외 5kg 가정용",
    option: "1박스 · 5kg · 혼합과",
    skuCode: "SKU-CHM-5K-MIX",
    orders: 100, qty: 100,
    supplier: "A",
    status: "auto", // auto | edited | unmapped
    confidence: 0.98,
    sources: { coupang: 62, toss: 38 },
    lines: [
      { id: "240508-A1029", platform: "coupang", name: "김철수", qty: 1, addr: "서울시 강남구 테헤란로 123" },
      { id: "TS-26050801",  platform: "toss",    name: "이영희", qty: 1, addr: "경기도 수원시 영통구 원천동 589" },
      { id: "240508-A1031", platform: "coupang", name: "박지원", qty: 2, addr: "서울시 마포구 월드컵북로 396" },
      { id: "TS-26050803",  platform: "toss",    name: "정수빈", qty: 1, addr: "부산시 해운대구 우동 1402" },
    ],
  },
  {
    id: "g2",
    product: "한라봉 중소과 5kg",
    option: "1박스 · 5kg · 중소과 25~30과",
    skuCode: "SKU-HLB-5K-MS",
    orders: 30, qty: 30,
    supplier: "B",
    status: "auto",
    confidence: 0.94,
    sources: { coupang: 18, toss: 12 },
    lines: [
      { id: "240508-A1108", platform: "coupang", name: "윤서아", qty: 1, addr: "대구 중구 동성로 4" },
      { id: "TS-26050811",  platform: "toss",    name: "한도윤", qty: 1, addr: "광주 북구 용봉로 77" },
    ],
  },
  {
    id: "g3",
    product: "세척사과 5kg",
    option: "1박스 · 5kg · 부사",
    skuCode: "SKU-APL-5K-WSH",
    orders: 15, qty: 15,
    supplier: null,
    status: "unmapped",
    confidence: null,
    sources: { coupang: 10, toss: 5 },
    suggestion: "C", // 추천
    lines: [
      { id: "240508-A1142", platform: "coupang", name: "장하늘", qty: 1, addr: "인천 연수구 송도동 23" },
      { id: "TS-26050822",  platform: "toss",    name: "오민재", qty: 2, addr: "세종 한누리대로 411" },
    ],
  },
];

// ───────── Banner ─────────
function Banner({ count }) {
  if (count === 0) return null;
  return (
    <div className="banner">
      <span className="banner__icon"><I.Alert width="18" height="18"/></span>
      <div className="banner__text">
        <b>신규 품목 {count}건이 미분류 상태입니다.</b>
        <span> 발주서를 생성하기 전에 공급처를 지정해 주세요.</span>
      </div>
      <button className="banner__cta">미분류만 보기 <I.Chevron width="14" height="14"/></button>
    </div>
  );
}

// ───────── Filter bar ─────────
function FilterBar({ filter, setFilter, counts }) {
  const items = [
    { id: "all",      label: "전체",     count: counts.all },
    { id: "auto",     label: "자동배정", count: counts.auto },
    { id: "unmapped", label: "미분류",   count: counts.unmapped, tone: "error" },
    { id: "edited",   label: "수정됨",   count: counts.edited, tone: "info" },
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
          <input placeholder="상품명, SKU 검색" />
        </div>
        <button className="ghostbtn ghostbtn--sm">
          <I.Sparkle width="14" height="14"/> 일괄 자동배정
        </button>
      </div>
    </div>
  );
}

// ───────── Status badges ─────────
function StatusBadge({ status }) {
  if (status === "auto")     return <span className="badge badge--success"><span className="badge__dot"/>자동배정</span>;
  if (status === "edited")   return <span className="badge badge--info"><span className="badge__dot"/>수정됨</span>;
  if (status === "unmapped") return <span className="badge badge--error"><I.Alert width="11" height="11"/>미분류</span>;
  return null;
}

// ───────── Supplier select w/ popover ─────────
function SupplierPicker({ group, onPick }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const [pending, setPending] = useState(null); // newly chosen id awaiting scope choice
  const ref = useRef(null);

  useEffect(() => {
    function h(e){ if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setPending(null); } }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const cur = group.supplier ? SUPPLIER_BY[group.supplier] : null;
  const suggested = group.suggestion ? SUPPLIER_BY[group.suggestion] : null;

  return (
    <div className="picker" ref={ref}>
      <button className={`picker__trigger ${!cur ? "is-empty" : ""}`} onClick={() => setOpen(o => !o)}>
        {cur ? (
          <>
            <span className="picker__avatar">{cur.id}</span>
            <span className="picker__main">
              <span className="picker__name">{cur.name}</span>
              <span className="picker__sub">{cur.region} · {cur.lead}</span>
            </span>
          </>
        ) : (
          <>
            <span className="picker__avatar picker__avatar--empty">?</span>
            <span className="picker__main">
              <span className="picker__name picker__name--empty">공급처 선택</span>
              <span className="picker__sub">필수 입력</span>
            </span>
          </>
        )}
        <I.ChevronDown width="14" height="14" color="#8B95A1"/>
      </button>

      {open && !pending && (
        <div className="popover popover--list">
          {suggested && !cur && (
            <div className="popover__suggest">
              <I.Sparkle width="14" height="14" color="#3182F6"/>
              <span>매핑 추천 · <b>{suggested.name}</b></span>
              <button className="linkbtn" onClick={() => setPending(suggested.id)}>적용</button>
            </div>
          )}
          <div className="popover__searchwrap">
            <I.Search width="14" height="14" color="#8B95A1"/>
            <input placeholder="공급처 검색" autoFocus />
          </div>
          <div className="popover__list">
            {SUPPLIERS.map(s => (
              <button key={s.id}
                className={`popover__item ${cur?.id === s.id ? "is-cur" : ""}`}
                onClick={() => setPending(s.id)}>
                <span className="picker__avatar">{s.id}</span>
                <span className="picker__main">
                  <span className="picker__name">{s.name}</span>
                  <span className="picker__sub">{s.region} · {s.lead}</span>
                </span>
                {cur?.id === s.id && <I.Check width="16" height="16" color="#3182F6"/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && pending && (
        <div className="popover popover--scope">
          <div className="popover__scope-title">
            <b>{SUPPLIER_BY[pending].name}</b>로 변경할게요
          </div>
          <div className="popover__scope-sub">
            적용 범위를 선택해 주세요. 기본 매핑을 변경하면 다음 발주부터 자동으로 적용돼요.
          </div>
          <div className="scope">
            <button className="scope__opt" onClick={() => { onPick(pending, "today"); setOpen(false); setPending(null); }}>
              <div className="scope__opt-head">
                <b>오늘만 적용</b>
                <span className="badge badge--soft">1회</span>
              </div>
              <div className="scope__opt-sub">이번 발주(WL-260508-AM)에만 적용</div>
            </button>
            <button className="scope__opt scope__opt--primary" onClick={() => { onPick(pending, "default"); setOpen(false); setPending(null); }}>
              <div className="scope__opt-head">
                <b>기본 매핑도 변경</b>
                <span className="badge badge--soft badge--blue">기본</span>
              </div>
              <div className="scope__opt-sub">"{group.product}" → 항상 이 공급처로 매핑</div>
            </button>
          </div>
          <button className="popover__back" onClick={() => setPending(null)}>
            <I.ChevronLeft width="14" height="14"/> 다른 공급처 선택
          </button>
        </div>
      )}
    </div>
  );
}

// ───────── Group row + expanded lines ─────────
function GroupRow({ group, idx, expanded, onToggle, onPick }) {
  return (
    <>
      <div className={`grow ${group.status === "unmapped" ? "is-flag" : ""}`}>
        <button className="grow__chev" onClick={onToggle} aria-label="펼치기">
          <I.Chevron width="14" height="14"
            style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s" }}/>
        </button>

        <div className="grow__product">
          <div className="grow__no">#{String(idx + 1).padStart(2, "0")}</div>
          <div className="grow__pmain">
            <div className="grow__name">{group.product}</div>
            <div className="grow__opt">{group.option} · <span className="mono">{group.skuCode}</span></div>
          </div>
        </div>

        <div className="grow__metric">
          <div className="grow__metric-v">{group.orders}<span>건</span></div>
          <div className="grow__metric-l">주문</div>
        </div>

        <div className="grow__metric">
          <div className="grow__metric-v">{group.qty}<span>개</span></div>
          <div className="grow__metric-l">총 수량</div>
        </div>

        <div className="grow__sources">
          <span className="src src--coupang" title="쿠팡">쿠 {group.sources.coupang}</span>
          <span className="src src--toss" title="토스">토 {group.sources.toss}</span>
        </div>

        <div className="grow__picker">
          <SupplierPicker group={group} onPick={onPick}/>
        </div>

        <div className="grow__status">
          <StatusBadge status={group.status}/>
          {group.confidence != null && (
            <span className="conf">신뢰도 {Math.round(group.confidence * 100)}%</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="lines">
          <div className="lines__head">
            <div className="lines__col-status"></div>
            <div className="lines__col-platform">플랫폼</div>
            <div className="lines__col-id">주문번호</div>
            <div className="lines__col-name">수취인</div>
            <div className="lines__col-qty">수량</div>
            <div className="lines__col-addr">주소</div>
          </div>
          {group.lines.map((ln, i) => (
            <div key={ln.id} className="lines__row">
              <div className="lines__col-status">
                <span className="lines__dot"/>
              </div>
              <div className="lines__col-platform">
                <span className={`plogo plogo--${ln.platform} plogo--xs`}>
                  {ln.platform === "coupang" ? "쿠" : "토"}
                </span>
                <span className="muted">{ln.platform === "coupang" ? "쿠팡" : "토스"}</span>
              </div>
              <div className="lines__col-id mono">{ln.id}</div>
              <div className="lines__col-name">{ln.name}</div>
              <div className="lines__col-qty">
                <span className="qty qty--sm">{ln.qty}<span>개</span></span>
              </div>
              <div className="lines__col-addr">{ln.addr}</div>
            </div>
          ))}
          {group.lines.length < group.orders && (
            <button className="lines__more">
              + {group.orders - group.lines.length}건 더 보기
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ───────── Footer ─────────
function FooterCTA({ unmapped }) {
  return (
    <div className="footcta">
      <div className="footcta__left">
        {unmapped > 0 ? (
          <span className="footcta__warn">
            <I.Alert width="16" height="16"/>
            미분류 {unmapped}건이 남아 있어요. 모두 지정해야 발주서를 생성할 수 있어요.
          </span>
        ) : (
          <span className="footcta__ok">
            <I.Check width="16" height="16"/>
            모든 품목에 공급처가 배정되었어요.
          </span>
        )}
      </div>
      <div className="footcta__right">
        <a href="발주서 - 주문 업로드.html" className="ghostbtn">
          <I.ChevronLeft width="14" height="14"/> 이전
        </a>
        <button className={`btn btn--primary ${unmapped > 0 ? "is-disabled" : ""}`} disabled={unmapped > 0}>
          다음: 발주서 생성
          <I.Chevron width="16" height="16"/>
        </button>
      </div>
    </div>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "filter": "all",
  "expandUnmapped": true,
  "showBanner": true
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
  const [groups, setGroups] = useState(GROUPS);
  const [expanded, setExpanded] = useState(() => new Set(t.expandUnmapped ? ["g3"] : []));

  const counts = useMemo(() => ({
    all: groups.length,
    auto: groups.filter(g => g.status === "auto").length,
    unmapped: groups.filter(g => g.status === "unmapped").length,
    edited: groups.filter(g => g.status === "edited").length,
  }), [groups]);

  const filtered = useMemo(() => {
    if (t.filter === "all") return groups;
    return groups.filter(g => g.status === t.filter);
  }, [groups, t.filter]);

  const handlePick = (groupId, supplierId, scope) => {
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, supplier: supplierId, status: g.status === "unmapped" ? "edited" : "edited", confidence: 1 }
      : g));
  };

  const toggle = (id) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner">
          <div className="page-head">
            <div>
              <h1 className="page-head__title">공급처 배정</h1>
              <p className="page-head__sub">분배 기준: <b>주문 라인 단위</b> · 동일 상품 옵션은 한 그룹으로 묶어서 보여드려요.</p>
            </div>
          </div>

          <Tabs />

          {t.showBanner && counts.unmapped > 0 && <Banner count={counts.unmapped}/>}

          <FilterBar filter={t.filter} setFilter={(v)=>t.set("filter", v)} counts={counts}/>

          <section className="gtable">
            <div className="gtable__head">
              <div className="gh-chev"></div>
              <div className="gh-product">상품 / 옵션</div>
              <div className="gh-metric">주문</div>
              <div className="gh-metric">총 수량</div>
              <div className="gh-sources">출처</div>
              <div className="gh-picker">공급처</div>
              <div className="gh-status">상태</div>
            </div>

            {filtered.map((g, i) => (
              <GroupRow key={g.id}
                group={g}
                idx={groups.indexOf(g)}
                expanded={expanded.has(g.id)}
                onToggle={() => toggle(g.id)}
                onPick={(sid, scope) => handlePick(g.id, sid, scope)}/>
            ))}

            <div className="gtable__foot">
              <span>매핑되지 않은 상품을 발견하면 <b>매핑관리</b>에서 기본 공급처를 미리 등록해 두는 게 좋아요.</span>
              <a href="#" className="linkbtn">매핑관리 가기 <I.Chevron width="12" height="12"/></a>
            </div>
          </section>
        </div>
        <FooterCTA unmapped={counts.unmapped}/>
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
            {value:"auto", label:"자동배정"},
            {value:"unmapped", label:"미분류"},
            {value:"edited", label:"수정됨"},
          ]}/>
      </TweakSection>
      <TweakSection label="표시">
        <TweakToggle label="알림 배너 표시" value={t.showBanner} onChange={v=>t.set("showBanner", v)}/>
        <TweakToggle label="미분류 그룹 펼침" value={t.expandUnmapped} onChange={v=>t.set("expandUnmapped", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
