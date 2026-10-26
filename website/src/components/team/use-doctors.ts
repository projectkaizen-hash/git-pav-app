import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DOCTORS, toDoctor, type Doctor } from "./team-data";

/**
 * The dentists staff show on the website, in their order. Falls back to the
 * built-in list only when the list can't be loaded, never while it loads, so
 * someone staff removed doesn't flash up.
 */
export function useDoctors(): { doctors: Doctor[]; loading: boolean } {
  const { data, isError, isPending } = useQuery({
    queryKey: ["dentists"],
    queryFn: () => api.dentists.list(),
    staleTime: 5 * 60 * 1000,
  });
  if (isError) return { doctors: DOCTORS, loading: false };
  return { doctors: (data ?? []).map(toDoctor), loading: isPending };
}
