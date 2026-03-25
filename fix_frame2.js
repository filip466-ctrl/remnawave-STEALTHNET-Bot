const fs = require('fs');
const path = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(path, 'utf-8');

// The start wrapper
const oldStart = `<div className="relative w-full rounded-[2.5rem] border-2 border-primary/30 dark:border-primary/40 bg-white/50 dark:bg-black/20 backdrop-blur-xl shadow-[inset_0_0_60px_rgba(0,0,0,0.1),0_8px_32px_hsl(var(--primary)/0.1)] overflow-hidden">
      {/* Frame glowing inner border effect */}
      <div className="absolute inset-0 border border-white/40 dark:border-primary/20 rounded-[2.5rem] pointer-events-none" />
      {/* Background Matrix/Grid strictly inside the frame */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: \`url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")\`,
        }}
      />
      {/* Ambient glowing lights STRICTLY INSIDE the frame */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />

      <div className="relative space-y-8 p-6 sm:p-8 md:p-10 z-10">`;

const newStart = `<div className="relative w-full rounded-[2rem] border-2 border-primary/40 dark:border-primary/50 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-3xl shadow-[0_0_40px_hsl(var(--primary)/0.15)] overflow-hidden">
      {/* Frame glowing inner border effect */}
      <div className="absolute inset-0 border border-white/60 dark:border-primary/20 rounded-[2rem] pointer-events-none" />
      
      {/* Background Matrix/Grid strictly inside the frame */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: \`url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")\`,
        }}
      />
      
      {/* Ambient glowing lights STRICTLY INSIDE the frame */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/30 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />

      <div className="relative space-y-8 p-6 sm:p-8 md:p-10 z-10">`;

content = content.replace(oldStart, newStart);

fs.writeFileSync(path, content, 'utf-8');
console.log("Frame updated");
