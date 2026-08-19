type RegistryEntry = {
  readonly id: string;
};

type RegistryOptions<T> = {
  readonly label: string;
  readonly secondaryKey?: (entry: T) => string;
  readonly secondaryLabel?: string;
};

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value);
}

export function createContentRegistry<T extends RegistryEntry>(
  source: readonly T[],
  options: RegistryOptions<T>,
) {
  const byId = new Map<string, T>();
  const bySecondaryKey = new Map<string, T>();

  for (const rawEntry of source) {
    const entry = deepFreeze(rawEntry);
    if (byId.has(entry.id)) {
      throw new Error(`Duplicate ${options.label} id "${entry.id}".`);
    }
    byId.set(entry.id, entry);

    if (options.secondaryKey) {
      const key = options.secondaryKey(entry);
      if (bySecondaryKey.has(key)) {
        throw new Error(`Duplicate ${options.secondaryLabel ?? "secondary"} key "${key}".`);
      }
      bySecondaryKey.set(key, entry);
    }
  }

  const all = deepFreeze(Array.from(byId.values()));

  return Object.freeze({
    all,
    getById: (id: string) => byId.get(id),
    getBySecondaryKey: (key: string) => bySecondaryKey.get(key),
  });
}
