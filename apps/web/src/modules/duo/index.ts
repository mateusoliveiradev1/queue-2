import "server-only";

import { randomInt } from "node:crypto";

import {
  createPairingCodeUseCase,
  revokePairingCodeUseCase,
  type CreatePairingCodeResult
} from "./application/create-pairing-code";
import {
  getDuoDashboardUseCase,
  type DuoDashboardView
} from "./application/get-duo-dashboard";
import { joinDuoUseCase, type JoinDuoResult } from "./application/join-duo";
import {
  updateDuoSettingsUseCase,
  updateProfileDisplayNameUseCase,
  type UpdateDuoSettingsResult,
  type UpdateProfileResult
} from "./application/update-duo-settings";
import { duoRepository } from "./infrastructure/duo-repository";
import { persistentPairingAttemptLimiter } from "../../platform/rate-limit/persistent";

export {
  buildDuoPath,
  duoUpdateResultToStatus,
  formatPairingCodeExpiry,
  formatPairingDate,
  getDuoStatusMessage,
  joinResultToStatus,
  profileUpdateResultToStatus,
  type DuoStatusState
} from "./presentation/view-models";

export const DUO_MEMBER_LIMIT = 2 as const;

export type {
  CreatePairingCodeResult,
  DuoDashboardView,
  JoinDuoResult,
  UpdateDuoSettingsResult,
  UpdateProfileResult
};

export type {
  DuoMemberRecord,
  PairingCodeRecord
} from "./application/ports";

export function createPairingCode(input: {
  userId: string;
  displayName: string;
  timezone?: string;
}): Promise<CreatePairingCodeResult> {
  return createPairingCodeUseCase(input, {
    repository: duoRepository,
    randomIndex: randomInt,
    now: () => new Date()
  });
}

export function revokePairingCode(input: {
  userId: string;
  pairingCodeId: string;
}) {
  return revokePairingCodeUseCase(input, duoRepository);
}

export function joinDuo(input: {
  userId: string;
  displayName: string;
  code: string;
}): Promise<JoinDuoResult> {
  return joinDuoUseCase(input, {
    repository: duoRepository,
    limiter: persistentPairingAttemptLimiter
  });
}

export function getDuoDashboard(userId: string): Promise<DuoDashboardView> {
  return getDuoDashboardUseCase(userId, duoRepository);
}

export function updateDuoSettings(input: {
  userId: string;
  name: string;
  timezone: string;
  notificationsEnabled: boolean;
  audioEnabled: boolean;
}): Promise<UpdateDuoSettingsResult> {
  return updateDuoSettingsUseCase(input, duoRepository);
}

export function updateProfileDisplayName(input: {
  userId: string;
  displayName: string;
}): Promise<UpdateProfileResult> {
  return updateProfileDisplayNameUseCase(input, duoRepository);
}
