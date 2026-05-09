const { useState, useMemo } = React;

// ───────── Icons ─────────
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
  Download: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 4v12m0 0-4-4m4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Eye: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>),
  X: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Sheet: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M4 9h16M4 15h16M10 3v18" stroke="currentColor" strokeWidth="1.6"/></svg>),
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
    { id: "assign", label: "공급처 배정", step: "2", href: "발주서 - 공급처 배정.html" },
    { id: "download", label: "발주서 다운로드", step: "3", href: "#" },
  ];
  return (
    <div className="tabs">
      {tabs.map((t, i) => {
        const active = t.id === "download";
        const done = i < 2;
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
  {
    id: "A", name: "A공급처", region: "성주", contact: "010-2841-7720",
    template: true, mappingMissing: 0,
    orders: 130, qty: 130, items: 4,
    fileName: "WL_260508_AM_A공급처_발주서.xlsx",
    products: ["성주 참외 5kg 가정용 (100건)", "성주 참외 5kg 선물용 (20건)", "성주 참외 2.5kg (10건)"],
    downloaded: false,
  },
  {
    id: "B", name: "B공급처", region: "제주", contact: "010-7723-4108",
    template: true, mappingMissing: 0,
    orders: 15, qty: 15, items: 1,
    fileName: "WL_260508_AM_B공급처_발주서.xlsx",
    products: ["한라봉 중소과 5kg (15건)"],
    downloaded: false,
  },
  // 상태 다양성을 위해 추가 — Tweaks로 토글 가능
  {
    id: "C", name: "C공급처", region: "충주", contact: "010-3300-1144",
    template: false, mappingMissing: 0,
    orders: 8, qty: 8, items: 1,
    fileName: null,
    products: ["세척사과 5kg (8건)"],
    downloaded: false,
  },
  {
    id: "D", name: "D공급처", region: "영천", contact: "010-9981-2200",
    template: true, mappingMissing: 2,
    orders: 22, qty: 22, items: 2,
    fileName: "WL_260508_AM_D공급처_발주서.xlsx",
    products: ["거봉 포도 2kg (12건)", "샤인머스캣 2kg (10건)"],
    downloaded: false,
  },
];

function StatusBadge({ tone, icon, children }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon}
      {children}
    </span>
  );
}

// ───────── Supplier card ─────────
function SupplierCard({ s, downloaded, onDownload, onPreview }) {
  const blocked = !s.template || s.mappingMissing > 0;

  return (
    <div className={`scard ${blocked ? "is-blocked" : ""} ${downloaded ? "is-done" : ""}`}>
      <div className="scard__head">
        <div className="scard__avatar">{s.id}</div>
        <div className="scard__title">
          <div className="scard__name">
            {s.name}
            {downloaded && <span className="scard__check"><I.Check width="11" height="11"/></span>}
          </div>
          <div className="scard__sub">{s.region} · {s.contact}</div>
        </div>
        <button className="scard__menu" aria-label="더보기">⋯</button>
      </div>

      <div className="scard__metrics">
        <div className="metric">
          <div className="metric__v">{s.orders}<span>건</span></div>
          <div className="metric__l">주문</div>
        </div>
        <div className="metric__div"/>
        <div className="metric">
          <div className="metric__v">{s.qty}<span>개</span></div>
          <div className="metric__l">총 수량</div>
        </div>
        <div className="metric__div"/>
        <div className="metric">
          <div className="metric__v">{s.items}<span>품목</span></div>
          <div className="metric__l">SKU</div>
        </div>
      </div>

      <div className="scard__checks">
        <div className={`crow ${s.template ? "ok" : "bad"}`}>
          <span className="crow__icon">
            {s.template ? <I.Check width="13" height="13"/> : <I.Alert width="13" height="13"/>}
          </span>
          <span className="crow__label">엑셀 템플릿</span>
          <span className="crow__value">
            {s.template ? "등록됨" : "등록되지 않음"}
          </span>
        </div>
        <div className={`crow ${s.mappingMissing === 0 ? "ok" : "bad"}`}>
          <span className="crow__icon">
            {s.mappingMissing === 0 ? <I.Check width="13" height="13"/> : <I.Alert width="13" height="13"/>}
          </span>
          <span className="crow__label">필수 항목 매핑</span>
          <span className="crow__value">
            {s.mappingMissing === 0 ? "매핑 완료" : `매핑 누락 ${s.mappingMissing}건`}
          </span>
        </div>
      </div>

      <div className="scard__products">
        {s.products.slice(0, 2).map((p, i) => (
          <div key={i} className="prodline">· {p}</div>
        ))}
        {s.products.length > 2 && (
          <div className="prodline prodline--more">외 {s.products.length - 2}개 품목</div>
        )}
      </div>

      <div className="scard__foot">
        {!s.template ? (
          <div className="scard__blockmsg">
            엑셀 템플릿이 없어요.
            <a href="#" className="linkbtn">양식 등록하러 가기 <I.Chevron width="12" height="12"/></a>
          </div>
        ) : s.mappingMissing > 0 ? (
          <div className="scard__blockmsg scard__blockmsg--err">
            필수 항목이 매핑되지 않았어요.
            <a href="발주서 - 공급처 배정.html" className="linkbtn">매핑 확인하러 가기 <I.Chevron width="12" height="12"/></a>
          </div>
        ) : (
          <>
            <button className="btn btn--ghost btn--sm" onClick={onPreview}>
              <I.Eye width="14" height="14"/> 미리보기
            </button>
            <button
              className={`btn btn--primary btn--sm ${downloaded ? "is-done-btn" : ""}`}
              onClick={onDownload}>
              {downloaded ? (
                <><I.Check width="14" height="14"/> 다운로드 완료</>
              ) : (
                <><I.Download width="14" height="14"/> 엑셀 다운로드</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ───────── Preview modal ─────────
function PreviewModal({ s, onClose }) {
  if (!s) return null;
  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--preview" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="modal__eyebrow">미리보기 · {s.name}</div>
            <div className="modal__title mono">{s.fileName}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><I.X width="18" height="18"/></button>
        </div>
        <div className="modal__body modal__body--sheet">
          <div className="sheet">
            <div className="sheet__row sheet__row--head">
              <div>주문번호</div>
              <div>상품명</div>
              <div>옵션</div>
              <div>수량</div>
              <div>수취인</div>
              <div>연락처</div>
              <div>주소</div>
            </div>
            {[
              ["A1029","성주 참외","5kg 가정용","1","김철수","010-1234-XXXX","서울시 강남구 테헤란로 123"],
              ["A1031","성주 참외","5kg 선물용","2","박지원","010-2271-XXXX","서울시 마포구 월드컵북로 396"],
              ["TS-801","성주 참외","5kg 가정용","1","이영희","010-9483-XXXX","경기도 수원시 영통구 원천동 589"],
              ["TS-803","성주 참외","5kg 가정용","1","정수빈","010-3120-XXXX","부산시 해운대구 우동 1402"],
              ["A1108","성주 참외","2.5kg","1","윤서아","010-7758-XXXX","대구 중구 동성로 4"],
            ].map((r,i) => (
              <div key={i} className="sheet__row">
                {r.map((c,j) => <div key={j} className={j===0?"mono":""}>{c}</div>)}
              </div>
            ))}
            <div className="sheet__more">… 외 {s.orders - 5}건</div>
          </div>
        </div>
        <div className="modal__foot">
          <button className="ghostbtn" onClick={onClose}>닫기</button>
          <button className="btn btn--primary btn--sm">
            <I.Download width="14" height="14"/> 엑셀 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Confirm modal ─────────
function ConfirmModal({ open, onClose, onConfirm, suppliers, downloaded }) {
  if (!open) return null;
  const downloadable = suppliers.filter(s => s.template && s.mappingMissing === 0);
  const blocked = suppliers.filter(s => !s.template || s.mappingMissing > 0);
  const allDone = downloadable.every(s => downloaded.has(s.id));

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal modal--confirm" onClick={e => e.stopPropagation()}>
        <div className="modal__head modal__head--center">
          <div className="modal__icon">
            <I.Check width="22" height="22"/>
          </div>
          <div className="modal__title">발주를 완료 처리할까요?</div>
          <div className="modal__sub">완료 처리하면 <b>WL-260508-AM</b> 작업건이 잠기고, 운송장 등록 단계로 넘어가요.</div>
        </div>

        <div className="modal__body">
          <div className="checklist">
            <div className="checklist__title">상태 확인</div>
            {downloadable.map(s => (
              <div key={s.id} className={`citem ${downloaded.has(s.id) ? "ok" : "warn"}`}>
                <span className="citem__icon">
                  {downloaded.has(s.id) ? <I.Check width="14" height="14"/> : <I.Alert width="14" height="14"/>}
                </span>
                <span className="citem__label">{s.name}</span>
                <span className="citem__val">
                  {downloaded.has(s.id) ? "다운로드 완료" : "아직 다운로드하지 않음"}
                </span>
              </div>
            ))}
            {blocked.map(s => (
              <div key={s.id} className="citem err">
                <span className="citem__icon"><I.X width="13" height="13"/></span>
                <span className="citem__label">{s.name}</span>
                <span className="citem__val">{!s.template ? "템플릿 없음" : "매핑 누락"}</span>
              </div>
            ))}
            <div className={`citem ${blocked.length === 0 ? "ok" : "err"}`}>
              <span className="citem__icon">
                {blocked.length === 0 ? <I.Check width="14" height="14"/> : <I.Alert width="14" height="14"/>}
              </span>
              <span className="citem__label">미분류 품목</span>
              <span className="citem__val">{blocked.length === 0 ? "0건" : `${blocked.length}건 남음`}</span>
            </div>
          </div>

          {!allDone && (
            <div className="cnote">
              아직 다운로드하지 않은 발주서가 있어요. 그래도 진행하면 해당 공급처에는 발주가 전달되지 않습니다.
            </div>
          )}
        </div>

        <div className="modal__foot">
          <button className="ghostbtn" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={onConfirm}>
            발주 완료 처리
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Footer ─────────
function FooterCTA({ allReady, hasAny, onAll, onComplete }) {
  return (
    <div className="footcta">
      <div className="footcta__left">
        {allReady ? (
          <span className="footcta__ok"><I.Check width="16" height="16"/>모든 공급처 발주서가 준비되었어요.</span>
        ) : (
          <span className="footcta__warn"><I.Alert width="16" height="16"/>일부 공급처는 템플릿/매핑 문제로 발주가 막혀 있어요.</span>
        )}
      </div>
      <div className="footcta__right">
        <a href="발주서 - 공급처 배정.html" className="ghostbtn">
          <I.ChevronLeft width="14" height="14"/> 이전
        </a>
        <button className="ghostbtn" onClick={onAll} disabled={!hasAny}>
          <I.Download width="14" height="14"/> 전체 다운로드 (ZIP)
        </button>
        <button className="btn btn--primary" onClick={onComplete}>
          <I.Check width="16" height="16"/> 발주 완료 처리
        </button>
      </div>
    </div>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showProblemSuppliers": true,
  "view": "card",
  "downloadedAll": false
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
  const [downloaded, setDownloaded] = useState(() => new Set(t.downloadedAll ? ["A","B","D"] : []));
  const [preview, setPreview] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  const suppliers = useMemo(() => {
    return t.showProblemSuppliers ? SUPPLIERS : SUPPLIERS.filter(s => s.id === "A" || s.id === "B");
  }, [t.showProblemSuppliers]);

  React.useEffect(() => {
    setDownloaded(new Set(t.downloadedAll ? suppliers.filter(s => s.template && s.mappingMissing === 0).map(s => s.id) : []));
  }, [t.downloadedAll, suppliers]);

  const downloadable = suppliers.filter(s => s.template && s.mappingMissing === 0);
  const blocked = suppliers.filter(s => !s.template || s.mappingMissing > 0);
  const allReady = blocked.length === 0;

  const totals = useMemo(() => ({
    suppliers: suppliers.length,
    orders: suppliers.reduce((a,s) => a + s.orders, 0),
    items: suppliers.reduce((a,s) => a + s.items, 0),
  }), [suppliers]);

  const handleDownload = (id) => {
    setDownloaded(prev => new Set(prev).add(id));
  };
  const handleAll = () => {
    setDownloaded(new Set(downloadable.map(s => s.id)));
  };

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner">
          <div className="page-head">
            <div>
              <h1 className="page-head__title">발주서 다운로드</h1>
              <p className="page-head__sub">
                공급처 {totals.suppliers}곳, 총 {totals.orders}건의 발주서가 준비됐어요. 각 양식에 맞춰 자동 변환되어 있어요.
              </p>
            </div>
            <div className="page-head__right">
              <div className="seg">
                <button className={`seg__btn ${t.view === "card" ? "is-active" : ""}`} onClick={() => t.set("view","card")}>카드</button>
                <button className={`seg__btn ${t.view === "list" ? "is-active" : ""}`} onClick={() => t.set("view","list")}>리스트</button>
              </div>
            </div>
          </div>

          <Tabs />

          {completed && (
            <div className="banner banner--success">
              <span className="banner__icon banner__icon--success"><I.Check width="18" height="18"/></span>
              <div className="banner__text">
                <b>발주가 완료 처리되었어요.</b>
                <span> 운송장 단계에서 진행 상황을 확인할 수 있어요.</span>
              </div>
              <a href="#" className="banner__cta banner__cta--success">운송장 가기 <I.Chevron width="14" height="14"/></a>
            </div>
          )}

          <div className="overview">
            <div className="overview__cell">
              <div className="overview__label">공급처</div>
              <div className="overview__value">{downloadable.length}<span> / {totals.suppliers}곳</span></div>
              <div className="overview__hint">{downloaded.size}곳 다운로드 완료</div>
            </div>
            <div className="overview__cell">
              <div className="overview__label">총 주문</div>
              <div className="overview__value">{totals.orders}<span>건</span></div>
              <div className="overview__hint">{totals.items}개 품목</div>
            </div>
            <div className="overview__cell">
              <div className="overview__label">차단된 공급처</div>
              <div className="overview__value" style={{ color: blocked.length ? "var(--error)" : "var(--success)" }}>
                {blocked.length}<span>곳</span>
              </div>
              <div className="overview__hint">
                {blocked.length === 0 ? "모두 정상" : "템플릿/매핑 확인 필요"}
              </div>
            </div>
            <div className="overview__progress">
              <div className="overview__label">진행률</div>
              <div className="overview__value">{Math.round((downloaded.size / Math.max(downloadable.length,1)) * 100)}<span>%</span></div>
              <div className="bar"><div className="bar__fill" style={{ width: `${(downloaded.size / Math.max(downloadable.length,1)) * 100}%` }}/></div>
            </div>
          </div>

          {t.view === "card" ? (
            <div className="cardgrid">
              {suppliers.map(s => (
                <SupplierCard key={s.id} s={s}
                  downloaded={downloaded.has(s.id)}
                  onDownload={() => handleDownload(s.id)}
                  onPreview={() => setPreview(s)}/>
              ))}
            </div>
          ) : (
            <ListView suppliers={suppliers} downloaded={downloaded} onDownload={handleDownload} onPreview={setPreview}/>
          )}
        </div>
        <FooterCTA allReady={allReady} hasAny={downloadable.length > 0}
          onAll={handleAll} onComplete={() => setConfirmOpen(true)}/>
      </main>

      <PreviewModal s={preview} onClose={() => setPreview(null)}/>
      <ConfirmModal open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); setCompleted(true); }}
        suppliers={suppliers} downloaded={downloaded}/>
    </div>
  );
}

// ───────── List view ─────────
function ListView({ suppliers, downloaded, onDownload, onPreview }) {
  return (
    <div className="listcard">
      <div className="listcard__head">
        <div className="lc-supplier">공급처</div>
        <div className="lc-region">지역</div>
        <div className="lc-orders">주문</div>
        <div className="lc-items">SKU</div>
        <div className="lc-checks">상태</div>
        <div className="lc-actions"></div>
      </div>
      {suppliers.map(s => {
        const blocked = !s.template || s.mappingMissing > 0;
        const done = downloaded.has(s.id);
        return (
          <div key={s.id} className={`listrow ${blocked ? "is-blocked" : ""}`}>
            <div className="lc-supplier">
              <div className="scard__avatar scard__avatar--sm">{s.id}</div>
              <div>
                <div className="scard__name">{s.name}</div>
                <div className="scard__sub">{s.contact}</div>
              </div>
            </div>
            <div className="lc-region">{s.region}</div>
            <div className="lc-orders"><b>{s.orders}</b><span>건</span></div>
            <div className="lc-items"><b>{s.items}</b><span>개</span></div>
            <div className="lc-checks">
              <StatusBadge tone={s.template ? "success" : "error"} icon={null}>
                {s.template ? "템플릿 등록됨" : "템플릿 없음"}
              </StatusBadge>
              <StatusBadge tone={s.mappingMissing === 0 ? "success" : "error"} icon={null}>
                {s.mappingMissing === 0 ? "매핑 완료" : `매핑 누락 ${s.mappingMissing}건`}
              </StatusBadge>
            </div>
            <div className="lc-actions">
              {blocked ? (
                <a href="#" className="linkbtn">설정하러 가기 <I.Chevron width="12" height="12"/></a>
              ) : (
                <>
                  <button className="btn btn--ghost btn--sm" onClick={() => onPreview(s)}>
                    <I.Eye width="14" height="14"/>
                  </button>
                  <button className={`btn btn--primary btn--sm ${done ? "is-done-btn" : ""}`} onClick={() => onDownload(s.id)}>
                    {done ? <><I.Check width="14" height="14"/> 완료</> : <><I.Download width="14" height="14"/> 다운로드</>}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="공급처 목록">
        <TweakToggle label="문제 있는 공급처 포함" value={t.showProblemSuppliers} onChange={v=>t.set("showProblemSuppliers", v)}/>
        <TweakToggle label="모두 다운로드 완료 상태" value={t.downloadedAll} onChange={v=>t.set("downloadedAll", v)}/>
      </TweakSection>
      <TweakSection label="레이아웃">
        <TweakRadio label="보기" value={t.view} onChange={v=>t.set("view", v)}
          options={[{value:"card",label:"카드"},{value:"list",label:"리스트"}]}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
