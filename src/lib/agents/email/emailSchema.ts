import { z } from 'zod'
import { allowedEmailLabels } from './labelConstants'

export const emailDecisionSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
  subject: z.string().optional(),

  label: z.enum(allowedEmailLabels),

  action: z.enum([
    'label_archive',
    'label_keep_inbox',
    'review_before_archive',
    'delete_or_unsubscribe',
  ]),

  needsReply: z.boolean(),
  needsFollowUp: z.boolean(),
  sensitive: z.boolean(),

  confidence: z.number().min(0).max(1),

  summary: z.string(),

  todos: z.array(
    z.object({
      title: z.string(),
      dueDate: z.string().nullable(),
      owner: z.string().nullable(),
      priority: z.enum(['low', 'medium', 'high']).nullable(),
      sourceText: z.string().optional(),
    })
  ),

  appointments: z.array(
    z.object({
      title: z.string(),
      startDateTime: z.string().nullable(),
      endDateTime: z.string().nullable(),
      timezone: z.string().nullable(),
      location: z.string().nullable(),
      meetingUrl: z.string().nullable(),
      attendees: z.array(z.string()),
      needsConfirmation: z.boolean(),
    })
  ),
})