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
const toneSelect = document.getElementById("tone-select");

function setStatus(msg, type = "") {
  status.textContent = msg;
  status.className = "status " + type;
}

function setCharCount() {
  const n = editor.value.length;
  charCount.textContent = n === 1 ? "1 character" : `${n} characters`;
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

async function api(method, body) {
  const res = await fetch(`/api/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function complete() {
  const text = editor.value.trim();
  if (!text) {
    setStatus("Type some text first");
    return;
  }
  setStatus("Suggesting...", "loading");
  hideSuggestion();
  try {
    const { completion } = await api("complete", { text });
    if (completion) {
      showSuggestion(completion, "Suggested completion — click to insert");
      suggestion.onclick = () => {
        editor.value = text + " " + completion;
        editor.focus();
        hideSuggestion();
        setCharCount();
        setStatus("Inserted", "success");
      };
      setStatus("Ready");
    } else {
      setStatus("No suggestion");
    }
  } catch (err) {
    setStatus(err.message, "error");
  }
}

async function rewrite() {
  const { text, start, end } = getSelectionOrFull();
  if (!text.trim()) {
    setStatus("Select text or type something to rewrite");
    return;
  }
  setStatus("Rewriting...", "loading");
  hideSuggestion();
  try {
    const { text: rewritten } = await api("rewrite", {
      text,
      tone: toneSelect.value,
    });
    if (rewritten) {
      showSuggestion(rewritten, `Rewritten (${toneSelect.value}) — click to replace`);
      suggestion.onclick = () => {
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        editor.value = before + rewritten + after;
        editor.focus();
        hideSuggestion();
        setCharCount();
        setStatus("Replaced", "success");
      };
      setStatus("Ready");
    }
  } catch (err) {
    setStatus(err.message, "error");
  }
}

async function fixGrammar() {
  await runTool("grammar", "Fixing grammar...", "Corrected — click to replace");
}

async function summarize() {
  await runTool("summarize", "Summarizing...", "Summary — click to replace");
}

async function expand() {
  await runTool("expand", "Expanding...", "Expanded — click to replace");
}

async function bullets() {
  await runTool("bullets", "Converting...", "Converted — click to replace");
}

async function simplify() {
  await runTool("simplify", "Simplifying...", "Simplified — click to replace");
}

async function runTool(method, loadingMsg, hint) {
  const { text, start, end } = getSelectionOrFull();
  if (!text.trim()) {
    setStatus(`Select text or type something to ${method}`);
    return;
  }
  setStatus(loadingMsg, "loading");
  hideSuggestion();
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
        setStatus("Applied", "success");
      };
      setStatus("Ready");
    }
  } catch (err) {
    setStatus(err.message, "error");
  }
}

function setLoading(isLoading) {
  [btnComplete, btnRewrite, btnGrammar, btnSummarize, btnExpand, btnBullets, btnSimplify].forEach((b) => {
    b.disabled = isLoading;
  });
}

btnComplete.addEventListener("click", () => complete());
btnRewrite.addEventListener("click", () => rewrite());
btnGrammar.addEventListener("click", () => fixGrammar());
btnSummarize.addEventListener("click", () => summarize());
btnExpand.addEventListener("click", () => expand());
btnBullets.addEventListener("click", () => bullets());
btnSimplify.addEventListener("click", () => simplify());

toneSelect.addEventListener("mouseenter", () => {
  toneSelect.size = toneSelect.options.length;
});
toneSelect.addEventListener("mouseleave", () => {
  toneSelect.size = 1;
});

editor.addEventListener("input", setCharCount);

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
      btn.textContent = "Loading...";
      try {
        const res = await fetch("/api/create-checkout-session", {
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

setCharCount();
