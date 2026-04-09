import { TooltipRenderProps } from "react-joyride";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ClientTourStep } from "@/lib/api";

interface TourTooltipProps extends TooltipRenderProps {
  tourSteps?: ClientTourStep[];
}

export function TourTooltip({
  index,
  step,
  size,
  isLastStep,
  primaryProps,
  backProps,
  skipProps,
  tooltipProps,
  tourSteps,
}: TourTooltipProps) {
  const currentStep = tourSteps?.[index];
  const mascot = currentStep?.mascot ?? null;
  const videoUrl = currentStep?.videoUrl ?? null;
  const isUploadedVideo = videoUrl?.startsWith("/api/uploads/") ?? false;

  return (
    <motion.div
      {...tooltipProps}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex w-[400px] max-w-[90vw] z-[10000] overflow-hidden rounded-3xl border border-white/10 bg-background/80 shadow-2xl backdrop-blur-2xl"
    >
      {/* Content Side */}
      <div className={`flex flex-1 flex-col justify-between p-6 ${mascot ? "w-[60%]" : "w-full"}`}>
        <div className="space-y-3">
          {/* Step dots indicator */}
          <div className="flex gap-1.5 mb-2">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-4 bg-primary" : "w-1.5 bg-primary/20"
                }`}
              />
            ))}
          </div>

          {step.title && (
            <h3 className="text-lg font-bold leading-tight text-foreground">
              {step.title}
            </h3>
          )}

          <div className="text-sm text-muted-foreground leading-relaxed">
            {step.content}
          </div>

          {/* Video embed if present */}
          {videoUrl && (
            <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-border/30">
              {isUploadedVideo ? (
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                />
              ) : (
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button
                {...backProps}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-3"
              >
                ← Назад
              </Button>
            )}
            {!isLastStep && (
              <Button
                {...skipProps}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-3"
              >
                Пропустить
              </Button>
            )}
          </div>
          
          <Button
            {...primaryProps}
            size="sm"
            className={`h-9 px-5 ml-auto font-medium shadow-md hover:scale-105 transition-transform ${isLastStep ? "bg-green-600 hover:bg-green-700 text-white" : "bg-primary text-primary-foreground"}`}
          >
            {isLastStep ? "Завершить" : "Далее →"}
          </Button>
        </div>
      </div>

      {/* Mascot Side — PNG image */}
      {mascot && (
        <div className="relative flex w-[40%] shrink-0 items-end justify-center bg-primary/5 pb-0 pt-4 overflow-hidden border-l border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <img
            src={mascot.imageUrl}
            alt={mascot.name}
            className="max-h-full max-w-full object-contain drop-shadow-lg z-10"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
    </motion.div>
  );
}
