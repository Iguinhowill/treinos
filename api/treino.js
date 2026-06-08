const {
  handleError,
  parseJsonBody,
  requireAppPassword,
  sendJson
} = require("../lib/http");
const { updateTreino } = require("../lib/training");

module.exports = async function handler(req, res) {
  try {
    const authError = requireAppPassword(req);
    if (authError) {
      return handleError(res, authError);
    }

    if (req.method !== "PATCH") {
      res.setHeader("allow", "PATCH");
      return sendJson(res, 405, { error: "Método não permitido." });
    }

    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const id = req.query?.id || url.searchParams.get("id");

    if (!id) {
      return sendJson(res, 400, { error: "Informe o id do treino." });
    }

    const treino = await updateTreino(id, await parseJsonBody(req));
    return sendJson(res, 200, { treino });
  } catch (error) {
    return handleError(res, error);
  }
};
