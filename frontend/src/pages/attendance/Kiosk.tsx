import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../../api/client';

const kioskMark = (username: string, password: string) =>
  apiClient.post('/public/attendance/kiosk-mark', { username, password }).then(r => r.data);

const logos = ['/logos/ps-icon.png', '/logos/vt-icon.png', '/logos/rt-icon.png', '/logos/as-icon.png'];

export default function Kiosk() {
  const [time, setTime] = useState(dayjs());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logoIdx, setLogoIdx] = useState(0);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setInterval(() => setTime(dayjs()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setLogoIdx(i => (i + 1) % logos.length), 3000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (result) { const t = setTimeout(() => { setResult(null); setUsername(''); setPassword(''); usernameRef.current?.focus(); }, 6000); return () => clearTimeout(t); }
  }, [result]);
  useEffect(() => { usernameRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const res = await kioskMark(username, password);
      if (res.status === 'error') message.error(res.message);
      else setResult(res);
    } catch { message.error('Connection failed'); }
    setLoading(false);
  };

  const h = time.format('HH'), m = time.format('mm'), s = time.format('ss');

  return (
    <div className="kiosk-root">

      {/* ── LAYERED BACKGROUND ── */}
      {/* Layer 1: Tech network image */}
      <div className="bg-image" />

      {/* Layer 2: Video overlay */}
      <video autoPlay muted loop playsInline className="bg-video">
        <source src="/videos/bg1.mp4" type="video/mp4" />
      </video>

      {/* Layer 3: Dark gradient overlay */}
      <div className="bg-overlay" />

      {/* Layer 4: Animated effects */}
      <div className="bg-effects">
        <div className="scanline" />
        <div className="aurora a1" />
        <div className="aurora a2" />
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
            animationDuration: `${6 + Math.random() * 14}s`,
            animationDelay: `${Math.random() * 8}s`,
          }} />
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="kiosk-content">

        {/* Banner */}
        <div className="banner">
          <img src="/images/ams-banner.jpg" alt="AMS" className="banner-img" />
          <div className="banner-overlay" />
        </div>

        {/* Logo carousel strip */}
        <div className="logo-strip">
          <div className="logo-carousel">
            {logos.map((logo, i) => (
              <img key={i} src={logo} alt="" className={`carousel-logo ${i === logoIdx ? 'active' : ''}`} />
            ))}
          </div>
          <div className="strip-text">ATTENDANCE MANAGEMENT SYSTEM</div>
          <div className="logo-carousel">
            {logos.map((logo, i) => (
              <img key={`r${i}`} src={logo} alt="" className={`carousel-logo ${i === (logoIdx + 2) % logos.length ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="kiosk-main">
          {!result ? (
            <div className="form-area">
              {/* Left: Fingerprint + Clock */}
              <div className="left-panel">
                <img src="/images/fingerprint.gif" alt="" className="fingerprint" />
                <div className="clock-wrap">
                  <div className="clock-time">
                    <span className="digit">{h}</span>
                    <span className="sep">:</span>
                    <span className="digit">{m}</span>
                    <span className="sep">:</span>
                    <span className="digit">{s}</span>
                  </div>
                  <div className="clock-date">{time.format('dddd, DD MMMM YYYY')}</div>
                </div>
              </div>

              {/* Right: Login form */}
              <div className="right-panel">
                <div className="glass-card">
                  <div className="card-top-glow" />
                  <h2 className="card-title">MARK ATTENDANCE</h2>
                  <p className="card-sub">Enter credentials to check in or out</p>
                  <form onSubmit={handleSubmit}>
                    <div className="field">
                      <div className="field-icon">👤</div>
                      <input ref={usernameRef} type="text" placeholder="Username" value={username}
                        onChange={e => setUsername(e.target.value)} autoComplete="off" />
                    </div>
                    <div className="field">
                      <div className="field-icon">🔒</div>
                      <input type="password" placeholder="Password" value={password}
                        onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading} className={`mark-btn ${loading ? 'loading' : ''}`}>
                      {loading ? '⏳ Verifying...' : '⚡ SUBMIT'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* ── RESULT ── */
            <div className="result-area">
              <div className={`result-circle ${result.status}`}>
                <span className="check-icon">✓</span>
                <div className="ring-pulse" />
                <div className="ring-pulse delay" />
              </div>

              <div className="result-status">
                {result.status === 'checkin' ? 'CHECKED IN SUCCESSFULLY' : 'CHECKED OUT SUCCESSFULLY'}
              </div>
              <div className="result-user">{result.user?.name}</div>

              <div className="result-message">
                {result.status === 'checkin' ? (
                  <div className="msg-main">Welcome. Have a productive day.</div>
                ) : (
                  <div className="msg-main">Thank you. Have a safe journey.</div>
                )}
              </div>

              <div className="result-times-row">
                {result.checkinTime && (
                  <div className="t-block">
                    <div className="t-label">CHECK IN</div>
                    <div className="t-val green">{result.checkinTime}</div>
                  </div>
                )}
                {result.checkoutTime && (
                  <div className="t-block">
                    <div className="t-label">CHECK OUT</div>
                    <div className="t-val red">{result.checkoutTime}</div>
                  </div>
                )}
              </div>
              <div className="countdown"><div className="countdown-bar" /></div>
            </div>
          )}
        </div>

        <div className="kiosk-footer">UNIFIED PORTAL — ATTENDANCE MANAGEMENT SYSTEM</div>
      </div>

      <style>{`
        .kiosk-root { min-height:100vh; background:#000; overflow:hidden; position:relative; font-family:'Segoe UI',sans-serif; color:#fff; }

        /* ── BG LAYERS ── */
        .bg-image { position:absolute; inset:0; z-index:0; background:url('/images/bg-tech.jpg') center/cover no-repeat; opacity:0.5; }
        .bg-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; opacity:0.12; mix-blend-mode:screen; }
        .bg-overlay { position:absolute; inset:0; z-index:2; background:linear-gradient(180deg, rgba(0,8,20,0.7) 0%, rgba(0,15,40,0.85) 50%, rgba(0,5,15,0.95) 100%); }
        .bg-effects { position:absolute; inset:0; z-index:3; overflow:hidden; }

        .scanline { position:absolute; width:100%; height:2px; background:rgba(26,115,232,0.08); animation:scan 8s linear infinite; }
        .aurora { position:absolute; border-radius:50%; filter:blur(80px); opacity:0.1; animation:auroraMove 20s ease-in-out infinite; }
        .a1 { width:500px; height:500px; background:#ff6b35; top:-200px; right:-100px; }
        .a2 { width:600px; height:600px; background:#1a73e8; bottom:-250px; left:-150px; animation-delay:-8s; }
        .particle { position:absolute; background:#fff; border-radius:50%; animation:pFloat 10s ease-in-out infinite; opacity:0.25; }

        /* ── CONTENT ── */
        .kiosk-content { position:relative; z-index:4; min-height:100vh; display:flex; flex-direction:column; }

        /* Banner */
        .banner { position:relative; height:200px; overflow:hidden; }
        .banner-img { width:100%; height:100%; object-fit:cover; }
        .banner-overlay { position:absolute; inset:0; background:linear-gradient(180deg, transparent 40%, rgba(0,8,20,1) 100%); }

        /* Logo strip */
        .logo-strip {
          display:flex; align-items:center; justify-content:center; gap:20px;
          padding:8px 0; margin-top:-30px; position:relative;
          background:rgba(0,20,50,0.6); backdrop-filter:blur(10px);
          border-top:1px solid rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.05);
        }
        .logo-carousel { width:50px; height:40px; position:relative; }
        .carousel-logo { position:absolute; max-height:36px; transition:all 0.8s cubic-bezier(0.4,0,0.2,1); opacity:0; transform:scale(0.7); }
        .carousel-logo.active { opacity:1; transform:scale(1); }
        .strip-text { font-size:13px; letter-spacing:6px; color:rgba(255,255,255,0.4); font-weight:300; }

        /* Main */
        .kiosk-main { flex:1; display:flex; align-items:center; justify-content:center; padding:20px; }

        .form-area { display:flex; align-items:center; gap:60px; max-width:900px; width:100%; }

        /* Left panel */
        .left-panel { text-align:center; flex:1; }
        .fingerprint { width:160px; opacity:0.7; filter:drop-shadow(0 0 20px rgba(255,107,53,0.3)); margin-bottom:20px; }
        .clock-wrap { }
        .clock-time { font-family:monospace; font-size:52px; font-weight:100; letter-spacing:4px; text-shadow:0 0 30px rgba(255,107,53,0.3); }
        .digit { }
        .sep { color:#ff6b35; animation:blink 1s step-end infinite; }
        .clock-date { font-size:15px; color:rgba(255,255,255,0.35); margin-top:4px; letter-spacing:2px; font-weight:300; }

        /* Right panel */
        .right-panel { flex:1; max-width:380px; }
        .glass-card {
          position:relative; padding:32px 28px; border-radius:20px;
          background:rgba(255,255,255,0.03); backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.06);
          box-shadow:0 20px 60px rgba(0,0,0,0.5);
        }
        .card-top-glow { position:absolute; top:-1px; left:15%; right:15%; height:2px; background:linear-gradient(90deg,transparent,#ff6b35,transparent); border-radius:2px; }
        .card-title { text-align:center; font-size:16px; letter-spacing:4px; font-weight:600; margin-bottom:4px; color:rgba(255,255,255,0.9); }
        .card-sub { text-align:center; font-size:12px; color:rgba(255,255,255,0.2); margin-bottom:24px; letter-spacing:1px; }

        .field { position:relative; margin-bottom:14px; }
        .field-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:16px; opacity:0.35; }
        .field input {
          width:100%; padding:14px 14px 14px 44px; font-size:15px;
          border:1.5px solid rgba(255,255,255,0.08); border-radius:12px;
          background:rgba(0,0,0,0.4); color:#fff; outline:none; transition:all 0.3s;
        }
        .field input:focus { border-color:#ff6b35; box-shadow:0 0 16px rgba(255,107,53,0.12); }
        .field input::placeholder { color:rgba(255,255,255,0.2); }

        .mark-btn {
          width:100%; padding:14px; font-size:16px; font-weight:700; border:none; border-radius:12px;
          color:#fff; cursor:pointer; letter-spacing:3px; margin-top:6px;
          background:linear-gradient(135deg,#ff6b35,#e74c3c,#c0392b);
          box-shadow:0 8px 30px rgba(255,107,53,0.25); transition:all 0.3s;
        }
        .mark-btn:hover { transform:translateY(-2px); box-shadow:0 12px 40px rgba(255,107,53,0.35); }
        .mark-btn.loading { background:#333; box-shadow:none; cursor:not-allowed; }

        /* ── RESULT ── */
        .result-area { text-align:center; animation:resultIn 0.6s cubic-bezier(0.34,1.56,0.64,1); }
        .result-circle {
          width:150px; height:150px; border-radius:50%; margin:0 auto 24px;
          display:flex; align-items:center; justify-content:center; position:relative;
        }
        .result-circle.checkin { background:linear-gradient(135deg,#27ae60,#2ecc71); box-shadow:0 0 60px rgba(46,204,113,0.4); }
        .result-circle.checkout { background:linear-gradient(135deg,#e74c3c,#c0392b); box-shadow:0 0 60px rgba(231,76,60,0.4); }
        .check-icon { font-size:64px; z-index:1; }
        .ring-pulse { position:absolute; inset:-10px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); animation:ringGrow 2s ease-out infinite; }
        .ring-pulse.delay { animation-delay:1s; }

        .result-status { font-size:36px; font-weight:800; letter-spacing:5px; text-shadow:0 0 30px rgba(255,255,255,0.15); margin-bottom:6px; animation:slideUp 0.5s ease-out 0.2s both; }
        .result-user { font-size:24px; font-weight:200; color:rgba(255,255,255,0.5); margin-bottom:16px; animation:slideUp 0.5s ease-out 0.3s both; }

        /* Message */
        .result-message { margin-bottom:28px; animation:slideUp 0.6s ease-out 0.4s both; }
        .msg-main { font-size:16px; font-weight:300; color:rgba(255,255,255,0.45); letter-spacing:2px; }
        .result-times-row {
          display:inline-flex; gap:44px; padding:18px 40px; border-radius:16px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          backdrop-filter:blur(10px);
        }
        .t-label { font-size:10px; color:rgba(255,255,255,0.3); letter-spacing:3px; margin-bottom:3px; }
        .t-val { font-size:30px; font-weight:600; font-family:monospace; }
        .t-val.green { color:#2ecc71; text-shadow:0 0 20px rgba(46,204,113,0.3); }
        .t-val.red { color:#e74c3c; text-shadow:0 0 20px rgba(231,76,60,0.3); }
        .countdown { width:180px; height:3px; background:rgba(255,255,255,0.06); border-radius:2px; margin:24px auto 0; overflow:hidden; }
        .countdown-bar { height:100%; background:linear-gradient(90deg,#ff6b35,#e74c3c); border-radius:2px; animation:shrink 6s linear forwards; }

        .kiosk-footer { padding:12px; text-align:center; font-size:10px; color:rgba(255,255,255,0.08); letter-spacing:3px; }

        /* ── ANIMATIONS ── */
        @keyframes blink { 50% { opacity:0.2; } }
        @keyframes scan { 0% { top:-2px; } 100% { top:100%; } }
        @keyframes auroraMove { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(40px,-30px) scale(1.1);} }
        @keyframes pFloat { 0%,100%{transform:translateY(0);opacity:.2;} 50%{transform:translateY(-30px);opacity:.5;} }
        @keyframes ringGrow { 0%{transform:scale(1);opacity:.4;} 100%{transform:scale(1.6);opacity:0;} }
        @keyframes resultIn { from{opacity:0;transform:scale(.6) translateY(30px);} to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes shrink { from{width:100%;} to{width:0%;} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }

        input:-webkit-autofill { -webkit-box-shadow:0 0 0 1000px rgba(0,0,0,.9) inset !important; -webkit-text-fill-color:#fff !important; }

        @media (max-width:768px) {
          .banner { height:120px; }
          .form-area { flex-direction:column; gap:24px; }
          .fingerprint { width:100px; }
          .clock-time { font-size:36px; }
          .right-panel { max-width:100%; }
          .glass-card { padding:24px 20px; }
          .result-circle { width:110px; height:110px; }
          .check-icon { font-size:48px; }
          .result-status { font-size:26px; }
          .t-val { font-size:22px; }
        }
      `}</style>
    </div>
  );
}
