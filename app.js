// @author piercer
(() => {
  const KEY = "piercer_scrambler_profiles_v1";
  const $ = (id) => document.getElementById(id);

  let profiles = (() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  })();

  function renderProfiles() {
    localStorage.setItem(KEY, JSON.stringify(profiles));
    $("profileList").innerHTML = "";
    if (!profiles.length) {
      $("profileList").innerHTML = `<span class="subtitle">Nenhum perfil salvo. Salve regras de serviços aqui (sem senhas).</span>`;
      return;
    }
    profiles.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "prof-row";
      row.innerHTML = `<span><strong>${p.service}</strong> (v${p.ver} • ${p.len} chars)</span><button type="button" class="btn">×</button>`;
      row.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") { profiles.splice(i, 1); renderProfiles(); return; }
        $("serviceName").value = p.service;
        $("passVer").value = p.ver;
        $("passLen").value = p.len;
        $("hashAlgo").value = p.algo;
        $("useSymbols").checked = p.sym;
      });
      $("profileList").appendChild(row);
    });
  }

  async function derive() {
    const master = $("masterPass").value;
    const service = $("serviceName").value.trim().toLowerCase();
    if (!master || !service) return alert("Informe a senha mestra e o serviço.");

    const len = Math.min(64, Math.max(8, Number($("passLen").value) || 20));
    const ver = Number($("passVer").value) || 1;
    const iters = Math.max(10000, Number($("iters").value) || 100000);
    const algo = $("hashAlgo").value;
    const useSym = $("useSymbols").checked;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(master), "PBKDF2", false, ["deriveBits"]);
    const salt = enc.encode(`piercer:${service}:v${ver}`);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iters, hash: algo }, key, len * 8);
    const bytes = new Uint8Array(bits);

    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + (useSym ? "!@#$%^&*()-_=+[]" : "");
    let pass = "";
    for (let i = 0; i < len; i++) pass += charset[bytes[i] % charset.length];

    $("derivedOut").value = pass;
    const ent = Math.round(len * Math.log2(charset.length));
    $("entropyInfo").textContent = `Entropia estimada: ~${ent} bits (${algo}, ${iters.toLocaleString()} iterações)`;
  }

  $("btnDerive").addEventListener("click", derive);
  $("btnSaveProfile").addEventListener("click", () => {
    const service = $("serviceName").value.trim();
    if (!service) return;
    profiles.unshift({
      service,
      ver: Number($("passVer").value) || 1,
      len: Number($("passLen").value) || 20,
      algo: $("hashAlgo").value,
      sym: $("useSymbols").checked,
    });
    renderProfiles();
  });

  $("btnToggleShow").addEventListener("click", () => {
    const isPass = $("derivedOut").type === "password";
    $("derivedOut").type = isPass ? "text" : "password";
    $("btnToggleShow").textContent = isPass ? "Ocultar" : "Mostrar";
  });

  $("btnCopyPass").addEventListener("click", () => {
    if (!$("derivedOut").value) return;
    navigator.clipboard.writeText($("derivedOut").value);
    alert("Senha copiada!");
  });

  renderProfiles();
})();
