
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Bot, Loader2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    role: 'user' | 'bot';
    content: string;
    sources?: string[];
}

const FAQ_QUESTIONS = [
    "How do I post a new job?",
    "Why was candidate John Doe rejected?",
    "Show me the top candidates for the Python role.",
    "What is the leave policy?"
];

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: 'Hi! I am your HR Assistant. I can help with policies, candidates, and job postings. How can I assist you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        // Add user message
        const newMessages = [...messages, { role: 'user', content: text } as Message];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            // API Call
            // Assuming the backend is running on localhost:8000 based on standard setup
            // In production, use env var
            const response = await axios.post('http://localhost:8000/api/chat/', {
                message: text,
                user_email: "hr@example.com", // TODO: Get from auth context
            });

            const botResponse = response.data.response;
            const sources = response.data.sources;

            setMessages(prev => [
                ...prev,
                { role: 'bot', content: botResponse, sources }
            ]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [
                ...prev,
                { role: 'bot', content: "Sorry, I'm having trouble connecting to the server. Please check if the backend is running with the correct API keys." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-[380px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <Bot className="w-6 h-6" />
                                <div>
                                    <h3 className="font-semibold">Talent AI Assistant</h3>
                                    <p className="text-xs text-blue-100">Powered by Gemini & RAG</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-blue-700 p-1 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50 text-xs text-gray-500">
                                                <p className="font-semibold mb-1 flex items-center gap-1">
                                                    <HelpCircle className="w-3 h-3" /> Sources:
                                                </p>
                                                <ul className="list-disc list-inside">
                                                    {msg.sources.map((s, i) => (
                                                        <li key={i} className="truncate max-w-[200px]">{s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-200 dark:border-gray-700">
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggested Questions */}
                        {messages.length === 1 && (
                            <div className="px-4 pb-2">
                                <p className="text-xs text-gray-500 mb-2 font-medium">Suggested Questions:</p>
                                <div className="flex flex-wrap gap-2">
                                    {FAQ_QUESTIONS.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(q)}
                                            className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-gray-200 dark:border-gray-700"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about candidates, policies..."
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-full transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-colors"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </motion.button>
        </div>
    );
};

export default Chatbot;
