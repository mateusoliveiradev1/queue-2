import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  DuoMemberRecord,
  DuoMembershipRecord,
  DuoRepository,
  DuoUserContextRecord,
  PairingClaimOutcome,
  PairingCodeRecord
} from "../application/ports";

type ProfileRow = {
  display_name: string;
};

type MembershipRow = {
  duo_id: string;
  member_slot: 1 | 2;
  name: string | null;
  paired_at: Date | null;
  timezone: string;
  created_at: Date;
  notifications_enabled: boolean;
  audio_enabled: boolean;
};

type MemberRow = {
  user_id: string;
  display_name: string;
  member_slot: 1 | 2;
  joined_at: Date;
};

type PairingCodeRow = {
  id: string;
  duo_id: string;
  code: string;
  expires_at: Date;
  revoked_at: Date | null;
  claimed_at: Date | null;
};

let runtimePool: QueueDbPool | undefined;

export const duoRepository: DuoRepository = {
  ensureProfile,
  getUserContext,
  getActivePairingCode,
  createDuoWithPairingCode,
  createPairingCodeForExistingDuo,
  revokePairingCode,
  claimPairingCode,
  updateProfileDisplayName,
  updateDuoSettings,
  updateDuoAudioPreference
};

async function ensureProfile(userId: string, displayName: string): Promise<void> {
  await asUser(userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.profiles (user_id, display_name)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId, displayName]
    );
  });
}

async function getUserContext(userId: string): Promise<DuoUserContextRecord> {
  return asUser(userId, async (client) => {
    const profileResult = await client.query<ProfileRow>(
      `
        SELECT coalesce(profile.display_name, account.name) AS display_name
        FROM auth."user" AS account
        LEFT JOIN app.profiles AS profile ON profile.user_id = account.id
        WHERE account.id = $1
        LIMIT 1
      `,
      [userId]
    );
    const membershipResult = await client.query<MembershipRow>(
      `
        SELECT
          member.duo_id,
          member.member_slot,
          duo.name,
          duo.paired_at,
          duo.timezone,
          duo.created_at,
          coalesce(preference.notifications_enabled, true) AS notifications_enabled,
          coalesce(preference.audio_enabled, true) AS audio_enabled
        FROM app.duo_members AS member
        JOIN app.duos AS duo ON duo.id = member.duo_id
        LEFT JOIN app.duo_preferences AS preference ON preference.duo_id = duo.id
        WHERE member.user_id = $1
        LIMIT 1
      `,
      [userId]
    );
    const membership = membershipResult.rows[0];

    return {
      profileDisplayName: profileResult.rows[0]?.display_name ?? "",
      membership: membership
        ? await mapMembership(client, membership)
        : null
    };
  });
}

async function getActivePairingCode(userId: string): Promise<PairingCodeRecord | null> {
  return asUser(userId, async (client) => {
    const result = await client.query<PairingCodeRow>(
      `
        SELECT
          code.id,
          code.duo_id,
          code.code,
          code.expires_at,
          code.revoked_at,
          code.claimed_at
        FROM app.pairing_codes AS code
        JOIN app.duo_members AS member ON member.duo_id = code.duo_id
        WHERE member.user_id = $1
          AND code.revoked_at IS NULL
          AND code.claimed_at IS NULL
          AND code.expires_at > now()
        ORDER BY code.created_at DESC
        LIMIT 1
      `,
      [userId]
    );

    return result.rows[0] ? mapPairingCode(result.rows[0]) : null;
  });
}

async function createDuoWithPairingCode(input: {
  userId: string;
  code: string;
  expiresAt: Date;
  timezone: string;
}): Promise<PairingCodeRecord> {
  return asUser(input.userId, async (client) => {
    const created = await client.query<{ duo_id: string; pairing_code_id: string }>(
      `
        SELECT duo_id, pairing_code_id
        FROM app.create_duo_with_pairing_code($1, $2, $3, $4, $5)
      `,
      [input.userId, "", input.code, input.expiresAt, input.timezone]
    );
    const row = created.rows[0];

    if (!row) {
      throw new Error("pairing_code_create_failed");
    }

    return requirePairingCode(client, row.pairing_code_id);
  });
}

async function createPairingCodeForExistingDuo(input: {
  userId: string;
  duoId: string;
  code: string;
  expiresAt: Date;
}): Promise<PairingCodeRecord> {
  return asUser(input.userId, async (client) => {
    const result = await client.query<PairingCodeRow>(
      `
        INSERT INTO app.pairing_codes (duo_id, code, created_by_user_id, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, duo_id, code, expires_at, revoked_at, claimed_at
      `,
      [input.duoId, input.code, input.userId, input.expiresAt]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("pairing_code_create_failed");
    }

    return mapPairingCode(row);
  });
}

async function revokePairingCode(input: {
  userId: string;
  pairingCodeId: string;
}): Promise<boolean> {
  return asUser(input.userId, async (client) => {
    const result = await client.query<{ revoked: boolean }>(
      "SELECT app.revoke_pairing_code($1, $2) AS revoked",
      [input.pairingCodeId, input.userId]
    );

    return result.rows[0]?.revoked ?? false;
  });
}

async function claimPairingCode(input: {
  userId: string;
  code: string;
}): Promise<PairingClaimOutcome> {
  try {
    return await asUser(input.userId, async (client) => {
      const result = await client.query<{ duo_id: string }>(
        "SELECT app.claim_pairing_code($1, $2) AS duo_id",
        [input.code, input.userId]
      );
      const duoId = result.rows[0]?.duo_id;

      if (!duoId) {
        return { state: "inactive" } as const;
      }

      await client.query(
        `
          INSERT INTO ops.audit_events (duo_id, actor_user_id, action, metadata)
          VALUES ($1, $2, 'duo.pairing_completed', '{"source":"pairing-code"}'::jsonb)
        `,
        [duoId, input.userId]
      );

      return { state: "claimed", duoId } as const;
    });
  } catch (error) {
    const message = errorMessage(error);

    if (message.includes("user_already_in_duo")) {
      return { state: "already-paired" };
    }

    if (message.includes("pairing_code_formed")) {
      return { state: "race-lost" };
    }

    if (message.includes("pairing_code_inactive")) {
      return { state: "inactive" };
    }

    throw error;
  }
}

async function updateProfileDisplayName(input: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}): Promise<void> {
  await asUser(input.userId, async (client) => {
    await client.query(
      `
        INSERT INTO app.profiles (user_id, display_name, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (user_id) DO UPDATE
        SET display_name = excluded.display_name,
            updated_at = now()
      `,
      [input.userId, input.displayName]
    );
    await client.query(
      `
        UPDATE auth."user"
        SET name = $2,
            image = $3,
            updated_at = now()
        WHERE id = $1
      `,
      [input.userId, input.displayName, input.avatarUrl]
    );
  });
}

async function updateDuoSettings(input: {
  userId: string;
  duoId: string;
  name: string;
  timezone: string;
  notificationsEnabled: boolean;
  audioEnabled: boolean;
}): Promise<boolean> {
  return asUser(input.userId, async (client) => {
    const duoResult = await client.query<{ id: string }>(
      `
        UPDATE app.duos
        SET name = $2,
            timezone = $3,
            updated_at = now()
        WHERE id = $1
        RETURNING id
      `,
      [input.duoId, input.name, input.timezone]
    );

    if (!duoResult.rows[0]) {
      return false;
    }

    await client.query(
      `
        INSERT INTO app.duo_preferences (
          duo_id,
          notifications_enabled,
          audio_enabled,
          updated_at
        )
        VALUES ($1, $2, $3, now())
        ON CONFLICT (duo_id) DO UPDATE
        SET notifications_enabled = excluded.notifications_enabled,
            audio_enabled = excluded.audio_enabled,
            updated_at = now()
      `,
      [input.duoId, input.notificationsEnabled, input.audioEnabled]
    );
    await client.query(
      `
        INSERT INTO ops.audit_events (duo_id, actor_user_id, action, metadata)
        VALUES ($1, $2, 'duo.settings_updated', $3::jsonb)
      `,
      [
        input.duoId,
        input.userId,
        JSON.stringify({
          fields: ["name", "timezone", "notificationsEnabled", "audioEnabled"]
        })
      ]
    );

    return true;
  });
}

async function updateDuoAudioPreference(input: {
  userId: string;
  duoId: string;
  audioEnabled: boolean;
}): Promise<boolean> {
  return asUser(input.userId, async (client) => {
    const result = await client.query<{ duo_id: string }>(
      `
        INSERT INTO app.duo_preferences (
          duo_id,
          audio_enabled,
          updated_at
        )
        VALUES ($1, $2, now())
        ON CONFLICT (duo_id) DO UPDATE
        SET audio_enabled = excluded.audio_enabled,
            updated_at = now()
        RETURNING duo_id
      `,
      [input.duoId, input.audioEnabled]
    );

    return Boolean(result.rows[0]);
  });
}

async function mapMembership(
  client: QueueDbClient,
  row: MembershipRow
): Promise<DuoMembershipRecord> {
  const membersResult = await client.query<MemberRow>(
    `
      SELECT
        member.user_id,
        coalesce(profile.display_name, account.name) AS display_name,
        member.member_slot,
        member.joined_at
      FROM app.duo_members AS member
      JOIN auth."user" AS account ON account.id = member.user_id
      LEFT JOIN app.profiles AS profile ON profile.user_id = member.user_id
      WHERE member.duo_id = $1
      ORDER BY member.member_slot
    `,
    [row.duo_id]
  );

  return {
    duoId: row.duo_id,
    memberSlot: row.member_slot,
    name: row.name,
    pairedAt: row.paired_at,
    timezone: row.timezone,
    createdAt: row.created_at,
    notificationsEnabled: row.notifications_enabled,
    audioEnabled: row.audio_enabled,
    members: membersResult.rows.map(mapMember)
  };
}

async function requirePairingCode(
  client: QueueDbClient,
  pairingCodeId: string
): Promise<PairingCodeRecord> {
  const result = await client.query<PairingCodeRow>(
    `
      SELECT id, duo_id, code, expires_at, revoked_at, claimed_at
      FROM app.pairing_codes
      WHERE id = $1
      LIMIT 1
    `,
    [pairingCodeId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("pairing_code_not_visible");
  }

  return mapPairingCode(row);
}

function mapPairingCode(row: PairingCodeRow): PairingCodeRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    code: row.code,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    claimedAt: row.claimed_at
  };
}

function mapMember(row: MemberRow): DuoMemberRecord {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    memberSlot: row.member_slot,
    joinedAt: row.joined_at
  };
}

function asUser<T>(
  userId: string,
  callback: (client: QueueDbClient) => Promise<T>
): Promise<T> {
  return withAppUserTransaction(getRuntimePool(), userId, callback);
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
}
