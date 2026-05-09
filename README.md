# 📱 MobileMiner v3.0

A phone-adaptive crypto miner built in React. Detects your device specs, recommends the best coin, and sends earnings directly to your chosen wallet.

## Supported Wallets
| Wallet | Type | Coins |
|--------|------|-------|
| 👻 Phantom | Non-Custodial (Solana) | DUCO |
| ⬡ KuCoin | Exchange | XMR, ZEPH, DUCO |
| ◈ Bybit | Exchange | XMR, VRSC, DUCO |
| ɱ Monero Wallet | Non-Custodial | XMR |

## Supported Coins
- **Duino-Coin (DUCO)** — SHA1/Argon2 — any device
- **Verus (VRSC)** — VerusHash 2.1 — mid-range+
- **Monero (XMR)** — RandomX — flagship phones
- **Zephyr (ZEPH)** — RandomX — flagship phones

---

## Deploy on Render (Recommended)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Static Site
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**
6. Your live URL will be: `https://mobile-miner.onrender.com`

---

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Edit on Phone with Acode

1. Install [Acode](https://play.google.com/store/apps/details?id=com.foxdebug.acodefree) on Android
2. Install the **Git plugin** inside Acode
3. Clone this repo in Acode
4. Edit `src/App.jsx` to update the miner
5. Push to GitHub — Render auto-rebuilds

---

## Tech Stack
- React 18.3.1
- Vite 5.4.2
- Vanilla CSS (no UI library needed)
- Anthropic Claude API (AI recommendations)
