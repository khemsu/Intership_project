import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Bot, User, Mic } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  messages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ 
  messages: externalMessages, 
  onMessagesChange 
}) => {
  // Use external messages if provided, otherwise use internal state
  const [internalMessages, setInternalMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm CBot. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);

  const messages = externalMessages || internalMessages;
  const setMessages = onMessagesChange || setInternalMessages;

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping) inputRef.current?.focus();
  }, [isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    const backendUrl = `${import.meta.env.VITE_API_BASE_URL}/api/chat`;

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: inputMessage,
        }),
      });

      let botResponse = "I'm sorry, I'm having trouble connecting to the server right now. Please try again later.";

      if (response.ok) {
        const data = await response.json();
        botResponse = data.final_results;
      } else {
        if (response.status === 401) {
          botResponse = "Your session has expired. Please log in again.";
        } else {
          botResponse = "I encountered an error processing your request.";
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botResponse,
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error. Please try again or check your connection.',
        timestamp: new Date(),
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, errorMessage]);
        setIsTyping(false);
      }, 800);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMicClick = () => {
    // Toast functionality would need to be implemented separately
    
    // If you have toast available, uncomment the following:
    toast({
      title: '🎤 Voice Support',
      description: 'Voice support will be added soon.',
      variant: "default",
      duration: 2500,
    });
  };

  // Custom markdown components for styling
  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1 className="text-base font-bold mb-3 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-1">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">{children}</h3>
    ),
    p: ({ children }: any) => (
      <p className="mb-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-3 text-sm text-gray-900 dark:text-gray-100 space-y-2">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-3 text-sm text-gray-900 dark:text-gray-100 space-y-2">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
        <div className="flex items-start">
          <span className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5">•</span>
          <div className="flex-1">{children}</div>
        </div>
      </li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-3 italic mb-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 py-2 rounded-r">
        {children}
      </blockquote>
    ),
    code: ({ children, className }: any) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-xs font-mono text-gray-900 dark:text-gray-100">
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-200 dark:bg-gray-600 p-3 rounded text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => (
      <pre className="bg-gray-200 dark:bg-gray-600 p-3 rounded text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto mb-3">
        {children}
      </pre>
    ),
    a: ({ children, href }: any) => (
      <a 
        href={href} 
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer break-all font-medium" 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          window.open(href, '_blank');
        }}
      >
        {children}
      </a>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-gray-900 dark:text-gray-100">{children}</em>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-3">
        <table className="border-collapse border border-gray-300 dark:border-gray-600 text-xs min-w-full">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-100 dark:bg-gray-700 font-semibold text-gray-900 dark:text-gray-100 text-left">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-900 dark:text-gray-100">
        {children}
      </td>
    ),
    hr: () => (
      <hr className="my-3 border-gray-300 dark:border-gray-600" />
    ),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-full flex flex-col">
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-gray-200 dark:border-gray-600 shadow-xl flex flex-col h-full rounded-2xl">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-slate-700 dark:to-slate-800 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <MessageSquare className="w-5 h-5" />
            CV Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 dark:text-white text-gray-600'
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                <div
                  className={`flex flex-col max-w-[70%] ${
                    message.type === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 text-sm ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 dark:text-gray-100 text-gray-900'
                    }`}
                  >
                    {message.type === 'bot' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown 
                          components={markdownComponents}
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600 dark:text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-b-2xl">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                autoFocus
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about your CVs, search for candidates, or request insights..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button
                onClick={handleMicClick}
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-slate-600"
              >
                <Mic className="w-4 h-4 text-gray-600 dark:text-white" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chatbot;