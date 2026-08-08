'use client';

import * as React from 'react';
import { Bot, Loader2, Send, Sparkles, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatResponse {
  data: {
    conversationId: string;
    message: string;
    result?: {
      data?: {
        response?: string;
        confidence?: number;
      };
      reply?: string;
      confidence?: number;
      suggestions?: string[];
    };
  };
}

const SUGGESTED_PROMPTS = [
  'How are my students performing?',
  'Predict attendance risks for this week',
  'Suggest improvements for weak students',
  'Summarize upcoming deadlines',
];

export default function AIAssistantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await apiClient<ChatResponse>('/ai/chat/message', {
        method: 'POST',
        body: {
          message: content,
          sessionId: conversationId,
          context: { role: user?.role, userId: user?.id },
        },
      });

      setConversationId(result.data.conversationId);
      const reply = result.data.result?.data?.response ?? result.data.message ?? result.data.result?.reply;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 animate-float">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              AI Assistant
              <BadgeSparkle />
            </h2>
            <p className="text-sm text-muted-foreground">
              Ask anything about students, grades, attendance, or scheduling
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.push('/dashboard')}
          aria-label="Close AI assistant"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat container */}
      <Card className="flex flex-1 flex-col overflow-hidden border-0 shadow-xl">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-2xl shadow-violet-500/30 animate-float">
                <Sparkles className="h-10 w-10" />
              </div>
              <div>
                <p className="text-lg font-semibold">How can I help you today?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  I can analyze performance, predict risks, and help with planning
                </p>
              </div>
              <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    className="justify-start text-left"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-3 animate-fade-in',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  message.role === 'assistant'
                    ? 'bg-gradient-to-br from-primary to-fuchsia-500 text-white'
                    : 'bg-muted'
                )}
              >
                {message.role === 'assistant' ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  message.role === 'assistant'
                    ? 'border bg-card'
                    : 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/20'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl border bg-card px-4 py-3">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-primary"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex gap-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} className="shrink-0">
              {loading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function BadgeSparkle() {
  return <Sparkles className="h-5 w-5 text-violet-500" />;
}