
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getAIResponse } from '../services/geminiService';

const ChatAdvisor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: '¡Hola! Soy tu asesor Magno AI. ¿En qué puedo ayudarte hoy con la gestión de tu propiedad?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await getAIResponse(input, history);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response || 'Lo siento, no pude procesar tu solicitud en este momento.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-background-light dark:bg-background-dark max-w-2xl mx-auto overflow-hidden">
      <header className="px-4 sm:px-6 pt-8 sm:pt-12 pb-4 sm:pb-6 bg-surface-light dark:bg-surface-dark shadow-soft flex items-center gap-3 sm:gap-4 z-10 border-b border-border-light dark:border-border-dark">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary text-white flex items-center justify-center shadow-glow shrink-0">
          <span className="material-symbols-outlined text-xl sm:text-2xl">auto_awesome</span>
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-tighter">Magno AI</h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-[9px] sm:text-[10px] text-subtext-light uppercase font-bold tracking-widest leading-none">En línea</p>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 hide-scrollbar"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-none'
                  : 'bg-surface-light dark:bg-surface-dark text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                }`}
            >
              {msg.text}
              <p className={`text-[8px] mt-1.5 opacity-60 text-right ${msg.role === 'user' ? 'text-white' : 'text-slate-500'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-light dark:bg-surface-dark px-4 py-3 rounded-2xl rounded-tl-none border border-border-light dark:border-border-dark flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-4 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark pb-safe">
        <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 rounded-2xl p-1.5 sm:p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner border border-border-light dark:border-border-dark">
          <input
            type="text"
            placeholder="Hazme una pregunta sobre tu inmueble..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 font-medium text-slate-700 dark:text-slate-200"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${input.trim() && !isTyping ? 'bg-primary text-white shadow-glow' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'
              }`}
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAdvisor;
