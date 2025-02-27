const sendOpenAIMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const proxyUrl = localStorage.getItem('proxy_url');
    const proxyKey = localStorage.getItem('proxy_key');

    if (!proxyUrl || !proxyKey) {
      throw new Error('Proxy configuration not found. Please configure the proxy URL and API key.');
    }

    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    // Add developer message for o3-mini model to enable markdown formatting
    if (model === 'o3-mini') {
      messagePayload.unshift({ role: 'system', content: 'Formatting re-enabled' });
    }

    const requestBody = {
      provider: 'openai',
      model,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
    };

    // Add temperature if configured
    const temperature = getAISettings().openai.modelSettings[model]?.temperature;
    if (typeof temperature === 'number') {
      requestBody.temperature = temperature;
    }

    // Add reasoning_effort if configured
    const reasoningEffort = getAISettings().openai.modelSettings[model]?.reasoningEffort;
    if (reasoningEffort && reasoningEffort !== 'none') {
      requestBody.reasoning_effort = reasoningEffort;
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': proxyKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              try {
                const { content } = JSON.parse(data);
                if (content) {
                  onStream(content);
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream reading error:', error);
        throw error;
      } finally {
        reader.releaseLock();
      }

      return { role: 'assistant', content: '' };
    }

    const data = await response.json();
    return { role: 'assistant', content: data.content };
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

const sendGroqMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messagePayload.map(({ role, content }) => ({ role, content })),
        stream: Boolean(onStream),
        temperature: getAISettings().groq.modelSettings[model]?.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
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
    return {
      role: 'assistant',
      content: data.choices[0].message.content,
    };
  } catch (error) {
    console.error('Error in Groq API call:', error);
    throw error;
  }
};

const sendDeepSeekMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    const bodyConfig = {
      model,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
      temperature: getAISettings().deepseek.modelSettings[model]?.temperature,
    };

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyConfig),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
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
              const reasoningContent = json.choices[0]?.delta?.reasoning_content;
              if (content) onStream(content);
              if (reasoningContent) onStream(reasoningContent);
            } catch (e) {
              console.error('Error parsing stream:', e);
            }
          }
        }
      }
      return { role: 'assistant', content: '' };
    }

    const data = await response.json();
    const responseMessage = {
      role: 'assistant',
      content: data.choices[0].message.content,
    };

    if (model === 'deepseek-reasoner' && data.choices[0].message.reasoning_content) {
      responseMessage.reasoning_content = data.choices[0].message.reasoning_content;
    }

    return responseMessage;
  } catch (error) {
    console.error('DeepSeek API error:', error);
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
        max_tokens: 8001,
        temperature: getAISettings().anthropic.modelSettings[model]?.temperature,
        stream: Boolean(onStream),
        ...(getAISettings().anthropic.modelSettings[model]?.thinking && {
          thinking: {
            type: 'enabled',
            budget_tokens: getAISettings().anthropic.modelSettings[model]?.budget_tokens || 16000
          }
        })
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
              if (json.type === 'content_block_delta') {
                if (json.delta?.thinking) {
                  onStream(json.delta.thinking, 'thinking');
                }
                if (json.delta?.text) {
                  onStream(json.delta.text, 'text');
                }
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
    const content = [];
    
    // Process each content block
    for (const block of data.content) {
      if (block.type === 'thinking') {
        content.push({
          type: 'thinking',
          content: block.thinking,
          signature: block.signature
        });
      } else if (block.type === 'text') {
        content.push({
          type: 'text',
          content: block.text
        });
      }
    }

    return {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw error;
  }
};

const sendGeminiMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const proxyUrl = localStorage.getItem('proxy_url');
    const proxyKey = localStorage.getItem('proxy_key');

    if (!proxyUrl || !proxyKey) {
      throw new Error('Proxy configuration not found. Please configure the proxy URL and API key.');
    }

    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    const requestBody = {
      provider: 'gemini',
      model,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
    };

    // Add temperature if configured
    const temperature = getAISettings().gemini.modelSettings[model]?.temperature;
    if (typeof temperature === 'number') {
      requestBody.temperature = temperature;
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': proxyKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              try {
                const { content } = JSON.parse(data);
                if (content) {
                  onStream(content);
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream reading error:', error);
        throw error;
      } finally {
        reader.releaseLock();
      }

      return { role: 'assistant', content: '' };
    }

    const data = await response.json();
    return { role: 'assistant', content: data.content };
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

const getAISettings = () => {
  const settings = localStorage.getItem('ai_settings');
  if (!settings) {
    return {
      openai: { key: '', models: [], selectedModel: '', temperature: 0, modelSettings: {} },
      anthropic: { key: '', models: [], selectedModel: '', temperature: 0, modelSettings: {} },
      gemini: { key: '', models: [], selectedModel: '', temperature: 0, modelSettings: {} },
      deepseek: { key: '', models: [], selectedModel: '', temperature: 0, modelSettings: {} },
      groq: { key: '', models: [], selectedModel: '', temperature: 0, modelSettings: {} },
    };
  }
  
  // Parse the settings
  const parsedSettings = JSON.parse(settings);
  
  // Ensure all providers have modelSettings initialized
  const providers = ['openai', 'anthropic', 'gemini', 'deepseek', 'groq'];
  providers.forEach(provider => {
    if (!parsedSettings[provider]) {
      parsedSettings[provider] = { key: '', models: [], selectedModel: '', temperature: 0, modelSettings: {} };
    }
    if (!parsedSettings[provider].modelSettings) {
      parsedSettings[provider].modelSettings = {};
    }
  });
  
  return parsedSettings;
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
  sendGroqMessage,
  sendDeepSeekMessage,
  sendAnthropicMessage,
  sendGeminiMessage,
  getAISettings,
  getAvailableProviders,
};
