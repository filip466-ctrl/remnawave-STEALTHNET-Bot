import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  text: string;
  from: "user" | "support";
  time: string;
};

const TEST_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Привет! Чем могу помочь? 👋",
    from: "support",
    time: "10:00",
  },
  {
    id: "2",
    text: "Здравствуйте! У меня вопрос по подписке.",
    from: "user",
    time: "10:01",
  },
  {
    id: "3",
    text: "Конечно, я вас слушаю! Опишите проблему, и мы разберёмся 🌟",
    from: "support",
    time: "10:01",
  },
  {
    id: "4",
    text: "Не могу подключиться к VPN после оплаты.",
    from: "user",
    time: "10:02",
  },
  {
    id: "5",
    text: "Понял! Проверьте раздел «Подписка» — там должна появиться ссылка для подключения. Если её нет, напишите нам — разберёмся!",
    from: "support",
    time: "10:02",
  },
];

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(TEST_MESSAGES);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const now = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      from: "user",
      time,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Тестовый авто-ответ
    setTimeout(() => {
      const replyMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Спасибо за обращение! Наш специалист свяжется с вами в ближайшее время. ⭐",
        from: "support",
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, replyMsg]);
      if (!isOpen) setUnread((n) => n + 1);
    }, 900);
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute bottom-16 right-0 w-[340px] sm:w-[380px]",
                "rounded-2xl border border-white/10",
                "bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/30",
                "flex flex-col overflow-hidden",
              )}
              style={{ maxHeight: "480px" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-primary/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">Поддержка</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Онлайн</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i < TEST_MESSAGES.length ? 0 : 0.05 }}
                    className={cn(
                      "flex gap-2 max-w-[88%]",
                      msg.from === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5",
                        msg.from === "support"
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {msg.from === "support" ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        msg.from === "support"
                          ? "bg-white/8 text-foreground rounded-tl-sm"
                          : "bg-primary/20 text-foreground rounded-tr-sm",
                      )}
                    >
                      <p>{msg.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">{msg.time}</p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 px-3 py-3 border-t border-white/10 shrink-0">
                <input
                  className={cn(
                    "flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2",
                    "text-sm text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all",
                  )}
                  placeholder="Введите сообщение..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl shadow-black/40",
            "bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
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
                <X className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageCircle className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Unread badge */}
          <AnimatePresence>
            {unread > 0 && !isOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
