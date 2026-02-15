import express from "express";
import cors from "cors";
import OpenAI from "openai";
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PLANS = {
  starter: { name: "Starter", price: 600, interval: "month" },   // $6/mo
  pro:     { name: "Pro", price: 1200, interval: "month" },       // $12/mo
  team:    { name: "Team", price: 2400, interval: "month" },     // $24/mo
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function getAIResponse(systemPrompt, userMessage) {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

app.post("/api/complete", async (req, res) => {
  try {
    const { text } = req.body;
    const systemPrompt = `You are a writing assistant. Complete the following text naturally. Add only the next few words or sentence to continue the thought. Do not repeat the input. Be concise.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ completion: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rewrite", async (req, res) => {
  try {
    const { text, tone } = req.body;
    const tonePrompts = {
      formal: "Rewrite in a formal, professional tone. Keep the same meaning.",
      casual: "Rewrite in a casual, friendly tone. Keep the same meaning.",
      concise: "Rewrite more concisely. Remove filler, keep the core message.",
      elaborate: "Rewrite with more detail and elaboration.",
    };
    const instruction = tonePrompts[tone] || tonePrompts.formal;
    const systemPrompt = `You are a writing assistant. ${instruction} Return only the rewritten text.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ text: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/grammar", async (req, res) => {
  try {
    const { text } = req.body;
    const systemPrompt = `You are a grammar and style editor. Fix any grammar, spelling, punctuation, and clarity issues. Preserve the original tone and meaning. Return only the corrected text.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ text: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    const systemPrompt = `You are a summarization assistant. Create a concise summary of the following text. Preserve the main ideas. Return only the summary, no preamble.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ text: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expand", async (req, res) => {
  try {
    const { text } = req.body;
    const systemPrompt = `You are a writing assistant. Expand the following text into a fuller, more detailed paragraph or two. Add substance and elaboration without changing the core meaning. Return only the expanded text.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ text: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bullets", async (req, res) => {
  try {
    const { text } = req.body;
    const systemPrompt = `You are a writing assistant. If the input looks like prose/paragraphs, convert it to bullet points. If it looks like bullet points or a list, convert it to flowing prose. Return only the converted text.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ text: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/simplify", async (req, res) => {
  try {
    const { text } = req.body;
    const systemPrompt = `You are a clarity editor. Rewrite the following text in simple, plain language. Use short sentences and common words. Make it easy for anyone to understand. Return only the simplified text.`;
    const result = await getAIResponse(systemPrompt, text || " ");
    res.json({ text: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      error: "Payments not configured. Add STRIPE_SECRET_KEY to .env",
    });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan } = req.body;
    const planConfig = PLANS[plan] || PLANS.starter;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `AI Writing Assistant — ${planConfig.name}`,
              description: `Monthly subscription to the ${planConfig.name} plan`,
            },
            unit_amount: planConfig.price,
            recurring: { interval: planConfig.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/#pricing`,
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message || "Checkout failed" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/success.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "success.html"));
});

app.listen(PORT, () => {
  console.log(`AI Writing Assistant running at http://localhost:${PORT}`);
});
