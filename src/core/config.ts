import type { Feature, Settings, Value } from "./types";

const validObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Only declared options enter the store. Runtime caches are kept separately. */
export function normalizeSettings(features: Feature[], value: unknown): Settings {
  const input = validObject(value) ? value : {};
  const result: Settings = {};
  for (const feature of features) {
    const source = Object.hasOwn(input, feature.id) && validObject(input[feature.id])
      ? input[feature.id] as Record<string, unknown> : {};
    const options: Record<string, Value> = {};
    for (const [key, fallback] of Object.entries(feature.defaults)) {
      const candidate = Object.hasOwn(source, key) ? source[key] : undefined;
      const choices = feature.fields?.[key]?.options;
      options[key] = typeof candidate === typeof fallback
        && (typeof candidate !== "number" || Number.isFinite(candidate))
        && (typeof candidate !== "string" || candidate.length <= 100_000)
        && (!choices || choices.some(option => option.value === candidate))
        ? candidate as Value : fallback;
    }
    result[feature.id] = options;
  }
  return result;
}

export function parseSettings(features: Feature[], text: string): Settings {
  if (text.length > 1_000_000) throw new Error("配置文件不能超过 1 MB");
  const data: unknown = JSON.parse(text);
  if (!validObject(data) || data.format !== "nodeseek-plus-plus" || data.schema !== 1 || !validObject(data.settings)) {
    throw new Error("请选择 NodeSeek++ 导出的配置文件（schema 1）");
  }
  return normalizeSettings(features, data.settings);
}

export function exportSettings(settings: Settings): string {
  const safe = structuredClone(settings);
  for (const options of Object.values(safe)) {
    for (const key of Object.keys(options)) {
      if (/^(api[-_]?key|token|password|secret|access[-_]?token)$/i.test(key)) options[key] = "";
    }
  }
  return JSON.stringify({ format: "nodeseek-plus-plus", schema: 1, settings: safe }, null, 2);
}
