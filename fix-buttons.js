const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/cabinet/client-subscribe.tsx', 'utf8');

// Replace the Add Subscription button
content = content.replace(
  /<Button \s*variant="default" \s*size="sm" \s*className="gap-2 min-h-\[40px\] shadow-lg shadow-primary\/20 hover:shadow-primary\/30 transition-all hover:scale-\[1\.02\]" \s*asChild\s*>\s*<a href=\{deeplinkUrl\} target="_blank" rel="noopener noreferrer" onClick=\{handleClick\} className="flex flex-row items-center gap-2 whitespace-nowrap w-full justify-center">\s*<Plus className="h-4 w-4 shrink-0" \/>\s*\{label\}\s*<\/a>\s*<\/Button>/g,
  `<a href={deeplinkUrl} target="_blank" rel="noopener noreferrer" onClick={handleClick} className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-2 min-h-[40px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] flex-row flex-nowrap whitespace-nowrap w-full sm:w-auto w-max")}>\n                                  <Plus className="h-4 w-4 shrink-0" />\n                                  {label}\n                                </a>`
);

// Replace the External/App Store button
content = content.replace(
  /<Button \s*key=\{btnIndex\} \s*variant="outline" \s*size="sm" \s*className="gap-2 min-h-\[40px\] border-slate-200\/50 dark:border-white\/10 bg-white\/50 dark:bg-white\/5 hover:bg-white\/80 dark:hover:bg-white\/10 transition-colors" \s*asChild\s*>\s*<a href=\{href\} target="_blank" rel="noopener noreferrer" className="flex flex-row items-center gap-2 whitespace-nowrap w-full justify-center">\s*<ExternalLink className="h-4 w-4" \/>\s*\{label\}\s*<\/a>\s*<\/Button>/g,
  `<a key={btnIndex} href={href} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 min-h-[40px] border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors flex-row flex-nowrap whitespace-nowrap w-full sm:w-auto w-max")}>\n                              <ExternalLink className="h-4 w-4 shrink-0" />\n                              {label}\n                            </a>`
);

fs.writeFileSync('frontend/src/pages/cabinet/client-subscribe.tsx', content);
