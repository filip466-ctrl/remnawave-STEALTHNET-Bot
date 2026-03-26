import re

with open('frontend/src/pages/analytics.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. GlassCard
start_idx = text.find('function GlassCard({')
end_idx = text.find('</motion.div>\n    </motion.div>\n  );\n}') # wait, what does it end with?
