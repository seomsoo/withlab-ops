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
  Trash: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
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
          <a key={s.id} href="#" className={`subnav__item ${s.id === "mapping" ? "is-active" : ""}`}>
            <span>{s.label}</span>
            <span className="subnav__count">{s.count}</span>
          </a>
        ))}
      </nav>
      <div className="subnav__tip">
        <div className="subnav__tip-title">💡 매핑이 정확할수록</div>
        <div className="subnav__tip-body">발주서 자동 배정과 운송장 매칭 정확도가 올라가요. 신규 품목은 발주 시점에도 추가할 수 있어요.</div>
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
          <span className="crumb__strong">품목 ↔ 공급처 매핑</span>
        </div>
        <div className="topbar__meta">
          총 <b>248개</b>의 매핑 · 마지막 수정 <b>2026-05-08 09:14</b>
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="알림">
          <I.Bell width="18" height="18" />
        </button>
        <div className="topbar__divider" />
        <button className="ghostbtn">CSV 일괄 등록</button>
      </div>
    </header>
  );
}

// ───────── Filter row ─────────
const SUPPLIERS = [
  { id: "all", name: "전체 공급처" },
  { id: "A", name: "A공급처" },
  { id: "B", name: "B공급처" },
  { id: "C", name: "C공급처" },
  { id: "D", name: "D공급처" },
];
const PLATFORMS = [
  { id: "all", label: "전체" },
  { id: "common", label: "공통" },
  { id: "coupang", label: "쿠팡" },
  { id: "toss", label: "토스" },
];

function FilterRow({ q, setQ, supplier, setSupplier, platform, setPlatform, onAdd }) {
  return (
    <div className="frow">
      <div className="search search--lg">
        <I.Search width="16" height="16" color="#8B95A1"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="상품명, 옵션, SKU 검색" />
        {q && <button className="search__clear" onClick={() => setQ("")}><I.X width="14" height="14"/></button>}
      </div>
      <Dropdown value={supplier} onChange={setSupplier} options={SUPPLIERS.map(s => ({ value: s.id, label: s.name }))}/>
      <div className="seg seg--lg">
        {PLATFORMS.map(p => (
          <button key={p.id} className={`seg__btn ${platform === p.id ? "is-active" : ""}`} onClick={() => setPlatform(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="frow__spacer"/>
      <button className="btn btn--primary btn--sm" onClick={onAdd}>
        <I.Plus width="14" height="14"/> 매핑 추가
      </button>
    </div>
  );
}

function Dropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const cur = options.find(o => o.value === value) || options[0];
  return (
    <div className="dd" ref={ref}>
      <button className="dd__trigger" onClick={() => setOpen(o => !o)}>
        <span>{cur.label}</span>
        <I.ChevronDown width="14" height="14" color="#8B95A1"/>
      </button>
      {open && (
        <div className="dd__menu">
          {options.map(o => (
            <button key={o.value} className={`dd__item ${o.value === value ? "is-cur" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}
              {o.value === value && <I.Check width="14" height="14" color="#3182F6"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Data ─────────
const ROWS = [
  { id: 1, platform: "coupang", product: "산지직송 성주 꿀참외", option: "1박스 특가혼합과 5kg", supplier: "A", priority: 1, isDefault: true,  updated: "2026-05-08" },
  { id: 2, platform: "toss",    product: "성주 꿀참외, 가정용 참외", option: "1박스, 5kg", supplier: "A", priority: 1, isDefault: true,  updated: "2026-05-08" },
  { id: 3, platform: "common",  product: "한라봉 중소과 5kg", option: null, supplier: "B", priority: 1, isDefault: true,  updated: "2026-05-07" },
  { id: 4, platform: "coupang", product: "성주 참외 선물용", option: "2.5kg 9~12과", supplier: "A", priority: 1, isDefault: true,  updated: "2026-05-07" },
  { id: 5, platform: "coupang", product: "성주 참외 선물용", option: "2.5kg 9~12과", supplier: "C", priority: 2, isDefault: false, updated: "2026-05-07" },
  { id: 6, platform: "toss",    product: "샤인머스캣 프리미엄", option: "2kg 송이", supplier: "D", priority: 1, isDefault: true,  updated: "2026-05-06" },
  { id: 7, platform: "common",  product: "산청 단감 가정용", option: "5kg 25~30과", supplier: "C", priority: 1, isDefault: true,  updated: "2026-05-06" },
  { id: 8, platform: "coupang", product: "거봉 포도", option: "2kg 한송이", supplier: "D", priority: 1, isDefault: true,  updated: "2026-05-05" },
];

const PLAT_BADGE = {
  coupang: { label: "쿠팡", className: "plat plat--coupang" },
  toss:    { label: "토스", className: "plat plat--toss" },
  common:  { label: "공통", className: "plat plat--common" },
};
const SUP_NAME = { A: "A공급처", B: "B공급처", C: "C공급처", D: "D공급처" };
const SUP_REGION = { A: "성주", B: "제주", C: "충주", D: "영천" };

function MappingTable({ rows, onEdit }) {
  return (
    <div className="mtable">
      <div className="mtable__head">
        <div className="mh-platform">플랫폼</div>
        <div className="mh-product">상품명</div>
        <div className="mh-option">옵션</div>
        <div className="mh-supplier">기본 공급처</div>
        <div className="mh-priority">우선순위</div>
        <div className="mh-updated">최종 수정</div>
        <div className="mh-actions"></div>
      </div>
      {rows.map(r => (
        <div key={r.id} className="mtable__row">
          <div className="mh-platform">
            <span className={PLAT_BADGE[r.platform].className}>{PLAT_BADGE[r.platform].label}</span>
          </div>
          <div className="mh-product">
            <div className="prod__name">{r.product}</div>
          </div>
          <div className="mh-option">
            {r.option ? <span className="opt">{r.option}</span> : <span className="empty">— 옵션 무관 —</span>}
          </div>
          <div className="mh-supplier">
            <span className="picker__avatar">{r.supplier}</span>
            <div className="supcol">
              <div className="supcol__name">{SUP_NAME[r.supplier]}</div>
              <div className="supcol__sub">{SUP_REGION[r.supplier]}</div>
            </div>
            {r.isDefault && <span className="badge badge--info">기본</span>}
          </div>
          <div className="mh-priority">
            <span className="prio">#{r.priority}</span>
          </div>
          <div className="mh-updated mono">{r.updated}</div>
          <div className="mh-actions">
            <button className="iconbtn iconbtn--sm" aria-label="수정" onClick={() => onEdit(r)}>
              <I.Pencil width="14" height="14"/>
            </button>
            <button className="iconbtn iconbtn--sm iconbtn--danger" aria-label="삭제">
              <I.Trash width="14" height="14"/>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────── Pagination ─────────
function Pagination({ page, setPage, totalPages, total, perPage }) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div className="pager">
      <div className="pager__count">
        <b>{start}–{end}</b> / 전체 {total}개
      </div>
      <div className="pager__nav">
        <button className="pager__btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
          <I.ChevronLeft width="14" height="14"/>
        </button>
        {pages.map(p => (
          <button key={p} className={`pager__btn ${p === page ? "is-active" : ""}`} onClick={() => setPage(p)}>
            {p}
          </button>
        ))}
        <button className="pager__btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
          <I.Chevron width="14" height="14"/>
        </button>
      </div>
      <div className="pager__per">
        <span>페이지당</span>
        <Dropdown value={perPage} onChange={() => {}}
          options={[{value:20,label:"20개"},{value:50,label:"50개"},{value:100,label:"100개"}]}/>
      </div>
    </div>
  );
}

// ───────── Side panel (add/edit) ─────────
function SidePanel({ open, editing, onClose, onSave }) {
  const [draft, setDraft] = useState({
    platform: "coupang", product: "", option: "", supplier: "A", priority: 1, isDefault: true,
  });

  useEffect(() => {
    if (editing) setDraft({ ...editing, option: editing.option || "" });
    else setDraft({ platform: "coupang", product: "", option: "", supplier: "A", priority: 1, isDefault: true });
  }, [editing, open]);

  if (!open) return null;

  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <aside className="panel">
        <div className="panel__head">
          <div>
            <div className="panel__eyebrow">{editing ? "매핑 수정" : "새 매핑 추가"}</div>
            <div className="panel__title">{editing ? "매핑 항목 수정" : "품목 ↔ 공급처 연결"}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><I.X width="18" height="18"/></button>
        </div>

        <div className="panel__body">
          <Field label="플랫폼" hint="공통으로 두면 모든 플랫폼에 적용돼요">
            <div className="radioset">
              {[
                { id: "common", label: "공통" },
                { id: "coupang", label: "쿠팡" },
                { id: "toss", label: "토스" },
              ].map(p => (
                <label key={p.id} className={`radioset__opt ${draft.platform === p.id ? "is-active" : ""}`}>
                  <input type="radio" name="platform" checked={draft.platform === p.id}
                    onChange={() => setDraft(d => ({ ...d, platform: p.id }))}/>
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="상품명" required>
            <input className="ipt" placeholder="예: 산지직송 성주 꿀참외"
              value={draft.product} onChange={e => setDraft(d => ({ ...d, product: e.target.value }))}/>
          </Field>

          <Field label="옵션" hint="옵션을 비우면 모든 옵션에 적용돼요">
            <input className="ipt" placeholder="예: 1박스 특가혼합과 5kg"
              value={draft.option} onChange={e => setDraft(d => ({ ...d, option: e.target.value }))}/>
          </Field>

          <Field label="공급처" required>
            <Dropdown value={draft.supplier}
              onChange={v => setDraft(d => ({ ...d, supplier: v }))}
              options={SUPPLIERS.filter(s => s.id !== "all").map(s => ({ value: s.id, label: s.name }))}/>
          </Field>

          <Field label="우선순위" hint="숫자가 작을수록 먼저 사용됩니다">
            <div className="stepper">
              <button onClick={() => setDraft(d => ({ ...d, priority: Math.max(1, d.priority - 1) }))}>−</button>
              <span>#{draft.priority}</span>
              <button onClick={() => setDraft(d => ({ ...d, priority: d.priority + 1 }))}>+</button>
            </div>
          </Field>

          <div className="toggle">
            <div>
              <div className="toggle__title">기본 매핑으로 설정</div>
              <div className="toggle__sub">동일 품목에 매핑이 여러 개일 때 이 공급처가 우선 적용돼요</div>
            </div>
            <button className={`switch ${draft.isDefault ? "is-on" : ""}`}
              onClick={() => setDraft(d => ({ ...d, isDefault: !d.isDefault }))}>
              <span className="switch__knob"/>
            </button>
          </div>
        </div>

        <div className="panel__foot">
          <button className="ghostbtn" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={() => onSave(draft)} disabled={!draft.product.trim()}>
            {editing ? "수정 저장" : "매핑 추가"}
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

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "panelOpen": false
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
  const [supplier, setSupplier] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    return ROWS.filter(r => {
      if (supplier !== "all" && r.supplier !== supplier) return false;
      if (platform !== "all" && r.platform !== platform) return false;
      if (q && !(`${r.product} ${r.option || ""}`).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, supplier, platform]);

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
                <h1 className="page-head__title">품목 ↔ 공급처 매핑</h1>
                <p className="page-head__sub">플랫폼/상품/옵션 조합을 어떤 공급처에서 출고할지 미리 정해 두면, 발주서 작성 시 자동으로 배정돼요.</p>
              </div>
            </div>

            <FilterRow q={q} setQ={setQ}
              supplier={supplier} setSupplier={setSupplier}
              platform={platform} setPlatform={setPlatform}
              onAdd={() => { setEditing(null); t.set("panelOpen", true); }}/>

            <MappingTable rows={filtered} onEdit={(r) => { setEditing(r); t.set("panelOpen", true); }}/>

            <Pagination page={page} setPage={setPage} totalPages={13} total={248} perPage={20}/>
          </div>
        </div>
      </main>

      <SidePanel open={t.panelOpen} editing={editing}
        onClose={() => t.set("panelOpen", false)}
        onSave={() => t.set("panelOpen", false)}/>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="사이드 패널">
        <TweakToggle label="매핑 추가 패널 열기" value={t.panelOpen} onChange={v=>t.set("panelOpen", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
