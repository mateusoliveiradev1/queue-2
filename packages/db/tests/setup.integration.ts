import { missingTestDatabaseMessage } from "../src/testing/migrate-empty";

export default function setupIntegrationTests(): void {
  if (!process.env.TEST_DATABASE_URL) {
    console.warn(missingTestDatabaseMessage);
  }
}
