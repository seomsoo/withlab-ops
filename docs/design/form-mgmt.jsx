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
  Bell: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  X: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Excel: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="3" width="18" height="18" rx="2" fill="#107C41"/><path d="m8 8 8 8M16 8l-8 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Upload: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 16V5M7 10l5-5 5 5M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Eye: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Reload: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Sparkle: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="m6 6 2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
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
          const active = it.id === "form";
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
  { id: "supplier-form", label: "공급처 발주서 양식", count: 9 },
  { id: "platform-form", label: "플랫폼 운송장 업로드 양식", count: 4 },
];

function SubNav() {
  return (
    <aside className="subnav">
      <div className="subnav__title">양식관리</div>
      <div className="subnav__sub">엑셀 양식의 컬럼을 시스템 필드와 연결해요</div>
      <nav className="subnav__list">
        {SUBMENU.map(s => (
          <a key={s.id} href="#" className={`subnav__item ${s.id === "supplier-form" ? "is-active" : ""}`}>
            <span>{s.label}</span>
            <span className="subnav__count">{s.count}</span>
          </a>
        ))}
      </nav>
      <div className="subnav__tip">
        <div className="subnav__tip-title">💡 한 번 매핑하면 끝</div>
        <div className="subnav__tip-body">공급처가 양식을 변경하지 않는 한, 매핑은 계속 재사용돼요.</div>
      </div>
    </aside>
  );
}

function TopBar({ supplier }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="crumb">
          <span className="crumb__muted">양식관리</span>
          <I.Chevron width="14" height="14" color="#C9CDD2" />
          <span className="crumb__strong">공급처 발주서 양식</span>
        </div>
        <div className="topbar__meta">
          {supplier ? <>현재 <b>{supplier.name}</b> · 매핑된 컬럼 <b>{supplier.mapped}/{supplier.total}</b></> : "공급처를 선택해 주세요"}
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="알림"><I.Bell width="18" height="18" /></button>
        <div className="topbar__divider" />
        <button className="ghostbtn">매핑 가이드</button>
      </div>
    </header>
  );
}

// ───────── Suppliers ─────────
const SUPPLIERS = [
  { id: "A", name: "A농장", region: "제주", state: "registered", file: "A농장_발주양식.xlsx", sheet: "sheet001", header: 1, dataStart: 2, registeredAt: "2026-04-15", mapped: 12, total: 15 },
  { id: "B", name: "B도매", region: "성주", state: "registered", file: "B도매_주문서_v3.xlsx", sheet: "Order", header: 2, dataStart: 3, registeredAt: "2026-04-20", mapped: 14, total: 14 },
  { id: "C", name: "C농장", region: "제주", state: "missing" },
  { id: "D", name: "영천 단감농원", region: "영천", state: "registered", file: "영천_단감_발주.xlsx", sheet: "Sheet1", header: 1, dataStart: 2, registeredAt: "2026-03-22", mapped: 11, total: 12 },
  { id: "E", name: "샤인플러스", region: "안성", state: "registered", file: "샤인플러스_발주양식.xlsx", sheet: "발주", header: 1, dataStart: 2, registeredAt: "2026-03-10", mapped: 13, total: 13 },
  { id: "F", name: "남도청과", region: "나주", state: "missing" },
];

function SupplierSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="supsel" ref={ref}>
      <button className={`supsel__trigger ${value ? "is-filled" : ""}`} onClick={() => setOpen(o=>!o)}>
        {value ? (
          <>
            <span className="picker__avatar">{value.id}</span>
            <div className="supsel__textcol">
              <div className="supsel__name">{value.name}</div>
              <div className="supsel__sub">{value.region} · {value.state === "registered" ? "양식 등록됨" : "양식 미등록"}</div>
            </div>
          </>
        ) : (
          <>
            <div className="supsel__placeholder">공급처를 선택하세요</div>
          </>
        )}
        <I.ChevronDown width="16" height="16" color="#8B95A1"/>
      </button>
      {open && (
        <div className="supsel__menu">
          <div className="supsel__menu-head">전체 공급처 · 12개</div>
          {SUPPLIERS.map(s => (
            <button key={s.id} className={`supsel__opt ${value?.id === s.id ? "is-cur" : ""}`}
              onClick={() => { onChange(s); setOpen(false); }}>
              <span className="picker__avatar">{s.id}</span>
              <div className="supsel__textcol">
                <div className="supsel__name">{s.name}</div>
                <div className="supsel__sub">{s.region}</div>
              </div>
              <span className={`pill ${s.state === "registered" ? "pill--ok" : "pill--mute"}`}>
                <span className="pill__dot"/>
                {s.state === "registered" ? "등록됨" : "미등록"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Empty state (no supplier) ─────────
function EmptyState() {
  return (
    <div className="empty">
      <div className="empty__art">
        <svg viewBox="0 0 120 80" width="120" height="80">
          <rect x="14" y="14" width="92" height="60" rx="8" fill="#F2F4F6"/>
          <rect x="14" y="14" width="92" height="16" rx="8" fill="#E5E8EB"/>
          <rect x="22" y="38" width="40" height="6" rx="3" fill="#D1D6DB"/>
          <rect x="22" y="50" width="56" height="6" rx="3" fill="#E5E8EB"/>
          <rect x="22" y="62" width="32" height="6" rx="3" fill="#E5E8EB"/>
          <circle cx="92" cy="58" r="14" fill="#3182F6"/>
          <path d="M86 58h12M92 52v12" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="empty__title">공급처를 선택해 주세요</div>
      <div className="empty__sub">상단에서 공급처를 고르면 등록된 발주 양식과 컬럼 매핑이 표시돼요.<br/>아직 등록된 양식이 없다면 이 화면에서 새로 업로드할 수도 있어요.</div>
    </div>
  );
}

// ───────── Form info card (registered) ─────────
function FormInfoCard({ supplier }) {
  const items = [
    { label: "시트명",        value: supplier.sheet, mono: true },
    { label: "헤더 행",       value: `${supplier.header}행` },
    { label: "데이터 시작 행", value: `${supplier.dataStart}행` },
    { label: "등록일",        value: supplier.registeredAt, mono: true },
  ];
  return (
    <div className="finfo">
      <div className="finfo__file">
        <I.Excel width="36" height="36"/>
        <div className="finfo__filecol">
          <div className="finfo__name">{supplier.file}</div>
          <div className="finfo__sub">엑셀 파일 · 마지막 업로드 {supplier.registeredAt}</div>
        </div>
        <button className="textbtn">
          <I.Reload width="14" height="14"/> 양식 다시 업로드
        </button>
      </div>
      <div className="finfo__grid">
        {items.map(it => (
          <div key={it.label} className="finfo__cell">
            <div className="finfo__lbl">{it.label}</div>
            <div className={`finfo__val ${it.mono ? "mono" : ""}`}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── Column mapping table ─────────
const SYS_FIELDS = [
  { v: "",        label: "선택 안 함" },
  { v: "_match",  label: "매칭키",          group: "매칭" },
  { v: "_oid",    label: "주문번호",        group: "매칭" },
  { v: "_oiid",   label: "주문상품번호",    group: "매칭" },
  { v: "_pname",  label: "공급처 상품명",   group: "상품" },
  { v: "_pcode",  label: "공급처 상품코드", group: "상품" },
  { v: "_qty",    label: "수량",           group: "상품" },
  { v: "_rname",  label: "수취인이름",     group: "배송" },
  { v: "_rphone", label: "수취인전화",     group: "배송" },
  { v: "_zip",    label: "우편번호",       group: "배송" },
  { v: "_addr",   label: "주소",           group: "배송" },
  { v: "_memo",   label: "배송메모",       group: "배송" },
  { v: "_bname",  label: "구매자이름",     group: "주문자" },
  { v: "_bphone", label: "구매자전화",     group: "주문자" },
  { v: "_empty",  label: "비움 (Empty)",  group: "기타" },
];

const FORMATS = [
  { v: "raw",   label: "원본" },
  { v: "hyph",  label: "하이픈 형식" },
  { v: "num",   label: "숫자만" },
];

const COLUMN_DATA = [
  { num: 1,  header: "주문번호",       field: "_match",  fmt: null },
  { num: 2,  header: "상품코드",       field: "_pcode",  fmt: null },
  { num: 3,  header: "상품명",         field: "_pname",  fmt: null },
  { num: 4,  header: "수량",           field: "_qty",    fmt: null },
  { num: 5,  header: "주문자명",       field: "_bname",  fmt: null },
  { num: 6,  header: "주문자전화",     field: "_bphone", fmt: "hyph" },
  { num: 7,  header: "수령인명",       field: "_rname",  fmt: null },
  { num: 8,  header: "수령인전화",     field: "_rphone", fmt: "hyph" },
  { num: 9,  header: "우편번호",       field: "_zip",    fmt: null },
  { num: 10, header: "주소1",          field: "_addr",   fmt: null },
  { num: 11, header: "주소2",          field: "_empty",  fmt: null },
  { num: 12, header: "배송메모",       field: "_memo",   fmt: null },
  { num: 13, header: "보내는분우편번호", field: "_empty",  fmt: null },
  { num: 14, header: "보내는분주소1",   field: "_empty",  fmt: null },
  { num: 15, header: "보내는분주소2",   field: "_empty",  fmt: null },
];

function PhoneFields() {} // placeholder used to silence linter

function NativeSelect({ value, options, onChange, placeholder, getLabel = o => o.label, getValue = o => o.v, small, danger, muted }) {
  return (
    <div className={`nsel ${small ? "nsel--sm" : ""} ${danger ? "nsel--danger" : ""} ${muted ? "nsel--muted" : ""}`}>
      <select value={value || ""} onChange={e => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={getValue(o)} value={getValue(o)}>{getLabel(o)}</option>
        ))}
      </select>
      <I.ChevronDown width="14" height="14" color="#8B95A1"/>
    </div>
  );
}

function isPhoneField(v) { return v === "_rphone" || v === "_bphone"; }

function FieldLabel({ v }) {
  const f = SYS_FIELDS.find(x => x.v === v);
  if (!f) return null;
  return f.group ? <span className="fld-grp">{f.group}</span> : null;
}

function ColumnMapping() {
  const [rows, setRows] = useState(COLUMN_DATA);

  const update = (num, patch) => setRows(rs => rs.map(r => r.num === num ? { ...r, ...patch } : r));

  const counts = useMemo(() => {
    const used = rows.filter(r => r.field && r.field !== "" && r.field !== "_empty").length;
    const empty = rows.filter(r => r.field === "_empty").length;
    const blank = rows.filter(r => !r.field).length;
    return { used, empty, blank };
  }, [rows]);

  return (
    <div className="cmap">
      <div className="cmap__head">
        <div>
          <div className="cmap__title">컬럼 매핑</div>
          <div className="cmap__sub">엑셀의 각 컬럼이 시스템에서 어떤 정보로 들어갈지 골라주세요.</div>
        </div>
        <div className="cmap__stats">
          <div><b>{counts.used}</b><span>매핑됨</span></div>
          <div><b>{counts.empty}</b><span>비움</span></div>
          <div><b className={counts.blank ? "t-warn" : ""}>{counts.blank}</b><span>미설정</span></div>
        </div>
      </div>

      <div className="cmap__table">
        <div className="cmap__thead">
          <div>#</div>
          <div>엑셀 헤더명</div>
          <div>시스템 필드</div>
          <div>포맷</div>
        </div>
        {rows.map(r => {
          const phone = isPhoneField(r.field);
          const isEmpty = r.field === "_empty";
          const isBlank = !r.field;
          return (
            <div key={r.num} className={`cmap__row ${isBlank ? "is-blank" : ""}`}>
              <div className="cmap__num"><span>{r.num}</span></div>
              <div className="cmap__header">
                <div className="cmap__hname">{r.header}</div>
                {!isBlank && !isEmpty && <FieldLabel v={r.field}/>}
              </div>
              <div className="cmap__field">
                <NativeSelect value={r.field || ""}
                  options={SYS_FIELDS}
                  onChange={v => update(r.num, { field: v, fmt: isPhoneField(v) && !rows.find(x=>x.num===r.num).fmt ? "hyph" : rows.find(x=>x.num===r.num).fmt })}
                  placeholder="필드를 선택하세요"
                  muted={isEmpty}/>
              </div>
              <div className="cmap__fmt">
                {phone ? (
                  <NativeSelect value={r.fmt || "raw"}
                    options={FORMATS}
                    onChange={v => update(r.num, { fmt: v })}
                    small/>
                ) : (
                  <span className="cmap__dash">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────── Form footer ─────────
function FormFooter({ onPreview, onSave }) {
  return (
    <div className="fbar">
      <div className="fbar__hint">
        <I.Sparkle width="14" height="14" color="#3182F6"/>
        저장 전 <b>테스트 미리보기</b>로 실제 발주서가 잘 채워지는지 확인해보세요.
      </div>
      <div className="fbar__actions">
        <button className="ghostbtn" onClick={onPreview}>
          <I.Eye width="16" height="16"/> 테스트 미리보기
        </button>
        <button className="btn btn--primary" onClick={onSave}>저장</button>
      </div>
    </div>
  );
}

// ───────── Missing form: upload flow ─────────
function MissingForm({ stage, setStage }) {
  return (
    <div className="missing">
      <div className="missing__steps">
        <Step n={1} label="파일 업로드" active={stage >= 0} done={stage > 0}/>
        <StepLine done={stage > 0}/>
        <Step n={2} label="시트·행 설정" active={stage >= 1} done={stage > 1}/>
        <StepLine done={stage > 1}/>
        <Step n={3} label="컬럼 매핑" active={stage >= 2} done={false}/>
      </div>

      {stage === 0 && (
        <div className="dropzone">
          <div className="dropzone__icon"><I.Upload width="28" height="28" color="#3182F6"/></div>
          <div className="dropzone__title">엑셀 파일을 끌어다 놓으세요</div>
          <div className="dropzone__sub">.xlsx 형식 · 최대 10MB · 시트 여러 개 지원</div>
          <button className="btn btn--ghost" onClick={() => setStage(1)}>파일 선택</button>
          <div className="dropzone__hint">
            등록된 양식이 없어요. 공급처에서 받은 발주 양식 파일을 올려주세요.
          </div>
        </div>
      )}

      {stage === 1 && (
        <div className="sheetcfg">
          <div className="sheetcfg__file">
            <I.Excel width="32" height="32"/>
            <div>
              <div className="sheetcfg__name">A농장_발주양식.xlsx</div>
              <div className="sheetcfg__sub">312KB · 방금 업로드됨</div>
            </div>
            <button className="textbtn" onClick={() => setStage(0)}>다시 선택</button>
          </div>
          <div className="sheetcfg__grid">
            <Field label="시트 선택">
              <NativeSelect value="sheet001"
                options={[{v:"sheet001",label:"sheet001"},{v:"sheet002",label:"sheet002"},{v:"양식안내",label:"양식안내"}]}
                onChange={()=>{}}/>
            </Field>
            <Field label="헤더 행">
              <input className="ipt" type="number" defaultValue={1}/>
            </Field>
            <Field label="데이터 시작 행">
              <input className="ipt" type="number" defaultValue={2}/>
            </Field>
          </div>
          <div className="sheetcfg__foot">
            <button className="ghostbtn" onClick={() => setStage(0)}>이전</button>
            <button className="btn btn--primary" onClick={() => setStage(2)}>다음: 컬럼 매핑 →</button>
          </div>
        </div>
      )}

      {stage === 2 && (
        <>
          <FormInfoCard supplier={{
            file: "A농장_발주양식.xlsx", sheet: "sheet001", header: 1, dataStart: 2, registeredAt: "방금"
          }}/>
          <ColumnMapping/>
        </>
      )}
    </div>
  );
}

function Step({ n, label, active, done }) {
  return (
    <div className={`step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
      <div className="step__bullet">{done ? <I.Check width="14" height="14"/> : n}</div>
      <div className="step__label">{label}</div>
    </div>
  );
}
function StepLine({ done }) { return <div className={`stepline ${done ? "is-done" : ""}`}/>; }

function Field({ label, hint, children }) {
  return (
    <div className="fld">
      <div className="fld__lbl">{label}</div>
      {children}
      {hint && <div className="fld__hint">{hint}</div>}
    </div>
  );
}

// ───────── Preview modal ─────────
const PREVIEW_HEADERS = ["주문번호","상품코드","상품명","수량","주문자명","주문자전화","수령인명","수령인전화","우편번호","주소1","주소2","배송메모","보내는분우편번호","보내는분주소1","보내는분주소2"];
const PREVIEW_ROWS = [
  ["20260508-00194","SKU-FRT-018","산지직송 성주 꿀참외 5kg","2","김민지","010-2341-9087","김민지","010-2341-9087","04524","서울 중구 세종대로 110","8층","부재시 경비실에","","",""],
  ["20260508-00195","SKU-FRT-022","제주 한라봉 5kg","1","이서준","010-7712-2841","이서준 부모님","010-3398-1102","63125","제주 제주시 첨단로 242","301호","문 앞에 두세요","","",""],
  ["20260508-00196","SKU-FRT-018","산지직송 성주 꿀참외 5kg","3","박지호","010-9921-4456","박지호","010-9921-4456","48058","부산 해운대구 해운대로 99","102동 1404호","경비실 맡김","","",""],
];

function PreviewModal({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <div className="pmodal" role="dialog" aria-modal="true">
        <div className="pmodal__head">
          <div>
            <div className="pmodal__eyebrow">테스트 미리보기</div>
            <div className="pmodal__title">A농장 발주서가 이렇게 채워져요</div>
            <div className="pmodal__sub">샘플 주문 3건 기준 · 실제 발주서와 동일한 구조</div>
          </div>
          <button className="iconbtn" onClick={onClose}><I.X width="18" height="18"/></button>
        </div>

        <div className="pmodal__body">
          <div className="prev-table">
            <div className="prev-table__sheet">sheet001</div>
            <div className="prev-table__scroll">
              <table>
                <thead>
                  <tr>
                    <th className="prev-rownum"></th>
                    {PREVIEW_HEADERS.map((h, i) => (
                      <th key={i}>
                        <div className="prev-th-num">{i+1}</div>
                        <div className="prev-th-name">{h}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_ROWS.map((row, ri) => (
                    <tr key={ri}>
                      <td className="prev-rownum">{ri+2}</td>
                      {row.map((c, ci) => (
                        <td key={ci} className={c === "" ? "is-empty" : ""}>{c || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pmodal__legend">
            <span><span className="leg leg--filled"/> 매핑된 컬럼</span>
            <span><span className="leg leg--empty"/> 비움 처리된 컬럼</span>
          </div>
        </div>

        <div className="pmodal__foot">
          <button className="ghostbtn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M12 4v12M7 11l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            테스트 엑셀 다운로드
          </button>
          <button className="btn btn--primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "supplierId": "A",
  "previewOpen": false
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
  const [stage, setStage] = useState(0);

  const supplier = t.supplierId ? SUPPLIERS.find(s => s.id === t.supplierId) : null;

  return (
    <div className="app">
      <Sidebar />
      <main className="main main--wsub">
        <TopBar supplier={supplier && supplier.state === "registered" ? supplier : null}/>
        <div className="main__split">
          <SubNav />
          <div className="main__inner main__inner--narrow">
            <div className="page-head">
              <div>
                <h1 className="page-head__title">공급처 발주서 양식</h1>
                <p className="page-head__sub">공급처가 사용하는 엑셀 양식의 컬럼을 시스템 필드와 연결해 주세요. 한 번 매핑해 두면 발주서가 자동으로 생성돼요.</p>
              </div>
              <div className="page-head__action">
                <SupplierSelect value={supplier} onChange={s => t.set("supplierId", s.id)}/>
              </div>
            </div>

            {!supplier && <EmptyState/>}

            {supplier && supplier.state === "registered" && (
              <>
                <FormInfoCard supplier={supplier}/>
                <ColumnMapping/>
                <FormFooter onPreview={() => t.set("previewOpen", true)} onSave={() => {}}/>
              </>
            )}

            {supplier && supplier.state === "missing" && (
              <MissingForm stage={stage} setStage={setStage}/>
            )}
          </div>
        </div>
      </main>

      <PreviewModal open={t.previewOpen} onClose={() => t.set("previewOpen", false)}/>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="화면 상태">
        <TweakRadio label="공급처 선택" value={t.supplierId || "none"}
          options={[
            { value: "none", label: "선택 안 함" },
            { value: "A",    label: "A농장 (등록됨)" },
            { value: "C",    label: "C농장 (미등록)" },
          ]}
          onChange={v => t.set("supplierId", v === "none" ? null : v)}/>
        <TweakToggle label="테스트 미리보기 모달" value={t.previewOpen} onChange={v=>t.set("previewOpen", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
