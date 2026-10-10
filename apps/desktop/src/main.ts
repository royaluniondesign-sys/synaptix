// Termora desktop entrypoint placeholder.
// The real implementation must import a programmatic agent starter instead of shelling out.

export type DesktopRuntimePlan = {
  loadWebDist: boolean;
  startLocalAgent: boolean;
  exposeCli: boolean;
};

export const desktopRuntimePlan: DesktopRuntimePlan = {
  loadWebDist: true,
  startLocalAgent: true,
  exposeCli: true,
};
