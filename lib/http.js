function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function getHeader(req, name) {
  const header = req.headers[name.toLowerCase()];
  if (Array.isArray(header)) return header[0];
  return header;
}

function requireAppPassword(req) {
  const configuredPassword = process.env.APP_PASSWORD;
  const mustProtect = process.env.VERCEL === "1" || Boolean(configuredPassword);

  if (!mustProtect) return null;

  if (!configuredPassword) {
    const error = new Error(
      "APP_PASSWORD não configurado na Vercel. Defina uma senha nas variáveis de ambiente do projeto."
    );
    error.statusCode = 503;
    return error;
  }

  const receivedPassword = getHeader(req, "x-app-password");

  if (receivedPassword !== configuredPassword) {
    const error = new Error("Senha obrigatória ou inválida.");
    error.statusCode = 401;
    error.authRequired = true;
    return error;
  }

  return null;
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) {
      const error = new Error("Payload muito grande.");
      error.statusCode = 413;
      throw error;
    }
  }

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("JSON inválido.");
    error.statusCode = 400;
    throw error;
  }
}

function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  sendJson(res, statusCode, {
    error: statusCode === 500 ? "Erro interno no servidor." : error.message,
    authRequired: Boolean(error.authRequired)
  });

  if (statusCode === 500) {
    console.error(error);
  }
}

module.exports = {
  handleError,
  parseJsonBody,
  requireAppPassword,
  sendJson
};
