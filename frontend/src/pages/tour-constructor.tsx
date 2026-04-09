import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { api, type TourStepRecord, type TourMascotRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, GripVertical, Trash2, Sparkles, Save, X, Upload, Film, ImagePlus, Eye, Map, Layers, Zap, ArrowRight, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TOUR_TARGETS = [
  { id: "welcome", target: "body", label: "Приветствие", icon: "👋", defaultPlacement: "center", description: "Приветственное сообщение", previewImage: null },
  { id: "subscription", target: '[data-tour="subscription"]', label: "Подписка", icon: "🔑", defaultPlacement: "bottom", description: "Карточка подписки", previewImage: "/tour-targets/subscription.png" },
  { id: "balance", target: '[data-tour="balance"]', label: "Баланс", icon: "💰", defaultPlacement: "left", description: "Карточка баланса", previewImage: "/tour-targets/balance.png" },
  { id: "tariffs", target: '[data-tour="tariffs"]', label: "Тарифы", icon: "📦", defaultPlacement: "right", description: "Раздел тарифов в навигации", previewImage: "/tour-targets/tariffs.png" },
  { id: "referrals", target: '[data-tour="referrals"]', label: "Рефералы", icon: "👥", defaultPlacement: "right", description: "Реферальная программа", previewImage: "/tour-targets/referrals.png" },
  { id: "custom-build", target: '[data-tour="custom-build"]', label: "Кастомная сборка", icon: "🛠️", defaultPlacement: "right", description: "Кастомная конфигурация VPN", previewImage: "/tour-targets/custom-build.png" },
  { id: "extra-options", target: '[data-tour="extra-options"]', label: "Дополнительные опции", icon: "⚡", defaultPlacement: "right", description: "Прокси, доп. устройства и др.", previewImage: "/tour-targets/extra-options.png" },
  { id: "proxy", target: '[data-tour="proxy"]', label: "Прокси", icon: "🌐", defaultPlacement: "right", description: "Прокси-доступ", previewImage: "/tour-targets/proxy.png" },
  { id: "singbox", target: '[data-tour="singbox"]', label: "SingBox", icon: "🔐", defaultPlacement: "right", description: "Доступ через SingBox", previewImage: "/tour-targets/singbox.png" },
  { id: "support", target: '[data-tour="support"]', label: "Поддержка", icon: "💬", defaultPlacement: "right", description: "Система поддержки", previewImage: "/tour-targets/support.png" },
  { id: "gifts", target: '[data-tour="gifts"]', label: "Подарки", icon: "🎁", defaultPlacement: "right", description: "Подарочные коды", previewImage: "/tour-targets/gifts.png" },
  { id: "profile", target: '[data-tour="profile"]', label: "Профиль", icon: "👤", defaultPlacement: "right", description: "Настройки профиля", previewImage: "/tour-targets/profile.png" },
  { id: "dashboard", target: '[data-tour="dashboard"]', label: "Дашборд", icon: "📊", defaultPlacement: "bottom", description: "Кнопка дашборда", previewImage: "/tour-targets/dashboard.png" },
  { id: "farewell", target: "body", label: "Завершение", icon: "✨", defaultPlacement: "center", description: "Прощальное сообщение", previewImage: null },
];

function SortableStepRow({
  step,
  isSelected,
  onSelect,
  index,
  totalSteps,
}: {
  step: TourStepRecord;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  totalSteps: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const targetDef = TOUR_TARGETS.find(t => t.target === step.target) || TOUR_TARGETS[0];
  const isLast = index === totalSteps - 1;

  return (
    <div className="relative group/step">
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-[22px] top-[44px] bottom-[-20px] w-0.5 bg-gradient-to-b from-primary/40 via-primary/10 to-transparent z-0 transition-opacity opacity-60 group-hover/step:opacity-100" />
      )}
      
      <div
        ref={setNodeRef}
        style={style}
        onClick={onSelect}
        className={`relative z-10 flex items-center gap-3.5 rounded-[1.25rem] border p-3.5 cursor-pointer transition-all duration-300 ${
          isDragging ? "opacity-90 shadow-2xl z-50 scale-[1.02] border-primary/40 bg-background/95 backdrop-blur-2xl ring-2 ring-primary/20" : ""
        } ${
          isSelected 
            ? "ring-1 ring-primary/60 bg-gradient-to-r from-primary/10 to-transparent border-primary/40 shadow-[0_4px_30px_rgba(var(--primary),0.15)]" 
            : "bg-card/30 border-white/10 hover:bg-card/50 hover:border-white/20 hover:shadow-lg"
        }`}
      >
        <div
          className="flex h-8 w-8 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-xl bg-background/40 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Step Number Badge */}
        <div className={`absolute -left-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-md text-[11px] font-bold z-20 transition-all duration-300 ${
          isSelected ? "bg-primary text-primary-foreground border-primary shadow-primary/30 scale-110" : "bg-background text-muted-foreground border-white/20"
        }`}>
          {index + 1}
        </div>
        
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-background to-muted/50 border border-white/10 text-xl shrink-0 shadow-inner relative overflow-hidden group-hover/step:shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] transition-all">
          {targetDef.icon}
          {isSelected && (
            <div className="absolute inset-0 bg-primary/15 animate-pulse" />
          )}
        </div>
        
        <div className="flex flex-col overflow-hidden flex-1 justify-center">
          <span className={`font-bold text-sm truncate transition-colors ${isSelected ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "text-foreground/90"}`}>
            {step.title || "Без заголовка"}
          </span>
          <span className="text-[11px] text-muted-foreground/80 truncate mt-0.5 flex items-center gap-1.5 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40" />
            {step.targetLabel}
          </span>
        </div>
        
        {step.mascot && (
          <div className="shrink-0 p-0.5 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/20 shadow-sm relative">
            <img src={step.mascot.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-background/50" />
            <div className="absolute -bottom-0.5 -right-0.5 text-[10px] bg-background rounded-full p-0.5 border border-white/10">✨</div>
          </div>
        )}
        
        <div className="ml-1 flex items-center justify-center shrink-0 w-8 h-8 rounded-full hover:bg-white/5 transition-colors">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step.isActive ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" : "bg-muted border border-white/10"}`} title={step.isActive ? "Активен" : "Неактивен"} />
        </div>
      </div>
    </div>
  );
}

/** Target palette item with hover preview */
function PaletteItem({
  target,
  onClick,
}: {
  target: typeof TOUR_TARGETS[0];
  onClick: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="relative">
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        className="bg-card/40 hover:bg-card/80 backdrop-blur-md border border-white/10 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(var(--primary),0.2)] rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-background/50 border border-white/5 text-xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform relative z-10">
          {target.icon}
        </div>
        <div className="flex flex-col flex-1 min-w-0 relative z-10">
          <span className="font-semibold text-sm truncate text-foreground/90 group-hover:text-foreground">{target.label}</span>
          <span className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{target.description}</span>
        </div>
        {target.previewImage && (
          <Eye className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/70 shrink-0 transition-colors relative z-10" />
        )}
      </motion.div>

      {/* Preview tooltip on hover */}
      <AnimatePresence>
        {showPreview && target.previewImage && (
          <motion.div
            initial={{ opacity: 0, x: 15, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-full top-0 ml-4 z-50 pointer-events-none"
          >
            <div className="w-[280px] rounded-2xl overflow-hidden border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl">
              <img
                src={target.previewImage}
                alt={target.label}
                className="w-full h-auto border-b border-white/5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="px-4 py-3 bg-gradient-to-b from-transparent to-background/50">
                <div className="font-medium text-sm text-foreground mb-1">{target.label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {target.description}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TourConstructorPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? null;

  const [steps, setSteps] = useState<TourStepRecord[]>([]);
  const [mascots, setMascots] = useState<TourMascotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editPlacement, setEditPlacement] = useState("center");
  const [editMascotId, setEditMascotId] = useState<string | null>(null);
  const [editMood, setEditMood] = useState("wave");
  const [editIsActive, setEditIsActive] = useState(true);

  // Upload state
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMascot, setUploadingMascot] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mascotInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [stepsRes, mascotsRes] = await Promise.all([
        api.getTourSteps(token),
        api.getTourMascots(token),
      ]);
      setSteps(stepsRes.items);
      setMascots(mascotsRes.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedStep = steps.find(s => s.id === selectedStepId);

  useEffect(() => {
    if (selectedStep) {
      setEditTitle(selectedStep.title);
      setEditContent(selectedStep.content);
      setEditVideoUrl(selectedStep.videoUrl || "");
      setEditPlacement(selectedStep.placement);
      setEditMascotId(selectedStep.mascotId);
      setEditMood(selectedStep.mood);
      setEditIsActive(selectedStep.isActive);
    }
  }, [selectedStepId, selectedStep]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reordered = arrayMove(steps, oldIndex, newIndex);
    setSteps(reordered);
    
    if (!token) return;
    try {
      const items = reordered.map((s, index) => ({ id: s.id, sortOrder: index }));
      await api.reorderTourSteps(token, items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения порядка");
      load();
    }
  };

  const handleCreateStep = async (targetDef: typeof TOUR_TARGETS[0]) => {
    if (!token) return;
    setSaving(true);
    try {
      const firstMascot = mascots[0] ?? null;
      const newStep = await api.createTourStep(token, {
        target: targetDef.target,
        targetLabel: targetDef.label,
        title: targetDef.description,
        content: "Текст шага...",
        placement: targetDef.defaultPlacement,
        mascotId: firstMascot?.id ?? null,
        mood: "wave",
        isActive: true,
        sortOrder: steps.length,
      });
      setSteps([...steps, newStep]);
      setSelectedStepId(newStep.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания шага");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStep = async () => {
    if (!token || !selectedStepId) return;
    setSaving(true);
    try {
      const updated = await api.updateTourStep(token, selectedStepId, {
        title: editTitle,
        content: editContent,
        videoUrl: editVideoUrl || null,
        placement: editPlacement,
        mascotId: editMascotId,
        mood: editMood,
        isActive: editIsActive,
      });
      setSteps(steps.map(s => s.id === updated.id ? updated : s));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения шага");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async () => {
    if (!token || !selectedStepId || !confirm("Удалить этот шаг?")) return;
    setSaving(true);
    try {
      await api.deleteTourStep(token, selectedStepId);
      setSteps(steps.filter(s => s.id !== selectedStepId));
      setSelectedStepId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления шага");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!token || !confirm("Это создаст дефолтные шаги. Продолжить?")) return;
    setSaving(true);
    try {
      const res = await api.seedDefaultTourSteps(token);
      setSteps(res.items);
      setSelectedStepId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка заполнения по умолчанию");
    } finally {
      setSaving(false);
    }
  };

  // Video upload handler
  const handleVideoUpload = async (file: File) => {
    if (!token || !selectedStepId) return;
    setUploadingVideo(true);
    try {
      const updated = await api.uploadTourStepVideo(token, selectedStepId, file);
      setSteps(steps.map(s => s.id === updated.id ? updated : s));
      setEditVideoUrl(updated.videoUrl || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки видео");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!token || !selectedStepId) return;
    setUploadingVideo(true);
    try {
      const updated = await api.deleteTourStepVideo(token, selectedStepId);
      setSteps(steps.map(s => s.id === updated.id ? updated : s));
      setEditVideoUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления видео");
    } finally {
      setUploadingVideo(false);
    }
  };

  // Mascot upload handler
  const handleMascotUpload = async (file: File) => {
    if (!token) return;
    setUploadingMascot(true);
    try {
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 50) || "Новый персонаж";
      const mascot = await api.uploadTourMascot(token, name, file);
      setMascots([...mascots, mascot]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки персонажа");
    } finally {
      setUploadingMascot(false);
    }
  };

  const handleDeleteMascot = async (mascotId: string) => {
    if (!token || !confirm("Удалить этого персонажа?")) return;
    try {
      await api.deleteTourMascot(token, mascotId);
      setMascots(mascots.filter(m => m.id !== mascotId));
      // If the deleted mascot was selected in editor, clear it
      if (editMascotId === mascotId) setEditMascotId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления персонажа");
    }
  };

  if (loading && steps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeStepsCount = steps.filter(s => s.isActive).length;
  const selectedMascot = mascots.find(m => m.id === editMascotId) ?? null;

  // Check if video is an uploaded file (starts with /api/uploads/) or an external URL
  const isUploadedVideo = editVideoUrl.startsWith("/api/uploads/");

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col relative z-0">
      {/* Ambient background glows */}
      <div className="absolute -top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] -right-[10%] w-[30%] h-[50%] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none -z-10" />
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shrink-0 relative p-6 rounded-[2rem] border border-white/10 bg-background/40 backdrop-blur-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-purple-500/5 pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/20 shadow-[inset_0_0_20px_rgba(var(--primary),0.2)]">
            <LayoutTemplate className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 drop-shadow-sm">
              Конструктор тура
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-foreground/80 shadow-sm backdrop-blur-md transition-colors hover:bg-white/10">
                <Layers className="h-3.5 w-3.5 text-primary/80" />
                {steps.length} шагов
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm backdrop-blur-md transition-colors hover:bg-emerald-500/20">
                <PlayCircle className="h-3.5 w-3.5" />
                {activeStepsCount} активных
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-sm backdrop-blur-md transition-colors hover:bg-purple-500/20">
                <ImagePlus className="h-3.5 w-3.5" />
                {mascots.length} персонажей
              </span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSeedDefaults} 
              className="rounded-2xl shrink-0 h-12 px-6 shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-all duration-300 border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold backdrop-blur-xl overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
              <Sparkles className="h-5 w-5 mr-2 group-hover:animate-spin" />
              Заполнить по умолчанию
            </Button>
          </motion.div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive shrink-0 flex justify-between items-center">
          {error}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Left Panel - Palette */}
        <div className="w-[280px] shrink-0 flex flex-col bg-background/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 overflow-y-auto shadow-2xl relative group/panel">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background/20 to-transparent pointer-events-none rounded-[2rem] opacity-50 group-hover/panel:opacity-100 transition-opacity duration-700" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
          
          <h2 className="text-[11px] font-bold mb-6 text-foreground/80 uppercase tracking-[0.25em] flex items-center gap-2.5 relative z-10">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="absolute w-4 h-4 rounded-full bg-primary/30 animate-ping" />
            </div>
            Палитра целей
          </h2>
          
          <div className="space-y-3 relative z-10">
            {TOUR_TARGETS.map(t => (
              <PaletteItem
                key={t.id}
                target={t}
                onClick={() => handleCreateStep(t)}
              />
            ))}
          </div>
        </div>

        {/* Center Panel - Step Chain */}
        <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 overflow-y-auto shadow-2xl relative group/center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none rounded-[2rem]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-500/10 blur-[60px] pointer-events-none rounded-full" />
          
          <div className="flex items-center justify-between mb-6 relative z-10 pb-4 border-b border-white/5">
            <h2 className="text-[11px] font-bold text-foreground/80 uppercase tracking-[0.25em] flex items-center gap-2.5">
              <Map className="w-4 h-4 text-blue-400" />
              Путь пользователя
            </h2>
            {steps.length > 0 && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)] font-medium">
                Всего: {steps.length}
              </span>
            )}
          </div>
          
          {steps.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground relative z-10"
            >
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full animate-pulse" />
                <div className="absolute inset-0 rounded-[2rem] border border-dashed border-primary/30 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full border border-dashed border-purple-500/30 animate-[spin_15s_linear_infinite_reverse]" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl relative z-10">
                  <Map className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Путешествие не начато</h3>
              <p className="text-sm max-w-[280px] leading-relaxed text-muted-foreground/80">Перетащите элемент из палитры слева, чтобы создать первый шаг для ваших пользователей</p>
            </motion.div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={steps.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 relative z-10 pl-2 pt-2">
                  <AnimatePresence>
                    {steps.map((s, index) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <SortableStepRow 
                          step={s} 
                          isSelected={s.id === selectedStepId}
                          onSelect={() => setSelectedStepId(s.id)}
                          index={index}
                          totalSteps={steps.length}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Panel - Step Editor */}
        <div className="w-[420px] shrink-0 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-y-auto flex flex-col shadow-2xl relative group/editor">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-background/20 to-primary/5 pointer-events-none rounded-[2rem] opacity-50 group-hover/editor:opacity-100 transition-opacity duration-700" />
          <div className="absolute top-[20%] right-[-10%] w-48 h-48 bg-purple-500/10 blur-[60px] pointer-events-none rounded-full" />
          
          {selectedStep ? (
            <div className="p-7 flex flex-col gap-7 relative z-10">
              <div className="flex items-center justify-between pb-5 border-b border-white/5">
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-bold text-2xl tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 drop-shadow-sm flex items-center gap-2.5">
                    <div className="w-2 h-6 rounded-full bg-gradient-to-b from-primary to-purple-500" />
                    Настройки
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold shadow-[0_0_10px_rgba(var(--primary),0.1)]">
                      <Sparkles className="w-3.5 h-3.5" />
                      {selectedStep.targetLabel}
                    </span>
                  </div>
                </div>
                
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-background to-muted/50 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                  {TOUR_TARGETS.find(t => t.target === selectedStep.target)?.icon}
                </div>
              </div>

              {/* Live Preview Mascot — PNG image */}
              <div className="relative group/preview mt-2">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-purple-500/20 rounded-[2rem] blur-[30px] opacity-50 group-hover/preview:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-6 flex flex-col justify-center items-center h-[220px] overflow-hidden shadow-[inset_0_0_40px_rgba(255,255,255,0.02)] transition-all duration-500 hover:border-primary/30 group-hover/preview:shadow-[0_10px_40px_rgba(var(--primary),0.15)]">
                  <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  {selectedMascot ? (
                    <>
                      <div className="absolute w-32 h-32 bg-primary/10 rounded-full blur-[40px] animate-pulse pointer-events-none" />
                      <motion.img 
                        key={selectedMascot.id}
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: [0, -8, 0] }}
                        transition={{ 
                          scale: { type: "spring", stiffness: 200, damping: 20 },
                          opacity: { duration: 0.3 },
                          y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                        }}
                        src={selectedMascot.imageUrl} 
                        alt={selectedMascot.name} 
                        className="max-h-[140px] max-w-full object-contain drop-shadow-[0_15px_25px_rgba(var(--primary),0.4)] z-10"
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="absolute bottom-4 px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-white/10 text-xs font-bold text-foreground/80 shadow-lg z-20 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {selectedMascot.name}
                      </motion.div>
                    </>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 text-muted-foreground/40 z-10"
                    >
                      <div className="w-16 h-16 rounded-3xl bg-muted/30 border border-white/5 flex items-center justify-center relative overflow-hidden group-hover/preview:border-primary/20 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                        <ImagePlus className="w-8 h-8 opacity-50 group-hover/preview:text-primary group-hover/preview:opacity-80 transition-colors relative z-10" />
                      </div>
                      <span className="text-sm font-semibold tracking-wide uppercase">Персонаж не выбран</span>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2 group/input">
                  <Label className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.15em] ml-1">Заголовок</Label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                    <Input 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)} 
                      className="relative bg-background/60 backdrop-blur-sm border-white/10 hover:border-primary/30 focus:border-primary/50 focus:bg-background h-12 text-base transition-all rounded-xl shadow-sm"
                      placeholder="Введите заголовок шага"
                    />
                  </div>
                </div>
                
                <div className="space-y-2 group/input">
                  <Label className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.15em] ml-1">Текст</Label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                    <textarea 
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="relative flex min-h-[120px] w-full rounded-xl border border-white/10 bg-background/60 backdrop-blur-sm px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary/50 hover:border-primary/30 focus:bg-background transition-all resize-none leading-relaxed shadow-sm"
                      placeholder="Опишите, что пользователь должен сделать на этом шаге..."
                    />
                  </div>
                </div>

                {/* Video Upload Section */}
                <div className="space-y-4 pt-6 border-t border-white/5 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] pointer-events-none rounded-full" />
                  
                  <Label className="text-xs font-bold text-foreground/70 uppercase tracking-[0.15em] flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    Медиа-контент
                  </Label>
                  
                  {editVideoUrl ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="relative rounded-[1.5rem] border border-white/10 bg-black/60 overflow-hidden shadow-inner group/video ring-1 ring-white/5 ring-inset">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity z-10 pointer-events-none" />
                        {isUploadedVideo ? (
                          <video
                            src={editVideoUrl}
                            className="w-full aspect-video object-cover transition-transform duration-700 group-hover/video:scale-[1.02]"
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <iframe
                            src={editVideoUrl}
                            className="w-full aspect-video transition-transform duration-700 group-hover/video:scale-[1.02]"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1 group/input">
                          <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                          <Input
                            value={editVideoUrl}
                            onChange={e => setEditVideoUrl(e.target.value)}
                            placeholder="URL или загрузите файл"
                            className="relative bg-background/60 backdrop-blur-sm border-white/10 h-11 pr-10 text-xs font-mono text-muted-foreground truncate hover:border-primary/30 focus:border-primary/50 transition-colors rounded-xl"
                            readOnly={isUploadedVideo}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-11 w-11 rounded-xl border-white/10 hover:border-destructive/30 hover:bg-destructive/10 text-destructive hover:text-destructive shadow-sm transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          onClick={handleDeleteVideo}
                          disabled={uploadingVideo}
                        >
                          {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="relative overflow-hidden rounded-[1.5rem] border border-dashed border-white/20 bg-background/30 hover:bg-primary/5 hover:border-primary/40 transition-all group/upload cursor-pointer"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover/upload:opacity-100 transition-opacity" />
                      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center relative z-10">
                        <div className="w-14 h-14 rounded-full bg-background border border-white/10 flex items-center justify-center shadow-lg group-hover/upload:scale-110 group-hover:upload:border-primary/30 transition-transform duration-300 group-hover/upload:shadow-primary/20">
                          {uploadingVideo ? (
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          ) : (
                            <Upload className="w-6 h-6 text-muted-foreground group-hover/upload:text-primary transition-colors" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground group-hover/upload:text-primary transition-colors">
                            {uploadingVideo ? "Загрузка..." : "Загрузить видео"}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70">
                            MP4, WebM до 50MB
                          </p>
                        </div>
                      </div>
                      
                      {/* URL input area inside the dropzone */}
                      <div className="p-3 border-t border-white/5 bg-background/50 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editVideoUrl}
                          onChange={e => setEditVideoUrl(e.target.value)}
                          placeholder="или вставьте ссылку YouTube..."
                          className="bg-transparent border-none h-9 text-xs shadow-none focus-visible:ring-0 px-2"
                        />
                      </div>
                    </motion.div>
                  )}
                  
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5 relative group/select">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[40px] pointer-events-none rounded-full" />
                  <Label className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    Расположение поп-апа
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-xl opacity-0 group-hover/select:opacity-100 transition-opacity" />
                    <select 
                      value={editPlacement}
                      onChange={e => setEditPlacement(e.target.value)}
                      className="relative flex h-12 w-full rounded-xl border border-white/10 bg-background/60 backdrop-blur-sm px-4 py-2 text-sm hover:border-blue-500/30 focus:border-blue-500/50 focus:bg-background focus:outline-none transition-all appearance-none font-medium cursor-pointer shadow-sm"
                    >
                      <option value="top">Сверху от цели</option>
                      <option value="bottom">Снизу от цели</option>
                      <option value="left">Слева от цели</option>
                      <option value="right">Справа от цели</option>
                      <option value="center">По центру экрана (без привязки)</option>
                    </select>
                  </div>
                </div>

                {/* Mascot Gallery */}
                <div className="space-y-4 pt-6 border-t border-white/5 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[40px] pointer-events-none rounded-full" />
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      Маскот / Стикер
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-lg text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-sm transition-all hover:shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                      onClick={() => mascotInputRef.current?.click()}
                      disabled={uploadingMascot}
                    >
                      {uploadingMascot ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 mr-1.5" />}
                      Загрузить новый
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2.5">
                    {/* "None" option */}
                    <button
                      onClick={() => setEditMascotId(null)}
                      className={`h-[4.5rem] flex flex-col items-center justify-center rounded-xl border text-xs transition-all relative overflow-hidden group ${
                        editMascotId === null 
                          ? "ring-2 ring-primary/50 border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                          : "bg-background/40 border-white/5 hover:bg-background/80 hover:border-white/10"
                      }`}
                      title="Без персонажа"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <X className={`w-5 h-5 mb-1 ${editMascotId === null ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`} />
                      <span className={`text-[9px] font-medium tracking-wide uppercase ${editMascotId === null ? "text-primary/80" : "text-muted-foreground/50"}`}>Скрыть</span>
                    </button>
                    
                    {mascots.map(m => (
                      <div key={m.id} className="relative group">
                        <button
                          onClick={() => setEditMascotId(m.id)}
                          className={`h-[4.5rem] w-full flex flex-col items-center justify-center rounded-xl border transition-all overflow-hidden relative ${
                            editMascotId === m.id 
                              ? "ring-2 ring-primary/50 border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                              : "bg-background/40 border-white/5 hover:bg-background/80 hover:border-white/10"
                          }`}
                          title={m.name}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-0" />
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className={`w-10 h-10 object-contain relative z-10 transition-transform duration-300 ${editMascotId === m.id ? "scale-110 drop-shadow-md" : "group-hover:scale-110"}`}
                          />
                          <span className={`absolute bottom-1 w-full text-[9px] font-medium text-center truncate px-1 z-10 ${editMascotId === m.id ? "text-primary/90" : "text-muted-foreground/70"}`}>
                            {m.name}
                          </span>
                        </button>
                        {/* Delete button for custom mascots */}
                        {!m.isBuiltIn && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMascot(m.id); }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs hover:scale-110 hover:bg-destructive/90 shadow-md z-20"
                            title="Удалить"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <input
                    ref={mascotInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleMascotUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5 relative group/mood">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[40px] pointer-events-none rounded-full" />
                  <Label className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    Эмоция персонажа
                  </Label>
                  <div className="grid grid-cols-4 gap-3 relative z-10">
                    {[
                      { id: "wave", icon: "👋", label: "Привет", color: "from-blue-500/20" },
                      { id: "point", icon: "👉", label: "Указывает", color: "from-emerald-500/20" },
                      { id: "happy", icon: "😄", label: "Радость", color: "from-orange-500/20" },
                      { id: "think", icon: "🤔", label: "Думает", color: "from-purple-500/20" }
                    ].map(mood => (
                      <button
                        key={mood.id}
                        onClick={() => setEditMood(mood.id)}
                        className={`h-14 flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 relative overflow-hidden group/btn ${
                          editMood === mood.id 
                            ? "ring-2 ring-primary/60 border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.2)] scale-[1.02]" 
                            : "bg-background/40 border-white/10 hover:bg-background/80 hover:border-white/20 hover:scale-105 hover:shadow-lg"
                        }`}
                        title={mood.label}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-b ${mood.color} to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity`} />
                        <span className={`text-2xl transition-transform duration-500 relative z-10 ${editMood === mood.id ? "scale-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "group-hover/btn:-translate-y-1 group-hover/btn:scale-110"}`}>
                          {mood.icon}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 mt-4 rounded-2xl bg-gradient-to-r from-background/60 to-background/20 backdrop-blur-md border border-white/10 shadow-inner group/switch hover:border-white/20 transition-all hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${editIsActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "bg-muted text-muted-foreground border-white/10"}`}>
                      <Zap className={`w-5 h-5 ${editIsActive ? "animate-pulse" : ""}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-sm font-bold text-foreground">Активировать шаг</Label>
                      <span className="text-[11px] text-muted-foreground/80 font-medium">Шаг будет отображаться в цепочке тура</span>
                    </div>
                  </div>
                  <Switch checked={editIsActive} onCheckedChange={setEditIsActive} className="data-[state=checked]:bg-emerald-500 scale-110" />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-auto pt-8 border-t border-white/5 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleSaveStep} disabled={saving} className="w-full h-12 rounded-[1rem] font-bold text-[15px] shadow-[0_0_20px_rgba(var(--primary),0.25)] transition-all hover:shadow-[0_0_35px_rgba(var(--primary),0.4)] border border-primary/20 bg-gradient-to-r from-primary to-primary/80 group">
                    <div className="absolute inset-0 rounded-[1rem] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                    {saving ? <Loader2 className="h-5 w-5 mr-2.5 animate-spin" /> : <Save className="h-5 w-5 mr-2.5 group-hover:scale-110 transition-transform" />}
                    Сохранить изменения
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleDeleteStep} disabled={saving} variant="outline" className="w-full h-12 rounded-[1rem] border-white/10 text-destructive/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all font-semibold shadow-sm hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] group">
                    <Trash2 className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                    Удалить шаг
                  </Button>
                </motion.div>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground relative z-10"
            >
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center group/empty cursor-default">
                <div className="absolute inset-0 bg-purple-500/20 blur-[40px] rounded-full animate-pulse group-hover/empty:bg-purple-500/30 transition-colors" />
                <div className="absolute inset-2 rounded-full border border-dashed border-purple-500/30 animate-[spin_12s_linear_infinite]" />
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-background/80 to-purple-500/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 group-hover/empty:scale-110 group-hover/empty:rotate-6">
                  <LayoutTemplate className="w-10 h-10 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-primary">Настройки шага</h3>
              <p className="text-sm max-w-[260px] leading-relaxed text-muted-foreground/80">Выберите любой шаг в цепочке слева, чтобы настроить его параметры и внешний вид</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
