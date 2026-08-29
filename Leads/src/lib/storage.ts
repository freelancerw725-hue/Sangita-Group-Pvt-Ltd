import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const writeQueues = new Map<string, Promise<void>>();

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

function resolveDataPath(fileName: string) {
  return path.join(dataDir, fileName);
}

async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  await ensureDataDir();
  const filePath = resolveDataPath(fileName);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  await ensureDataDir();
  const filePath = resolveDataPath(fileName);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function queueWrite(fileName: string, task: () => Promise<void>): Promise<void> {
  const current = writeQueues.get(fileName) ?? Promise.resolve();
  const next = current.then(task, task);
  writeQueues.set(fileName, next.catch(() => undefined));
  return next;
}

export async function readLeadsFile<T>(fileName: string, fallback: T): Promise<T> {
  return readJson(fileName, fallback);
}

export async function updateJsonFile<T>(fileName: string, updater: (current: T) => T | Promise<T>, fallback: T): Promise<T> {
  let updated: T = fallback;
  await queueWrite(fileName, async () => {
    const current = await readJson(fileName, fallback);
    updated = await updater(current);
    await writeJson(fileName, updated);
  });
  return updated;
}

export async function saveJsonFile<T>(fileName: string, value: T): Promise<void> {
  await queueWrite(fileName, async () => {
    await writeJson(fileName, value);
  });
}

export { resolveDataPath, ensureDataDir };
