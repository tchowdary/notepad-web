import { sendAnthropicMessage } from '../services/aiService';

export async function improveText(text) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Your task is to take the HTML text provided and improve it while preserving all HTML formatting, including links, bullet points, and other markup. Rewrite it into a clear, grammatically correct version while preserving the original meaning as closely as possible. Correct any spelling mistakes, punctuation errors, verb tense issues, word choice problems, and other grammatical mistakes.Maintain the original HTML structure and only improve the content and return the result as valid HTML.

Here is the text to improve:
${text}
Return only the edited text. Do not wrap your response in quotes. Do not offer anything else other than the edited text in the response.`
        }
      ]
    }
  ];

  try {
    const response = await sendAnthropicMessage(
      messages,
      'Haiku',
      null,
      null,
      null
    );

    // Debug response structure
    //console.log('Response from sendAnthropicMessage:', JSON.stringify(response, null, 2));

    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      throw new Error('Invalid response format from AI service');
    }

    // Extract text from the first content block
    const improvedText = response.content[0].content;

    if (typeof improvedText !== 'string') {
      throw new Error('Invalid content format in AI service response');
    }

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
