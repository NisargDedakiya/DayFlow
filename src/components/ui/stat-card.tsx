import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  iconClassName?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  className,
  iconClassName 
}: StatCardProps) {
  return (
    <Card className={cn('animate-fade-in', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className={cn(
                'text-xs',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                !trend && 'text-muted-foreground'
              )}>
                {description}
              </p>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            iconClassName || 'bg-primary/10 text-primary'
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
