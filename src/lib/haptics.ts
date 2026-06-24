/**
 * Mobile haptics via the `web-haptics` library. A thin singleton wrapper:
 * fires on supported mobile browsers (mainly Android Chrome via
 * navigator.vibrate) and is a silent no-op everywhere else (desktop, iOS
 * Safari, SSR). Never throws — haptics must never break an interaction.
 */
import { WebHaptics, type HapticInput } from 'web-haptics'

let engine: WebHaptics | null = null

function getEngine(): WebHaptics | null {
  if (typeof window === 'undefined') return null
  if (engine) return engine
  try {
    engine = new WebHaptics()
  } catch {
    engine = null
  }
  return engine
}

export function haptic(input: HapticInput = 'selection'): void {
  try {
    void getEngine()?.trigger(input)
  } catch {
    /* never let haptics break an interaction */
  }
}
