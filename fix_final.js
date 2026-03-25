const fs = require('fs');
const path = 'frontend/src/pages/dashboard.tsx';
let content = fs.readFileSync(path, 'utf-8');

const oldStartBlockRegex = /<div className="relative w-full rounded-\[2rem\][\s\S]*?<div className="relative space-y-8 p-6 sm:p-8 md:p-10 z-10">/;

const newStartBlock = `<div className="relative w-full rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#050507] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1),0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6),0_0_30px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Frame glowing inner border effect (3D Bevel) */}
      <div className="absolute inset-0 border-[2px] border-white/80 dark:border-white/[0.03] rounded-[2rem] pointer-events-none z-20" />
      
      {/* Background Matrix/Grid strictly inside the frame */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: \`url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")\`,
        }}
      />
      
      {/* Animated glowing lights STRICTLY INSIDE the frame, behind the content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-30">
        <motion.div
          animate={{ x: [0, 150, 0], y: [0, 100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] mix-blend-normal"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, -150, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 -right-20 w-[30rem] h-[30rem] bg-primary/20 rounded-full blur-[100px] mix-blend-normal"
        />
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 left-1/4 w-[35rem] h-[35rem] bg-primary/20 rounded-full blur-[120px] mix-blend-normal"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[25rem] h-[25rem] bg-primary/20 rounded-full blur-[100px] mix-blend-normal"
        />
      </div>

      <div className="relative space-y-8 p-6 sm:p-8 md:p-10 z-10">`;

content = content.replace(oldStartBlockRegex, newStartBlock);
fs.writeFileSync(path, content, 'utf-8');
console.log("Fixed lights, background for light theme, and themes");
