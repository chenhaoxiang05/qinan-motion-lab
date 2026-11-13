import React, { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MotionConfig } from 'motion/react';
import Folder from './rare-ui/folder-component';
import GridReveal from './rare-ui/grid-reveal';
import AiStatus from './rare-ui/ai-status';
import AnimatedCounter from './rare-ui/animated-counter';
import Faq from './rare-ui/faq';
import { GooeyNav } from './rare-ui/gooey-nav';
import { UploadCopy, UploadPulse } from './rare-ui/upload-feedback';
import { MotionPausedContext } from './rare-ui/motion-settings';
import { paths } from './icons';
import './rare-ui/utilities.css';
import './rare-ui/islands.css';

export type MaterialKind = 'audio' | 'video' | 'image' | 'chat';
export interface IslandController<P> { update(next?: Partial<P>): void; destroy(): void; }
export interface UploadProps {
  file?: Pick<File, 'name' | 'size'> | null; url?: string | null; kind?: MaterialKind;
  open?: boolean; hovered?: boolean; paused?: boolean; disabled?: boolean; validating?: boolean;
  label?: string; hint?: string; detail?: string;
  onChoose?: () => void; onRemove?: () => void; onPreviewError?: () => void;
}
export interface StatusProps { state?: string; label?: string; detail?: string; paused?: boolean; decorative?: boolean; }
export interface CounterProps { value?: number; paused?: boolean; label?: string; suffix?: string; }
export interface FaqProps {
  items?: Array<{ id: string; question: string; answer: string }>;
  value?: string | null; onValueChange?: (value: string | null) => void; paused?: boolean; accent?: string;
}
export interface MaterialTabsProps { value?: MaterialKind; disabled?: boolean; paused?: boolean; onChange?: (value: MaterialKind) => void; }

const TYPE_LABELS: Record<MaterialKind, string> = { audio: '音频', video: '视频', image: '照片', chat: '聊天截图' };
const formatSize = (size = 0) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

function MotionBoundary({ paused, children }: { paused?: boolean; children: ReactNode }) {
  return <MotionPausedContext.Provider value={!!paused}>
    <MotionConfig reducedMotion={paused ? 'always' : 'user'}>{children}</MotionConfig>
  </MotionPausedContext.Provider>;
}

function ImagePreview({ url, name, onError }: { url: string; name: string; onError?: () => void }) {
  const [fallback, setFallback] = useState(false);
  // Grid Reveal retains its own decode lifecycle and stops drawing when settled.
  // Browsers without canvas still get a useful native image preview.
  return fallback
    ? <img className="qi-native-image" src={url} alt={`已选择：${name}`} onError={onError} />
    : <GridReveal src={url} alt={`已选择：${name}`} aspect={1.5} progress={1} onError={() => setFallback(true)} className="qi-image-grid" />;
}

function UploadIsland({ file, url, kind = 'image', open = false, hovered, paused, disabled, validating, label, hint, detail, onChoose, onRemove, onPreviewError }: UploadProps) {
  const [pointerHover, setPointerHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFile = useRef(!!file);
  const removedFile = previousFile.current && !file;
  useLayoutEffect(() => { previousFile.current = !!file; }, [file]);
  const hovering = !disabled && !!(hovered ?? (pointerHover || focused));
  const choose = (event: React.MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); if (!disabled) onChoose?.(); };
  return <MotionBoundary paused={paused}>
    <div className={`qi-upload${file ? ' qi-upload-selected' : ''}`} data-open={open || undefined} data-paused={paused || undefined} aria-busy={!!validating}>
      <div className="qi-folder-region">
        <span className="qi-upload-marker" aria-hidden="true">{file ? '02 / MATERIAL READY' : '01 / DROP MATERIAL'}</span>
        <button ref={triggerRef} type="button" data-upload-action="choose" className="qi-folder-trigger" disabled={disabled}
          aria-label={file ? `替换${TYPE_LABELS[kind] || '文件'}` : `选择${TYPE_LABELS[kind] || '文件'}`}
          onClick={choose}
          onMouseEnter={() => setPointerHover(true)} onMouseLeave={() => setPointerHover(false)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          <span className="qi-folder-stage" aria-hidden="true"><UploadPulse revision={kind} className="qi-folder-pulse"><Folder size="sm" color="black" open={!!open} hovered={hovering} /></UploadPulse></span>
          <span className="qi-upload-title"><UploadCopy text={file ? '替换文件' : label ? `选择${label}` : '放入一份待核实的材料'} /><span className="qi-upload-arrow" aria-hidden="true"> ↗</span></span>
          <UploadCopy className="qi-upload-hint" text={file ? '重新选择，或拖入新文件' : hint || '拖入这里，或点击打开文件夹'} />
        </button>
      </div>
      {file ? <UploadPulse as="div" className="qi-selected-file" variant="preview" appear revision={`${kind}:${url || file.name}`}>
        <div className="qi-file-heading"><span className="qi-file-type">{TYPE_LABELS[kind] || '文件'} / {formatSize(file.size)}</span><span className="qi-file-indicator" aria-hidden="true" /></div>
        <strong className="qi-file-name" title={file.name}>{file.name}</strong>
        <div className="qi-media-preview" onClick={event => event.stopPropagation()}>
          {url && (kind === 'image' || kind === 'chat') && <ImagePreview key={url} url={url} name={file.name} onError={onPreviewError} />}
          {url && kind === 'audio' && <audio key={url} src={url} controls preload="metadata" aria-label="音频预览" />}
          {url && kind === 'video' && <video key={url} src={url} controls preload="metadata" playsInline aria-label="视频预览" />}
        </div>
        <div className="qi-file-footer">
          <UploadCopy text={validating ? '正在检查文件…' : detail || '已就绪，可开始核验'} />
          <button type="button" data-upload-action="remove" disabled={disabled} onClick={event => { event.stopPropagation(); onRemove?.(); triggerRef.current?.focus({ preventScroll: true }); }}>移除 <span aria-hidden="true">×</span></button>
        </div>
      </UploadPulse> : <UploadPulse as="div" className="qi-upload-capabilities" variant="preview" appear={removedFile} revision="empty"><span>本地预览</span><span>单份材料</span><span><UploadCopy text={detail || '拖拽即可'} /></span></UploadPulse>}
    </div>
  </MotionBoundary>;
}

function StatusIsland({ state = 'thinking', label, detail, paused, decorative }: StatusProps) {
  const aliases: Record<string, string> = { loading: 'analyzing', success: 'done' };
  const mapped = aliases[state] || state;
  return <MotionBoundary paused={paused}><div className="qi-status" aria-hidden={decorative || undefined}>
    <AiStatus state={mapped} label={label} detail={detail} timer={false} shimmer={!paused && !['done', 'error'].includes(mapped)} />
  </div></MotionBoundary>;
}

function CounterIsland({ value = 0, paused, label = '', suffix = '' }: CounterProps) {
  const score = Number.isFinite(value) ? value : 0;
  const caption = String(label ?? '');
  const ending = String(suffix ?? '');
  return <MotionBoundary paused={paused}>
    <span className="qi-counter" data-value={score} data-paused={paused || undefined}>
      <span className="qi-counter-readable">{caption ? `${caption} ` : ''}{score}{ending}</span>
      <span className="qi-counter-visual" aria-hidden="true">
        {caption && <span className="qi-counter-label">{caption}</span>}
        <AnimatedCounter value={score} duration={0.42} separator="" className="qi-counter-number" />
        {ending && <span className="qi-counter-suffix">{ending}</span>}
      </span>
    </span>
  </MotionBoundary>;
}

function FaqIsland({ items = [], value, onValueChange, paused, accent = '#c2ff00' }: FaqProps) {
  // The vanilla adapter accepts text, never HTML or React nodes from question data.
  const entries = items.map(item => ({
    id: String(item.id),
    question: String(item.question ?? ''),
    answer: String(item.answer ?? ''),
  }));
  return <MotionBoundary paused={paused}>
    <div className="qi-faq" data-paused={paused || undefined}>
      <Faq items={entries} value={value} onValueChange={onValueChange} accent={accent} avatar={null} />
    </div>
  </MotionBoundary>;
}

const MATERIAL_KINDS: MaterialKind[] = ['audio', 'video', 'image', 'chat'];
const MATERIAL_ITEMS = MATERIAL_KINDS.map(id => ({
  id, label: id === 'audio' ? '声音' : TYPE_LABELS[id],
  icon: <svg className="qinan-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[id === 'audio' ? 'sound' : id]} /></svg>,
}));

function MaterialTabsIsland({ value = 'audio', disabled = false, paused, onChange }: MaterialTabsProps) {
  const index = MATERIAL_KINDS.indexOf(value);
  return <MotionBoundary paused={paused}>
    <GooeyNav items={MATERIAL_ITEMS} value={index < 0 ? 0 : index} disabled={!!disabled}
      onChange={next => onChange?.(MATERIAL_KINDS[next])} />
  </MotionBoundary>;
}


type RecoveryProps = { retry: () => void; children: ReactNode };
function Recovery({ retry, children }: RecoveryProps) {
  return <div className="qi-island-recovery">
    <p role="alert">动态组件暂时不可用，仍可继续操作。</p>
    {children}
    <button type="button" className="secondary" data-island-retry onClick={retry}>重新加载动效</button>
  </div>;
}

type BoundaryProps = { children: ReactNode; fallback: (retry: () => void) => ReactNode; onFailed: () => void; onRetry: () => void; onRecovered: () => void };
class IslandBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailed(); }
  componentDidUpdate(_previousProps: BoundaryProps, previousState: { failed: boolean }) { if (previousState.failed && !this.state.failed) this.props.onRecovered(); }
  retry = () => { this.props.onRetry(); this.setState({ failed: false }); };
  render() { return this.state.failed ? this.props.fallback(this.retry) : this.props.children; }
}

function UploadFallback(props: UploadProps, retry: () => void) {
  const { file, url, kind = 'image', disabled, validating, onChoose, onRemove, onPreviewError } = props;
  return <Recovery retry={retry}>
    <p>{props.label || TYPE_LABELS[kind]} · {props.hint || '拖入文件，或点击选择'}</p>
    <button type="button" className="primary" data-upload-action="choose" disabled={disabled} onClick={event => { event.stopPropagation(); onChoose?.(); }}>{file ? '更换材料' : '选择文件'}</button>
    {file && <div className="qi-fallback-file">
      <strong>{file.name}</strong><p>{formatSize(file.size)}</p>
      {url && kind === 'audio' && <audio src={url} controls preload="metadata" aria-label="音频预览" />}
      {url && kind === 'video' && <video src={url} controls preload="metadata" playsInline aria-label="视频预览" />}
      {url && (kind === 'image' || kind === 'chat') && <img src={url} alt={`已选择：${file.name}`} onError={onPreviewError} />}
      <button type="button" className="secondary" data-upload-action="remove" disabled={disabled} onClick={event => {
        event.stopPropagation(); const host = event.currentTarget.closest('.rare-island'); onRemove?.(); host?.querySelector<HTMLButtonElement>('[data-upload-action="choose"]')?.focus({ preventScroll: true });
      }}>移除材料</button>
    </div>}
    <p role="status">{validating ? '正在检查文件…' : props.detail || '选择后可继续核验'}</p>
  </Recovery>;
}

function MaterialTabsFallback(props: MaterialTabsProps, retry: () => void) {
  const value = props.value || 'audio';
  return <Recovery retry={retry}><div className="qi-material-tabs qi-material-fallback" role="tablist" aria-label="选择材料类型">
    {MATERIAL_KINDS.map(kind => <button key={kind} className="type-tab" id={`type-${kind}`} type="button" role="tab" data-type={kind}
      aria-controls="uploadPanel" aria-selected={value === kind} tabIndex={value === kind ? 0 : -1} disabled={props.disabled}
      onClick={() => props.onChange?.(kind)} onKeyDown={event => {
        const index = MATERIAL_KINDS.indexOf(kind);
        const next = event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : -1;
        if (next < 0) return; event.preventDefault(); props.onChange?.(MATERIAL_KINDS[next]);
        event.currentTarget.closest('[role="tablist"]')?.querySelector<HTMLButtonElement>(`#type-${MATERIAL_KINDS[next]}`)?.focus();
      }}>{kind === 'audio' ? '声音' : TYPE_LABELS[kind]}</button>)}
  </div></Recovery>;
}

function NativeFaq({ items = [], value, onValueChange, retry }: FaqProps & { retry: () => void }) {
  const [localValue, setLocalValue] = useState<string | null>(null);
  const current = value === undefined ? localValue : value;
  return <Recovery retry={retry}><div className="qi-faq-fallback">{items.map(item => <div key={item.id}>
    <button type="button" className="secondary" aria-expanded={current === item.id} onClick={() => { const next = current === item.id ? null : item.id; setLocalValue(next); onValueChange?.(next); }}>{item.question}</button>
    {current === item.id && <p>{item.answer}</p>}
  </div>)}</div></Recovery>;
}

/** Owns only host descendants. Call destroy BEFORE replacing/removing host markup. */
function mountIsland<P extends object>(host: HTMLElement, Component: ComponentType<P>, initialProps: P,
  fallback: (props: P, retry: () => void) => ReactNode,
  mapProps?: (props: P, update: (next: Partial<P>) => void, current: () => P | null) => P,
  upload = false): IslandController<P> {
  let props = { ...initialProps };
  let destroyed = false;
  const previousState = host.getAttribute('data-island-state');
  const previousTabIndex = host.getAttribute('tabindex');
  let hostFocusAdded = false;
  const root = createRoot(host, { onCaughtError() { /* The boundary renders a recoverable local fallback. */ } });
  host.classList.add('rare-island', 'dark');
  host.dataset.islandState = 'ready';
  if (upload) host.classList.add('qi-upload-host');
  const current = () => destroyed ? null : props;
  const update = (next: Partial<P> = {}) => { if (!destroyed) { props = { ...props, ...next }; paint(); } };
  const paint = () => {
    if (destroyed) return;
    const guarded = mapProps ? mapProps(props, update, current) : props;
    flushSync(() => root.render(<IslandBoundary
      onFailed={() => { if (!destroyed) host.dataset.islandState = 'fallback'; }}
      onRetry={() => { if (!destroyed) host.dataset.islandState = 'ready'; }}
      onRecovered={() => {
        if (destroyed) return;
        const target = [...host.querySelectorAll<HTMLElement>('button:not(:disabled), [role="status"]')].find(node => !node.closest('[aria-hidden="true"]'));
        if (target && target.tagName !== 'BUTTON') target.tabIndex = -1;
        if (target) target.focus({ preventScroll: true });
        else { hostFocusAdded = true; host.tabIndex = -1; host.focus({ preventScroll: true }); }
      }}
      fallback={retry => fallback(guarded, retry)}><Component {...guarded} /></IslandBoundary>));
  };
  try { paint(); }
  catch (error) {
    destroyed = true; root.unmount(); host.classList.remove('rare-island', 'dark', 'qi-upload-host');
    if (previousState === null) host.removeAttribute('data-island-state'); else host.setAttribute('data-island-state', previousState);
    throw error;
  }
  return {
    update,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      flushSync(() => root.unmount());
      host.classList.remove('rare-island', 'dark', 'qi-upload-host');
      if (previousState === null) host.removeAttribute('data-island-state'); else host.setAttribute('data-island-state', previousState);
      if (hostFocusAdded) { if (previousTabIndex === null) host.removeAttribute('tabindex'); else host.setAttribute('tabindex', previousTabIndex); }
    },
  };
}

export function mountUpload(host: HTMLElement, props: UploadProps = {}): IslandController<UploadProps> {
  return mountIsland(host, UploadIsland, props, UploadFallback, (currentProps, update, current) => {
    const currentUrl = currentProps.url;
    return { ...currentProps,
      onPreviewError() { const latest = current(); if (latest?.url === currentUrl) latest?.onPreviewError?.(); },
      onChoose() {
        const latest = current(); if (!latest || latest.disabled) return;
        // Commit phase two inside the same trusted click before native picker activation.
        update({ open: true }); current()?.onChoose?.();
      },
    };
  }, true);
}
export function mountStatus(host: HTMLElement, props: StatusProps = {}): IslandController<StatusProps> {
  return mountIsland(host, StatusIsland, props, (value, retry) => <Recovery retry={retry}><p role={value.decorative ? undefined : 'status'} aria-hidden={value.decorative || undefined}>{value.label || '正在处理材料…'}</p><p aria-hidden={value.decorative || undefined}>{value.detail}</p></Recovery>);
}
export function mountCounter(host: HTMLElement, props: CounterProps = {}): IslandController<CounterProps> {
  return mountIsland(host, CounterIsland, props, (value, retry) => <Recovery retry={retry}><span role="status">{value.label} {Number.isFinite(value.value) ? value.value : 0}{value.suffix}</span></Recovery>);
}
export function mountFaq(host: HTMLElement, props: FaqProps = {}): IslandController<FaqProps> {
  return mountIsland(host, FaqIsland, props, (value, retry) => <NativeFaq {...value} retry={retry} />);
}

export function mountMaterialTabs(host: HTMLElement, props: MaterialTabsProps = {}): IslandController<MaterialTabsProps> {
  const saved = ['role', 'aria-label', 'aria-orientation'].map(name => [name, host.getAttribute(name)] as const);
  const restore = () => saved.forEach(([name, value]) => value === null ? host.removeAttribute(name) : host.setAttribute(name, value));
  saved.forEach(([name]) => host.removeAttribute(name));
  host.classList.add('qi-material-tabs-host');
  let island: IslandController<MaterialTabsProps>;
  try { island = mountIsland(host, MaterialTabsIsland, props, MaterialTabsFallback); }
  catch (error) { host.classList.remove('qi-material-tabs-host'); restore(); throw error; }
  let destroyed = false;
  return {
    update: next => island.update(next),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      island.destroy();
      host.classList.remove('qi-material-tabs-host');
      restore();
    },
  };
}

export interface IslandAdapters {
  mountUpload?: typeof mountUpload; mountStatus?: typeof mountStatus; mountCounter?: typeof mountCounter;
  mountFaq?: typeof mountFaq; mountMaterialTabs?: typeof mountMaterialTabs;
}
