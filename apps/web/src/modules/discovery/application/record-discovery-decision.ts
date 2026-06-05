import {
  getDiscoveryLibraryHandoffPolicy,
  isDiscoveryDecision,
  isDiscoverySourceMode,
  type DiscoveryLibraryHandoffStatus
} from "../domain/discovery-policy";
import type {
  DiscoveryLibraryHandoffInput,
  DiscoveryLibraryHandoffResult,
  DiscoveryRepository,
  RecordDiscoveryDecisionInput,
  RecordDiscoveryDecisionResult
} from "./ports";

type LibraryGateway = {
  addGameToWishlist(input: {
    userId: string;
    catalogGameId: string;
  }): Promise<
    | { ok: true }
    | { ok: false; reason: "catalog-game-not-found" | "membership-required" }
  >;
  moveLibraryGame(input: {
    userId: string;
    catalogGameId: string;
    status: string;
  }): Promise<
    | { ok: true }
    | {
        ok: false;
        reason:
          | "future-confirmation-required"
          | "invalid-active-layout"
          | "invalid-status"
          | "jogando-limit-reached"
          | "library-game-not-found"
          | "membership-required"
          | "replacement-required";
        status?: string;
      }
  >;
};

export async function recordDiscoveryDecisionUseCase(
  input: RecordDiscoveryDecisionInput,
  repository: Pick<DiscoveryRepository, "recordDecision">
): Promise<RecordDiscoveryDecisionResult> {
  if (!isDiscoveryDecision(input.decision)) {
    return { ok: false, reason: "invalid-decision" };
  }

  if (!isDiscoverySourceMode(input.sourceMode)) {
    return { ok: false, reason: "invalid-source-mode" };
  }

  return repository.recordDecision(input);
}

export async function handoffDiscoveryMatchToLibraryUseCase(
  input: DiscoveryLibraryHandoffInput,
  repository: Pick<DiscoveryRepository, "markMatchLibraryHandoff">,
  library: LibraryGateway
): Promise<DiscoveryLibraryHandoffResult> {
  const policy = getDiscoveryLibraryHandoffPolicy(input.status);

  if (!policy.ok) {
    return {
      ok: false,
      reason: policy.reason,
      status: input.status
    };
  }

  const libraryResult = await applyLibraryHandoff({
    input: {
      userId: input.userId,
      catalogGameId: input.catalogGameId,
      status: policy.status
    },
    library
  });

  if (!libraryResult.ok) {
    return libraryResult;
  }

  await repository.markMatchLibraryHandoff({
    userId: input.userId,
    catalogGameId: input.catalogGameId,
    status: policy.status
  });

  return {
    ok: true,
    state: {
      kind: "library-updated",
      catalogGameId: input.catalogGameId,
      status: policy.status
    }
  };
}

export async function recordDiscoveryDecision(
  input: RecordDiscoveryDecisionInput
): Promise<RecordDiscoveryDecisionResult> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");
  const result = await recordDiscoveryDecisionUseCase(input, discoveryRepository);

  if (result.ok && result.state.kind === "match-created") {
    const { sendMatchNotification } = await import("./send-match-notification");
    await sendMatchNotification({ match: result.state.match });
  }

  return result;
}

export async function handoffDiscoveryMatchToLibrary(
  input: DiscoveryLibraryHandoffInput
): Promise<DiscoveryLibraryHandoffResult> {
  const [{ discoveryRepository }, library] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../../library")
  ]);

  return handoffDiscoveryMatchToLibraryUseCase(input, discoveryRepository, {
    addGameToWishlist: library.addGameToWishlist,
    moveLibraryGame: library.moveLibraryGame
  });
}

async function applyLibraryHandoff(input: {
  input: {
    userId: string;
    catalogGameId: string;
    status: DiscoveryLibraryHandoffStatus;
  };
  library: LibraryGateway;
}): Promise<DiscoveryLibraryHandoffResult> {
  if (input.input.status === "wishlist") {
    const result = await input.library.addGameToWishlist(input.input);
    return result.ok
      ? { ok: true, state: { kind: "library-updated", ...input.input } }
      : result;
  }

  const moveExisting = await input.library.moveLibraryGame(input.input);

  if (moveExisting.ok) {
    return {
      ok: true,
      state: {
        kind: "library-updated",
        catalogGameId: input.input.catalogGameId,
        status: input.input.status
      }
    };
  }

  if (moveExisting.reason !== "library-game-not-found") {
    return moveExisting;
  }

  const addResult = await input.library.addGameToWishlist({
    userId: input.input.userId,
    catalogGameId: input.input.catalogGameId
  });

  if (!addResult.ok) {
    return addResult;
  }

  const moveCreated = await input.library.moveLibraryGame(input.input);

  if (!moveCreated.ok) {
    return moveCreated;
  }

  return {
    ok: true,
    state: {
      kind: "library-updated",
      catalogGameId: input.input.catalogGameId,
      status: input.input.status
    }
  };
}
