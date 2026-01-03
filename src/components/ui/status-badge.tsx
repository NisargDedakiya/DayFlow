import { cn } from '@/lib/utils';

type Status = 'pending' | 'approved' | 'rejected' | 'present' | 'absent' | 'half-day' | 'leave' | 'paid' | 'sick' | 'unpaid';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  present: 'bg-success/10 text-success border-success/20',
  absent: 'bg-destructive/10 text-destructive border-destructive/20',
  'half-day': 'bg-warning/10 text-warning border-warning/20',
  leave: 'bg-info/10 text-info border-info/20',
  paid: 'bg-success/10 text-success border-success/20',
  sick: 'bg-warning/10 text-warning border-warning/20',
  unpaid: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        statusStyles[status],
        className
      )}
    >
      {status.replace('-', ' ')}
    </span>
  );
}
