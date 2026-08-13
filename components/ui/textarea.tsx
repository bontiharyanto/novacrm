import * as React from 'react';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none ${className}`.trim()}
      {...props}
    />
  );
}
