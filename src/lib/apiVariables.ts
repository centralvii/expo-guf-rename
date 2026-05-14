import type { ApiEnvironment, TaskItem } from '../types';

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

function buildTaskVariableMap(task: TaskItem | null | undefined): Record<string, string> {
  if (!task) {
    return {};
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskStatus: task.status,
    taskPriority: task.priority,
  };
}

function buildEnvironmentVariableMap(environment: ApiEnvironment | null | undefined): Record<string, string> {
  if (!environment) {
    return {};
  }

  return environment.variables.reduce<Record<string, string>>((acc, variable) => {
    if (variable.enabled && variable.key.trim()) {
      acc[variable.key.trim()] = variable.value;
    }
    return acc;
  }, {});
}

export function resolveApiVariables(input: {
  text: string;
  environment: ApiEnvironment | null;
  task?: TaskItem | null;
}): string {
  const variableMap = {
    ...buildEnvironmentVariableMap(input.environment),
    ...buildTaskVariableMap(input.task),
  };

  return input.text.replace(VARIABLE_PATTERN, (match, key: string) => {
    return key in variableMap ? variableMap[key] : match;
  });
}

export function findUnresolvedVariables(text: string): string[] {
  const variables = new Set<string>();
  VARIABLE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = VARIABLE_PATTERN.exec(text);

  while (match) {
    variables.add(match[1]);
    match = VARIABLE_PATTERN.exec(text);
  }

  VARIABLE_PATTERN.lastIndex = 0;
  return [...variables];
}
