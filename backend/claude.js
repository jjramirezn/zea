const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Models per phase — Haiku for speed, Sonnet for complex vision tasks
export const MODELS = {
  phase1: 'claude-sonnet-4-20250514',   // diagnosis needs vision + reasoning
  phase4: 'claude-3-5-haiku-20241022',  // translation is formatting only
};

export async function callClaude(system, messages, { model = MODELS.phase1 } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  return await res.json();
}
