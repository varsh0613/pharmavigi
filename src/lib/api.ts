import type { DrugProfile } from "@/lib/profile";

const RESULTS_PREFIX = "/results";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const DRUG_SLUGS = [
  "ASPIRIN",
  "CELECOXIB",
  "DICLOFENAC",
  "ETODOLAC",
  "ETORICOXIB",
  "FLURBIPROFEN",
  "IBUPROFEN",
  "INDOMETHACIN",
  "KETOPROFEN",
  "KETOROLAC",
  "LUMIRACOXIB",
  "MEFENAMIC_ACID",
  "MELOXICAM",
  "NAPROXEN",
  "NIMESULIDE",
  "OXAPROZIN",
  "PIROXICAM",
  "ROFECOXIB",
  "SULINDAC",
  "VALDECOXIB",
];

export async function fetchDrugProfiles(): Promise<DrugProfile[]> {
  const profiles = await Promise.all(
    DRUG_SLUGS.map((slug) =>
      get<DrugProfile>(`${RESULTS_PREFIX}/${slug}_profile.json`),
    ),
  );
  return profiles.sort(
    (a, b) =>
      (b.risk_scoring?.risk_index ?? 0) - (a.risk_scoring?.risk_index ?? 0),
  );
}

export async function fetchDrugProfile(drugId: string): Promise<DrugProfile> {
  const slug = drugId.trim().toUpperCase().replace(/\s+/g, "-");
  const path = `${RESULTS_PREFIX}/${slug}_profile.json`;
  try {
    return get<DrugProfile>(path);
  } catch {
    const fallback = DRUG_SLUGS.find(
      (s) => s.toLowerCase().replace(/\s+/g, "-") === slug,
    );
    if (fallback) {
      return get<DrugProfile>(`${RESULTS_PREFIX}/${fallback}_profile.json`);
    }
    throw new Error(`No profile found for '${drugId}'`);
  }
}
