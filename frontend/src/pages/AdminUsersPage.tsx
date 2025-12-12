import { useEffect, useMemo, useState } from 'react';
import { NavBar } from '../components/NavBar';
import {
  AdminUser,
  listUsers,
  updateUserRole,
  updateUserStatus,
  getFlightApiKeyStatus,
  setFlightApiKey,
} from '../api/admin';

type Role = AdminUser['role'];
type Status = AdminUser['status'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status: Status) {
  switch (status) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100';
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  }
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ hasKey: boolean; source: string | null } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
      setActionUserId(null);
    }
  };

  const refreshApiKeyStatus = async () => {
    try {
      const status = await getFlightApiKeyStatus();
      setApiKeyStatus(status);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    refresh();
    refreshApiKeyStatus();
  }, []);

  const totals = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc[user.status] += 1;
        if (user.role === 'admin') acc.admins += 1;
        return acc;
      },
      { pending: 0, active: 0, rejected: 0, admins: 0 },
    );
  }, [users]);

  async function handleStatusChange(user: AdminUser, status: Status) {
    try {
      setActionUserId(user.id);
      const updated = await updateUserStatus(user.id, status);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to update status');
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRoleChange(user: AdminUser, role: Role) {
    try {
      setActionUserId(user.id);
      const updated = await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to update role');
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <NavBar />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-12 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">User management</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Approve pending accounts, adjust roles, and review access.
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Admin: full access and approvals · Manager: share trips and edit trips · Member: own trips + shared access · View only: can only view trips shared with them
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Flight API key (AeroDataBox)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Required for flight enrichment and hourly day-of sync.
              </p>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {apiKeyStatus?.hasKey
                ? `Configured (${apiKeyStatus.source === 'env' ? 'env' : 'saved'})`
                : 'Not configured'}
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter API key"
              className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none ring-blue-500/50 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSavingKey(true);
                    await setFlightApiKey(apiKeyInput.trim() || undefined);
                    setApiKeyInput('');
                    await refreshApiKeyStatus();
                  } catch (err: any) {
                    console.error(err);
                    setError(err.message ?? 'Failed to save API key');
                  } finally {
                    setSavingKey(false);
                  }
                }}
                className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={savingKey}
              >
                {savingKey ? 'Saving...' : 'Save key'}
              </button>
              <button
                type="button"
                onClick={refreshApiKeyStatus}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Note: Environment variable AERODATABOX_API_KEY takes precedence if set on the server.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Active</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{totals.active}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Pending</div>
            <div className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-300">{totals.pending}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Rejected</div>
            <div className="mt-1 text-2xl font-semibold text-rose-600 dark:text-rose-300">{totals.rejected}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Admins</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totals.admins}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Users
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage approvals and roles.
              </p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? 'Loading...' : `${users.length} user${users.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading users…</div>
            )}
            {!loading && users.length === 0 && (
              <div className="text-sm text-slate-500 dark:text-slate-400">No users found.</div>
            )}
            {!loading &&
              users.map((user) => {
                const busy = actionUserId === user.id;
                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {user.email}
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Joined {formatDate(user.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <label className="text-slate-600 dark:text-slate-400">Role</label>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                          disabled={busy}
                          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none ring-blue-500/50 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="member">Member</option>
                          <option value="view_only">View only</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(user, 'active')}
                          disabled={busy || user.status === 'active'}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(user, 'pending')}
                          disabled={busy || user.status === 'pending'}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(user, 'rejected')}
                          disabled={busy || user.status === 'rejected'}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-200 dark:hover:bg-rose-900/30"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </main>
    </div>
  );
}
