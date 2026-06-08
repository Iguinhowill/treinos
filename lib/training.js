const { readDb, writeDb } = require("./storage");

const STATUS = new Set(["Pendente", "Realizado", "Pulado"]);

function getSaoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function toNullableNumber(value, fieldName) {
  if (value === null || value === undefined || value === "") return null;

  const normalized =
    typeof value === "string" ? value.trim().replace(",", ".") : value;
  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${fieldName} precisa ser um número válido.`);
    error.statusCode = 400;
    throw error;
  }

  return number;
}

function calculatePace(km, minutes) {
  if (!km || !minutes || km <= 0 || minutes <= 0) return null;
  return Number((minutes / km).toFixed(4));
}

async function getTreinosPayload() {
  const db = await readDb();
  return {
    meta: db.meta,
    treinos: db.treinos
  };
}

async function updateTreino(id, body) {
  const db = await readDb();
  const treino = db.treinos.find((item) => item.id === id);

  if (!treino) {
    const error = new Error("Treino não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const before = { ...treino };

  if (body.status !== undefined) {
    if (!STATUS.has(body.status)) {
      const error = new Error("Status inválido.");
      error.statusCode = 400;
      throw error;
    }
    treino.status = body.status;
  }

  if (body.kmRealizados !== undefined) {
    treino.kmRealizados = toNullableNumber(body.kmRealizados, "Km realizados");
  }

  if (body.tempoRealMin !== undefined) {
    treino.tempoRealMin = toNullableNumber(body.tempoRealMin, "Tempo real");
  }

  if (body.fcMedia !== undefined) {
    treino.fcMedia = toNullableNumber(body.fcMedia, "FC média");
  }

  if (body.realizadoEm !== undefined) {
    treino.realizadoEm = body.realizadoEm || null;
  }

  if (body.notas !== undefined) {
    treino.notas = String(body.notas || "").trim();
  }

  if (treino.status === "Realizado") {
    treino.realizadoEm = treino.realizadoEm || getSaoPauloDate();
  }

  if (treino.status === "Pulado") {
    treino.kmRealizados = 0;
    treino.tempoRealMin = null;
    treino.paceRealMinKm = null;
    treino.fcMedia = null;
    treino.realizadoEm = treino.realizadoEm || getSaoPauloDate();
  } else if (treino.status === "Pendente") {
    treino.realizadoEm = null;
  }

  treino.paceRealMinKm = calculatePace(
    Number(treino.kmRealizados),
    Number(treino.tempoRealMin)
  );
  treino.updatedAt = new Date().toISOString();

  db.history.push({
    id: `${Date.now()}-${treino.id}`,
    treinoId: treino.id,
    changedAt: treino.updatedAt,
    before,
    after: { ...treino }
  });

  await writeDb(db);
  return treino;
}

module.exports = {
  getTreinosPayload,
  updateTreino,
  readDb
};
