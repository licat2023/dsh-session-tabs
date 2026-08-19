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
 *   - slot "shell.overlay" standard prop useSessions / useWorkspaces
 *   - sessions.open(id) / sessions.clear() / workspaces.startSession()
 * Closing the last tab clears the selection into the home view; closed tabs
 * keep their sessions alive in the list, so back/forward can still restore
 * them as tabs.
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
   the header's bottom rule; the controls row gets the same bottom padding
   the tabs carry, keeping both text baselines on one line. */
header:has(> div[role='tablist']){display:flex;flex-direction:row;align-items:center;gap:24px;padding:6px 28px 6px 20px}
header:has(> div[role='tablist']) nav{display:none}
header:has(> div[role='tablist']) > div[role='tablist']{order:1;flex:none;margin:0;padding:0;gap:24px}
header:has(> div[role='tablist']) > div[role='tablist'] [role='tab']{padding:0 0 6px}
header:has(> div[role='tablist']) > div:first-child{order:2;display:flex;flex:none;align-items:center;gap:20px;min-height:0;margin-left:auto;padding-bottom:0}
header:has(> div[role='tablist']) > div:first-child > div:first-child{flex:none;align-items:center}
header:has(> div[role='tablist']) > div:first-child > div:last-child{align-items:center;margin-left:0}
/* Style the mode label and the Session log control like the view tabs:
   same 13px/16px type and 500 weight, bottom-aligned to the tab text
   baseline, and a text-only hover that turns the brand blue (same token
   as 对话's active underline color). */
header:has(> div[role='tablist']) > div:first-child span{font-size:13px;line-height:16px;font-weight:500;align-items:flex-end;height:16px;min-height:0}
header:has(> div[role='tablist']) > div:first-child button{min-width:0;height:16px;padding:0;border:none;border-radius:0;background:transparent;font-size:13px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-tertiary,#81858c);cursor:pointer;transition:color .15s ease}
header:has(> div[role='tablist']) > div:first-child button:hover{background:transparent;color:var(--dsw-alias-state-business-primary,#679efe)}
/* Put the background-job indicator (ui-jobs' header.actions slot entry)
   LEFT of the mode label: it renders inside the mode button's
   display:contents wrapper, so both children take part directly in the
   actions row's flex layout and a simple order swap repositions them. */
header:has(> div[role='tablist']) > div:first-child > div:first-child > div > div:first-child > div{order:-1}
header:has(> div[role='tablist']) > div:first-child > div:first-child > div > div:first-child > span{order:1}
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

    // MRU tab order survives component remounts: a slot re-registration
    // (slots.inject reruns on declaration change) rebuilds the React tree,
    // which would reset component state and silently close every inactive
    // tab. Keep the order at factory scope for the page lifetime instead.
    let tabOrder = null

    // Browser-style session navigation history (side-button back/forward),
    // also at factory scope so it survives component remounts:
    //   navStack: SessionId[] visited from the home state onward.
    //   navIndex: current position; -1 = home (no session selected); else
    //             navStack[navIndex] is the selected session.
    //   navPending: true while a back/forward navigation awaits the current
    //             change it triggered, so that change is NOT treated as a
    //             fresh navigation (which would truncate the forward chain).
    //   navHomeTerminal: true once the user has closed every tab (cleared the
    //             selection) from the last entry — the home state is then a
    //             true endpoint: forward becomes a no-op (nothing to restore
    //             from), while back still recovers prior sessions.
    // Invariant: the forward chain is always navStack[navIndex+1 .. end].
    // A fresh open (user click, tab switch, new session) truncates it.
    let navStack = []
    let navIndex = -1
    let navPending = false
    let navHomeTerminal = false

    function SessionTabs(props) {
      const { useSessions, useWorkspaces, sessions, workspaces } = props
      const snap = useSessions((s) => ({ current: s.current, byId: s.byId }))
      const current = snap.current
      const byId = snap.byId
      // The archive set lives on the workspace list projection: an archived
      // session stays in the session list store (so byId keeps it), and only
      // the grouping surfaces hide it. Tabs must hide (and drop) archived
      // sessions too, or their tabs linger forever.
      const archived = useWorkspaces((s) => s.archivedSessionIds)
      const [order, setOrderState] = React.useState(() => {
        if (tabOrder !== null) return tabOrder
        const seed = current === undefined ? [] : [current]
        tabOrder = seed
        return seed
      })

      // Write-through setter: every update mirrors into the factory-scope
      // order so a remount restores the full tab strip.
      const setOrder = (updater) => {
        setOrderState((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater
          tabOrder = next
          return next
        })
      }

      // Latest-value refs so the document-level middle-click listeners (mounted
      // once) always read current state without re-registering on every render.
      const currentRef = React.useRef(current)
      React.useEffect(() => { currentRef.current = current })
      const orderRef = React.useRef(order)
      React.useEffect(() => { orderRef.current = order })
      const byIdRef = React.useRef(byId)
      React.useEffect(() => { byIdRef.current = byId })
      const sessionsRef = React.useRef(sessions)
      React.useEffect(() => { sessionsRef.current = sessions })

      // Back: move one entry back in the history; at the first entry, step to
      // the home state (no session selected); already at an exploratory
      // home is a no-op; at a terminal home (cleared by closing every tab)
      // back recovers the most recently visited session.
      const goBack = () => {
        if (navIndex > 0) {
          navIndex -= 1
          navPending = true
          sessionsRef.current?.open(navStack[navIndex])
          return
        }
        if (navIndex === 0) {
          // Leave the first history entry for the home state. Exploratory:
          // forward should still restore this entry.
          navIndex = -1
          navHomeTerminal = false
          navPending = true
          if (sessionsRef.current !== undefined && typeof sessionsRef.current.clear === 'function') {
            sessionsRef.current.clear()
          }
          return
        }
        // navIndex === -1: at home. If we got here by closing every tab, the
        // forward chain is gone but back can still recover the most recently
        // visited session. An exploratory home has nothing further back.
        if (navHomeTerminal && navStack.length > 0) {
          navIndex = navStack.length - 1
          navHomeTerminal = false
          navPending = true
          sessionsRef.current?.open(navStack[navIndex])
          return
        }
      }

      // Forward: move one entry ahead; no-op when the chain is exhausted
      // or when home was reached by closing every tab (terminal state —
      // there is nothing to "restore to").
      const goForward = () => {
        if (navIndex >= navStack.length - 1) return
        if (navIndex === -1 && navHomeTerminal) return
        navIndex += 1
        navPending = true
        sessionsRef.current?.open(navStack[navIndex])
      }

      // Refs for the side-button listeners (mounted once).
      const goBackRef = React.useRef(goBack)
      React.useEffect(() => { goBackRef.current = goBack })
      const goForwardRef = React.useRef(goForward)
      React.useEffect(() => { goForwardRef.current = goForward })

      // Drop tabs whose session was archived (from this tab, another tab, or
      // a reconnect baseline): archived sessions stay in the session list, so
      // only this membership sweep removes them from the strip. The nav
      // history drops them the same way, and the index clamps.
      React.useEffect(() => {
        const archivedSet = new Set(archived)
        if (archivedSet.size === 0) return
        setOrder((prev) => {
          const next = prev.filter((id) => !archivedSet.has(id))
          return next.length === prev.length ? prev : next
        })
        navStack = navStack.filter((id) => !archivedSet.has(id))
        if (navIndex >= navStack.length) navIndex = navStack.length - 1
      }, [archived])

      // Session-selection history maintenance. A selection change is either
      // our own back/forward step (navPending, keep the chain) or a fresh
      // navigation (open a session from the sidebar/tab/new-session, or step
      // to the home state): fresh navigations truncate the forward chain.
      React.useEffect(() => {
        if (navPending) {
          navPending = false
          return
        }
        if (current === undefined) {
          // No session selected: the home state, unless the history already
          // points there (e.g. a plain render with no selection at all).
          if (navIndex !== -1) navIndex = -1
          return
        }
        // Truncate the forward chain first: every session beyond the current
        // position is invalidated by this fresh navigation.
        navStack = navStack.slice(0, navIndex + 1)
        // Idempotence guard: repeated selection events for the session
        // already sitting at the current position add nothing. A real switch
        // — including close-active-tab-to-neighbor, where the closed tab
        // still occupies its own history position and the neighbor lands on
        // a different entry — falls through and is appended below.
        if (navStack[navIndex] === current) return
        // Fresh navigation (or the first selection): append.
        navStack = navStack.concat([current])
        navIndex = navStack.length - 1
      }, [current])

      // Track the current session in the tab bar (MRU), separate from the
      // nav history.
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
        // The nav history is a log of activations, not a picture of the tab
        // strip: closing a tab only removes its entry from the bar. The
        // session stays alive in the list, so back/forward can still land on
        // this entry and restore it as a tab (the home-recovery path below
        // relies on the same property).
        if (id !== currentRef.current || sessions === undefined) return
        // Closing the ACTIVE tab is a plain tab switch to the right neighbor
        // (or the leftmost survivor when the closed tab was rightmost). It
        // flows through the normal selection-change path, so the current
        // effect records it exactly like a click: forward chain truncated,
        // neighbor appended.
        if (next.length > 0) {
          sessions.open(next[Math.max(0, Math.min(index, next.length - 1))])
          return
        }
        // Closing the LAST tab switches to the home state (no session
        // selected). The home state lives outside the history at navIndex
        // -1 and is a terminal endpoint: forward has nothing to restore to,
        // while back still recovers the most recently visited session.
        if (typeof sessions.clear === 'function') {
          navIndex = -1
          navHomeTerminal = true
          navPending = true
          sessions.clear()
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
          // Side buttons (3 back, 4 forward) must not trigger the browser's
          // built-in history navigation; this plugin owns them. Chrome fires
          // the default navigation on mousedown, so preventDefault here is
          // the decisive interception — NOT on pointerdown, whose
          // preventDefault would cancel the compatibility mouse events and
          // starve the auxclick handler below.
          if (e.button === 3 || e.button === 4) {
            e.preventDefault()
            return
          }
          if (e.button !== 1) return
          const target = e.target
          if (typeof target !== 'object' || target === null) return
          if (target instanceof Element
            && (target.closest('.dsh-tabs-tab') !== null || sessionRowOf(target) !== null)) {
            // Cancel the browser's middle-click autoscroll.
            e.preventDefault()
          }
        }
        // Some engines defer the side-button default navigation to mouseup;
        // preventDefault there too so nothing reaches history.back/forward.
        const onMouseUp = (e) => {
          if (e.button === 3 || e.button === 4) e.preventDefault()
        }
        const onAuxClick = (e) => {
          // Side buttons: browser-style history navigation. The default
          // (history navigation) is prevented here as the final line of
          // defense across engines; the real work happens after it.
          if (e.button === 3) {
            e.preventDefault()
            goBackRef.current()
            return
          }
          if (e.button === 4) {
            e.preventDefault()
            goForwardRef.current()
            return
          }
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
        document.addEventListener('mouseup', onMouseUp, true)
        document.addEventListener('auxclick', onAuxClick, true)
        return () => {
          document.removeEventListener('mousedown', onMouseDown, true)
          document.removeEventListener('mouseup', onMouseUp, true)
          document.removeEventListener('auxclick', onAuxClick, true)
        }
      }, [])

      // Keep the ui-jobs popover inside the viewport. The product anchors it
      // at the trigger's left edge with only a vertical height cap, so on
      // narrow windows its right edge runs past the viewport (and the height
      // cap's 140px header allowance is coarser than the actual header).
      // Watch the whole body subtree for the menu opening, closing, or
      // growing, then shift it left and/or cap its height so it always fits.
      React.useEffect(() => {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
        const PAD = 8
        const jobsHostSel = "header:has(> div[role='tablist']) > div:first-child > div:first-child > div > div:first-child > div"
        const clamp = () => {
          const host = document.querySelector(jobsHostSel)
          const menu = host === null ? null : host.querySelector(':scope > ul')
          if (menu === null) {
            // Menu closed or host gone: leave the product's own positioning
            // intact for the next open.
            return
          }
          // Reset to the product baseline before measuring so repeated
          // clamps never accumulate an offset.
          menu.style.left = ''
          menu.style.maxHeight = ''
          const rect = menu.getBoundingClientRect()
          const vw = document.documentElement.clientWidth
          const vh = document.documentElement.clientHeight
          const overflowRight = rect.right - (vw - PAD)
          if (overflowRight > 0) menu.style.left = `-${overflowRight}px`
          const maxHeight = vh - rect.top - PAD
          if (rect.height > maxHeight) menu.style.maxHeight = `${maxHeight}px`
        }
        const observer = new MutationObserver(clamp)
        observer.observe(document.body, { childList: true, subtree: true })
        window.addEventListener('resize', clamp)
        return () => {
          observer.disconnect()
          window.removeEventListener('resize', clamp)
        }
      }, [])

      const newTab = () => {
        if (workspaces !== undefined) workspaces.startSession()
      }

      const children = []
      const archivedSet = new Set(archived)
      for (const id of order) {
        if (archivedSet.has(id)) continue
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
          useWorkspaces: props.useWorkspaces,
          sessions: ctx.get('sessions'),
          workspaces: ctx.get('workspaces'),
        }),
      )))
    }

    return { apply }
  },
})