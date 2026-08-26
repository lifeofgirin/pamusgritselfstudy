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

function getOutputText(payload: OpenAIResponse) {
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

export function aiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다. Vercel Environment Variables에 추가해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  const payload = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI API 오류 (${response.status})`);
  }

  const outputText = getOutputText(payload);
  if (!outputText) throw new Error("AI 응답에서 결과 텍스트를 찾지 못했습니다.");

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error("AI 결과를 JSON으로 해석하지 못했습니다. 다시 시도해주세요.");
  }
}
