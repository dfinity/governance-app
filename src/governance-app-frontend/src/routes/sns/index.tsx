import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sns/')({
  component: Index,
});

function Index() {
  return (
    <div>Welcome to the SNS route! This is a placeholder for the SNS governance app frontend.</div>
  );
}
