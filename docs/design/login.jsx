const { useState } = React;

const I = {
  Eye: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>),
  EyeOff: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 3l18 18M10.6 5.1A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  Mail: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  Lock: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6"/></svg>),
};

function Logo() {
  return (
    <div className="loginlogo">
      <svg viewBox="0 0 28 28" width="28" height="28">
        <path d="M3 7c5 0 5 14 9 14s4-14 9-14" stroke="#3182F6" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
        <circle cx="23" cy="6" r="2.4" fill="#3182F6"/>
      </svg>
      <span className="loginlogo__text">WithLab</span>
    </div>
  );
}

function App() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);

  const can = email.trim() && pw.length >= 4;

  return (
    <div className="loginpage">
      <div className="loginpage__bg">
        <div className="lblob lblob--1"/>
        <div className="lblob lblob--2"/>
      </div>

      <div className="loginpage__inner">
        <div className="logincard">
          <div className="logincard__brand">
            <Logo/>
            <div className="logincard__sub">과일 발주 관리 시스템</div>
          </div>

          <div className="logincard__welcome">
            <div className="logincard__title">다시 만나서 반가워요</div>
            <div className="logincard__hint">계정 정보를 입력하고 로그인해 주세요.</div>
          </div>

          <form className="lform" onSubmit={(e) => e.preventDefault()}>
            <label className="lfield">
              <span className="lfield__lbl">이메일</span>
              <div className="lfield__ipt">
                <I.Mail width="16" height="16" color="#8B95A1"/>
                <input type="email" placeholder="name@withlab.kr"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoFocus/>
              </div>
            </label>

            <label className="lfield">
              <span className="lfield__lbl">
                비밀번호
                <a href="#" className="lfield__link">비밀번호를 잊으셨나요?</a>
              </span>
              <div className="lfield__ipt">
                <I.Lock width="16" height="16" color="#8B95A1"/>
                <input type={show ? "text" : "password"} placeholder="••••••••"
                  value={pw} onChange={(e) => setPw(e.target.value)}/>
                <button type="button" className="lfield__toggle"
                  onClick={() => setShow(s => !s)} aria-label={show ? "숨기기" : "보기"}>
                  {show ? <I.EyeOff width="16" height="16"/> : <I.Eye width="16" height="16"/>}
                </button>
              </div>
            </label>

            <label className="lcheck">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}/>
              <span className="lcheck__box">
                {remember && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="m5 12 5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="lcheck__text">로그인 상태 유지</span>
            </label>

            <button className="lbtn" type="submit" disabled={!can}>로그인</button>
          </form>

          <div className="logincard__divider"><span>또는</span></div>

          <button className="lbtn lbtn--ghost">
            SSO로 로그인
          </button>

          <div className="logincard__foot">
            <span>WithLab 계정이 없으신가요?</span>
            <a href="#">관리자에게 문의</a>
          </div>
        </div>

        <div className="loginpage__copy">
          © 2026 WithLab · v1.4.2 ·
          <a href="#"> 이용약관</a> ·
          <a href="#"> 개인정보처리방침</a>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
