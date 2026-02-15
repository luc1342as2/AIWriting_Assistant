# AI Writing Assistant

A small editor that suggests completions and rewrites (tone, grammar) via the OpenAI API.

## Features

- **Complete** – Suggests the next few words or sentence
- **Rewrite** – Rewrites selected or full text in different tones (formal, casual, concise, elaborate)
- **Fix Grammar** – Corrects grammar, spelling, and clarity

## Setup

1. Install dependencies:
   ```bash
   cd AI-Writing-Assistant
   npm install
   ```

2. Add your API keys:
   ```bash
   copy .env.example .env
   ```
   Edit `.env` and set:
   - `OPENAI_API_KEY=sk-...` — from [OpenAI](https://platform.openai.com/api-keys)
   - `STRIPE_SECRET_KEY=sk_test_...` — from [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (for payments)

3. **To receive payments:** Create a [Stripe account](https://dashboard.stripe.com/register), add your bank account under **Settings → Payouts**, and use your live secret key in production. Stripe handles encryption and PCI compliance; card data never touches your server.

4. Start the server:
   ```bash
   npm start
   ```

5. Open http://localhost:3000

## Pricing

Plans: **Free** ($0), **Starter** ($6/mo), **Pro** ($12/mo), **Team** ($24/mo). Payments use Stripe Checkout — card details are encrypted and processed by Stripe. Payouts go to your connected bank account.

## Usage

- Type or paste text in the editor.
- Click **Complete** to get AI-suggested continuation; click the suggestion to insert it.
- Use the tone dropdown, then **Rewrite** to change tone; click the suggestion to replace.
- Click **Fix Grammar** to correct the selection or full text; click the suggestion to replace.
- You can select part of the text for Rewrite/Grammar to affect only the selection.
