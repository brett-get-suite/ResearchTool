import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

// ─── Client CRUD ─────────────────────────────────────────────────

export async function getClients() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getClient(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createClient_db(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('clients')
    .insert([{ ...payload, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('clients')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  if (!supabase) return;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// ─── Account CRUD ─────────────────────────────────────────────────

export async function getAccounts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAccount(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createAccount(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .insert([{ ...payload, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id) {
  if (!supabase) return;
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Agent Actions ────────────────────────────────────────────────

export async function getAgentActions(accountId, { limit = 50, offset = 0, agentType } = {}) {
  if (!supabase) return [];
  let query = supabase
    .from('agent_actions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (agentType) query = query.eq('agent_type', agentType);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAgentAction(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createAgentAction(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_actions')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markActionUndone(actionId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_actions')
    .update({ status: 'undone', undone_at: new Date().toISOString() })
    .eq('id', actionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Agent Runs ───────────────────────────────────────────────────

export async function getAgentRuns(accountId, { limit = 20, offset = 0 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('account_id', accountId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export async function createAgentRun(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_runs')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAgentRun(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('agent_runs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Campaign Snapshots ───────────────────────────────────────────

export async function getLatestSnapshot(accountId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('campaign_snapshots')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function saveSnapshot(accountId, snapshotData, metricsData, period = 'last_30_days') {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('campaign_snapshots')
    .insert([{ account_id: accountId, snapshot_data: snapshotData, metrics_data: metricsData, period }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Report Uploads ───────────────────────────────────────────────

export async function getReportUploads(accountId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('report_uploads')
    .select('id, report_type, date_range_start, date_range_end, row_count, file_name, uploaded_at')
    .eq('account_id', accountId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getReportUpload(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_uploads')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createReportUpload(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_uploads')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReportUpload(id) {
  if (!supabase) return;
  const { error } = await supabase.from('report_uploads').delete().eq('id', id);
  if (error) throw error;
}

// ─── Report Analyses ──────────────────────────────────────────────

export async function createReportAnalysis(payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_analyses')
    .insert([{ ...payload, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReportAnalysis(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_analyses')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function updateReportAnalysis(id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('report_analyses')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listReportAnalyses(accountId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('report_analyses')
    .select('id, mode, upload_ids, created_at, data_sufficiency_warnings')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Audit Score History ──────────────────────────────────────────────

export async function getAuditScoreHistory(accountId, limit = 12) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('report_analyses')
    .select('id, created_at, computed_data')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data || []).map((row, i) => ({
    week: `W${i + 1}`,
    score: row.computed_data?.audit_score || row.computed_data?.overall_score || 0,
    date: row.created_at,
  }));
}

// ─── Agent Schedule Config ────────────────────────────────────────────

export async function getAccountSchedule(accountId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();
  if (error || !data) return null;
  return data.settings?.agent_schedule || null;
}

export async function saveAccountSchedule(accountId, scheduleConfig) {
  if (!supabase) return null;
  // Atomic read-modify-write: re-read settings immediately before write
  // to minimize race window. For truly atomic merge, use a Postgres RPC.
  const { data: current, error: readErr } = await supabase
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();
  if (readErr) throw new Error(readErr.message);
  const settings = { ...(current?.settings || {}), agent_schedule: scheduleConfig };
  const { data, error } = await supabase
    .from('accounts')
    .update({ settings, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
