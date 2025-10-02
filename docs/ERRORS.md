# Error Handling

How to handle errors in the Project.

## Queries (loading data)

- Usually doesn't depend on user-action, and a part of the page is not display-able.
- Handle with locality -> show an error component in-place of the expected data.

## Mutations

- Usually triggered by a user action, we want to notify the user even if he navigated away.
- Handle independently of the page -> show a notification, that is persisting in case the page is changed.

## Abstractions

- More complex uses-cases and abstractions to be revied when/if they appear.