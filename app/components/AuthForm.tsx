import type { ReactNode } from 'react';

interface AuthFormProps {
  title: string;
  children: ReactNode;
}

export default function AuthForm({ title, children }: AuthFormProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
