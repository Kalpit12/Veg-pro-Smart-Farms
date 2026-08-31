import { create } from "zustand";

type DashboardState = {
  activeWorkers: number;
  setActiveWorkers: (count: number) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  activeWorkers: 0,
  setActiveWorkers: (count) => set({ activeWorkers: count }),
}));
