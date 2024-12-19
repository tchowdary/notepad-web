const sendOpenAIMessage = async (messages, model, apiKey) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

const sendAnthropicMessage = async (messages, model, apiKey) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model,
        messages: messages.map(({ role, content }) => ({
          role: role === 'assistant' ? 'assistant' : 'user',
          content,
        })),
        max_tokens: 1024,
        temperature:0
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      role: 'assistant',
      content: data.content[0].text,
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw error;
  }
};

const getAISettings = () => {
  const settings = localStorage.getItem('ai_settings');
  if (!settings) {
    return {
      openai: { key: '', models: [], selectedModel: '' },
      anthropic: { key: '', models: [], selectedModel: '' },
    };
  }
  return JSON.parse(settings);
};

const getAvailableProviders = () => {
  const settings = getAISettings();
  return Object.entries(settings)
    .filter(([_, config]) => config.key && config.models.length > 0)
    .map(([name, config]) => ({
      name,
      models: config.models,
      selectedModel: config.selectedModel,
    }));
};

export {
  sendOpenAIMessage,
  sendAnthropicMessage,
  getAISettings,
  getAvailableProviders,
};
