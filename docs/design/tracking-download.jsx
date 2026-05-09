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
  Eye: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Download: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 4v12M7 11l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  External: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M14 4h6v6M20 4l-9 9M10 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Excel: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="3" width="18" height="18" rx="2" fill="#107C41"/><path d="m8 8 8 8M16 8l-8 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>),
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
          <span className="crumb__strong">플랫폼 파일 다운로드</span>
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
    { id: "upload", label: "운송장 업로드", step: "1", done: true },
    { id: "match",  label: "매칭 결과",     step: "2", done: true },
    { id: "down",   label: "플랫폼 파일 다운로드", step: "3" },
  ];
  return (
    <div className="tabs">
      {tabs.map((t) => {
        const active = t.id === "down";
        return (
          <a key={t.id} href="#" className={`tab ${active ? "is-active" : ""} ${t.done ? "is-done" : ""}`}>
            <span className="tab__step">{t.done ? <I.Check width="14" height="14" /> : t.step}</span>
            <span className="tab__label">{t.label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ───────── Platform logos ─────────
function CoupangLogo() {
  return (
    <div className="dlcard__logo dlcard__logo--coupang">
      <svg viewBox="0 0 28 28" width="22" height="22">
        <path d="M5 7h18l-2.5 14H7.5L5 7Z" fill="#fff" opacity=".95"/>
      </svg>
    </div>
  );
}
function TossLogo() {
  return (
    <div className="dlcard__logo dlcard__logo--toss">
      <svg viewBox="0 0 28 28" width="22" height="22">
        <path d="M6 6l6 16 4-10 5 8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ───────── Banners ─────────
function Banner({ tone, title, action, children }) {
  return (
    <div className={`abanner abanner--${tone}`}>
      <div className="abanner__icon">
        <I.Alert width="18" height="18"/>
      </div>
      <div className="abanner__body">
        <div className="abanner__title">{title}</div>
        {children && <div className="abanner__sub">{children}</div>}
      </div>
      {action && <div className="abanner__action">{action}</div>}
    </div>
  );
}

// ───────── Download card ─────────
function DownloadCard({ platform, name, matched, unmatched, onPreview, onDownload }) {
  const Logo = platform === "coupang" ? CoupangLogo : TossLogo;
  return (
    <div className={`dlcard dlcard--${platform}`}>
      <div className="dlcard__top">
        <Logo />
        <div className="dlcard__meta">
          <div className="dlcard__name">{name}</div>
          <div className="dlcard__sub">2026-05-08 오전 발주 · 운송장 일괄 업로드용</div>
        </div>
      </div>

      <div className="dlcard__numbers">
        <div className="dlcard__main">
          <div className="dlcard__bignum">{matched}<span>건</span></div>
          <div className="dlcard__lbl">파일에 포함되는 매칭 건수</div>
        </div>
        {unmatched > 0 && (
          <div className="dlcard__excl">
            <I.Alert width="13" height="13"/>
            <span>미매칭 {unmatched}건은 파일에서 제외</span>
          </div>
        )}
      </div>

      <div className="dlcard__filerow">
        <I.Excel width="22" height="22"/>
        <div className="dlcard__filename mono">
          {platform === "coupang"
            ? "WithLab_쿠팡_운송장_20260508.xlsx"
            : "WithLab_토스_운송장_20260508.xlsx"}
        </div>
        <span className="dlcard__filesize">182KB</span>
      </div>

      <div className="dlcard__actions">
        <button className="ghostbtn" onClick={onPreview}>
          <I.Eye width="14" height="14"/> 미리보기
        </button>
        <button className="btn btn--primary" onClick={onDownload}>
          <I.Download width="16" height="16"/> 엑셀 다운로드
        </button>
      </div>
    </div>
  );
}

// ───────── Upload-step guide ─────────
const STEPS = [
  { platform: "coupang", title: "쿠팡 WING 접속", body: "쿠팡 WING > 주문관리 > 출고 처리 메뉴로 이동", link: "WING 바로가기" },
  { platform: "coupang", title: "운송장 일괄등록", body: "[운송장 일괄등록] 클릭 후 다운받은 엑셀 파일 업로드" },
  { platform: "toss",    title: "토스 셀러센터 접속", body: "토스 셀러 > 주문/배송 > 배송 처리로 이동", link: "셀러센터 바로가기" },
  { platform: "toss",    title: "운송장 일괄 업로드", body: "[운송장 업로드] 메뉴에서 다운받은 엑셀 업로드" },
];

function UploadGuide() {
  return (
    <div className="guide">
      <div className="guide__head">
        <div className="guide__title">다운로드 후 업로드 방법</div>
        <div className="guide__sub">각 플랫폼 사이트에서 운송장 일괄 업로드 메뉴에 파일을 올려주세요.</div>
      </div>
      <div className="guide__list">
        {STEPS.map((s, i) => (
          <div key={i} className="guide__item">
            <span className={`guide__bullet guide__bullet--${s.platform}`}>{i+1}</span>
            <div className="guide__col">
              <div className="guide__row">
                <span className={`platchip platchip--${s.platform}`}>
                  {s.platform === "coupang" ? "쿠팡" : "토스"}
                </span>
                <span className="guide__name">{s.title}</span>
              </div>
              <div className="guide__body">{s.body}</div>
            </div>
            {s.link && (
              <a className="guide__link" href="#">
                {s.link} <I.External width="12" height="12"/>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── Preview modal ─────────
const PREVIEW_DATA = {
  coupang: {
    headers: ["주문번호", "수령자명", "택배사", "운송장번호"],
    rows: [
      ["21100189144417", "박종금", "CJ대한통운", "6978-8423-7233"],
      ["21100189144932", "김철수", "CJ대한통운", "6978-8423-7301"],
      ["21100189145011", "박지원", "CJ대한통운", "6978-8423-7402"],
      ["21100189145128", "이연재", "CJ대한통운", "6978-8423-7558"],
      ["21100189145290", "정유진", "CJ대한통운", "6978-8423-7613"],
    ],
  },
  toss: {
    headers: ["주문ID", "받는분", "택배사코드", "송장번호"],
    rows: [
      ["TS-26050801", "이영희", "LOTTE",  "4520-1187-0034"],
      ["TS-26050802", "정수빈", "LOTTE",  "4520-1187-0089"],
      ["TS-26050803", "오민재", "CJGLS",  "6978-8423-7700"],
      ["TS-26050804", "한도윤", "HANJIN", "6011-2278-9999"],
    ],
  },
};

function PreviewModal({ open, platform, onClose }) {
  if (!open || !platform) return null;
  const data = PREVIEW_DATA[platform];
  const label = platform === "coupang" ? "쿠팡" : "토스";
  return (
    <>
      <div className="panel__backdrop" onClick={onClose}/>
      <div className="pmodal" role="dialog" aria-modal="true">
        <div className="pmodal__head">
          <div className="pmodal__headl">
            <div className="pmodal__title">{label} 운송장 파일 미리보기</div>
            <div className="pmodal__sub">상위 5건 미리보기 · 다운로드 시 전체 행이 포함됩니다</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="pmodal__body">
          <div className="ptable">
            <div className="ptable__head">
              <div className="ptable__num">#</div>
              {data.headers.map((h,i) => <div key={i} className="ptable__cell">{h}</div>)}
            </div>
            {data.rows.map((row, ri) => (
              <div key={ri} className="ptable__row">
                <div className="ptable__num">{ri+1}</div>
                {row.map((c, ci) => (
                  <div key={ci} className={`ptable__cell ${ci === 0 || ci === row.length - 1 ? "mono" : ""}`}>{c}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="pmodal__foot">
          <button className="ghostbtn" onClick={onClose}>닫기</button>
          <button className="btn btn--primary"><I.Download width="14" height="14"/> 엑셀 다운로드</button>
        </div>
      </div>
    </>
  );
}

// ───────── Footer CTA ─────────
function FooterCTA({ onAll }) {
  return (
    <div className="footcta">
      <div className="footcta__left">
        <span className="footcta__ok">
          <I.Check width="16" height="16"/>
          모든 다운로드를 마치면 작업건이 완료 상태로 변경돼요.
        </span>
      </div>
      <div className="footcta__right">
        <button className="ghostbtn"><I.ChevronLeft width="14" height="14"/> 이전</button>
        <button className="btn btn--primary" onClick={onAll}>
          <I.Download width="14" height="14"/> 두 파일 한번에 다운로드
        </button>
      </div>
    </div>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showUnmatched": true,
  "showCourierWarn": true,
  "previewOpen": null
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

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner">
          <div className="page-head">
            <div>
              <h1 className="page-head__title">플랫폼 파일 다운로드</h1>
              <p className="page-head__sub">매칭된 운송장을 쿠팡/토스 양식으로 변환해서 다운로드하세요. 다운받은 파일은 각 플랫폼 사이트에 그대로 업로드하면 돼요.</p>
            </div>
            <div className="page-head__right">
              <JobDropdown />
            </div>
          </div>

          <Tabs />

          {/* Warnings */}
          {t.showUnmatched && (
            <Banner tone="warn"
              title="미매칭 5건이 있어요"
              action={<a className="bannerlink" href="#">매칭 결과 탭에서 확인 <I.Chevron width="12" height="12"/></a>}>
              미매칭 건은 다운로드 파일에서 제외됩니다. 매칭을 마치고 다시 다운로드하면 더 정확해요.
            </Banner>
          )}
          {t.showCourierWarn && (
            <Banner tone="info"
              title="택배사 매핑이 안 된 건이 있어요"
              action={<a className="bannerlink" href="#">택배사 매핑 추가 <I.Chevron width="12" height="12"/></a>}>
              다운로드는 가능하지만, 매핑되지 않은 택배사 코드는 플랫폼에서 인식되지 않을 수 있어요.
            </Banner>
          )}

          {/* Note */}
          <div className="dlnote">
            <I.Check width="14" height="14"/>
            <span>매칭된 운송장만 다운로드 파일에 포함됩니다.</span>
          </div>

          {/* Cards */}
          <section className="dlrow">
            <DownloadCard
              platform="coupang"
              name="쿠팡 운송장 파일"
              matched={120}
              unmatched={3}
              onPreview={() => t.set("previewOpen", "coupang")}
              onDownload={() => {}}
            />
            <DownloadCard
              platform="toss"
              name="토스 운송장 파일"
              matched={30}
              unmatched={2}
              onPreview={() => t.set("previewOpen", "toss")}
              onDownload={() => {}}
            />
          </section>

          {/* Guide */}
          <UploadGuide/>

        </div>
        <FooterCTA onAll={() => {}}/>
      </main>

      <PreviewModal open={!!t.previewOpen} platform={t.previewOpen}
        onClose={() => t.set("previewOpen", null)}/>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="경고 배너">
        <TweakToggle label="미매칭 건 경고" value={t.showUnmatched} onChange={v=>t.set("showUnmatched", v)}/>
        <TweakToggle label="택배사 매핑 경고" value={t.showCourierWarn} onChange={v=>t.set("showCourierWarn", v)}/>
      </TweakSection>
      <TweakSection label="모달">
        <TweakRadio label="미리보기" value={t.previewOpen || "none"}
          options={[
            { value: "none",    label: "닫음" },
            { value: "coupang", label: "쿠팡" },
            { value: "toss",    label: "토스" },
          ]}
          onChange={v => t.set("previewOpen", v === "none" ? null : v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
