import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(__dirname, 'models', 'plant_disease_model.onnx');

// PlantVillage 38-class labels from the HuggingFace model config
const LABELS = [
  'Apple Scab',
  'Apple with Black Rot',
  'Cedar Apple Rust',
  'Healthy Apple',
  'Healthy Blueberry Plant',
  'Cherry with Powdery Mildew',
  'Healthy Cherry Plant',
  'Corn (Maize) with Cercospora and Gray Leaf Spot',
  'Corn (Maize) with Common Rust',
  'Corn (Maize) with Northern Leaf Blight',
  'Healthy Corn (Maize) Plant',
  'Grape with Black Rot',
  'Grape with Esca (Black Measles)',
  'Grape with Isariopsis Leaf Spot',
  'Healthy Grape Plant',
  'Orange with Citrus Greening',
  'Peach with Bacterial Spot',
  'Healthy Peach Plant',
  'Bell Pepper with Bacterial Spot',
  'Healthy Bell Pepper Plant',
  'Potato with Early Blight',
  'Potato with Late Blight',
  'Healthy Potato Plant',
  'Healthy Raspberry Plant',
  'Healthy Soybean Plant',
  'Squash with Powdery Mildew',
  'Strawberry with Leaf Scorch',
  'Healthy Strawberry Plant',
  'Tomato with Bacterial Spot',
  'Tomato with Early Blight',
  'Tomato with Late Blight',
  'Tomato with Leaf Mold',
  'Tomato with Septoria Leaf Spot',
  'Tomato with Spider Mites or Two-spotted Spider Mite',
  'Tomato with Target Spot',
  'Tomato Yellow Leaf Curl Virus',
  'Tomato Mosaic Virus',
  'Healthy Tomato Plant'
];

// Map PlantVillage labels → scientific pathogen names and MVP match names
const LABEL_TO_PATHOGEN = {
  'Apple Scab': { pathogen: 'Venturia inaequalis', common_name: 'Apple scab', mvp_match_name: null },
  'Apple with Black Rot': { pathogen: 'Botryosphaeria obtusa', common_name: 'Black rot', mvp_match_name: null },
  'Cedar Apple Rust': { pathogen: 'Gymnosporangium juniperi-virginianae', common_name: 'Cedar apple rust', mvp_match_name: null },
  'Cherry with Powdery Mildew': { pathogen: 'Podosphaera clandestina', common_name: 'Powdery mildew', mvp_match_name: null },
  'Corn (Maize) with Cercospora and Gray Leaf Spot': { pathogen: 'Cercospora zeae-maydis', common_name: 'Gray leaf spot', mvp_match_name: null },
  'Corn (Maize) with Common Rust': { pathogen: 'Puccinia sorghi', common_name: 'Common rust', mvp_match_name: null },
  'Corn (Maize) with Northern Leaf Blight': { pathogen: 'Exserohilum turcicum', common_name: 'Northern leaf blight', mvp_match_name: null },
  'Grape with Black Rot': { pathogen: 'Guignardia bidwellii', common_name: 'Black rot', mvp_match_name: null },
  'Grape with Esca (Black Measles)': { pathogen: 'Phaeomoniella chlamydospora', common_name: 'Esca (Black Measles)', mvp_match_name: null },
  'Grape with Isariopsis Leaf Spot': { pathogen: 'Isariopsis clavispora', common_name: 'Leaf blight', mvp_match_name: null },
  'Orange with Citrus Greening': { pathogen: 'Candidatus Liberibacter asiaticus', common_name: 'Citrus greening (HLB)', mvp_match_name: null, biosecurity_alert: 'R_003_CUARENTENA_HLB' },
  'Peach with Bacterial Spot': { pathogen: 'Xanthomonas arboricola', common_name: 'Bacterial spot', mvp_match_name: 'Xanthomonas campestris' },
  'Bell Pepper with Bacterial Spot': { pathogen: 'Xanthomonas euvesicatoria', common_name: 'Bacterial spot', mvp_match_name: 'Xanthomonas campestris' },
  'Potato with Early Blight': { pathogen: 'Alternaria solani', common_name: 'Early blight', mvp_match_name: null },
  'Potato with Late Blight': { pathogen: 'Phytophthora infestans', common_name: 'Late blight', mvp_match_name: null },
  'Squash with Powdery Mildew': { pathogen: 'Podosphaera xanthii', common_name: 'Powdery mildew', mvp_match_name: null },
  'Strawberry with Leaf Scorch': { pathogen: 'Diplocarpon earlianum', common_name: 'Leaf scorch', mvp_match_name: null },
  'Tomato with Bacterial Spot': { pathogen: 'Xanthomonas vesicatoria', common_name: 'Bacterial spot', mvp_match_name: 'Xanthomonas campestris' },
  'Tomato with Early Blight': { pathogen: 'Alternaria solani', common_name: 'Early blight', mvp_match_name: null },
  'Tomato with Late Blight': { pathogen: 'Phytophthora infestans', common_name: 'Late blight', mvp_match_name: null },
  'Tomato with Leaf Mold': { pathogen: 'Passalora fulva', common_name: 'Leaf mold', mvp_match_name: null },
  'Tomato with Septoria Leaf Spot': { pathogen: 'Septoria lycopersici', common_name: 'Septoria leaf spot', mvp_match_name: null },
  'Tomato with Spider Mites or Two-spotted Spider Mite': { pathogen: 'Tetranychus urticae', common_name: 'Spider mite damage', mvp_match_name: null },
  'Tomato with Target Spot': { pathogen: 'Corynespora cassiicola', common_name: 'Target spot', mvp_match_name: null },
  'Tomato Yellow Leaf Curl Virus': { pathogen: 'Tomato yellow leaf curl virus', common_name: 'TYLCV', mvp_match_name: null },
  'Tomato Mosaic Virus': { pathogen: 'Tomato mosaic virus', common_name: 'Tomato mosaic virus', mvp_match_name: null },
};

// Extract crop name from label
function parseCrop(label) {
  const l = label.toLowerCase();
  if (l.includes('apple')) return 'apple';
  if (l.includes('blueberry')) return 'blueberry';
  if (l.includes('cherry')) return 'cherry';
  if (l.includes('corn') || l.includes('maize')) return 'corn';
  if (l.includes('grape')) return 'grape';
  if (l.includes('orange')) return 'orange';
  if (l.includes('peach')) return 'peach';
  if (l.includes('bell pepper')) return 'bell pepper';
  if (l.includes('potato')) return 'potato';
  if (l.includes('raspberry')) return 'raspberry';
  if (l.includes('soybean')) return 'soybean';
  if (l.includes('squash')) return 'squash';
  if (l.includes('strawberry')) return 'strawberry';
  if (l.includes('tomato')) return 'tomato';
  return 'unknown';
}

// Softmax
function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
}

let session = null;

async function getSession() {
  if (session) return session;
  if (!fs.existsSync(MODEL_PATH)) {
    console.warn('[CLASSIFY] Model file not found:', MODEL_PATH);
    return null;
  }
  try {
    const ort = await import('onnxruntime-node');
    session = await ort.InferenceSession.create(MODEL_PATH);
    console.log('[CLASSIFY] MobileNetV2 model loaded successfully');
    return session;
  } catch (e) {
    console.error('[CLASSIFY] Failed to load model:', e.message);
    return null;
  }
}

/**
 * Preprocess image buffer to 224x224 normalized float32 tensor.
 * Uses ImageMagick to resize, then reads raw RGB pixels.
 */
function preprocessImage(imageBuffer) {
  const tmpIn = `/tmp/zea-cls-${Date.now()}-in`;
  const tmpOut = `/tmp/zea-cls-${Date.now()}-out.rgb`;
  try {
    fs.writeFileSync(tmpIn, imageBuffer);
    // HuggingFace MobileNetV2 preprocessing:
    // 1. Resize shortest edge to 256 (keep aspect ratio)
    // 2. Center-crop to 224x224
    // 3. Normalize: (pixel/255 - 0.5) / 0.5 → maps [0,255] to [-1,1]
    execSync(`convert "${tmpIn}" -resize "256x256^" -gravity center -crop 224x224+0+0 +repage -depth 8 "rgb:${tmpOut}"`, { timeout: 5000 });
    const raw = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);

    const pixels = 224 * 224;
    const float32 = new Float32Array(3 * pixels);
    // CHW format, normalized to [-1, 1]
    for (let i = 0; i < pixels; i++) {
      float32[i] = (raw[i * 3] / 255.0 - 0.5) / 0.5;              // R
      float32[pixels + i] = (raw[i * 3 + 1] / 255.0 - 0.5) / 0.5; // G
      float32[2 * pixels + i] = (raw[i * 3 + 2] / 255.0 - 0.5) / 0.5; // B
    }
    return float32;
  } catch (e) {
    try { fs.unlinkSync(tmpIn); } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
    throw e;
  }
}

/**
 * Classify a plant disease image.
 * @param {Buffer} imageBuffer - JPEG/PNG image buffer
 * @returns {{ label: string, confidence: number, crop: string, disease: string|null, pathogenInfo: object|null }}
 */
export async function classifyImage(imageBuffer) {
  try {
    const sess = await getSession();
    if (!sess) {
      return { label: null, confidence: 0, crop: null, disease: null, pathogenInfo: null };
    }

    const ort = await import('onnxruntime-node');
    const inputData = preprocessImage(imageBuffer);
    const tensor = new ort.Tensor('float32', inputData, [1, 3, 224, 224]);

    const feeds = {};
    const inputName = sess.inputNames[0];
    feeds[inputName] = tensor;

    const results = await sess.run(feeds);
    const outputName = sess.outputNames[0];
    const logits = Array.from(results[outputName].data);

    const probs = softmax(logits);
    let maxIdx = 0;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > probs[maxIdx]) maxIdx = i;
    }

    const label = LABELS[maxIdx];
    const confidence = probs[maxIdx];
    const crop = parseCrop(label);
    const isHealthy = label.toLowerCase().includes('healthy');
    const disease = isHealthy ? null : label;
    const pathogenInfo = LABEL_TO_PATHOGEN[label] || null;

    return { label, confidence, crop, disease, pathogenInfo, isHealthy };
  } catch (e) {
    console.error('[CLASSIFY] Classification error:', e.message);
    return { label: null, confidence: 0, crop: null, disease: null, pathogenInfo: null };
  }
}

/**
 * Build a Phase 1-compatible diagnosis JSON from local model results.
 */
export function buildDiagnosisFromLocal(classResult) {
  const { label, confidence, crop, disease, pathogenInfo, isHealthy } = classResult;

  if (isHealthy) {
    return {
      crop,
      observed_symptoms: [],
      candidates: [],
      in_mvp_database: false,
      biosecurity_alert: null,
      needs_more_info: true,
      notes: `MobileNetV2 identified a healthy ${crop} plant (confidence: ${(confidence * 100).toFixed(1)}%). No disease detected. If you believe there are symptoms, please send another photo.`
    };
  }

  const info = pathogenInfo || {};
  const confLevel = confidence >= 0.90 ? 'high' : confidence >= 0.75 ? 'medium' : 'low';

  const candidate = {
    pathogen: info.pathogen || label,
    common_name: info.common_name || disease || label,
    confidence: confLevel,
    reasoning: `Identified by MobileNetV2 local model with ${(confidence * 100).toFixed(1)}% confidence on PlantVillage dataset.`,
    mvp_match_name: info.mvp_match_name || null
  };

  return {
    crop,
    observed_symptoms: [`Visual symptoms consistent with ${info.common_name || label}`],
    candidates: [candidate],
    in_mvp_database: !!candidate.mvp_match_name,
    biosecurity_alert: info.biosecurity_alert || null,
    needs_more_info: false,
    notes: `Diagnosed locally by MobileNetV2 (PlantVillage). Confidence: ${(confidence * 100).toFixed(1)}%.`
  };
}
