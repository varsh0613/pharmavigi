import { useQuery } from "@tanstack/react-query";

import type { Drug } from "@/data/drugs";
import { fetchDrugProfiles } from "@/lib/api";
import { profilesToDrugs } from "@/lib/profile";

export const DRUGS_QUERY_KEY = ["drugs"] as const;

export function useDrugs() {
  return useQuery({
    queryKey: DRUGS_QUERY_KEY,
    queryFn: async (): Promise<Drug[]> => {
      const profiles = await fetchDrugProfiles();
      return profilesToDrugs(profiles);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
