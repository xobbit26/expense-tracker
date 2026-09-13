export type AuthFormState =
  | { formError?: string; fieldErrors?: Record<string, string> }
  | undefined;
