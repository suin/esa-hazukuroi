export type Env = Readonly<Record<typeof requiredKeys[number], string>>;
const requiredKeys = ["ESA_API_TOKEN"] as const;

export const isValidEnv = (
  env: NodeJS.ProcessEnv & Partial<Record<keyof Env, unknown>>,
  errors: string[] = []
): env is Env & NodeJS.ProcessEnv => {
  for (const key of requiredKeys) {
    if (typeof env[key] !== "string") {
      errors.push(`env variable ${key} was not set.`);
    }
  }
  return errors.length === 0;
};
