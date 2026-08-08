import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      default: 'h-10 w-10',
      sm: 'h-8 w-8',
      lg: 'h-14 w-14',
      xl: 'h-20 w-20',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  name: string;
  src?: string | null;
}

function Avatar({ className, name, src, size, ...props }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-semibold text-white">
          {initials}
        </div>
      )}
    </div>
  );
}

export { Avatar };