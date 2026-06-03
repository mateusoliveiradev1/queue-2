export const DUO_MEMBER_LIMIT = 2 as const;

export {
  createPairingCodeUseCase,
  revokePairingCodeUseCase,
  type CreatePairingCodeResult
} from "./application/create-pairing-code";
export {
  getDuoDashboardUseCase,
  type DuoDashboardView
} from "./application/get-duo-dashboard";
export { joinDuoUseCase, type JoinDuoResult } from "./application/join-duo";
export {
  updateDuoSettingsUseCase,
  updateProfileDisplayNameUseCase,
  type UpdateDuoSettingsResult,
  type UpdateProfileResult
} from "./application/update-duo-settings";
export type {
  DuoMemberRecord,
  DuoRepository,
  PairingAttemptLimiter,
  PairingCodeRecord
} from "./application/ports";
