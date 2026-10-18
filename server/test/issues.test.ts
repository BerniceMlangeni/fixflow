
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('FixFlow API', () => {
  it('returns a healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('FixFlow API');
  });

  it('returns the list of issues', async () => {
    const response = await request(app).get('/api/issues');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('returns an existing issue by ID', async () => {
    const response = await request(app).get('/api/issues/1');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(1);
    expect(response.body.title).toBe('Login page returns an error');
  });

  it('returns 404 for an issue that does not exist', async () => {
    const response = await request(app).get('/api/issues/99999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Issue not found.');
  });

  it('rejects invalid issue data', async () => {
    const response = await request(app)
      .post('/api/issues')
      .send({
        title: 'Bad',
        description: 'Short',
        category: '',
        priority: 'Urgent',
        reporter: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid issue data.');
  });

  it('creates, updates, and deletes an issue', async () => {
    const created = await request(app)
      .post('/api/issues')
      .send({
        title: 'Automated test issue',
        description: 'Created by an automated API test.',
        category: 'Testing',
        priority: 'Medium',
        reporter: 'Test Runner',
      });

    expect(created.status).toBe(201);
    expect(created.body.title).toBe('Automated test issue');

    const issueId = created.body.id;

    const updated = await request(app)
      .patch(`/api/issues/${issueId}`)
      .send({
        title: 'Updated automated test issue',
        status: 'In Progress',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Updated automated test issue');
    expect(updated.body.status).toBe('In Progress');

    const deleted = await request(app).delete(`/api/issues/${issueId}`);

    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/issues/${issueId}`);

    expect(missing.status).toBe(404);
  });

  it('creates and retrieves an issue comment', async () => {
    const created = await request(app)
      .post('/api/issues/1/comments')
      .send({
        author: 'Test Runner',
        message: 'This is an automated test comment.',
      });

    expect(created.status).toBe(201);
    expect(created.body.issueId).toBe(1);
    expect(created.body.message).toBe(
      'This is an automated test comment.'
    );

    const response = await request(app).get('/api/issues/1/comments');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          message: 'This is an automated test comment.',
        }),
      ])
    );
  });
});
