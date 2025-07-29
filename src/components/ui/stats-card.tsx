import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'warning' | 'neutral';
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  className
}: StatsCardProps) {
  const changeColorMap = {
    increase: 'bg-success text-success-foreground',
    decrease: 'bg-danger text-danger-foreground',
    warning: 'bg-warning text-warning-foreground',
    neutral: 'bg-muted text-muted-foreground'
  };

  return (
    <Card className={cn("bg-gradient-card border-border/50 transition-all duration-300 hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={changeColorMap[changeType]}>
            {change}
          </Badge>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}