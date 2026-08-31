/** Auto-generated from VegPro Greenhouse Bay Mapping Star (1).xlsx (Final sheet). */

export type StarGreenhouseRow = {
  id: string;
  name: string;
  areaSqm: number;
  bayMax: number;
  columnMax: number;
  columnsByBay?: Readonly<Record<number, number>>;
  varieties: readonly string[];
  varietyByBay?: Readonly<Record<number, string>>;
};

export const STAR_VARIETY_ORDER = [
  "Red Calypso", "Simply Orange", "Fuschiana", "Athena", "Simply Pink", "Confidential", "Moonwalk", "Inka", "Madam Red", "Pink Arrow", "Escape", "Million Reason", "Revolution", "Orange Candy", "Natures White"
] as const;

export const STAR_GREENHOUSE_ROWS: readonly StarGreenhouseRow[] = [
  { id: "beeeee02-0001-4001-8001-000000000001", name: "STGH01A", areaSqm: 4840, bayMax: 11, columnMax: 11, varieties: ["Red Calypso"] },
  { id: "beeeee02-0001-4001-8001-000000000002", name: "STGH01B", areaSqm: 2433, bayMax: 11, columnMax: 6, varieties: ["Simply Orange"] },
  { id: "beeeee02-0001-4001-8001-000000000003", name: "STGH01C", areaSqm: 2875, bayMax: 11, columnMax: 7, varieties: ["Simply Orange"] },
  { id: "beeeee02-0001-4001-8001-000000000004", name: "STGH01D", areaSqm: 3232, bayMax: 10, columnMax: 8, varieties: ["Simply Orange"] },
  { id: "beeeee02-0001-4001-8001-000000000005", name: "STGH02A", areaSqm: 3447, bayMax: 11, columnMax: 8, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000006", name: "STGH02B", areaSqm: 3447, bayMax: 11, columnMax: 8, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000007", name: "STGH02C", areaSqm: 3447, bayMax: 11, columnMax: 8, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000008", name: "STGH02D", areaSqm: 3446, bayMax: 11, columnMax: 9, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000009", name: "STGH02E", areaSqm: 3446, bayMax: 11, columnMax: 8, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000010", name: "STGH02F", areaSqm: 3447, bayMax: 11, columnMax: 8, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000011", name: "STGH03A", areaSqm: 5280, bayMax: 11, columnMax: 11, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000012", name: "STGH03B", areaSqm: 5280, bayMax: 11, columnMax: 13, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000013", name: "STGH03C", areaSqm: 2530, bayMax: 11, columnMax: 6, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000014", name: "STGH03D", areaSqm: 2530, bayMax: 11, columnMax: 5, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000015", name: "STGH03E", areaSqm: 2530, bayMax: 11, columnMax: 6, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000016", name: "STGH03F", areaSqm: 2530, bayMax: 11, columnMax: 6, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000017", name: "STGH04A", areaSqm: 3877.5, bayMax: 11, columnMax: 11, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000018", name: "STGH04B", areaSqm: 3877.5, bayMax: 11, columnMax: 12, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000019", name: "STGH04C", areaSqm: 3877.5, bayMax: 11, columnMax: 8, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000020", name: "STGH04D", areaSqm: 3877.5, bayMax: 11, columnMax: 6, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000021", name: "STGH04E", areaSqm: 2585, bayMax: 11, columnMax: 6, varieties: ["Simply Orange"] },
  { id: "beeeee02-0001-4001-8001-000000000022", name: "STGH04F", areaSqm: 2585, bayMax: 11, columnMax: 6, varieties: ["Simply Orange"] },
  { id: "beeeee02-0001-4001-8001-000000000023", name: "STGH05A", areaSqm: 5060, bayMax: 11, columnMax: 11, varieties: ["Confidential"] },
  { id: "beeeee02-0001-4001-8001-000000000024", name: "STGH05B", areaSqm: 5060, bayMax: 11, columnMax: 12, varieties: ["Confidential"] },
  { id: "beeeee02-0001-4001-8001-000000000025", name: "STGH06A", areaSqm: 3850, bayMax: 11, columnMax: 9, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000026", name: "STGH06B", areaSqm: 3850, bayMax: 11, columnMax: 9, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000027", name: "STGH06C", areaSqm: 3850, bayMax: 11, columnMax: 9, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000028", name: "STGH06D", areaSqm: 3850, bayMax: 11, columnMax: 9, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000029", name: "STGH07A", areaSqm: 5198.25, bayMax: 11, columnMax: 12, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000030", name: "STGH07B", areaSqm: 5198.25, bayMax: 11, columnMax: 12, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000031", name: "STGH07C", areaSqm: 5198.25, bayMax: 11, columnMax: 11, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000032", name: "STGH07D", areaSqm: 5198.25, bayMax: 11, columnMax: 12, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000033", name: "STGH08A", areaSqm: 3901, bayMax: 6, columnMax: 10, varieties: ["Inka"] },
  { id: "beeeee02-0001-4001-8001-000000000034", name: "STGH08B", areaSqm: 3901, bayMax: 11, columnMax: 10, varieties: ["Inka"] },
  { id: "beeeee02-0001-4001-8001-000000000035", name: "STGH08C", areaSqm: 3901, bayMax: 11, columnMax: 10, varieties: ["Inka"] },
  { id: "beeeee02-0001-4001-8001-000000000036", name: "STGH08D", areaSqm: 3901, bayMax: 11, columnMax: 10, varieties: ["Inka"] },
  { id: "beeeee02-0001-4001-8001-000000000037", name: "STGH09A", areaSqm: 2330, bayMax: 4, columnMax: 8, varieties: ["Madam Red"] },
  { id: "beeeee02-0001-4001-8001-000000000038", name: "STGH09B", areaSqm: 2330, bayMax: 8, columnMax: 10, varieties: ["Madam Red"] },
  { id: "beeeee02-0001-4001-8001-000000000039", name: "STGH10A", areaSqm: 4290, bayMax: 11, columnMax: 10, varieties: ["Madam Red"] },
  { id: "beeeee02-0001-4001-8001-000000000040", name: "STGH10B", areaSqm: 4290, bayMax: 11, columnMax: 10, varieties: ["Madam Red"], columnsByBay: { 1: 10, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9, 10: 9, 11: 9 } },
  { id: "beeeee02-0001-4001-8001-000000000041", name: "STGH10C", areaSqm: 4290, bayMax: 11, columnMax: 10, varieties: ["Madam Red"] },
  { id: "beeeee02-0001-4001-8001-000000000042", name: "STGH10D", areaSqm: 4290, bayMax: 11, columnMax: 10, varieties: ["Madam Red"] },
  { id: "beeeee02-0001-4001-8001-000000000043", name: "STGH11A", areaSqm: 5610, bayMax: 11, columnMax: 13, varieties: ["Simply Pink"] },
  { id: "beeeee02-0001-4001-8001-000000000044", name: "STGH11B", areaSqm: 5610, bayMax: 11, columnMax: 13, varieties: ["Athena", "Simply Pink"], varietyByBay: { 1: "Athena", 2: "Simply Pink", 3: "Simply Pink", 4: "Simply Pink", 5: "Simply Pink", 6: "Simply Pink", 7: "Simply Pink", 8: "Simply Pink", 9: "Simply Pink", 10: "Simply Pink", 11: "Simply Pink" }, columnsByBay: { 1: 12, 2: 13, 3: 13, 4: 13, 5: 13, 6: 13, 7: 13, 8: 13, 9: 13, 10: 13, 11: 13 } },
  { id: "beeeee02-0001-4001-8001-000000000045", name: "STGH11C", areaSqm: 5610, bayMax: 11, columnMax: 12, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000046", name: "STGH11D", areaSqm: 5610, bayMax: 11, columnMax: 13, varieties: ["Athena"] },
  { id: "beeeee02-0001-4001-8001-000000000047", name: "STGH12A", areaSqm: 6600, bayMax: 11, columnMax: 15, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000048", name: "STGH12B", areaSqm: 6600, bayMax: 11, columnMax: 15, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000049", name: "STGH12C", areaSqm: 6600, bayMax: 11, columnMax: 15, varieties: ["Pink Arrow", "Escape"], varietyByBay: { 1: "Pink Arrow", 2: "Pink Arrow", 3: "Pink Arrow", 4: "Pink Arrow", 5: "Pink Arrow", 6: "Pink Arrow", 7: "Escape", 8: "Escape", 9: "Escape", 10: "Escape", 11: "Escape" } },
  { id: "beeeee02-0001-4001-8001-000000000050", name: "STGH12D", areaSqm: 6600, bayMax: 11, columnMax: 15, varieties: ["Pink Arrow", "Escape"], varietyByBay: { 1: "Pink Arrow", 2: "Pink Arrow", 3: "Pink Arrow", 4: "Pink Arrow", 5: "Pink Arrow", 6: "Pink Arrow", 7: "Escape", 8: "Escape", 9: "Escape", 10: "Escape", 11: "Escape" } },
  { id: "beeeee02-0001-4001-8001-000000000051", name: "STGH13A", areaSqm: 5543, bayMax: 11, columnMax: 13, varieties: ["Million Reason", "Revolution"], varietyByBay: { 1: "Million Reason", 2: "Million Reason", 3: "Million Reason", 4: "Million Reason", 5: "Million Reason", 6: "Million Reason", 7: "Million Reason", 8: "Million Reason", 9: "Million Reason", 10: "Million Reason", 11: "Revolution" } },
  { id: "beeeee02-0001-4001-8001-000000000052", name: "STGH13B", areaSqm: 5543, bayMax: 11, columnMax: 11, varieties: ["Million Reason"] },
  { id: "beeeee02-0001-4001-8001-000000000053", name: "STGH13C", areaSqm: 5543, bayMax: 11, columnMax: 14, varieties: ["Million Reason"] },
  { id: "beeeee02-0001-4001-8001-000000000054", name: "STGH13D", areaSqm: 5543, bayMax: 11, columnMax: 12, varieties: ["Million Reason"] },
  { id: "beeeee02-0001-4001-8001-000000000055", name: "STGH13E", areaSqm: 5500, bayMax: 11, columnMax: 13, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000056", name: "STGH13F", areaSqm: 5500, bayMax: 11, columnMax: 12, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000057", name: "STGH14A", areaSqm: 5500, bayMax: 11, columnMax: 13, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000058", name: "STGH14B", areaSqm: 5500, bayMax: 11, columnMax: 11, varieties: ["Moonwalk"] },
  { id: "beeeee02-0001-4001-8001-000000000059", name: "STGH14C", areaSqm: 5573, bayMax: 11, columnMax: 13, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000060", name: "STGH14D", areaSqm: 5574, bayMax: 11, columnMax: 13, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000061", name: "STGH14E", areaSqm: 5573, bayMax: 11, columnMax: 13, varieties: ["Fuschiana"] },
  { id: "beeeee02-0001-4001-8001-000000000062", name: "STGH14F", areaSqm: 5280, bayMax: 11, columnMax: 12, varieties: ["Orange Candy"] },
  { id: "beeeee02-0001-4001-8001-000000000063", name: "STGH15A", areaSqm: 6640, bayMax: 14, columnMax: 13, varieties: ["Natures White"] },
  { id: "beeeee02-0001-4001-8001-000000000064", name: "STGH15B", areaSqm: 6640, bayMax: 14, columnMax: 13, varieties: ["Natures White"] },
  { id: "beeeee02-0001-4001-8001-000000000065", name: "STGH15C", areaSqm: 6640, bayMax: 14, columnMax: 13, varieties: ["Natures White"] },
  { id: "beeeee02-0001-4001-8001-000000000066", name: "STGH15D", areaSqm: 2490, bayMax: 5, columnMax: 10, varieties: ["Natures White"] },
  { id: "beeeee02-0001-4001-8001-000000000067", name: "STGH15E", areaSqm: 2490, bayMax: 5, columnMax: 11, varieties: ["Natures White"] },
];
