import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { api, type TourStepRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, GripVertical, Trash2, Plus, Sparkles, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MASCOT_REGISTRY, type MascotId, type MascotMood } from "@/components/tour/tour-mascot-registry";

const TOUR_TARGETS = [
  { id: "welcome", target: "body", label: "Приветствие", icon: "👋", defaultPlacement: "center", description: "Приветственное сообщение" },
  { id: "subscription", target: '[data-tour="subscription"]', label: "Подписка", icon: "🔑", defaultPlacement: "bottom", description: "Карточка подписки" },
  { id: "balance", target: '[data-tour="balance"]', label: "Баланс", icon: "💰", defaultPlacement: "left", description: "Карточка баланса" },
  { id: "tariffs", target: '[data-tour="tariffs"]', label: "Тарифы", icon: "📦", defaultPlacement: "right", description: "Раздел тарифов" },
  { id: "referrals", target: '[data-tour="referrals"]', label: "Рефералы", icon: "👥", defaultPlacement: "right", description: "Реферальная программа" },
  { id: "farewell", target: "body", label: "Завершение", icon: "✨", defaultPlacement: "center", description: "Прощальное сообщение" },
];

function SortableStepRow({
  step,
  isSelected,
  onSelect,
}: {
  step: TourStepRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const targetDef = TOUR_TARGETS.find(t => t.target === step.target) || TOUR_TARGETS[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
        isDragging ? "opacity-80 shadow-lg z-10 scale-105" : ""
      } ${
        isSelected 
          ? "ring-2 ring-primary bg-primary/10 border-primary/50" 
          : "bg-card/60 border-border/40 hover:bg-card/80"
      }`}
    >
      <div
        className="flex h-8 w-8 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-lg bg-muted/80 text-muted-foreground hover:bg-muted"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-lg shrink-0 border shadow-sm">
        {targetDef.icon}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="font-semibold text-sm truncate">{step.title || "Без заголовка"}</span>
        <span className="text-xs text-muted-foreground truncate">{step.targetLabel}</span>
      </div>
      <div className="ml-auto flex items-center shrink-0">
        <div className={`w-2 h-2 rounded-full ${step.isActive ? "bg-green-500" : "bg-muted"}`} title={step.isActive ? "Активен" : "Неактивен"} />
      </div>
    </div>
  );
}

export function TourConstructorPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? null;

  const [steps, setSteps] = useState<TourStepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editPlacement, setEditPlacement] = useState("center");
  const [editMascotId, setEditMascotId] = useState<MascotId>("girl-1");
  const [editMood, setEditMood] = useState<MascotMood>("wave");
  const [editIsActive, setEditIsActive] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getTourSteps(token);
      setSteps(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const selectedStep = steps.find(s => s.id === selectedStepId);

  useEffect(() => {
    if (selectedStep) {
      setEditTitle(selectedStep.title);
      setEditContent(selectedStep.content);
      setEditVideoUrl(selectedStep.videoUrl || "");
      setEditPlacement(selectedStep.placement);
      setEditMascotId(selectedStep.mascotId as MascotId);
      setEditMood(selectedStep.mood as MascotMood);
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
      const newStep = await api.createTourStep(token, {
        target: targetDef.target,
        targetLabel: targetDef.label,
        title: targetDef.description,
        content: "Текст шага...",
        placement: targetDef.defaultPlacement,
        mascotId: "girl-1",
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

  if (loading && steps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeStepsCount = steps.filter(s => s.isActive).length;
  const ActiveMascotComponent = MASCOT_REGISTRY[editMascotId]?.component || MASCOT_REGISTRY["girl-1"].component;

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Конструктор тура</h1>
          <p className="text-muted-foreground mt-1">
            {steps.length} шагов · {activeStepsCount} активных
          </p>
        </div>
        <Button onClick={handleSeedDefaults} variant="secondary" className="rounded-xl shrink-0">
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          Заполнить по умолчанию
        </Button>
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
        <div className="w-[220px] shrink-0 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Палитра целей</h2>
          <div className="space-y-3">
            {TOUR_TARGETS.map(t => (
              <div 
                key={t.id}
                onClick={() => handleCreateStep(t)}
                className="bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl p-3 cursor-pointer transition-all flex items-center gap-3 group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background text-lg shadow-sm group-hover:scale-110 transition-transform">
                  {t.icon}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{t.label}</span>
                  <span className="text-xs text-muted-foreground">Добавить шаг</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Step Chain */}
        <div className="flex-1 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Цепочка шагов</h2>
          
          {steps.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground opacity-70">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Нет шагов. Добавьте элемент из палитры <br/> или нажмите «Заполнить по умолчанию»</p>
            </div>
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
                <div className="space-y-3">
                  <AnimatePresence>
                    {steps.map(s => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <SortableStepRow 
                          step={s} 
                          isSelected={s.id === selectedStepId}
                          onSelect={() => setSelectedStepId(s.id)}
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
        <div className="w-[340px] shrink-0 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-y-auto flex flex-col">
          {selectedStep ? (
            <div className="p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Редактор шага</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedStep.targetLabel}</span>
                </div>
              </div>

              {/* Live Preview Mascot */}
              <div className="bg-background/50 rounded-xl border p-4 flex justify-center items-center h-[180px] overflow-hidden">
                <ActiveMascotComponent mood={editMood} className="scale-110" />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Заголовок</Label>
                  <Input 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    className="bg-background/50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label>Текст</Label>
                  <textarea 
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Видео URL (опционально)</Label>
                  <Input 
                    value={editVideoUrl} 
                    onChange={e => setEditVideoUrl(e.target.value)} 
                    placeholder="https://youtube.com/embed/..."
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Расположение</Label>
                  <select 
                    value={editPlacement}
                    onChange={e => setEditPlacement(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="top">Сверху</option>
                    <option value="bottom">Снизу</option>
                    <option value="left">Слева</option>
                    <option value="right">Справа</option>
                    <option value="center">По центру</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Персонаж</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(MASCOT_REGISTRY).map(([id, info]) => (
                      <button
                        key={id}
                        onClick={() => setEditMascotId(id as MascotId)}
                        className={`h-12 flex flex-col items-center justify-center rounded-lg border text-xl bg-background/50 transition-all ${
                          editMascotId === id ? "ring-2 ring-primary border-primary bg-primary/10" : "hover:bg-muted"
                        }`}
                        title={info.label}
                      >
                        {info.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Настроение</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "wave", icon: "👋" },
                      { id: "point", icon: "👉" },
                      { id: "happy", icon: "😄" },
                      { id: "think", icon: "🤔" }
                    ].map(mood => (
                      <button
                        key={mood.id}
                        onClick={() => setEditMood(mood.id as MascotMood)}
                        className={`h-10 flex items-center justify-center rounded-lg border text-lg bg-background/50 transition-all ${
                          editMood === mood.id ? "ring-2 ring-primary border-primary bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        {mood.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <Label>Активен</Label>
                  <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/50">
                <Button onClick={handleSaveStep} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Сохранить
                </Button>
                <Button onClick={handleDeleteStep} disabled={saving} variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить шаг
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground opacity-70">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 opacity-40" />
              </div>
              <p>Выберите шаг в цепочке <br/> для редактирования</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}