import { create } from "zustand";

export type ResumeHotspot = {
  id: string;
  pest_type: string;
  main_issue: string;
  severity: number;
  latitude: number;
  longitude: number;
  greenhouse_id: string | null;
  greenhouse_name: string;
  farm_id: string;
  farm_name: string;
  created_at: string;
};

type ResumeHotspotStore = {
  hotspot: ResumeHotspot | null;
  setHotspot: (hotspot: ResumeHotspot) => void;
  clear: () => void;
};

export const useResumeHotspotStore = create<ResumeHotspotStore>((set) => ({
  hotspot: null,
  setHotspot: (hotspot) => set({ hotspot }),
  clear: () => set({ hotspot: null }),
}));
