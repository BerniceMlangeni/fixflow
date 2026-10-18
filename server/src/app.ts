import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

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

let nextId = 5;
let nextCommentId = 1;

let issues: Issue[] = [
  {
    id: 1,
    title: 'Login page returns an error',
    description: 'Users receive an error when signing in.',
    category: 'Authentication',
    priority: 'Critical',
    status: 'Open',
    reporter: 'Sarah M.',
    createdAt: '2026-10-17',
  },
  {
    id: 2,
    title: 'Dashboard loads slowly',
    description: 'The dashboard takes too long to load.',
    category: 'Performance',
    priority: 'High',
    status: 'In Progress',
    reporter: 'David K.',
    createdAt: '2026-10-16',
  },
  {
    id: 3,
    title: 'Export button not working',
    description: 'Users cannot export their reports.',
    category: 'Reporting',
    priority: 'Medium',
    status: 'Open',
    reporter: 'Lerato P.',
    createdAt: '2026-10-15',
  },
  {
    id: 4,
    title: 'Update user profile layout',
    description: 'Improve spacing on the profile page.',
    category: 'UI/UX',
    priority: 'Low',
    status: 'Resolved',
    reporter: 'James T.',
    createdAt: '2026-10-14',
  },
];

let comments: IssueComment[] = [];

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'FixFlow API' });
});

app.get('/api/issues', (_req: Request, res: Response) => {
  res.json(issues);
});

app.get('/api/issues/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid issue ID.' });
    return;
  }

  const issue = issues.find((item) => item.id === id);

  if (!issue) {
    res.status(404).json({ error: 'Issue not found.' });
    return;
  }

  res.json(issue);
});

app.post('/api/issues', (req: Request, res: Response) => {
  const result = issueSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'Invalid issue data.',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const issue: Issue = {
    id: nextId++,
    ...result.data,
    status: 'Open',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  issues = [issue, ...issues];

  res.status(201).json(issue);
});

app.patch('/api/issues/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid issue ID.' });
    return;
  }

  const index = issues.findIndex((item) => item.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Issue not found.' });
    return;
  }

  const result = updateSchema.safeParse(req.body);

  if (
    !result.success ||
    Object.keys(req.body ?? {}).length === 0
  ) {
    res.status(400).json({
      error: 'Invalid update data.',
      details: result.success
        ? undefined
        : result.error.flatten().fieldErrors,
    });
    return;
  }

  issues[index] = { ...issues[index], ...result.data };

  res.json(issues[index]);
});

app.delete('/api/issues/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid issue ID.' });
    return;
  }

  const issue = issues.find((item) => item.id === id);

  if (!issue) {
    res.status(404).json({ error: 'Issue not found.' });
    return;
  }

  issues = issues.filter((item) => item.id !== id);
  comments = comments.filter((comment) => comment.issueId !== id);

  res.status(204).send();
});

// Return comments for one issue.
app.get(
  '/api/issues/:id/comments',
  (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const issueExists = issues.some((issue) => issue.id === id);

    if (!issueExists) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    res.json(
      comments
        .filter((comment) => comment.issueId === id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );
  }
);

// Add a comment to an issue.
app.post(
  '/api/issues/:id/comments',
  (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Invalid issue ID.' });
      return;
    }

    const issueExists = issues.some((issue) => issue.id === id);

    if (!issueExists) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    const result = commentSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Invalid comment.',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const comment: IssueComment = {
      id: nextCommentId++,
      issueId: id,
      author: result.data.author,
      message: result.data.message,
      createdAt: new Date().toISOString(),
    };

    comments = [...comments, comment];

    res.status(201).json(comment);
  }
);

export default app;