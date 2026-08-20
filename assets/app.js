import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const configured = SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function setMessage(el, text, type="") {
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${type}`;
}

async function loadStats() {
  const ids = ["registeredCount","approvedCount","pendingCount"];
  if (!supabase) {
    ids.forEach(id => document.getElementById(id)?.replaceChildren(document.createTextNode("—")));
    return;
  }
  const [all, approved, pending] = await Promise.all([
    supabase.from("applications").select("*", {count:"exact", head:true}),
    supabase.from("applications").select("*", {count:"exact", head:true}).eq("status","approved"),
    supabase.from("applications").select("*", {count:"exact", head:true}).eq("status","pending")
  ]);
  document.getElementById("registeredCount")?.replaceChildren(document.createTextNode(all.count ?? 0));
  document.getElementById("approvedCount")?.replaceChildren(document.createTextNode(approved.count ?? 0));
  document.getElementById("pendingCount")?.replaceChildren(document.createTextNode(pending.count ?? 0));
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("formMessage");
    if (!supabase) {
      setMessage(msg, "Supabase is not configured yet. Add your public URL and anon key in assets/config.js.", "error");
      return;
    }

    const email = document.getElementById("email").value.trim().toLowerCase();
    const nickname = document.getElementById("nickname").value.trim();
    const contribution_types = [...document.querySelectorAll('input[name="contribution"]:checked')].map(x => x.value);

    if (!contribution_types.length) {
      setMessage(msg, "Please choose at least one contribution.", "error");
      return;
    }

    const { error } = await supabase.from("applications").insert({
      email, nickname, contribution_types, status: "pending"
    });

    if (error) {
      setMessage(msg, error.code === "23505" ? "An application with this email already exists." : error.message, "error");
      return;
    }

    registerForm.reset();
    setMessage(msg, `YOU'RE REGISTERED. We'll manually review ${email} and get back to you in about 6 hours. Stay tuned.`, "success");
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("loginMessage");
    if (!supabase) {
      setMessage(msg, "Supabase is not configured yet.", "error");
      return;
    }
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(msg, "Login failed. Check your details or wait until your application has been approved.", "error");
      return;
    }
    location.href = "/dashboard/";
  });
}

const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    location.href = "/";
  });
}

async function loadDashboard() {
  if (!document.getElementById("memberNickname")) return;
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = "/login/"; return; }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) { location.href = "/login/"; return; }

  document.getElementById("memberNickname").textContent = profile.nickname;
  document.getElementById("memberEmail").textContent = profile.email;
  document.getElementById("memberStatus").textContent = "APPROVED";
  document.getElementById("memberLine").textContent = `@${profile.username || profile.nickname}`;
}
loadDashboard();

const adminLoginForm = document.getElementById("adminLoginForm");
const ADMIN_USERNAME = "g1666136nadmin";
const ADMIN_PASSWORD = "codenamegray777";

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("adminUsername").value;
    const p = document.getElementById("adminPassword").value;
    const msg = document.getElementById("adminLoginMessage");
    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
      sessionStorage.setItem("grey_admin", "1");
      showAdmin();
    } else {
      setMessage(msg, "Invalid admin credentials.", "error");
    }
  });
}

document.getElementById("adminLogout")?.addEventListener("click", () => {
  sessionStorage.removeItem("grey_admin");
  location.reload();
});

async function showAdmin() {
  document.getElementById("adminLogin")?.classList.add("hidden");
  document.getElementById("adminPanel")?.classList.remove("hidden");
  await loadAdminApplications();
}
if (document.getElementById("adminPanel") && sessionStorage.getItem("grey_admin") === "1") showAdmin();

async function loadAdminApplications() {
  if (!supabase) {
    document.getElementById("applications").innerHTML = `<div class="empty">Configure Supabase first.</div>`;
    return;
  }
  const { data, error } = await supabase.from("applications").select("*").order("created_at", {ascending:false});
  if (error) {
    document.getElementById("applications").innerHTML = `<div class="empty">${error.message}</div>`;
    return;
  }

  const pending = data.filter(a => a.status === "pending");
  document.getElementById("adminRegistered").textContent = data.length;
  document.getElementById("adminApproved").textContent = data.filter(a => a.status === "approved").length;
  document.getElementById("adminPending").textContent = pending.length;

  const box = document.getElementById("applications");
  if (!data.length) {
    box.innerHTML = `<div class="empty">No applications yet.</div>`;
    return;
  }

  box.innerHTML = data.map(a => `
    <article class="application">
      <div class="application-top">
        <div>
          <div class="application-name">@${escapeHtml(a.nickname)}</div>
          <div class="application-email">${escapeHtml(a.email)}</div>
        </div>
        <strong>${escapeHtml(a.status.toUpperCase())}</strong>
      </div>
      <div class="pills">${(a.contribution_types || []).map(x => `<span class="pill">${escapeHtml(x)}</span>`).join("")}</div>
      <div class="muted">Applied ${new Date(a.created_at).toLocaleString()}</div>
      ${a.status === "pending" ? `
        <div class="application-actions">
          <button class="accept" data-action="approve" data-id="${a.id}">ACCEPT</button>
          <button class="reject" data-action="reject" data-id="${a.id}">REJECT</button>
        </div>` : ""}
    </article>
  `).join("");

  box.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => reviewApplication(btn.dataset.id, btn.dataset.action));
  });
}

async function reviewApplication(id, action) {
  if (!supabase) return;
  if (action === "approve") {
    const username = prompt("Enter the username for this approved member:");
    if (!username) return;
    const { data: application, error: fetchError } = await supabase.from("applications").select("*").eq("id", id).single();
    if (fetchError) return alert(fetchError.message);

    // This creates a profile row. Actual Supabase Auth account creation is intentionally
    // not performed from this browser because that would require a privileged server key.
    const { error } = await supabase.from("applications").update({
      status: "approved", reviewed_at: new Date().toISOString(), assigned_username: username
    }).eq("id", id);
    if (error) return alert(error.message);

    alert(`Approved. Username assigned: ${username}\\n\\nYou can now manually email the applicant.\\n\\nNOTE: create their Auth account through your secure Supabase/admin workflow before they log in.`);
  } else {
    const { error } = await supabase.from("applications").update({
      status: "rejected", reviewed_at: new Date().toISOString()
    }).eq("id", id);
    if (error) return alert(error.message);
  }
  await loadAdminApplications();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

loadStats();
