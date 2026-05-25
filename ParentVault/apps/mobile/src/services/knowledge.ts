/**
 * PARENTVAULT-COMMENTARY
 *
 * Builds searchable knowledge sources from profiles, schedules, and journal entries for factual Q&A.
 *
 * This keeps chat answers grounded in stored vault data instead of free-form guessing.
 *
 * Only include data the parent has consented to store/use, and cite sources where possible.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import {
  answerFromSources,
  buildKnowledgeSources as buildSharedKnowledgeSources
} from '@parentvault/shared';
import type { ChildProfile, JournalEntry, KnowledgeSource, RagAnswer, ScheduleItem } from '@parentvault/shared';

/**
 * Mobile adapter for the shared local RAG MVP.
 * Keeps screens/store decoupled from future backend/vector implementations.
 */
export function buildKnowledgeSources(
  children: ChildProfile[],
  schedule: ScheduleItem[],
  journal: JournalEntry[]
): KnowledgeSource[] {
  return buildSharedKnowledgeSources({ children, schedule, journal });
}

export function answerFromKnowledge(question: string, sources: KnowledgeSource[]): RagAnswer {
  return answerFromSources(question, sources);
}
