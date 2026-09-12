export function compileMonitorRules(value: string) {
  const errors: string[] = [];
  const rules = value.split('\n').map(x => x.trim()).filter(Boolean).map((label, index) => {
    try {
      if (label.startsWith('/')) {
        const end = label.lastIndexOf('/');
        if (end < 1) throw new Error();
        const pattern = new RegExp(label.slice(1, end), label.slice(end + 1));
        return { label, color: String(index % 4), matches: (text: string) => { pattern.lastIndex = 0; return pattern.test(text); } };
      }
      const pattern = new RegExp(label, 'i');
      return { label, color: String(index % 4), matches: (text: string) => { pattern.lastIndex = 0; return pattern.test(text); } };
    } catch { errors.push(label); return null; }
  }).filter((rule): rule is NonNullable<typeof rule> => rule !== null);
  return { rules, errors };
}
