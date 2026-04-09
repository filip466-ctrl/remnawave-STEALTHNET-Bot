import { useEffect, useState } from "react";
import { Joyride, Step, type EventData, type TooltipRenderProps } from "react-joyride";
import { TourTooltip } from "./tour-tooltip";
import { api, type ClientTourStep } from "@/lib/api";

interface DashboardTourProps {
  run: boolean;
  onComplete: () => void;
}

export function DashboardTour({ run, onComplete }: DashboardTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourSteps, setTourSteps] = useState<ClientTourStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getClientTourSteps()
      .then((data) => {
        if (cancelled) return;
        setTourSteps(data.items);
        setSteps(
          data.items.map((s) => ({
            target: s.target,
            placement: s.placement as Step["placement"],
            title: s.title,
            content: s.content,
            skipBeacon: true,
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load tour steps:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      options={{
        overlayClickAction: false,
        blockTargetInteraction: true,
        buttons: ["back", "close", "primary", "skip"],
      }}
      onEvent={(data: EventData) => {
        const { status } = data;
        if (status === "finished" || status === "skipped") {
          onComplete();
        }
      }}
      tooltipComponent={(props: TooltipRenderProps) => (
        <TourTooltip {...props} tourSteps={tourSteps} />
      )}
    />
  );
}
