export type ActionApplyState = {
  status: "idle" | "applying" | "applied" | "error" | "superseded";
  error?: string;
};

export const idleActionState: ActionApplyState = { status: "idle" };
