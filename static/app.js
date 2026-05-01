// 🎨 Color Carnival — unified frontend controller
// Works with main.py backend for palettes, grid, and pressure

// ===================== CONFIG =====================
const API_BASE = ""; // same-origin for Flask
// 🧼 Sanitize any text input to prevent code or tags
// 🧼 Fully safe sanitization — blocks code, URLs, slashes, and weird symbols
// 🧼 Strong sanitization: remove slashes and unsafe content

const CC_PALETTES_KEY = "cc_local_palettes";

function restoreProgressFromLinkNow() {
  if (!window.location.hash.startsWith("#progress=")) return;

  try {
    const code = window.location.hash.replace("#progress=", "");
    const progress = JSON.parse(decodeURIComponent(escape(atob(code))));

    Object.keys(progress || {}).forEach((key) => {
      localStorage.setItem(key, progress[key]);
    });

    alert("Progress restored! 🎉");
    history.replaceState(null, "", window.location.pathname);
  } catch {
    alert("That progress link was invalid 💔");
  }
}

restoreProgressFromLinkNow();


function getAllLocalProgress() {
  const data = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);

  }

  return data;
}

function restoreAllLocalProgress(data) {
  Object.keys(data || {}).forEach((key) => {
    localStorage.setItem(key, data[key]);
  });
}


function encodeProgress(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeProgress(code) {
  return JSON.parse(decodeURIComponent(escape(atob(code))));
}

function getProgressData() {
  return {
    palettes: JSON.parse(localStorage.getItem(CC_PALETTES_KEY) || "[]"),
    theme: localStorage.getItem("cc_theme") || "strawberry"
  };
}

function restoreProgressData(data) {
  if (data.palettes) {
    localStorage.setItem(CC_PALETTES_KEY, JSON.stringify(data.palettes));
  }

  if (data.theme) {
    localStorage.setItem("cc_theme", data.theme);
  }
}




function getLocalPalettes() {
  return JSON.parse(localStorage.getItem(CC_PALETTES_KEY) || "[]");
}

function saveLocalPalettes(palettes) {
  localStorage.setItem(CC_PALETTES_KEY, JSON.stringify(palettes));
}

function sanitizeInput(text) {
  if (typeof text !== "string") return "";

  let clean = text;

  // 1️⃣ Strip HTML tags
  clean = clean.replace(/<[^>]*>/g, "");

  // 2️⃣ Block any script or JS-like content
  clean = clean.replace(/script|on\w+\s*=|javascript:/gi, "");

  // 3️⃣ Remove links (http, https, ftp, www)
  clean = clean.replace(/\b(?:https?|ftp|file):\/\/\S+/gi, "");
  clean = clean.replace(/\bwww\.\S+/gi, "");

  // 4️⃣ 🚫 Remove *all forward and backslashes* — even doubled ones
  clean = clean.replace(/[\\/]+/g, "");  // completely removes slashes

  // 5️⃣ Remove dangerous symbols and invisible characters
  clean = clean.replace(/[{}<>$]/g, "");
  clean = clean.replace(/[\u200B-\u200F\uFEFF]/g, "");

  // 6️⃣ Trim extra spaces
  return clean;
}
// =============== THEME HANDLER ===============
// Save the selected theme and apply it across pages
function applySavedTheme() {
  const saved = localStorage.getItem("cc_theme") || "strawberry";
  document.documentElement.setAttribute("data-theme", saved);
  const sel = document.getElementById("themeSelect");
  if (sel) sel.value = saved;
}

// When user changes dropdown, update theme live
function initThemeSelector() {
  const sel = document.getElementById("themeSelect");
  if (!sel) return;
  sel.addEventListener("change", () => {
    const val = sel.value || "strawberry";
    document.documentElement.setAttribute("data-theme", val);
    localStorage.setItem("cc_theme", val);
  });
}

// Apply theme immediately on page load
// 🔓 Global helper so the sign-in button works on mobile too
// 🔓 Global helper so the sign-in button works everywhere (mobile + desktop)
// Apply theme immediately on page load
function openAuthPopup() {
  const popup = document.getElementById("authPopup");
  if (!popup) return;

  popup.style.display = "flex";
  popup.style.zIndex = "10000";

  // lock background scroll while popup is open
  document.body.style.overflowY = "hidden";
  document.documentElement.style.overflowY = "hidden";
}

// expose it globally for the inline onclick in index.html
window.openAuthPopup = openAuthPopup;
document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
  initThemeSelector();
});

// 🔓 Global helper so the sign-in button works everywhere (mobile + desktop)


// ===================== ALERTS & CONFETTI =====================
let alertTimeout = null;

function showAlert(message, isSuccess = true) {
  const box = document.getElementById("alertBox");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("success", "error");
  box.classList.add(isSuccess ? "success" : "error");
  box.style.display = "block";
  clearTimeout(alertTimeout);
  alertTimeout = setTimeout(() => (box.style.display = "none"), 2500);
}

// ===================== FETCH WRAPPER =====================
async function fetchWithAuth(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // ✅ critical for cookies
  });
  return res;
}

// ===================== PALETTE PAGE =====================
async function initPalettePage() {
  // 🚨 Require login to use palette page
 
  const paletteSelect = document.getElementById("paletteSelect");
  const paletteInput = document.getElementById("paletteNameInput");
  const createPaletteBtn = document.getElementById("createPaletteBtn");
  const deletePaletteBtn = document.getElementById("deletePaletteBtn");
  const savedColors = document.getElementById("savedColors");

  if (!paletteSelect) return; // only run on palette.html

  // 🎨 Load palettes
 function loadPalettes(selectId = null) {
  const list = JSON.parse(localStorage.getItem("cc_local_palettes") || "[]");

  paletteSelect.innerHTML = "";

  if (!list.length) {
    const opt = document.createElement("option");
    opt.textContent = "— No palettes yet —";
    opt.value = "";
    paletteSelect.appendChild(opt);
    savedColors.innerHTML = "";
    return;
  }

  list.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    paletteSelect.appendChild(opt);
  });

  if (selectId) paletteSelect.value = selectId;
  else if (!paletteSelect.value) paletteSelect.value = list[list.length - 1].id;

  loadPaletteColors();
}

  // 💾 Create or select palette
  createPaletteBtn?.addEventListener("click", () => {
  let name = sanitizeInput(paletteInput.value.trim());
  if (!name) return showAlert("Enter a palette name 💕", false);

  const list = JSON.parse(localStorage.getItem("cc_local_palettes") || "[]");

  const newPalette = {
    id: Date.now(),
    name,
    colors: []
  };

  list.push(newPalette);
  localStorage.setItem("cc_local_palettes", JSON.stringify(list));

  showAlert("Palette saved locally! 🎉", true);
  paletteInput.value = "";
  loadPalettes(newPalette.id);
});

  // 🗑️ Delete palette
  deletePaletteBtn?.addEventListener("click", () => {
  const id = parseInt(paletteSelect.value || "0");
  if (!id) return showAlert("No palette selected", false);
  if (!confirm("Delete this palette?")) return;

  const list = JSON.parse(localStorage.getItem("cc_local_palettes") || "[]")
    .filter((p) => p.id !== id);

  localStorage.setItem("cc_local_palettes", JSON.stringify(list));

  showAlert("Palette deleted 🗑️", true);
  loadPalettes();
});

  // 🎨 Load palette colors
  async function loadPaletteColors() {
    const id = parseInt(paletteSelect.value || "0");
    savedColors.innerHTML = "";
    if (!id) return;
    const list = JSON.parse(localStorage.getItem("cc_local_palettes") || "[]");
    const pal = list.find((p) => p.id === id);

    if (!pal || !pal.colors) return;

    for (const c of pal.colors) {
  const div = document.createElement("div");
  div.className = "saved-color";

  // swatch
  const swatch = document.createElement("div");
  swatch.className = "swatch";
  swatch.style.background = c.hex || "#000";

  // name
  const nameP = document.createElement("p");
  const nameB = document.createElement("b");
  nameB.textContent = c.name || ""; // 🛡️ textContent = no code execution
  nameP.appendChild(nameB);

  // hex
  const hexP = document.createElement("p");
  hexP.textContent = c.hex || "";

  // rgb
  const rgbP = document.createElement("p");
  const r = c.rgb?.r ?? "?";
  const g = c.rgb?.g ?? "?";
  const b = c.rgb?.b ?? "?";
  rgbP.textContent = `rgb(${r}, ${g}, ${b})`;

  // delete button
  const btn = document.createElement("button");
  btn.textContent = "❌ Delete";
  btn.addEventListener("click", async () => {
    
    await fetchWithAuth(`/api/palettes/${id}/colors/${c.id}`, {
      method: "DELETE",
    });
    showAlert("Color deleted", true);
    await loadPalettes(false); // ✅ fully reload from backend
  });

  // assemble
  div.appendChild(swatch);
  div.appendChild(nameP);
  div.appendChild(hexP);
  div.appendChild(rgbP);
  div.appendChild(btn);

  savedColors.appendChild(div);
 }

}

  paletteSelect.addEventListener("change", loadPaletteColors);

  // Initialize on load
  loadPalettes(false);
}

// ===================== GRID PAGE =====================
async function initGridPage() {
  const uploadInput = document.getElementById("gridImageUpload");
  const analyzeBtn = document.getElementById("analyzeGridBtn");
  const gridOutput = document.getElementById("gridOutput");

  if (!uploadInput) return; // only run on grid.html

  analyzeBtn?.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) return showAlert("Upload an image first 🖼️", false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      showAlert("Analyzing image... ⏳", true);
      const res = await fetchWithAuth("/api/grid/analyze", {
        method: "POST",
        body: JSON.stringify({ image: base64, grid_size: 40 }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert("Analysis failed 💔", false);
      showAlert(`Analyzed ${data.count} squares 🎨`, true);

      gridOutput.innerHTML = "";
      for (const c of data.cells.slice(0, 300)) {
        const div = document.createElement("div");
        div.style.width = "10px";
        div.style.height = "10px";
        div.style.background = c.hex;
        div.style.display = "inline-block";
        gridOutput.appendChild(div);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ===================== PRESSURE PAGE =====================
async function initPressurePage() {
  const computeBtn = document.getElementById("computePressure");
  const satDiff = document.getElementById("satDiff");
  const pressureVal = document.getElementById("pressureVal");
  const pressureBar = document.getElementById("pressureBarInner");

  if (!computeBtn) return;

  computeBtn.addEventListener("click", async () => {
    const targetHex = document.getElementById("targetHex").value;
    const actualHex = document.getElementById("actualHex").value;

    const hexToRgb = (h) => {
      const c = h.replace("#", "");
      return {
        r: parseInt(c.substr(0, 2), 16),
        g: parseInt(c.substr(2, 2), 16),
        b: parseInt(c.substr(4, 2), 16),
      };
    };

    const res = await fetchWithAuth("/api/pressure", {
      method: "POST",
      body: JSON.stringify({
        target: hexToRgb(targetHex),
        actual: hexToRgb(actualHex),
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert("Error computing pressure 💔", false);
    satDiff.textContent = `${data.saturation_difference}%`;
    pressureVal.textContent = `${data.pressure_value}%`;
    pressureBar.style.width = `${data.pressure_value}%`;
    pressureBar.style.background =
      data.pressure_value > 70 ? "#ff4fa1" : "#89f8a5";
    showAlert("Pressure calculated ✅", true);
  });
}

// ===================== INIT PAGE ROUTING =====================
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (path.includes("palette")) initPalettePage();
  else if (path.includes("grid")) initGridPage();
  else if (path.includes("pressure")) initPressurePage();
});
// 🧁 Strawbebby Login/Register Popup System
// 🧁 Strawbebby Login/Register Popup System
document.addEventListener("DOMContentLoaded", () => {
  const loginButton   = document.getElementById("loginStatusButton");
  const popup         = document.getElementById("authPopup");
  const authTitle     = document.getElementById("authTitle");
  const usernameInput = document.getElementById("authUsername");
  const passwordInput = document.getElementById("authPassword");
  const authAction    = document.getElementById("authAction");
  const toggleAuth    = document.getElementById("toggleAuthMode");
  const logoutButton  = document.getElementById("authLogout");

  // If any of these don't exist (like on other pages), bail out safely
  if (!loginButton || !popup || !authTitle || !usernameInput || !passwordInput || !authAction || !toggleAuth || !logoutButton) {
    return;
  }

  let mode = "login"; // "login" or "register"

 function updateAuthUI() {
  if (mode === "login") {
    authTitle.textContent = "🎀 Sign In";
    authAction.textContent = "Sign In";
    toggleAuth.textContent = "No account? Register here!";
    logoutButton.style.display = "none"; // hide logout by default
  } else {
    authTitle.textContent = "🌈 Create Account";
    authAction.textContent = "Register";
    toggleAuth.textContent = "Already have an account? Sign in!";
    logoutButton.style.display = "none"; // also hide here
  }
}

  // Switch between login/register
  toggleAuth.addEventListener("click", () => {
    mode = mode === "login" ? "register" : "login";
    updateAuthUI();
  });

  // Submit login or register
  authAction.addEventListener("click", async () => {
    const username = sanitizeInput(usernameInput.value.trim());
    const password = sanitizeInput(passwordInput.value.trim());
    if (!username || !password) {
      alert("Please fill both fields!");
      return;
    }

    const endpoint = mode === "login" ? "/api/login" : "/api/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Something went wrong!");
        return;
      }

      if (mode === "login") {
  localStorage.setItem("cc_logged_user", data.username);
  loginButton.textContent = `Signed in as ${data.username}`;
  
  // ✅ Show the logout button when logged in
  const logoutButton = document.getElementById("authLogout");
  if (logoutButton) logoutButton.style.display = "inline-block";

  alert(`Welcome, ${data.username}! 🍓`);
} else {
  alert("Account created successfully! You can sign in now 🎉");
  mode = "login";
  updateAuthUI();
}
popup.style.display = "none";
usernameInput.value = "";
passwordInput.value = "";

      // restore scroll
      document.body.style.overflowY = "auto";
      document.documentElement.style.overflowY = "auto";
    } catch (err) {
      alert("Network error: " + err.message);
    }
  });

  // Logout button inside popup
  logoutButton.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        localStorage.removeItem("cc_logged_user");
        loginButton.textContent = "Not signed in";
        logoutButton.style.display = "none";
        document.getElementById("userStatus").textContent = ""; // clear name on logout
        logoutButton.style.display = "none"; // ✅ hide logout after logging out
        popup.style.display = "none";
        alert("Logged out successfully 🎈");
      } else {
        alert("Logout failed.");
      }
    } catch {
      alert("Logout failed.");
    }

    // restore scroll
    document.body.style.overflowY = "auto";
    document.documentElement.style.overflowY = "auto";
  });

  // Close popup when tapping background
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.style.display = "none";
      document.body.style.overflowY = "auto";
      document.documentElement.style.overflowY = "auto";
    }
  });

 // ✅ Keep user logged in on reload and across pages
const savedUser = localStorage.getItem("cc_logged_user");
const logoutButtonEl = document.getElementById("authLogout");

if (savedUser) {
  // Show username on button
  loginButton.textContent = `Signed in as ${savedUser}`;

  // ✅ Always show logout when already logged in
  if (logoutButtonEl) logoutButtonEl.style.display = "inline-block";
} else {
  // Default text when not logged in
  loginButton.textContent = "Sign In / Out";
  if (logoutButtonEl) logoutButtonEl.style.display = "none";
}

// ✅ Don’t let updateAuthUI hide logout again
if (typeof updateAuthUI === "function") {
  updateAuthUI();

  // Force logout visible if user is saved
  if (savedUser && logoutButtonEl)
    logoutButtonEl.style.display = "inline-block";
  updateAuthUI();
}
});
// 🩷 Fix: keep logout button visible when returning from other pages
window.addEventListener("pageshow", () => {
  const user = localStorage.getItem("cc_logged_user");
  const loginBtn = document.getElementById("loginStatusButton");
  const logoutBtn = document.getElementById("authLogout");
  
  if (user) {
    if (loginBtn) loginBtn.textContent = `Signed in as ${user}`;
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (loginBtn) loginBtn.textContent = "Sign In / Out";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});
// 🚫 Live protection: instantly sanitize every text box as the user types
document.addEventListener("input", (e) => {
  if (!e.target) return;
  if (e.target.tagName !== "INPUT") return;
  if (e.target.type !== "text") return;

  // Don’t sanitize login fields live (handled on submit)
  if (
    e.target.id === "authUsername" ||
    e.target.id === "authPassword" ||
    e.target.id === "progressLinkBox"
  ) return;


  // Do NOT remove spaces. Only remove dangerous characters.
  const original = e.target.value;
  const cleaned = original.replace(/[<>]/g, "")
                          .replace(/script|javascript:/gi, "")
                          .replace(/https?:\/\/\S+|www\.\S+/gi, "")
                          .replace(/[\\/]+/g, "")
                          .replace(/[{}$]/g, "");

  if (cleaned !== original) {
    e.target.value = cleaned;
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveProgressLinkBtn");
  const linkBox = document.getElementById("progressLinkBox");

  if (!saveBtn || !linkBox) return;

  saveBtn.addEventListener("click", () => {
    const progress = getAllLocalProgress();

    const code = btoa(unescape(encodeURIComponent(JSON.stringify(progress))));
    const link = window.location.origin + window.location.pathname + "#progress=" + code;

    linkBox.style.display = "block";
    linkBox.value = link;
    linkBox.focus();
    linkBox.select();

    navigator.clipboard?.writeText(link);

    alert("Progress link created and copied! 💾");
  });

  
});
