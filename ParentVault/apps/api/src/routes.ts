/**
 * PARENTVAULT-COMMENTARY
 *
 * Registers the API routes exposed by the Fastify backend scaffold.
 *
 * Routes should stay thin: validate input, call backend/auth services, return safe DTOs, and avoid leaking sensitive details in errors.
 *
 * When adding endpoints, consider audit logging, authorization, redaction, and export/delete behavior at the same time.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ChildProfile, JournalEntry, ScheduleItem, SecondFactorMethod } from '@parentvault/shared';
import { ZodError } from 'zod';
import type { VaultBackend } from './backend.js';
import { createTwoFactorChallenge, defaultAuthSecuritySettings, verifyTwoFactorChallenge } from './auth.js';
import {
  createImportSchema,
  createJournalEntrySchema,
  createTwoFactorChallengeSchema,
  createProfileSchema,
  createScheduleItemSchema,
  parseBody,
  updateJournalEntrySchema,
  updateProfileSchema,
  updateScheduleItemSchema,
  verifyTwoFactorChallengeSchema
} from './validation.js';

interface IdParams {
  id: string;
}

function sendNotFound(reply: FastifyReply, resource: string) {
  return reply.code(404).send({ error: 'not_found', message: `${resource} was not found` });
}

export async function registerRoutes(app: FastifyInstance, backend: VaultBackend) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'validation_error',
        issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
      });
    }

    if (error instanceof Error && error.message === 'IMPORT_REQUIRES_PARENT_CONSENT') {
      return reply.code(400).send({ error: 'consent_required', message: 'Import jobs require explicit parent consent.' });
    }

    app.log.error(error);
    return reply.code(500).send({ error: 'internal_error' });
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'parentvault-api',
    backend: backend.info(),
    time: new Date().toISOString()
  }));

  app.get('/backend', async () => backend.info());

  app.get('/auth/security-settings', async () => defaultAuthSecuritySettings('demo-account'));
  app.post('/auth/2fa/challenge', async (request, reply) => {
    const input = parseBody(createTwoFactorChallengeSchema, request.body);
    const result = createTwoFactorChallenge((input.method ?? 'totp') as SecondFactorMethod);
    return reply.code(202).send({ ...result.challenge, demoCode: result.demoCode });
  });
  app.post('/auth/2fa/verify', async (request, reply) => {
    const input = parseBody(verifyTwoFactorChallengeSchema, request.body);
    const verified = verifyTwoFactorChallenge(input.challengeId, input.code);
    return verified ? verified : reply.code(400).send({ error: 'invalid_or_expired_2fa_code' });
  });

  app.get('/profiles', async () => backend.listProfiles());
  app.post('/profiles', async (request, reply) => {
    const profile = await backend.createProfile(parseBody(createProfileSchema, request.body) as Omit<ChildProfile, 'id' | 'updatedAt'>);
    return reply.code(201).send(profile);
  });
  app.get<{ Params: IdParams }>('/profiles/:id', async (request, reply) => {
    const profile = await backend.getProfile(request.params.id);
    return profile ?? sendNotFound(reply, 'profile');
  });
  app.patch<{ Params: IdParams }>('/profiles/:id', async (request, reply) => {
    const profile = await backend.updateProfile(request.params.id, parseBody(updateProfileSchema, request.body) as Partial<Omit<ChildProfile, 'id'>>);
    return profile ?? sendNotFound(reply, 'profile');
  });
  app.delete<{ Params: IdParams }>('/profiles/:id', async (request, reply) => {
    const deleted = await backend.deleteProfile(request.params.id);
    return deleted ? reply.code(204).send() : sendNotFound(reply, 'profile');
  });

  app.get('/schedule', async () => backend.listSchedule());
  app.post('/schedule', async (request, reply) => {
    const item = await backend.createScheduleItem(parseBody(createScheduleItemSchema, request.body) as Omit<ScheduleItem, 'id'>);
    return reply.code(201).send(item);
  });
  app.get<{ Params: IdParams }>('/schedule/:id', async (request, reply) => {
    const item = await backend.getScheduleItem(request.params.id);
    return item ?? sendNotFound(reply, 'schedule item');
  });
  app.patch<{ Params: IdParams }>('/schedule/:id', async (request, reply) => {
    const item = await backend.updateScheduleItem(request.params.id, parseBody(updateScheduleItemSchema, request.body) as Partial<Omit<ScheduleItem, 'id'>>);
    return item ?? sendNotFound(reply, 'schedule item');
  });
  app.post<{ Params: IdParams }>('/schedule/:id/mark-taken', async (request, reply) => {
    const item = await backend.updateScheduleItem(request.params.id, { takenAt: new Date().toISOString() });
    return item ?? sendNotFound(reply, 'schedule item');
  });
  app.delete<{ Params: IdParams }>('/schedule/:id', async (request, reply) => {
    const deleted = await backend.deleteScheduleItem(request.params.id);
    return deleted ? reply.code(204).send() : sendNotFound(reply, 'schedule item');
  });

  app.get('/journal', async () => backend.listJournal());
  app.post('/journal', async (request, reply) => {
    const entry = await backend.createJournalEntry(parseBody(createJournalEntrySchema, request.body) as Omit<JournalEntry, 'id'>);
    return reply.code(201).send(entry);
  });
  app.get<{ Params: IdParams }>('/journal/:id', async (request, reply) => {
    const entry = await backend.getJournalEntry(request.params.id);
    return entry ?? sendNotFound(reply, 'journal entry');
  });
  app.patch<{ Params: IdParams }>('/journal/:id', async (request, reply) => {
    const entry = await backend.updateJournalEntry(request.params.id, parseBody(updateJournalEntrySchema, request.body) as Partial<Omit<JournalEntry, 'id'>>);
    return entry ?? sendNotFound(reply, 'journal entry');
  });
  app.delete<{ Params: IdParams }>('/journal/:id', async (request, reply) => {
    const deleted = await backend.deleteJournalEntry(request.params.id);
    return deleted ? reply.code(204).send() : sendNotFound(reply, 'journal entry');
  });

  app.post('/imports', async (request, reply) => {
    const input = parseBody(createImportSchema, request.body);
    const suggestion = await backend.createImportSuggestion(input);
    return reply.code(202).send({ ...suggestion, retainSource: input.retainSource });
  });
}
