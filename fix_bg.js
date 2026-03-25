const fs = require('fs');
const path = 'frontend/src/components/animated-background.tsx';
let content = fs.readFileSync(path, 'utf-8');

if (!content.includes('useLocation')) {
  content = content.replace(
    'import { useTheme, ACCENT_PALETTES } from "@/contexts/theme";',
    'import { useTheme, ACCENT_PALETTES } from "@/contexts/theme";\nimport { useLocation } from "react-router-dom";'
  );
}

const hideLogic = `
  const location = useLocation();
  // Hide on Dashboard page as requested by user (Command Center aesthetic)
  if (location.pathname === "/admin") {
    return (
      <div className="fixed inset-0 -z-50 bg-background" aria-hidden />
    );
  }
`;

content = content.replace('export function AnimatedBackground() {\n  const { config, resolvedMode } = useTheme();', 'export function AnimatedBackground() {\n  const { config, resolvedMode } = useTheme();\n' + hideLogic);

fs.writeFileSync(path, content, 'utf-8');
console.log("Background updated");
