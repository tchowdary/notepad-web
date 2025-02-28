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
    const proxyUrl = localStorage.getItem('proxy_url');
    const proxyKey = localStorage.getItem('proxy_key');

    if (!proxyUrl || !proxyKey) {
      throw new Error('Proxy configuration not found. Please configure the proxy URL and API key.');
    }

    const selectedModel = model || localStorage.getItem('openai_model') || 'gpt-4o-mini';

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': proxyKey,
      },
      body: JSON.stringify({
        provider: 'openai',
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { text: data.content };
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
