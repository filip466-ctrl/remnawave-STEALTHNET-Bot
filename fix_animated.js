const fs = require('fs');
const path = 'frontend/src/components/animated-background.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Revert the hack that hides it on /admin, we will instead pass a prop to it
content = content.replace(
  'export function AnimatedBackground() {\n  const { config, resolvedMode } = useTheme();\n\n  const location = useLocation();\n  // Hide on Dashboard page as requested by user (Command Center aesthetic)\n  if (location.pathname === "/admin") {\n    return (\n      <div className="fixed inset-0 -z-50 bg-background" aria-hidden />\n    );\n  }',
  'export function AnimatedBackground({ variant = "fixed", intensity = "normal" }: { variant?: "fixed" | "absolute", intensity?: "normal" | "weak" }) {\n  const { config, resolvedMode } = useTheme();\n  const location = useLocation();\n  if (location.pathname === "/admin" && variant === "fixed") return null;'
);

// We need to change the canvas dimensions to match its parent if variant is absolute
content = content.replace(
  'canvas.width = window.innerWidth;\n      canvas.height = window.innerHeight;',
  'if (variant === "fixed") {\n        canvas.width = window.innerWidth;\n        canvas.height = window.innerHeight;\n      } else {\n        const rect = canvas.parentElement?.getBoundingClientRect();\n        if (rect) {\n          canvas.width = rect.width;\n          canvas.height = rect.height;\n        }\n      }'
);

// We also need to change the wrapper classes
content = content.replace(
  '<div className="fixed inset-0 -z-50 overflow-hidden" aria-hidden>',
  '<div className={`${variant === "fixed" ? "fixed" : "absolute"} inset-0 ${variant === "fixed" ? "-z-50" : "z-0"} overflow-hidden ${intensity === "weak" ? "opacity-30" : ""}`} aria-hidden>'
);

// Also we need to make the bgColor transparent when absolute so it doesn't paint over the card background
content = content.replace(
  'const bgColor = isDark ? "#0a0a10" : "#f8fafc";',
  'const bgColor = variant === "fixed" ? (isDark ? "#0a0a10" : "#f8fafc") : "transparent";'
);

fs.writeFileSync(path, content, 'utf-8');
console.log("AnimatedBackground updated to support absolute variant");
