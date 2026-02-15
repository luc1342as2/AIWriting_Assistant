const STORAGE_KEYS = { editor: "ai-writing-editor", tone: "ai-writing-tone", terms: "ai-writing-terms-accepted", clientId: "ai-writing-client-id" };

function getClientId() {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.clientId);
    if (!id) {
      id = "cw_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.clientId, id);
    }
    return id;
  } catch (_) {
    return null;
  }
}

const editor = document.getElementById("editor");
const suggestion = document.getElementById("suggestion");
const status = document.getElementById("status");
const charCount = document.getElementById("char-count");
const btnComplete = document.getElementById("btn-complete");
const btnRewrite = document.getElementById("btn-rewrite");
const btnGrammar = document.getElementById("btn-grammar");
const btnSummarize = document.getElementById("btn-summarize");
const btnExpand = document.getElementById("btn-expand");
const btnBullets = document.getElementById("btn-bullets");
const btnSimplify = document.getElementById("btn-simplify");
const btnParaphrase = document.getElementById("btn-paraphrase");
const btnOutline = document.getElementById("btn-outline");
const toneSelect = document.getElementById("tone-select");

function setStatus(msg, type = "") {
  status.textContent = msg;
  status.className = "status " + type;
}

function setCharCount() {
  const n = editor.value.length;
  const tr = window.I18N ? window.I18N.tr : (k) => k;
  charCount.textContent = n === 1 ? `1 ${tr("charCountOne")}` : `${n} ${tr("charCount")}`;
}

function showSuggestion(text, hint = "Suggestion") {
  suggestion.innerHTML = `<span class="hint">${hint}</span>${escapeHtml(text)}`;
  suggestion.classList.remove("hidden");
}

function hideSuggestion() {
  suggestion.classList.add("hidden");
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function getSelectionOrFull() {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  if (start !== end) {
    return { text: editor.value.slice(start, end), start, end };
  }
  return { text: editor.value, start: 0, end: editor.value.length };
}

function apiBase() {
  return (window.API_BASE || "").replace(/\/$/, "");
}

function updatePlanBadge(plan, remaining) {
  const badge = document.getElementById("plan-badge");
  if (!badge) return;
  if (!plan) {
    badge.classList.add("hidden");
    badge.textContent = "";
    return;
  }
  badge.classList.remove("hidden");
  if (remaining === -1) {
    badge.textContent = plan + " " + (tr("plan") || "plan");
  } else {
    badge.textContent = `${plan}: ${remaining} ${tr("left") || "left"}`;
  }
}

async function fetchSubscriptionStatus() {
  try {
    const res = await fetch(`${apiBase()}/api/subscription-status`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (data.plan) updatePlanBadge(data.plan, data.remaining);
  } catch (_) {}
}

async function api(method, body) {
  const payload = { ...body, client_id: getClientId() };
  let res;
  try {
    res = await fetch(`${apiBase()}/api/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  } catch (err) {
    throw new Error("Network error — check connection and try again");
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned invalid response. Try again.");
  }
  if (!res.ok) {
    if (res.status === 429 && res.headers.get("X-Rate-Limit-Reached") === "free" && typeof window.Auth?.openRateLimitModal === "function") {
      window.Auth.openRateLimitModal();
    }
    throw new Error(data?.error || "Request failed");
  }
  const plan = res.headers.get("X-Subscription-Plan");
  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (plan) updatePlanBadge(plan, remaining != null ? parseInt(remaining, 10) : -1);
  return data;
}

function tr(key) { return window.I18N ? window.I18N.tr(key) : key; }

async function complete() {
  const text = editor.value.trim();
  if (!text) {
    setStatus(tr("typeText"));
    return;
  }
  setStatus(tr("suggesting"), "loading");
  hideSuggestion();
  setLoading(true);
  try {
    const { completion } = await api("complete", { text });
    if (completion) {
      showSuggestion(completion, tr("suggestedHint"));
      suggestion.onclick = () => {
        editor.value = text + " " + completion;
        editor.focus();
        hideSuggestion();
        setCharCount();
        setStatus(tr("inserted"), "success");
      };
      setStatus(tr("ready"));
    } else {
      setStatus(tr("noSuggestion"));
    }
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function rewrite() {
  const { text, start, end } = getSelectionOrFull();
  if (!text.trim()) {
    setStatus(tr("selectText"));
    return;
  }
  setStatus(tr("rewriting"), "loading");
  hideSuggestion();
  setLoading(true);
  try {
    const { text: rewritten } = await api("rewrite", {
      text,
      tone: toneSelect.value,
    });
    if (rewritten) {
      showSuggestion(rewritten, tr("rewrittenHint").replace("{tone}", tr(toneSelect.value)));
      suggestion.onclick = () => {
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        editor.value = before + rewritten + after;
        editor.focus();
        hideSuggestion();
        setCharCount();
        setStatus(tr("replaced"), "success");
      };
      setStatus(tr("ready"));
    } else {
      setStatus(tr("noResult"));
    }
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function fixGrammar() {
  await runTool("grammar", tr("fixing"), tr("corrected"));
}

async function summarize() {
  await runTool("summarize", tr("summarizing"), tr("summary"));
}

async function expand() {
  await runTool("expand", tr("expanding"), tr("expanded"));
}

async function bullets() {
  await runTool("bullets", tr("converting"), tr("converted"));
}

async function simplify() {
  await runTool("simplify", tr("simplifying"), tr("simplified"));
}

async function paraphrase() {
  await runTool("paraphrase", tr("paraphrasing"), tr("paraphrased"));
}

async function outline() {
  await runTool("outline", tr("creatingOutline"), tr("outlineHint"));
}

async function runTool(method, loadingMsg, hint) {
  const { text, start, end } = getSelectionOrFull();
  if (!text.trim()) {
    setStatus(tr("selectText"));
    return;
  }
  setStatus(loadingMsg, "loading");
  hideSuggestion();
  setLoading(true);
  try {
    const { text: result } = await api(method, { text });
    if (result) {
      showSuggestion(result, hint);
      suggestion.onclick = () => {
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        editor.value = before + result + after;
        editor.focus();
        hideSuggestion();
        setCharCount();
        setStatus(tr("applied"), "success");
      };
      setStatus(tr("ready"));
    } else {
      setStatus(tr("noResult"));
    }
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  const controls = [btnComplete, btnRewrite, btnGrammar, btnSummarize, btnExpand, btnBullets, btnSimplify, btnParaphrase, btnOutline, toneSelect];
  controls.forEach((el) => {
    if (el) el.disabled = isLoading;
  });
  if (toneSelect) toneSelect.size = 1;
}

btnComplete.addEventListener("click", () => complete());
btnRewrite.addEventListener("click", () => rewrite());
btnGrammar.addEventListener("click", () => fixGrammar());
btnSummarize.addEventListener("click", () => summarize());
btnExpand.addEventListener("click", () => expand());
btnBullets.addEventListener("click", () => bullets());
btnSimplify.addEventListener("click", () => simplify());
btnParaphrase.addEventListener("click", () => paraphrase());
btnOutline.addEventListener("click", () => outline());

toneSelect.addEventListener("mouseenter", () => {
  toneSelect.size = toneSelect.options.length;
});
toneSelect.addEventListener("mouseleave", () => {
  toneSelect.size = 1;
});

editor.addEventListener("input", () => {
  setCharCount();
  try { localStorage.setItem(STORAGE_KEYS.editor, editor.value); } catch (_) {}
});

toneSelect.addEventListener("change", () => {
  try { localStorage.setItem(STORAGE_KEYS.tone, toneSelect.value); } catch (_) {}
});

// Restore saved state on load
function restoreState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.editor);
    if (saved != null) {
      editor.value = saved;
    }
    const savedTone = localStorage.getItem(STORAGE_KEYS.tone);
    if (savedTone && Array.from(toneSelect.options).some((o) => o.value === savedTone)) {
      toneSelect.value = savedTone;
    }
    setCharCount();
  } catch (_) {}
}
restoreState();
fetchSubscriptionStatus();
window.onLangChange = () => setCharCount();

function initTermsPopup() {
  const overlay = document.getElementById("terms-overlay");
  const btnAccept = document.getElementById("btn-accept-terms");
  const btnDeny = document.getElementById("btn-deny-terms");
  if (!overlay || !btnAccept) return;
  try {
    if (localStorage.getItem(STORAGE_KEYS.terms) === "1") {
      document.documentElement.classList.add("terms-accepted");
      return;
    }
  } catch (_) {}
  btnAccept.addEventListener("click", () => {
    try { localStorage.setItem(STORAGE_KEYS.terms, "1"); } catch (_) {}
    document.documentElement.classList.add("terms-accepted");
  });
  btnDeny?.addEventListener("click", () => {
    const msg = document.getElementById("terms-deny-msg");
    if (msg) {
      msg.classList.remove("hidden");
    }
  });
}

initTermsPopup();

function initPricingButtons() {
  const btnFree = document.getElementById("btn-use-free");
  const editorSection = document.querySelector(".editor-section");
  const editor = document.getElementById("editor");
  const stripeHelp = document.querySelector(".stripe-help");

  btnFree?.addEventListener("click", () => {
    editorSection?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => editor?.focus(), 300);
  });

  document.querySelectorAll(".btn-plan[data-plan]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const plan = btn.dataset.plan;
      if (!plan) return;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = tr("loading");
      try {
        const res = await fetch(`${apiBase()}/api/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error("Server error. Please try again.");
        }
        if (!res.ok) throw new Error(data?.error || "Checkout failed");
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("No checkout URL received");
      } catch (err) {
        const msg = err.message || "Something went wrong";
        setStatus(msg, "error");
        editorSection?.scrollIntoView({ behavior: "smooth" });
        if (msg.includes("STRIPE") && stripeHelp) {
          stripeHelp.setAttribute("open", "");
        }
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPricingButtons);
} else {
  initPricingButtons();
}
