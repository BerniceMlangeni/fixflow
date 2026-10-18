import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type IssueStatus = 'Open' | 'In Progress' | 'Resolved';
type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: IssueStatus;
  reporter: string;
  createdAt: string;
}

interface IssueComment {
  id: number;
  issueId: number;
  author: string;
  message: string;
  createdAt: string;
}

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.error || `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [category, setCategory] = useState('General');
  const [reporter, setReporter] = useState('');

  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('You');
  const [commentMessage, setCommentMessage] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editPriority, setEditPriority] = useState<Priority>('Medium');
  const [editReporter, setEditReporter] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedIssue = issues.find(
    (issue) => issue.id === selectedIssueId
  );

  useEffect(() => {
    let cancelled = false;

    async function loadIssues() {
      try {
        const data = await apiRequest<Issue[]>('/api/issues');
        if (!cancelled) {
          setIssues(data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load issues.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadIssues();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedIssueId === null) {
      setComments([]);
      return;
    }

    let cancelled = false;

    async function loadComments() {
      setCommentsLoading(true);
      try {
        const data = await apiRequest<IssueComment[]>(
          `/api/issues/${selectedIssueId}/comments`
        );
        if (!cancelled) setComments(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load comments.'
          );
        }
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    }

    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [selectedIssueId]);

  useEffect(() => {
    if (selectedIssueId === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedIssueId(null);
        setEditing(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIssueId]);

  const stats = useMemo(() => ({
    total: issues.length,
    open: issues.filter((issue) => issue.status === 'Open').length,
    progress: issues.filter((issue) => issue.status === 'In Progress').length,
    resolved: issues.filter((issue) => issue.status === 'Resolved').length,
  }), [issues]);

  const filteredIssues = issues.filter((issue) => {
    const text =
      `${issue.title} ${issue.description} ${issue.category}`.toLowerCase();

    return (
      text.includes(search.toLowerCase()) &&
      (statusFilter === 'All' || issue.status === statusFilter)
    );
  });

  function openIssue(issue: Issue) {
    setSelectedIssueId(issue.id);
    setEditing(false);
    setCommentMessage('');
    setCommentAuthor('You');
    setError('');
    setNotice('');

    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditCategory(issue.category);
    setEditPriority(issue.priority);
    setEditReporter(issue.reporter);
  }

  async function addIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const newIssue = await apiRequest<Issue>('/api/issues', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          reporter: reporter.trim(),
        }),
      });

      setIssues((current) => [newIssue, ...current]);
      setTitle('');
      setDescription('');
      setReporter('');
      setPriority('Medium');
      setCategory('General');
      setShowForm(false);
      setStatusFilter('All');
      setSearch('');
      setNotice('Issue created successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create issue.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: IssueStatus) {
    setError('');
    setNotice('');

    try {
      const updated = await apiRequest<Issue>(`/api/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setIssues((current) =>
        current.map((issue) => issue.id === id ? updated : issue)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status.');
    }
  }

  async function saveIssueChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedIssue) return;

    setSaving(true);
    setError('');

    try {
      const updated = await apiRequest<Issue>(
        `/api/issues/${selectedIssue.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription.trim(),
            category: editCategory,
            priority: editPriority,
            reporter: editReporter.trim(),
          }),
        }
      );

      setIssues((current) =>
        current.map((issue) => issue.id === updated.id ? updated : issue)
      );
      setEditing(false);
      setNotice('Issue details updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  }

  

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedIssue || !commentMessage.trim()) return;

    setPostingComment(true);
    setError('');

    try {
      const newComment = await apiRequest<IssueComment>(
        `/api/issues/${selectedIssue.id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            author: commentAuthor.trim(),
            message: commentMessage.trim(),
          }),
        }
      );

      setComments((current) => [...current, newComment]);
      setCommentMessage('');
      setNotice('Comment added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add comment.');
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteIssue(id: number) {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;

    setError('');

    try {
      await apiRequest<void>(`/api/issues/${id}`, { method: 'DELETE' });
      setIssues((current) => current.filter((issue) => issue.id !== id));

      if (selectedIssueId === id) {
        setSelectedIssueId(null);
        setEditing(false);
      }

      setNotice('Issue deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete issue.');
    }
  }

  function closeModal() {
    setSelectedIssueId(null);
    setEditing(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">F</span>
          <span>FixFlow<span className="brand-dot">.</span></span>
        </a>

        <p className="nav-label">WORKSPACE</p>

        <button
          className={`nav-item ${statusFilter === 'All' ? 'active' : ''}`}
          onClick={() => setStatusFilter('All')}
        >
          <span>▦</span> Issue dashboard
        </button>

        <button
          className={`nav-item ${statusFilter === 'Open' ? 'active' : ''}`}
          onClick={() => setStatusFilter('Open')}
        >
          <span>◷</span> Open issues
          <span className="nav-count">{stats.open}</span>
        </button>

        <button
          className={`nav-item ${statusFilter === 'Resolved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('Resolved')}
        >
          <span>✓</span> Resolved issues
        </button>

        <div className="sidebar-bottom">
          <div className="avatar">CM</div>
          <div>
            <strong>Project workspace</strong>
            <p>Issue management</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Dashboard</div>
          <div className="topbar-tag">
            <span className="online-dot" /> System workspace
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1>Issue dashboard</h1>
              <p className="subtitle">
                Track problems, prioritize work, and keep things moving.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setShowForm((current) => !current);
                setError('');
                setNotice('');
              }}
            >
              <span>＋</span> Report an issue
            </button>
          </div>

          {error && (
            <div className="app-message error-message" role="alert">
              <span>{error}</span>
              <button onClick={() => setError('')} aria-label="Dismiss error">
                ✕
              </button>
            </div>
          )}

          {notice && (
            <div className="app-message success-message" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss message">
                ✕
              </button>
            </div>
          )}

          <section className="stats-grid">
            <StatCard label="Total issues" value={stats.total} detail="Across all categories" icon="▤" />
            <StatCard label="Open issues" value={stats.open} detail="Awaiting action" icon="◷" />
            <StatCard label="In progress" value={stats.progress} detail="Currently being handled" icon="↗" />
            <StatCard label="Resolved" value={stats.resolved} detail="Successfully completed" icon="✓" />
          </section>

          {showForm && (
            <form className="issue-form" onSubmit={addIssue}>
              <div className="form-heading">
                <div>
                  <h2>Report a new issue</h2>
                  <p>Provide the details so the team can investigate.</p>
                </div>
                <button type="button" className="close-button" onClick={() => setShowForm(false)}>
                  ✕
                </button>
              </div>

              <label>
                Issue title
                <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={4} maxLength={100} placeholder="e.g. Unable to reset password" />
              </label>

              <label>
                Description
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={8} maxLength={500} placeholder="Describe what happened and how to reproduce it." />
              </label>

              <div className="form-row">
                <label>
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>General</option>
                    <option>Authentication</option>
                    <option>Performance</option>
                    <option>Reporting</option>
                    <option>UI/UX</option>
                    <option>Security</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </label>
              </div>

              <label>
                Reported by
                <input value={reporter} onChange={(e) => setReporter(e.target.value)} required maxLength={60} placeholder="Your name" />
              </label>

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create issue'}
                </button>
              </div>
            </form>
          )}

          <section className="issues-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent issues</h2>
                <p>Click an issue to view its details and activity.</p>
              </div>
              <span className="issue-total">{filteredIssues.length} issues</span>
            </div>

            <div className="filters">
              <div className="search-box">
                <span>⌕</span>
                <input aria-label="Search issues" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues..." />
              </div>

              <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ISSUE</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>REPORTED BY</th>
                    <th>DATE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="empty-state">Loading issues...</td></tr>
                  ) : filteredIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <button className="issue-title-button" onClick={() => openIssue(issue)}>
                          {issue.title}
                        </button>
                        <div className="issue-description">
                          {issue.category} · {issue.description}
                        </div>
                      </td>

                      <td>
                        <span className={`priority priority-${issue.priority.toLowerCase()}`}>
                          {issue.priority}
                        </span>
                      </td>

                      <td>
                        <select
                          className={`status-select status-${issue.status.toLowerCase().replace(' ', '-')}`}
                          aria-label={`Status for ${issue.title}`}
                          value={issue.status}
                          onChange={(e) => void updateStatus(issue.id, e.target.value as IssueStatus)}
                        >
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      </td>

                      <td>{issue.reporter}</td>
                      <td>{issue.createdAt}</td>

                      <td>
                        <button className="delete-button" onClick={() => void deleteIssue(issue.id)} aria-label={`Delete ${issue.title}`}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredIssues.length === 0 && (
                    <tr><td colSpan={6} className="empty-state">No issues found. Try another search or report a new issue.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="footer">
            FixFlow <span>·</span> Issue management made simpler.
          </footer>
        </section>
      </main>

      {selectedIssue && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section
            className="issue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-modal-title"
          >
            <header className="modal-header">
              <div>
                <p className="modal-kicker">ISSUE #{selectedIssue.id}</p>
                <h2 id="issue-modal-title">
                  {editing ? 'Edit issue' : selectedIssue.title}
                </h2>
                <p className="modal-subtitle">
                  Created {selectedIssue.createdAt} by {selectedIssue.reporter}
                </p>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Close issue details">
                ✕
              </button>
            </header>

            {editing ? (
              <form className="modal-edit-form" onSubmit={saveIssueChanges}>
                <label>
                  Issue title
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required minLength={4} maxLength={100} />
                </label>

                <label>
                  Description
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required minLength={8} maxLength={500} rows={4} />
                </label>

                <div className="form-row">
                  <label>
                    Category
                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                      <option>General</option>
                      <option>Authentication</option>
                      <option>Performance</option>
                      <option>Reporting</option>
                      <option>UI/UX</option>
                      <option>Security</option>
                    </select>
                  </label>

                  <label>
                    Priority
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as Priority)}>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </label>
                </div>

                <label>
                  Reported by
                  <input value={editReporter} onChange={(e) => setEditReporter(e.target.value)} required maxLength={60} />
                </label>

                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="modal-badges">
                  <span className={`priority priority-${selectedIssue.priority.toLowerCase()}`}>
                    {selectedIssue.priority} priority
                  </span>
                  <span className={`status-pill status-pill-${selectedIssue.status.toLowerCase().replace(' ', '-')}`}>
                    {selectedIssue.status}
                  </span>
                  <span className="category-pill">{selectedIssue.category}</span>
                </div>

                <div className="modal-section">
                  <h3>Description</h3>
                  <p className="modal-description">{selectedIssue.description}</p>
                </div>

                <div className="modal-section">
                  <div className="comments-heading">
                    <div>
                      <h3>Activity & comments</h3>
                      <p>Discuss updates and share useful details.</p>
                    </div>
                    <span className="comment-count">{comments.length}</span>
                  </div>

                  <div className="comments-list">
                    {commentsLoading ? (
                      <p className="comments-empty">Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className="comments-empty">No comments yet. Start the conversation.</p>
                    ) : comments.map((comment) => (
                      <article className="comment-item" key={comment.id}>
                        <div className="comment-avatar">
                          {comment.author.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="comment-body">
                          <div className="comment-meta">
                            <strong>{comment.author}</strong>
                            <time dateTime={comment.createdAt}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </time>
                          </div>
                          <p>{comment.message}</p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <form className="comment-form" onSubmit={addComment}>
                    <label>
                      Your name
                      <input value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} required maxLength={60} />
                    </label>
                    <label>
                      Add a comment
                      <textarea
                        value={commentMessage}
                        onChange={(e) => setCommentMessage(e.target.value)}
                        required
                        maxLength={1000}
                        rows={3}
                        placeholder="Share an update, ask a question, or suggest a solution..."
                      />
                    </label>
                    <div className="comment-submit-row">
                      <span>{commentMessage.length}/1000</span>
                      <button className="primary-button" type="submit" disabled={postingComment || !commentMessage.trim() || !commentAuthor.trim()}>
                        {postingComment ? 'Posting...' : 'Post comment'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}

            <footer className="modal-footer">
              {!editing && (
                <>
                  <label className="modal-status-control">
                    <span>Status</span>
                    <select
                      className={`status-select status-${selectedIssue.status.toLowerCase().replace(' ', '-')}`}
                      value={selectedIssue.status}
                      onChange={(e) => void updateStatus(selectedIssue.id, e.target.value as IssueStatus)}
                    >
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </select>
                  </label>

                  <div className="modal-footer-actions">
                    <button className="delete-button" onClick={() => void deleteIssue(selectedIssue.id)}>
                      Delete issue
                    </button>
                    <button className="primary-button" onClick={() => setEditing(true)}>
                      Edit issue
                    </button>
                  </div>
                </>
              )}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <p>{detail}</p>
    </article>
  );
}

export default App;