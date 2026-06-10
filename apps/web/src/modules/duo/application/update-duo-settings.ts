import {
  isValidTimezone,
  validateProfileBio,
  validateProfileAvatarUrl,
  validateProfileSocialLinks,
  validatePlainText
} from "../domain/duo-policy";
import type { ProfileSocialLinks } from "../domain/duo-policy";
import type { DuoRepository } from "./ports";

export type UpdateDuoSettingsResult =
  | { ok: true; state: "duo-updated" }
  | { ok: false; state: "invalid-name" | "invalid-timezone" | "not-paired" };

export type UpdateProfileResult =
  | { ok: true; state: "profile-updated" }
  | {
      ok: false;
      state:
        | "invalid-display-name"
        | "invalid-avatar-url"
        | "invalid-bio"
        | "invalid-social-links";
    };

export async function updateDuoSettingsUseCase(
  input: {
    userId: string;
    name: string;
    timezone: string;
    notificationsEnabled: boolean;
    audioEnabled: boolean;
  },
  repository: DuoRepository
): Promise<UpdateDuoSettingsResult> {
  const name = validatePlainText(input.name, "duo-name");

  if (!name.ok) {
    return { ok: false, state: "invalid-name" };
  }

  if (!isValidTimezone(input.timezone)) {
    return { ok: false, state: "invalid-timezone" };
  }

  const context = await repository.getUserContext(input.userId);

  if (!context.membership || !context.membership.pairedAt) {
    return { ok: false, state: "not-paired" };
  }

  const updated = await repository.updateDuoSettings({
    userId: input.userId,
    duoId: context.membership.duoId,
    name: name.value,
    timezone: input.timezone.trim(),
    notificationsEnabled: input.notificationsEnabled,
    audioEnabled: input.audioEnabled
  });

  return updated
    ? { ok: true, state: "duo-updated" }
    : { ok: false, state: "not-paired" };
}

export async function updateProfileUseCase(
  input: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    socialLinks?: ProfileSocialLinks;
  },
  repository: DuoRepository
): Promise<UpdateProfileResult> {
  const displayName = validatePlainText(input.displayName, "display-name");

  if (!displayName.ok) {
    return { ok: false, state: "invalid-display-name" };
  }

  const avatarUrl = validateProfileAvatarUrl(input.avatarUrl ?? "");

  if (!avatarUrl.ok) {
    return { ok: false, state: "invalid-avatar-url" };
  }

  const bio = validateProfileBio(input.bio ?? "");

  if (!bio.ok) {
    return { ok: false, state: "invalid-bio" };
  }

  const socialLinks = validateProfileSocialLinks(input.socialLinks ?? {});

  if (!socialLinks.ok) {
    return { ok: false, state: "invalid-social-links" };
  }

  await repository.updateProfile({
    userId: input.userId,
    displayName: displayName.value,
    avatarUrl: avatarUrl.value,
    bio: bio.value,
    socialLinks: socialLinks.value
  });

  return { ok: true, state: "profile-updated" };
}
