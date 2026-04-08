import { TooltipRenderProps } from "react-joyride";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TourMascot, type MascotMood } from "./tour-mascot";
import { MASCOT_REGISTRY } from "./tour-mascot-registry";
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
  skipProps,
  tooltipProps,
  tourSteps,
}: TourTooltipProps) {
  // Get mood and mascot from API step data, or fallback to defaults
  const currentStep = tourSteps?.[index];
  const mood: MascotMood = (currentStep?.mood as MascotMood) ?? (
    index === 0 ? "wave" : isLastStep ? "happy" : index === 3 ? "think" : "point"
  );

  // Dynamically resolve mascot character from the registry based on step config
  const mascotId = currentStep?.mascotId ?? "girl-1";
  const MascotComponent = MASCOT_REGISTRY[mascotId]?.component ?? TourMascot;

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
      <div className="flex flex-1 flex-col justify-between p-6 w-[60%]">
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
          {currentStep?.videoUrl && (
            <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-border/30">
              <iframe
                src={currentStep.videoUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3">
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
          
          <Button
            {...primaryProps}
            size="sm"
            className={`h-9 px-5 ml-auto font-medium shadow-md hover:scale-105 transition-transform ${isLastStep ? "bg-green-600 hover:bg-green-700 text-white" : "bg-primary text-primary-foreground"}`}
          >
            {isLastStep ? "Завершить" : "Далее →"}
          </Button>
        </div>
      </div>

      {/* Mascot Side */}
      <div className="relative flex w-[40%] shrink-0 items-end justify-center bg-primary/5 pb-0 pt-4 overflow-hidden border-l border-white/5">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        
        <MascotComponent mood={mood} className="drop-shadow-lg z-10" />
      </div>
    </motion.div>
  );
}
