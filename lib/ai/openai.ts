type JsonSchema = Record<string, unknown>;

type OpenAIResponse = {
  error?: { message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type OpenAIFileResponse = {
  id?: string;
  error?: { message?: string } | null;
};

function apiKey() {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다. Vercel Environment Variables에 추가해주세요.");
  }
  return value;
}

function getOutputText(payload: OpenAIResponse) {
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

function friendlyOpenAIError(status: number, message?: string) {
  const raw = message || `OpenAI API 오류 (${status})`;
  const lower = raw.toLowerCase();
  if (status === 429 && (lower.includes("quota") || lower.includes("billing"))) {
    return "OpenAI API 사용 한도가 부족합니다. OpenAI Platform의 Billing/크레딧을 확인해주세요.";
  }
  if (status === 401) return "OpenAI API 키가 올바르지 않습니다. Vercel의 OPENAI_API_KEY를 확인해주세요.";
  return raw;
}

export function aiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
}

async function parseStructured<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(friendlyOpenAIError(response.status, payload.error?.message));
  }

  const outputText = getOutputText(payload);
  if (!outputText) throw new Error("AI 응답에서 결과 텍스트를 찾지 못했습니다.");

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error("AI 결과를 JSON으로 해석하지 못했습니다. 다시 시도해주세요.");
  }
}

export async function structuredAI<T>({
  name,
  schema,
  instructions,
  input,
  maxOutputTokens = 5000,
}: {
  name: string;
  schema: JsonSchema;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel(),
      store: false,
      max_output_tokens: maxOutputTokens,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    }),
  });

  return parseStructured<T>(response);
}

export async function uploadOpenAIUserFile(file: Blob, filename: string) {
  const formData = new FormData();
  formData.append("purpose", "user_data");
  formData.append("file", file, filename);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: formData,
  });
  const payload = (await response.json()) as OpenAIFileResponse;
  if (!response.ok || !payload.id) {
    throw new Error(friendlyOpenAIError(response.status, payload.error?.message));
  }
  return payload.id;
}

export async function deleteOpenAIFile(fileId: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
  } catch {
    // 분석이 이미 끝났다면 OpenAI 임시 파일 정리 실패는 사용자 작업을 막지 않는다.
  }
}

export async function structuredAIWithFile<T>({
  name,
  schema,
  instructions,
  input,
  fileId,
  maxOutputTokens = 9000,
}: {
  name: string;
  schema: JsonSchema;
  instructions: string;
  input: string;
  fileId: string;
  maxOutputTokens?: number;
}): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel(),
      store: false,
      max_output_tokens: maxOutputTokens,
      instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: input },
            { type: "input_file", file_id: fileId, detail: "auto" },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    }),
  });

  return parseStructured<T>(response);
}
