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
