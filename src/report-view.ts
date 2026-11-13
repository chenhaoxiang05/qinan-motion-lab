import { icon } from "./icons.js";
import type { AnalysisModule, Report } from "./contracts.ts";
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const e = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );

export function moduleResult(module: AnalysisModule) {
  const threshold = finite(module.threshold) ? module.threshold : 0.5;
  const scores: Array<{ score: number; threshold: number }> = [];
  if (finite(module.score)) scores.push({ score: module.score, threshold });
  for (const segment of Array.isArray(module.segments) ? module.segments : []) {
    const segmentThreshold = finite(segment?.threshold)
      ? segment.threshold
      : threshold;
    if (finite(segment?.score))
      scores.push({ score: segment.score, threshold: segmentThreshold });
  }
  const secondary = module.secondary_check;
  if (secondary && finite(secondary.score) && finite(secondary.threshold))
    scores.push({ score: secondary.score, threshold: secondary.threshold });
  if (module.status !== "completed" || !scores.length)
    return { status: "unavailable", threshold };
  if (scores.some((s) => s.score >= s.threshold))
    return { status: "flagged", threshold };
  if (
    finite(module.sensitivity_threshold) &&
    finite(module.score) &&
    module.score >= module.sensitivity_threshold
  )
    return { status: "uncertain", threshold };
  return { status: "below", threshold };
}

export function reportModules(report: Report): Array<[string, AnalysisModule]> {
  const source = report.modules || {};
  return (
    Array.isArray(source)
      ? source.map((m, i): [string, AnalysisModule] => [
          m?.type || String(i),
          m,
        ])
      : Object.entries(source)
  ).filter(
    ([key, m]) =>
      key !== "tamper" &&
      m &&
      typeof m === "object" &&
      !m.disabled &&
      m.status !== "disabled",
  );
}

export function renderActualModules(report: Report) {
  const modules = reportModules(report),
    labels: Record<string, string> = {
      audio: "声音检查",
      video: "视频检查",
      image: "图片检查",
      chat: "聊天分析",
    },
    statuses: Record<string, string> = {
      flagged: "需要核实",
      below: "未发现超过提醒线的线索",
      uncertain: "存在弱线索",
      unavailable: "未形成判断",
    };
  const cards = modules
    .map(([key, m]) => {
      const result = moduleResult(m),
        segments = Array.isArray(m.segments)
          ? m.segments.filter(
              (
                segment,
              ): segment is NonNullable<AnalysisModule["segments"]>[number] & {
                score: number;
              } => finite(segment.score),
            )
          : [];
      return `<section class="surface module-card" data-status="${result.status}">${icon(key === "audio" ? "sound" : key === "video" ? "video" : "scan")}<h3>${e(labels[key] || key)}</h3><p class="module-state">${statuses[result.status]}</p>${typeof m.note === "string" ? `<p>${e(m.note)}</p>` : ""}<details class="module-details"><summary>检测明细</summary>${finite(m.score) ? `<p>检测分值 ${m.score.toFixed(4)}${finite(m.threshold) ? ` · 提醒线 ${m.threshold}` : ""}</p>` : ""}${finite(m.analyzed_seconds) ? `<p>分析时长 ${m.analyzed_seconds} 秒</p>` : ""}${segments.map((segment) => `<p>${finite(segment.start) ? `${segment.start} 秒起 · ` : ""}分值 ${segment.score.toFixed(4)}${finite(segment.threshold) ? ` · 提醒线 ${segment.threshold}` : ""}</p>`).join("")}${result.status === "unavailable" ? "<p>本项结果不足以形成判断。</p>" : ""}</details></section>`;
    })
    .join("");
  const chat = report.chat_analysis,
    signals = Array.isArray(chat?.signals)
      ? chat.signals.filter((signal) => signal && typeof signal === "object")
      : [];
  return `<div class="result-modules">${cards || '<section class="surface"><h3>暂无模块结果</h3><p>请查看完整记录，或稍后重新核验。</p></section>'}</div>${chat ? `<section class="surface report-evidence"><h2>${e(chat.assessment?.title || "聊天线索")}</h2><p>${e(chat.assessment?.summary || chat.summary || chat.note || "暂无更多线索。")}</p>${signals.map((signal) => `<div class="question-feedback"><b>${e(signal.title)}</b><br><span>${e(signal.quote)}</span></div>`).join("")}</section>` : ""}${report.ocr?.text ? `<details class="surface report-details"><summary>材料文字</summary><p class="quote-lines">${e(report.ocr.text)}</p></details>` : ""}`;
}
