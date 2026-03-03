import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Sparkles, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  text: string;
  from: "user" | "bot";
  time: string;
};

type ChatType = "ai" | "support";

const INITIAL_AI: Message[] = [
  {
    id: "a1",
    text: "Привет! Я AI-ассистент STEALTHNET ✨ Готов помочь с настройкой VPN, тарифами и любыми другими вопросами. Что вас интересует?",
    from: "bot",
    time: "10:00",
  },
];

const INITIAL_SUPPORT: Message[] = [
  {
    id: "s1",
    text: "Здравствуйте! Добро пожаловать в службу поддержки. Если у вас возникли технические сложности или вопросы по оплате — опишите их здесь. 🛠️",
    from: "bot",
    time: "10:00",
  },
];

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatType>("ai");

  const [chats, setChats] = useState<Record<ChatType, Message[]>>({
    ai: INITIAL_AI,
    support: INITIAL_SUPPORT,
  });

  const [inputs, setInputs] = useState<Record<ChatType, string>>({
    ai: "",
    support: "",
  });

  const [unread, setUnread] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      scrollToBottom();
    }
  }, [isOpen, activeChat, chats]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = () => {
    const text = inputs[activeChat].trim();
    if (!text) return;

    const now = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      from: "user",
      time,
    };

    setChats((prev) => ({
      ...prev,
      [activeChat]: [...prev[activeChat], userMsg],
    }));

    setInputs((prev) => ({ ...prev, [activeChat]: "" }));

    // Тестовый авто-ответ
    const currentChat = activeChat;
    setTimeout(() => {
      const replyText =
        currentChat === "ai"
          ? "Это тестовый ответ AI-ассистента! 🤖 В будущем здесь будет интеграция с мощной языковой моделью для мгновенной помощи."
          : "Спасибо за обращение! Наш оператор получил ваше сообщение и ответит в течение нескольких минут. ⏳";

      const replyMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        from: "bot",
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      };

      setChats((prev) => ({
        ...prev,
        [currentChat]: [...prev[currentChat], replyMsg],
      }));

      if (!isOpen) setUnread((n) => n + 1);
    }, currentChat === "ai" ? 800 : 1500);
  };

  const messages = chats[activeChat];

  return (
    <>
      <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[100]">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "fixed sm:absolute z-50",
                "inset-0 sm:inset-auto sm:bottom-20 sm:right-0",
                "w-full h-[100dvh] sm:w-[400px] sm:h-auto sm:max-h-[600px]",
                "sm:rounded-3xl border-0 sm:border border-white/10",
                "bg-background sm:bg-background/60 sm:backdrop-blur-2xl sm:shadow-2xl sm:shadow-black/50",
                "flex flex-col overflow-hidden"
              )}
            >
              {/* Header */}
              <div className="px-4 py-3 sm:py-4 border-b border-white/5 bg-white/5 shrink-0 relative overflow-hidden pt-[max(env(safe-area-inset-top),16px)] sm:pt-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner">
                      {activeChat === "ai" ? <Sparkles className="h-5 w-5" /> : <Headset className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground leading-tight">
                        {activeChat === "ai" ? "AI Ассистент" : "Поддержка"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        {activeChat === "ai" ? "Бот онлайн" : "Операторы онлайн"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-6 w-6 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Chat Switcher */}
                <div className="relative flex p-1 bg-black/20 rounded-xl backdrop-blur-sm border border-white/5">
                  <button
                    onClick={() => setActiveChat("ai")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-300 relative z-10",
                      activeChat === "ai" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Sparkles className="w-4 h-4" /> AI Чат
                  </button>
                  <button
                    onClick={() => setActiveChat("support")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-300 relative z-10",
                      activeChat === "support" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Headset className="w-4 h-4" /> Оператор
                  </button>
                  {/* Sliding Background */}
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary shadow-md rounded-lg transition-transform duration-300 ease-out z-0"
                    style={{
                      transform: activeChat === "ai" ? "translateX(0)" : "translateX(100%)",
                      left: "4px",
                    }}
                  />
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-gradient-to-b from-transparent to-black/5 scroll-smooth">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => {
                    const isUser = msg.from === "user";
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm mt-1",
                            isUser
                              ? "bg-primary/20 text-primary"
                              : activeChat === "ai"
                              ? "bg-violet-500/20 text-violet-400"
                              : "bg-blue-500/20 text-blue-400"
                          )}
                        >
                          {isUser ? (
                            <User className="h-4 w-4" />
                          ) : activeChat === "ai" ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            <Headset className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm backdrop-blur-md",
                            isUser
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-card/60 border border-white/5 text-foreground rounded-tl-sm"
                          )}
                        >
                          <p>{msg.text}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1.5 opacity-60 font-medium",
                              isUser ? "text-right" : "text-left text-muted-foreground"
                            )}
                          >
                            {msg.time}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Input Area */}
              <div className="p-3 sm:p-4 border-t border-white/5 bg-background/80 sm:bg-background/50 backdrop-blur-xl shrink-0 pb-[max(env(safe-area-inset-bottom),16px)] sm:pb-4">
                <div className="relative flex items-end gap-2 bg-black/5 dark:bg-black/20 p-1.5 rounded-2xl border border-black/5 dark:border-white/10 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                  <textarea
                    className={cn(
                      "flex-1 max-h-32 min-h-[40px] w-full resize-none bg-transparent px-3 py-2.5",
                      "text-sm text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none custom-scrollbar"
                    )}
                    placeholder={activeChat === "ai" ? "Спросите у AI..." : "Напишите сообщение..."}
                    value={inputs[activeChat]}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [activeChat]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-95 mb-0.5 mr-0.5"
                    onClick={handleSend}
                    disabled={!inputs[activeChat].trim()}
                  >
                    <Send className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <div className="relative group">
          {/* Glass blur aura effect behind the button */}
          {!isOpen && (
            <div className="absolute inset-[-20px] sm:inset-[-30px] rounded-full bg-background/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
          )}
          {!isOpen && (
            <div className="absolute inset-[-10px] sm:inset-[-15px] rounded-full bg-background/50 backdrop-blur-[4px] pointer-events-none -z-10" />
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen((v) => !v)}
            className={cn(
              "relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full z-10",
              "bg-card/60 backdrop-blur-2xl border border-border/50 text-foreground transition-colors hover:bg-card/80",
              !isOpen ? "shadow-[0_8px_32px_rgba(0,0,0,0.12)]" : "shadow-lg"
            )}
          >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-7 w-7" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageCircle className="h-7 w-7" />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Unread badge */}
          <AnimatePresence>
            {unread > 0 && !isOpen && (
              <motion.span
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-destructive text-[11px] font-bold text-white shadow-md"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </>
  );
}
