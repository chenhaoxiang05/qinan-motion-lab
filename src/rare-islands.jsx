import React, { useLayoutEffect, useRef, useState } from 'react';
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

const TYPE_LABELS = { audio: '音频', video: '视频', image: '照片', chat: '聊天截图' };
const formatSize = (size = 0) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

function MotionBoundary({ paused, children }) {
  return <MotionPausedContext.Provider value={!!paused}>
    <MotionConfig reducedMotion={paused ? 'always' : 'user'}>{children}</MotionConfig>
  </MotionPausedContext.Provider>;
}

function ImagePreview({ url, name, onError }) {
  const [fallback, setFallback] = useState(false);
  // Grid Reveal retains its own decode lifecycle and stops drawing when settled.
  // Browsers without canvas still get a useful native image preview.
  return fallback
    ? <img className="qi-native-image" src={url} alt={`已选择：${name}`} onError={onError} />
    : <GridReveal src={url} alt={`已选择：${name}`} aspect={1.5} progress={1} onError={() => setFallback(true)} className="qi-image-grid" />;
}

function UploadIsland({ file, url, kind = 'image', open = false, hovered, paused, disabled, validating, label, hint, detail, onChoose, onRemove, onPreviewError }) {
  const [pointerHover, setPointerHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const triggerRef = useRef(null);
  const previousFile = useRef(!!file);
  const removedFile = previousFile.current && !file;
  useLayoutEffect(() => { previousFile.current = !!file; }, [file]);
  const hovering = !disabled && !!(hovered ?? (pointerHover || focused));
  const choose = event => { event.stopPropagation(); if (!disabled) onChoose?.(); };
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

function StatusIsland({ state = 'thinking', label, detail, paused }) {
  const mapped = ({ loading: 'analyzing', success: 'done' })[state] || state;
  return <MotionBoundary paused={paused}><div className="qi-status">
    <AiStatus state={mapped} label={label} detail={detail} timer={false} shimmer={!paused && !['done', 'error'].includes(mapped)} />
  </div></MotionBoundary>;
}

function CounterIsland({ value = 0, paused, label = '', suffix = '' }) {
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

function FaqIsland({ items = [], value, onValueChange, paused, accent = '#c2ff00' }) {
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

const MATERIAL_KINDS = ['audio', 'video', 'image', 'chat'];
const MATERIAL_ITEMS = MATERIAL_KINDS.map(id => ({
  id, label: id === 'audio' ? '声音' : TYPE_LABELS[id],
  icon: <svg className="qinan-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[id === 'audio' ? 'sound' : id]} /></svg>,
}));

function MaterialTabsIsland({ value = 'audio', disabled = false, paused, onChange }) {
  const index = MATERIAL_KINDS.indexOf(value);
  return <MotionBoundary paused={paused}>
    <GooeyNav items={MATERIAL_ITEMS} value={index < 0 ? 0 : index} disabled={!!disabled}
      onChange={next => onChange?.(MATERIAL_KINDS[next])} />
  </MotionBoundary>;
}

/** Owns only host descendants. Call destroy BEFORE replacing/removing host markup. */
function mountIsland(host, Component, initialProps, upload = false) {
  let props = { ...initialProps };
  let destroyed = false;
  const root = createRoot(host);
  host.classList.add('rare-island', 'dark');
  if (upload) host.classList.add('qi-upload-host');
  const paint = () => {
    if (destroyed) return;
    const currentUrl = props.url;
    const guardedProps = { ...props, onPreviewError: () => {
      if (!destroyed && props.url === currentUrl) props.onPreviewError?.();
    } };
    if (upload) guardedProps.onChoose = () => {
      if (destroyed || props.disabled) return;
      // Commit phase two before the browser suspends painting for its picker.
      // onChoose stays in this trusted activation; no promise/frame/timer intervenes.
      props = { ...props, open: true };
      paint();
      props.onChoose?.();
    };
    flushSync(() => root.render(<Component {...guardedProps} />));
  };
  paint();
  return {
    update(next = {}) { if (!destroyed) { props = { ...props, ...next }; paint(); } },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      flushSync(() => root.unmount());
      host.classList.remove('rare-island', 'dark', 'qi-upload-host');
    },
  };
}

export function mountUpload(host, props = {}) { return mountIsland(host, UploadIsland, props, true); }
export function mountStatus(host, props = {}) { return mountIsland(host, StatusIsland, props); }
export function mountCounter(host, props = {}) { return mountIsland(host, CounterIsland, props); }
export function mountFaq(host, props = {}) { return mountIsland(host, FaqIsland, props); }

export function mountMaterialTabs(host, props = {}) {
  // The native fallback owns these on the host; the mounted component has its
  // own single tablist. Restore the original attributes before fallback reuse.
  const saved = ['role', 'aria-label', 'aria-orientation'].map(name => [name, host.getAttribute(name)]);
  const restore = () => saved.forEach(([name, value]) => value === null ? host.removeAttribute(name) : host.setAttribute(name, value));
  saved.forEach(([name]) => host.removeAttribute(name));
  host.classList.add('qi-material-tabs-host');
  let island;
  try { island = mountIsland(host, MaterialTabsIsland, props); }
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
