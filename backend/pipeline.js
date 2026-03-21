import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MATCHER = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'matcher_patogenos.json'), 'utf8'));
const BIOSECURITY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'biosecurity-alerts.json'), 'utf8'));
const CEREBRO = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'cerebro_ambiental.json'), 'utf8'));
const TRADUCTOR = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'traductor_agentes.json'), 'utf8'));

export function lookupAMP(mvpMatchName) {
  if (!mvpMatchName) return null;
  const normalized = mvpMatchName.toLowerCase();
  return MATCHER.find(p => p.pathogen.toLowerCase() === normalized) || null;
}

export function lookupBiosecurityAlert(alertId) {
  if (!alertId) return null;
  return BIOSECURITY.find(a => a.id_caso === alertId) || null;
}

export function lookupEnvironment(pathogenName) {
  if (!pathogenName) return null;
  const normalized = pathogenName.toLowerCase();
  return CEREBRO.find(c =>
    c.patogeno.nombre.toLowerCase().includes(normalized)
  ) || null;
}

export function lookupTranslation(ampName) {
  if (!ampName) return null;
  return TRADUCTOR.find(t =>
    t.amp_name.toLowerCase() === ampName.toLowerCase()
  ) || null;
}

export function getChemicalWarnings() {
  return BIOSECURITY.filter(alert =>
    alert.tipo_alerta.includes('INTERACCION') ||
    alert.tipo_alerta.includes('DISENO_QUIMICO') ||
    alert.tipo_alerta.includes('RIESGO_RESISTENCIA')
  );
}

export function deterministicPipeline(diagnosis) {
  const result = {
    diagnosis,
    blocked: false,
    block_reason: null,
    block_alert: null,
    amp_matches: [],
    environmental_context: null,
    translations: [],
    chemical_warnings: getChemicalWarnings()
  };

  if (diagnosis.biosecurity_alert) {
    const alert = lookupBiosecurityAlert(diagnosis.biosecurity_alert);
    if (alert) {
      result.blocked = true;
      result.block_reason = alert.instruccion_para_el_agente;
      result.block_alert = alert;
      return result;
    }
  }

  if (diagnosis.candidates) {
    for (const candidate of diagnosis.candidates) {
      if (candidate.mvp_match_name) {
        const amp = lookupAMP(candidate.mvp_match_name);
        if (amp) {
          const translation = lookupTranslation(amp.amp_name);
          result.amp_matches.push({ candidate, amp, translation });
        }
      }
    }
  }

  if (diagnosis.candidates && diagnosis.candidates.length > 0) {
    result.environmental_context = lookupEnvironment(
      diagnosis.candidates[0].pathogen
    );
  }

  return result;
}
