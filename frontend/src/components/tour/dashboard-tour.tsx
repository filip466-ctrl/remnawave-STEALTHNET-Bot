import { useEffect, useState } from "react";
import Joyride, { Step } from "react-joyride";
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
            disableBeacon: true,
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

  // Don't render tour if no steps loaded or still loading
  if (loading || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      disableOverlayClose={true}
      spotlightClicks={false}
      callback={(data) => {
        const { status } = data;
        if (status === "finished" || status === "skipped") {
          onComplete();
        }
      }}
      tooltipComponent={(props) => (
        <TourTooltip {...props} tourSteps={tourSteps} />
      )}
      styles={{
        options: {
          zIndex: 10000,
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
