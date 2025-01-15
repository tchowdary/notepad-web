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
                "Your task is to take the HTML text provided and improve it while preserving all HTML formatting, including links, bullet points, and other markup. Maintain the original HTML structure and only improve the content. Return the result as valid HTML.\n\nHere is the text to improve:\n\n<text_to_improve>\n" +
                text +
                "\n</text_to_improve>\n",
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
