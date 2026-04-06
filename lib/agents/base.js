/**
 * Base agent class implementing the observe → analyze → execute → log pattern.
 * All agents extend this class and implement observe(), analyze(), and execute().
 */

import { createAgentRun, updateAgentRun, createAgentAction } from '../supabase.js';
import { getAccountClient } from '../google-ads-auth.js';
import { callGemini, parseGeminiJSON } from '../gemini.js';

export class BaseAgent {
  /**
   * @param {string} accountId — Supabase UUID
   * @param {string} agentType — 'audit' | 'keyword' | 'bid' | 'budget' | 'ad_copy' | 'negative'
   * @param {string} trigger — 'scheduled' | 'manual' | 'initial'
   */
  constructor(accountId, agentType, trigger = 'scheduled') {
    this.accountId = accountId;
    this.agentType = agentType;
    this.trigger = trigger;
    this.agentRun = null;
    this.client = null;
    this.actions = [];
  }

  async run() {
    try {
      this.agentRun = await createAgentRun({
        account_id: this.accountId,
        agent_type: this.agentType,
        trigger: this.trigger,
        status: 'running',
      });
    } catch (err) {
      console.error(`[${this.agentType}] Failed to create agent run record:`, err);
      throw err;
    }

    try {
      this.client = await getAccountClient(this.accountId);
      const data = await this.observe();
      const decisions = await this.analyze(data);
      await this.execute(decisions);

      await updateAgentRun(this.agentRun.id, {
        status: 'completed',
        actions_taken: this.actions.length,
        summary: this.buildSummary(),
        completed_at: new Date().toISOString(),
      });

      return { success: true, actionsCount: this.actions.length, summary: this.buildSummary() };
    } catch (err) {
      console.error(`[${this.agentType}] Agent failed:`, err);
      await updateAgentRun(this.agentRun.id, {
        status: 'failed',
        error: err.message,
        completed_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  /** Subclasses must implement: fetch current state from Google Ads */
  async observe() {
    throw new Error(`${this.agentType} must implement observe()`);
  }

  /** Subclasses must implement: send data to Gemini, get decisions */
  async analyze(data) {
    throw new Error(`${this.agentType} must implement analyze()`);
  }

  /** Subclasses must implement: apply decisions via Google Ads API */
  async execute(decisions) {
    throw new Error(`${this.agentType} must implement execute()`);
  }

  /** Record a change in agent_actions */
  async logAction({ actionType, entityType, entityResourceName, description, beforeState, afterState, reasoning }) {
    const action = await createAgentAction({
      account_id: this.accountId,
      run_id: this.agentRun.id,
      agent_type: this.agentType,
      action_type: actionType,
      entity_type: entityType,
      entity_resource_name: entityResourceName,
      description,
      before_state: beforeState,
      after_state: afterState,
      reasoning,
      status: 'applied',
    });
    this.actions.push(action);
    return action;
  }

  /** Call Gemini with a prompt, return parsed JSON */
  async callAI(prompt, options = {}) {
    const raw = await callGemini(
      process.env.GEMINI_API_KEY,
      prompt,
      { temperature: 0.2, maxTokens: 8192, ...options }
    );
    return parseGeminiJSON(raw);
  }

  buildSummary() {
    const counts = {};
    for (const a of this.actions) {
      counts[a.action_type] = (counts[a.action_type] || 0) + 1;
    }
    return counts;
  }
}
