# Error Handling [DRAFT]

How to handle errors in the Project.

## Simple and direct

- Handle errors locally next to where they happen.
- Easy to see, change and understand.
- Based on utility functions/components that help in the rendering and handling.
- Downside: doesn't support showing errors outside of the component that generated them.

## Indirect

- Use an indirection layer to handle errors in more custom and complex ways.
- Errors are never handled locally/directly, they are instead pushed into a context, that is divided into buckets.
- Each error is converted into a standard interface before being put into the context.
- Translation or manupulation of the error is done centrally in the context.
- An error can be part of multiple buckets.
- The error is automatically removed from the buckets when the component that generated it is unmounted.
- Use helper hooks to interact with the context.
- Use helper functions/components to have different rendering ways for the errors (e.g. Toast, Alert, Modal, InfoBox, etc.).
- Each bucket can be consumed in different places, or multiple times, giving full flexibility on how and where to display errors.
- Downside: complex, indirect, more boilerplate.