import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/vault/')({
  component: Index,
});

function Index() {
  return (
    <div>
      Welcome to the Vault route! This is a placeholder for the Vault governance app frontend.
    </div>
  );
}
