const { useState, useMemo, useRef, useEffect } = React;

const I = {
  Doc: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Truck: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 6h12v10H3zM15 9h4l2 3v4h-6" stroke="currentColor" strokeWidth="1.6"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Map: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.6"/></svg>),
  Form: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Check: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Chevron: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  ChevronDown: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Bell: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  X: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Excel: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="3" width="18" height="18" rx="2" fill="#107C41"/><path d="m8 8 8 8M16 8l-8 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  Upload: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 16V5M7 10l5-5 5 5M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Reload: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Sparkle: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="m6 6 2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Hash: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
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
  { id: "platform-form", label: "플랫폼 운송장 업로드 양식", count: 2 },
];

function SubNav() {
  return (
    <aside className="subnav">
      <div className="subnav__title">양식관리</div>
      <div className="subnav__sub">엑셀 양식의 컬럼을 시스템 필드와 연결해요</div>
      <nav className="subnav__list">
        {SUBMENU.map(s => (
          <a key={s.id} href="#" className={`subnav__item ${s.id === "platform-form" ? "is-active" : ""}`}>
            <span>{s.label}</span>
            <span className="subnav__count">{s.count}</span>
          </a>
        ))}
      </nav>
      <div className="subnav__tip">
        <div className="subnav__tip-title">💡 빈 양식만 등록하세요</div>
        <div className="subnav__tip-body">실제 데이터가 들어있지 않은 빈 양식 파일을 등록하면, 시스템이 운송장 정보를 채워서 출력해요.</div>
      </div>
    </aside>
  );
}

const PLATFORMS = {
  coupang: {
    id: "coupang", name: "쿠팡", subtitle: "Coupang 판매자센터 운송장 업로드 양식",
    accent: "#FF6F2D", chip: "platchip platchip--coupang",
    state: "registered",
    file: "쿠팡_운송장업로드양식_v2.xlsx",
    sheet: "Sheet1", header: 1, dataStart: 2, registeredAt: "2026-04-22",
    columns: {
      match: { num: 3, header: "주문번호" },
      courier: { num: 4, header: "택배사" },
      tracking: { num: 5, header: "운송장번호" },
    },
    statusCol: null,
    sample: ["판매자상품코드", "옵션", "주문번호", "택배사", "운송장번호", "발송일자"],
    matchCol: 2, courCol: 3, trkCol: 4,
  },
  toss: {
    id: "toss", name: "토스", subtitle: "토스 셀러센터 운송장 업로드 양식",
    accent: "#3182F6", chip: "platchip platchip--toss",
    state: "registered",
    file: "토스셀러_운송장양식.xlsx",
    sheet: "주문목록", header: 2, dataStart: 3, registeredAt: "2026-04-18",
    columns: {
      match: { num: 3, header: "주문상품번호" },
      courier: { num: 6, header: "택배사" },
      tracking: { num: 7, header: "송장번호" },
    },
    statusCol: { num: 4, header: "주문상태" },
    statusValue: "배송중",
    sample: ["판매자상품코드","옵션명","주문상품번호","주문상태","결제완료일","택배사","송장번호"],
    matchCol: 2, statusColIdx: 3, courCol: 5, trkCol: 6,
  },
};

function TopBar({ platform }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="crumb">
          <span className="crumb__muted">양식관리</span>
          <I.Chevron width="14" height="14" color="#C9CDD2" />
          <span className="crumb__strong">플랫폼 운송장 업로드 양식</span>
        </div>
        <div className="topbar__meta">
          쿠팡·토스 운송장 업로드용 빈 양식을 관리해요 · 마지막 수정 <b>2026-05-08</b>
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

function PlatformTabs({ value, onChange }) {
  const items = [
    { id: "coupang", label: "쿠팡", state: PLATFORMS.coupang.state },
    { id: "toss",    label: "토스", state: PLATFORMS.toss.state },
  ];
  return (
    <div className="ptabs">
      {items.map(it => (
        <button key={it.id}
          className={`ptab ${value === it.id ? "is-active" : ""}`}
          onClick={() => onChange(it.id)}>
          <span className={`platchip platchip--${it.id}`}>{it.label}</span>
          <span className="ptab__label">{it.label} 운송장 업로드 양식</span>
          <span className={`pill ${it.state === "registered" ? "pill--ok" : "pill--mute"}`}>
            <span className="pill__dot"/>
            {it.state === "registered" ? "등록됨" : "미등록"}
          </span>
        </button>
      ))}
    </div>
  );
}

function FormInfoCard({ p }) {
  const items = [
    { label: "시트명",        value: p.sheet, mono: true },
    { label: "헤더 행",       value: `${p.header}행` },
    { label: "데이터 시작 행", value: `${p.dataStart}행` },
    { label: "등록일",        value: p.registeredAt, mono: true },
  ];
  return (
    <div className="finfo">
      <div className="finfo__file">
        <I.Excel width="36" height="36"/>
        <div className="finfo__filecol">
          <div className="finfo__name">{p.file}</div>
          <div className="finfo__sub">엑셀 파일 · 마지막 업로드 {p.registeredAt}</div>
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

function ColumnPickerRow({ icon, role, desc, num, header, ord }) {
  return (
    <div className="cprow">
      <div className="cprow__icon">{icon}</div>
      <div className="cprow__textcol">
        <div className="cprow__role">{role}</div>
        <div className="cprow__desc">{desc}</div>
      </div>
      <div className="cprow__loc">
        <div className="cprow__hdr">{header}</div>
        <div className="cprow__pos">{ord}번째 컬럼 · #{num}</div>
      </div>
      <button className="textbtn">변경</button>
    </div>
  );
}

const ord = (n) => `${n}`;

function ColumnSetupCard({ p }) {
  return (
    <div className="cpcard">
      <div className="cpcard__head">
        <div>
          <div className="cpcard__title">컬럼 위치 설정</div>
          <div className="cpcard__sub">시스템이 운송장을 어느 컬럼에 채워 넣을지 알려주세요. 양식의 헤더명을 그대로 표시하고 있어요.</div>
        </div>
      </div>
      <div className="cpcard__body">
        <ColumnPickerRow
          icon={<span className="cpicon cpicon--match">🔗</span>}
          role="매칭키 컬럼"
          desc="시스템 발주와 매칭할 키 — 보통 주문번호/주문상품번호"
          num={p.columns.match.num} header={p.columns.match.header} ord={ord(p.columns.match.num)}/>
        <ColumnPickerRow
          icon={<span className="cpicon cpicon--cour">🚚</span>}
          role="택배사 컬럼"
          desc="택배사명을 적어 넣을 컬럼"
          num={p.columns.courier.num} header={p.columns.courier.header} ord={ord(p.columns.courier.num)}/>
        <ColumnPickerRow
          icon={<span className="cpicon cpicon--trk"><I.Hash width="16" height="16"/></span>}
          role="운송장번호 컬럼"
          desc="택배 송장번호를 채워 넣을 컬럼"
          num={p.columns.tracking.num} header={p.columns.tracking.header} ord={ord(p.columns.tracking.num)}/>
      </div>
    </div>
  );
}

function StatusCard({ p, statusValue, setStatusValue }) {
  return (
    <div className="cpcard cpcard--toss">
      <div className="cpcard__head">
        <div>
          <div className="cpcard__title">
            <span className="platchip platchip--toss">토스 전용</span>
            주문상태 자동 변경
          </div>
          <div className="cpcard__sub">토스는 운송장 업로드 시 주문상태도 같이 바꿔야 해요. 시스템이 아래 컬럼에 지정 값을 자동으로 넣어줍니다.</div>
        </div>
      </div>
      <div className="cpcard__body">
        <ColumnPickerRow
          icon={<span className="cpicon cpicon--status">📦</span>}
          role="주문상태 컬럼"
          desc="주문상태 값을 바꿀 컬럼"
          num={p.statusCol.num} header={p.statusCol.header} ord={ord(p.statusCol.num)}/>
        <div className="statval">
          <div className="statval__lbl">변경할 값</div>
          <input className="ipt" value={statusValue}
            onChange={e => setStatusValue(e.target.value)}
            placeholder="예: 배송중"/>
          <div className="statval__hint">토스에 업로드되는 모든 행의 주문상태가 이 값으로 채워져요.</div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ p, statusValue }) {
  return (
    <div className="ppreview">
      <div className="ppreview__head">
        <div className="ppreview__sheet">{p.sheet}</div>
        <div className="ppreview__title">양식 미리보기 — 시스템이 이렇게 채워서 출력해요</div>
      </div>
      <div className="ppreview__scroll">
        <table>
          <thead>
            <tr>
              <th className="prev-rownum"></th>
              {p.sample.map((h, i) => {
                const num = i + 1;
                let role = null;
                if (num === p.columns.match.num) role = "match";
                else if (num === p.columns.courier.num) role = "courier";
                else if (num === p.columns.tracking.num) role = "tracking";
                else if (p.statusCol && num === p.statusCol.num) role = "status";
                return (
                  <th key={i} className={role ? `is-mapped is-${role}` : ""}>
                    <div className="prev-th-num">{num}</div>
                    <div className="prev-th-name">{h}</div>
                    {role === "match"    && <div className="prev-tag prev-tag--match">매칭키</div>}
                    {role === "courier"  && <div className="prev-tag prev-tag--cour">택배사</div>}
                    {role === "tracking" && <div className="prev-tag prev-tag--trk">송장번호</div>}
                    {role === "status"   && <div className="prev-tag prev-tag--stat">주문상태</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[0,1,2].map(ri => (
              <tr key={ri}>
                <td className="prev-rownum">{ri + p.dataStart}</td>
                {p.sample.map((_, ci) => {
                  const num = ci + 1;
                  if (num === p.columns.match.num) {
                    const ids = p.id === "coupang"
                      ? ["20260508-00194","20260508-00195","20260508-00196"]
                      : ["TS-0508-0188-01","TS-0508-0188-02","TS-0508-0190-01"];
                    return <td key={ci} className="is-fill mono">{ids[ri]}</td>;
                  }
                  if (num === p.columns.courier.num) return <td key={ci} className="is-fill">{["CJ대한통운","한진택배","CJ대한통운"][ri]}</td>;
                  if (num === p.columns.tracking.num) return <td key={ci} className="is-fill mono">{["6912 0034 1182","4458 9921 0033","6912 0034 1185"][ri]}</td>;
                  if (p.statusCol && num === p.statusCol.num) return <td key={ci} className="is-fill is-status">{statusValue}</td>;
                  return <td key={ci} className="is-keep">·</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ppreview__legend">
        <span><span className="leg leg--fill"/> 시스템이 채우는 값</span>
        <span><span className="leg leg--keep"/> 양식 그대로 유지</span>
      </div>
    </div>
  );
}

function FormFooter({ onSave }) {
  return (
    <div className="fbar">
      <div className="fbar__hint">
        <I.Sparkle width="14" height="14" color="#3182F6"/>
        <span>저장하면 다음 운송장 출력부터 새 컬럼 위치가 적용됩니다.</span>
      </div>
      <div className="fbar__actions">
        <button className="ghostbtn">취소</button>
        <button className="btn btn--primary" onClick={onSave}>저장</button>
      </div>
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

function NativeSelect({ value, options, onChange, small }) {
  return (
    <div className={`nsel ${small ? "nsel--sm" : ""}`}>
      <select value={value || ""} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
      <I.ChevronDown width="14" height="14" color="#8B95A1"/>
    </div>
  );
}

function MissingForm({ stage, setStage, platformName }) {
  return (
    <div className="missing">
      <div className="missing__notice">
        <div className="missing__notice-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#E68900" strokeWidth="1.6"/>
            <path d="M12 8v5M12 16h.01" stroke="#E68900" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="missing__notice-title">등록된 양식이 없습니다.</div>
          <div className="missing__notice-sub">{platformName} 판매자센터에서 빈 운송장 양식을 다운로드해 등록해 주세요.</div>
        </div>
      </div>

      <div className="missing__steps">
        <Step n={1} label="파일 업로드" active={stage >= 0} done={stage > 0}/>
        <StepLine done={stage > 0}/>
        <Step n={2} label="시트·행 설정" active={stage >= 1} done={stage > 1}/>
        <StepLine done={stage > 1}/>
        <Step n={3} label="컬럼 설정" active={stage >= 2} done={false}/>
      </div>

      {stage === 0 && (
        <div className="dropzone">
          <div className="dropzone__icon"><I.Upload width="28" height="28" color="#3182F6"/></div>
          <div className="dropzone__title">엑셀 파일을 끌어다 놓으세요</div>
          <div className="dropzone__sub">.xlsx 형식 · 최대 10MB · 빈 양식만 등록하세요</div>
          <button className="btn btn--ghost" onClick={() => setStage(1)}>파일 선택</button>
          <div className="dropzone__hint">
            {platformName} 판매자센터 → 주문/배송 → 운송장 일괄등록 → 양식 다운로드
          </div>
        </div>
      )}

      {stage === 1 && (
        <div className="sheetcfg">
          <div className="sheetcfg__file">
            <I.Excel width="32" height="32"/>
            <div>
              <div className="sheetcfg__name">{platformName === "쿠팡" ? "쿠팡_운송장양식.xlsx" : "토스_운송장양식.xlsx"}</div>
              <div className="sheetcfg__sub">238KB · 방금 업로드됨</div>
            </div>
            <button className="textbtn" onClick={() => setStage(0)}>다시 선택</button>
          </div>
          <div className="sheetcfg__grid">
            <Field label="시트 선택">
              <NativeSelect value="Sheet1"
                options={[{v:"Sheet1",label:"Sheet1"},{v:"안내",label:"안내"}]}
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
            <button className="btn btn--primary" onClick={() => setStage(2)}>다음: 컬럼 설정 →</button>
          </div>
        </div>
      )}
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "platform": "coupang",
  "missing": false
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
  const [statusValue, setStatusValue] = useState("배송중");
  const p = PLATFORMS[t.platform] || PLATFORMS.coupang;

  return (
    <div className="app">
      <Sidebar />
      <main className="main main--wsub">
        <TopBar platform={p}/>
        <div className="main__split">
          <SubNav />
          <div className="main__inner main__inner--narrow">
            <div className="page-head">
              <div>
                <h1 className="page-head__title">플랫폼 운송장 업로드 양식</h1>
                <p className="page-head__sub">쿠팡·토스에 운송장을 업로드할 때 사용하는 빈 양식 파일을 등록해 주세요. 시스템이 이 양식을 베이스로 운송장 정보를 채워서 출력합니다.</p>
              </div>
            </div>

            <PlatformTabs value={t.platform} onChange={v => t.set("platform", v)}/>

            {!t.missing && (
              <>
                <FormInfoCard p={p}/>
                <ColumnSetupCard p={p}/>
                {p.id === "toss" && (
                  <StatusCard p={p} statusValue={statusValue} setStatusValue={setStatusValue}/>
                )}
                <PreviewCard p={p} statusValue={statusValue}/>
                <FormFooter onSave={() => {}}/>
              </>
            )}

            {t.missing && (
              <MissingForm stage={stage} setStage={setStage} platformName={p.name}/>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Panel(){
  const t = useT(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="화면 상태">
        <TweakRadio label="플랫폼" value={t.platform}
          options={[
            { value: "coupang", label: "쿠팡" },
            { value: "toss",    label: "토스" },
          ]}
          onChange={v => t.set("platform", v)}/>
        <TweakToggle label="양식 미등록 상태" value={t.missing} onChange={v => t.set("missing", v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App/><Panel/></>);
