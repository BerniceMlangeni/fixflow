import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { pool } from './db.js';

const app = express();

app.use(cors());
app.use(express.json());

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

interface IssueRow {
  id: string | number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: IssueStatus;
  reporter: string;
  createdAt: Date | string;
}

interface CommentRow {
  id: string | number;
  issueId: string | number;
  author: string;
  message: string;
  createdAt: Date | string;
}

const issueSchema = z.object({
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(8).max(500),
  category: z.string().trim().min(1).max(50),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  reporter: z.string().trim().min(1).max(60),
});

const updateSchema = issueSchema.partial().extend({
  status: z.enum(['Open', 'In Progress', 'Resolved']).optional(),
});

const commentSchema = z.object({
  author: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(1000),
});

function formatIssue(row: IssueRow): Issue {
  const createdAt = row.createdAt instanceof Date
    ? row.createdAt
    : new Date(row.createdAt);

  return {
    ...row,
    id: Number(row.id),
    createdAt: createdAt.toISOString().slice(0, 10),
  };
}

function formatComment(row: CommentRow): IssueComment {
  const createdAt = row.createdAt instanceof Date
    ? row.createdAt
    : new Date(row.createdAt);

  return {
    ...row,
    id: Number(row.id),
    issueId: Number(row.issueId),
    createdAt: createdAt.toISOString(),
  };
}

const demoIssues = [
  {
    title: 'Login page returns an error',
    description: 'Users receive an error when signing in.',
    category: 'Authentication',
    priority: 'Critical' as Priority,
    status: 'Open' as IssueStatus,
    reporter: 'Sarah M.',
    createdAt: '2026-10-17',
  },
  {
    title: 'Dashboard loads slowly',
    description: 'The dashboard takes too long to load.',
    category: 'Performance',
    priority: 'High' as Priority,
    status: 'In Progress' as IssueStatus,
    reporter: 'David K.',
    createdAt: '2026-10-16',
  },
  {
    title: 'Export button not working',
    description: 'Users cannot export their reports.',
    category: 'Reporting',
    priority: 'Medium' as Priority,
    status: 'Open' as IssueStatus,
    reporter: 'Lerato P.',
    createdAt: '2026-10-15',
  },
  {
    title: 'Update user profile layout',
    description: 'Improve spacing on the profile page.',
    category: 'UI/UX',
    priority: 'Low' as Priority,
    status: 'Resolved' as IssueStatus,
    reporter: 'James T.',
    createdAt: '2026-10-14',
  },
];

// Run once when the API starts. Seed only if the table is empty.
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the table during initialization to avoid duplicate seeding.
    await client.query(
      'LOCK TABLE public.issues IN SHARE ROW EXCLUSIVE MODE'
    );

    const result = await client.query(
      'SELECT COUNT(*)::int AS count FROM public.issues'
    );

    if (result.rows[0].count === 0) {
      for (const issue of demoIssues) {
        await client.query(
          `INSERT INTO public.issues
            (title, description, category, priority, status, reporter, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7::date)`,
          [
            issue.title,
            issue.description,
            issue.category,
            issue.priority,
            issue.status,
            issue.reporter,
            issue.createdAt,
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('FixFlow database initialized.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function asyncHandler(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

function parseIssueId(
  value: string | string[] | undefined
): number | null {
  if (typeof value !== 'string') return null;

  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'FixFlow API' });
});

app.get(
  '/api/issues',
  asyncHandler(async (_req, res) => {
    const result = await pool.query<IssueRow>(
      `SELECT id, title, description, category, priority, status, reporter,
              "createdAt"
       FROM public.issues
       ORDER BY "createdAt" DESC, id DESC`
    );

    res.json(result.rows.map(formatIssue));
  })
);

app.get(
  '/api/issues/:id',
  asyncHandler(async (req, res) => {
    const id = parseIssueId(req.params.id);

    if (id === null) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const result = await pool.query<IssueRow>(
      `SELECT id, title, description, category, priority, status, reporter,
              "createdAt"
       FROM public.issues
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    res.json(formatIssue(result.rows[0]));
  })
);

app.post(
  '/api/issues',
  asyncHandler(async (req, res) => {
    const result = issueSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Invalid issue data.',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const data = result.data;

    const inserted = await pool.query<IssueRow>(
      `INSERT INTO public.issues
        (title, description, category, priority, status, reporter)
       VALUES ($1, $2, $3, $4, 'Open', $5)
       RETURNING id, title, description, category, priority, status,
                 reporter, "createdAt"`,
      [
        data.title,
        data.description,
        data.category,
        data.priority,
        data.reporter,
      ]
    );

    res.status(201).json(formatIssue(inserted.rows[0]));
  })
);

app.patch(
  '/api/issues/:id',
  asyncHandler(async (req, res) => {
    const id = parseIssueId(req.params.id);

    if (id === null) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const result = updateSchema.safeParse(req.body);

    if (
      !result.success ||
      !req.body ||
      typeof req.body !== 'object' ||
      Object.keys(req.body).length === 0
    ) {
      res.status(400).json({
        error: 'Invalid update data.',
        details: result.success
          ? undefined
          : result.error.flatten().fieldErrors,
      });
      return;
    }

    const data = result.data;
    const fields: Array<[string, unknown]> = [
      ['title', data.title],
      ['description', data.description],
      ['category', data.category],
      ['priority', data.priority],
      ['status', data.status],
      ['reporter', data.reporter],
    ];

    const updates = fields.filter(([, value]) => value !== undefined);

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields to update.' });
      return;
    }

    const setClauses = updates.map(
      ([field], index) => `"${field}" = $${index + 1}`
    );

    const values = updates.map(([, value]) => value);
    values.push(id);

    const updated = await pool.query<IssueRow>(
      `UPDATE public.issues
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, title, description, category, priority, status,
                 reporter, "createdAt"`,
      values
    );

    if (updated.rowCount === 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    res.json(formatIssue(updated.rows[0]));
  })
);

app.delete(
  '/api/issues/:id',
  asyncHandler(async (req, res) => {
    const id = parseIssueId(req.params.id);

    if (id === null) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM public.issues WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    // PostgreSQL removes its comments automatically via ON DELETE CASCADE.
    res.status(204).send();
  })
);

app.get(
  '/api/issues/:id/comments',
  asyncHandler(async (req, res) => {
    const issueId = parseIssueId(req.params.id);

    if (issueId === null) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const issue = await pool.query(
      'SELECT id FROM public.issues WHERE id = $1',
      [issueId]
    );

    if (issue.rowCount === 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    const result = await pool.query<CommentRow>(
      `SELECT id, "issueId", author, message, "createdAt"
       FROM public.comments
       WHERE "issueId" = $1
       ORDER BY "createdAt" ASC, id ASC`,
      [issueId]
    );

    res.json(result.rows.map(formatComment));
  })
);

app.post(
  '/api/issues/:id/comments',
  asyncHandler(async (req, res) => {
    const issueId = parseIssueId(req.params.id);

    if (issueId === null) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const parsed = commentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid comment.',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const issue = await pool.query(
      'SELECT id FROM public.issues WHERE id = $1',
      [issueId]
    );

    if (issue.rowCount === 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    const inserted = await pool.query<CommentRow>(
      `INSERT INTO public.comments ("issueId", author, message)
       VALUES ($1, $2, $3)
       RETURNING id, "issueId", author, message, "createdAt"`,
      [issueId, parsed.data.author, parsed.data.message]
    );

    res.status(201).json(formatComment(inserted.rows[0]));
  })
);

// Return a consistent JSON response for unexpected API/database errors.
app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(
      'FixFlow API error:',
      error instanceof Error ? error.message : error
    );

    if (!res.headersSent) {
      res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
  }
);

export default app;