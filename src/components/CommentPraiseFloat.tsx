import { AnimatePresence, motion } from 'framer-motion';

export interface PraiseFloatItem {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface CommentPraiseFloatProps {
  items: PraiseFloatItem[];
}

export function CommentPraiseFloat({ items }: CommentPraiseFloatProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-visible">
      <AnimatePresence>
        {items.map((item) => (
          <motion.span
            key={item.id}
            initial={{ opacity: 0, y: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: -80, scale: 1.2 }}
            exit={{ opacity: 0, y: -130, scale: 1.05 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute z-[10000] text-2xl md:text-3xl font-black text-emerald-500 drop-shadow-[0_4px_12px_rgba(16,185,129,0.45)]"
            style={{ left: item.x, top: item.y }}
          >
            {item.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
