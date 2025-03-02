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

    // Create a simplified request body with just the model name
    const requestBody = {
      model,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
    };

    const response = await fetch(`${proxyUrl.replace(/\/api\/request\/?$/, '')}/api/request`, {
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
      provider: 'deepseek',
      model,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
      temperature: getAISettings().deepseek.modelSettings[model]?.temperature,
    };

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
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsedData = JSON.parse(data);
                
                // Handle regular content
                if (parsedData.content) {
                  onStream(parsedData.content, 'content');
                }
                
                // Handle reasoning content for deepseek-reasoner
                if (parsedData.reasoning_content) {
                  onStream(parsedData.reasoning_content, 'reasoning');
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
    const responseMessage = {
      role: 'assistant',
      content: data.content
    };

    // Include reasoning content in non-streaming response if present
    if (data.reasoning_content) {
      responseMessage.reasoning_content = data.reasoning_content;
    }

    return responseMessage;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

const sendAnthropicMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const proxyUrl = localStorage.getItem('proxy_url');
    const proxyKey = localStorage.getItem('proxy_key');

    if (!proxyUrl || !proxyKey) {
      throw new Error('Proxy configuration not found. Please configure the proxy URL and API key.');
    }

    const formattedMessages = messages.map(({ role, content }) => {
      const formattedContent = Array.isArray(content) ? content : [{ type: 'text', text: content }];

      if (Array.isArray(content)) {
        return {
          role: role === 'assistant' ? 'assistant' : 'user',
          content: content.map(item => item)
        };
      }

      return {
        role: role === 'assistant' ? 'assistant' : 'user',
        content: formattedContent
      };
    });

    const requestBody = {
      provider: 'anthropic',
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
    };

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': proxyKey
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    if (onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              try {
                const { content, type } = JSON.parse(data);
                if (content) {
                  if (type === 'thinking') {
                    onStream(content, 'thinking');
                  } else {
                    onStream(content, 'text');
                  }
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
    const content = Array.isArray(data.content) ? data.content : [{ type: 'text', content: data.content }];

    return {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('API error:', error);
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

const sendProxyMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    console.log('sendProxyMessage called with model:', model);
    const proxyUrl = localStorage.getItem('proxy_url');
    // Use the provided apiKey if available, otherwise get it from localStorage
    const proxyKey = apiKey || localStorage.getItem('proxy_key');

    console.log('Proxy URL:', proxyUrl);
    console.log('Proxy Key exists:', !!proxyKey);

    if (!proxyUrl || !proxyKey) {
      throw new Error('Proxy configuration not found. Please configure the proxy URL and API key.');
    }

    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    // Create a simplified request body with just the model name
    const requestBody = {
      model,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
    };

    console.log('Request URL:', `${proxyUrl.replace(/\/api\/request\/?$/, '')}/api/request`);
    console.log('Request body:', JSON.stringify(requestBody));

    const response = await fetch(`${proxyUrl.replace(/\/api\/request\/?$/, '')}/api/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': proxyKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);

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

const getAvailableProviders = async () => {
  try {
    console.log('getAvailableProviders called');
    const proxyUrl = localStorage.getItem('proxy_url');
    const proxyKey = localStorage.getItem('proxy_key');
    
    console.log('Proxy URL:', proxyUrl);
    console.log('Proxy Key exists:', !!proxyKey);
    
    if (!proxyUrl || !proxyKey) {
      console.log('Falling back to original implementation - proxy config missing');
      // Fall back to the original implementation if proxy URL is not configured
      const settings = getAISettings();
      return Object.entries(settings)
        .filter(([_, config]) => config.key && config.models.length > 0)
        .map(([name, config]) => ({
          name,
          models: config.models,
          selectedModel: config.selectedModel,
        }));
    }
    
    // Construct the models endpoint URL
    const modelsEndpoint = `${proxyUrl.replace(/\/api\/request\/?$/, '')}/api/models`;
    console.log('Models endpoint:', modelsEndpoint);
    
    // Fetch available models from the API with the API key in headers
    console.log('Fetching models...');
    const response = await fetch(modelsEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': proxyKey,
      },
    });
    
    console.log('Models response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const models = await response.json();
    console.log('Models received:', models);
    
    // Create a provider with the fetched models
    const provider = [{
      name: 'proxy',
      models: models.map(model => ({
        id: model.nickname,
        name: model.nickname
      })),
      selectedModel: models.length > 0 ? models[0].nickname : '',
    }];
    
    console.log('Returning provider:', provider);
    return provider;
  } catch (error) {
    console.error('Error fetching models:', error);
    // Fall back to the original implementation in case of error
    const settings = getAISettings();
    return Object.entries(settings)
      .filter(([_, config]) => config.key && config.models.length > 0)
      .map(([name, config]) => ({
        name,
        models: config.models,
        selectedModel: config.selectedModel,
      }));
  }
};

export {
  sendOpenAIMessage,
  sendGroqMessage,
  sendDeepSeekMessage,
  sendAnthropicMessage,
  sendGeminiMessage,
  sendProxyMessage,
  getAISettings,
  getAvailableProviders,
};
