import { prepareEncryptedPayload, decryptPayload, isEncryptionEnabled, getEncryptionKey } from '../utils/encryptionUtils';

const getProxyConfig = () => {
  const proxyUrl = localStorage.getItem('proxy_url');
  const proxyKey = localStorage.getItem('proxy_key');
  const specialUrl = localStorage.getItem('special_proxy_url');
  
  if (!proxyUrl || !proxyKey) {
    throw new Error('Proxy configuration not found. Please configure the proxy URL and API key.');
  }
  
  return { proxyUrl, proxyKey, specialUrl };
};

// Helper function to get the endpoint URL
const getProxyEndpoint = (endpoint) => {
  const { proxyUrl } = getProxyConfig();
  return `${proxyUrl}${endpoint}`;
};

const sendOpenAIMessage = async (messages, model, apiKey, customInstruction, onStream) => {
  try {
    const { proxyKey } = getProxyConfig();
    const requestEndpoint = getProxyEndpoint('/api/request');

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

    const response = await fetch(requestEndpoint, {
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
    const { proxyKey } = getProxyConfig();
    const requestEndpoint = getProxyEndpoint('/api/request');

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

    const response = await fetch(requestEndpoint, {
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
    const { proxyKey } = getProxyConfig();
    const requestEndpoint = getProxyEndpoint('/api/request');

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

    const response = await fetch(requestEndpoint, {
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
    const { proxyKey } = getProxyConfig();
    const requestEndpoint = getProxyEndpoint('/api/request');

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

    const response = await fetch(requestEndpoint, {
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
    //console.log('sendProxyMessage called with model:', model);
    
    // Use the provided apiKey if available, otherwise get it from the proxy config
    const proxyKey = apiKey || getProxyConfig().proxyKey;
    let requestEndpoint = getProxyEndpoint('/api/request');
    const specialUrl = getProxyConfig().specialUrl;
    
    //console.log('Request endpoint:', requestEndpoint);
    //console.log('Proxy Key exists:', !!proxyKey);

    const messagePayload = [...messages];
    if (customInstruction) {
      messagePayload.unshift({ role: 'system', content: customInstruction.content });
    }

    const geminiModel = 'gemini-2.5-flash-preview-04-17';
    // If model is 'Flash-Max', always use the Gemini model
    let effectiveModel = model === 'Flash-Max' ? geminiModel : model;
    
    // Special endpoint for gemini-2.5-flash-preview-04-17
    if (effectiveModel === geminiModel) {
      requestEndpoint = specialUrl;
      onStream = false;
    }

    // Create a request body with the model name and messages
    const requestBody = {
      model: effectiveModel,
      messages: messagePayload.map(({ role, content }) => ({ role, content })),
      stream: Boolean(onStream),
    };

    //conso le.log('Request body:', JSON.stringify(requestBody));

    // Check if encryption is enabled
    const encryptionEnabled = isEncryptionEnabled();
    const encryptionKey = getEncryptionKey();
    
    // Create headers object
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': proxyKey,
    };

    // Prepare the final request body - encrypt if encryption is enabled
    const finalRequestBody = encryptionEnabled && encryptionKey 
      ? prepareEncryptedPayload(requestBody, encryptionKey)
      : requestBody;

    const response = await fetch(requestEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(finalRequestBody),
    });

    //console.log('Response status:', response.status);

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

          const chunk = decoder.decode(value);
          buffer += chunk;
          
          // Process complete lines from the buffer
          let lineEnd;
          while ((lineEnd = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, lineEnd);
            buffer = buffer.slice(lineEnd + 1);
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                break;
              }
              
              try {
                // Parse the stream data
                const parsedData = JSON.parse(data);
                //console.log('Parsed stream data:', parsedData);
                
                // Check if the response is encrypted and decrypt if needed
                if (encryptionEnabled && encryptionKey && parsedData.encrypted) {
                  // Decrypt the encrypted chunk
                  const decryptedData = decryptPayload(parsedData, encryptionKey);
                  if (decryptedData.content) {
                    onStream(decryptedData.content);
                  }
                } else if (parsedData.content) {
                  // Handle unencrypted content
                  onStream(parsedData.content);
                }
              } catch (e) {
                console.error('Error processing stream data:', e);
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

    // Handle non-streaming responses
    const responseData = await response.json();
    
    let finalDataToProcess = responseData; // Default to the original response data
    
    // Check if this response is from the special Gemini model that uses a non-standard, non-streaming response format
    if (effectiveModel === geminiModel) { 
      try {
        // The actual content is inside the 'body' field, which is a JSON string
        if (responseData.body && typeof responseData.body === 'string') {
          finalDataToProcess = JSON.parse(responseData.body);
        } else {
          // Handle case where body might be missing or not a string
          console.error('Special Gemini model response missing or invalid body:', responseData);
          throw new Error('Invalid response format from special Gemini model.');
        }
      } catch (parseError) {
        console.error('Error parsing body from special Gemini model response:', parseError);
        throw new Error('Failed to parse response body from special Gemini model.');
      }
    }

    // Decrypt the response if it's encrypted (using finalDataToProcess)
    if (encryptionEnabled && encryptionKey && finalDataToProcess.encrypted) {
      try {
        const decryptedData = decryptPayload(finalDataToProcess, encryptionKey);
        // Ensure decryptedData has content
        if (decryptedData && typeof decryptedData.content === 'string') {
            return { role: 'assistant', content: decryptedData.content };
        } else {
            console.error('Decryption succeeded but content is missing or invalid:', decryptedData);
            throw new Error('Decrypted content is missing or invalid.');
        }
      } catch (decryptionError) {
          console.error('Error decrypting payload:', decryptionError);
          throw new Error('Failed to decrypt response.');
      }
    }
    
    // Handle non-encrypted or non-special endpoint responses that weren't encrypted
    // Check if finalDataToProcess has the expected 'content' field
    if (finalDataToProcess && typeof finalDataToProcess.content === 'string') {
        return { role: 'assistant', content: finalDataToProcess.content };
    } else {
        // If content is still missing, it indicates an unexpected format or issue
        console.error('Response data missing expected content field:', finalDataToProcess);
        const errorMessage = (effectiveModel === geminiModel)
                           ? 'Processed response from special Gemini model lacks content.'
                           : 'Response data lacks content field.';
        throw new Error(errorMessage);
    }

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
    //console.log('getAvailableProviders called');
    
    try {
      const { proxyUrl, proxyKey } = getProxyConfig();
      //console.log('Proxy URL:', proxyUrl);
      //console.log('Proxy Key exists:', !!proxyKey);
      
      // Construct the models endpoint URL
      const modelsEndpoint = getProxyEndpoint('/api/models');
      //console.log('Models endpoint:', modelsEndpoint);
      
      // Fetch available models from the API with the API key in headers
      //console.log('Fetching models...');
      const response = await fetch(modelsEndpoint, {
        headers: {
          'x-api-key': proxyKey,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const models = await response.json();
      //console.log('Models received:', models);
      
      if (!Array.isArray(models)) {
        throw new Error('Invalid models response: expected an array');
      }
      
      // Create a single provider with the proxy models
      return [{
        name: 'proxy',
        models: models.map(model => ({
          id: model.nickname,
          name: model.nickname
        })),
        selectedModel: models[0]?.nickname || '',
      }];
    } catch (error) {
      console.error('Error fetching models from proxy:', error);
      throw error;
    }
  } catch (error) {
    console.log('Falling back to original implementation due to error:', error);
    // Fall back to the original implementation if there was an error
    const settings = getAISettings();
    return Object.entries(settings || {})
      .filter(([_, config]) => config && config.key && Array.isArray(config.models) && config.models.length > 0)
      .map(([name, config]) => ({
        name,
        models: config.models || [],
        selectedModel: config.selectedModel || '',
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
