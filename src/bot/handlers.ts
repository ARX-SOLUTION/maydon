/**
 * Telegram bot composition root. Each concern lives in its own module and
 * registers its handlers on the shared `bot`; this file wires them together and
 * re-exports the stable surface consumed by main.ts and the API routes.
 */
import { bot } from "./client.ts";
import { registerOnboarding } from "./onboarding.ts";
import { registerAdminInvite } from "./admin-invite.ts";
import { registerAdminList } from "./admin-list.ts";
import { registerModeration } from "./moderation.ts";
import { registerDecisions } from "./decisions.ts";
import { registerCommands } from "./commands.ts";

registerOnboarding();
registerAdminInvite();
registerAdminList();
registerModeration();
registerDecisions();
registerCommands();

export { bot };
export {
  notifyAdminsNewRequest,
  notifyUserConfirmation,
  notifyUserRejection,
  notifyUserCancellation,
} from "./decisions.ts";
