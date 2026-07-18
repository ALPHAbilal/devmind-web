import type { AgentContext, AgentTurn, ExchangeAgent } from "./types";

/**
 * ScriptedAgent — placeholder implementation of the ExchangeAgent seam.
 *
 * It produces a plausible three-beat exchange (hypothesis → plan → locked)
 * from the picks alone, with a small artificial delay so the UI's typing
 * states are exercised. Replace with the Claude-backed agent by implementing
 * the same interface; the canvas and the stored turn format don't change.
 */
export class ScriptedAgent implements ExchangeAgent {
  async start(ctx: AgentContext): Promise<AgentTurn> {
    await wait(1100);
    const n = ctx.picks.length;
    const first = trimText(ctx.picks[0]?.text ?? "", 60);
    return {
      summary_line: `hypothesis: your ${n} pick${n === 1 ? "" : "s"} circle one idea — “${first}”`,
      full_text:
        `I read your ${n} highlight${n === 1 ? "" : "s"}. They seem to circle one idea, ` +
        `starting from “${first}”. What part is doing the most damage — the concept itself, ` +
        `how it shows up in the code, or when you'd actually use it?`,
      options: ["The concept itself", "How it shows up in code", "When to use it"],
    };
  }

  async reply(ctx: AgentContext, userText: string): Promise<AgentTurn> {
    await wait(1100);
    const agentTurns = ctx.priorTurns.filter((t) => t.role === "agent").length;
    if (agentTurns <= 1) {
      return {
        summary_line: `plan: ground it → walk your exact highlights → one exercise`,
        full_text:
          `Got it — “${trimText(userText, 80)}”. Then the lesson will (1) ground the idea from zero, ` +
          `(2) walk your exact highlights line by line, and (3) end with one hands-on exercise. ` +
          `Right focus?`,
        options: ["Perfect, that's it", "Add a real-world example too"],
      };
    }
    const title = `Deep dive: ${trimText(ctx.picks[0]?.text ?? "your highlights", 50)}`;
    return {
      summary_line: "plan locked — waiting for your green flag",
      full_text:
        "Agreed — plan locked. Give the green flag when you're ready and I'll grow the mini notebook.",
      done: true,
      title,
    };
  }
}

function trimText(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
