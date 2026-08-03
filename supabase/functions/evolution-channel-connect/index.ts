import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_URL =
  'https://n8n-n8n.rh3fr2.easypanel.host/webhook/evolution';
const DEFAULT_EVOLUTION_HOST =
  'n8n-evolution-api.rh3fr2.easypanel.host';
const REQUEST_TIMEOUT_MS = 12_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ConnectPayload = {
  name?: string;
  url?: string;
  instance?: string;
  apiKey?: string;
};

type JsonRecord = Record<string, unknown>;

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(
  body: JsonRecord,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function normalizeEvolutionUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(
      400,
      'INVALID_EVOLUTION_URL',
      'A URL da Evolution API é inválida.',
    );
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password
  ) {
    throw new HttpError(
      400,
      'INVALID_EVOLUTION_URL',
      'Use uma URL HTTPS válida, sem usuário ou senha.',
    );
  }

  const configuredHosts = (
    Deno.env.get('EVOLUTION_ALLOWED_HOSTS') ||
    DEFAULT_EVOLUTION_HOST
  )
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!configuredHosts.includes(parsed.hostname.toLowerCase())) {
    throw new HttpError(
      400,
      'EVOLUTION_HOST_NOT_ALLOWED',
      'Este servidor Evolution API não está autorizado.',
    );
  }

  return `${parsed.protocol}//${parsed.host}`;
}

function validateInstance(value: string): string {
  const instance = value.trim();
  if (!/^[a-zA-Z0-9._-]{2,80}$/.test(instance)) {
    throw new HttpError(
      400,
      'INVALID_INSTANCE',
      'O nome da instância contém caracteres inválidos.',
    );
  }
  return instance;
}

function validateUuid(value: unknown): string {
  const uuid = String(value || '');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    throw new HttpError(
      403,
      'TENANT_NOT_FOUND',
      'O usuário autenticado não possui um tenant válido.',
    );
  }
  return uuid;
}

async function evolutionRequest(
  url: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: JsonRecord | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: apiKey,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
    const body = await response.json().catch(() => null);
    return { response, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(
        504,
        'EVOLUTION_TIMEOUT',
        'A Evolution API não respondeu dentro do tempo limite.',
      );
    }
    throw new HttpError(
      502,
      'EVOLUTION_UNREACHABLE',
      'Não foi possível alcançar a Evolution API.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function evolutionFailure(
  status: number,
  fallback: string,
): never {
  if (status === 401 || status === 403) {
    throw new HttpError(
      422,
      'INVALID_EVOLUTION_CREDENTIALS',
      'A Evolution API recusou a chave informada.',
    );
  }
  if (status === 404) {
    throw new HttpError(
      422,
      'EVOLUTION_INSTANCE_NOT_FOUND',
      'A instância informada não existe na Evolution API.',
    );
  }
  throw new HttpError(502, 'EVOLUTION_ERROR', fallback);
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Método não permitido.',
      },
      405,
    );
  }

  try {
    const authorization = request.headers.get('Authorization') || '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) {
      throw new HttpError(
        401,
        'UNAUTHENTICATED',
        'Faça login novamente para conectar o canal.',
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new HttpError(
        500,
        'SERVER_CONFIGURATION_ERROR',
        'A função não está configurada corretamente.',
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      throw new HttpError(
        401,
        'UNAUTHENTICATED',
        'Sua sessão expirou. Faça login novamente.',
      );
    }

    const tenantId = validateUuid(
      user.app_metadata?.tenant_id ||
        user.user_metadata?.tenant_id,
    );
    const payload = (await request.json().catch(() => null)) as
      | ConnectPayload
      | null;

    const name = String(payload?.name || '').trim();
    const apiKey = String(payload?.apiKey || '').trim();
    const evolutionUrl = normalizeEvolutionUrl(
      String(payload?.url || ''),
    );
    const instance = validateInstance(
      String(payload?.instance || ''),
    );

    if (!name || name.length > 120) {
      throw new HttpError(
        400,
        'INVALID_CHANNEL_NAME',
        'Informe um nome válido para o canal.',
      );
    }
    if (!apiKey || apiKey.length > 500) {
      throw new HttpError(
        400,
        'INVALID_API_KEY',
        'Informe a API key da Evolution.',
      );
    }

    const stateResult = await evolutionRequest(
      `${evolutionUrl}/instance/connectionState/${encodeURIComponent(instance)}`,
      apiKey,
    );
    if (!stateResult.response.ok) {
      evolutionFailure(
        stateResult.response.status,
        'A Evolution API não conseguiu consultar a instância.',
      );
    }

    const stateBody = stateResult.body || {};
    const stateContainer =
      (stateBody.instance as JsonRecord | undefined) || stateBody;
    const connectionState = String(
      stateContainer.state ||
        stateContainer.status ||
        stateContainer.connectionStatus ||
        'unknown',
    ).toLowerCase();

    const webhookResult = await evolutionRequest(
      `${evolutionUrl}/webhook/set/${encodeURIComponent(instance)}`,
      apiKey,
      {
        method: 'POST',
        body: JSON.stringify({
          enabled: true,
          url: WEBHOOK_URL,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'SEND_MESSAGE_UPDATE',
              'GROUPS_UPSERT',
              'GROUP_UPDATE',
              'GROUP_PARTICIPANTS_UPDATE',
            ],
          headers: {},
          base64: false,
        }),
      },
    );
    if (!webhookResult.response.ok) {
      evolutionFailure(
        webhookResult.response.status,
        'A Evolution API recusou a configuração do webhook.',
      );
    }

    const verifyResult = await evolutionRequest(
      `${evolutionUrl}/webhook/find/${encodeURIComponent(instance)}`,
      apiKey,
    );
    if (!verifyResult.response.ok) {
      evolutionFailure(
        verifyResult.response.status,
        'Não foi possível confirmar o webhook configurado.',
      );
    }

    const verifyBody = verifyResult.body || {};
    const webhookConfig =
      (verifyBody.webhook as JsonRecord | undefined) || verifyBody;
    const configuredUrl = String(webhookConfig.url || '').replace(
      /\/+$/,
      '',
    );
    if (
      webhookConfig.enabled === false ||
      configuredUrl !== WEBHOOK_URL
    ) {
      throw new HttpError(
        502,
        'WEBHOOK_VERIFICATION_FAILED',
        'A Evolution API não confirmou o webhook correto.',
      );
    }

    const status =
      connectionState === 'open' ? 'connected' : 'disconnected';
    const channelValues = {
      tenant_id: tenantId,
      name,
      provider: 'evolution',
      status,
      url: evolutionUrl,
      instance,
      api_key: apiKey,
      webhook_url: WEBHOOK_URL,
      updated_at: new Date().toISOString(),
    };

    const { data: existingChannel, error: lookupError } =
      await supabase
        .from('channels')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('provider', 'evolution')
        .eq('instance', instance)
        .maybeSingle();

    if (lookupError) {
      throw new HttpError(
        500,
        'CHANNEL_LOOKUP_FAILED',
        'Não foi possível consultar o canal no CRM.',
      );
    }

    const saveQuery = existingChannel?.id
      ? supabase
          .from('channels')
          .update(channelValues)
          .eq('id', existingChannel.id)
          .eq('tenant_id', tenantId)
      : supabase.from('channels').insert(channelValues);

    const { data: channel, error: saveError } = await saveQuery
      .select(
        'id,name,provider,status,url,instance,webhook_url,tenant_id,created_at,updated_at',
      )
      .single();

    if (saveError || !channel) {
      throw new HttpError(
        500,
        'CHANNEL_SAVE_FAILED',
        'A API foi validada, mas o canal não pôde ser salvo no CRM.',
      );
    }

    return jsonResponse({
      success: true,
      connected: status === 'connected',
      state: connectionState,
      webhookConfigured: true,
      webhookUrl: WEBHOOK_URL,
      channel,
      message:
        status === 'connected'
          ? 'Evolution API conectada e webhook configurado.'
          : 'Credenciais válidas e webhook configurado, mas o WhatsApp está desconectado.',
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    console.error('[evolution-channel-connect]', error);
    return jsonResponse(
      {
        success: false,
        code: 'UNEXPECTED_ERROR',
        message: 'Não foi possível concluir a conexão.',
      },
      500,
    );
  }
}

export default {
  fetch: handleRequest,
};
