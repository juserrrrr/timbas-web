import { RouteLoadingSignal } from "@/lib/navigation-context"

// No visual of its own — signals the always-mounted overlay in NavigationProvider
// so the loading animation never restarts mid-navigation.
export default function Loading() {
  return <RouteLoadingSignal />
}
