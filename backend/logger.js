import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.ZEA_LOG_DIR || '/tmp/zea';

fs.mkdirSync(LOG_DIR, { recursive: true });

function getLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `zea-${date}.log`);
}

function formatEntry(level, category, data) {
  const ts = new Date().toISOString();
  const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return `[${ts}] [${level}] [${category}] ${payload}\n`;
}

function write(level, category, data) {
  const entry = formatEntry(level, category, data);
  fs.appendFileSync(getLogFile(), entry);
  if (level === 'ERROR') {
    process.stderr.write(entry);
  }
}

export const log = {
  info: (category, data) => write('INFO', category, data),
  error: (category, data) => write('ERROR', category, data),
  diagnosis: (sessionId, diagnosis, pipelineResult) => {
    const entry = {
      session: sessionId,
      diagnosis,
      pipeline: {
        blocked: pipelineResult.blocked,
        amp_matches: pipelineResult.amp_matches.length,
        has_env_context: !!pipelineResult.environmental_context,
      },
    };
    write('INFO', 'PIPELINE', entry);
  },
};
