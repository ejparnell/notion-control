type WorkCreateTaskDescriptionInput = {
  name?: string;
  description?: string;
  acceptanceCriteria?: string[];
  testingCriteria?: string[];
  implementationPlan?: string[];
};

export function buildWorkCreateTaskDescription(
  task: WorkCreateTaskDescriptionInput,
) {
  const sections = [
    textSection('Plan', task.description),
    listSection('Acceptance Criteria', task.acceptanceCriteria),
    listSection('Testing Criteria', task.testingCriteria),
    listSection('Implementation Plan', task.implementationPlan),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}

function textSection(title: string, value: string | undefined) {
  const content = value?.trim();

  if (!content) {
    return null;
  }

  return `${title}\n${content}`;
}

function listSection(title: string, values: string[] | undefined) {
  const items = values
    ?.map(value => value.trim())
    .filter(value => value.length > 0);

  if (!items?.length) {
    return null;
  }

  return [
    title,
    ...items.map(item => `- ${item}`),
  ].join('\n');
}
