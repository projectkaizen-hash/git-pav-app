import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../auth/auth-api";
import { SessionData } from "@/components/settings/SessionItem";

export function useSessionsQuery() {
  return useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async (): Promise<SessionData[]> => {
      const data = await authApi.listSessions();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await authApi.revokeSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    },
  });
}

export function useRevokeAllOtherSessionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allSessions: SessionData[]) => {
      const otherSessions = allSessions.filter((s) => !s.isCurrent);
      await Promise.all(
        otherSessions.map((session) => authApi.revokeSession(session.id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    },
  });
}

