import type {
  DiscoveryMatchRecord,
  DiscoveryPushSubscription,
  DiscoveryRepository
} from "./ports";

export type MatchPushNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type DiscoveryPushService = {
  sendMatchNotification(input: {
    payload: MatchPushNotificationPayload;
    subscription: DiscoveryPushSubscription;
  }): Promise<"sent" | "push-not-configured" | "failed">;
};

export type SendMatchNotificationResult = {
  ok: boolean;
  sent: number;
  skipped: number;
  reason?: "push-not-configured";
};

export async function sendMatchNotificationUseCase(
  input: {
    match: DiscoveryMatchRecord;
  },
  repository: Pick<DiscoveryRepository, "getEnabledPushSubscriptionsForMatch">,
  pushService: DiscoveryPushService
): Promise<SendMatchNotificationResult> {
  const subscriptions = await repository.getEnabledPushSubscriptionsForMatch({
    match: input.match
  });
  let sent = 0;
  let skipped = 0;
  let missingConfig = false;

  for (const subscription of subscriptions) {
    const result = await pushService.sendMatchNotification({
      subscription,
      payload: buildMatchPayload(input.match)
    });

    if (result === "sent") {
      sent += 1;
      continue;
    }

    skipped += 1;
    missingConfig ||= result === "push-not-configured";
  }

  return {
    ok: !missingConfig,
    sent,
    skipped,
    reason: missingConfig ? "push-not-configured" : undefined
  };
}

export async function sendMatchNotification(input: {
  match: DiscoveryMatchRecord;
}): Promise<SendMatchNotificationResult> {
  const [{ discoveryRepository }, pushService] = await Promise.all([
    import("../infrastructure/discovery-repository"),
    import("../infrastructure/push-service")
  ]);

  return sendMatchNotificationUseCase(input, discoveryRepository, pushService);
}

function buildMatchPayload(match: DiscoveryMatchRecord): MatchPushNotificationPayload {
  return {
    title: "Match da dupla!",
    body:
      "Os dois escolheram Quero jogar. Abram a Discovery para celebrar antes de mandar para a fila.",
    url: `/app/descobrir?estado=match-ja-existe&match=${match.id}`,
    tag: `discovery-match-${match.id.slice(0, 16)}`
  };
}
