// PIDs persistidos podem ser reutilizados por outro processo após um reboot.
export function isDevProcessCommand(commandLine, kind) {
  if (typeof commandLine !== 'string') return false;
  if (kind === 'functions') return /\bsupabase(?:\.exe)?\b.*\bfunctions["']?\s+["']?serve\b/i.test(commandLine);
  if (kind === 'contingency') return /\bnode(?:\.exe)?\b.*\blocal-contingency-server\.mjs\b/i.test(commandLine);
  return false;
}
