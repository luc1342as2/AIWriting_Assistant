# AI Writing Assistant

An AI-powered writing assistant with completions, rewrites, grammar fixes, summarization, and more.

## Features

- **Complete** – AI suggestions to finish your thought
- **Rewrite** – Change tone (formal, casual, concise, elaborate)
- **Fix Grammar** – Correct spelling, punctuation, clarity
- **Summarize** – Condense long text
- **Expand** – Elaborate on short ideas
- **Bullets** – Convert between prose and bullet points
- **Simplify** – Rewrite in plain language

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add API keys** — Copy `.env.example` to `.env` and set:
   - `OPENAI_API_KEY` — from [OpenAI](https://platform.openai.com/api-keys)
   - `STRIPE_SECRET_KEY` — from [Stripe](https://dashboard.stripe.com/apikeys) (for payments)

3. **Start locally**
   ```bash
   npm start
   ```
   Open http://localhost:3000

## Deployment

### Option A: Full app on Render (recommended)

1. Push your code to GitHub
2. Go to [Render](https://render.com) and sign in with GitHub
3. **New** → **Web Service** → Connect your repo
4. Render auto-detects Node.js. Add env vars: `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`
5. Deploy — your app runs at `https://your-app.onrender.com`

### Option B: Frontend on GitHub Pages + Backend on Render

1. **Deploy backend** to Render (same as Option A)

2. **Set API URL** — Edit `public/config.js`:
   ```javascript
   window.API_BASE = "https://your-app.onrender.com";
   ```

3. **Deploy frontend** to GitHub Pages:
   ```bash
   npm run deploy
   ```
   Site: https://luc1342as2.github.io/AIWriting_Assistant/

## Pricing

- **Free** — $0
- **Starter** — $6/mo
- **Pro** — $12/mo
- **Team** — $24/mo

Payments via Stripe. Add your bank account in [Stripe Dashboard → Payouts](https://dashboard.stripe.com/settings/payouts).
