import { z } from 'zod';

export const ClaudeFlowModeSchema = z.enum(['standard', 'sparc', 'minimal', 'skip']);
export type ClaudeFlowMode = z.infer<typeof ClaudeFlowModeSchema>;

export const MCPServerSchema = z.enum(['claude-flow', 'ruv-swarm', 'flow-nexus']);
export type MCPServer = z.infer<typeof MCPServerSchema>;

export const ClaudeFlowOptionsSchema = z.object({
  /** Initialization mode */
  mode: ClaudeFlowModeSchema,

  /** Enable swarm mode (multi-agent orchestration) */
  enableSwarm: z.boolean(),

  /** Enable Hive Mind system */
  enableHiveMind: z.boolean(),

  /** Selected MCP servers */
  mcpServers: z.array(MCPServerSchema),

  /** Auto-confirm initialization (--yes flag) */
  autoConfirm: z.boolean(),
});

export type ClaudeFlowOptions = z.infer<typeof ClaudeFlowOptionsSchema>;

// Export schema for glob import
export const schema = ClaudeFlowOptionsSchema;
