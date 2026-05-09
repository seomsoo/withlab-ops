const { useState, useMemo } = React;

// ───────── Icons ─────────
const Icon = {
  Doc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Truck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 6h12v10H3zM15 9h4l2 3v4h-6" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Map: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Form: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  Upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Alert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 8v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Dup: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevronDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/>
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

// ───────── Sidebar ─────────
const SIDEBAR = [
  { id: "order", label: "발주서", icon: Icon.Doc, badge: 12 },
  { id: "tracking", label: "운송장", icon: Icon.Truck },
  { id: "mapping", label: "매핑관리", icon: Icon.Map },
  { id: "form", label: "양식관리", icon: Icon.Form },
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
          const I = it.icon;
          return (
            <a key={it.id} className={`nav__item ${active ? "is-active" : ""}`} href="#">
              <I width="20" height="20" />
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
          <Icon.ChevronDown width="16" height="16" color="#8B95A1" />
        </div>
      </div>
    </aside>
  );
}

// ───────── Top bar ─────────
function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="crumb">
          <span className="crumb__muted">발주서</span>
          <Icon.Chevron width="14" height="14" color="#C9CDD2" />
          <span className="crumb__strong">2026-05-08 오전 발주</span>
          <span className="crumb__chip">진행중</span>
        </div>
        <div className="topbar__meta">
          작업건 <b>WL-260508-AM</b> · 마감 <b>14:00</b> · 담당자 박운영
        </div>
      </div>
      <div className="topbar__right">
        <button className="iconbtn" aria-label="검색"><Icon.Search width="18" height="18" /></button>
        <button className="iconbtn" aria-label="알림">
          <Icon.Bell width="18" height="18" />
          <span className="iconbtn__dot" />
        </button>
        <div className="topbar__divider" />
        <button className="ghostbtn">임시저장</button>
      </div>
    </header>
  );
}

// ───────── Tabs ─────────
function Tabs({ value }) {
  const tabs = [
    { id: "upload", label: "주문 업로드", step: "1" },
    { id: "assign", label: "공급처 배정", step: "2" },
    { id: "download", label: "발주서 다운로드", step: "3" },
  ];
  return (
    <div className="tabs">
      {tabs.map((t, i) => {
        const active = t.id === value;
        const done = i < tabs.findIndex(x => x.id === value);
        return (
          <button key={t.id} className={`tab ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
            <span className="tab__step">{done ? <Icon.Check width="14" height="14" /> : t.step}</span>
            <span className="tab__label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────── Upload card ─────────
function PlatformLogo({ kind }) {
  if (kind === "coupang") {
    return (
      <div className="plogo plogo--coupang">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M5 6h14l-2 12H7L5 6Z" fill="#fff" opacity=".95"/>
          <circle cx="10" cy="20" r="1.4" fill="#fff"/>
          <circle cx="16" cy="20" r="1.4" fill="#fff"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="plogo plogo--toss">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M6 5l5 14 3-9 4 7" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function UploadCard({ platform, name, state, file, count, onUpload, onReset }) {
  // states: empty | uploading | done | error
  return (
    <div className={`upcard upcard--${state}`}>
      <div className="upcard__head">
        <PlatformLogo kind={platform} />
        <div className="upcard__title">
          <div className="upcard__name">{name}</div>
          <div className="upcard__hint">.xlsx, .xls · 최대 10MB</div>
        </div>
        {state === "done" && (
          <span className="pill pill--success"><Icon.Check width="12" height="12"/> 업로드 완료</span>
        )}
        {state === "error" && (
          <span className="pill pill--error"><Icon.Alert width="12" height="12"/> 형식 오류</span>
        )}
      </div>

      {state === "empty" && (
        <button className="dropzone" onClick={onUpload}>
          <div className="dropzone__icon"><Icon.Upload width="22" height="22" /></div>
          <div className="dropzone__title">엑셀 파일을 끌어다 놓거나 클릭해서 업로드</div>
          <div className="dropzone__sub">{platform === "coupang" ? "쿠팡 WING > 주문관리 > 엑셀 다운로드" : "토스 셀러 > 주문 > 엑셀 일괄 다운로드"}</div>
          <span className="btn btn--ghost btn--sm">파일 선택</span>
        </button>
      )}

      {state === "uploading" && (
        <div className="dropzone dropzone--loading">
          <div className="dropzone__loader" />
          <div className="dropzone__title">파일 분석 중…</div>
          <div className="dropzone__sub">{file}</div>
        </div>
      )}

      {(state === "done" || state === "error") && (
        <div className="filerow">
          <div className="filerow__icon"><Icon.Doc width="20" height="20"/></div>
          <div className="filerow__meta">
            <div className="filerow__name">{file}</div>
            <div className="filerow__sub">
              {state === "done" ? `${count}건 인식 · 방금 전` : "헤더가 양식과 일치하지 않습니다"}
            </div>
          </div>
          <button className="linkbtn" onClick={onReset}>
            <Icon.Refresh width="14" height="14"/> 다시 업로드
          </button>
        </div>
      )}
    </div>
  );
}

// ───────── Summary ─────────
function Summary({ ok, err, dup, onShowErrors }) {
  const total = ok + err + dup;
  return (
    <section className="summary">
      <div className="summary__head">
        <div>
          <div className="summary__eyebrow">파싱 결과</div>
          <div className="summary__title">총 {total}건이 인식되었어요</div>
        </div>
        {err > 0 && (
          <button className="linkbtn linkbtn--strong" onClick={onShowErrors}>
            오류 내역 보기 <Icon.Chevron width="14" height="14"/>
          </button>
        )}
      </div>
      <div className="summary__grid">
        <SumCell tone="success" label="정상" value={ok} icon={<Icon.Check width="16" height="16"/>} />
        <SumCell tone="error"   label="오류" value={err} icon={<Icon.Alert width="16" height="16"/>} />
        <SumCell tone="warning" label="중복" value={dup} icon={<Icon.Dup width="16" height="16"/>} />
      </div>
    </section>
  );
}

function SumCell({ tone, label, value, icon }) {
  return (
    <div className={`sumcell sumcell--${tone}`}>
      <div className="sumcell__top">
        <span className="sumcell__icon">{icon}</span>
        <span className="sumcell__label">{label}</span>
      </div>
      <div className="sumcell__value">{value.toLocaleString()}<span>건</span></div>
    </div>
  );
}

// ───────── Orders Table ─────────
const ORDERS_FULL = [
  {
    platform: "coupang", id: "240508-A1029", status: "ok",
    product: "산지직송 성주 꿀참외 고당도 가정용",
    option: "1박스 특가혼합과 5kg",
    qty: 1, name: "김철수",
    addr: "서울시 강남구 테헤란로 123",
  },
  {
    platform: "toss", id: "TS-26050801", status: "ok",
    product: "성주 꿀참외, 가정용 참외",
    option: "1박스, 5kg",
    qty: 1, name: "이영희",
    addr: "경기도 수원시 영통구 원천동 589",
  },
  {
    platform: "coupang", id: "240508-A1031", status: "ok",
    product: "성주 꿀참외 선물용 프리미엄",
    option: "2.5kg 9~12과",
    qty: 2, name: "박지원",
    addr: "서울시 마포구 월드컵북로 396",
  },
  {
    platform: "toss", id: "TS-26050802", status: "dup",
    product: "성주 꿀참외, 가정용 참외",
    option: "1박스, 5kg",
    qty: 1, name: "이영희",
    addr: "경기도 수원시 영통구 원천동 589",
  },
  {
    platform: "coupang", id: "240508-A1042", status: "err",
    product: "샤인머스캣 2kg (주소 누락)",
    option: "프리미엄 2kg",
    qty: 1, name: "최민호",
    addr: "—",
  },
  {
    platform: "toss", id: "TS-26050803", status: "ok",
    product: "산청 단감 가정용",
    option: "5kg 25~30과",
    qty: 1, name: "정수빈",
    addr: "부산시 해운대구 우동 1402",
  },
];

function StatusDot({ status }) {
  const map = {
    ok:  { c: "#34C759", t: "정상" },
    dup: { c: "#FF9500", t: "중복" },
    err: { c: "#FF3B30", t: "오류" },
  }[status];
  return (
    <span className="sdot" title={map.t}>
      <span className="sdot__dot" style={{ background: map.c }} />
      {map.t}
    </span>
  );
}

function OrdersTable({ rows }) {
  return (
    <section className="tablecard">
      <div className="tablecard__head">
        <div>
          <div className="tablecard__title">업로드된 주문 <span className="muted">{rows.length}건</span></div>
          <div className="tablecard__sub">플랫폼별로 정렬됨 · 중복/오류는 다음 단계에서 처리할 수 있어요</div>
        </div>
        <div className="tablecard__tools">
          <div className="search">
            <Icon.Search width="16" height="16" color="#8B95A1"/>
            <input placeholder="주문번호, 수취인, 상품명으로 검색" />
          </div>
          <button className="ghostbtn ghostbtn--sm">필터<Icon.ChevronDown width="14" height="14"/></button>
        </div>
      </div>

      <div className="tbl">
        <div className="tbl__row tbl__row--head">
          <div className="c-status">상태</div>
          <div className="c-platform">플랫폼</div>
          <div className="c-id">주문번호</div>
          <div className="c-product">상품명 / 옵션</div>
          <div className="c-qty">수량</div>
          <div className="c-name">수취인</div>
          <div className="c-addr">주소</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`tbl__row ${r.status !== "ok" ? "is-flag" : ""}`}>
            <div className="c-status"><StatusDot status={r.status}/></div>
            <div className="c-platform">
              <PlatformLogo kind={r.platform} />
              <span className="muted">{r.platform === "coupang" ? "쿠팡" : "토스"}</span>
            </div>
            <div className="c-id mono">{r.id}</div>
            <div className="c-product">
              <div className="prod__name">{r.product}</div>
              <div className="prod__opt">{r.option}</div>
            </div>
            <div className="c-qty">
              <span className="qty">{r.qty}<span>개</span></span>
            </div>
            <div className="c-name">{r.name}</div>
            <div className={`c-addr ${r.addr === "—" ? "is-missing" : ""}`}>{r.addr}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────── Footer CTA ─────────
function FooterCTA({ canProceed, ok, err }) {
  return (
    <div className="footcta">
      <div className="footcta__left">
        {err > 0 ? (
          <span className="footcta__warn">
            <Icon.Alert width="16" height="16"/>
            오류 {err}건이 있어요. 그대로 진행하면 해당 건은 제외됩니다.
          </span>
        ) : (
          <span className="footcta__ok">
            <Icon.Check width="16" height="16"/>
            정상 {ok}건이 다음 단계로 넘어갑니다.
          </span>
        )}
      </div>
      <div className="footcta__right">
        <button className="ghostbtn">취소</button>
        <button className={`btn btn--primary ${!canProceed ? "is-disabled" : ""}`} disabled={!canProceed}>
          다음: 공급처 배정
          <Icon.Chevron width="16" height="16" />
        </button>
      </div>
    </div>
  );
}

// ───────── App ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "coupangState": "done",
  "tossState": "done",
  "showErrors": true,
  "density": "comfy"
}/*EDITMODE-END*/;

function App() {
  const t = useT(TWEAK_DEFAULTS);

  const coupangCount = 24;
  const tossCount = 18;

  const ok  = t.showErrors ? 39 : 42;
  const err = t.showErrors ? 2  : 0;
  const dup = 1;

  const rows = useMemo(() => {
    if (!t.showErrors) return ORDERS_FULL.filter(r => r.status !== "err");
    return ORDERS_FULL;
  }, [t.showErrors]);

  const bothUploaded = t.coupangState === "done" && t.tossState === "done";

  return (
    <div className={`app density--${t.density}`}>
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="main__inner">
          <div className="page-head">
            <div>
              <h1 className="page-head__title">발주서 작성</h1>
              <p className="page-head__sub">쿠팡/토스에서 받은 주문 엑셀을 업로드하면, 자동으로 매핑하고 공급처별 발주서를 만들어줘요.</p>
            </div>
          </div>

          <Tabs value="upload" />

          <div className="grid-2">
            <UploadCard
              platform="coupang"
              name="쿠팡 주문 엑셀"
              state={t.coupangState}
              file="coupang_orders_20260508_AM.xlsx"
              count={coupangCount}
              onUpload={() => t.set("coupangState","uploading")}
              onReset={() => t.set("coupangState","empty")}
            />
            <UploadCard
              platform="toss"
              name="토스 주문 엑셀"
              state={t.tossState}
              file="toss_orders_20260508_AM.xlsx"
              count={tossCount}
              onUpload={() => t.set("tossState","uploading")}
              onReset={() => t.set("tossState","empty")}
            />
          </div>

          {bothUploaded && (
            <Summary ok={ok} err={err} dup={dup} onShowErrors={() => {}}/>
          )}

          {bothUploaded && (
            <OrdersTable rows={rows} />
          )}

          {!bothUploaded && (
            <div className="emptystate">
              <div className="emptystate__title">두 플랫폼의 엑셀을 모두 업로드하면 주문 목록이 표시돼요</div>
              <div className="emptystate__sub">한쪽만 있어도 진행은 가능하지만, 누락 검증을 위해 함께 올리는 걸 권장해요.</div>
            </div>
          )}
        </div>

        <FooterCTA canProceed={bothUploaded} ok={ok} err={err}/>
      </main>
    </div>
  );
}

// ── Tweaks hook wrapper — proxy so components can read t.foo / call t.set(k,v) ──
function useT(defaults){
  const [s, setS] = window.useTweaks(defaults);
  return React.useMemo(() => new Proxy({}, {
    get(_, k){
      if (k === "set") return (key, val) => setS({ [key]: val });
      return s[k];
    }
  }), [s]);
}

// ── Tweaks UI ──
function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="업로드 상태">
        <TweakRadio label="쿠팡" value={t.coupangState}
          onChange={v=>t.set("coupangState", v)}
          options={[
            {value:"empty",label:"비어있음"},
            {value:"uploading",label:"분석중"},
            {value:"done",label:"완료"},
          ]}/>
        <TweakRadio label="토스" value={t.tossState}
          onChange={v=>t.set("tossState", v)}
          options={[
            {value:"empty",label:"비어있음"},
            {value:"uploading",label:"분석중"},
            {value:"done",label:"완료"},
          ]}/>
      </TweakSection>
      <TweakSection label="검증">
        <TweakToggle label="오류/중복 케이스 표시" value={t.showErrors} onChange={v=>t.set("showErrors", v)}/>
      </TweakSection>
      <TweakSection label="레이아웃">
        <TweakRadio label="밀도" value={t.density} onChange={v=>t.set("density", v)}
          options={[{value:"comfy",label:"넓게"},{value:"compact",label:"좁게"}]}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
