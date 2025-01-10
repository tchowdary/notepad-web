import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import {
  Send,
  Copy,
  Plus,
  History,
  Settings,
  Trash,
  Wand2,
  Maximize2,
  Minimize2,
  Key,
  FileText,
  FileCode,
  X,
  Image,
  Paperclip,
  Edit
} from 'lucide-react';

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { List, ListItem } from "./ui/list";

import ApiKeyInput from './ApiKeyInput';

import {
  sendOpenAIMessage,
  sendAnthropicMessage,
  sendGeminiMessage,
  getAvailableProviders,
} from '../services/aiService';
import { chatStorage } from '../services/chatStorageService';
import { customInstructionsStorage } from '../services/customInstructionsService';

import { Card } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";

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
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
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
            <div key={index} className="my-4">
              <img 
                src={`data:${item.source.media_type};base64,${item.source.data}`}
                alt="User uploaded image"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            </div>
          );
        } else if (item.type === 'pdf') {
          return (
            <div key={index} className="my-4">
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

  const clearHistory = () => {
    console.log('Clear history');
  };

  const handleInstructionsClick = () => {
    console.log('Instructions');
  };

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {isFullscreen ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => 
                    provider.models.map(model => (
                      <SelectItem key={`${provider.name}|${model.id}`} value={`${provider.name}|${model.id}`}>
                        {`${provider.name} - ${model.name}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryAnchorEl(null)}
                className="h-8 w-8"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setApiKeyDialogOpen(true)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              className="h-8 w-8"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-grow p-4" ref={messagesContainerRef}>
            {messages.map((message, index) => (
              <Card key={index} className={`mb-4 p-4 ${message.role === 'assistant' ? 'bg-muted' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="prose dark:prose-invert max-w-none">
                    {renderMessageContent(message.content)}
                  </div>
                  {message.role === 'assistant' && (
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
                          {copiedIndex === index ? 'Copied!' : 'Copy to clipboard'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </Card>
            ))}
            {isStreaming && streamingContent && (
              <div className="flex justify-center">
                <Progress value={30} className="w-[60%]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-grow"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="min-w-[40px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => 
                    provider.models.map(model => (
                      <SelectItem key={`${provider.name}|${model.id}`} value={`${provider.name}|${model.id}`}>
                        {`${provider.name} - ${model.name}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryAnchorEl(null)}
                className="h-8 w-8"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setApiKeyDialogOpen(true)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(true)}
              className="h-8 w-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-grow p-4" ref={messagesContainerRef}>
            {messages.map((message, index) => (
              <Card key={index} className={`mb-4 p-4 ${message.role === 'assistant' ? 'bg-muted' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="prose dark:prose-invert max-w-none">
                    {renderMessageContent(message.content)}
                  </div>
                  {message.role === 'assistant' && (
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
                          {copiedIndex === index ? 'Copied!' : 'Copy to clipboard'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </Card>
            ))}
            {isStreaming && streamingContent && (
              <div className="flex justify-center">
                <Progress value={30} className="w-[60%]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-grow"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="min-w-[40px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Settings</DialogTitle>
          </DialogHeader>
          <ApiKeyInput onClose={() => setApiKeyDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={historyAnchorEl !== null} onOpenChange={() => setHistoryAnchorEl(null)}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Chat History</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={createNewSession}
              className="w-full justify-start px-2 py-1.5"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Chat
            </Button>

            <div className="flex items-center gap-2 px-2 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearHistory}
                className="h-8 w-8"
              >
                <Trash className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleInstructionsClick}
                className="h-8 w-8"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            <List>
              {sessions.map((session) => (
                <React.Fragment key={session.id}>
                  <ListItem
                    className={`cursor-pointer ${session.id === activeSessionId ? 'bg-muted' : ''}`}
                    onClick={() => switchSession(session.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {(() => {
                          const firstMessage = session.messages?.[0];
                          if (!firstMessage) return 'New Chat';
                          
                          let title = '';
                          if (typeof firstMessage.content === 'string') {
                            title = firstMessage.content;
                          } else if (firstMessage.content?.text) {
                            title = firstMessage.content.text;
                          } else if (Array.isArray(firstMessage.content)) {
                            title = firstMessage.content.map(part => part.text || '').join(' ');
                          } else {
                            return 'New Chat';
                          }
                          
                          return title.length > 30 ? title.substring(0, 30) + '...' : title || 'New Chat';
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(session.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </ListItem>
                  <Separator />
                </React.Fragment>
              ))}
            </List>
          </div>
        </SheetContent>
      </Sheet>

      <ApiKeyInput
        open={apiKeyDialogOpen}
        onClose={() => setApiKeyDialogOpen(false)}
      />

      <Dialog
        open={instructionDialogOpen}
        onClose={() => setInstructionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingInstruction ? 'Edit Custom Instruction' : 'Create Custom Instruction'}
        </DialogTitle>
        <DialogContent>
          <Input
            autoFocus
            margin="dense"
            label="Instruction Name"
            fullWidth
            value={newInstructionName}
            onChange={(e) => setNewInstructionName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Input
            margin="dense"
            label="Instruction Content"
            fullWidth
            multiline
            rows={4}
            value={newInstructionContent}
            onChange={(e) => setNewInstructionContent(e.target.value)}
          />
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setInstructionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateInstruction} variant="contained">
            {editingInstruction ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default ChatBox;
