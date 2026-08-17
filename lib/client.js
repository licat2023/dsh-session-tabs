/**
 * dsh-session-tabs — DEPLOYMENT client bundle (dsh.client web plugin).
 *
 * Loaded automatically on every page load through the web profile's module
 * system (window.__ModuleLoader__.load handshake), so no manual activation is
 * needed after a refresh — unlike the dynamic-plugin variant.
 *
 * Layout contract: the tab bar is position:fixed at the top and starts at the
 * SIDEBAR's right edge (measured live, so dragging the sidebar or collapsing
 * it to the 56px rail repositions the bar). Only the center column is pushed
 * down by the bar height; the sidebar column itself is never moved, so its
 * position is never squeezed.
 *
 * Depends only on the current harness's public faces:
 *   - slot "shell.overlay" standard prop useSessions (SessionListState)
 *   - sessions.open(id) / workspaces.startSession()
 * No sessions.clear() (absent in this harness version): closing the last tab
 * only empties the bar, the selected session stays open underneath.
 */

window.__ModuleLoader__.load({
  id: 'dsh-session-tabs',
  factory: (require) => {
    const React = require('react')

    const BAR_HEIGHT = 34
    const PLUGIN_ID = 'dsh-session-tabs'

    const css = `
.dsh-tabs-bar{position:fixed;top:0;right:0;height:${BAR_HEIGHT}px;display:flex;align-items:center;gap:4px;padding:0 10px;box-sizing:border-box;background:var(--dsw-alias-bg-base,#f9fafb);border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));z-index:1000;pointer-events:auto;overflow-x:auto;scrollbar-width:none;font-size:13px;line-height:20px}
.dsh-tabs-bar::-webkit-scrollbar{display:none}
.dsh-tabs-tab{display:inline-flex;align-items:center;gap:6px;height:24px;max-width:200px;padding:0 4px 0 10px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;white-space:nowrap;flex:none;font:inherit;user-select:none}
.dsh-tabs-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#0f1115)}
.dsh-tabs-tab[data-active]{background:var(--dsw-alias-bg-layer-1,#ffffff);color:var(--dsw-alias-label-primary,#0f1115);box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary,#3964fe)}
.dsh-tabs-title{overflow:hidden;text-overflow:ellipsis;min-width:0}
.dsh-tabs-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-warn-primary,#f7ad31)}
.dsh-tabs-dot[data-running]{background:var(--dsw-alias-brand-primary,#3964fe);animation:dsh-tabs-pulse 1.2s ease-in-out infinite}
.dsh-tabs-dot[data-completed]{background:var(--dsw-alias-state-success-primary,#12b76a)}
@keyframes dsh-tabs-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){.dsh-tabs-dot[data-running]{animation:none}}
.dsh-tabs-close{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin:0 -2px 0 2px;padding:0;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary,#81858c);cursor:pointer;flex:none;font-size:12px;line-height:1}
.dsh-tabs-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#0f1115)}
.dsh-tabs-new{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin-left:2px;padding:0;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;flex:none;font-size:16px;line-height:1}
.dsh-tabs-new:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#0f1115)}
/* Collapse the session header into one row: hide the title breadcrumbs and
   place the mode + Session log controls beside the view tabs (对话/轨迹).
   Structural selectors only — the product's CSS-module class names are
   build-hashed and unstable across builds.
   Alignment: the row is bottom-aligned so the tabs' blue underline rests on
   the header's bottom rule; the controls row gets the same 11px bottom
   padding the tabs carry, keeping both text baselines on one line. */
header:has(> div[role='tablist']){display:flex;flex-direction:row;align-items:flex-end;gap:24px;padding:8px 28px 0 20px}
header:has(> div[role='tablist']) nav{display:none}
header:has(> div[role='tablist']) > div[role='tablist']{order:1;flex:none;margin:0;padding:0;gap:24px}
header:has(> div[role='tablist']) > div:first-child{order:2;display:flex;flex:none;align-items:flex-end;gap:20px;min-height:0;margin-left:auto;padding-bottom:11px}
header:has(> div[role='tablist']) > div:first-child > div:first-child{flex:none;align-items:flex-end}
header:has(> div[role='tablist']) > div:first-child > div:last-child{align-items:flex-end;margin-left:0}
/* Style the mode label and the Session log control like the view tabs:
   same 13px/16px type, bottom-aligned to the tab text baseline, and a
   text-only hover that turns the brand blue (same token as 对话's active
   underline color). */
header:has(> div[role='tablist']) > div:first-child span{font-size:13px;line-height:16px}
header:has(> div[role='tablist']) > div:first-child button{min-width:0;height:auto;padding:0;border:none;border-radius:0;background:transparent;font-size:13px;line-height:16px;color:var(--dsw-alias-label-tertiary,#81858c);cursor:pointer;transition:color .15s ease}
header:has(> div[role='tablist']) > div:first-child button:hover{background:transparent;color:var(--dsw-alias-state-business-primary,#679efe)}
`

    // Inject once per page load, guarded by the data attribute (mirrors the
    // community-plugin convention; the tag is page-lifetime, like the module
    // table entry itself).
    if (document.querySelector(`style[data-plugin-css="${PLUGIN_ID}"]`) === null) {
      const style = document.createElement('style')
      style.dataset.plugin = PLUGIN_ID
      style.dataset.pluginCss = PLUGIN_ID
      style.textContent = css
      document.head.appendChild(style)
    }

    function SessionTabs(props) {
      const { useSessions, sessions, workspaces } = props
      const snap = useSessions((s) => ({ current: s.current, byId: s.byId }))
      const current = snap.current
      const byId = snap.byId
      const [order, setOrder] = React.useState(() => (current === undefined ? [] : [current]))

      // Latest-value refs so the document-level middle-click listeners (mounted
      // once) always read current state without re-registering on every render.
      const currentRef = React.useRef(current)
      React.useEffect(() => { currentRef.current = current })
      const orderRef = React.useRef(order)
      React.useEffect(() => { orderRef.current = order })
      const byIdRef = React.useRef(byId)
      React.useEffect(() => { byIdRef.current = byId })

      React.useEffect(() => {
        if (current === undefined) return
        setOrder((prev) => (prev.indexOf(current) >= 0 ? prev : prev.concat([current])))
      }, [current])

      // Measure the sidebar column so the bar starts at its right edge. The
      // sidebar is draggable (264-420px) and collapses to a 56px rail, so the
      // width is read live and followed with a ResizeObserver.
      const [left, setLeft] = React.useState(280)
      React.useEffect(() => {
        if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return
        const overlay = document.querySelector('[data-shell-overlay]')
        if (overlay === null || overlay.parentElement === null) return
        const frame = overlay.parentElement
        if (frame.children.length < 3) return
        const sidebarCol = frame.children[0]
        const centerCol = frame.children[1]
        const measure = () => {
          const w = sidebarCol.getBoundingClientRect().width
          if (w > 0) setLeft(w)
        }
        measure()
        // Reserve the strip on the CENTER column only; the sidebar column keeps
        // its own padding so its position is untouched.
        const prevTop = centerCol.style.paddingTop
        centerCol.style.paddingTop = BAR_HEIGHT + 'px'
        const observer = new ResizeObserver(measure)
        observer.observe(sidebarCol)
        return () => {
          observer.disconnect()
          centerCol.style.paddingTop = prevTop
        }
      }, [])

      const switchTab = (id) => {
        if (sessions !== undefined && id !== currentRef.current) sessions.open(id)
      }

      const closeTab = (id) => {
        const prev = orderRef.current
        const index = prev.indexOf(id)
        const next = prev.filter((x) => x !== id)
        setOrder(next)
        if (id === currentRef.current && sessions !== undefined && next.length > 0) {
          // Activate the tab that took the closed tab's place (its right
          // neighbor), or the new last tab when the closed tab was last.
          sessions.open(next[Math.min(index, next.length - 1)])
        }
      }

      // Middle-click (button 1) handling, mounted once at document level:
      //   - on a tab row: close that tab (like a browser's middle-click close);
      //   - on a sidebar session row: add the session to the tab bar WITHOUT
      //     switching to it (like a browser's background-tab open).
      // The sidebar rows carry no data attributes, so a row is identified by
      // its stable treeitem role (workspace rows also expose aria-expanded,
      // session rows do not) and its title is the first non-empty text span —
      // the row structure is slot -> title -> time -> actions. The title is
      // then resolved back to a session id through the live byId snapshot.
      // The mousedown listener only cancels the browser's middle-click
      // autoscroll; the auxclick listener does the actual work.
      React.useEffect(() => {
        if (typeof document === 'undefined') return
        const sessionRowOf = (el) => {
          const row = el instanceof Element ? el.closest('[role="treeitem"]') : null
          if (row === null) return null
          // Workspace header rows carry aria-expanded; session rows do not.
          if (row.hasAttribute('aria-expanded')) return null
          return row
        }
        const rowTitle = (row) => {
          for (const span of row.querySelectorAll('span')) {
            const text = (span.textContent ?? '').trim()
            if (text !== '') return text
          }
          return null
        }
        const openTabInBackground = (row) => {
          const title = rowTitle(row)
          if (title === null) return
          const byId = byIdRef.current
          for (const id of Object.keys(byId)) {
            const summary = byId[id]
            if (summary === undefined || summary.blank === true) continue
            if (summary.displayTitle !== title) continue
            setOrder((prev) => (prev.indexOf(id) >= 0 ? prev : prev.concat([id])))
            return
          }
        }
        const onMouseDown = (e) => {
          if (e.button !== 1) return
          const target = e.target
          if (typeof target !== 'object' || target === null) return
          if (target instanceof Element
            && (target.closest('.dsh-tabs-tab') !== null || sessionRowOf(target) !== null)) {
            // Cancel the browser's middle-click autoscroll.
            e.preventDefault()
          }
        }
        const onAuxClick = (e) => {
          if (e.button !== 1) return
          const target = e.target
          if (!(target instanceof Element)) return
          const tab = target.closest('.dsh-tabs-tab')
          if (tab !== null) {
            const id = tab.getAttribute('data-id')
            if (id !== null) closeTab(id)
            return
          }
          const row = sessionRowOf(target)
          if (row !== null) openTabInBackground(row)
        }
        document.addEventListener('mousedown', onMouseDown, true)
        document.addEventListener('auxclick', onAuxClick, true)
        return () => {
          document.removeEventListener('mousedown', onMouseDown, true)
          document.removeEventListener('auxclick', onAuxClick, true)
        }
      }, [])

      const newTab = () => {
        if (workspaces !== undefined) workspaces.startSession()
      }

      const children = []
      for (const id of order) {
        const summary = byId[id]
        if (summary === undefined) continue
        const title = summary.displayTitle || id
        let dot = null
        if (summary.running === true) {
          dot = React.createElement('span', { className: 'dsh-tabs-dot', 'data-running': true })
        } else if (summary.pendingInteraction !== undefined) {
          dot = React.createElement('span', { className: 'dsh-tabs-dot', 'data-pending': true })
        } else if (summary.completed === true) {
          dot = React.createElement('span', { className: 'dsh-tabs-dot', 'data-completed': true })
        }
        children.push(React.createElement('div', {
          key: id,
          className: 'dsh-tabs-tab',
          'data-id': id,
          'data-active': id === current ? true : undefined,
          onClick: () => switchTab(id),
          title,
        },
          dot,
          React.createElement('span', { className: 'dsh-tabs-title' }, title),
          React.createElement('button', {
            type: 'button',
            className: 'dsh-tabs-close',
            'aria-label': '关闭标签页',
            onClick: (e) => { e.stopPropagation(); closeTab(id) },
          }, '×'),
        ))
      }
      children.push(React.createElement('button', {
        key: '__new__',
        type: 'button',
        className: 'dsh-tabs-new',
        'aria-label': '新建会话',
        title: '新建会话',
        onClick: newTab,
      }, '+'))

      return React.createElement('div', {
        className: 'dsh-tabs-bar',
        'data-dsh-tabs': true,
        style: { left: left + 'px' },
      }, ...children)
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      ctx.effect(() => slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'session-tabs', order: -50 },
        (props) => React.createElement(SessionTabs, {
          useSessions: props.useSessions,
          sessions: ctx.get('sessions'),
          workspaces: ctx.get('workspaces'),
        }),
      )))
    }

    return { apply }
  },
})