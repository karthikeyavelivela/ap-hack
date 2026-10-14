import { LAYER_ICON } from '@/assets';
import { cn } from '@/lib';

export function LayerIcon({ i, className, size }: { i: number; className?: string; size?: number }) {
  return <img src={LAYER_ICON[i]} alt="" aria-hidden draggable={false} className={cn('h-full w-full select-none object-contain', className)} style={size ? { width: size, height: size } : undefined} />;
}
