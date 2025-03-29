import { sendProxyMessage } from '../services/aiService';

export async function improveText(text) {
  const messages = [
    {
      role: 'user',
      content: `Your task is to take the HTML text provided and improve it while preserving all HTML formatting, including links, bullet points, and other markup. Rewrite it into a clear, grammatically correct version while preserving the original meaning as closely as possible. Correct any spelling mistakes, punctuation errors, verb tense issues, word choice problems, and other grammatical mistakes.Maintain the original HTML structure and only improve the content and return the result as valid HTML.

Here is the text to improve:
${text}
Return only the edited text. Do not wrap your response in quotes. Do not offer anything else other than the edited text in the response.`
    }
  ];

  // Create custom instruction for text improvement
  const customInstruction = {
    content: `You are an expert editor who improves text while preserving HTML formatting. 
    Focus only on improving grammar, spelling, clarity, and readability.
    Return only the improved text with no additional commentary.
    Return only the edited text. Do not wrap your response in quotes. Do not offer anything else other than the edited text in the response.`
  };

  try {
    // Use sendProxyMessage instead of sendAnthropicMessage to leverage encryption
    const response = await sendProxyMessage(
      messages,
      'Haiku', // Use Claude Haiku model
      null, // Use the proxy key from localStorage
      null,
      null // No streaming for text improvement
    );

    if (!response || !response.content) {
      throw new Error('Invalid response format from AI service');
    }

    // Extract the improved text from the response
    const improvedText = response.content;

    // Clean up the response
    return improvedText
      .replace(/^"/, '')
      .replace(/"$/, '')
      .replace(/^Here'?s the improved text:?\s*/i, '')
      .trim();
  } catch (error) {
    console.error('Error improving text:', error);
    throw error;
  }
}
