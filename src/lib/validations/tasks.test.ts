import { describe, expect, it } from 'vitest';

import { createTaskSchema } from './tasks';

describe('createTaskSchema', () => {
  it('accepts structured dev-ticket fields', () => {
    const result = createTaskSchema.safeParse({
      name: 'Build sign-in form',
      description: 'Create the client-facing credentials form.',
      acceptanceCriteria: [
        'User can submit valid credentials.',
        'Invalid credentials show a useful error.',
      ],
      testingCriteria: [
        'Run the auth form tests.',
      ],
      implementationPlan: [
        'Add the route component.',
        'Wire the server action.',
      ],
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data.acceptanceCriteria : []).toEqual([
      'User can submit valid credentials.',
      'Invalid credentials show a useful error.',
    ]);
  });

  it('removes empty lines from structured list fields', () => {
    const result = createTaskSchema.safeParse({
      name: 'Build sign-in form',
      acceptanceCriteria: [
        'Form validates required fields',
        '',
        '  ',
      ],
    });

    expect(result.success).toBe(true);
    expect(result.success ? result.data.acceptanceCriteria : []).toEqual([
      'Form validates required fields',
    ]);
  });
});
