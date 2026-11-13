/** Runtime-checked data at the service boundary; UI code consumes these types. */
export type UnknownRecord = Record<string, unknown>;
export interface Segment extends UnknownRecord { score?: number; threshold?: number; start?: number; end?: number; }
export interface ReportModule extends UnknownRecord {
  type?: string; status?: string; score?: number; threshold?: number; sensitivity_threshold?: number;
  analyzed_seconds?: number; note?: string; disabled?: boolean; segments?: Segment[]; secondary_check?: Segment;
}
export interface ChatSignal extends UnknownRecord { title?: string; quote?: string; }
export interface ChatAnalysis extends UnknownRecord { status?: string; summary?: string; note?: string; assessment?: {title?: string; summary?: string}; signals?: ChatSignal[]; }
export interface Report extends UnknownRecord {
  id: string; demo: boolean; name?: string; filename?: string; created_at?: string; date?: string; summary?: string;
  modules?: Record<string, ReportModule> | ReportModule[]; next_steps?: string[]; chat_analysis?: ChatAnalysis; ocr?: {text?: string};
}
export interface CaseSummary extends UnknownRecord { id: string; name?: string; filename?: string; date?: string; created_at?: string; demo?: boolean; }
export interface AnalyzeResponse { job_id: string; events_url?: string; }
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
export interface Job { status: JobStatus; message?: string; result?: Report; }
export class ContractError extends Error {
  readonly code = 'invalid_response';
  constructor(message = '核验服务返回的数据格式有误，请稍后重试。') { super(message); this.name = 'ContractError'; }
}
const record = (value: unknown): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContractError();
  return value as UnknownRecord;
};
const text = (value: unknown, required = false): string | undefined => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || (required && !value.trim())) throw new ContractError();
  return value;
};
export function parseIdentifier(value: unknown): string {
  const id = text(value, true)!;
  // IDs are opaque URL path segments. Dot segments normalize before transport.
  if (id === '.' || id === '..' || id.trim() !== id || /[\u0000-\u001f\u007f]/.test(id)) throw new ContractError();
  return id;
}
function optionalText(source: UnknownRecord, keys: readonly string[]) {
  for (const key of keys) if (source[key] !== undefined) text(source[key]);
}
function optionalNumbers(source: UnknownRecord, keys: readonly string[]) {
  for (const key of keys) if (source[key] !== undefined && (typeof source[key] !== 'number' || !Number.isFinite(source[key]))) throw new ContractError();
}
function segment(value: unknown): Segment {
  const source = record(value); optionalNumbers(source, ['score', 'threshold', 'start', 'end']);
  return { ...source } as Segment;
}
function moduleData(value: unknown): ReportModule {
  const source = record(value);
  optionalText(source, ['type', 'status', 'note']);
  optionalNumbers(source, ['score', 'threshold', 'sensitivity_threshold', 'analyzed_seconds']);
  if (source.disabled !== undefined && typeof source.disabled !== 'boolean') throw new ContractError();
  const output = { ...source } as ReportModule;
  if (source.segments !== undefined) {
    if (!Array.isArray(source.segments)) throw new ContractError();
    output.segments = source.segments.map(segment);
  }
  if (source.secondary_check !== undefined && source.secondary_check !== null) output.secondary_check = segment(source.secondary_check);
  else delete output.secondary_check;
  return output;
}
export function parseReport(value: unknown): Report {
  const source = record(value), id = parseIdentifier(source.id);
  optionalText(source, ['name', 'filename', 'date', 'created_at', 'summary']);
  const output: Report = { ...source, id, demo: false };
  if (source.modules !== undefined && source.modules !== null) {
    output.modules = Array.isArray(source.modules) ? source.modules.map(moduleData)
      : Object.fromEntries(Object.entries(record(source.modules)).map(([key, value]) => [key, moduleData(value)]));
  } else delete output.modules;
  if (source.next_steps !== undefined) {
    if (!Array.isArray(source.next_steps) || source.next_steps.some(item => typeof item !== 'string')) throw new ContractError();
    output.next_steps = [...source.next_steps] as string[];
  }
  if (source.ocr !== undefined && source.ocr !== null) {
    const ocr = record(source.ocr); optionalText(ocr, ['text']); output.ocr = { ...ocr } as {text?: string};
  } else delete output.ocr;
  if (source.chat_analysis !== undefined && source.chat_analysis !== null) {
    const chat = record(source.chat_analysis); optionalText(chat, ['status', 'summary', 'note']);
    const parsed = { ...chat } as ChatAnalysis;
    if (chat.assessment !== undefined && chat.assessment !== null) {
      const assessment = record(chat.assessment); optionalText(assessment, ['title', 'summary']); parsed.assessment = { ...assessment } as ChatAnalysis['assessment'];
    } else delete parsed.assessment;
    if (chat.signals !== undefined) {
      if (!Array.isArray(chat.signals)) throw new ContractError();
      parsed.signals = chat.signals.map(value => { const signal = record(value); optionalText(signal, ['title', 'quote']); return { ...signal } as ChatSignal; });
    }
    output.chat_analysis = parsed;
  } else delete output.chat_analysis;
  return output;
}
export function parseCaseList(value: unknown): CaseSummary[] {
  const source = Array.isArray(value) ? value : (() => { const body = record(value); return body.items ?? body.cases; })();
  if (!Array.isArray(source)) throw new ContractError();
  return source.map(value => {
    const item = record(value), id = parseIdentifier(item.id);
    optionalText(item, ['name', 'filename', 'date', 'created_at']);
    if (item.demo !== undefined && typeof item.demo !== 'boolean') throw new ContractError();
    return { ...item, id } as CaseSummary;
  });
}
export function parseAnalyzeResponse(value: unknown): AnalyzeResponse {
  const source = record(value), job_id = parseIdentifier(source.job_id);
  const events_url = text(source.events_url);
  return events_url ? { job_id, events_url } : { job_id };
}
export function parseJob(value: unknown): Job {
  const source = record(value), raw = text(source.status, true)!;
  const aliases: Record<string, JobStatus> = { queued:'queued', pending:'queued', processing:'processing', running:'processing', analyzing:'processing', completed:'completed', succeeded:'completed', failed:'failed', error:'failed', cancelled:'cancelled', canceled:'cancelled', expired:'expired' };
  const status = Object.prototype.hasOwnProperty.call(aliases, raw) ? aliases[raw] : undefined;
  if (!status) throw new ContractError('核验服务返回了无法识别的任务状态，请稍后恢复查看。');
  const message = text(source.message);
  return { status, ...(message ? { message } : {}), ...(status === 'completed' ? { result: parseReport(source.result) } : {}) };
}
export type AnalysisModule = ReportModule;
