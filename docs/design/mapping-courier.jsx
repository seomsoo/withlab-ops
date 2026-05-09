const { useState, useMemo, useRef, useEffect } = React;

const I = {
  Doc: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Truck: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6h12v10H3zM15 9h4l2 3v4h-6" stroke="currentColor" strokeWidth="1.6"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Map: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Form: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Check: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Chevron: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  ChevronDown: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  ChevronLeft: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Bell: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Search: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  X: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Plus: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Pencil: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Trash: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Arrow: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
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
  { id: "rename",   label: "상품명 변환 매핑", count: 32 },
  { id: "courier",  label: "택배사 매핑",     count: 8 },
];

function SubNav() {
  return (
    <aside className="subnav">
      <div className="subnav__title">매핑관리</div>
      <div className="subnav__sub">발주/운송장 자동 매칭에 쓰이는 기준 데이터</div>
      <nav className="subnav__list">
        {SUBMENU.map(s => (
          <a key={s.id} href="#" className={`subnav__item ${s.id === "courier" ? "is-active" : ""}`}>
            <span>{s.label}</span>
            <span className="subnav__count">{s.count}</span>
          </a>
        ))}
      </nav>
      <div className="subnav__tip">
        <div className="subnav__tip-title">💡 택배사 매핑 활용</div>
        <div className="subnav__tip-body">공급처가 보내준 운송장의 택배사명을 플랫폼이 인식하는 정식 명칭으로 자동 변환해요.</div>
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
          <span className="crumb__strong">택배사 매핑</span>
        </div>
        <div className="topbar__meta">
          총 <b>8개</b>의 택배사 변환 규칙 · 마지막 수정 <b>2026-05-08 09:14</b>
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="알림"><I.Bell width="18" height="18" /></button>
        <div className="topbar__divider" />
        <button className="ghostbtn">CSV 일괄 등록</button>
      </div>
    </header>
  );
}

const SUPPLIERS = [
  { id: "all", name: "전체 공급처" },
  { id: "A", name: "A농장" },
  { id: "B", name: "B도매" },
  { id: "C", name: "C농장" },
  { id: "D", name: "영천 단감농원" },
];
const SUP_NAME = { A: "A농장", B: "B도매", C: "C농장", D: "영천 단감농원" };
const COURIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배"];

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

function FilterRow({ q, setQ, supplier, setSupplier, onAdd }) {
  return (
    <div className="frow">
      <div className="search search--lg">
        <I.Search width="16" height="16" color="#8B95A1"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="택배사명 검색" />
        {q && <button className="search__clear" onClick={() => setQ("")}><I.X width="14" height="14"/></button>}
      </div>
      <Dropdown value={supplier} onChange={setSupplier} options={SUPPLIERS.map(s => ({ value: s.id, label: s.name }))}/>
      <div className="frow__spacer"/>
      <button className="btn btn--primary btn--sm" onClick={onAdd}>
        <I.Plus width="14" height="14"/> 매핑 추가
      </button>
    </div>
  );
}

const ROWS = [
  { id: 1, supplier: "A", original: "대한통운", coupang: "CJ대한통운", toss: "CJ대한통운", updated: "2026-05-08" },
  { id: 2, supplier: "A", original: "한진",     coupang: "한진택배",   toss: "한진택배",   updated: "2026-05-08" },
  { id: 3, supplier: "B", original: "CJ",       coupang: "CJ대한통운", toss: "CJ대한통운", updated: "2026-05-07" },
  { id: 4, supplier: "B", original: "우체국",   coupang: "우체국택배", toss: "우체국택배", updated: "2026-05-07" },
  { id: 5, supplier: "C", original: "롯데",     coupang: "롯데택배",   toss: "롯데택배",   updated: "2026-05-06" },
  { id: 6, supplier: "C", original: "로젠",     coupang: "로젠택배",   toss: "로젠택배",   updated: "2026-05-06" },
  { id: 7, supplier: "D", original: "CJ택배",   coupang: "CJ대한통운", toss: "CJ대한통운", updated: "2026-05-05" },
  { id: 8, supplier: "D", original: "우편",     coupang: "우체국택배", toss: "우체국택배", updated: "2026-05-05" },
];

function CourierTable({ rows, onEdit }) {
  return (
    <div className="cmtable">
      <div className="cmtable__head">
        <div className="cm-supplier">공급처</div>
        <div className="cm-orig">원본 택배사명 (공급처 표기)</div>
        <div className="cm-arrow"></div>
        <div className="cm-coupang">쿠팡 택배사명</div>
        <div className="cm-toss">토스 택배사명</div>
        <div className="cm-updated">최종 수정</div>
        <div className="cm-actions"></div>
      </div>
      {rows.map(r => (
        <div key={r.id} className="cmtable__row">
          <div className="cm-supplier">
            <span className="picker__avatar">{r.supplier}</span>
            <span className="supcol__name">{SUP_NAME[r.supplier]}</span>
          </div>
          <div className="cm-orig">
            <span className="origchip">{r.original}</span>
          </div>
          <div className="cm-arrow">
            <span className="arrowchip"><I.Arrow width="14" height="14"/></span>
          </div>
          <div className="cm-coupang">
            <span className="platchip platchip--coupang">쿠팡</span>
            <span className="cmname">{r.coupang}</span>
          </div>
          <div className="cm-toss">
            <span className="platchip platchip--toss">토스</span>
            <span className="cmname">{r.toss}</span>
          </div>
          <div className="cm-updated mono">{r.updated}</div>
          <div className="cm-actions">
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

function CourierInput({ value, onChange, placeholder, platform }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="cinput" ref={ref}>
      <input className="ipt" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onFocus={() => setOpen(true)}/>
      {open && (
        <div className="cinput__menu">
          <div className="cinput__lbl">{platform === "coupang" ? "쿠팡 정식 명칭" : "토스 정식 명칭"}</div>
          {COURIERS.map(c => (
            <button key={c} className="cinput__opt" onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SidePanel({ open, editing, onClose, onSave }) {
  const [draft, setDraft] = useState({
    supplier: "A", original: "", coupang: "", toss: "",
  });

  useEffect(() => {
    if (editing) setDraft({
      supplier: editing.supplier, original: editing.original,
      coupang: editing.coupang, toss: editing.toss,
    });
    else setDraft({ supplier: "A", original: "", coupang: "", toss: "" });
  }, [editing, open]);

  if (!open) return null;

  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <aside className="panel">
        <div className="panel__head">
          <div>
            <div className="panel__eyebrow">{editing ? "택배사 변환 수정" : "새 택배사 변환"}</div>
            <div className="panel__title">택배사 매핑</div>
          </div>
          <button className="iconbtn" onClick={onClose}><I.X width="18" height="18"/></button>
        </div>

        <div className="panel__body">
          <div className="renamehint">
            <I.Arrow width="14" height="14"/>
            공급처가 쓰는 택배사 표기를 플랫폼 정식 명칭으로 변환합니다
          </div>

          <Field label="공급처" required>
            <Dropdown value={draft.supplier}
              onChange={v => setDraft(d => ({ ...d, supplier: v }))}
              options={SUPPLIERS.filter(s => s.id !== "all").map(s => ({ value: s.id, label: s.name }))}/>
          </Field>

          <div className="fldgroup">
            <div className="fldgroup__lbl">변환 전 (공급처 표기)</div>
            <Field label="원본 택배사명" required hint="공급처가 운송장에 적은 표기 그대로 입력하세요">
              <input className="ipt" placeholder="예: 대한통운, CJ, 한진"
                value={draft.original} onChange={e => setDraft(d => ({ ...d, original: e.target.value }))}/>
            </Field>
          </div>

          <div className="renamearrow"><I.Arrow width="20" height="20" color="#8B95A1"/></div>

          <div className="fldgroup fldgroup--to">
            <div className="fldgroup__lbl">변환 후 (플랫폼 정식 명칭)</div>
            <Field label="쿠팡 택배사명" required>
              <CourierInput value={draft.coupang} onChange={v => setDraft(d => ({ ...d, coupang: v }))}
                placeholder="예: CJ대한통운" platform="coupang"/>
            </Field>
            <Field label="토스 택배사명" required>
              <CourierInput value={draft.toss} onChange={v => setDraft(d => ({ ...d, toss: v }))}
                placeholder="예: CJ대한통운" platform="toss"/>
            </Field>
          </div>
        </div>

        <div className="panel__foot">
          <button className="ghostbtn" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={() => onSave(draft)}
            disabled={!draft.original.trim() || !draft.coupang.trim() || !draft.toss.trim()}>
            {editing ? "수정 저장" : "매핑 추가"}
          </button>
        </div>
      </aside>
    </>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "panelOpen": false,
  "editingExisting": false
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
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (t.editingExisting && t.panelOpen) setEditing(ROWS[0]);
    else if (!t.panelOpen) setEditing(null);
  }, [t.editingExisting, t.panelOpen]);

  const filtered = useMemo(() => {
    return ROWS.filter(r => {
      if (supplier !== "all" && r.supplier !== supplier) return false;
      const haystack = `${r.original} ${r.coupang} ${r.toss}`;
      if (q && !haystack.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, supplier]);

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
                <h1 className="page-head__title">택배사 매핑</h1>
                <p className="page-head__sub">공급처 운송장에 적힌 택배사 이름을 쿠팡/토스가 받는 정식 명칭으로 변환해요. 등록된 변환 규칙은 운송장 업로드 시 자동 적용됩니다.</p>
              </div>
            </div>

            <FilterRow q={q} setQ={setQ}
              supplier={supplier} setSupplier={setSupplier}
              onAdd={() => { setEditing(null); t.set("editingExisting", false); t.set("panelOpen", true); }}/>

            <CourierTable rows={filtered} onEdit={(r) => { setEditing(r); t.set("panelOpen", true); }}/>
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
        <TweakToggle label="패널 열기" value={t.panelOpen} onChange={v=>t.set("panelOpen", v)}/>
        <TweakToggle label="기존 항목 수정 모드" value={t.editingExisting} onChange={v=>t.set("editingExisting", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
