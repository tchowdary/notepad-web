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
      model: "claude-3-5-haiku-latest",
      max_tokens: 2024,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Your task is to take the HTML text provided and improve it while preserving all HTML formatting, including links, bullet points, and other markup. Rewrite it into a clear, grammatically correct version while preserving the original meaning as closely as possible. Correct any spelling mistakes, punctuation errors, verb tense issues, word choice problems, and other grammatical mistakes.Maintain the original HTML structure and only improve the content and return the result as valid HTML.\n\nHere is the text to improve:\n" +
                text +
                "\nReturn only the edited text. Do not wrap your response in quotes. Do not offer anything else other than the edited text in the response.",
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
