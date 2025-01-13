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
