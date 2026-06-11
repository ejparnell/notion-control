import {
  START,
  END,
  StateGraph,
  StateSchema,
  ReducedValue,
} from '@langchain/langgraph'
import { z } from 'zod/v4'
import { emailDecisionSchema } from './emailSchema'

const EmailAgentState = new StateSchema({
  accessToken: z.string(),

  query: z.string().default('in:inbox newer_than:7d'),
  maxResults: z.number().default(25),

  labelMap: z.record(z.string(), z.string()).default({}),

  emails: z.array(z.any()).default([]),

  decisions: ReducedValue({
    schema: z.array(emailDecisionSchema),
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  batchSummary: z.string().default(''),
})