import { create } from "zustand";
import type { Activity } from "@/types/db";

type ActivityState = {
  items: Activity[];
  setItems: (items: Activity[]) => void;
};

export const useActivityStore = create<ActivityState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
