import * as React from 'react';

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`nova-card rounded-xl border border-zinc-800 bg-zinc-900 ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 pb-3 ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-semibold text-zinc-50 ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`mt-1 text-sm text-zinc-400 ${className}`.trim()} {...props} />;
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 pt-0 ${className}`.trim()} {...props} />;
}
