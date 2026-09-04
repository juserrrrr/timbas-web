const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  Spacebar: "Space",
  Shift: "ShiftLeft",
  Control: "ControlLeft",
  Esc: "Escape",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight",
}

export function gameKeyCode(event: Pick<KeyboardEvent, "code" | "key">): string {
  if (event.code && event.code !== "Unidentified") return event.code
  if (/^[a-z]$/i.test(event.key)) return `Key${event.key.toUpperCase()}`
  if (/^[0-9]$/.test(event.key)) return `Digit${event.key}`
  return KEY_ALIASES[event.key] ?? event.key
}

export function isGameControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(
    "input,textarea,select,button,a[href],[contenteditable]:not([contenteditable='false']),[role='textbox'],[role='combobox'],[role='listbox'],[role='slider'],[role='spinbutton'],[role='button']",
  ))
}
