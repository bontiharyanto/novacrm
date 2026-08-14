export type IntegrationKind = string;

export type IntegrationStatus = {
  configured: boolean;
  lastOk?: boolean | null;
  lastError?: string | null;
  lastTestedAt?: string | null;
};

export type AiIntegration = IntegrationStatus & {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type WebhookIntegration = IntegrationStatus & {
  alertSecret: string;
  emailSecret: string;
  genericSecret: string;
};

export type HubIntegrations = {
  ai: AiIntegration;
  whatsapp: IntegrationStatus & { apiKey: string };
  telegram: IntegrationStatus & { botToken: string; chatId: string };
  email: IntegrationStatus & { apiKey: string; from: string };
  webhook: WebhookIntegration;
};

export const DEFAULT_AI_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_AI_MODEL = 'llama-3.1-8b-instant';
export const DEFAULT_EMAIL_FROM = 'NovaCRM <no-reply@novacrm.app>';

export const GROQ_MODELS = ['llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'] as const;

export const AI_PROVIDERS: Array<{
  id: string;
  label: string;
  hint: string;
  baseUrl: string;
  model: string;
  keyPlaceholder: string;
  free: boolean;
}> = [
  {
    id: 'groq',
    label: 'Groq (free)',
    hint: 'No credit card. Llama 3.1 8B Instant.',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: DEFAULT_AI_MODEL,
    keyPlaceholder: 'gsk_...',
    free: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini (free)',
    hint: 'AI Studio key. Gemini Flash.',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    keyPlaceholder: 'AIza...',
    free: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    hint: 'No cloud key. Run ollama serve.',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    keyPlaceholder: 'ollama',
    free: true,
  },
  {
    id: 'openai',
    label: 'OpenAI (paid)',
    hint: 'Needs a billed OpenAI key (sk-...).',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyPlaceholder: 'sk-...',
    free: false,
  },
];

export function matchAiProvider(baseUrl?: string) {
  const url = (baseUrl ?? DEFAULT_AI_BASE_URL).replace(/\/$/, '');
  return AI_PROVIDERS.find((item) => item.baseUrl.replace(/\/$/, '') === url) ?? AI_PROVIDERS[0];
}

function isOpenAiHostedModel(model: string) {
  if (model.startsWith('openai/gpt-oss')) return false;
  return /^(gpt-4|gpt-3\.5|gpt-3|o1-|o3-|chatgpt)/i.test(model);
}

export function resolveAiSettings(input: { apiKey?: string; baseUrl?: string; model?: string }) {
  const apiKey = (input.apiKey ?? '').trim();
  const fromKey = apiKey.startsWith('gsk_')
    ? AI_PROVIDERS.find((item) => item.id === 'groq')
    : apiKey.startsWith('AIza')
      ? AI_PROVIDERS.find((item) => item.id === 'gemini')
      : undefined;
  const provider = fromKey ?? matchAiProvider(input.baseUrl);
  let model = (input.model ?? '').trim() || provider.model;
  if (provider.id === 'groq' && isOpenAiHostedModel(model)) {
    model = provider.model;
  }
  return { apiKey, baseUrl: provider.baseUrl, model, providerId: provider.id };
}
