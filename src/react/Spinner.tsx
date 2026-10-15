import { LoaderCircle } from 'lucide-react';
import { cx } from './cx.ts';

// Decorative: whatever is loading says so in text or with aria-busy. Under
// reduced motion it stands still (--cuix-spin: none).
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cx('size-4 shrink-0 animate-cuix-spin', className)} />;
}
