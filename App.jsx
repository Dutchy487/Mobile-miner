import { useState, useEffect, useRef } from "react";

// ── WALLET PROVIDERS ──────────────────────────────────────────────────────────
const WALLET_PROVIDERS = [
  {
    id: "phantom",
    name: "Phantom",
    type: "Non-Custodial",
    network: "Solana",
    supportedCoins: ["duino"],
    color: "#ab9ff2",
    url: "https://phantom.app",
    icon: "👻",
    addressHint: "Solana address — 44 chars, base58",
    note: "DUCO receivable on Solana network. Mine DUCO → withdraw to Phantom via Duino-Coin Solana bridge.",
  },
  {
    id: "kucoin",
    name: "KuCoin",
    type: "Exchange",
    network: "Multi-chain",
    supportedCoins: ["monero", "zeph", "duino"],
    color: "#00a550",
    url: "https://www.kucoin.com",
    icon: "⬡",
    addressHint: "KuCoin app → Assets → Deposit → select coin → Copy address",
    note: "Copy your coin-specific deposit address from KuCoin. Mined coins land directly in your exchange account.",
  },
  {
    id: "bybit",
    name: "Bybit",
    type: "Exchange",
    network: "Multi-chain",
    supportedCoins: ["monero", "verus", "duino"],
    color: "#f7a600",
    url: "https://www.bybit.com",
    icon: "◈",
    addressHint: "Bybit app → Assets → Deposit → select coin → Copy address",
    note: "Copy your deposit address from Bybit for each coin. Trade or withdraw directly from the exchange.",
  },
  {
    id: "monero-wallet",
    name: "Monero Wallet",
    type: "Non-Custodial",
    network: "Monero",
    supportedCoins: ["monero"],
    color: "#ff6600",
    url: "https://www.getmonero.org/downloads",
    icon: "ɱ",
    addressHint: "XMR address — 95 chars, starts with '4' or '8'",
    note: "Most private option. Full control of your XMR. Download the official Monero GUI or CLI wallet.",
  },
];

// ── COINS ─────────────────────────────────────────────────────────────────────
const COINS = [
  {
    id: "duino",
    name: "Duino-Coin",
    symbol: "DUCO",
    algorithm: "SHA1 / Argon2",
    minTier: 0,
    color: "#f6c90e",
    pool: "server.duinocoin.com",
    regions: ["Global", "Africa", "Asia", "Europe", "Americas"],
    desc: "Lightest miner — any phone, any tier",
    hashBase: 1200,
    earningRate: 0.000004,
  },
  {
    id: "verus",
    name: "Verus Coin",
    symbol: "VRSC",
    algorithm: "VerusHash 2.1",
    minTier: 1,
    color: "#3165d4",
    pool: "luckpool.net:9172",
    regions: ["Global", "Europe", "Americas", "Asia", "Africa"],
    desc: "ASIC-resistant, CPU optimized",
    hashBase: 800,
    earningRate: 0.00001,
  },
  {
    id: "monero",
    name: "Monero",
    symbol: "XMR",
    algorithm: "RandomX",
    minTier: 2,
    color: "#ff6600",
    pool: "pool.supportxmr.com:3333",
    regions: ["Global", "Europe", "Americas", "Asia"],
    desc: "Best for flagship phones — private",
    hashBase: 420,
    earningRate: 0.000008,
  },
  {
    id: "zeph",
    name: "Zephyr",
    symbol: "ZEPH",
    algorithm: "RandomX",
    minTier: 2,
    color: "#00e5ff",
    pool: "pool.zephyrprotocol.com:3333",
    regions: ["Global", "Europe", "Americas"],
    desc: "RandomX variant — rising ecosystem",
    hashBase: 380,
    earningRate: 0.000005,
  },
];

const REGIONS = ["Global", "Africa", "Asia", "Europe", "Americas"];
const STEPS   = ["detect", "wallet-select", "coin-select", "address", "mine"];
const TIERS   = [
  { label: "Budget",    tier: 0 },
  { label: "Mid-Range", tier: 1 },
  { label: "Flagship",  tier: 2 },
];

// ── UTILS ─────────────────────────────────────────────────────────────────────
function detectSpecs() {
  const cores  = navigator.hardwareConcurrency || 4;
  const ram    = navigator.deviceMemory || 4;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const tier   = cores >= 8 && ram >= 8 ? 2 : cores >= 6 && ram >= 6 ? 1 : 0;
  return { cores, ram, mobile, tier };
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── PULSE COMPONENT ───────────────────────────────────────────────────────────
function PulseRing({ active }) {
  return (
    <div className={`pulse-wrap ${active ? "on" : ""}`}>
      <div className="pr r1" />
      <div className="pr r2" />
      <div className="pr r3" />
      <div className="core" />
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [specs,     setSpecs]     = useState(null);
  const [region,    setRegion]    = useState("Global");
  const [step,      setStep]      = useState("detect");
  const [provider,  setProvider]  = useState(null);
  const [coin,      setCoin]      = useState(null);
  const [addrInput, setAddrInput] = useState("");
  const [wallet,    setWallet]    = useState("");
  const [threads,   setThreads]   = useState(2);
  const [mining,    setMining]    = useState(false);
  const [hashrate,  setHashrate]  = useState(0);
  const [earnings,  setEarnings]  = useState(0);
  const [shares,    setShares]    = useState(0);
  const [temp,      setTemp]      = useState(38);
  const [log,       setLog]       = useState([]);
  const [aiRec,     setAiRec]     = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const intRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    const s = detectSpecs();
    setSpecs(s);
    setThreads(Math.min(s.cores, 4));
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useEffect(() => () => clearInterval(intRef.current), []);

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLog(p => [...p.slice(-24), { msg, type, time }]);
  };

  const availableCoins = specs && provider
    ? COINS.filter(c =>
        c.minTier <= specs.tier &&
        c.regions.includes(region) &&
        provider.supportedCoins.includes(c.id))
    : [];

  const startMining = () => {
    if (!wallet || !coin) return;
    setMining(true);
    setShares(0);
    setEarnings(0);
    addLog(`Initialising ${coin.name} miner…`, "info");
    setTimeout(() => addLog(`Pool: ${coin.pool}`, "success"), 700);
    setTimeout(() => addLog(`Wallet [${provider.name}]: ${wallet.slice(0, 14)}…`, "success"), 1300);
    setTimeout(() => addLog(`Threads: ${threads} | Algorithm: ${coin.algorithm}`, "info"), 1900);
    setTimeout(() => addLog(`⚡ Mining active`, "success"), 2500);
    intRef.current = setInterval(() => {
      const hr = Math.floor(coin.hashBase * (threads / 4) * (0.88 + Math.random() * 0.24));
      setHashrate(hr);
      setTemp(t => Math.min(74, t + Math.random() * 0.4));
      setShares(s => {
        const add = Math.random() > 0.18 ? 1 : 0;
        if (add) addLog(`Share accepted ✓`, "success");
        return s + add;
      });
      setEarnings(e => e + coin.earningRate);
    }, 3000);
  };

  const stopMining = () => {
    clearInterval(intRef.current);
    setMining(false);
    setHashrate(0);
    addLog("Mining paused.", "warn");
  };

  const fetchAI = async () => {
    if (!specs || !provider) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Mobile phone: ${specs.cores} CPU cores, ${specs.ram}GB RAM. Region: ${region}. Wallet: ${provider.name} (${provider.type}, network: ${provider.network}, supports: ${provider.supportedCoins.join(", ")}).
Available coins: ${availableCoins.map(c => `${c.name} (${c.algorithm})`).join(", ")}.
Give a direct 2-sentence recommendation on the best coin to mine with this specific wallet and why. Be practical.`
          }]
        })
      });
      const d = await res.json();
      setAiRec(d.content?.[0]?.text || "Could not load recommendation.");
    } catch {
      setAiRec("AI unavailable — please select manually.");
    }
    setAiLoading(false);
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #07090f; --bg2: #0c1220; --bg3: #111b2d;
          --border: #1b3354; --border2: #25456e;
          --accent: #00cfff; --green: #00ff9d; --warn: #ffaa00; --danger: #ff4455;
          --text: #c0daf0; --dim: #3d6080;
          --mono: 'Share Tech Mono', monospace;
          --display: 'Barlow Condensed', sans-serif;
        }
        body { background: var(--bg); }
        .app { background: var(--bg); color: var(--text); font-family: var(--display); min-height: 100vh; max-width: 480px; margin: 0 auto; padding-bottom: 80px; }

        /* HEADER */
        .hdr { background: linear-gradient(180deg,#040609,var(--bg)); border-bottom: 1px solid var(--border); padding: 16px 18px 12px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: var(--mono); font-size: 12px; letter-spacing: 3px; color: var(--accent); text-transform: uppercase; }
        .logo em { color: var(--green); font-style: normal; }
        .live-dot { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10px; color: var(--dim); }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dim); }
        .dot.on { background: var(--green); box-shadow: 0 0 8px var(--green); animation: blink 1.4s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* PROGRESS */
        .progress { display: flex; gap: 6px; padding: 14px 16px 0; }
        .prog-seg { flex: 1; height: 2px; border-radius: 2px; background: var(--border); transition: background .3s; }
        .prog-seg.done { background: var(--green); }
        .prog-seg.now  { background: var(--accent); }

        /* SECTIONS */
        .sec { margin: 14px 14px 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
        .sec-hdr { background: var(--bg3); border-bottom: 1px solid var(--border); padding: 9px 14px; font-size: 10px; letter-spacing: 2px; color: var(--accent); text-transform: uppercase; font-family: var(--mono); display: flex; align-items: center; gap: 8px; }
        .sec-hdr::before { content: ''; width: 3px; height: 11px; background: var(--accent); border-radius: 2px; flex-shrink: 0; }
        .sec-body { padding: 14px; }

        /* SPECS */
        .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .spec-box { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 10px 12px; }
        .spec-lbl { font-size: 9px; letter-spacing: 1.5px; color: var(--dim); font-family: var(--mono); margin-bottom: 3px; text-transform: uppercase; }
        .spec-val { font-size: 22px; font-weight: 800; color: var(--green); font-family: var(--mono); }
        .spec-unit { font-size: 11px; color: var(--dim); margin-left: 2px; }
        .tier-tag { display: inline-block; margin-top: 10px; padding: 3px 12px; border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-family: var(--mono); background: rgba(0,255,157,.1); border: 1px solid var(--green); color: var(--green); }

        /* REGION */
        .pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .pill { padding: 6px 13px; border-radius: 3px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--bg3); color: var(--dim); letter-spacing: .5px; transition: all .15s; font-family: var(--mono); }
        .pill.on { border-color: var(--accent); color: var(--accent); background: rgba(0,207,255,.07); }
        .pill:hover { border-color: var(--accent); color: var(--accent); }

        /* WALLET PROVIDER GRID */
        .prov-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .prov-card { border: 1px solid var(--border); border-radius: 6px; padding: 14px 10px; cursor: pointer; background: var(--bg3); transition: all .2s; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; }
        .prov-card:hover { border-color: var(--border2); transform: translateY(-1px); }
        .prov-icon { font-size: 26px; line-height: 1; }
        .prov-name { font-size: 17px; font-weight: 800; letter-spacing: .3px; }
        .prov-type { font-size: 9px; color: var(--dim); font-family: var(--mono); letter-spacing: 1px; text-transform: uppercase; }
        .prov-network { font-size: 11px; margin-top: 1px; font-family: var(--mono); }
        .prov-coins { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
        .prov-coin-tag { font-size: 9px; font-family: var(--mono); padding: 2px 6px; border-radius: 2px; border: 1px solid var(--border2); }
        .wallet-note { background: rgba(0,207,255,.05); border: 1px solid rgba(0,207,255,.15); border-radius: 4px; padding: 10px 12px; font-size: 12px; color: #6aafcc; margin-top: 10px; line-height: 1.6; font-family: var(--mono); }

        /* COINS */
        .coin-list { display: flex; flex-direction: column; gap: 9px; }
        .coin-card { border: 1px solid var(--border); border-radius: 5px; padding: 11px 13px; cursor: pointer; background: var(--bg3); transition: all .2s; display: flex; align-items: center; gap: 11px; }
        .coin-card:hover { border-color: var(--border2); }
        .coin-card.sel { border-color: var(--green); background: rgba(0,255,157,.04); }
        .coin-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
        .coin-info { flex: 1; }
        .coin-name { font-size: 16px; font-weight: 700; }
        .coin-algo { font-size: 11px; color: var(--dim); font-family: var(--mono); }
        .coin-desc { font-size: 12px; color: #5a92b0; margin-top: 2px; }
        .coin-sym { font-family: var(--mono); font-size: 12px; font-weight: 700; padding: 3px 7px; border-radius: 3px; border: 1px solid; flex-shrink: 0; }

        /* AI */
        .ai-box { background: rgba(0,207,255,.04); border: 1px solid rgba(0,207,255,.18); border-radius: 5px; padding: 11px 13px; font-size: 13px; line-height: 1.6; color: var(--text); margin-top: 10px; }
        .ai-tag { font-size: 9px; font-family: var(--mono); color: var(--accent); letter-spacing: 1.5px; display: block; margin-bottom: 5px; }

        /* ADDRESS */
        .addr-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-family: var(--mono); font-size: 12px; padding: 11px 13px; outline: none; transition: border .2s; resize: none; }
        .addr-input:focus { border-color: var(--accent); }
        .addr-input::placeholder { color: var(--dim); }
        .exch-warn { background: rgba(255,170,0,.07); border: 1px solid rgba(255,170,0,.2); border-radius: 4px; padding: 9px 12px; font-size: 12px; color: #c8900a; font-family: var(--mono); margin-bottom: 10px; line-height: 1.6; }

        /* THREADS */
        .thread-ctrl { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
        .t-btn { width: 36px; height: 36px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg3); color: var(--accent); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; font-family: var(--mono); }
        .t-btn:hover { border-color: var(--accent); background: rgba(0,207,255,.1); }
        .t-val { font-size: 30px; font-weight: 800; font-family: var(--mono); color: var(--green); min-width: 44px; text-align: center; }
        .t-hint { font-size: 11px; color: var(--dim); font-family: var(--mono); line-height: 1.6; white-space: pre-line; }

        /* BUTTONS */
        .btn { width: 100%; padding: 13px; border-radius: 4px; border: none; font-family: var(--display); font-size: 15px; font-weight: 800; letter-spacing: 1.5px; cursor: pointer; text-transform: uppercase; transition: all .18s; margin-top: 10px; }
        .btn-primary { background: linear-gradient(135deg,#009fc4,#00cfff); color: #040609; }
        .btn-primary:hover { opacity: .9; transform: translateY(-1px); }
        .btn-go  { background: linear-gradient(135deg,#00a865,#00ff9d); color: #040609; }
        .btn-stop { background: linear-gradient(135deg,#a00,#ff4455); color: #fff; }
        .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--dim); }
        .btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }
        .act-row { padding: 12px 14px 0; display: flex; gap: 9px; }
        .act-row .btn { margin-top: 0; flex: 1; }

        /* PULSE */
        .pulse-wrap { position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
        .pr { position: absolute; border-radius: 50%; border: 1px solid var(--dim); opacity: 0; }
        .pulse-wrap.on .pr { border-color: var(--green); animation: pout 2s infinite; }
        .pr.r1 { width: 100%; height: 100%; }
        .pr.r2 { width: 68%; height: 68%; animation-delay: .35s !important; }
        .pr.r3 { width: 38%; height: 38%; animation-delay: .7s !important; }
        @keyframes pout { 0%{transform:scale(.8);opacity:.8} 100%{transform:scale(1.3);opacity:0} }
        .core { width: 14px; height: 14px; border-radius: 50%; background: var(--dim); z-index: 1; }
        .pulse-wrap.on .core { background: var(--green); box-shadow: 0 0 14px var(--green); }

        /* STATS */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 11px; }
        .stat-box { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 10px 12px; }
        .stat-lbl { font-size: 9px; letter-spacing: 1.5px; color: var(--dim); font-family: var(--mono); margin-bottom: 3px; text-transform: uppercase; }
        .stat-val { font-size: 21px; font-weight: 800; font-family: var(--mono); }
        .c-blue{color:var(--accent)} .c-green{color:var(--green)} .c-warn{color:var(--warn)} .c-text{color:var(--text)}

        /* TEMP BAR */
        .tbar-wrap { margin-top: 8px; }
        .tbar-lbl { font-size: 9px; font-family: var(--mono); color: var(--dim); letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase; }
        .tbar-bg { background: var(--bg); border-radius: 2px; height: 4px; overflow: hidden; }
        .tbar-fill { height: 100%; border-radius: 2px; transition: width .6s, background .6s; }

        /* EARNINGS */
        .earn-big { text-align: center; padding: 14px 0 8px; }
        .earn-num { font-size: 34px; font-weight: 800; font-family: var(--mono); color: var(--green); }
        .earn-sub { font-size: 13px; color: var(--dim); font-family: var(--mono); margin-top: 2px; }

        /* INFO ROWS */
        .irow { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(27,51,84,.5); font-size: 13px; }
        .irow:last-child { border-bottom: none; }
        .ikey { color: var(--dim); font-family: var(--mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
        .ival { color: var(--text); font-weight: 600; }

        /* LOG */
        .log-box { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; height: 110px; overflow-y: auto; padding: 8px 10px; font-family: var(--mono); font-size: 11px; }
        .log-box::-webkit-scrollbar { width: 3px; }
        .log-box::-webkit-scrollbar-track { background: var(--bg); }
        .log-box::-webkit-scrollbar-thumb { background: var(--border); }
        .log-entry { display: flex; gap: 8px; margin-bottom: 3px; }
        .log-time { color: var(--dim); flex-shrink: 0; }
        .lm-info{color:var(--text)} .lm-success{color:var(--green)} .lm-warn{color:var(--warn)}
      `}</style>

      {/* HEADER */}
      <div className="hdr">
        <div className="logo">MOBILE<em>MINER</em> v3.0</div>
        <div className="live-dot">
          <div className={`dot ${mining ? "on" : ""}`} />
          <span>{mining ? "LIVE" : "IDLE"}</span>
        </div>
      </div>

      {/* STEP PROGRESS */}
      <div className="progress">
        {STEPS.map((s, i) => (
          <div key={s} className={`prog-seg ${i < stepIdx ? "done" : i === stepIdx ? "now" : ""}`} />
        ))}
      </div>

      {/* ── STEP 1: DETECT ─────────────────────────────────────────────────── */}
      {step === "detect" && specs && (
        <>
          <div className="sec">
            <div className="sec-hdr">Device Detection</div>
            <div className="sec-body">
              <div className="specs-grid">
                <div className="spec-box">
                  <div className="spec-lbl">CPU Cores</div>
                  <div className="spec-val">{specs.cores}<span className="spec-unit">cores</span></div>
                </div>
                <div className="spec-box">
                  <div className="spec-lbl">RAM</div>
                  <div className="spec-val">{specs.ram}<span className="spec-unit">GB</span></div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="spec-lbl" style={{ marginBottom: 5 }}>Platform</div>
                <div style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--text)" }}>
                  {specs.mobile ? "📱 Mobile Device" : "🖥 Desktop / Tablet"}
                </div>
              </div>
              <div className="tier-tag">{TIERS[specs.tier]?.label} · Tier {specs.tier + 1}/3</div>
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 8, fontFamily: "var(--mono)" }}>
                {specs.tier === 0
                  ? "Supports: SHA1, Argon2 (Duino-Coin)"
                  : specs.tier === 1
                  ? "Supports: SHA1, VerusHash, Argon2"
                  : "Supports: All algorithms incl. RandomX"}
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-hdr">Your Region</div>
            <div className="sec-body">
              <div className="pills">
                {REGIONS.map(r => (
                  <div key={r} className={`pill ${region === r ? "on" : ""}`} onClick={() => setRegion(r)}>{r}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "12px 14px 0" }}>
            <button className="btn btn-primary" onClick={() => setStep("wallet-select")}>
              Continue → Choose Wallet
            </button>
          </div>
        </>
      )}

      {/* ── STEP 2: WALLET PROVIDER ────────────────────────────────────────── */}
      {step === "wallet-select" && (
        <>
          <div className="sec">
            <div className="sec-hdr">Choose Your Wallet</div>
            <div className="sec-body">
              <div style={{ fontSize: 12, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 12 }}>
                Select where mined crypto will be sent. Each wallet supports different coins.
              </div>
              <div className="prov-grid">
                {WALLET_PROVIDERS.map(p => (
                  <div
                    key={p.id}
                    className={`prov-card ${provider?.id === p.id ? "sel" : ""}`}
                    style={provider?.id === p.id
                      ? { borderColor: p.color, borderWidth: 2, background: `rgba(${hexToRgb(p.color)},.06)` }
                      : {}}
                    onClick={() => { setProvider(p); setAddrInput(""); setCoin(null); setAiRec(""); }}
                  >
                    <div className="prov-icon">{p.icon}</div>
                    <div className="prov-name" style={{ color: provider?.id === p.id ? p.color : "var(--text)" }}>
                      {p.name}
                    </div>
                    <div className="prov-type">{p.type}</div>
                    <div className="prov-network" style={{ color: p.color }}>{p.network}</div>
                    <div className="prov-coins">
                      {p.supportedCoins.map(cid => {
                        const c = COINS.find(x => x.id === cid);
                        return c ? (
                          <span key={cid} className="prov-coin-tag"
                            style={{ color: c.color, borderColor: c.color + "55" }}>
                            {c.symbol}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {provider && (
                <div className="wallet-note">
                  <span style={{ color: "var(--accent)", fontSize: 9, letterSpacing: "1.5px", fontFamily: "var(--mono)", display: "block", marginBottom: 4 }}>
                    ℹ {provider.name.toUpperCase()} INFO
                  </span>
                  {provider.note}
                  <div style={{ marginTop: 5, fontSize: 10, color: "var(--dim)" }}>
                    Address format: {provider.addressHint}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: "var(--accent)" }}>
                    🔗 {provider.url}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="act-row">
            <button className="btn btn-ghost" onClick={() => setStep("detect")}>← Back</button>
            <button className="btn btn-primary" disabled={!provider} onClick={() => setStep("coin-select")}>
              Select Coin →
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: COIN SELECT ─────────────────────────────────────────────── */}
      {step === "coin-select" && provider && specs && (
        <>
          <div className="sec">
            <div className="sec-hdr">AI Recommendation</div>
            <div className="sec-body">
              <div style={{ fontSize: 12, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 10 }}>
                {TIERS[specs.tier]?.label} · {specs.cores} cores · {region} · {provider.name}
              </div>
              <button className="btn btn-ghost" style={{ marginTop: 0, fontSize: 13, padding: "9px" }}
                onClick={fetchAI} disabled={aiLoading}>
                {aiLoading ? "Analysing…" : "⚡ Get AI Recommendation"}
              </button>
              {aiRec && (
                <div className="ai-box">
                  <span className="ai-tag">AI ANALYSIS — {provider.name} + {region}</span>
                  {aiRec}
                </div>
              )}
            </div>
          </div>

          <div className="sec">
            <div className="sec-hdr">Compatible Coins — {provider.name} × {region}</div>
            <div className="sec-body">
              {availableCoins.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--warn)", fontFamily: "var(--mono)" }}>
                  No coins match this wallet + region + device tier. Try changing region or wallet.
                </div>
              )}
              <div className="coin-list">
                {availableCoins.map(c => (
                  <div key={c.id} className={`coin-card ${coin?.id === c.id ? "sel" : ""}`}
                    onClick={() => setCoin(c)}>
                    <div className="coin-dot" style={{ background: c.color }} />
                    <div className="coin-info">
                      <div className="coin-name">{c.name}</div>
                      <div className="coin-algo">{c.algorithm}</div>
                      <div className="coin-desc">{c.desc}</div>
                    </div>
                    <div className="coin-sym" style={{ color: c.color, borderColor: c.color + "44" }}>{c.symbol}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="act-row">
            <button className="btn btn-ghost" onClick={() => { setCoin(null); setStep("wallet-select"); }}>← Back</button>
            <button className="btn btn-primary" disabled={!coin} onClick={() => setStep("address")}>
              Set Address →
            </button>
          </div>
        </>
      )}

      {/* ── STEP 4: WALLET ADDRESS ──────────────────────────────────────────── */}
      {step === "address" && provider && coin && (
        <>
          <div className="sec">
            <div className="sec-hdr">Configuration Summary</div>
            <div className="sec-body">
              <div className="irow"><span className="ikey">Wallet</span><span className="ival" style={{ color: provider.color }}>{provider.name} ({provider.type})</span></div>
              <div className="irow"><span className="ikey">Coin</span><span className="ival" style={{ color: coin.color }}>{coin.name} ({coin.symbol})</span></div>
              <div className="irow"><span className="ikey">Algorithm</span><span className="ival" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{coin.algorithm}</span></div>
              <div className="irow"><span className="ikey">Pool</span><span className="ival" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{coin.pool}</span></div>
              <div className="irow"><span className="ikey">Region</span><span className="ival">{region}</span></div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-hdr">{provider.name} Deposit Address</div>
            <div className="sec-body">
              <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)", marginBottom: 10 }}>
                {provider.addressHint}
              </div>
              {provider.type === "Exchange" && (
                <div className="exch-warn">
                  ⚠ Open {provider.url}<br />
                  Go to: Assets → Deposit → {coin.symbol} → Copy address
                </div>
              )}
              <textarea rows={2} className="addr-input"
                placeholder={`Paste your ${provider.name} ${coin.symbol} address here…`}
                value={addrInput}
                onChange={e => setAddrInput(e.target.value)}
              />
            </div>
          </div>

          <div className="sec">
            <div className="sec-hdr">Mining Threads</div>
            <div className="sec-body">
              <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--mono)" }}>
                Your device: {specs?.cores} cores available
              </div>
              <div className="thread-ctrl">
                <button className="t-btn" onClick={() => setThreads(t => Math.max(1, t - 1))}>−</button>
                <div style={{ textAlign: "center" }}>
                  <div className="t-val">{threads}</div>
                  <div style={{ fontSize: 10, color: "var(--dim)", fontFamily: "var(--mono)" }}>threads</div>
                </div>
                <button className="t-btn" onClick={() => setThreads(t => Math.min(specs?.cores || 4, t + 1))}>+</button>
                <div className="t-hint">
                  {threads <= 2 ? "🌿 Low heat\nBetter battery" : threads <= 4 ? "⚡ Balanced\nperformance" : "🔥 Max power\nHigh heat"}
                </div>
              </div>
            </div>
          </div>

          <div className="act-row">
            <button className="btn btn-ghost" onClick={() => setStep("coin-select")}>← Back</button>
            <button className="btn btn-go" disabled={!addrInput.trim()}
              onClick={() => { setWallet(addrInput.trim()); setStep("mine"); setTimeout(startMining, 200); }}>
              Start Mining ⚡
            </button>
          </div>
        </>
      )}

      {/* ── STEP 5: MINING DASHBOARD ────────────────────────────────────────── */}
      {step === "mine" && coin && provider && (
        <>
          <div className="sec">
            <div className="sec-hdr">Mining Status</div>
            <div className="sec-body">
              <PulseRing active={mining} />
              <div style={{ textAlign: "center", fontSize: 13, color: mining ? "var(--green)" : "var(--dim)", fontFamily: "var(--mono)", marginBottom: 12 }}>
                {mining ? `● MINING ${coin.symbol} → ${provider.name}` : "○ PAUSED"}
              </div>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-lbl">Hashrate</div>
                  <div className="stat-val c-blue">{mining ? `${hashrate} H/s` : "—"}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-lbl">Shares</div>
                  <div className="stat-val c-green">{shares}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-lbl">Threads</div>
                  <div className="stat-val c-text">{threads}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-lbl">Temp</div>
                  <div className={`stat-val ${temp > 65 ? "c-warn" : "c-text"}`}>{temp.toFixed(1)}°C</div>
                </div>
              </div>
              <div className="tbar-wrap">
                <div className="tbar-lbl">CPU Temperature</div>
                <div className="tbar-bg">
                  <div className="tbar-fill" style={{
                    width: `${Math.min(100, (temp / 80) * 100)}%`,
                    background: temp > 70 ? "#ff4455" : temp > 60 ? "#ffaa00" : "#00ff9d"
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-hdr">Earnings This Session</div>
            <div className="sec-body">
              <div className="earn-big">
                <div className="earn-num">{earnings.toFixed(6)}</div>
                <div className="earn-sub">{coin.symbol} → {provider.name}</div>
              </div>
              <div className="irow"><span className="ikey">Wallet</span><span className="ival" style={{ fontSize: 11, fontFamily: "var(--mono)", color: provider.color }}>{provider.name} · {wallet.slice(0, 16)}…</span></div>
              <div className="irow"><span className="ikey">Pool</span><span className="ival" style={{ fontSize: 11, fontFamily: "var(--mono)" }}>{coin.pool}</span></div>
              <div className="irow"><span className="ikey">Coin</span><span className="ival" style={{ color: coin.color }}>{coin.name} ({coin.symbol})</span></div>
              <div className="irow"><span className="ikey">Algorithm</span><span className="ival" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{coin.algorithm}</span></div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-hdr">Pool Log</div>
            <div className="sec-body" style={{ padding: "10px 14px" }}>
              <div className="log-box" ref={logRef}>
                {log.length === 0 && <div className="log-entry"><span className="lm-info">Initialising…</span></div>}
                {log.map((e, i) => (
                  <div className="log-entry" key={i}>
                    <span className="log-time">{e.time}</span>
                    <span className={`lm-${e.type}`}>{e.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="act-row">
            <button className="btn btn-ghost"
              onClick={() => { stopMining(); setCoin(null); setProvider(null); setAddrInput(""); setStep("wallet-select"); }}>
              ← Change
            </button>
            {mining
              ? <button className="btn btn-stop" onClick={stopMining}>Stop Mining</button>
              : <button className="btn btn-go" onClick={startMining}>Resume ⚡</button>
            }
          </div>
        </>
      )}
    </div>
  );
}
