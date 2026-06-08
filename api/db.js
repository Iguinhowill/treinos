const { handleError, requireAppPassword, sendJson } = require("../lib/http");
const { readDb } = require("../lib/training");

module.exports = async function handler(req, res) {
  try {
    const authError = requireAppPassword(req);
    if (authError) {
      return handleError(res, authError);
    }

    if (req.method !== "GET") {
      res.setHeader("allow", "GET");
      return sendJson(res, 405, { error: "Método não permitido." });
    }

    return sendJson(res, 200, await readDb());
  } catch (error) {
    return handleError(res, error);
  }
};
