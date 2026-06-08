const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");
const {
  handleError,
  parseJsonBody,
  requireAppPassword,
  sendJson
} = require("./lib/http");
const { getTreinosPayload, readDb, updateTreino } = require("./lib/training");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

async function handleApi(req, res, url) {
  const authError = requireAppPassword(req);
  if (authError) {
    return handleError(res, authError);
  }

  if (req.method === "GET" && url.pathname === "/api/db") {
    return sendJson(res, 200, await readDb());
  }

  if (req.method === "GET" && url.pathname === "/api/treinos") {
    return sendJson(res, 200, await getTreinosPayload());
  }

  if (req.method === "PATCH" && url.pathname === "/api/treino") {
    const id = url.searchParams.get("id");
    if (!id) {
      return sendJson(res, 400, { error: "Informe o id do treino." });
    }

    const treino = await updateTreino(id, await parseJsonBody(req));
    return sendJson(res, 200, { treino });
  }

  const match = url.pathname.match(/^\/api\/treinos\/([^/]+)$/);
  if (req.method === "PATCH" && match) {
    const id = decodeURIComponent(match[1]);
    const treino = await updateTreino(id, await parseJsonBody(req));
    return sendJson(res, 200, { treino });
  }

  return sendJson(res, 404, { error: "Rota não encontrada." });
}

async function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const decodedPath = decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Acesso negado.");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "content-type": MIME_TYPES[extension] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Arquivo não encontrado.");
      return;
    }

    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    handleError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`Treinos IFlorense rodando em http://localhost:${PORT}`);
});
