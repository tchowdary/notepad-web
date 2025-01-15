export async function improveText(text) {
  const apiKey = localStorage.getItem("anthropic_api_key");
  if (!apiKey) {
    throw new Error("API key not found");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Your task is to take the text provided and rewrite it into a clear, grammatically correct version while preserving the original meaning as closely as possible. Correct any spelling mistakes, punctuation errors, verb tense issues, word choice problems, and other grammatical mistakes. Skip the commentary, and only rewrite the text.\n\nHere is the text to rewrite:\n\n<text_to_rewrite>\n" +
                text +
                "\n</text_to_rewrite>\n",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "API request failed");
  }

  const data = await response.json();
  return data.content[0].text
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/^Here'?s the improved text:?\s*/i, "")
    .trim();
}
