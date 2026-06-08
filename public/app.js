const state = {
  meta: null,
  treinos: [],
  selectedId: null,
  filter: "todos",
  week: "todas",
  search: "",
  currentStatus: "Pendente",
  password: sessionStorage.getItem("treinos-password") || ""
};

const selectors = {
  metrics: document.querySelector("#metrics"),
  progressLabel: document.querySelector("#progressLabel"),
  progressKm: document.querySelector("#progressKm"),
  progressBar: document.querySelector("#progressBar"),
  trainingSelect: document.querySelector("#trainingSelect"),
  trainingForm: document.querySelector("#trainingForm"),
  trainingList: document.querySelector("#trainingList"),
  weekStrip: document.querySelector("#weekStrip"),
  weekFilter: document.querySelector("#weekFilter"),
  searchInput: document.querySelector("#searchInput"),
  saveState: document.querySelector("#saveState"),
  toast: document.querySelector("#toast"),
  authGate: document.querySelector("#authGate"),
  authForm: document.querySelector("#authForm"),
  authMessage: document.querySelector("#authMessage"),
  passwordInput: document.querySelector("#passwordInput"),
  resetButton: document.querySelector("#resetButton"),
  kmRealizados: document.querySelector("#kmRealizados"),
  tempoRealMin: document.querySelector("#tempoRealMin"),
  fcMedia: document.querySelector("#fcMedia"),
  realizadoEm: document.querySelector("#realizadoEm"),
  notas: document.querySelector("#notas")
};

const STATUS_CLASS = {
  Pendente: "status-pendente",
  Realizado: "status-realizado",
  Pulado: "status-pulado"
};

function formatNumber(value, digits = 1) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function formatLongDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatPace(pace) {
  if (!pace || Number.isNaN(Number(pace))) return "-";
  const totalSeconds = Math.round(Number(pace) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}/km`;
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function setSaveState(text) {
  selectors.saveState.textContent = text;
}

function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    selectors.toast.classList.remove("is-visible");
  }, 2600);
}

async function api(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {})
  };

  if (state.password) {
    headers["x-app-password"] = state.password;
  }

  const response = await fetch(path, {
    headers,
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Falha na comunicação com o servidor.");
    error.statusCode = response.status;
    error.authRequired = Boolean(data.authRequired);
    throw error;
  }

  return data;
}

function getSelectedTreino() {
  return state.treinos.find((treino) => treino.id === state.selectedId) || null;
}

function getStats() {
  const totalPlanejado = state.treinos.reduce(
    (sum, treino) => sum + Number(treino.kmPlanejados || 0),
    0
  );
  const totalRealizado = state.treinos.reduce(
    (sum, treino) => sum + Number(treino.kmRealizados || 0),
    0
  );
  const realizados = state.treinos.filter((treino) => treino.status === "Realizado").length;
  const pulados = state.treinos.filter((treino) => treino.status === "Pulado").length;
  const pendentes = state.treinos.filter((treino) => treino.status === "Pendente").length;
  const proximo =
    state.treinos.find((treino) => treino.status === "Pendente") ||
    state.treinos[state.treinos.length - 1];

  return {
    totalPlanejado,
    totalRealizado,
    realizados,
    pulados,
    pendentes,
    progressoKm: totalPlanejado ? (totalRealizado / totalPlanejado) * 100 : 0,
    proximo
  };
}

function renderMetrics() {
  const stats = getStats();
  const cards = [
    {
      label: "Km realizados",
      value: formatNumber(stats.totalRealizado, 1),
      detail: `${formatNumber(stats.totalPlanejado, 1)} km planejados`
    },
    {
      label: "Treinos feitos",
      value: stats.realizados,
      detail: `${state.treinos.length} treinos no ciclo`
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      detail: `${stats.pulados} pulados`
    },
    {
      label: "Progresso por km",
      value: `${Math.min(stats.progressoKm, 100).toFixed(0)}%`,
      detail: "calculado pelo volume lançado"
    },
    {
      label: "Proximo treino",
      value: stats.proximo ? formatDate(stats.proximo.data) : "-",
      detail: stats.proximo ? `${stats.proximo.tipo} | ${stats.proximo.kmPlanejados} km` : "-"
    }
  ];

  selectors.metrics.innerHTML = cards
    .map(
      (card) => `
        <article class="metric">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
          <small>${card.detail}</small>
        </article>
      `
    )
    .join("");

  selectors.progressLabel.textContent = `${Math.min(stats.progressoKm, 100).toFixed(0)}% por km`;
  selectors.progressKm.textContent = `${formatNumber(stats.totalRealizado, 1)} de ${formatNumber(
    stats.totalPlanejado,
    1
  )} km`;
  selectors.progressBar.style.width = `${Math.min(stats.progressoKm, 100)}%`;
}

function renderSelects() {
  selectors.trainingSelect.innerHTML = state.treinos
    .map(
      (treino) => `
        <option value="${treino.id}">
          ${formatDate(treino.data)} | S${treino.semana} | ${treino.tipo} | ${treino.kmPlanejados} km
        </option>
      `
    )
    .join("");
  selectors.trainingSelect.value = state.selectedId;

  const weeks = [...new Set(state.treinos.map((treino) => treino.semana))];
  selectors.weekFilter.innerHTML = [
    `<option value="todas">Todas</option>`,
    ...weeks.map((week) => `<option value="${week}">Semana ${week}</option>`)
  ].join("");
  selectors.weekFilter.value = state.week;
}

function fillForm() {
  const treino = getSelectedTreino();
  if (!treino) return;

  state.currentStatus = treino.status;
  selectors.trainingSelect.value = treino.id;
  selectors.kmRealizados.value = treino.kmRealizados ?? "";
  selectors.tempoRealMin.value = treino.tempoRealMin ?? "";
  selectors.fcMedia.value = treino.fcMedia ?? "";
  selectors.realizadoEm.value = treino.realizadoEm ?? "";
  selectors.notas.value = treino.notas ?? "";

  renderStatusButtons();
}

function renderStatusButtons() {
  document.querySelectorAll("[data-status-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.statusOption === state.currentStatus);
  });
}

function getWeekStats() {
  const weeks = new Map();

  state.treinos.forEach((treino) => {
    if (!weeks.has(treino.semana)) {
      weeks.set(treino.semana, {
        semana: treino.semana,
        planejado: 0,
        realizado: 0,
        feitos: 0,
        total: 0
      });
    }

    const week = weeks.get(treino.semana);
    week.planejado += Number(treino.kmPlanejados || 0);
    week.realizado += Number(treino.kmRealizados || 0);
    week.total += 1;
    if (treino.status === "Realizado") week.feitos += 1;
  });

  return [...weeks.values()];
}

function renderWeeks() {
  selectors.weekStrip.innerHTML = getWeekStats()
    .map((week) => {
      const progress = week.planejado ? Math.min((week.realizado / week.planejado) * 100, 100) : 0;
      return `
        <article class="week-card">
          <strong>Semana ${week.semana}</strong>
          <span>${formatNumber(week.realizado, 1)} / ${formatNumber(week.planejado, 1)} km</span>
          <div class="mini-track" aria-hidden="true"><i style="width:${progress}%"></i></div>
          <span>${week.feitos}/${week.total} feitos</span>
        </article>
      `;
    })
    .join("");
}

function getFilteredTreinos() {
  const search = state.search.trim().toLowerCase();

  return state.treinos.filter((treino) => {
    const statusMatches =
      state.filter === "todos" ||
      (state.filter === "pendentes" && treino.status === "Pendente") ||
      (state.filter === "realizados" && treino.status === "Realizado") ||
      (state.filter === "pulados" && treino.status === "Pulado");

    const weekMatches = state.week === "todas" || String(treino.semana) === String(state.week);

    const searchHaystack = [
      treino.tipo,
      treino.treinoPlanejado,
      treino.ritmoAlvo,
      treino.observacoesPlano,
      `semana ${treino.semana}`
    ]
      .join(" ")
      .toLowerCase();

    return statusMatches && weekMatches && (!search || searchHaystack.includes(search));
  });
}

function renderTrainingList() {
  const treinos = getFilteredTreinos();

  if (!treinos.length) {
    selectors.trainingList.innerHTML = `<div class="empty-state">Nenhum treino encontrado.</div>`;
    return;
  }

  selectors.trainingList.innerHTML = treinos
    .map((treino) => {
      const result =
        treino.status === "Realizado"
          ? `${formatNumber(treino.kmRealizados, 2)} km | ${formatPace(treino.paceRealMinKm)}`
          : treino.status === "Pulado"
            ? `Pulado em ${formatLongDate(treino.realizadoEm)}`
            : `${treino.ritmoAlvo}`;

      return `
        <article class="training-card ${STATUS_CLASS[treino.status]} ${
          treino.id === state.selectedId ? "is-selected" : ""
        }" data-card-id="${treino.id}">
          <div class="training-date">
            <strong>${formatDate(treino.data)}</strong>
            <span>${treino.dia}<br>Semana ${treino.semana}</span>
          </div>

          <div class="training-main">
            <h3>${treino.treinoPlanejado}</h3>
            <div class="training-meta">
              <span>${treino.tipo}</span>
              <span>${formatNumber(treino.kmPlanejados, 1)} km planejados</span>
              <span>${result}</span>
            </div>
            <p class="training-note">${treino.observacoesPlano}</p>
            ${treino.notas ? `<p class="result-line">Notas: ${treino.notas}</p>` : ""}
          </div>

          <div class="training-side">
            <span class="status-pill ${STATUS_CLASS[treino.status]}">${treino.status}</span>
            <button class="card-action" type="button" data-edit-id="${treino.id}">Lançar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderFilterButtons() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function render() {
  renderMetrics();
  renderSelects();
  renderWeeks();
  fillForm();
  renderFilterButtons();
  renderTrainingList();
}

async function loadTreinos() {
  setSaveState("Carregando");
  const data = await api("/api/treinos");
  state.meta = data.meta;
  state.treinos = data.treinos.sort((a, b) => a.data.localeCompare(b.data));
  state.selectedId =
    state.treinos.find((treino) => treino.status === "Pendente")?.id || state.treinos[0]?.id;
  setSaveState("Pronto");
  render();
}

async function updateTreino(id, payload, successMessage) {
  setSaveState("Salvando");
  const data = await api(`/api/treino?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  state.treinos = state.treinos.map((treino) => (treino.id === id ? data.treino : treino));
  state.selectedId = id;
  setSaveState("Salvo");
  render();
  showToast(successMessage);
  window.setTimeout(() => setSaveState("Pronto"), 1200);
}

function bindEvents() {
  selectors.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.password = selectors.passwordInput.value;
    sessionStorage.setItem("treinos-password", state.password);
    selectors.authGate.hidden = true;

    try {
      await loadTreinos();
    } catch (error) {
      showAuthGate(error);
    }
  });

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.themeOption);
    });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      renderFilterButtons();
      renderTrainingList();
    });
  });

  document.querySelectorAll("[data-status-option]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentStatus = button.dataset.statusOption;
      renderStatusButtons();
      if (state.currentStatus === "Realizado" && !selectors.realizadoEm.value) {
        selectors.realizadoEm.value = todayIso();
      }
      if (state.currentStatus === "Pulado" && !selectors.realizadoEm.value) {
        selectors.realizadoEm.value = todayIso();
      }
    });
  });

  selectors.trainingSelect.addEventListener("change", (event) => {
    state.selectedId = event.target.value;
    fillForm();
    renderTrainingList();
  });

  selectors.weekFilter.addEventListener("change", (event) => {
    state.week = event.target.value;
    renderTrainingList();
  });

  selectors.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTrainingList();
  });

  selectors.trainingList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-id]");
    const card = event.target.closest("[data-card-id]");
    const id = editButton?.dataset.editId || card?.dataset.cardId;
    if (!id) return;

    state.selectedId = id;
    fillForm();
    renderTrainingList();
    document.querySelector(".log-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  selectors.resetButton.addEventListener("click", async () => {
    const treino = getSelectedTreino();
    if (!treino) return;

    await updateTreino(
      treino.id,
      {
        status: "Pendente",
        kmRealizados: null,
        tempoRealMin: null,
        fcMedia: null,
        realizadoEm: null,
        notas: selectors.notas.value
      },
      "Status limpo."
    );
  });

  selectors.trainingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const treino = getSelectedTreino();
    if (!treino) return;

    const payload = {
      status: state.currentStatus,
      kmRealizados: selectors.kmRealizados.value,
      tempoRealMin: selectors.tempoRealMin.value,
      fcMedia: selectors.fcMedia.value,
      realizadoEm: selectors.realizadoEm.value,
      notas: selectors.notas.value
    };

    if (payload.status === "Realizado" && !payload.kmRealizados) {
      payload.kmRealizados = treino.kmPlanejados;
    }

    await updateTreino(treino.id, payload, "Lançamento salvo.");
  });
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("treinos-theme", theme);
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeOption === theme);
  });
}

function showAuthGate(error) {
  selectors.authMessage.textContent =
    error?.statusCode === 503
      ? error.message
      : "Informe a senha configurada na Vercel.";
  selectors.authGate.hidden = false;
  selectors.passwordInput.focus();
  setSaveState("Bloqueado");
}

async function init() {
  const savedTheme = localStorage.getItem("treinos-theme") || "dark";
  setTheme(savedTheme);
  bindEvents();

  try {
    await loadTreinos();
  } catch (error) {
    if (error.authRequired || error.statusCode === 401 || error.statusCode === 503) {
      showAuthGate(error);
      return;
    }

    setSaveState("Erro");
    showToast(error.message);
  }
}

init();
