import { getEvolutionEnv } from "@/lib/env";

type EvolutionInstanceResponse = {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: string;
  qrcode?: {
    base64: string;
  };
};

type EvolutionConnectionState = {
  instance: {
    instanceName: string;
    state: string;
  };
};

type EvolutionQRCodeResponse = {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
};

type EvolutionSendResponse = {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  status: string;
};

async function evolutionFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey?: string;
  } = {},
): Promise<T> {
  const env = getEvolutionEnv();
  const { method = "GET", body, apiKey } = options;

  const response = await fetch(`${env.EVOLUTION_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey ?? env.EVOLUTION_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Evolution API error ${response.status} on ${method} ${path}: ${errorText}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function createEvolutionInstance(
  instanceName: string,
  token: string,
  webhookUrl?: string,
): Promise<EvolutionInstanceResponse> {
  const body: Record<string, unknown> = {
    instanceName,
    token,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };

  if (webhookUrl) {
    body.webhook = {
      url: webhookUrl,
      byEvents: true,
      base64: false,
      events: ["CONNECTION_UPDATE"],
    };
  }

  return evolutionFetch<EvolutionInstanceResponse>("/instance/create", {
    method: "POST",
    body,
  });
}

export async function deleteEvolutionInstance(
  instanceName: string,
): Promise<void> {
  await evolutionFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
}

/**
 * Register (or update) a webhook URL on an existing Evolution API instance.
 * Useful when an instance was created before webhook support was added.
 */
export async function setInstanceWebhook(
  instanceName: string,
  webhookUrl: string,
): Promise<void> {
  await evolutionFetch(
    `/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: {
        url: webhookUrl,
        byEvents: true,
        base64: false,
        events: ["CONNECTION_UPDATE"],
      },
    },
  );
}

export async function getInstanceConnectionState(
  instanceName: string,
): Promise<string> {
  const data = await evolutionFetch<EvolutionConnectionState>(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
  );
  return data.instance?.state ?? "close";
}

export async function getInstanceQRCode(
  instanceName: string,
): Promise<EvolutionQRCodeResponse> {
  return evolutionFetch<EvolutionQRCodeResponse>(
    `/instance/connect/${encodeURIComponent(instanceName)}`,
  );
}

export async function sendTextMessage(
  instanceName: string,
  remoteJid: string,
  text: string,
): Promise<EvolutionSendResponse> {
  return evolutionFetch<EvolutionSendResponse>(
    `/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: {
        number: remoteJid,
        text,
      },
    },
  );
}
