# Accessibility Checklist

Use this for UI work with forms, dialogs, navigation, menus, custom controls, keyboard interactions, or release review.

## Semantics

- Use native elements before ARIA.
- Buttons trigger actions; links navigate.
- Labels are programmatically associated with inputs.
- Headings follow a logical page structure.
- Errors and helper text are connected to the relevant field.

## Keyboard And Focus

- Every interactive element is reachable by keyboard.
- Focus order follows visual order.
- Dialogs trap focus and return it to the trigger.
- Menus, comboboxes, tabs, and disclosure widgets follow expected key behavior.
- Visible focus states meet contrast and are not hidden by outlines reset globally.

## Visual And Content

- Text and icons meet contrast requirements in light and dark themes.
- Touch targets are large enough for the surrounding UI density.
- Motion respects reduced-motion settings where animation is significant.
- Information is not conveyed by color alone.
- Loading and empty states remain understandable without animation.

## Verification

- Test with keyboard only for the changed flow.
- Inspect labels, roles, names, and error announcements when custom controls are involved.
- Run existing accessibility checks if the repo provides them.
