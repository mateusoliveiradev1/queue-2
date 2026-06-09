import type {
  PlayNotificationInput,
  PlayNotificationRecord,
  PlayPushSubscriptionRecord,
  PlayRepository
} from "./ports";

export const ROULETTE_OPERATIONAL_NOTIFICATION_TYPES = [
  "roulette-result-locked",
  "roulette-result-discarded"
] as const;

export type RouletteOperationalNotificationType =
  (typeof ROULETTE_OPERATIONAL_NOTIFICATION_TYPES)[number];

export type OperationalPlayNotificationInput = {
  actorUserId: string;
  notificationType: string;
  resultLibraryGameId?: string | null;
  roundId: string;
};

export type OperationalPlayNotificationResult =
  | {
      ok: true;
      notification: PlayNotificationRecord;
      pushAttempts: number;
      pushDelivered: number;
    }
  | {
      ok: false;
      reason: "membership-required" | "notification-out-of-scope";
    };

type ProductPushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

type ProductPushSender = (input: {
  payload: ProductPushPayload;
  subscription: PlayPushSubscriptionRecord;
}) => Promise<"sent" | "push-not-configured" | "failed">;

export async function createOperationalPlayNotificationUseCase(
  input: OperationalPlayNotificationInput,
  repository: PlayRepository,
  dependencies: {
    sendProductPushNotification: ProductPushSender;
  } = {
    sendProductPushNotification: async () => "push-not-configured"
  }
): Promise<OperationalPlayNotificationResult> {
  if (!isRouletteOperationalNotificationType(input.notificationType)) {
    return {
      ok: false,
      reason: "notification-out-of-scope"
    };
  }

  const copy = getRouletteNotificationCopy(input.notificationType);
  const notificationContext = await repository.runAsUser(
    input.actorUserId,
    async (transaction) => {
      const membership = await transaction.resolveMembership(input.actorUserId);

      if (!membership) {
        return null;
      }

      const notification = await transaction.insertNotificationItem({
        actionRefId: input.roundId,
        actionRefType: "roulette-round",
        actorUserId: input.actorUserId,
        body: copy.body,
        duoId: membership.duoId,
        notificationType: input.notificationType as PlayNotificationInput["notificationType"],
        title: copy.title
      });

      return {
        memberUserIds: membership.memberUserIds,
        notification
      };
    }
  );

  if (!notificationContext) {
    return {
      ok: false,
      reason: "membership-required"
    };
  }

  let pushAttempts = 0;
  let pushDelivered = 0;

  for (const userId of notificationContext.memberUserIds) {
    const subscriptions = await repository.readEnabledPushSubscriptions({ userId });

    for (const subscription of subscriptions) {
      pushAttempts += 1;

      const pushResult = await dependencies.sendProductPushNotification({
        payload: {
          body: copy.pushBody,
          tag: `${input.notificationType}-${input.roundId}`,
          title: copy.pushTitle,
          url: "/app/roleta"
        },
        subscription
      });

      if (pushResult === "sent") {
        pushDelivered += 1;
      }
    }
  }

  return {
    ok: true,
    notification: notificationContext.notification,
    pushAttempts,
    pushDelivered
  };
}

export function isRouletteOperationalNotificationType(
  value: string
): value is RouletteOperationalNotificationType {
  return (ROULETTE_OPERATIONAL_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

function getRouletteNotificationCopy(type: RouletteOperationalNotificationType): {
  body: string;
  pushBody: string;
  pushTitle: string;
  title: string;
} {
  if (type === "roulette-result-discarded") {
    return {
      body: "A dupla descartou o convite da roleta. O jogo continua na fila e entra em cooldown leve.",
      pushBody: "A dupla descartou o convite atual da roleta.",
      pushTitle: "Convite da roleta descartado",
      title: "Convite da roleta descartado"
    };
  }

  return {
    body: "A dupla travou o resultado da roleta como Principal em Jogando.",
    pushBody: "O resultado da roleta virou Principal da dupla.",
    pushTitle: "Roleta travada como Principal",
    title: "Roleta travada como Principal"
  };
}
