import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/nns/')({
  component: NnsIndex,
});

function NnsIndex() {
  return (
    <div>Welcome to the NNS route! This is a placeholder for the NNS governance app frontend.</div>
  );
}
