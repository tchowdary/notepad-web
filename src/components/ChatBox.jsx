import React, { useState, useEffect, useRef } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import {
  Send,
  Copy,
  Plus,
  Settings,
  History,
  Trash,
  Pencil,
  Wand2,
  Image,
  Maximize,
  Minimize,
  Key,
  Paperclip,
  FileText,
  FileCode
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  sendOpenAIMessage,
  sendAnthropicMessage,
  sendGeminiMessage,
  getAvailableProviders,
} from '../services/aiService';
import { chatStorage } from '../services/chatStorageService';
import { customInstructionsStorage } from '../services/customInstructionsService';
import ApiKeyInput from './ApiKeyInput';

const ChatBox = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [historyAnchorEl, setHistoryAnchorEl] = useState(null);
  const [customInstructions, setCustomInstructions] = useState([]);
  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const [instructionDialogOpen, setInstructionDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [newInstructionName, setNewInstructionName] = useState('');
  const [newInstructionContent, setNewInstructionContent] = useState('');
  const [instructionMenuAnchorEl, setInstructionMenuAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingContentRef = useRef('');
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const availableProviders = getAvailableProviders();
    setProviders(availableProviders);
    
    const lastProvider = localStorage.getItem('last_selected_provider');
    if (lastProvider && availableProviders.some(p => 
      p.models.some(m => `${p.name}|${m.id}` === lastProvider)
    )) {
      setSelectedProvider(lastProvider);
    } else if (availableProviders.length > 0) {
      const defaultProvider = `${availableProviders[0].name}|${availableProviders[0].models[0].id}`;
      setSelectedProvider(defaultProvider);
      localStorage.setItem('last_selected_provider', defaultProvider);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      try {
        const savedSessions = await chatStorage.getAllSessions();
        if (!mounted) return;
        
        setSessions(savedSessions);
        if (savedSessions.length > 0) {
          const lastSession = savedSessions[0]; // Sessions are sorted by lastUpdated
          setActiveSessionId(lastSession.id);
          setMessages(lastSession.messages);
        } else {
          await createNewSession();
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        if (!mounted) return;
        setError('Failed to load chat history');
      }
    };

    loadSessions();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const saveSession = async () => {
      if (!activeSessionId || messages.length === 0) return;

      try {
        const session = {
          id: activeSessionId,
          messages,
          created: sessions.find(s => s.id === activeSessionId)?.created || new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };
        await chatStorage.saveSession(session);
        if (!mounted) return;

        const updatedSessions = await chatStorage.getAllSessions();
        if (!mounted) return;
        setSessions(updatedSessions);
      } catch (error) {
        console.error('Error saving session:', error);
        if (!mounted) return;
        setError('Failed to save chat session');
      }
    };

    saveSession();
    return () => { mounted = false; };
  }, [messages, activeSessionId]);

  useEffect(() => {
    const loadCustomInstructions = async () => {
      const instructions = await customInstructionsStorage.getAllInstructions();
      setCustomInstructions(instructions);
      
      // Only set selected instruction if there was a valid last selection
      const lastInstruction = localStorage.getItem('last_selected_instruction');
      if (lastInstruction !== null && lastInstruction !== 'null') {
        const instruction = instructions.find(i => i.id === lastInstruction);
        if (instruction) {
          setSelectedInstruction(instruction);
        }
      }
    };
    loadCustomInstructions();
  }, []);

  const createNewSession = async () => {
    try {
      const newSession = {
        id: Date.now().toString(),
        messages: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await chatStorage.saveSession(newSession);
      const updatedSessions = await chatStorage.getAllSessions();
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setHistoryAnchorEl(null);
    } catch (error) {
      console.error('Error creating new session:', error);
      setError('Failed to create new chat session');
    }
  };

  const switchSession = async (sessionId) => {
    try {
      const session = await chatStorage.getSession(sessionId);
      if (session) {
        setActiveSessionId(session.id);
        setMessages(session.messages);
      }
      setHistoryAnchorEl(null);
    } catch (error) {
      console.error('Error switching session:', error);
      setError('Failed to switch chat session');
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProviderChange = (value) => {
    setSelectedProvider(value);
    localStorage.setItem('last_selected_provider', value);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.type === 'application/pdf') {
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const base64Data = e.target.result.split(',')[1];
        setSelectedFile({
          type: 'pdf',
          name: file.name,
          data: base64Data
        });
      };
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      reader.readAsText(file);
      reader.onload = (e) => {
        setSelectedFile({
          type: 'markdown',
          name: file.name,
          content: e.target.result
        });
      };
    } else if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const base64Data = e.target.result.split(',')[1];
        setSelectedFile({
          type: 'image',
          name: file.name,
          data: base64Data,
          mediaType: file.type
        });
      };
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result.split(',')[1];
          setSelectedFile({
            type: 'image',
            name: 'pasted-image.png',
            data: base64Data,
            mediaType: file.type
          });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || !selectedProvider || isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const [providerName, modelId] = selectedProvider.split('|');
      const messageContent = [];

      // Check if an image or file is selected
      if (selectedFile) {
        messageContent.push({
          type: selectedFile.type,
          source: {
            type: 'base64',
            media_type: selectedFile.mediaType,
            data: selectedFile.data
          }
        });
      }

      // Include text input if available
      if (input.trim()) {
        messageContent.push({
          type: 'text',
          text: input.trim()
        });
      }

      const newMessage = {
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMessage]);
      setInput('');
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      try {
        const apiKey = localStorage.getItem(`${providerName}_api_key`);
        if (!apiKey) {
          throw new Error(`No API key found for ${providerName}`);
        }

        let finalResponse;
        if (providerName === 'gemini') {
          // Handle Gemini without streaming
          const response = await sendGeminiMessage(messages.concat([newMessage]), modelId, apiKey, selectedInstruction);
          finalResponse = response;
          setMessages(prev => [...prev, finalResponse]);
        } else {
          // Handle OpenAI and Anthropic with streaming
          setIsStreaming(true);
          setStreamingContent('');
          streamingContentRef.current = '';
          
          const handleStream = (content) => {
            streamingContentRef.current += content;
            setStreamingContent(streamingContentRef.current);
          };

          await (providerName === 'openai' 
            ? sendOpenAIMessage(messages.concat([newMessage]), modelId, apiKey, selectedInstruction, handleStream)
            : sendAnthropicMessage(messages.concat([newMessage]), modelId, apiKey, selectedInstruction, handleStream));

          finalResponse = {
            role: 'assistant',
            content: streamingContentRef.current,
            timestamp: new Date().toISOString()
          };

          setIsStreaming(false);
          setStreamingContent('');
          setMessages(prev => [...prev, finalResponse]);
        }
        
        if (activeSessionId) {
          await chatStorage.saveSession({
            id: activeSessionId,
            messages: messages.concat([newMessage, finalResponse]),
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCreateInstruction = async () => {
    if (!newInstructionName.trim() || !newInstructionContent.trim()) return;

    const instruction = {
      name: newInstructionName,
      content: newInstructionContent,
    };

    const savedInstruction = await customInstructionsStorage.saveInstruction(instruction);
    setCustomInstructions(await customInstructionsStorage.getAllInstructions());
    setSelectedInstruction(savedInstruction);
    localStorage.setItem('last_selected_instruction', savedInstruction.id);
    
    setNewInstructionName('');
    setNewInstructionContent('');
    setInstructionDialogOpen(false);
    setEditingInstruction(null);
  };

  const handleEditInstruction = (instruction) => {
    setEditingInstruction(instruction);
    setNewInstructionName(instruction.name);
    setNewInstructionContent(instruction.content);
    setInstructionDialogOpen(true);
  };

  const handleDeleteInstruction = async (id) => {
    await customInstructionsStorage.deleteInstruction(id);
    setCustomInstructions(await customInstructionsStorage.getAllInstructions());
    if (selectedInstruction?.id === id) {
      setSelectedInstruction(null);
      localStorage.removeItem('last_selected_instruction');
    }
  };

  const renderMessageContent = (content) => {
    // If content is a string, render it with markdown
    if (typeof content === 'string') {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    {...props}
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code {...props} className={className}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    // If content is an array, handle each item
    if (Array.isArray(content)) {
      return content.map((item, index) => {
        if (item.type === 'text' || item.type === 'markdown') {
          return renderMessageContent(item.text || item.content);
        }
        if (item.type === 'image') {
          return (
            <div key={index} className="my-2">
              <img 
                src={`data:${item.source.media_type};base64,${item.source.data}`}
                alt="User uploaded image"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            </div>
          );
        } else if (item.type === 'pdf') {
          return (
            <div key={index} className="my-2">
              <embed 
                src={`data:application/pdf;base64,${item.data}`}
                type="application/pdf"
                width="100%"
                height="500"
              />
            </div>
          );
        }
        return null;
      });
    }

    // If content is undefined or null, return null
    return null;
  };

  return (
    <Card className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) =>
                provider.models.map((model) => (
                  <SelectItem key={`${provider.name}|${model.id}`} value={`${provider.name}|${model.id}`}>
                    {`${provider.name} - ${model.name}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setSettingsAnchorEl(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setHistoryAnchorEl(true)}>
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat History</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button variant="outline" size="icon" onClick={() => setIsFullscreen(true)}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-grow" ref={messagesContainerRef}>
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.role === 'assistant' ? 'bg-secondary/20' : ''} p-4 rounded-lg`}>
            <div className="flex justify-between items-start">
              <div className="font-semibold mb-2">
                {message.role === 'assistant' ? 'AI' : 'You'}
              </div>
              {message.content && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(message.content, index)}
                      >
                        <Copy className={`h-4 w-4 ${copiedIndex === index ? 'text-green-500' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {renderMessageContent(message.content)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="flex gap-2 items-end">
        <div className="flex-grow">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="w-full"
          />
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('file-input').click()}
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach file</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          className="w-24"
        >
          {isLoading ? (
            <Progress value={75} className="w-6 h-6" />
          ) : (
            <>
              Send
              <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <input
        type="file"
        id="file-input"
        className="hidden"
        onChange={handleFileUpload}
        accept=".txt,.md,.pdf,image/*"
      />

      <Dialog open={instructionDialogOpen} onOpenChange={setInstructionDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editingInstruction ? 'Edit Instruction' : 'New Instruction'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <Input
              placeholder="Instruction Name"
              value={newInstructionName}
              onChange={(e) => setNewInstructionName(e.target.value)}
            />
            <Input
              placeholder="Instruction Content"
              value={newInstructionContent}
              onChange={(e) => setNewInstructionContent(e.target.value)}
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setInstructionDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateInstruction}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <ApiKeyInput onClose={() => setApiKeyDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ChatBox;
