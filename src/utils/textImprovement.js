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
                "You are an expert in writing and grammar, tasked with improving the clarity and correctness of a given text. Your goal is to rewrite the provided text, making it grammatically correct and well-formatted while preserving its original meaning.\n\nHere is the text to rewrite:\n\n<text_to_rewrite>\n" +
                text +
                "\n</text_to_rewrite>\n\nPlease follow these steps to improve the text:\n\n1. Read and analyze the provided text carefully.\n\n2. In your internal analysis, consider the following aspects:\n   - Spelling mistakes\n   - Punctuation errors\n   - Verb tense issues\n   - Word choice problems\n   - Other grammatical mistakes\n   - Formatting needs (e.g., paragraphs, bullet points)\n   - Tone and style of the original text\n\n3. List out specific examples of errors found in the text.\n\n4. Plan your approach for rewriting the text, including any necessary reorganization.\n\n5. Create a brief outline of the rewritten text.\n\n6. Rewrite the text, making the necessary corrections and improvements. Ensure that you:\n   - Correct all spelling, punctuation, and grammatical errors\n   - Improve clarity and readability\n   - Use appropriate formatting, including paragraphs and bullet points where needed\n   - Preserve the original meaning of the text\n   - Maintain the original tone and style as much as possible\n\n7. Review your rewritten version to ensure it accurately reflects the content and intent of the original text.\n\n8. Present only the final, improved text in your response. Do not include any commentary, explanations, or notes about the changes made.",
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
