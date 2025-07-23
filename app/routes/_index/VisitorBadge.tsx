import { Clock } from 'lucide-react';

export type VisitorBadgeProps = {
  checkInAt: Date;
  estimatedCheckoutAt: Date;
  isMyVisitor: boolean;
  name: string;
  parentName: string;
};

/**
 * A visitor badge with duration information
 */
export default function VisitorBadge({
  checkInAt,
  estimatedCheckoutAt,
  isMyVisitor,
  name,
  parentName,
}: VisitorBadgeProps) {
  return (
    <div className="kid-bubble p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="handwritten text-lg text-primary">{name}</span>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <span>with</span>
            <span className="handwritten">
              {isMyVisitor ? 'You' : parentName}
            </span>
            {isMyVisitor && <span className="text-primary">✨</span>}
          </p>
        </div>

        <div className="text-right text-sm">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span>since {formatCheckInTime(checkInAt)}</span>
          </div>
          <Badge>{formatTimeRemaining(estimatedCheckoutAt)}</Badge>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: React.PropsWithChildren) {
  return (
    <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground">
      {children}
    </span>
  );
}

function formatCheckInTime(checkInAt: Date) {
  return checkInAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeRemaining(checkoutAt: Date) {
  const now = new Date();
  const remaining = Math.max(
    0,
    Math.ceil((checkoutAt.getTime() - now.getTime()) / 60000)
  );

  if (remaining === 0) return '🏃‍♀️ Leaving soon!';
  if (remaining < 15) return `⏰ ${remaining} min left`;
  return `🎮 ${remaining} min of fun`;
}
