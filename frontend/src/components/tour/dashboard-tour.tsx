import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Joyride, Step, type EventData, type TooltipRenderProps } from "react-joyride";
import { TourTooltip } from "./tour-tooltip";
import { api, type ClientTourStep } from "@/lib/api";

interface DashboardTourProps {
  run: boolean;
  onComplete: () => void;
}

interface TourStepWithRoute extends Step {
  route?: string | null;
}

/**
 * Waits for a DOM element matching the selector to appear.
 * For "body" target — resolves immediately after a short delay.
 */
function waitForElement(
  selector: string,
  callback: () => void,
  maxAttempts = 30,
  intervalMs = 150,
) {
  if (selector === "body") {
    setTimeout(callback, 100);
    return;
  }
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (document.querySelector(selector)) {
      clearInterval(interval);
      setTimeout(callback, 200);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      // Element never appeared — skip forward anyway
      callback();
    }
  }, intervalMs);
}

export function DashboardTour({ run, onComplete }: DashboardTourProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [steps, setSteps] = useState<TourStepWithRoute[]>([]);
  const [tourSteps, setTourSteps] = useState<ClientTourStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Track whether we're mid-navigation so the location effect fires correctly
  const navigatingRef = useRef(false);
  const pendingStepRef = useRef<number | null>(null);

  // ── Load steps from API ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    api
      .getClientTourSteps()
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
            route: s.route,
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to load tour steps:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Start tour when run=true and steps are loaded ────────────────
  useEffect(() => {
    if (!run || loading || steps.length === 0) return;

    const firstStep = steps[0];
    if (firstStep.route && firstStep.route !== location.pathname) {
      // Need to navigate to the route of the first step before starting
      navigatingRef.current = true;
      pendingStepRef.current = 0;
      navigate(firstStep.route);
    } else {
      setStepIndex(0);
      setIsRunning(true);
    }
  }, [run, loading, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── After navigation completes, wait for target then resume ──────
  useEffect(() => {
    if (!navigatingRef.current || pendingStepRef.current === null) return;
    navigatingRef.current = false;

    const idx = pendingStepRef.current;
    pendingStepRef.current = null;
    const currentStep = steps[idx];
    if (!currentStep) return;

    setStepIndex(idx);
    waitForElement(currentStep.target as string, () => {
      setIsRunning(true);
    });
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Joyride event handler (controlled mode) ─────────────────────
  const handleEvent = useCallback(
    (data: EventData) => {
      const { action, index, status, type } = data;

      // Tour finished or skipped
      if (status === "finished" || status === "skipped") {
        setIsRunning(false);
        onComplete();
        return;
      }

      if (type === "step:after") {
        const nextIndex = action === "prev" ? index - 1 : index + 1;

        // Bounds check
        if (nextIndex < 0 || nextIndex >= steps.length) {
          setIsRunning(false);
          onComplete();
          return;
        }

        const nextStep = steps[nextIndex];

        // Check if we need to navigate to a different route
        if (nextStep.route && nextStep.route !== location.pathname) {
          setIsRunning(false);
          navigatingRef.current = true;
          pendingStepRef.current = nextIndex;
          navigate(nextStep.route);
        } else {
          // Same route — just advance the step index
          // Wait a tick for the target to be available (e.g. animations)
          waitForElement(nextStep.target as string, () => {
            setStepIndex(nextIndex);
          });
        }
      }
    },
    [steps, location.pathname, navigate, onComplete],
  );

  if (loading || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      options={{
        overlayClickAction: false,
        blockTargetInteraction: true,
        buttons: ["back", "close", "primary", "skip"],
      }}
      onEvent={handleEvent}
      tooltipComponent={(props: TooltipRenderProps) => (
        <TourTooltip {...props} tourSteps={tourSteps} />
      )}
    />
  );
}
