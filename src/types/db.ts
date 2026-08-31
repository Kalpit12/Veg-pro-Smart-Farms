export type Role = "admin" | "supervisor" | "worker";

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  type: string;
  created_at: string;
}

export interface Greenhouse {
  id: string;
  farm_id: string;
  name: string;
  crop_type: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export type InfestationStatus = "active" | "sprayed" | "resolved";

export interface InfestationHotspot {
  id: string;
  farm_id: string;
  greenhouse_id: string | null;
  reported_by: string;
  latitude: number;
  longitude: number;
  pest_type: string;
  problem: string;
  main_issue: string;
  severity: number;
  status: InfestationStatus;
  created_at: string;
}

export interface SprayTreatment {
  id: string;
  worker_id: string;
  hotspot_id: string | null;
  farm_id: string;
  greenhouse_id: string | null;
  latitude: number;
  longitude: number;
  product_name: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export interface WorkerPosition {
  worker_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export interface Activity {
  id: string;
  worker_id: string;
  farm_id: string;
  greenhouse_id: string | null;
  activity_type: string;
  notes: string | null;
  image_url: string | null;
  gps_location: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
}

export type ScoutingIssueType = "disease" | "pest";
export type ScoutingParameterGroup = "pest" | "disease" | "crop_health";

export interface CropCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface CropVariety {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
}

export interface ScoutingParameter {
  id: string;
  param_key: string;
  param_group: ScoutingParameterGroup;
  name: string;
  sort_order: number;
}

export interface ScoutingRecord {
  id: string;
  scout_id: string;
  farm_id: string;
  greenhouse_id: string;
  category_id: string;
  variety_id: string;
  beds: number;
  column_no: number;
  bay_no: number;
  issue_type: ScoutingIssueType;
  issue_name: string;
  rating: number | null;
  round_id: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export interface ScoutingObservation {
  id: string;
  record_id: string;
  parameter_id: string;
  present: boolean;
  rating: number | null;
}

export type ScoutingRoundStatus = "active" | "completed";

export interface ScoutingRound {
  id: string;
  scout_id: string;
  farm_id: string;
  greenhouse_id: string;
  status: ScoutingRoundStatus;
  started_at: string;
  ended_at: string | null;
  stop_count: number;
  distance_m: number;
  duration_s: number | null;
  point_count: number;
  coverage_pct: number | null;
  created_at: string;
}

export interface ScoutingRoutePoint {
  id: string;
  round_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  recorded_at: string;
}
