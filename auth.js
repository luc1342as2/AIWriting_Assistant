(function () {
  "use strict";
  const API_BASE = (window.API_BASE || "").replace(/\/$/, "");

  function tr(key) {
    return window.I18N ? window.I18N.tr(key) : key;
  }

  let currentUser = null;

  const el = (id) => document.getElementById(id);

  function showGuest() {
    const guest = el("auth-guest");
    const user = el("auth-user");
    if (guest) guest.classList.remove("hidden");
    if (user) user.classList.add("hidden");
  }

  function showUser(email) {
    const guest = el("auth-guest");
    const user = el("auth-user");
    const emailSpan = el("profile-email");
    const avatar = document.querySelector(".profile-avatar");
    if (guest) guest.classList.add("hidden");
    if (user) user.classList.remove("hidden");
    if (emailSpan) emailSpan.textContent = email || "";
    if (avatar) {
      const initial = (email || "").charAt(0).toUpperCase() || "?";
      avatar.textContent = initial;
      avatar.title = email || "";
    }
  }

  async function fetchUser() {
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      currentUser = data.user || null;
      if (currentUser) showUser(currentUser.email);
      else showGuest();
    } catch {
      showGuest();
    }
  }

  function closeAuthModal() {
    const overlay = el("auth-overlay");
    if (overlay) overlay.classList.add("hidden");
  }

  function openAuthModal(tab) {
    const overlay = el("auth-overlay");
    const title = el("auth-title");
    const form = el("auth-form");
    const confirmWrap = el("auth-confirm-wrap");
    const confirmInput = el("auth-confirm");
    const submitBtn = el("auth-submit");
    const errorEl = el("auth-error");
    const tabs = document.querySelectorAll(".auth-tab");
    if (!overlay) return;
    tab = tab || "login";
    tabs.forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    if (title) title.textContent = tr(tab === "login" ? "login" : "register");
    if (submitBtn) submitBtn.textContent = tr(tab === "login" ? "login" : "register");
    if (confirmWrap) confirmWrap.classList.toggle("hidden", tab !== "register");
    if (confirmInput) confirmInput.required = tab === "register";
    if (errorEl) {
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
    }
    overlay.classList.remove("hidden");
  }

  function setAuthError(msg) {
    const e = el("auth-error");
    if (e) {
      e.textContent = msg;
      e.classList.remove("hidden");
    }
  }

  let pending2FA = null;

  async function doLogin(email, password, totpCode) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, totpCode }),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");
    if (data.requires2FA) {
      pending2FA = { email, password };
      el("auth-overlay")?.classList.add("hidden");
      el("auth-2fa-overlay")?.classList.remove("hidden");
      el("auth-2fa-code")?.focus();
      return null;
    }
    return data;
  }

  async function doRegister(email, password) {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data;
  }

  function closeRateLimitModal() {
    const overlay = el("rate-limit-overlay");
    if (overlay) overlay.classList.add("hidden");
  }

  function openRateLimitModal() {
    const overlay = el("rate-limit-overlay");
    if (overlay) overlay.classList.remove("hidden");
  }

  function closeSettingsModal() {
    const overlay = el("settings-overlay");
    if (overlay) overlay.classList.add("hidden");
  }

  function openSettingsModal() {
    if (!currentUser) return;
    const emailSpan = el("settings-email");
    const emailBadge = el("settings-email-badge");
    if (emailSpan) emailSpan.textContent = currentUser.email;
    if (emailBadge) {
      emailBadge.textContent = currentUser.emailVerified ? "✓ " + tr("verified") : "";
      emailBadge.className = "verified-badge" + (currentUser.emailVerified ? " verified" : "");
    }
    const phoneInput = el("settings-phone");
    if (phoneInput) phoneInput.value = currentUser.phone || "";
    const verifyEmailStatus = el("verify-email-status");
    const btnRequestEmailCode = el("btn-request-email-code");
    if (verifyEmailStatus) verifyEmailStatus.textContent = currentUser.emailVerified ? "✓ " + tr("verified") : "";
    if (btnRequestEmailCode) btnRequestEmailCode.classList.toggle("hidden", !!currentUser.emailVerified);
    const verifyPhoneStatus = el("verify-phone-status");
    const btnRequestPhoneCode = el("btn-request-phone-code");
    if (verifyPhoneStatus) verifyPhoneStatus.textContent = currentUser.phoneVerified ? "✓ " + tr("verified") : "";
    if (btnRequestPhoneCode) btnRequestPhoneCode.classList.toggle("hidden", !!currentUser.phoneVerified);
    const verifyPhoneFlow = el("verify-phone-flow");
    if (verifyPhoneFlow) verifyPhoneFlow.classList.toggle("hidden", !currentUser.phone);
    const status2FA = el("settings-2fa-status");
    if (status2FA) status2FA.textContent = currentUser.totpEnabled ? tr("twoFactor") + " " + tr("verified") : "";
    const setup2FA = el("settings-2fa-setup");
    const setup2FABtn = el("btn-setup-2fa");
    const disable2FA = el("settings-2fa-disable");
    if (setup2FA) setup2FA.classList.add("hidden");
    if (setup2FABtn) setup2FABtn.classList.toggle("hidden", !!currentUser.totpEnabled);
    if (disable2FA) disable2FA.classList.toggle("hidden", !currentUser.totpEnabled);
    const overlay = el("settings-overlay");
    if (overlay) overlay.classList.remove("hidden");
  }

  async function doLogout() {
    await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
    currentUser = null;
    showGuest();
  }

  function toggleProfileDropdown() {
    const btn = el("btn-profile");
    const dd = el("profile-dropdown");
    if (!btn || !dd) return;
    const isOpen = dd.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen);
    dd.setAttribute("aria-hidden", !isOpen);
  }

  function init() {
    fetchUser();

    el("btn-login")?.addEventListener("click", () => openAuthModal("login"));
    el("btn-register")?.addEventListener("click", () => openAuthModal("register"));

    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => openAuthModal(tab.dataset.tab));
    });

    el("auth-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = el("auth-email")?.value?.trim() || "";
      const password = el("auth-password")?.value || "";
      const confirm = el("auth-confirm")?.value || "";
      const activeTab = document.querySelector(".auth-tab.active")?.dataset?.tab || "login";
      if (!email || !password) {
        setAuthError("Email and password are required");
        return;
      }
      if (activeTab === "register" && password !== confirm) {
        setAuthError("Passwords do not match");
        return;
      }
      if (activeTab === "register" && password.length < 6) {
        setAuthError("Password must be at least 6 characters");
        return;
      }
      try {
        if (activeTab === "register") {
          await doRegister(email, password);
          closeAuthModal();
          await fetchUser();
          closeRateLimitModal();
        } else {
          const result = await doLogin(email, password);
          if (result) {
            closeAuthModal();
            await fetchUser();
            closeRateLimitModal();
          }
        }
      } catch (err) {
        setAuthError(err.message || "Request failed");
      }
    });

    el("auth-2fa-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!pending2FA) return;
      const code = el("auth-2fa-code")?.value?.trim() || "";
      const errEl = el("auth-2fa-error");
      if (errEl) errEl.classList.add("hidden");
      if (!code || code.length !== 6) {
        if (errEl) { errEl.textContent = "Enter the 6-digit code from your app"; errEl.classList.remove("hidden"); }
        return;
      }
      try {
        const result = await doLogin(pending2FA.email, pending2FA.password, code);
        pending2FA = null;
        el("auth-2fa-overlay")?.classList.add("hidden");
        el("auth-2fa-code").value = "";
        if (result) {
          await fetchUser();
          closeRateLimitModal();
        }
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove("hidden"); }
      }
    });

    el("auth-close")?.addEventListener("click", closeAuthModal);
    el("auth-overlay")?.addEventListener("click", (e) => {
      if (e.target === el("auth-overlay")) closeAuthModal();
    });

    el("rate-limit-register")?.addEventListener("click", () => {
      closeRateLimitModal();
      openAuthModal("register");
    });
    el("rate-limit-login")?.addEventListener("click", () => {
      closeRateLimitModal();
      openAuthModal("login");
    });
    el("rate-limit-close")?.addEventListener("click", closeRateLimitModal);
    el("rate-limit-overlay")?.addEventListener("click", (e) => {
      if (e.target === el("rate-limit-overlay")) closeRateLimitModal();
    });

    el("btn-profile")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleProfileDropdown();
    });
    el("btn-settings")?.addEventListener("click", () => {
      toggleProfileDropdown();
      openSettingsModal();
    });
    el("btn-change-password")?.addEventListener("click", () => {
      toggleProfileDropdown();
      openSettingsModal();
      setTimeout(() => el("change-pw-current")?.focus(), 100);
    });
    el("btn-logout")?.addEventListener("click", async () => {
      toggleProfileDropdown();
      await doLogout();
    });

    el("change-email-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newEmail = el("change-email-new")?.value?.trim() || "";
      const password = el("change-email-password")?.value || "";
      const errEl = el("change-email-error");
      const okEl = el("change-email-success");
      if (errEl) { errEl.classList.add("hidden"); errEl.textContent = ""; }
      if (okEl) okEl.classList.add("hidden");
      if (!newEmail) { if (errEl) { errEl.textContent = "Enter new email"; errEl.classList.remove("hidden"); } return; }
      if (!password) { if (errEl) { errEl.textContent = "Password required"; errEl.classList.remove("hidden"); } return; }
      try {
        const res = await fetch(`${API_BASE}/api/change-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newEmail, password }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        currentUser = data.user;
        showUser(currentUser?.email);
        if (okEl) { okEl.textContent = tr("emailChanged"); okEl.classList.remove("hidden"); }
        el("change-email-new").value = "";
        el("change-email-password").value = "";
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove("hidden"); }
      }
    });

    el("btn-request-email-code")?.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_BASE}/api/verify/request-email`, { method: "POST", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        el("verify-email-flow")?.classList.remove("hidden");
      } catch (err) {
        alert(err.message);
      }
    });

    el("btn-verify-email")?.addEventListener("click", async () => {
      const code = el("verify-email-code")?.value?.trim() || "";
      try {
        const res = await fetch(`${API_BASE}/api/verify/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        await fetchUser();
        openSettingsModal();
      } catch (err) {
        alert(err.message);
      }
    });

    el("btn-request-phone-code")?.addEventListener("click", async () => {
      const phone = el("settings-phone")?.value?.trim() || "";
      try {
        const res = await fetch(`${API_BASE}/api/verify/request-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        await fetchUser();
        el("verify-phone-flow")?.classList.remove("hidden");
      } catch (err) {
        alert(err.message);
      }
    });

    el("btn-verify-phone")?.addEventListener("click", async () => {
      const code = el("verify-phone-code")?.value?.trim() || "";
      try {
        const res = await fetch(`${API_BASE}/api/verify/phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        await fetchUser();
        openSettingsModal();
      } catch (err) {
        alert(err.message);
      }
    });

    el("btn-setup-2fa")?.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_BASE}/api/2fa/setup`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        el("2fa-qr").src = data.qrDataUrl;
        el("2fa-secret").textContent = data.secret;
        el("settings-2fa-setup")?.classList.remove("hidden");
      } catch (err) {
        alert(err.message);
      }
    });

    el("btn-enable-2fa")?.addEventListener("click", async () => {
      const code = el("2fa-code")?.value?.trim() || "";
      try {
        const res = await fetch(`${API_BASE}/api/2fa/enable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        await fetchUser();
        openSettingsModal();
        el("settings-2fa-setup")?.classList.add("hidden");
        el("2fa-code").value = "";
      } catch (err) {
        alert(err.message);
      }
    });

    el("btn-disable-2fa")?.addEventListener("click", async () => {
      const code = el("2fa-disable-code")?.value?.trim() || "";
      const password = el("2fa-disable-password")?.value || "";
      try {
        const res = await fetch(`${API_BASE}/api/2fa/disable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, password }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        await fetchUser();
        openSettingsModal();
        el("2fa-disable-code").value = "";
        el("2fa-disable-password").value = "";
      } catch (err) {
        alert(err.message);
      }
    });

    el("change-password-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const current = el("change-pw-current")?.value || "";
      const newPw = el("change-pw-new")?.value || "";
      const confirm = el("change-pw-confirm")?.value || "";
      const errEl = el("change-pw-error");
      const okEl = el("change-pw-success");
      if (errEl) { errEl.classList.add("hidden"); errEl.textContent = ""; }
      if (okEl) okEl.classList.add("hidden");
      if (!current) { if (errEl) { errEl.textContent = tr("currentPassword") + " required"; errEl.classList.remove("hidden"); } return; }
      if (!newPw || newPw.length < 6) { if (errEl) { errEl.textContent = "New password must be at least 6 characters"; errEl.classList.remove("hidden"); } return; }
      if (newPw !== confirm) { if (errEl) { errEl.textContent = "Passwords do not match"; errEl.classList.remove("hidden"); } return; }
      try {
        const res = await fetch(`${API_BASE}/api/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed");
        if (okEl) { okEl.textContent = tr("passwordChanged"); okEl.classList.remove("hidden"); }
        el("change-pw-current").value = "";
        el("change-pw-new").value = "";
        el("change-pw-confirm").value = "";
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.classList.remove("hidden"); }
      }
    });

    el("settings-close")?.addEventListener("click", closeSettingsModal);
    el("settings-overlay")?.addEventListener("click", (e) => {
      if (e.target === el("settings-overlay")) closeSettingsModal();
    });

    document.addEventListener("click", (e) => {
      const dd = el("profile-dropdown");
      const authUser = el("auth-user");
      if (dd?.classList.contains("open") && authUser && !authUser.contains(e.target)) {
        dd.classList.remove("open");
        el("btn-profile")?.setAttribute("aria-expanded", "false");
        dd.setAttribute("aria-hidden", "true");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Auth = {
    openAuthModal,
    openRateLimitModal,
    closeRateLimitModal,
    refreshUser: fetchUser,
  };
})();
