import {
  classifyDuoRouteState,
  classifyMembershipState,
  type DuoRouteState,
  type ProfileSocialLinks
} from "../domain/duo-policy";
import type {
  DuoMemberRecord,
  DuoRepository,
  PairingCodeRecord
} from "./ports";

export type DuoDashboardView = {
  routeState: DuoRouteState;
  profileDisplayName: string;
  profileBio: string | null;
  profileSocialLinks: ProfileSocialLinks;
  duo: null | {
    id: string;
    name: string | null;
    pairedAt: Date | null;
    timezone: string;
    notificationsEnabled: boolean;
    audioEnabled: boolean;
    members: DuoMemberRecord[];
  };
  activePairingCode: PairingCodeRecord | null;
};

export async function getDuoDashboardUseCase(
  userId: string,
  repository: DuoRepository
): Promise<DuoDashboardView> {
  const [context, activePairingCode] = await Promise.all([
    repository.getUserContext(userId),
    repository.getActivePairingCode(userId)
  ]);
  const membershipState = classifyMembershipState({
    memberCount: context.membership?.members.length ?? 0,
    pairedAt: context.membership?.pairedAt ?? null
  });
  const routeState = classifyDuoRouteState({
    membershipState,
    duoName: context.membership?.name ?? null
  });

  return {
    routeState,
    profileDisplayName: context.profileDisplayName,
    profileBio: context.profileBio,
    profileSocialLinks: context.profileSocialLinks,
    duo: context.membership
      ? {
          id: context.membership.duoId,
          name: context.membership.name,
          pairedAt: context.membership.pairedAt,
          timezone: context.membership.timezone,
          notificationsEnabled: context.membership.notificationsEnabled,
          audioEnabled: context.membership.audioEnabled,
          members: context.membership.members
        }
      : null,
    activePairingCode
  };
}
