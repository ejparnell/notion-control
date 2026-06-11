import type { ActionApplyState } from "./actionState";

export function actionButtonLabel(status: ActionApplyState["status"]) {
  if (status === "applying") {
    return "Applying...";
  }

  if (status === "applied") {
    return "Applied";
  }

  if (status === "superseded") {
    return "Superseded";
  }

  if (status === "error") {
    return "Retry";
  }

  return "Apply";
}
