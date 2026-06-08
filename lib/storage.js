const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");
const LOCAL_DB_FILE = path.join(ROOT_DIR, "database", "db.json");
const BLOB_DB_PATH = process.env.BLOB_DB_PATH || "database/db.json";

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

function shouldUseBlob() {
  return isVercelRuntime() || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function withStatus(error, statusCode) {
  error.statusCode = statusCode;
  return error;
}

async function streamToText(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
}

async function readLocalDb() {
  const raw = await fs.readFile(LOCAL_DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeLocalDb(db) {
  await fs.writeFile(LOCAL_DB_FILE, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

async function getBlobClient() {
  try {
    return await import("@vercel/blob");
  } catch (error) {
    throw withStatus(
      new Error("Dependência @vercel/blob não encontrada. Rode npm install."),
      500
    );
  }
}

function normalizeBlobError(error) {
  if (!isVercelRuntime()) return error;

  const message = String(error?.message || "");
  if (
    message.includes("No blob credentials") ||
    message.includes("BLOB_READ_WRITE_TOKEN") ||
    message.includes("BLOB_STORE_ID")
  ) {
    return withStatus(
      new Error(
        "Vercel Blob não configurado. Crie um Blob Store e configure BLOB_READ_WRITE_TOKEN no projeto."
      ),
      503
    );
  }

  return error;
}

async function readBlobDb() {
  const { get } = await getBlobClient();

  try {
    const result = await get(BLOB_DB_PATH, {
      access: "private",
      useCache: false
    });

    if (!result || !result.stream) {
      const seed = await readLocalDb();
      await writeBlobDb(seed);
      return seed;
    }

    return JSON.parse(await streamToText(result.stream));
  } catch (error) {
    throw normalizeBlobError(error);
  }
}

async function writeBlobDb(db) {
  const { put } = await getBlobClient();

  try {
    await put(BLOB_DB_PATH, `${JSON.stringify(db, null, 2)}\n`, {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });
  } catch (error) {
    throw normalizeBlobError(error);
  }
}

async function readDb() {
  if (shouldUseBlob()) {
    return readBlobDb();
  }

  return readLocalDb();
}

async function writeDb(db) {
  db.meta.updatedAt = new Date().toISOString();
  db.meta.storage = shouldUseBlob() ? "vercel-blob" : "local-json";

  if (shouldUseBlob()) {
    await writeBlobDb(db);
    return;
  }

  await writeLocalDb(db);
}

module.exports = {
  BLOB_DB_PATH,
  LOCAL_DB_FILE,
  readDb,
  writeDb,
  shouldUseBlob
};
