import { createClient } from "@/lib/supabase/client";

type QrResolveRow = {
  qr_value: string;
  farm_id: string;
  greenhouse_id: string | null;
  farm: { name: string } | null;
  greenhouse: { name: string } | null;
};

export async function resolveQrValue(qrValue: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .select(
      "qr_value, farm_id, greenhouse_id, farm:farms(name), greenhouse:greenhouses(name)",
    )
    .eq("qr_value", qrValue)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as QrResolveRow;
  return {
    qr_value: row.qr_value,
    farm_id: row.farm_id,
    greenhouse_id: row.greenhouse_id,
    farm_name: row.farm?.name,
    greenhouse_name: row.greenhouse?.name,
  };
}

