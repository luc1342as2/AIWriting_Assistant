(function () {
  function apiBase() {
    return (window.API_BASE || "").replace(/\/$/, "");
  }
  function tr(key) {
    return window.I18N ? window.I18N.tr(key) : key;
  }

  function initPricingButtons() {
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
          const res = await fetch(apiBase() + "/api/create-checkout-session", {
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
          const statusEl = document.getElementById("membership-status");
          if (statusEl) {
            statusEl.textContent = err.message || "Something went wrong";
            statusEl.className = "membership-status error";
            statusEl.classList.remove("hidden");
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
})();
