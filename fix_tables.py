import sys

with open('frontend/src/pages/analytics.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Table header
text = text.replace(
    'className="border-b border-white/10 bg-white/5 dark:bg-transparent text-xs tracking-widest uppercase text-slate-500 dark:text-primary/60"',
    'className="border-b border-slate-200 dark:border-[#2a2b2e] bg-slate-50/50 dark:bg-transparent text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400"'
)

# Table rows
text = text.replace(
    'className="border-b border-white/5 hover:bg-white/10 dark:hover:bg-primary/5 transition-colors"',
    'className="border-b border-slate-100 dark:border-[#2a2b2e]/50 hover:bg-slate-50 dark:hover:bg-[#2a2b2e]/30 transition-colors"'
)

# Promo headers
p1_old = """            <CardHeader className="pb-2 border-b border-white/10 relative">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-white">
                <span className="text-primary/50">[</span> Промо-ссылки (топ 10) <span className="text-primary/50">]</span>
              </CardTitle>
            </CardHeader>"""
p1_new = """            <CardHeader className="pb-2 relative pt-4 px-5">
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-slate-300">
                <span className="text-slate-400 dark:text-[#4a4b4e]">[</span> Промо-ссылки (топ 10) <span className="text-slate-400 dark:text-[#4a4b4e]">]</span>
              </CardTitle>
            </CardHeader>"""
text = text.replace(p1_old, p1_new)

p2_old = """            <CardHeader className="pb-2 border-b border-white/10 relative">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-white">
                <span className="text-primary/50">[</span> Промокоды (топ 10) <span className="text-primary/50">]</span>
              </CardTitle>
            </CardHeader>"""
p2_new = """            <CardHeader className="pb-2 relative pt-4 px-5">
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-slate-800 dark:text-slate-300">
                <span className="text-slate-400 dark:text-[#4a4b4e]">[</span> Промокоды (топ 10) <span className="text-slate-400 dark:text-[#4a4b4e]">]</span>
              </CardTitle>
            </CardHeader>"""
text = text.replace(p2_old, p2_new)

with open('frontend/src/pages/analytics.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

