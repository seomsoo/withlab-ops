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
  Excel: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="3" width="18" height="18" rx="2" fill="#107C41"/><path d="m8 8 8 8M16 8l-8 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Upload: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 16V5M7 10l5-5 5 5M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Reload: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
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

const JOBS = [
  { id: "WL-260508-AM", title: "2026-05-08 오전 발주", orders: 158, status: "운송장 매칭", current: true },
  { id: "WL-260507-PM", title: "2026-05-07 오후 발주", orders: 92,  status: "완료" },
  { id: "WL-260507-AM", title: "2026-05-07 오전 발주", orders: 134, status: "완료" },
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
          <span className="crumb__strong">운송장 업로드</span>
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="알림"><I.Bell width="18" height="18" /></button>
        <div className="topbar__divider" />
        <button className="ghostbtn">업로드 가이드</button>
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
      {tabs.map((t) => {
        const active = t.id === "upload";
        return (
          <a key={t.id} href="#" className={`tab ${active ? "is-active" : ""}`}>
            <span className="tab__step">{t.step}</span>
            <span className="tab__label">{t.label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ───────── Supplier select ─────────
const SUPPLIERS = [
  { id: "A", name: "A농장",      region: "제주", uploaded: true,  fileName: "A농장_운송장_0508.xlsx", count: 42 },
  { id: "B", name: "B도매",      region: "성주", uploaded: false },
  { id: "C", name: "C농장",      region: "제주", uploaded: false },
  { id: "D", name: "영천 단감농원", region: "영천", uploaded: false },
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
              <div className="supsel__sub">{value.region} · {value.uploaded ? `운송장 ${value.count}건 업로드됨` : "업로드 대기"}</div>
            </div>
          </>
        ) : (
          <div className="supsel__placeholder">공급처를 선택하세요</div>
        )}
        <I.ChevronDown width="16" height="16" color="#8B95A1"/>
      </button>
      {open && (
        <div className="supsel__menu">
          <div className="supsel__menu-head">전체 공급처 · {SUPPLIERS.length}개</div>
          {SUPPLIERS.map(s => (
            <button key={s.id} className={`supsel__opt ${value?.id === s.id ? "is-cur" : ""}`}
              onClick={() => { onChange(s); setOpen(false); }}>
              <span className="picker__avatar">{s.id}</span>
              <div className="supsel__textcol">
                <div className="supsel__name">{s.name}</div>
                <div className="supsel__sub">{s.region}</div>
              </div>
              <span className={`pill ${s.uploaded ? "pill--ok" : "pill--mute"}`}>
                <span className="pill__dot"/>
                {s.uploaded ? "업로드됨" : "대기"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Dropzone ─────────
function Dropzone({ disabled, onUpload }) {
  return (
    <div className={`udrop ${disabled ? "is-disabled" : ""}`}>
      <div className="udrop__icon"><I.Upload width="28" height="28" color={disabled ? "#C9CDD2" : "#3182F6"}/></div>
      <div className="udrop__title">
        {disabled ? "공급처를 먼저 선택해 주세요" : "운송장 엑셀 파일을 끌어다 놓으세요"}
      </div>
      <div className="udrop__sub">
        {disabled
          ? "어느 공급처에서 받은 운송장인지 알아야 매핑 양식을 적용할 수 있어요."
          : ".xlsx · .csv · 최대 10MB"}
      </div>
      <button className="btn btn--ghost" disabled={disabled} onClick={onUpload}>파일 선택</button>
    </div>
  );
}

function UploadedFile({ file, onReupload }) {
  return (
    <div className="ufile">
      <I.Excel width="36" height="36"/>
      <div className="ufile__col">
        <div className="ufile__name">{file.name}</div>
        <div className="ufile__sub">{file.size} · {file.uploadedAt} 업로드</div>
      </div>
      <span className="badge badge--success"><span className="badge__dot"/>파싱 완료</span>
      <button className="textbtn" onClick={onReupload}>
        <I.Reload width="14" height="14"/> 다시 업로드
      </button>
    </div>
  );
}

// ───────── Parse summary ─────────
function ParseSummary({ ok, err }) {
  return (
    <div className="psum">
      <div className="psum__cell">
        <div className="psum__icon psum__icon--ok"><I.Check width="18" height="18"/></div>
        <div>
          <div className="psum__num">{ok}<span>건</span></div>
          <div className="psum__lbl">정상 파싱</div>
        </div>
      </div>
      <div className="psum__divider"/>
      <div className="psum__cell">
        <div className={`psum__icon ${err > 0 ? "psum__icon--err" : "psum__icon--mute"}`}><I.Alert width="18" height="18"/></div>
        <div>
          <div className={`psum__num ${err > 0 ? "is-err" : ""}`}>{err}<span>건</span></div>
          <div className="psum__lbl">오류</div>
        </div>
      </div>
      <div className="psum__divider"/>
      <div className="psum__cell">
        <div className="psum__icon psum__icon--info"><I.Truck width="18" height="18"/></div>
        <div>
          <div className="psum__num">CJ대한통운</div>
          <div className="psum__lbl">감지된 택배사</div>
        </div>
      </div>
      <div className="psum__hint">
        <span>아래 표를 가볍게 훑어보고, 데이터가 맞으면 다음 단계에서 매칭을 실행하세요.</span>
      </div>
    </div>
  );
}

// ───────── Tracking rows table ─────────
const TRACKING_ROWS = [
  { orderId: "21100189144417", product: "정품 한라봉 중소과 5kg",     recipient: "박종금", courier: "CJ대한통운", tracking: "6978-8423-7233" },
  { orderId: "21100189144932", product: "성주 참외 5kg 가정용",       recipient: "김철수", courier: "CJ대한통운", tracking: "6978-8423-7301" },
  { orderId: "21100189145011", product: "성주 참외 5kg 선물용",       recipient: "박지원", courier: "CJ대한통운", tracking: "6978-8423-7402" },
  { orderId: "21100189145128", product: "한라봉 가정용 3kg",          recipient: "이연재", courier: "CJ대한통운", tracking: "6978-8423-7558" },
  { orderId: "21100189145290", product: "정품 한라봉 중소과 5kg",     recipient: "정유진", courier: "CJ대한통운", tracking: "6978-8423-7613" },
  { orderId: "21100189145357", product: "성주 참외 5kg 가정용",       recipient: "최도윤", courier: "CJ대한통운", tracking: "6978-8423-7799" },
  { orderId: "21100189145420", product: "한라봉 선물용 5kg",          recipient: "한지호", courier: "CJ대한통운", tracking: "6978-8423-7884" },
  { orderId: "21100189145501", product: "성주 꿀참외 가정용 2.5kg",   recipient: "조서연", courier: "CJ대한통운", tracking: "6978-8423-7901" },
];

function TrackingTable({ rows }) {
  return (
    <div className="utbl">
      <div className="utbl__head">
        <div className="uc-num">#</div>
        <div className="uc-order">원본 주문번호</div>
        <div className="uc-product">상품명</div>
        <div className="uc-recipient">수령인</div>
        <div className="uc-courier">택배사</div>
        <div className="uc-tracking">운송장번호</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="utbl__row">
          <div className="uc-num"><span>{i+1}</span></div>
          <div className="uc-order mono">{r.orderId}</div>
          <div className="uc-product">{r.product}</div>
          <div className="uc-recipient">{r.recipient}</div>
          <div className="uc-courier">
            <span className="courier">
              <span className="courier__dot" style={{background: "#3182F6"}}/>
              {r.courier}
            </span>
          </div>
          <div className="uc-tracking mono">{r.tracking}</div>
        </div>
      ))}
    </div>
  );
}

// ───────── Reupload confirm modal ─────────
function ReuploadModal({ open, supplier, onClose, onConfirm }) {
  if (!open || !supplier) return null;
  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal__icon"><I.Reload width="22" height="22" color="#C46A00"/></div>
        <div className="modal__title">{supplier.name} 운송장을 다시 업로드할까요?</div>
        <div className="modal__body">
          이미 <b>{supplier.name} 운송장 파일</b>이 업로드되어 있어요.<br/>
          다시 업로드하면 <b>기존 데이터가 대체</b>되고, 매칭 결과도 새로 계산됩니다.
        </div>
        <div className="modal__foot">
          <button className="ghostbtn" onClick={onClose}>취소</button>
          <button className="btn btn--primary" onClick={onConfirm}>다시 업로드</button>
        </div>
      </div>
    </>
  );
}

// ───────── Footer CTA ─────────
function FooterCTA({ canNext }) {
  return (
    <div className="footcta">
      <div className="footcta__left">
        {canNext ? (
          <span className="footcta__ok">
            <I.Check width="16" height="16"/>
            운송장 42건이 정상적으로 업로드됐어요. 매칭 단계로 넘어가세요.
          </span>
        ) : (
          <span className="footcta__warn">
            <I.Alert width="16" height="16"/>
            아직 업로드되지 않은 공급처가 있어요. 모든 공급처 업로드가 끝나야 매칭이 정확해요.
          </span>
        )}
      </div>
      <div className="footcta__right">
        <button className="ghostbtn"><I.ChevronLeft width="14" height="14"/> 이전</button>
        <button className="btn btn--primary" disabled={!canNext}>
          다음: 매칭 결과
          <I.Chevron width="16" height="16"/>
        </button>
      </div>
    </div>
  );
}

// ───────── Supplier progress strip ─────────
function SupplierStrip({ supplier }) {
  return (
    <div className="sstrip">
      <div className="sstrip__title">이 발주 작업의 공급처</div>
      <div className="sstrip__list">
        {SUPPLIERS.map(s => {
          const active = supplier?.id === s.id;
          return (
            <div key={s.id} className={`sstrip__item ${s.uploaded ? "is-done" : ""} ${active ? "is-active" : ""}`}>
              <span className="sstrip__bullet">
                {s.uploaded ? <I.Check width="11" height="11"/> : s.id}
              </span>
              <div>
                <div className="sstrip__name">{s.name}</div>
                <div className="sstrip__sub">
                  {s.uploaded ? `운송장 ${s.count}건` : "업로드 대기"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "supplierId": "A",
  "uploaded": true,
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
  const supplier = t.supplierId ? SUPPLIERS.find(s => s.id === t.supplierId) : null;
  const showUploaded = t.uploaded && supplier;

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner">
          <div className="page-head">
            <div>
              <h1 className="page-head__title">운송장 업로드</h1>
              <p className="page-head__sub">공급처에서 받은 운송장 파일을 올려주세요. 등록된 양식을 따라 자동으로 파싱돼요.</p>
            </div>
            <div className="page-head__right">
              <JobDropdown />
            </div>
          </div>

          <Tabs />

          <SupplierStrip supplier={supplier}/>

          <section className="ublock">
            <div className="ublock__head">
              <div className="ublock__num">01</div>
              <div>
                <div className="ublock__title">공급처 선택</div>
                <div className="ublock__sub">어느 공급처에서 받은 운송장인지 선택하세요. 공급처별로 등록된 양식이 자동 적용돼요.</div>
              </div>
            </div>
            <div className="ublock__body">
              <SupplierSelect value={supplier} onChange={(s) => { t.set("supplierId", s.id); t.set("uploaded", s.uploaded); }}/>
            </div>
          </section>

          <section className="ublock">
            <div className="ublock__head">
              <div className={`ublock__num ${!supplier ? "is-mute" : ""}`}>02</div>
              <div>
                <div className="ublock__title">파일 업로드</div>
                <div className="ublock__sub">운송장 엑셀 파일을 끌어다 놓거나, 파일 선택 버튼을 눌러주세요.</div>
              </div>
            </div>
            <div className="ublock__body">
              {showUploaded ? (
                <UploadedFile
                  file={{ name: supplier.fileName, size: "184KB", uploadedAt: "2026-05-08 09:42" }}
                  onReupload={() => t.set("modalOpen", true)}/>
              ) : (
                <Dropzone disabled={!supplier} onUpload={() => { if (supplier) t.set("uploaded", true); }}/>
              )}
            </div>
          </section>

          {showUploaded && (
            <>
              <section className="ublock">
                <div className="ublock__head">
                  <div className="ublock__num">03</div>
                  <div>
                    <div className="ublock__title">파싱 결과</div>
                    <div className="ublock__sub">엑셀에서 읽어온 운송장 데이터를 확인해 주세요.</div>
                  </div>
                </div>
                <div className="ublock__body">
                  <ParseSummary ok={42} err={0}/>
                  <TrackingTable rows={TRACKING_ROWS}/>
                  <div className="utbl__more">아래로 스크롤해 전체 42건을 볼 수 있어요</div>
                </div>
              </section>
            </>
          )}
        </div>
        <FooterCTA canNext={showUploaded}/>
      </main>

      <ReuploadModal open={t.modalOpen} supplier={supplier}
        onClose={() => t.set("modalOpen", false)}
        onConfirm={() => t.set("modalOpen", false)}/>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="화면 상태">
        <TweakRadio label="공급처" value={t.supplierId || "none"}
          options={[
            { value: "none", label: "선택 안 함" },
            { value: "A",    label: "A농장" },
            { value: "B",    label: "B도매" },
          ]}
          onChange={v => t.set("supplierId", v === "none" ? null : v)}/>
        <TweakToggle label="파일 업로드 완료" value={t.uploaded} onChange={v=>t.set("uploaded", v)}/>
        <TweakToggle label="재업로드 확인 모달" value={t.modalOpen} onChange={v=>t.set("modalOpen", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
