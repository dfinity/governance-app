import { nonNullish } from '@dfinity/utils';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { Home, LogIn, ArrowLeft } from 'lucide-react';

import { Button } from '@components/button';

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
});

function NotFoundPage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = nonNullish(identity);

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="flex max-w-md flex-col items-center text-center">
        {/* 404 Number */}
        <h1 className="text-[10rem] leading-none font-bold tracking-tighter text-muted-foreground/20 sm:text-[12rem]">
          404
        </h1>

        {/* Message */}
        <div className="-mt-8 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have been moved or
            doesn't exist.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Button asChild variant="default" size="lg">
              <Link to="/dashboard">
                <Home className="size-4" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild variant="default" size="lg">
              <Link to="/">
                <LogIn className="size-4" />
                Go to Login
              </Link>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
