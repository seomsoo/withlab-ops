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
  Plus: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Pencil: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Power: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 4v8M7 6.5a8 8 0 1 0 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Phone: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Note: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 4h14v16H5z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
};

const SIDEBAR = [
  { id: "order", label: "발주서", icon: I.Doc },
  { id: "tracking", label: "운송장", icon: I.Truck },
  { id: "mapping", label: "매핑관리", icon: I.Map, badge: 3 },
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
          const active = it.id === "mapping";
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

const SUBMENU = [
  { id: "supplier", label: "공급처 관리", count: 12 },
  { id: "mapping",  label: "품목 ↔ 공급처 매핑", count: 248 },
  { id: "rename",   label: "상품명 변환",     count: 32 },
  { id: "courier",  label: "택배사 매핑",     count: 5 },
];

function SubNav() {
  return (
    <aside className="subnav">
      <div className="subnav__title">매핑관리</div>
      <div className="subnav__sub">발주/운송장 자동 매칭에 쓰이는 기준 데이터</div>
      <nav className="subnav__list">
        {SUBMENU.map(s => (
          <a key={s.id} href="#" className={`subnav__item ${s.id === "supplier" ? "is-active" : ""}`}>
            <span>{s.label}</span>
            <span className="subnav__count">{s.count}</span>
          </a>
        ))}
      </nav>
      <div className="subnav__tip">
        <div className="subnav__tip-title">💡 공급처를 먼저 등록하세요</div>
        <div className="subnav__tip-body">공급처별 발주 양식까지 등록해 두면, 발주서 작성 시 자동으로 채워져요.</div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="crumb">
          <span className="crumb__muted">매핑관리</span>
          <I.Chevron width="14" height="14" color="#C9CDD2" />
          <span className="crumb__strong">공급처 관리</span>
        </div>
        <div className="topbar__meta">
          활성 <b>10개</b> · 비활성 <b>2개</b> · 양식 미등록 <b className="t-warn">3개</b>
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="알림">
          <I.Bell width="18" height="18" />
        </button>
        <div className="topbar__divider" />
        <button className="ghostbtn">CSV 내보내기</button>
      </div>
    </header>
  );
}

// ───────── Data ─────────
const SUPPLIERS_DATA = [
  { id: "A", name: "A농장",      contact: "064-123-4567", memo: "제주 감귤류 전문",            formReg: true,  createdAt: "2026-04-15", products: 18, region: "제주", status: "active" },
  { id: "B", name: "B도매",      contact: "055-987-6543", memo: "성주 참외, 사과",             formReg: true,  createdAt: "2026-04-20", products: 24, region: "성주", status: "active" },
  { id: "C", name: "C농장",      contact: "010-1234-5678", memo: "한라봉 계절상품",            formReg: false, createdAt: "2026-05-01", products: 6,  region: "제주", status: "active" },
  { id: "D", name: "영천 단감농원", contact: "054-555-2233", memo: "단감, 곶감 시즌 운영",        formReg: true,  createdAt: "2026-03-22", products: 12, region: "영천", status: "active" },
  { id: "E", name: "샤인플러스",   contact: "031-441-7820", memo: "샤인머스캣, 거봉 (선물용 강세)", formReg: true,  createdAt: "2026-03-10", products: 9,  region: "안성", status: "active" },
  { id: "F", name: "남도청과",     contact: "061-723-9090", memo: "전남권 종합 청과",            formReg: false, createdAt: "2026-05-04", products: 4,  region: "나주", status: "active" },
  { id: "G", name: "충주 사과농원", contact: "043-851-1144", memo: "사과 (가정용/선물용)",        formReg: true,  createdAt: "2026-02-18", products: 7,  region: "충주", status: "active" },
];

function StatusPill({ ok }) {
  return (
    <span className={`pill ${ok ? "pill--ok" : "pill--mute"}`}>
      <span className="pill__dot"/> {ok ? "등록됨" : "미등록"}
    </span>
  );
}

function SuppliersTable({ rows, onEdit, onDeactivate }) {
  return (
    <div className="stbl">
      <div className="stbl__head">
        <div className="sh-name">공급처 이름</div>
        <div className="sh-contact">연락처</div>
        <div className="sh-memo">메모</div>
        <div className="sh-form">양식 등록</div>
        <div className="sh-date">등록일</div>
        <div className="sh-actions"></div>
      </div>
      {rows.map(r => (
        <div key={r.id} className="stbl__row">
          <div className="sh-name">
            <span className="picker__avatar">{r.id}</span>
            <div>
              <div className="sname">{r.name}</div>
              <div className="ssub">{r.region} · 매핑된 품목 {r.products}개</div>
            </div>
          </div>
          <div className="sh-contact mono">{r.contact}</div>
          <div className="sh-memo">{r.memo}</div>
          <div className="sh-form"><StatusPill ok={r.formReg}/></div>
          <div className="sh-date mono">{r.createdAt}</div>
          <div className="sh-actions">
            <button className="iconbtn iconbtn--sm" aria-label="수정" onClick={() => onEdit(r)}>
              <I.Pencil width="14" height="14"/>
            </button>
            <button className="iconbtn iconbtn--sm iconbtn--danger" aria-label="비활성화" onClick={() => onDeactivate(r)}>
              <I.Power width="14" height="14"/>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────── Side panel ─────────
function SupplierPanel({ open, editing, onClose, onSave }) {
  const [draft, setDraft] = useState({ name: "", contact: "", memo: "" });

  useEffect(() => {
    if (editing) setDraft({ name: editing.name, contact: editing.contact, memo: editing.memo });
    else setDraft({ name: "", contact: "", memo: "" });
  }, [editing, open]);

  if (!open) return null;

  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <aside className="panel">
        <div className="panel__head">
          <div>
            <div className="panel__eyebrow">{editing ? "공급처 수정" : "새 공급처"}</div>
            <div className="panel__title">{editing ? editing.name : "공급처 추가"}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><I.X width="18" height="18"/></button>
        </div>

        <div className="panel__body">
          <Field label="공급처 이름" required hint="발주서·매핑 화면에 표시되는 이름이에요">
            <input className="ipt" placeholder="예: A농장"
              value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} autoFocus/>
          </Field>

          <Field label="연락처" hint="대표 번호 1개를 권장해요">
            <div className="ipt-with-icon">
              <I.Phone width="16" height="16" color="#8B95A1"/>
              <input placeholder="064-123-4567"
                value={draft.contact} onChange={e => setDraft(d => ({ ...d, contact: e.target.value }))}/>
            </div>
          </Field>

          <Field label="메모" hint="주요 품목, 시즌, 거래 조건 등을 자유롭게 적어두세요">
            <textarea className="ipt ipt--area" rows="4" placeholder="예: 제주 감귤류 전문, 11~3월 성수기"
              value={draft.memo} onChange={e => setDraft(d => ({ ...d, memo: e.target.value }))}/>
          </Field>

          {editing && (
            <div className="formstat">
              <div className="formstat__icon">
                {editing.formReg
                  ? <I.Check width="16" height="16" color="#118D4F"/>
                  : <I.Alert width="16" height="16" color="#C46A00"/>}
              </div>
              <div className="formstat__body">
                <div className="formstat__title">
                  발주 양식 {editing.formReg ? "등록 완료" : "미등록"}
                </div>
                <div className="formstat__sub">
                  {editing.formReg
                    ? "발주서 작성 시 이 양식이 자동으로 사용돼요."
                    : "양식이 없으면 기본 양식으로 발주서가 만들어져요."}
                </div>
              </div>
              <a href="#" className="formstat__link">양식관리 →</a>
            </div>
          )}
        </div>

        <div className="panel__foot">
          <button className="ghostbtn" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={() => onSave(draft)} disabled={!draft.name.trim()}>
            {editing ? "수정 저장" : "공급처 추가"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="fld">
      <div className="fld__lbl">
        {label}
        {required && <span className="fld__req">*</span>}
      </div>
      {children}
      {hint && <div className="fld__hint">{hint}</div>}
    </div>
  );
}

// ───────── Confirm modal ─────────
function ConfirmModal({ open, target, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal__icon"><I.Power width="22" height="22" color="#C46A00"/></div>
        <div className="modal__title">{target?.name} 공급처를 비활성화할까요?</div>
        <div className="modal__body">
          연결된 매핑은 그대로 유지되지만, <b>신규 발주 자동 배정에서 제외</b>돼요.
          언제든 다시 활성화할 수 있어요.
        </div>
        <div className="modal__foot">
          <button className="ghostbtn" onClick={onClose}>취소</button>
          <button className="btn btn--danger" onClick={onConfirm}>비활성화</button>
        </div>
      </div>
    </>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "panelOpen": false,
  "modalOpen": false
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
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [target, setTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return SUPPLIERS_DATA;
    return SUPPLIERS_DATA.filter(r =>
      `${r.name} ${r.memo} ${r.region}`.toLowerCase().includes(q.toLowerCase())
    );
  }, [q]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main main--wsub">
        <TopBar />
        <div className="main__split">
          <SubNav />
          <div className="main__inner main__inner--narrow">
            <div className="page-head">
              <div>
                <h1 className="page-head__title">공급처 관리</h1>
                <p className="page-head__sub">발주를 보낼 공급처 목록을 관리해요. 양식까지 함께 등록하면 발주서가 자동으로 만들어져요.</p>
              </div>
              <button className="btn btn--primary" onClick={() => { setEditing(null); t.set("panelOpen", true); }}>
                <I.Plus width="16" height="16"/> 공급처 추가
              </button>
            </div>

            <div className="frow">
              <div className="search search--lg">
                <I.Search width="16" height="16" color="#8B95A1"/>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="공급처 이름, 지역, 메모 검색"/>
                {q && <button className="search__clear" onClick={() => setQ("")}><I.X width="14" height="14"/></button>}
              </div>
              <div className="frow__count">{filtered.length}개 표시 중</div>
            </div>

            <SuppliersTable rows={filtered}
              onEdit={(r) => { setEditing(r); t.set("panelOpen", true); }}
              onDeactivate={(r) => { setTarget(r); t.set("modalOpen", true); }}/>
          </div>
        </div>
      </main>

      <SupplierPanel open={t.panelOpen} editing={editing}
        onClose={() => t.set("panelOpen", false)}
        onSave={() => t.set("panelOpen", false)}/>

      <ConfirmModal open={t.modalOpen} target={target}
        onClose={() => t.set("modalOpen", false)}
        onConfirm={() => t.set("modalOpen", false)}/>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="패널/모달">
        <TweakToggle label="공급처 추가/수정 패널" value={t.panelOpen} onChange={v=>t.set("panelOpen", v)}/>
        <TweakToggle label="비활성화 확인 모달" value={t.modalOpen} onChange={v=>t.set("modalOpen", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
