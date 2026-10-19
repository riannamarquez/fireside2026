// The header avatar fires this event and the demo panel listens, so the two stay decoupled.
export const TOGGLE_DEMO_PANEL = 'postscript:toggle-demo-panel'

export function toggleDemoPanel() {
  window.dispatchEvent(new Event(TOGGLE_DEMO_PANEL))
}
