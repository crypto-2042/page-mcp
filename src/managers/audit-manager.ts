import { AuditEntry, AuditEventInput, AuditManager, AuditSink, Clock } from "../types";

export class AuditManagerImpl implements AuditManager {
  private readonly entries: AuditEntry[] = [];

  constructor(private readonly clock: Clock, private readonly sink?: AuditSink) {}

  log(event: AuditEventInput): AuditEntry {
    const entry: AuditEntry = {
      id: event.id ?? cryptoRandomId(),
      timestamp: event.timestamp ?? this.clock.now().toISOString(),
      toolName: event.toolName,
      descriptorSource: event.descriptorSource,
      descriptorOrigin: event.descriptorOrigin,
      input: event.input,
      output: event.output,
      error: event.error,
    };
    this.entries.push(entry);
    this.write(entry);
    return entry;
  }

  write(entry: AuditEntry): void {
    this.sink?.write(entry);
  }

  history(): AuditEntry[] {
    return [...this.entries];
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `audit_${Math.random().toString(36).slice(2, 10)}`;
}
