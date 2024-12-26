const sendOpenAIMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messagePayload.map(({ role, content }) => ({ role, content })),
        stream: Boolean(onStream),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(5));
              const content = json.choices[0]?.delta?.content;
              if (content) onStream(content);
            } catch (e) {
              console.error('Error parsing stream:', e);
            }
          }
        }
      }
      return { role: 'assistant', content: '' };
    }

    const data = await response.json();
    return data.choices[0].message;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

const sendAnthropicMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const formattedMessages = messages.map(({ role, content }) => {
      const formattedContent = Array.isArray(content) ? content : [{ type: 'text', text: content }];

      if (Array.isArray(content)) {
        return {
          role: role === 'assistant' ? 'assistant' : 'user',
          content: content.map(item => {
            if (item.type === 'pdf') {
              return {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: item.data
                },
                cache_control: {
                  type: 'ephemeral'
                }
              };
            }
            return item;
          })
        };
      }

      return {
        role: role === 'assistant' ? 'assistant' : 'user',
        content: formattedContent
      };
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        system: customInstruction ? customInstruction.content : undefined,
        max_tokens: 1024,
        temperature: 0,
        stream: Boolean(onStream),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Anthropic API error: ${response.statusText}`);
    }

    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(5));
              if (json.type === 'content_block_delta' && json.delta?.text) {
                onStream(json.delta.text);
              }
            } catch (e) {
              console.error('Error parsing stream:', e);
            }
          }
        }
      }
      return { role: 'assistant', content: '' };
    }

    const data = await response.json();
    return {
      role: 'assistant',
      content: data.content[0].text,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw error;
  }
};

const sendGeminiMessage = async (messages, model, apiKey, customInstruction) => {
  try {
    const messagePayload = messages.map(({ role, content }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text: Array.isArray(content) ? content[0].text : content }]
    }));

    if (customInstruction) {
      messagePayload.unshift({ role: 'user', parts: [{ text: customInstruction.content }] });
    }

    const generateRequestBody = (model, messagePayload) => {
      const baseConfig = {
        contents: messagePayload,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };
    
      // Only add tools for the specific model
      if (model === 'gemini-2.0-flash-exp') {
        baseConfig.tools = {
          "google_search": {}
        };
        baseConfig.generationConfig.response_modalities = ["TEXT"];
      }
    
      return baseConfig;
    };

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(generateRequestBody(model, messagePayload)),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    return {
      role: 'assistant',
      content: data.candidates[0].content.parts[0].text,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

const getAISettings = () => {
  const settings = localStorage.getItem('ai_settings');
  if (!settings) {
    return {
      openai: { key: '', models: [], selectedModel: '' },
      anthropic: { key: '', models: [], selectedModel: '' },
      gemini: { key: '', models: [], selectedModel: '' },
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
  sendGeminiMessage,
  getAISettings,
  getAvailableProviders,
};
