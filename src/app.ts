import { icon } from "./icons.js";
import { quiz } from "./quiz.js";
import { createWorkspaceTransitions } from "./transitions.js";
import { createWorkspaceDismiss } from "./workspace-dismiss.js";
import { createApiClient } from "./api-client.js";
import {
  parseAnalyzeResponse,
  parseReport,
  parseCaseList,
  type Report,
  type CaseSummary,
} from "./contracts.ts";
import {
  moduleResult,
  reportModules,
  renderActualModules,
} from "./report-view.ts";
export { moduleResult } from "./report-view.ts";
import { createTaskService, TaskError } from "./task-service.ts";
import type {
  animate as animeAnimate,
  utils as animeUtils,
  createSpring as animeSpring,
  createLayout as animeLayout,
} from "animejs";
import type {
  UploadProps,
  StatusProps,
  CounterProps,
  FaqProps,
  MaterialTabsProps,
  IslandController,
  IslandAdapters,
} from "./rare-islands.tsx";
import { createWorkspaceIntro } from "./workspace-intro.js";
import { guideMarkup, mountUsageGuide } from "./usage-guide.js";
import { createInteractionFeedback } from "./interaction-feedback.js";

type MaterialKind = keyof typeof fileTypes;
type Page = "home" | keyof typeof pages;
type Question = (typeof quiz)[number];
type Animation = ReturnType<typeof animeAnimate>;
type Timer = ReturnType<typeof setTimeout> | undefined;
type Contact = { name: string; phone: string };
type ActiveTask = {
  id?: string;
  name?: string;
  state: "loading" | "analyzing" | "thinking";
  message: string;
  streamText: string;
  transport?: "stream" | "poll";
};
interface VisualController {
  pause(): void;
  resume(): void;
  focus(value: boolean): void;
  dispose(): void;
  toggleForm(): Promise<string>;
  setPortalFocus?(
    value: { portalId?: string; x: number; y: number } | null,
  ): void;
}
interface AppOptions {
  animate: typeof animeAnimate;
  utils: typeof animeUtils;
  createSpring: typeof animeSpring;
  createLayout?: typeof animeLayout;
  visual: VisualController;
  islands?: Partial<IslandAdapters>;
  homeMotion?: {
    finish?(): void;
    setPaused?(value: boolean): void;
    destroy?(): void;
  };
  portalMotion?: {
    setCovered?(value: boolean): void;
    setPaused?(value: boolean): void;
    setReady?(value: boolean): void;
    destroy?(): void;
  };
  apiBase?: string;
  startReady?: Promise<unknown> | null;
  entryDuration?: number;
  delay?: (ms: number) => Promise<void>;
}
interface QuizExit {
  tile: HTMLElement;
  finish(): void;
  animation: ReturnType<ReturnType<typeof animeLayout>["update"]> | null;
  timer: Timer;
}
interface QuestionSwap {
  animation: Animation | null;
  timer: Timer;
  phase: string;
  committed: boolean;
  commit(): void;
  finish(focus?: boolean): void;
}
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "操作暂时无法完成，请重试。";
const errorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? error.code
    : undefined;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isContact = (value: unknown): value is Contact =>
  isRecord(value) &&
  typeof value.name === "string" &&
  typeof value.phone === "string";

const escapeHTML = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
const fileTypes = {
  audio: {
    label: "声音",
    icon: "sound",
    accept: ".wav,.mp3,.m4a,.flac,.ogg",
    hint: "MP3 / WAV / M4A / FLAC / OGG",
    detail: "单个文件不超过 100MB",
  },
  video: {
    label: "视频",
    icon: "video",
    accept: ".mp4,.mov,.avi,.webm",
    hint: "MP4 / MOV / AVI / WEBM",
    detail: "不超过 100MB，时长不超过 3 分钟",
  },
  image: {
    label: "照片",
    icon: "image",
    accept: ".jpg,.jpeg,.png,.webp",
    hint: "JPG / PNG / WEBP",
    detail: "单张照片不超过 100MB",
  },
  chat: {
    label: "截图",
    icon: "chat",
    accept: ".jpg,.jpeg,.png,.webp",
    hint: "JPG / PNG / WEBP",
    detail: "每次一张聊天截图，不超过 100MB",
  },
};
const pages = {
  check: ["检查材料", "01"],
  contacts: ["联系家人", "02"],
  practice: ["情景练习", "03"],
  history: ["核验记录", "04"],
  report: ["核验报告", "01"],
};

export function initApp({
  animate,
  utils,
  createSpring,
  createLayout,
  visual,
  islands = {},
  homeMotion = {},
  portalMotion = {},
  apiBase = import.meta.env?.VITE_API_BASE_URL || "/api",
  startReady = null,
  entryDuration,
  delay = (ms) => new Promise((r) => setTimeout(r, ms)),
}: AppOptions) {
  // Views own these template selectors. Optional queries are guarded at their call sites.
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    document.querySelector<T>(selector)!;
  const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => [
    ...document.querySelectorAll<T>(selector),
  ];
  const body = $("#workspaceBody"),
    workspace = $<HTMLDialogElement>("#workspace"),
    modal = $<HTMLDialogElement>("#modal");
  $$("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  $("#closeWorkspace").innerHTML = "返回主页 " + icon("close");
  if ($(".mini-signal"))
    $(".mini-signal").innerHTML = Array.from(
      { length: 10 },
      (_, i) =>
        `<i style="height:${7 + Math.sin(i * 1.8) ** 2 * 15}px;animation-delay:${-i * 0.15}s"></i>`,
    ).join("");
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = getStored("qinan-motion-paused", "false") === "true";
  const api = createApiClient({
    baseUrl: apiBase,
    fetchImpl: (...args) => window.fetch(...args),
  });
  const tasks = createTaskService({ api, delay });
  let contacts = readArray("qinan-contacts").filter(isContact);
  const legacyRecords = readArray("qinan-demo-history").flatMap((value) => {
    try {
      return isRecord(value) && value.demo
        ? [{ ...parseReport(value), demo: true }]
        : [];
    } catch {
      return [];
    }
  });
  let destroyed = false,
    startupPending = !!startReady,
    printing = false;
  let uploadIsland: IslandController<UploadProps> | null = null,
    uploadHost: HTMLElement | null = null,
    materialTabs: IslandController<MaterialTabsProps> | null = null,
    materialTabsHost: HTMLElement | null = null,
    statusIsland: IslandController<StatusProps> | null = null,
    pickerPending = false,
    pickerReturnTimer: Timer,
    dragDepth = 0;
  let page: Page = "home",
    routeRevision = 0,
    viewController = new AbortController(),
    historyRequest = 0,
    reportRequest = 0;
  let type: MaterialKind = "audio",
    selectedFile: File | null = null,
    previewURL: string | null = null,
    selectionRevision = 0,
    validating = false,
    validationCleanup: (() => void) | null = null,
    fileError = "",
    fileWarning = "";
  let activeTask: ActiveTask | null = null,
    currentReport: Report | null = null,
    currentQuiz = 0,
    answer: number | null = null,
    correctCount = 0,
    mistakes: Question[] = [];
  let streamTimer: Timer;
  let practiceCounter: IslandController<CounterProps> | null = null,
    practiceFaq: IslandController<FaqProps> | null = null,
    practiceFaqValue: string | null = null,
    practiceFaqItems: NonNullable<FaqProps["items"]> = [],
    questionSwap: QuestionSwap | null = null,
    practiceDock: HTMLElement | null = null;
  let lastPortal: HTMLElement | null = null,
    toastTimer: Timer,
    quizLayout: ReturnType<typeof animeLayout> | null = null,
    quizExit: QuizExit | null = null,
    feedbackAnimation: Animation | null = null,
    windowReady = false,
    modalAnimation: Animation | null = null,
    modalRevision = 0,
    guide: ReturnType<typeof mountUsageGuide> | null = null;
  const pointerDisposers: Array<() => void> = [];
  const lifecycle = new window.AbortController();
  const persistentHandlers: HTMLElement[] = [];
  function listen<K extends keyof HTMLElementEventMap>(
    node: HTMLElement,
    event: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options: boolean | AddEventListenerOptions = false,
  ) {
    node.addEventListener(event, handler, {
      ...(typeof options === "boolean" ? { capture: options } : options),
      signal: lifecycle.signal,
    });
  }
  const bindClick = (
    node: HTMLElement | null,
    handler: (event: MouseEvent) => unknown,
  ) => {
    if (!node) return;
    node.onclick = (event) => {
      if (!destroyed) void handler(event);
    };
    persistentHandlers.push(node);
  };
  const motionEnabled = () => !paused && !mediaQuery.matches;
  const feedback = createInteractionFeedback({
    root: document,
    animate,
    motionEnabled,
  });
  const entry = createWorkspaceIntro({
    host: body,
    animate,
    motionEnabled,
    getIslands: () => islands,
    duration: entryDuration,
    onReady() {
      windowReady = transitions.state === "open";
      updatePracticeDock();
    },
  });
  const transitions = createWorkspaceTransitions({
    dialog: workspace,
    surface: $(".workspace-surface"),
    backdrop: $("#workspaceBackdrop"),
    portals: $$(".portal-node"),
    animate,
    motionEnabled,
    onBusy() {
      portalMotion.setCovered?.(true);
      feedback.settle();
      if (transitions.state === "closing") entry.cancel();
      windowReady = false;
      finishQuestionSwap();
      updatePracticeDock();
      finishFeedback();
      pauseAmbient();
      finishQuizExit();
      visual.setPortalFocus?.(null);
      visual.focus(transitions.state !== "closing");
    },
    onHome() {
      visual.focus(false);
      syncPortalCoverage();
    },
    onClosed() {
      windowReady = false;
      disposeView();
      body.innerHTML = "";
      syncPortalCoverage();
    },
    onOpened() {
      entry.start();
      if (!entry.pending) {
        windowReady = true;
        updatePracticeDock();
      }
    },
  });
  const exteriorDismiss = createWorkspaceDismiss({
    dialog: workspace,
    surface: $(".workspace-surface"),
    canDismiss: () =>
      transitions.state === "open" && !modal.open && !pickerPending,
    onDismiss: () => go("home"),
  });
  const e = escapeHTML;
  const heading = (label: string, title: string, desc: string) =>
    `<div class="page-heading"><span class="eyebrow">${label}</span><h1>${title}</h1><p>${desc}</p></div>`;
  const syncPortalCoverage = () =>
    portalMotion.setCovered?.(
      modal.open || page !== "home" || transitions.state !== "closed",
    );
  function showFeedback(
    node: Element | null,
    message: string,
    kind: "success" | "error" | "change" | "press" = "success",
  ) {
    if (!(node instanceof window.HTMLElement)) return;
    node.textContent = message;
    node.dataset.state = kind;
    feedback.cue(node, { kind });
  }

  function getStored(
    key: string,
    fallback: string,
    storage: "localStorage" | "sessionStorage" = "localStorage",
  ) {
    try {
      return window[storage].getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function setStored(
    key: string,
    value: string,
    storage: "localStorage" | "sessionStorage" = "localStorage",
  ) {
    try {
      window[storage].setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  function removeStored(
    key: string,
    storage: "localStorage" | "sessionStorage" = "localStorage",
  ) {
    try {
      window[storage].removeItem(key);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  }
  function readArray(key: string): unknown[] {
    try {
      const parsed: unknown = JSON.parse(getStored(key, "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function saveArray(key: string, value: unknown) {
    return setStored(key, JSON.stringify(value));
  }
  function toast(text: string) {
    const el = $("#toast");
    el.textContent = text;
    if (typeof el.showPopover === "function") {
      if (!el.matches(":popover-open")) el.showPopover();
    } else
      (modal.open ? modal : workspace.open ? workspace : document.body).append(
        el,
      );
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("visible");
      if (typeof el.hidePopover === "function") el.hidePopover();
    }, 3800);
  }
  function normalizeModal() {
    modal.style.opacity = "1";
    modal.style.transform = "none";
  }
  function settleModal() {
    modalRevision++;
    const animation = modalAnimation;
    modalAnimation = null;
    try {
      animation?.cancel?.();
    } catch {
      /* The visible terminal state is independent of the engine. */
    }
    utils.remove(modal);
    normalizeModal();
  }
  function openModal(html: string) {
    if (destroyed) return;
    const alreadyOpen = modal.open;
    feedback.settle(modal);
    settleModal();
    guide?.destroy();
    guide = null;
    utils.remove($("#modalBody").querySelectorAll("*"));
    $("#modalBody").innerHTML = html;
    if (!alreadyOpen) {
      modal.showModal();
      if (motionEnabled()) {
        const revision = modalRevision;
        let completed = false;
        const finish = () => {
          if (revision !== modalRevision) return;
          completed = true;
          modalAnimation = null;
          normalizeModal();
        };
        try {
          const animation = animate(modal, {
            opacity: [0, 1],
            scale: [0.96, 1],
            y: [15, 0],
            duration: 360,
            ease: "outExpo",
            onComplete: finish,
          });
          if (!completed) modalAnimation = animation;
        } catch {
          settleModal();
        }
      }
    }
    portalMotion.setCovered?.(true);
  }
  function closeModal() {
    feedback.settle(modal);
    settleModal();
    guide?.destroy();
    guide = null;
    if (modal.open) modal.close();
    syncPortalCoverage();
  }
  const cancelModal = (event: Event) => {
    event.preventDefault();
    closeModal();
  };
  const modalVisibility = () => {
    if (document.hidden) settleModal();
  };
  bindClick($("#closeModal"), closeModal);
  modal.addEventListener("cancel", cancelModal);
  document.addEventListener("visibilitychange", modalVisibility);
  modal.addEventListener(
    "click",
    (ev) => {
      if (ev.target === modal) {
        const r = modal.getBoundingClientRect();
        if (
          ev.clientX < r.left ||
          ev.clientX > r.right ||
          ev.clientY < r.top ||
          ev.clientY > r.bottom
        )
          closeModal();
      }
    },
    { signal: lifecycle.signal },
  );

  const request = (
    path: string,
    options: RequestInit = {},
    signal: AbortSignal | null = null,
    timeout = 25000,
  ) => api.request(path, options, signal, timeout);
  function pendingJob() {
    const raw = getStored("qinan-active-task", "", "sessionStorage");
    if (raw) {
      try {
        const task: unknown = JSON.parse(raw);
        if (
          isRecord(task) &&
          typeof task.id === "string" &&
          task.source === api.source
        )
          return task.id;
      } catch {
        /* Ignore malformed session state. */
      }
      return "";
    }
    return api.baseUrl === "/api"
      ? getStored("qinan-active-job", "", "sessionStorage")
      : "";
  }
  function savePendingJob(id: string) {
    if (
      setStored(
        "qinan-active-task",
        JSON.stringify({ id, source: api.source }),
        "sessionStorage",
      )
    )
      removeStored("qinan-active-job", "sessionStorage");
  }
  function clearPendingJob(id: string) {
    if (pendingJob() !== id) return;
    removeStored("qinan-active-task", "sessionStorage");
    removeStored("qinan-active-job", "sessionStorage");
  }
  function reportFromResponse(data: unknown) {
    return parseReport(data);
  }

  function go(next: string) {
    if (destroyed) return;
    if (location.hash.slice(1) === next) route();
    else location.hash = next;
  }
  function finishQuizExit() {
    const exit = quizExit;
    if (exit) {
      exit.animation?.complete?.();
      exit.finish();
    }
  }
  function finishFeedback() {
    const animation = feedbackAnimation;
    feedbackAnimation = null;
    animation?.cancel?.();
    const feedback = $("#feedback");
    if (feedback) {
      feedback.style.opacity = "1";
      feedback.style.transform = "none";
    }
  }
  function disposeQuizLayout() {
    finishQuestionSwap();
    finishFeedback();
    finishQuizExit();
    quizLayout?.revert();
    quizLayout = null;
  }
  function disposePracticeIslands() {
    practiceCounter?.destroy();
    practiceCounter = null;
    disposePracticeFaq();
  }
  function disposePracticeFaq() {
    practiceFaq?.destroy();
    practiceFaq = null;
  }
  function disposeIslands() {
    clearTimeout(pickerReturnTimer);
    pickerReturnTimer = undefined;
    pickerPending = false;
    dragDepth = 0;
    materialTabs?.destroy();
    materialTabs = null;
    materialTabsHost = null;
    uploadIsland?.destroy();
    uploadIsland = null;
    uploadHost = null;
    statusIsland?.destroy();
    statusIsland = null;
    disposePracticeIslands();
  }
  function disposeView() {
    feedback.settle(body);
    entry.cancel();
    disposeQuizLayout();
    disposeIslands();
    disposePracticeDock();
    if (body.contains($("#toast"))) document.body.append($("#toast"));
    viewController?.abort();
    viewController = new AbortController();
    utils.remove(body.querySelectorAll("*"));
  }
  function route() {
    if (destroyed || startupPending) return;
    const raw = location.hash.slice(1) || "home";
    const [next, rawReportId] = raw.split("/");
    let reportId = rawReportId;
    try {
      if (rawReportId) reportId = decodeURIComponent(rawReportId);
    } catch {
      reportId = "";
    }
    const target: Page = next in pages ? (next as keyof typeof pages) : "home";
    const revision = ++routeRevision;
    // Abort old requests immediately, but retain the visible DOM until its close
    // transition finishes. Reverting a quiz layout before fade-out caused jumps.
    feedback.settle();
    entry.cancel();
    viewController?.abort();
    page = target;
    transitions.navigate({
      key: target,
      portal: target === "report" ? lastPortal : $(`[data-portal="${target}"]`),
      render() {
        if (revision !== routeRevision) return;
        disposeView();
        if (target === "home") return;
        $("#workspaceTitle").textContent = pages[target][0];
        $("#sectionNumber").textContent = pages[target][1];
        windowReady = false;
        entry.prepare({
          key: target,
          render() {
            if (destroyed || revision !== routeRevision) return;
            body.scrollTop = 0;
            if (target === "report") {
              const saved = legacyRecords.find((r) => r.id === reportId);
              if (saved) currentReport = saved;
              if (!currentReport || (reportId && currentReport.id !== reportId))
                return renderReportFromId(reportId, revision);
              return renderReport();
            }
            if (target === "check") return renderCheck();
            if (target === "contacts") return renderContacts();
            if (target === "practice") return renderQuiz();
            return renderHistory(revision);
          },
        });
        body.scrollTop = 0;
      },
    });
  }
  window.addEventListener("hashchange", route);
  workspace.addEventListener(
    "cancel",
    (ev) => {
      ev.preventDefault();
      go("home");
    },
    { signal: lifecycle.signal },
  );
  bindClick($("#closeWorkspace"), () => go("home"));
  $$(".portal-node").forEach((node) =>
    node.addEventListener(
      "click",
      () => {
        lastPortal = node;
      },
      { signal: lifecycle.signal },
    ),
  );

  function renderCheck() {
    if (activeTask) {
      renderProcessing();
      return;
    }
    disposeIslands();
    const recoverable = pendingJob();
    body.innerHTML =
      heading(
        "01 / 材料核验",
        "把疑问交给亲安。",
        "一段声音，一张照片，一条消息。先核实，再放心。",
      ) +
      `${recoverable ? `<div class="notice mode-notice">上次的任务仍可继续查看，不需要重复上传。<button id="resumeTask" class="text-button">恢复查看 ↗</button></div>` : ""}` +
      `<div class="upload-layout"><section class="surface upload-card"><div class="type-tabs" role="tablist" aria-label="选择材料类型"><span class="tab-marker" aria-hidden="true"></span>${Object.entries(
        fileTypes,
      )
        .map(
          ([key, t]) =>
            `<button class="type-tab" id="type-${key}" role="tab" aria-controls="uploadPanel" aria-selected="${type === key}" tabindex="${type === key ? 0 : -1}" data-type="${key}">${icon(t.icon)}${t.label}</button>`,
        )
        .join(
          "",
        )}</div><div id="uploadPanel" role="tabpanel" aria-labelledby="type-${type}"><div id="dropzone" class="dropzone"></div><p id="fileError" class="inline-error" role="alert"></p><p id="fileWarning" class="interaction-status" role="status"></p><div class="upload-meta"><span>${icon("lock")}提交后开始核验</span><button id="analyzeButton" class="primary" disabled>开始核验 ${icon("arrow")}</button></div></div></section><aside class="safety-card"><div class="safety-top">A GENTLE REMINDER ${icon("heart")}</div><h2>真正的关心，<br>经得起一次<span>确认。</span></h2><p>遇到借钱、转账或索要验证码，<br>先停一停，用熟悉的号码联系家人。</p><button id="familyLink" class="family-link">${icon("phone")} 联系我的家人 ${icon("arrow")}</button></aside></div><div class="hint-line"><span>一次一份材料，结果保存在核验记录中。</span><button id="uploadHelp" class="text-button">了解核验流程 ${icon("arrow")}</button></div><div class="steps-strip"><span><b>01 /</b> 选择材料</span><i></i><span><b>02 /</b> 看懂线索</span><i></i><span><b>03 /</b> 独立核实</span></div>`;
    $("#familyLink").onclick = () => go("contacts");
    $("#uploadHelp").onclick = helpModal;
    $<HTMLButtonElement>("#analyzeButton").onclick = analyze;
    if ($("#resumeTask"))
      $("#resumeTask").onclick = () => resumeJob(recoverable);
    $$(".type-tab").forEach((tab) => {
      tab.onclick = () => selectType(tab.dataset.type);
      tab.onkeydown = (ev) => {
        const keys = Object.keys(fileTypes),
          index = keys.indexOf(type);
        let next;
        if (ev.key === "ArrowRight") next = keys[(index + 1) % keys.length];
        if (ev.key === "ArrowLeft")
          next = keys[(index + keys.length - 1) % keys.length];
        if (ev.key === "Home") next = keys[0];
        if (ev.key === "End") next = keys.at(-1);
        if (next) {
          ev.preventDefault();
          selectType(next);
          $(`#type-${next}`).focus();
        }
      };
    });
    const dropzone = $("#dropzone");
    const hasDraggedFiles = (ev: DragEvent) =>
      Array.from(ev.dataTransfer?.types || []).includes("Files") ||
      !!ev.dataTransfer?.files?.length;
    const syncDrag = () => {
      dropzone.classList.toggle("dragover", dragDepth > 0);
      updateUploadIsland();
    };
    listen(dropzone, "dragenter", (ev) => {
      if (activeTask || !hasDraggedFiles(ev)) return;
      ev.preventDefault();
      dragDepth++;
      syncDrag();
    });
    listen(dropzone, "dragover", (ev) => {
      if (activeTask || !hasDraggedFiles(ev)) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
      if (!dragDepth) {
        dragDepth = 1;
        syncDrag();
      }
    });
    listen(dropzone, "dragleave", (ev) => {
      ev.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      syncDrag();
    });
    listen(dropzone, "drop", (ev) => {
      ev.preventDefault();
      dragDepth = 0;
      syncDrag();
      if (activeTask) return;
      if (ev.dataTransfer?.files?.length !== 1) {
        setError("每次检查一份材料，请选择一个文件。");
        return;
      }
      finishPicker();
      setFile(ev.dataTransfer.files[0]);
    });
    // The visual folder and its controls own their clicks; blank dropzone space
    // remains a single activation target without wrapping nested buttons.
    dropzone.onclick = (ev) => {
      if (
        !selectedFile &&
        !(ev.target as Element).closest(
          'button,a,input,video,audio,[role="button"]',
        )
      )
        chooseFile();
    };
    dropzone.onkeydown = (ev) => {
      if (
        ev.target === dropzone &&
        !selectedFile &&
        (ev.key === "Enter" || ev.key === " ")
      ) {
        ev.preventDefault();
        chooseFile();
      }
    };
    syncType();
    renderFile();
  }
  function selectType(next: unknown) {
    if (
      typeof next !== "string" ||
      !Object.prototype.hasOwnProperty.call(fileTypes, next)
    )
      return;
    const kind = next as MaterialKind;
    if (
      !fileTypes[kind] ||
      type === next ||
      activeTask ||
      destroyed ||
      page !== "check" ||
      entry.pending
    )
      return;
    finishPicker();
    dragDepth = 0;
    type = kind;
    clearFile();
    fileError = "";
    // Keep the same tablist, panel, dropzone and surrounding scene in the DOM.
    syncType();
    renderFile("change");
  }
  function materialTabsProps(host: HTMLElement): MaterialTabsProps {
    return {
      value: type,
      disabled: !!activeTask,
      paused: !motionEnabled(),
      onChange(next) {
        if (host !== materialTabsHost || !host.isConnected) return;
        selectType(next);
      },
    };
  }
  function updateMaterialTabs() {
    if (materialTabs && materialTabsHost?.isConnected)
      materialTabs.update(materialTabsProps(materialTabsHost));
  }
  function syncType() {
    const host = body.querySelector<HTMLElement>(".type-tabs");
    if (host && islands.mountMaterialTabs && !entry.pending) {
      if (materialTabsHost !== host) {
        const focusedType =
          document.activeElement instanceof window.HTMLElement &&
          host.contains(document.activeElement)
            ? document.activeElement.dataset.type
            : null;
        materialTabs?.destroy();
        materialTabsHost = host;
        materialTabs = islands.mountMaterialTabs(host, materialTabsProps(host));
        if (focusedType)
          $(`#type-${focusedType}`)?.focus({ preventScroll: true });
      } else updateMaterialTabs();
    }
    // React owns its descendants while mounted; keep the native chunk fallback
    // fully usable without competing DOM writes or replacing the upload panel.
    if (!materialTabs) {
      $$(".type-tab").forEach((tab) => {
        const selected = tab.dataset.type === type;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      const marker = $(".tab-marker");
      if (marker)
        marker.style.transform = `translateX(${Object.keys(fileTypes).indexOf(type) * 100}%)`;
    }
    $("#uploadPanel")?.setAttribute("aria-labelledby", `type-${type}`);
    $<HTMLInputElement>("#fileInput").accept = fileTypes[type].accept;
  }
  function finishPicker() {
    clearTimeout(pickerReturnTimer);
    pickerReturnTimer = undefined;
    pickerPending = false;
    updateUploadIsland();
    updateNativePicker();
    if (
      !uploadIsland &&
      islands.mountUpload &&
      page === "check" &&
      !activeTask &&
      !entry.pending
    )
      renderFile();
  }
  function updateNativePicker() {
    if (uploadIsland) return;
    const zone = $("#dropzone");
    if (!zone) return;
    zone.dataset.pickerOpen = String(pickerPending);
    zone
      .querySelectorAll("#chooseFile,#replaceFile")
      .forEach((button) =>
        button.setAttribute("aria-busy", String(pickerPending)),
      );
  }
  function chooseFile() {
    if (activeTask || pickerPending || destroyed) return;
    const input = $<HTMLInputElement>("#fileInput");
    pickerPending = true;
    updateUploadIsland();
    updateNativePicker();
    input.value = "";
    input.accept = fileTypes[type].accept;
    // Keep the file picker in this trusted click/key event. Do not await the
    // folder's second animation or defer input.click to an animation callback.
    try {
      input.click();
    } catch {
      finishPicker();
      setError("无法打开文件选择器，请把文件拖入此处。");
    }
  }
  const fileInput = $<HTMLInputElement>("#fileInput");
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    finishPicker();
    if (file) setFile(file);
  };
  const cancelPicker = () => finishPicker();
  fileInput.addEventListener("cancel", cancelPicker);
  const pickerFocusReturn = () => {
    if (!pickerPending) return;
    clearTimeout(pickerReturnTimer);
    // Older browsers do not emit input.cancel. Focus returns before change on
    // some platforms; settling only the animation never clears the selection.
    pickerReturnTimer = setTimeout(() => {
      if (!destroyed && pickerPending) finishPicker();
    }, 250);
  };
  window.addEventListener("focus", pickerFocusReturn);
  function clearFile() {
    selectionRevision++;
    validationCleanup?.();
    validationCleanup = null;
    validating = false;
    fileWarning = "";
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = null;
    selectedFile = null;
  }
  function setError(message: string) {
    fileError = message;
    if ($("#fileError")) showFeedback($("#fileError"), message, "error");
    else toast(message);
  }
  async function setFile(file: File) {
    if (destroyed || activeTask) return;
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!fileTypes[type].accept.split(",").includes(ext)) {
      setError(`请选择${fileTypes[type].label}文件：${fileTypes[type].hint}。`);
      return;
    }
    if (file.size > 104857600) {
      setError("文件超过 100MB，请压缩后重试。");
      return;
    }
    if (file.size === 0) {
      setError("这个文件为空，请重新选择。");
      return;
    }
    clearFile();
    selectedFile = file;
    previewURL = URL.createObjectURL(file);
    fileError = "";
    const token = selectionRevision;
    if (type === "video") {
      validating = true;
      renderFile("success");
      const video = document.createElement("video");
      const duration = await new Promise<number | null>((resolve) => {
        let settled = false;
        const done = (value: number | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          video.onloadedmetadata = null;
          video.onerror = null;
          video.removeAttribute("src");
          video.load();
          resolve(value);
        };
        const timer = setTimeout(() => done(null), 5000);
        validationCleanup = () => done(null);
        video.onloadedmetadata = () =>
          done(finite(video.duration) ? video.duration : null);
        video.onerror = () => done(null);
        video.preload = "metadata";
        video.src = previewURL!;
      });
      if (token !== selectionRevision) return;
      validationCleanup = null;
      validating = false;
      if (duration !== null && duration > 180) {
        clearFile();
        fileError = "视频超过 3 分钟，请截取需要核验的片段。";
      } else if (duration === null)
        fileWarning = "浏览器无法确认视频时长，将由核验服务继续检查。";
    }
    if (page === "check" && !activeTask) {
      renderFile(fileError ? "error" : "success");
      if (fileError) feedback.cue($("#fileError"), { kind: "error" });
    }
  }
  function uploadProps(): UploadProps {
    const token = selectionRevision;
    return {
      file: selectedFile,
      url: previewURL,
      kind: type,
      open: pickerPending || dragDepth > 0,
      hovered: dragDepth > 0 ? true : undefined,
      paused: !motionEnabled(),
      disabled: !!activeTask,
      label: fileTypes[type].label,
      hint: fileTypes[type].hint,
      detail: fileTypes[type].detail,
      validating,
      onChoose: chooseFile,
      onRemove() {
        if (activeTask) return;
        const restoreFocus = $("#dropzone")?.contains(document.activeElement);
        finishPicker();
        clearFile();
        fileError = "";
        renderFile("change");
        if (restoreFocus)
          $("#dropzone")
            ?.querySelector<HTMLElement>(
              '#chooseFile,[data-upload-action="choose"]',
            )
            ?.focus({ preventScroll: true });
      },
      onPreviewError() {
        if (
          !destroyed &&
          token === selectionRevision &&
          selectedFile &&
          page === "check"
        )
          setError("无法预览这张图片。可以更换材料，或继续核验原文件。");
      },
    };
  }
  function updateUploadIsland() {
    if (uploadIsland && uploadHost?.isConnected)
      uploadIsland.update(uploadProps());
  }
  function renderFile(reason?: "change" | "success" | "error") {
    const dropzone = $("#dropzone");
    if (!dropzone) return;
    dropzone.classList.toggle("has-file", !!selectedFile);
    dropzone.classList.toggle("dragover", dragDepth > 0);
    dropzone.tabIndex = selectedFile ? -1 : 0;
    dropzone.setAttribute("role", "group");
    dropzone.setAttribute(
      "aria-label",
      `${fileTypes[type].label}上传区域${selectedFile ? "" : "，可拖入文件或按 Enter 选择文件"}`,
    );
    $("#fileError").textContent = fileError;
    $("#fileWarning").textContent = fileWarning;
    $<HTMLButtonElement>("#analyzeButton").disabled =
      !selectedFile || validating || !!activeTask;
    if (islands.mountUpload && !pickerPending) {
      if (uploadHost !== dropzone) {
        const restoreFocus = dropzone.contains(document.activeElement);
        uploadIsland?.destroy();
        uploadHost = dropzone;
        uploadIsland = islands.mountUpload(dropzone, uploadProps());
        if (restoreFocus)
          dropzone
            .querySelector<HTMLElement>('[data-upload-action="choose"]')
            ?.focus({ preventScroll: true });
      } else updateUploadIsland();
      return;
    }
    feedback.settle(dropzone);
    // A functional native fallback also keeps the app usable if the optional
    // React island chunk cannot be loaded.
    if (!selectedFile) {
      dropzone.innerHTML = `<span class="upload-glyph">${icon("upload")}</span><h2>拖放${fileTypes[type].label}，或 <button id="chooseFile" type="button">选择文件</button></h2><p>${fileTypes[type].hint}<br>${fileTypes[type].detail}</p>`;
      $("#chooseFile").onclick = chooseFile;
    } else {
      const media = ["image", "chat"].includes(type)
        ? `<img src="${previewURL}" class="file-preview" alt="所选材料预览">`
        : type === "video"
          ? `<video controls class="file-preview" src="${previewURL}" aria-label="所选视频预览"></video>`
          : `<audio controls class="audio-preview" src="${previewURL}" aria-label="所选声音预览"></audio>`;
      dropzone.innerHTML = `${media}<span class="selected-name">${e(selectedFile.name)}</span><p>${(selectedFile.size / 1024 / 1024).toFixed(2)} MB${validating ? " · 正在校验视频时长…" : ""}</p><div class="file-controls"><button id="replaceFile">更换材料 ↗</button><button id="removeFile">移除 ×</button></div>`;
      $("#replaceFile").onclick = chooseFile;
      $("#removeFile").onclick = () => uploadProps().onRemove?.();
      const image = dropzone.querySelector("img");
      if (image) image.onerror = () => uploadProps().onPreviewError?.();
    }
    updateNativePicker();
    if (reason) {
      const targets = selectedFile
        ? dropzone.querySelectorAll<HTMLElement>(
            ".selected-name,.file-controls,p",
          )
        : dropzone.querySelectorAll<HTMLElement>(".upload-glyph,h2,p");
      targets.forEach((node) =>
        feedback.cue(node, {
          kind: reason === "success" ? "success" : "change",
        }),
      );
    }
  }

  function renderProcessing() {
    if (!activeTask) return;
    disposeIslands();
    body.innerHTML =
      heading("材料核验", "正在整理这份材料。", "结果会保存在核验记录中。") +
      `<section class="surface empty-state"><div class="loading-scan">${icon("scan")}</div><h3 id="progressTitle" role="status" aria-live="polite" aria-atomic="true">${e(activeTask.message)}</h3><p>${e(activeTask.name || "你可以先浏览其他内容，任务会继续处理。")}</p><div id="taskStatus" class="task-status"></div><section id="streamPanel" class="task-stream" ${activeTask.streamText ? "" : "hidden"}><header><strong>已接收内容</strong><span>最终报告生成中</span></header><pre id="streamText" class="stream-output" tabindex="0" aria-label="核验服务正在输出的内容">${e(activeTask.streamText)}</pre></section><button id="leaveTask" class="text-button">返回主页 ↗</button></section>`;
    if (islands.mountStatus)
      statusIsland = islands.mountStatus($("#taskStatus"), taskStatusProps());
    $("#leaveTask").onclick = () => go("home");
  }
  function taskStatusProps() {
    return {
      decorative: true,
      state: activeTask?.state || "thinking",
      label: activeTask?.message || "",
      detail: activeTask?.id ? "材料已提交" : "正在连接核验服务",
      paused: !motionEnabled(),
    };
  }
  function taskMessage(
    message: string,
    state: ActiveTask["state"] = "analyzing",
  ) {
    if (!activeTask) return;
    activeTask.message = message;
    activeTask.state = state;
    if (page === "check" && $("#progressTitle"))
      $("#progressTitle").textContent = message;
    statusIsland?.update(taskStatusProps());
  }
  function openReport(report: Report) {
    currentReport = report;
    go(`report/${encodeURIComponent(report.id)}`);
  }
  function completeTask(result: Report) {
    activeTask = null;
    currentReport = result;
    if (page === "check") openReport(result);
    else toast("核验已完成，可在核验记录中查看。");
  }
  async function analyze() {
    if (destroyed || activeTask || !selectedFile || validating) return;
    fileError = "";
    activeTask = {
      name: selectedFile.name,
      state: "loading",
      message: "正在提交材料…",
      streamText: "",
    };
    renderProcessing();
    const data = new FormData();
    data.append("file", selectedFile);
    data.append("scene", type === "chat" ? "chat" : "general");
    data.append("context", "");
    try {
      const job = parseAnalyzeResponse(
        await request("/analyze", { method: "POST", body: data }, null, 60000),
      );
      if (destroyed) return;
      if (!job || typeof job.job_id !== "string" || !job.job_id)
        throw new Error("未收到任务编号，请先查看核验记录后再重试。");
      activeTask.id = job.job_id;
      savePendingJob(job.job_id);
      taskMessage("材料已提交，正在核验…");
      await pollJob(job.job_id, job.events_url);
    } catch (error) {
      if (!destroyed)
        taskFailed(
          errorCode(error) === "timeout" && !activeTask?.id
            ? "提交超时，请先查看核验记录后再重试。"
            : errorMessage(error),
        );
    }
  }
  function taskFailed(message: string) {
    activeTask = null;
    fileError = message;
    // A returning view owns its intro until it commits. Keep the failure in state
    // so that render uses it, without replacing a live Rare UI entry island.
    if (page === "check") {
      if (!entry.pending && transitions.state !== "closing") {
        renderCheck();
        feedback.cue($("#fileError"), { kind: "error" });
      }
    } else toast(message);
  }
  async function resumeJob(id: string) {
    if (activeTask || id !== pendingJob()) return;
    activeTask = {
      id,
      state: "loading",
      message: "正在恢复核验进度…",
      streamText: "",
    };
    renderProcessing();
    try {
      await pollJob(id);
    } catch (error) {
      if (!destroyed) taskFailed(errorMessage(error));
    }
  }
  async function pollJob(id: string, eventsUrl?: string) {
    try {
      const result = await tasks.watch(id, {
        eventsUrl,
        onStatus: taskMessage,
        onDelta: appendStreamText,
        onTransport(mode) {
          if (!activeTask) return;
          const previous = activeTask.transport;
          activeTask.transport = mode;
          if (previous === "stream" && mode === "poll")
            taskMessage("实时连接已切换为进度查询，已接收内容仍保留。");
        },
      });
      if (destroyed) return;
      clearPendingJob(id);
      completeTask(result);
    } catch (error) {
      if (error instanceof TaskError && error.clearPending) clearPendingJob(id);
      throw error;
    }
  }

  function flushStreamText() {
    clearTimeout(streamTimer);
    streamTimer = undefined;
    if (destroyed || page !== "check" || !activeTask) return;
    const host = $("#streamText");
    if (host?.isConnected) {
      const follow =
        host.scrollHeight - host.clientHeight - host.scrollTop <= 24;
      host.textContent = activeTask.streamText;
      if (follow) host.scrollTop = host.scrollHeight;
      const panel = $("#streamPanel");
      if (panel) panel.hidden = !activeTask.streamText;
    }
  }
  function appendStreamText(delta: string) {
    if (destroyed || !activeTask) return;
    activeTask.streamText = (activeTask.streamText + delta).slice(0, 262144);
    if (streamTimer === undefined)
      streamTimer = setTimeout(flushStreamText, 32);
  }

  function renderContacts() {
    body.innerHTML =
      heading(
        "02 / 联系家人",
        "熟悉的声音，才是安心的答案。",
        "提前保存家人的真实号码。遇到紧急请求，先打一个电话。",
      ) +
      `<div class="contact-layout"><section class="surface"><h2>我的家人 <span id="contactCount">/ ${contacts.length}</span></h2><div id="contactList"></div></section><section class="surface"><span class="decor-star">✳</span><h2>把最重要的人，放在这里。</h2><p class="mode-explanation">请与家人事先确认号码，不要使用可疑消息中提供的新号码。</p><form id="contactForm"><div class="form-field"><label for="contactName">怎么称呼 TA</label><input id="contactName" placeholder="例如：女儿、小陈" required maxlength="30" autocomplete="off"></div><div class="form-field"><label for="contactPhone">熟悉的电话号码</label><input id="contactPhone" placeholder="请输入已确认的号码" type="tel" required maxlength="25" autocomplete="tel"></div><p id="contactError" class="inline-error" role="alert"></p><button class="primary" type="submit">保存家人号码 ${icon("heart")}</button></form></section></div><div class="notice">${icon("lock")}<span>联系人仅保存在当前浏览器。拨号按钮会打开设备电话程序，手机使用更方便。</span></div>`;
    const status = document.createElement("p");
    status.id = "contactStatus";
    status.className = "interaction-status";
    status.setAttribute("role", "status");
    $("#contactList").before(status);
    renderContactList();
    const form = $<HTMLFormElement>("#contactForm");
    const contactError = (message: string, input?: HTMLInputElement) => {
      if (input) input.setAttribute("aria-invalid", "true");
      showFeedback($("#contactError"), message, "error");
    };
    form
      .querySelectorAll("input")
      .forEach((input) =>
        input.setAttribute("aria-describedby", "contactError"),
      );
    listen(
      form,
      "invalid",
      (event) => {
        const input = event.target;
        if (!(input instanceof window.HTMLInputElement)) return;
        input.setAttribute("aria-invalid", "true");
        const firstInvalid = [...form.elements].find(
          (control) =>
            control instanceof window.HTMLInputElement &&
            control.willValidate &&
            !control.validity.valid,
        );
        if (firstInvalid === input)
          contactError(
            input.id === "contactName"
              ? "请填写家人的称呼。"
              : "请填写熟悉的电话号码。",
            input,
          );
      },
      true,
    );
    listen(form, "input", (event) => {
      if (!(event.target instanceof window.HTMLInputElement)) return;
      event.target.removeAttribute("aria-invalid");
      feedback.settle($("#contactError"));
      $("#contactError").textContent = "";
    });
    $<HTMLFormElement>("#contactForm").onsubmit = (ev) => {
      ev.preventDefault();
      const name = $<HTMLInputElement>("#contactName").value.trim(),
        phone = $<HTMLInputElement>("#contactPhone").value.trim();
      if (
        !name ||
        !/^\+?[\d -]{5,25}$/.test(phone) ||
        phone.replace(/\D/g, "").length < 5
      ) {
        contactError(
          "请填写称呼和有效电话号码。",
          !name
            ? $<HTMLInputElement>("#contactName")
            : $<HTMLInputElement>("#contactPhone"),
        );
        return;
      }
      const normalized = phone.replace(/[^+\d]/g, "");
      if (contacts.some((c) => c.phone.replace(/[^+\d]/g, "") === normalized)) {
        contactError(
          "这个号码已经保存，无需重复添加。",
          $<HTMLInputElement>("#contactPhone"),
        );
        return;
      }
      const next = [...contacts, { name, phone }];
      if (!saveArray("qinan-contacts", next)) {
        contactError("当前浏览器无法保存，请检查存储设置后重试。");
        return;
      }
      contacts = next;
      renderContactList();
      form.reset();
      feedback.settle($("#contactError"));
      $("#contactError").textContent = "";
      form
        .querySelectorAll("[aria-invalid]")
        .forEach((input) => input.removeAttribute("aria-invalid"));
      showFeedback($("#contactStatus"), `已保存 ${name} 的号码。`);
      feedback.cue($("#contactList .contact-row:last-child"), {
        kind: "success",
      });
    };
  }
  function renderContactList() {
    const list = $("#contactList");
    if (!list) return;
    feedback.settle(list);
    $("#contactCount").textContent = `/ ${contacts.length}`;
    if (!contacts.length) {
      list.innerHTML = `<div class="empty-state">${icon("heart")}<h3>给关心的人，留个位置。</h3><p>先添加一位家人，<br>需要核实时就能快速找到 TA。</p></div>`;
      return;
    }
    list.innerHTML = contacts
      .map(
        (contact, i) =>
          `<div class="contact-row"><span class="avatar">${e(contact.name[0])}</span><div><h3>${e(contact.name)}</h3><p>${e(contact.phone)}</p></div><a href="tel:${contact.phone.replace(/[^+\d]/g, "")}" aria-label="拨打${e(contact.name)}的电话">${icon("phone")}</a><button class="icon-button" data-remove="${i}" aria-label="移除${e(contact.name)}">${icon("trash")}</button></div>`,
      )
      .join("");
    $$("[data-remove]").forEach(
      (button) =>
        (button.onclick = () => {
          const contact = contacts[Number(button.dataset.remove)];
          openModal(
            `<span class="modal-eyebrow">YOUR CIRCLE OF TRUST</span><h2 id="modalTitle">移除这个号码？</h2><p>将从当前浏览器移除 ${e(contact.name)} 的联系方式。</p><p id="contactRemoveError" class="inline-error" role="alert"></p><div class="modal-actions"><button id="confirmRemove" class="primary">确认移除</button><button id="keepContact" class="secondary">保留号码</button></div>`,
          );
          $("#confirmRemove").onclick = () => {
            const index = contacts.indexOf(contact),
              next = contacts.filter((c) => c !== contact);
            if (!saveArray("qinan-contacts", next)) {
              showFeedback(
                $("#contactRemoveError"),
                "暂时无法保存更改，号码仍然保留。请检查存储设置后重试。",
                "error",
              );
              return;
            }
            contacts = next;
            closeModal();
            renderContactList();
            showFeedback(
              $("#contactStatus"),
              `已移除 ${contact.name} 的号码。`,
            );
            feedback.cue(
              $("#contactList .contact-row") || $("#contactList .empty-state"),
              { kind: "change" },
            );
            (
              $(`[data-remove="${Math.min(index, contacts.length - 1)}"]`) ||
              $<HTMLInputElement>("#contactName")
            )?.focus({ preventScroll: true });
          };
          $("#keepContact").onclick = closeModal;
        }),
    );
    list
      .querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]')
      .forEach(
        (link) => (link.onclick = () => feedback.cue(link, { kind: "press" })),
      );
  }

  function disposePracticeDock() {
    practiceDock?.remove();
    practiceDock = null;
    $(".workspace-surface").classList.remove("has-practice");
  }
  function ensurePracticeDock() {
    const surface = $(".workspace-surface");
    surface.classList.add("has-practice");
    if (!practiceDock?.isConnected) {
      practiceDock = document.createElement("nav");
      practiceDock.id = "practiceDock";
      practiceDock.className = "practice-dock";
      practiceDock.setAttribute("aria-label", "练习操作");
      practiceDock.innerHTML =
        '<div class="practice-dock-copy"><span id="practiceDockStep" class="practice-dock-step"></span><p id="practiceDockHint" aria-live="polite"></p></div><button id="nextQuestion" class="primary" aria-describedby="practiceDockHint" disabled></button>';
      surface.insertBefore(
        practiceDock,
        surface.querySelector(".workspace-footer"),
      );
    }
    updatePracticeDock();
  }
  function restartQuiz() {
    if (questionSwap || page !== "practice") return;
    currentQuiz = 0;
    answer = null;
    correctCount = 0;
    mistakes = [];
    practiceFaqValue = null;
    renderQuiz();
    body.scrollTop = 0;
    $("#questionTitle")?.focus({ preventScroll: true });
  }
  function updatePracticeDock() {
    if (!practiceDock?.isConnected) return;
    const complete = currentQuiz >= quiz.length,
      button = practiceDock.querySelector("button")!,
      q = quiz[currentQuiz];
    practiceDock.dataset.state = questionSwap
      ? "switching"
      : complete
        ? "complete"
        : answer === null
          ? "question"
          : "feedback";
    $("#practiceDockStep").textContent = complete
      ? "本轮完成"
      : `情景 ${String(currentQuiz + 1).padStart(2, "0")} / ${String(quiz.length).padStart(2, "0")}`;
    $("#practiceDockHint").textContent = complete
      ? `答对 ${correctCount} / ${quiz.length} 题 · 可回顾核实提醒`
      : answer === null
        ? "选择一个答案，再继续"
        : answer === q.correct
          ? "✓ 这一步正确，继续练习"
          : "先记住核实方法，再继续";
    button.id = complete ? "restartQuiz" : "nextQuestion";
    button.innerHTML = complete
      ? `再练一轮 ${icon("refresh")}`
      : `${currentQuiz === quiz.length - 1 ? "查看本轮结果" : "下一道情景"} ${icon("arrow")}`;
    button.disabled =
      !windowReady ||
      page !== "practice" ||
      !!questionSwap ||
      (!complete && (answer === null || !!quizExit));
    button.onclick = complete ? restartQuiz : nextQuizQuestion;
  }
  function counterProps(): CounterProps {
    return {
      value: correctCount,
      paused: !motionEnabled(),
      label: "已答对",
      suffix: ` / ${quiz.length}`,
    };
  }
  function faqProps(): FaqProps {
    return {
      items: practiceFaqItems,
      value: practiceFaqValue,
      paused: !motionEnabled(),
      onValueChange(value) {
        practiceFaqValue = value;
        practiceFaq?.update({ value });
      },
    };
  }
  function refreshPracticeIslands() {
    const counter = $("#practiceCounter"),
      faq = $("#practiceFaq");
    if (counter) {
      if (!practiceCounter && islands.mountCounter)
        practiceCounter = islands.mountCounter(counter, counterProps());
      else if (practiceCounter) practiceCounter.update(counterProps());
      else
        counter.innerHTML = `<span class="practice-native-score">${correctCount}<small> / ${quiz.length}</small></span>`;
    }
    if (faq) {
      if (!practiceFaq && islands.mountFaq)
        practiceFaq = islands.mountFaq(faq, faqProps());
      else if (practiceFaq) practiceFaq.update(faqProps());
      else {
        faq.innerHTML = practiceFaqItems
          .map(
            (item) =>
              `<details class="practice-native-faq" data-faq="${e(item.id)}" ${practiceFaqValue === item.id ? "open" : ""}><summary>${e(item.question)}</summary><p>${e(item.answer)}</p></details>`,
          )
          .join("");
        faq.querySelectorAll("details").forEach((detail) =>
          listen(detail, "toggle", () => {
            if (!detail.isConnected) return;
            if (detail.open) practiceFaqValue = detail.dataset.faq ?? null;
            else if (practiceFaqValue === detail.dataset.faq)
              practiceFaqValue = null;
          }),
        );
      }
    }
  }
  function quizTickets() {
    return quiz
      .map((q, i) =>
        i >= currentQuiz + (answer !== null ? 1 : 0)
          ? `<div class="quiz-tile${i === currentQuiz ? " is-current" : ""}" role="listitem" data-question="${i}" ${i === currentQuiz ? 'aria-current="step"' : ""}><span class="ticket-icon">${icon(q.icon)}</span><span class="ticket-index">${String(i + 1).padStart(2, "0")}</span><span class="ticket-title">${e(q.shortLabel)}</span></div>`
          : "",
      )
      .join("");
  }
  function renderQuiz() {
    disposeQuizLayout();
    disposePracticeIslands();
    ensurePracticeDock();
    body.innerHTML = `<section class="practice-frame"><header class="practice-header">${heading("03 / 情景练习", "先核实，再决定。", "六个虚构情景，每题选择一步。")}<div class="practice-score"><span class="practice-score-label">本轮答对</span><div id="practiceCounter"></div><span id="scoreCount">已答对 ${correctCount} 题</span></div></header><div class="practice-queue"><div class="quiz-queue-label"><span>待完成题目 / QUESTION QUEUE</span><span id="quizRemaining">${Math.max(0, quiz.length - currentQuiz - (answer !== null ? 1 : 0))} / ${quiz.length}</span></div><div class="quiz-progress" role="list" aria-label="待完成题目">${quizTickets() || '<span class="queue-complete">全部完成 ✓</span>'}</div></div><div id="practiceStage" class="practice-stage"></div></section>`;
    if (currentQuiz < quiz.length)
      quizLayout =
        createLayout?.($(".quiz-progress"), {
          duration: 250,
          ease: "outQuad",
          leaveTo: {
            transform: "translateY(-28px) scale(.25)",
            opacity: 0,
            duration: 350,
            ease: "out(3)",
          },
        }) ?? null;
    paintQuizQuestion();
    refreshPracticeIslands();
  }
  function materialMedia(q: Question) {
    if (q.materialType === "video")
      return `<div class="material-media material-video" aria-hidden="true"><div class="media-reticle">${icon("video")}<span class="media-frame-corner"></span></div><span class="media-caption">视频情景 · 静态示意</span></div>`;
    if (q.materialType === "audio")
      return `<div class="material-media material-audio" aria-hidden="true"><div class="media-wave">${Array.from({ length: 24 }, (_, i) => `<i style="height:${10 + Math.sin(i * 1.7) ** 2 * 28}px"></i>`).join("")}</div><span class="media-caption">语音情景 · 文字转述</span></div>`;
    if (q.materialType === "call")
      return `<div class="material-media material-call" aria-hidden="true">${icon("phone")}<span class="media-caption">来电情景 · 文字转述</span><span class="call-line"></span></div>`;
    return "";
  }
  function paintQuizQuestion() {
    const stage = $("#practiceStage");
    if (!stage) return;
    disposePracticeFaq();
    practiceFaqItems = [];
    if (currentQuiz >= quiz.length) {
      paintQuizResult();
      return;
    }
    const q = quiz[currentQuiz];
    stage.classList.remove("is-complete");
    stage.innerHTML = `<article id="practiceMaterial" class="practice-material surface" data-material-type="${e(q.materialType)}" aria-label="虚构情景材料"><div class="material-topline"><span class="material-type">${icon(q.icon)}${e(q.materialLabel)}</span><span class="fiction-badge">虚构情景</span></div><div class="material-sender"><span class="sender-avatar" aria-hidden="true">${icon(q.icon)}</span><div><strong class="sender-name">${e(q.sender)}</strong><span class="sender-meta">${e(q.senderMeta)}</span></div></div>${materialMedia(q)}<div class="material-body">${q.bodySegments.map((segment) => `<span class="material-segment${segment.clue ? " case-clue" : ""}"${segment.clue ? ` data-clue="${e(segment.clue)}"` : ""}>${e(segment.text)}</span>`).join("")}</div><div id="materialClues" class="material-clues" hidden></div><footer class="material-note case-file-footer"><span>CASE ${String(currentQuiz + 1).padStart(2, "0")} / ${quiz.length}</span><span>${["video", "audio", "call"].includes(q.materialType) ? "情景转述 · 非真实通话" : "教学示例 · 不是真实消息"}</span></footer></article><section id="practiceAction" class="practice-action surface question-card" aria-labelledby="questionTitle"><div class="question-meta"><span>情景 ${String(currentQuiz + 1).padStart(2, "0")} / 06</span><span>独立核实</span></div><div class="progress-track" aria-hidden="true"><span style="width:${(currentQuiz / quiz.length) * 100}%"></span></div><h2 id="questionTitle" tabindex="-1">${e(q.title)}</h2><div id="answers" role="group" aria-label="选择你会采取的一步">${q.answers.map((choice, i) => `<button class="answer" data-answer="${i}"><b aria-hidden="true">${String.fromCharCode(65 + i)}</b><span class="answer-copy">${e(choice)}<span class="answer-status"></span></span></button>`).join("")}</div><div id="feedback"></div></section>`;
    $$<HTMLButtonElement>("[data-answer]").forEach(
      (button) =>
        (button.onclick = () => {
          if (!windowReady || answer !== null || questionSwap) return;
          answer = Number(button.dataset.answer);
          if (answer === q.correct) correctCount++;
          else mistakes.push(q);
          updateAnswer(q);
          removeProgressTile();
        }),
    );
    $$(".quiz-tile").forEach((tile) => {
      const active = Number(tile.dataset.question) === currentQuiz;
      tile.classList.toggle("is-current", active);
      if (active) tile.setAttribute("aria-current", "step");
      else tile.removeAttribute("aria-current");
    });
    if (answer !== null) updateAnswer(q, false);
    updatePracticeDock();
  }
  function paintQuizResult() {
    const stage = $("#practiceStage");
    stage.classList.add("is-complete");
    const wrongIds = new Set(mistakes.map((q) => q.id)),
      ordered = [...mistakes, ...quiz.filter((q) => !wrongIds.has(q.id))];
    practiceFaqItems = ordered.map((q) => ({
      ...q.reviewQA,
      question: `${wrongIds.has(q.id) ? "再留意" : "已掌握"} · ${q.shortLabel}：${q.reviewQA.question}`,
    }));
    stage.innerHTML = `<section class="practice-result surface"><span class="eyebrow">本轮完成 / SESSION COMPLETE</span><h2 id="questionTitle" tabindex="-1">${correctCount === quiz.length ? "六次停顿，六次正确决定。" : "再核实一步，就更从容。"}</h2><p class="practice-result-score">本轮答对 <strong>${correctCount} / ${quiz.length}</strong> 题</p><p>${mistakes.length ? `有 ${mistakes.length} 个情景值得再看一次。先回顾这些提醒，再把核实变成习惯。` : "这一轮全部答对。六条核实提醒都在下面，遇到相似情况时可以再看一遍。"}</p><span class="fiction-badge">虚构情景练习 · 不代表真实检测能力</span></section><section class="practice-review-list surface"><span class="eyebrow">${mistakes.length ? "先回顾答错的情景" : "六条核实提醒"}</span><h3>把判断变成行动。</h3><div id="practiceFaq" class="practice-faq"></div></section>`;
    updatePracticeDock();
  }
  function removeProgressTile() {
    const tile = $(`[data-question="${currentQuiz}"]`);
    if (!tile) return;
    const layout = quizLayout,
      progress = tile.parentElement!,
      next = $<HTMLButtonElement>("#nextQuestion"),
      remaining = quiz.length - currentQuiz - 1;
    if (next) next.disabled = true;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (quizExit?.tile === tile) {
        clearTimeout(quizExit.timer);
        quizExit = null;
      }
      tile.remove();
      if ($("#quizRemaining"))
        $("#quizRemaining").textContent = `${remaining} / ${quiz.length}`;
      updatePracticeDock();
      if (progress.isConnected && !progress.querySelector(".quiz-tile"))
        progress.innerHTML = '<span class="queue-complete">全部完成 ✓</span>';
    };
    if (motionEnabled() && layout) {
      const exit: QuizExit = {
        tile,
        finish,
        animation: null,
        timer: setTimeout(() => {
          exit.animation?.complete?.();
          finish();
        }, 850),
      };
      quizExit = exit;
      try {
        exit.animation = layout.update(() => tile.classList.add("is-hidden"), {
          onComplete: finish,
        });
        if (exit.animation?.completed) finish();
      } catch {
        finish();
      }
    } else finish();
  }
  function updateAnswer(q: Question, shouldAnimate = true) {
    finishFeedback();
    disposePracticeFaq();
    $$<HTMLButtonElement>("[data-answer]").forEach((button) => {
      const i = Number(button.dataset.answer);
      button.disabled = true;
      button.classList.toggle("correct", i === q.correct);
      button.classList.toggle("wrong", i === answer && i !== q.correct);
      button.querySelector("b")!.textContent =
        i === q.correct
          ? "✓"
          : i === answer
            ? "✕"
            : String.fromCharCode(65 + i);
      button.querySelector(".answer-status")!.textContent =
        i === q.correct
          ? i === answer
            ? "你的选择 · 建议做法"
            : "建议做法"
          : i === answer
            ? "你的选择"
            : "";
    });
    $("#scoreCount").textContent = `已答对 ${correctCount} 题`;
    $(".progress-track span").style.width =
      `${((currentQuiz + 1) / quiz.length) * 100}%`;
    $$(".material-segment[data-clue]").forEach((segment) =>
      segment.classList.add("is-clue"),
    );
    const clues = $("#materialClues");
    clues.hidden = false;
    clues.innerHTML = `<span class="clues-label">值得留意的线索</span>${q.keyClues.map((clue) => `<span class="clue-label">${e(clue.label)}</span>`).join("")}`;
    practiceFaqItems = [q.reviewQA];
    $("#feedback").innerHTML =
      `<div class="question-feedback ${answer === q.correct ? "is-correct" : "is-wrong"}" role="status"><b>${answer === q.correct ? "✓ 这一步，让安心更近了。" : "✕ 再多核实一步，会更稳妥。"}</b><p>${e(q.why)}</p></div><div id="practiceFaq" class="practice-faq"></div>`;
    $("#feedback").tabIndex = 0;
    $("#feedback").setAttribute("role", "region");
    $("#feedback").setAttribute("aria-label", "本题解析与核实提醒");
    refreshPracticeIslands();
    if (shouldAnimate && windowReady && motionEnabled()) {
      const feedback = $("#feedback");
      let completed = false;
      try {
        const animation = animate(feedback, {
          y: [10, 0],
          opacity: [0, 1],
          duration: 300,
          ease: "outQuad",
          onComplete: () => {
            completed = true;
            feedback.style.opacity = "1";
            feedback.style.transform = "none";
            feedbackAnimation = null;
          },
        });
        if (!completed) feedbackAnimation = animation;
      } catch {
        finishFeedback();
      }
    }
    updatePracticeDock();
  }
  function finishQuestionSwap() {
    const swap = questionSwap;
    if (!swap) return;
    swap.animation?.cancel?.();
    swap.commit();
    swap.finish(false);
  }
  function nextQuizQuestion() {
    if (
      !windowReady ||
      page !== "practice" ||
      answer === null ||
      quizExit ||
      questionSwap
    )
      return;
    finishFeedback();
    const stage = $("#practiceStage");
    if (!stage) return;
    const swap: QuestionSwap = {
      animation: null,
      timer: undefined,
      phase: "out",
      committed: false,
      commit() {
        if (questionSwap !== swap || swap.committed) return;
        swap.committed = true;
        currentQuiz++;
        answer = null;
        practiceFaqValue = null;
        paintQuizQuestion();
        refreshPracticeIslands();
        const stageRect = stage.getBoundingClientRect(),
          bodyRect = body.getBoundingClientRect();
        if (
          stageRect.top < bodyRect.top ||
          stageRect.top > bodyRect.bottom - 100
        )
          body.scrollTop = Math.max(
            0,
            body.scrollTop + stageRect.top - bodyRect.top - 12,
          );
      },
      finish(focus = true) {
        if (questionSwap !== swap) return;
        clearTimeout(swap.timer);
        questionSwap = null;
        stage.style.opacity = "1";
        stage.style.transform = "none";
        stage.removeAttribute("aria-busy");
        updatePracticeDock();
        if (focus && page === "practice" && windowReady)
          $("#questionTitle")?.focus({ preventScroll: true });
      },
    };
    questionSwap = swap;
    stage.setAttribute("aria-busy", "true");
    updatePracticeDock();
    if (!motionEnabled() || !windowReady) {
      swap.commit();
      swap.finish();
      return;
    }
    swap.timer = setTimeout(() => finishQuestionSwap(), 650);
    try {
      const animation = animate(stage, {
        opacity: [1, 0.16],
        y: [0, -8],
        duration: 150,
        ease: "inQuad",
        onComplete: () => {
          if (questionSwap !== swap) return;
          swap.commit();
          swap.phase = "in";
          try {
            const entrance = animate(stage, {
              opacity: [0.16, 1],
              y: [8, 0],
              duration: 150,
              ease: "outQuad",
              onComplete: () => swap.finish(),
            });
            if (questionSwap === swap) swap.animation = entrance;
          } catch {
            swap.finish();
          }
        },
      });
      if (questionSwap === swap && swap.phase === "out")
        swap.animation = animation;
    } catch {
      finishQuestionSwap();
    }
  }

  function updateHistoryHint() {
    $("#historyHint").textContent = "每一次核实，都有迹可循";
  }
  function dateText(value?: string) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime())
      ? "时间未提供"
      : date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  }
  async function renderHistory(
    revision = routeRevision,
    { retry = false } = {},
  ) {
    if (!retry || !$("#historyList"))
      body.innerHTML =
        heading(
          "04 / 核验记录",
          "每一次核实，都有迹可循。",
          "查看已完成的核验与报告。",
        ) + `<section class="surface" id="historyList"></section>`;
    const list = $("#historyList");
    feedback.settle(list);
    list.setAttribute("aria-busy", "true");
    list.innerHTML =
      '<div class="request-status" role="status"><i aria-hidden="true"></i><span>正在读取记录…</span></div>';
    const controller = viewController,
      requestId = ++historyRequest;
    const current = () =>
      !destroyed &&
      !controller.signal.aborted &&
      revision === routeRevision &&
      requestId === historyRequest &&
      list.isConnected;
    const ready = () => {
      list.removeAttribute("aria-busy");
      if (retry)
        feedback.cue(list.firstElementChild as HTMLElement | null, {
          kind: "change",
        });
    };
    let items: CaseSummary[];
    try {
      const data = await request("/cases", {}, controller.signal);
      items = parseCaseList(data);
      items = items.filter((item) => !item.demo);
    } catch (error) {
      if (!current()) return;
      list.innerHTML = `<div class="empty-state">${icon("clock")}<h3>暂时无法读取记录。</h3><p role="alert">${e(errorMessage(error))}</p><button class="secondary" id="retryHistory">重新读取</button></div>`;
      let retrying = false;
      $<HTMLButtonElement>("#retryHistory").onclick = () => {
        if (retrying) return;
        retrying = true;
        $<HTMLButtonElement>("#retryHistory").disabled = true;
        renderHistory(revision, { retry: true });
      };
      ready();
      feedback.cue(list.querySelector('[role="alert"]'), { kind: "error" });
      return;
    }
    if (!current()) return;
    if (!items.length) {
      list.innerHTML = `<div class="empty-state">${icon("clock")}<h3>还没有核验记录。</h3><p>提交一份材料，完成后可以在这里查看。</p><button id="firstCheck" class="primary">开始一次核验 ${icon("arrow")}</button></div>`;
      $("#firstCheck").onclick = () => go("check");
      ready();
      return;
    }
    list.innerHTML = items
      .map(
        (r, i) =>
          `<div class="history-row"><span class="history-icon">${icon("file")}</span><div><h3>${e(r.name || r.filename || "核验记录")}</h3><small>${e(dateText(r.date || r.created_at))}</small></div><button data-report="${i}">查看报告 ↗</button></div>`,
      )
      .join("");
    $$("[data-report]").forEach(
      (button) =>
        (button.onclick = () =>
          go(
            `report/${encodeURIComponent(items[Number(button.dataset.report)].id)}`,
          )),
    );
    ready();
  }
  async function renderReportFromId(
    id: string | undefined,
    revision: number,
    { retry = false } = {},
  ) {
    if (!retry || !$("#reportLoadState"))
      body.innerHTML =
        heading(
          "核验报告",
          "查看这份核验记录。",
          "读取已保存的材料与核验线索。",
        ) + '<section class="surface" id="reportLoadState"></section>';
    const host = $("#reportLoadState");
    feedback.settle(host);
    host.setAttribute("aria-busy", "true");
    host.innerHTML =
      '<div class="request-status" role="status"><i aria-hidden="true"></i><span>正在打开核验记录…</span></div>';
    if (!id) {
      renderReportError("请从核验记录中选择一份报告。");
      return;
    }
    const controller = viewController,
      requestId = ++reportRequest;
    const current = () =>
      !destroyed &&
      !controller.signal.aborted &&
      revision === routeRevision &&
      requestId === reportRequest &&
      host.isConnected;
    try {
      const data = await request(
        `/cases/${encodeURIComponent(id)}`,
        {},
        controller.signal,
      );
      if (!current()) return;
      currentReport = reportFromResponse(data);
      renderReport();
      if (retry) feedback.cue($(".result-banner"), { kind: "change" });
    } catch (error) {
      if (!current()) return;
      renderReportError(errorMessage(error), id, revision);
    }
  }
  function renderReportError(
    message: string,
    id?: string,
    revision = routeRevision,
  ) {
    const host = $("#reportLoadState");
    if (!host) return;
    feedback.settle(host);
    host.removeAttribute("aria-busy");
    host.innerHTML = `<div class="empty-state"><h2>暂时无法读取这份报告。</h2><p role="alert">${e(message)}</p><div class="request-actions">${id ? '<button id="retryReport" class="secondary">重新读取报告</button>' : ""}<button id="backToHistory" class="primary">返回核验记录 ${icon("arrow")}</button></div></div>`;
    $("#backToHistory").onclick = () => go("history");
    if ($<HTMLButtonElement>("#retryReport")) {
      let retrying = false;
      $<HTMLButtonElement>("#retryReport").onclick = () => {
        if (retrying) return;
        retrying = true;
        $<HTMLButtonElement>("#retryReport").disabled = true;
        renderReportFromId(id, revision, { retry: true });
      };
    }
    feedback.cue(host.querySelector('[role="alert"]'), { kind: "error" });
  }
  function renderReport() {
    const report = currentReport;
    if (!report) return;
    const legacy = !!report.demo,
      states = reportModules(report).map(
        ([, module]) => moduleResult(module).status,
      );
    const title = legacy
      ? "旧版示例"
      : states.includes("flagged")
        ? "发现需要核实的线索"
        : states.includes("uncertain")
          ? "存在待核实的线索"
          : states.includes("below")
            ? "核验结果已整理"
            : report.chat_analysis?.status === "completed"
              ? "聊天线索已整理"
              : "本次未形成可用判断";
    const summary =
      typeof report.summary === "string" && report.summary.trim()
        ? report.summary
        : legacy
          ? "这是一份保存在当前浏览器中的旧版示例记录。"
          : "请结合下面的模块结果与材料内容，继续核实。";
    const steps = Array.isArray(report.next_steps)
      ? report.next_steps.filter((item) => typeof item === "string")
      : [];
    body.innerHTML =
      heading(
        "核验报告",
        title,
        e(report.name || report.filename || "核验报告"),
      ) +
      `${legacy ? '<div class="notice mode-notice">旧版示例 · 不属于本次材料的检测结果</div>' : ""}<div class="result-banner">${icon("scan")}<div><h2>结果摘要</h2><p>${e(summary)}</p></div></div>` +
      (legacy ? "" : renderActualModules(report)) +
      `<section class="surface report-next"><h2>下一步</h2><ul>${(steps.length ? steps : ["通过熟悉的联系方式，确认本人及具体请求。"]).map((step) => `<li>${e(step)}</li>`).join("")}</ul></section><div class="result-actions"><button id="reportContacts" class="primary">联系家人 ${icon("phone")}</button><button id="exportReport" class="secondary">下载记录</button><button id="printReport" class="secondary">打印报告</button><button id="anotherCheck" class="text-button">再核验一份 ${icon("arrow")}</button></div><details class="surface report-details"><summary>完整记录</summary><pre class="raw-report">${e(JSON.stringify(report, null, 2))}</pre></details>`;
    $("#reportContacts").onclick = () => go("contacts");
    $("#anotherCheck").onclick = () => {
      clearFile();
      fileError = "";
      go("check");
    };
    $("#printReport").onclick = () => {
      feedback.cue($("#printReport"), { kind: "press" });
      window.print();
    };
    $("#exportReport").onclick = () => {
      feedback.cue($("#exportReport"), { kind: "press" });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `qinan-${report.id}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("记录文件已生成，下载已开始。");
    };
  }

  function helpModal() {
    if (destroyed) return;
    openModal(guideMarkup());
    guide = mountUsageGuide($("#modalBody"), {
      islands,
      animate,
      motionEnabled,
      onStart(kind: string) {
        if (
          Object.prototype.hasOwnProperty.call(fileTypes, kind) &&
          kind !== type
        ) {
          type = kind as MaterialKind;
          clearFile();
          fileError = "";
        }
        closeModal();
        go("check");
      },
      onClose: closeModal,
    });
  }
  function settingsModal() {
    if (destroyed) return;
    openModal(
      `<span class="modal-eyebrow">PREFERENCES</span><h2 id="modalTitle">使用偏好</h2><div class="toggle-row"><span>动态效果</span><button id="toggleMotion" class="secondary">${mediaQuery.matches ? "系统已减少动态" : paused ? "恢复动效" : "暂停动效"}</button></div><p>联系人保存在当前浏览器，可在“联系家人”中管理。</p><div class="modal-actions"><button id="manageContacts" class="secondary">管理联系人</button><button id="settingsDone" class="primary">完成 ${icon("check")}</button></div>`,
    );
    $("#toggleMotion").onclick = () => {
      toggleMotion();
      settingsModal();
    };
    $("#manageContacts").onclick = () => {
      closeModal();
      go("contacts");
    };
    $("#settingsDone").onclick = closeModal;
  }

  function pauseAmbient() {
    homeMotion.finish?.();
    $$(".portal-node").forEach((node) => {
      utils.remove(node, undefined, "rotateX");
      utils.remove(node, undefined, "rotateY");
    });
  }
  function syncMotion() {
    document.body.classList.toggle("motion-off", paused || mediaQuery.matches);
    homeMotion.setPaused?.(!motionEnabled());
    portalMotion.setPaused?.(!motionEnabled());
    feedback.setPaused(!motionEnabled() || printing);
    entry.setPaused(!motionEnabled());
    guide?.setPaused(!motionEnabled());
    const motionOff = !motionEnabled(),
      motionLabel = mediaQuery.matches
        ? "系统已减少动态"
        : motionOff
          ? "恢复动效"
          : "暂停动效";
    $("#motionButton").innerHTML =
      icon(motionOff ? "play" : "pause") +
      `<span class="motion-button-label">${motionLabel}</span>`;
    $("#motionButton").setAttribute(
      "aria-label",
      mediaQuery.matches
        ? "系统已减少动态效果"
        : motionOff
          ? "恢复动态效果"
          : "暂停动态效果",
    );
    $("#motionButton").dataset.paused = String(motionOff);
    $("#motionState").textContent = motionOff ? "MOTION OFF" : "MOTION ON";
    updateMaterialTabs();
    updateUploadIsland();
    statusIsland?.update(taskStatusProps());
    practiceCounter?.update(counterProps());
    practiceFaq?.update({ paused: !motionEnabled() });
    if (!motionEnabled()) {
      settleModal();
      finishQuestionSwap();
      finishFeedback();
      pauseAmbient();
      finishQuizExit();
      visual.pause();
      transitions.complete();
    } else {
      visual.resume();
      visual.focus(page !== "home" || transitions.state !== "closed");
    }
  }
  function toggleMotion() {
    if (destroyed) return;
    paused = mediaQuery.matches ? false : !paused;
    setStored("qinan-motion-paused", String(paused));
    syncMotion();
  }
  const motionChange = () => {
    syncMotion();
  };
  mediaQuery.addEventListener("change", motionChange);
  bindClick($("#startCheck"), () => go("check"));
  bindClick($("#settings"), settingsModal);
  bindClick($("#helpButton"), helpModal);
  bindClick($("#howItWorks"), helpModal);
  bindClick($("#motionButton"), () => {
    toggleMotion();
    toast(
      mediaQuery.matches
        ? "系统已启用减少动态效果；请在系统设置中恢复。"
        : paused
          ? "动态效果已暂停。"
          : "动态效果已恢复。",
    );
  });
  bindClick($<HTMLButtonElement>("#scatterButton"), async () => {
    const button = $<HTMLButtonElement>("#scatterButton");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const form = await visual.toggleForm();
      if (destroyed) return;
      button.querySelectorAll("span")[1].textContent =
        form === "slogan" ? "合拢安印" : "展开安心宣言";
    } finally {
      if (!destroyed) {
        button.disabled = false;
        button.setAttribute("aria-busy", "false");
      }
    }
  });

  function setupPortalMotion() {
    $$(".portal-node").forEach((node) => {
      const move = (ev: PointerEvent) => {
        if (
          !motionEnabled() ||
          page !== "home" ||
          transitions.state !== "closed" ||
          innerWidth < 700
        )
          return;
        visual.setPortalFocus?.({
          portalId: node.dataset.portal,
          x: (ev.clientX / innerWidth) * 2 - 1,
          y: 1 - (ev.clientY / window.innerHeight) * 2,
        });
        const rect = node.getBoundingClientRect(),
          x = (ev.clientX - rect.left) / rect.width,
          y = (ev.clientY - rect.top) / rect.height;
        node.style.setProperty("--px", `${x * 100}%`);
        node.style.setProperty("--py", `${y * 100}%`);
        utils.remove(node, undefined, "rotateX");
        utils.remove(node, undefined, "rotateY");
        animate(node, {
          rotateX: (0.5 - y) * 5,
          rotateY: (x - 0.5) * 6,
          duration: 350,
          ease: "outQuad",
        });
      };
      const leave = () => {
        visual.setPortalFocus?.(null);
        if (
          !motionEnabled() ||
          page !== "home" ||
          transitions.state !== "closed"
        )
          return;
        utils.remove(node, undefined, "rotateX");
        utils.remove(node, undefined, "rotateY");
        animate(node, {
          rotateX: 0,
          rotateY: 0,
          duration: 600,
          ease: createSpring({ stiffness: 130, damping: 18 }),
        });
      };
      const focus = () => {
        if (
          !motionEnabled() ||
          page !== "home" ||
          transitions.state !== "closed"
        )
          return;
        const rect = node.getBoundingClientRect();
        visual.setPortalFocus?.({
          portalId: node.dataset.portal,
          x: ((rect.left + rect.width / 2) / innerWidth) * 2 - 1,
          y: 1 - ((rect.top + rect.height / 2) / window.innerHeight) * 2,
        });
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerleave", leave);
      node.addEventListener("focus", focus);
      node.addEventListener("blur", leave);
      pointerDisposers.push(() => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerleave", leave);
        node.removeEventListener("focus", focus);
        node.removeEventListener("blur", leave);
      });
    });
  }
  syncMotion();
  updateHistoryHint();
  const beginInterface = () => {
    if (destroyed) return;
    startupPending = false;
    setupPortalMotion();
    syncMotion();
    route();
    portalMotion.setReady?.(true);
  };
  if (startReady)
    Promise.resolve(startReady).then(beginInterface, beginInterface);
  else beginInterface();
  const detailsFeedback = (event: Event) => {
    const details = event.target;
    if (
      !(details instanceof window.HTMLDetailsElement) ||
      !details.matches?.(".report-details,.module-details")
    )
      return;
    feedback.settle(details);
    if (details.open && details.isConnected && page === "report" && !printing)
      [...details.children]
        .filter((child) => child.tagName !== "SUMMARY")
        .slice(0, 6)
        .forEach((node) => {
          if (node instanceof window.HTMLElement)
            feedback.cue(node, { kind: "change" });
        });
  };
  body.addEventListener("toggle", detailsFeedback, true);
  const onPrint = () => {
    printing = true;
    feedback.setPaused(true);
    $$<HTMLDetailsElement>(".report-details,.module-details").forEach(
      (details) => {
        details.dataset.wasOpen = String(details.open);
        details.open = true;
      },
    );
  };
  const afterPrint = () => {
    $$<HTMLDetailsElement>(".report-details,.module-details").forEach(
      (details) => {
        details.open = details.dataset.wasOpen === "true";
      },
    );
    printing = false;
    feedback.setPaused(!motionEnabled());
  };
  window.addEventListener("beforeprint", onPrint);
  window.addEventListener("afterprint", afterPrint);
  return {
    refreshIslands() {
      if (destroyed || startupPending) return;
      guide?.refreshIslands();
      if (entry.pending) {
        entry.refreshIslands();
        return;
      }
      if (page === "check") {
        if (activeTask) renderProcessing();
        else if (!pickerPending) {
          syncType();
          renderFile();
        }
      } else if (page === "practice") refreshPracticeIslands();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      lifecycle.abort();
      persistentHandlers.forEach((node) => {
        node.onclick = null;
      });
      for (const node of [
        ...body.querySelectorAll<HTMLElement>("*"),
        ...$("#modalBody").querySelectorAll<HTMLElement>("*"),
      ]) {
        node.onclick = null;
        node.onkeydown = null;
        node.onsubmit = null;
        node.onchange = null;
      }
      const sculpture = $<HTMLButtonElement>("#scatterButton");
      sculpture.disabled = false;
      sculpture.setAttribute("aria-busy", "false");
      clearTimeout(streamTimer);
      tasks.destroy();
      feedback.destroy();
      portalMotion.destroy?.();
      body.removeEventListener("toggle", detailsFeedback, true);
      entry.destroy();
      guide?.destroy();
      guide = null;
      settleModal();
      if (modal.open) modal.close();
      modal.removeEventListener("cancel", cancelModal);
      document.removeEventListener("visibilitychange", modalVisibility);
      exteriorDismiss.destroy();
      transitions.destroy();
      disposeQuizLayout();
      disposeIslands();
      disposePracticeDock();
      activeTask = null;
      viewController?.abort();
      api.destroy();
      homeMotion.destroy?.();
      clearFile();
      clearTimeout(toastTimer);
      utils.remove(document.querySelectorAll("*"));
      pointerDisposers.forEach((fn) => fn());
      window.removeEventListener("hashchange", route);
      window.removeEventListener("focus", pickerFocusReturn);
      fileInput.onchange = null;
      fileInput.removeEventListener("cancel", cancelPicker);
      window.removeEventListener("beforeprint", onPrint);
      window.removeEventListener("afterprint", afterPrint);
      mediaQuery.removeEventListener("change", motionChange);
      visual.dispose();
      if (body.contains($("#toast")) || modal.contains($("#toast")))
        document.body.append($("#toast"));
      body.replaceChildren();
      $("#modalBody").replaceChildren();
    },
  };
}
