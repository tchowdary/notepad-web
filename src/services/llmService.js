import OpenAI from 'openai';

const getOpenAIClient = () => {
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set your API key in settings.');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

export const generateText = async ({ model, system, prompt }) => {
  try {
    const openai = getOpenAIClient();
    const selectedModel = model || localStorage.getItem('openai_model') || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: selectedModel,
    });

    return { text: completion.choices[0].message.content };
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
};

export const processTranscription = async (transcription) => {
  try {
    const openai = getOpenAIClient();
    const selectedModel = localStorage.getItem('openai_model') || 'gpt-4o';

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that processes transcribed text and provides meaningful responses."
        },
        {
          role: "user",
          content: transcription
        }
      ],
      model: selectedModel,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error processing transcription:', error);
    throw error;
  }
};
