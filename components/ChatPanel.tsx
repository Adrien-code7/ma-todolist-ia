import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, VoiceOption } from '../types';
import { SendIcon, MicIcon, Volume2Icon } from './icons';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isLoading: boolean;
}

const useSpeech = () => {
    const [voices, setVoices] = useState<VoiceOption[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null); // SpeechRecognition

    const populateVoices = useCallback(() => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            const voiceOptions = availableVoices
                .filter(v => v.lang.startsWith('fr')) // Prioritize French voices
                .map(v => ({ voice: v, name: v.name, lang: v.lang }));
            setVoices(voiceOptions);
            
            if (!selectedVoice || !voiceOptions.some(v => v.name === selectedVoice.name)) {
                const defaultVoice = voiceOptions.find(v => v.lang === 'fr-FR') || voiceOptions[0];
                setSelectedVoice(defaultVoice?.voice || null);
            }
        }
    }, [selectedVoice]);

    useEffect(() => {
        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'fr-FR';
        }
    }, [populateVoices]);

    const speak = useCallback((text: string) => {
        if (!text || !selectedVoice || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // Cancel any previous speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        window.speechSynthesis.speak(utterance);
    }, [selectedVoice]);

    const startListening = useCallback((onResult: (result: string) => void) => {
        if (!recognitionRef.current || isListening) return;
        setIsListening(true);
        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
            setIsListening(false);
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error('Erreur de reconnaissance vocale', event.error);
            setIsListening(false);
        };
        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
        recognitionRef.current.start();
    }, [isListening]);
    
    return { voices, selectedVoice, setSelectedVoice, speak, isListening, startListening };
};

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
    const [inputValue, setInputValue] = useState('');
    const { voices, selectedVoice, setSelectedVoice, speak, isListening, startListening } = useSpeech();
    const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastSpokenMessageId = useRef<string | null>(null);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.sender === 'ai' && lastMessage.id !== lastSpokenMessageId.current) {
            speak(lastMessage.text);
            lastSpokenMessageId.current = lastMessage.id;
        }
    }, [messages, speak]);

    const handleMicClick = () => {
        startListening((transcript) => {
            setInputValue(transcript);
        });
    };

    return (
        <div className={`
            bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg 
            transition-all duration-300 ease-in-out h-[30vh] focus-within:h-[50vh]
        `}>
            <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
                <div className="flex-grow overflow-y-auto mb-4 pr-2">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <p className={`max-w-xs lg:max-w-md px-4 py-2 my-1 rounded-2xl break-words ${
                                msg.sender === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-lg' 
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-lg'
                            }`}>
                                {msg.text}
                            </p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="px-4 py-3 my-1 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-0"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-400"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                         <button 
                            onClick={() => setIsVoiceSelectorOpen(p => !p)}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            aria-label="Changer la voix"
                        >
                            <Volume2Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                         </button>
                         {isVoiceSelectorOpen && (
                            <div className="absolute bottom-full mb-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                <ul className="max-h-48 overflow-y-auto text-sm">
                                    {voices.length > 0 ? voices.map(v => (
                                        <li key={v.name}>
                                            <button 
                                                onClick={() => {
                                                    const voice = voices.find(vo => vo.name === v.name)?.voice;
                                                    if (voice) setSelectedVoice(voice);
                                                    setIsVoiceSelectorOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 ${selectedVoice?.name === v.name ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200'}`}
                                            >
                                                {v.name} ({v.lang})
                                            </button>
                                        </li>
                                    )) : <li className="px-3 py-2 text-gray-500">Aucune voix française trouvée</li>}
                                </ul>
                             </div>
                         )}
                    </div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Demandez-moi quelque chose..."
                        className="flex-grow p-3 border rounded-full bg-slate-100 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleMicClick} disabled={isLoading} className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300'}`}>
                        <MicIcon className="w-6 h-6" />
                    </button>
                    <button onClick={handleSend} disabled={isLoading || !inputValue.trim()} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 transition-colors">
                        <SendIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;