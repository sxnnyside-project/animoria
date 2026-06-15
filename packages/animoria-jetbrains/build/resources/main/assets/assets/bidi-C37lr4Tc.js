import { t as e } from './__vite-browser-external-DOOah4Mz.js';
import {
  $ as t,
  A as n,
  At as r,
  B as i,
  C as a,
  Ct as o,
  D as s,
  Dt as c,
  E as l,
  Et as u,
  F as d,
  G as f,
  H as p,
  I as m,
  J as h,
  K as g,
  L as _,
  M as v,
  Mt as y,
  N as b,
  Nt as x,
  O as ee,
  Ot as te,
  P as ne,
  Q as re,
  R as ie,
  S as ae,
  St as S,
  T as oe,
  Tt as se,
  U as ce,
  V as le,
  W as ue,
  X as de,
  Y as fe,
  Z as C,
  _ as pe,
  _t as me,
  a as he,
  at as ge,
  b as _e,
  bt as w,
  c as ve,
  ct as ye,
  d as be,
  dt as xe,
  et as T,
  f as Se,
  ft as Ce,
  g as we,
  gt as Te,
  h as Ee,
  ht as De,
  i as Oe,
  it as ke,
  j as E,
  jt as Ae,
  k as je,
  kt as Me,
  l as Ne,
  lt as Pe,
  m as Fe,
  mt as D,
  n as Ie,
  nt as Le,
  o as Re,
  ot as ze,
  p as Be,
  pt as Ve,
  q as He,
  r as Ue,
  rt as We,
  s as Ge,
  st as Ke,
  t as qe,
  tt as Je,
  u as Ye,
  ut as Xe,
  v as O,
  vt as k,
  w as Ze,
  wt as Qe,
  x as $e,
  xt as A,
  y as et,
  yt as tt,
  z as nt,
} from './index-5JSqkK1h.js';
function rt(e) {
  return {
    all: (e ||= new Map()),
    on: function (t, n) {
      var r = e.get(t);
      r ? r.push(n) : e.set(t, [n]);
    },
    off: function (t, n) {
      var r = e.get(t);
      r && (n ? r.splice(r.indexOf(n) >>> 0, 1) : e.set(t, []));
    },
    emit: function (t, n) {
      var r = e.get(t);
      (r &&
        r.slice().map(function (e) {
          e(n);
        }),
        (r = e.get(`*`)) &&
          r.slice().map(function (e) {
            e(t, n);
          }));
    },
  };
}
var it = class {
    #e = rt();
    on(e, t) {
      return (this.#e.on(e, t), this);
    }
    once(e, t) {
      let n = (r) => {
        (t(r), this.off(e, n));
      };
      return this.on(e, n);
    }
    off(e, t) {
      return (this.#e.off(e, t), this);
    }
    emit(e, t) {
      this.#e.emit(e, t);
    }
    removeAllListeners(e) {
      return (e ? this.#e.all.delete(e) : this.#e.all.clear(), this);
    }
  },
  j;
(function (e) {
  ((e.bidi = `bidi`),
    (e.cdp = `cdp`),
    (e.debug = `debug`),
    (e.debugError = `debug:error`),
    (e.debugInfo = `debug:info`),
    (e.debugWarn = `debug:warn`));
})((j ||= {}));
var at,
  ot = class {
    static LOGGER_PREFIX = `${j.debug}:queue`;
    #e;
    #t;
    #n = [];
    #r = !1;
    constructor(e, t) {
      ((this.#t = e), (this.#e = t));
    }
    add(e, t) {
      (this.#n.push([e, t]), this.#i());
    }
    async #i() {
      if (!this.#r) {
        for (this.#r = !0; this.#n.length > 0; ) {
          let e = this.#n.shift();
          if (!e) continue;
          let [t, n] = e;
          (this.#e?.(at.LOGGER_PREFIX, `Processing event:`, n),
            await t
              .then((e) => {
                if (e.kind === `error`) {
                  this.#e?.(
                    j.debugError,
                    `Event threw before sending:`,
                    e.error.message,
                    e.error.stack
                  );
                  return;
                }
                return this.#t(e.value);
              })
              .catch((e) => {
                this.#e?.(j.debugError, `Event was not processed:`, e?.message);
              }));
        }
        this.#r = !1;
      }
    }
  };
at = ot;
var M;
(function (e) {
  ((e.Bluetooth = `bluetooth`),
    (e.Browser = `browser`),
    (e.BrowsingContext = `browsingContext`),
    (e.Cdp = `goog:cdp`),
    (e.Input = `input`),
    (e.Log = `log`),
    (e.Network = `network`),
    (e.Script = `script`),
    (e.Session = `session`),
    (e.Speculation = `speculation`));
})((M ||= {}));
var N;
(function (e) {
  (function (e) {
    ((e.Message = `script.message`),
      (e.RealmCreated = `script.realmCreated`),
      (e.RealmDestroyed = `script.realmDestroyed`));
  })((e.EventNames ||= {}));
})((N ||= {}));
var P;
(function (e) {
  (function (e) {
    e.LogEntryAdded = `log.entryAdded`;
  })((e.EventNames ||= {}));
})((P ||= {}));
var F;
(function (e) {
  (function (e) {
    ((e.ContextCreated = `browsingContext.contextCreated`),
      (e.ContextDestroyed = `browsingContext.contextDestroyed`),
      (e.DomContentLoaded = `browsingContext.domContentLoaded`),
      (e.DownloadEnd = `browsingContext.downloadEnd`),
      (e.DownloadWillBegin = `browsingContext.downloadWillBegin`),
      (e.FragmentNavigated = `browsingContext.fragmentNavigated`),
      (e.HistoryUpdated = `browsingContext.historyUpdated`),
      (e.Load = `browsingContext.load`),
      (e.NavigationAborted = `browsingContext.navigationAborted`),
      (e.NavigationCommitted = `browsingContext.navigationCommitted`),
      (e.NavigationFailed = `browsingContext.navigationFailed`),
      (e.NavigationStarted = `browsingContext.navigationStarted`),
      (e.UserPromptClosed = `browsingContext.userPromptClosed`),
      (e.UserPromptOpened = `browsingContext.userPromptOpened`));
  })((e.EventNames ||= {}));
})((F ||= {}));
var st;
(function (e) {
  (function (e) {
    e.FileDialogOpened = `input.fileDialogOpened`;
  })((e.EventNames ||= {}));
})((st ||= {}));
var I;
(function (e) {
  (function (e) {
    ((e.AuthRequired = `network.authRequired`),
      (e.BeforeRequestSent = `network.beforeRequestSent`),
      (e.FetchError = `network.fetchError`),
      (e.ResponseCompleted = `network.responseCompleted`),
      (e.ResponseStarted = `network.responseStarted`));
  })((e.EventNames ||= {}));
})((I ||= {}));
var ct;
(function (e) {
  (function (e) {
    ((e.RequestDevicePromptUpdated = `bluetooth.requestDevicePromptUpdated`),
      (e.GattConnectionAttempted = `bluetooth.gattConnectionAttempted`),
      (e.CharacteristicEventGenerated = `bluetooth.characteristicEventGenerated`),
      (e.DescriptorEventGenerated = `bluetooth.descriptorEventGenerated`));
  })((e.EventNames ||= {}));
})((ct ||= {}));
var lt;
(function (e) {
  (function (e) {
    e.PrefetchStatusUpdated = `speculation.prefetchStatusUpdated`;
  })((e.EventNames ||= {}));
})((lt ||= {}));
var ut = new Set([
    ...Object.values(M),
    ...Object.values(ct.EventNames),
    ...Object.values(F.EventNames),
    ...Object.values(st.EventNames),
    ...Object.values(P.EventNames),
    ...Object.values(I.EventNames),
    ...Object.values(N.EventNames),
    ...Object.values(lt.EventNames),
  ]),
  L = class extends Error {
    error;
    message;
    stacktrace;
    constructor(e, t, n) {
      (super(), (this.error = e), (this.message = t), (this.stacktrace = n));
    }
    toErrorResponse(e) {
      return {
        type: `error`,
        id: e,
        error: this.error,
        message: this.message,
        stacktrace: this.stacktrace,
      };
    }
  },
  R = class extends L {
    constructor(e, t) {
      super(`invalid argument`, e, t);
    }
  },
  dt = class extends L {
    constructor(e, t) {
      super(`invalid selector`, e, t);
    }
  },
  ft = class extends L {
    constructor(e, t) {
      super(`move target out of bounds`, e, t);
    }
  },
  pt = class extends L {
    constructor(e, t) {
      super(`no such alert`, e, t);
    }
  },
  mt = class extends L {
    constructor(e, t) {
      super(`no such element`, e, t);
    }
  },
  ht = class extends L {
    constructor(e, t) {
      super(`no such frame`, e, t);
    }
  },
  gt = class extends L {
    constructor(e, t) {
      super(`no such handle`, e, t);
    }
  },
  _t = class extends L {
    constructor(e, t) {
      super(`no such history entry`, e, t);
    }
  },
  vt = class extends L {
    constructor(e, t) {
      super(`no such intercept`, e, t);
    }
  },
  yt = class extends L {
    constructor(e, t) {
      super(`no such node`, e, t);
    }
  },
  bt = class extends L {
    constructor(e, t) {
      super(`no such request`, e, t);
    }
  },
  xt = class extends L {
    constructor(e, t) {
      super(`no such script`, e, t);
    }
  },
  St = class extends L {
    constructor(e, t) {
      super(`no such user context`, e, t);
    }
  },
  Ct = class extends L {
    constructor(e, t) {
      super(`unknown command`, e, t);
    }
  },
  z = class extends L {
    constructor(e, t = Error().stack) {
      super(`unknown error`, e, t);
    }
  },
  wt = class extends L {
    constructor(e, t) {
      super(`unable to capture screen`, e, t);
    }
  },
  B = class extends L {
    constructor(e, t) {
      super(`unsupported operation`, e, t);
    }
  },
  Tt = class extends L {
    constructor(e, t) {
      super(`unable to set cookie`, e, t);
    }
  },
  Et = class extends L {
    constructor(e, t) {
      super(`unable to set file input`, e, t);
    }
  },
  Dt = class extends L {
    constructor(e, t) {
      super(`invalid web extension`, e, t);
    }
  },
  Ot = class extends L {
    constructor(e, t) {
      super(`no such web extension`, e, t);
    }
  },
  kt = class extends L {
    constructor(e, t) {
      super(`no such network collector`, e, t);
    }
  },
  At = class extends L {
    constructor(e, t) {
      super(`no such network data`, e, t);
    }
  },
  jt = class {
    parseDisableSimulationParameters(e) {
      return e;
    }
    parseHandleRequestDevicePromptParams(e) {
      return e;
    }
    parseSimulateAdapterParameters(e) {
      return e;
    }
    parseSimulateAdvertisementParameters(e) {
      return e;
    }
    parseSimulateCharacteristicParameters(e) {
      return e;
    }
    parseSimulateCharacteristicResponseParameters(e) {
      return e;
    }
    parseSimulateDescriptorParameters(e) {
      return e;
    }
    parseSimulateDescriptorResponseParameters(e) {
      return e;
    }
    parseSimulateGattConnectionResponseParameters(e) {
      return e;
    }
    parseSimulateGattDisconnectionParameters(e) {
      return e;
    }
    parseSimulatePreconnectedPeripheralParameters(e) {
      return e;
    }
    parseSimulateServiceParameters(e) {
      return e;
    }
    parseCreateUserContextParameters(e) {
      return e;
    }
    parseRemoveUserContextParameters(e) {
      return e;
    }
    parseSetClientWindowStateParameters(e) {
      return e;
    }
    parseSetDownloadBehaviorParameters(e) {
      return e;
    }
    parseActivateParams(e) {
      return e;
    }
    parseCaptureScreenshotParams(e) {
      return e;
    }
    parseCloseParams(e) {
      return e;
    }
    parseCreateParams(e) {
      return e;
    }
    parseGetTreeParams(e) {
      return e;
    }
    parseHandleUserPromptParams(e) {
      return e;
    }
    parseLocateNodesParams(e) {
      return e;
    }
    parseNavigateParams(e) {
      return e;
    }
    parsePrintParams(e) {
      return e;
    }
    parseReloadParams(e) {
      return e;
    }
    parseSetBypassCspParams(e) {
      return e;
    }
    parseSetViewportParams(e) {
      return e;
    }
    parseTraverseHistoryParams(e) {
      return e;
    }
    parseGetSessionParams(e) {
      return e;
    }
    parseResolveRealmParams(e) {
      return e;
    }
    parseSendCommandParams(e) {
      return e;
    }
    parseSetClientHintsOverrideParams(e) {
      return e;
    }
    parseSetForcedColorsModeThemeOverrideParams(e) {
      return e;
    }
    parseSetGeolocationOverrideParams(e) {
      return e;
    }
    parseSetLocaleOverrideParams(e) {
      return e;
    }
    parseSetNetworkConditionsParams(e) {
      return e;
    }
    parseSetScreenOrientationOverrideParams(e) {
      return e;
    }
    parseSetScreenSettingsOverrideParams(e) {
      return e;
    }
    parseSetScriptingEnabledParams(e) {
      return e;
    }
    parseSetScrollbarTypeOverrideParams(e) {
      return e;
    }
    parseSetTimezoneOverrideParams(e) {
      return e;
    }
    parseSetTouchOverrideParams(e) {
      return e;
    }
    parseSetUserAgentOverrideParams(e) {
      return e;
    }
    parseAddPreloadScriptParams(e) {
      return e;
    }
    parseCallFunctionParams(e) {
      return e;
    }
    parseDisownParams(e) {
      return e;
    }
    parseEvaluateParams(e) {
      return e;
    }
    parseGetRealmsParams(e) {
      return e;
    }
    parseRemovePreloadScriptParams(e) {
      return e;
    }
    parsePerformActionsParams(e) {
      return e;
    }
    parseReleaseActionsParams(e) {
      return e;
    }
    parseSetFilesParams(e) {
      return e;
    }
    parseAddDataCollectorParams(e) {
      return e;
    }
    parseAddInterceptParams(e) {
      return e;
    }
    parseContinueRequestParams(e) {
      return e;
    }
    parseContinueResponseParams(e) {
      return e;
    }
    parseContinueWithAuthParams(e) {
      return e;
    }
    parseDisownDataParams(e) {
      return e;
    }
    parseFailRequestParams(e) {
      return e;
    }
    parseGetDataParams(e) {
      return e;
    }
    parseProvideResponseParams(e) {
      return e;
    }
    parseRemoveDataCollectorParams(e) {
      return e;
    }
    parseRemoveInterceptParams(e) {
      return e;
    }
    parseSetCacheBehaviorParams(e) {
      return e;
    }
    parseSetExtraHeadersParams(e) {
      return e;
    }
    parseSetPermissionsParams(e) {
      return e;
    }
    parseSubscribeParams(e) {
      return e;
    }
    parseUnsubscribeParams(e) {
      return e;
    }
    parseDeleteCookiesParams(e) {
      return e;
    }
    parseGetCookiesParams(e) {
      return e;
    }
    parseSetCookieParams(e) {
      return e;
    }
    parseInstallParams(e) {
      return e;
    }
    parseUninstallParams(e) {
      return e;
    }
  },
  Mt = class {
    #e;
    #t;
    #n;
    #r;
    constructor(e, t, n, r) {
      ((this.#e = e), (this.#t = t), (this.#n = n), (this.#r = r));
    }
    close() {
      return (setTimeout(() => this.#e.sendCommand(`Browser.close`).catch(() => {}), 0), {});
    }
    async createUserContext(e) {
      let t = e,
        n = this.#n.getGlobalConfig();
      if (
        t.acceptInsecureCerts !== void 0 &&
        t.acceptInsecureCerts === !1 &&
        n.acceptInsecureCerts === !0
      )
        throw new z(
          `Cannot set user context's "acceptInsecureCerts" to false, when a capability "acceptInsecureCerts" is set to true`
        );
      let r = {};
      if (t.proxy) {
        let e = Nt(t.proxy);
        (e && (r.proxyServer = e),
          t.proxy.noProxy && (r.proxyBypassList = t.proxy.noProxy.join(`,`)));
      } else {
        e[`goog:proxyServer`] !== void 0 && (r.proxyServer = e[`goog:proxyServer`]);
        let t = e[`goog:proxyBypassList`] ?? void 0;
        t && (r.proxyBypassList = t.join(`,`));
      }
      let i = await this.#e.sendCommand(`Target.createBrowserContext`, r);
      return (
        await this.#o(n.downloadBehavior ?? null, i.browserContextId),
        this.#n.updateUserContextConfig(i.browserContextId, {
          acceptInsecureCerts: e.acceptInsecureCerts,
          userPromptHandler: e.unhandledPromptBehavior,
        }),
        { userContext: i.browserContextId }
      );
    }
    async removeUserContext(e) {
      let t = e.userContext;
      if (t === 'default') throw new R('`default` user context cannot be removed');
      try {
        await this.#e.sendCommand(`Target.disposeBrowserContext`, { browserContextId: t });
      } catch (e) {
        throw e.message.startsWith(`Failed to find context with id`) ? new St(e.message) : e;
      }
      return {};
    }
    async getUserContexts() {
      return { userContexts: await this.#r.getUserContexts() };
    }
    async #i(e) {
      let t = await this.#e.sendCommand(`Browser.getWindowForTarget`, { targetId: e });
      return {
        active: !1,
        clientWindow: `${t.windowId}`,
        state: t.bounds.windowState ?? `normal`,
        height: t.bounds.height ?? 0,
        width: t.bounds.width ?? 0,
        x: t.bounds.left ?? 0,
        y: t.bounds.top ?? 0,
      };
    }
    async setClientWindowState(e) {
      let { clientWindow: t } = e,
        n = { windowState: e.state };
      e.state === `normal` &&
        (e.width !== void 0 && (n.width = e.width),
        e.height !== void 0 && (n.height = e.height),
        e.x !== void 0 && (n.left = e.x),
        e.y !== void 0 && (n.top = e.y));
      let r = Number.parseInt(t);
      if (isNaN(r)) throw new R(`no such client window`);
      await this.#e.sendCommand(`Browser.setWindowBounds`, { windowId: r, bounds: n });
      let i = await this.#e.sendCommand(`Browser.getWindowBounds`, { windowId: r });
      return {
        active: !1,
        clientWindow: `${r}`,
        state: i.bounds.windowState ?? `normal`,
        height: i.bounds.height ?? 0,
        width: i.bounds.width ?? 0,
        x: i.bounds.left ?? 0,
        y: i.bounds.top ?? 0,
      };
    }
    async getClientWindows() {
      let e = this.#t.getTopLevelContexts().map((e) => e.cdpTarget.id),
        t = await Promise.all(e.map(async (e) => await this.#i(e))),
        n = new Set(),
        r = [];
      for (let e of t) n.has(e.clientWindow) || (n.add(e.clientWindow), r.push(e));
      return { clientWindows: r };
    }
    #a(e) {
      if (e === null) return { behavior: `default` };
      if (e?.type === `denied`) return { behavior: `deny` };
      if (e?.type === `allowed`) return { behavior: `allow`, downloadPath: e.destinationFolder };
      throw new z(`Unexpected download behavior`);
    }
    async #o(e, t) {
      await this.#e.sendCommand(`Browser.setDownloadBehavior`, {
        ...this.#a(e),
        browserContextId: t === 'default' ? void 0 : t,
        eventsEnabled: !0,
      });
    }
    async setDownloadBehavior(e) {
      let t;
      return (
        (t =
          e.userContexts === void 0
            ? (await this.#r.getUserContexts()).map((e) => e.userContext)
            : Array.from(await this.#r.verifyUserContextIdList(e.userContexts))),
        e.userContexts === void 0
          ? this.#n.updateGlobalConfig({ downloadBehavior: e.downloadBehavior })
          : e.userContexts.map((t) =>
              this.#n.updateUserContextConfig(t, { downloadBehavior: e.downloadBehavior })
            ),
        await Promise.all(
          t.map(async (e) => {
            let t = this.#n.getActiveConfig(void 0, e).downloadBehavior ?? null;
            await this.#o(t, e);
          })
        ),
        {}
      );
    }
  };
function Nt(e) {
  if (!(e.proxyType === `direct` || e.proxyType === `system`)) {
    if (e.proxyType === `pac`)
      throw new B(`PAC proxy configuration is not supported per user context`);
    if (e.proxyType === `autodetect`)
      throw new B(`Autodetect proxy is not supported per user context`);
    if (e.proxyType === `manual`) {
      let t = [];
      if (
        (e.httpProxy !== void 0 && t.push(`http=${e.httpProxy}`),
        e.sslProxy !== void 0 && t.push(`https=${e.sslProxy}`),
        e.socksProxy !== void 0 || e.socksVersion !== void 0)
      ) {
        if (e.socksProxy === void 0)
          throw new R(`'socksVersion' cannot be set without 'socksProxy'`);
        if (
          e.socksVersion === void 0 ||
          typeof e.socksVersion != `number` ||
          !Number.isInteger(e.socksVersion) ||
          e.socksVersion < 0 ||
          e.socksVersion > 255
        )
          throw new R(`'socksVersion' must be between 0 and 255`);
        t.push(`socks=socks${e.socksVersion}://${e.socksProxy}`);
      }
      return t.length === 0 ? void 0 : t.join(`;`);
    }
    throw new z(`Unknown proxy type`);
  }
}
var Pt = class {
    #e;
    #t;
    #n;
    #r;
    constructor(e, t, n, r) {
      ((this.#e = e), (this.#t = t), (this.#n = n), (this.#r = r));
    }
    getSession(e) {
      let t = e.context,
        n = this.#e.getContext(t).cdpTarget.cdpSessionId;
      return n === void 0 ? {} : { session: n };
    }
    resolveRealm(e) {
      let t = e.realm,
        n = this.#t.getRealm({ realmId: t });
      if (n === void 0) throw new z(`Could not find realm ${e.realm}`);
      return { executionContextId: n.executionContextId };
    }
    async sendCommand(e) {
      return {
        result: await (e.session ? this.#n.getCdpClient(e.session) : this.#r).sendCommand(
          e.method,
          e.params
        ),
        session: e.session,
      };
    }
  },
  Ft = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    constructor(e, t, n, r, i) {
      ((this.#n = r),
        (this.#i = n),
        (this.#e = e),
        (this.#t = t),
        (this.#r = i),
        this.#r.addSubscribeHook(F.EventNames.ContextCreated, this.#o.bind(this)));
    }
    getTree(e) {
      return {
        contexts: (e.root === void 0
          ? this.#t.getTopLevelContexts()
          : [this.#t.getContext(e.root)]
        ).map((t) => t.serializeToBidiValue(e.maxDepth ?? Number.MAX_VALUE)),
      };
    }
    async create(e) {
      let t,
        n = `default`;
      if (e.referenceContext !== void 0) {
        if (((t = this.#t.getContext(e.referenceContext)), !t.isTopLevelContext()))
          throw new R(`referenceContext should be a top-level context`);
        n = t.userContext;
      }
      e.userContext !== void 0 && (n = e.userContext);
      let r = this.#t.getAllContexts().filter((e) => e.userContext === n),
        i = !1;
      switch (e.type) {
        case `tab`:
          i = !1;
          break;
        case `window`:
          i = !0;
          break;
      }
      r.length || (i = !0);
      let a;
      try {
        a = await this.#e.sendCommand(`Target.createTarget`, {
          url: `about:blank`,
          newWindow: i,
          browserContextId: n === 'default' ? void 0 : n,
          background: e.background === !0,
        });
      } catch (e) {
        throw e.message.startsWith(`Failed to find browser context with id`) ||
          e.message === `browserContextId`
          ? new St(`The context ${n} was not found`)
          : e;
      }
      let o = await this.#t.waitForContext(a.targetId);
      return (await o.lifecycleLoaded(), { context: o.id });
    }
    navigate(e) {
      return this.#t.getContext(e.context).navigate(e.url, e.wait ?? `none`);
    }
    reload(e) {
      return this.#t.getContext(e.context).reload(e.ignoreCache ?? !1, e.wait ?? `none`);
    }
    async activate(e) {
      let t = this.#t.getContext(e.context);
      if (!t.isTopLevelContext())
        throw new R(`Activation is only supported on the top-level context`);
      return (await t.activate(), {});
    }
    async captureScreenshot(e) {
      return await this.#t.getContext(e.context).captureScreenshot(e);
    }
    async print(e) {
      return await this.#t.getContext(e.context).print(e);
    }
    async setViewport(e) {
      let t = 1e7;
      if ((e.viewport?.height ?? 0) > t || (e.viewport?.width ?? 0) > t)
        throw new B(`Viewport dimension over ${t} are not supported`);
      let n = {};
      (e.devicePixelRatio !== void 0 && (n.devicePixelRatio = e.devicePixelRatio),
        e.viewport !== void 0 && (n.viewport = e.viewport));
      let r = await this.#a(e.context, e.userContexts);
      for (let t of e.userContexts ?? []) this.#n.updateUserContextConfig(t, n);
      return (
        e.context !== void 0 && this.#n.updateBrowsingContextConfig(e.context, n),
        await Promise.all(
          r.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setViewport(
              t.viewport ?? null,
              t.devicePixelRatio ?? null,
              t.screenOrientation ?? null
            );
          })
        ),
        {}
      );
    }
    async #a(e, t) {
      if (e === void 0 && t === void 0)
        throw new R(`Either userContexts or context must be provided`);
      if (e !== void 0 && t !== void 0)
        throw new R(`userContexts and context are mutually exclusive`);
      if (e !== void 0) {
        let t = this.#t.getContext(e);
        if (!t.isTopLevelContext())
          throw new R(`Emulating viewport is only supported on the top-level context`);
        return [t];
      }
      await this.#i.verifyUserContextIdList(t);
      let n = [];
      for (let e of t) {
        let t = this.#t.getTopLevelContexts().filter((t) => t.userContext === e);
        n.push(...t);
      }
      return [...new Set(n).values()];
    }
    async traverseHistory(e) {
      let t = this.#t.getContext(e.context);
      if (!t) throw new R(`No browsing context with id ${e.context}`);
      if (!t.isTopLevelContext())
        throw new R(`Traversing history is only supported on the top-level context`);
      return (await t.traverseHistory(e.delta), {});
    }
    async handleUserPrompt(e) {
      let t = this.#t.getContext(e.context);
      try {
        await t.handleUserPrompt(e.accept, e.userText);
      } catch (e) {
        throw e.message?.includes(`No dialog is showing`) ? new pt(`No dialog is showing`) : e;
      }
      return {};
    }
    async close(e) {
      let t = this.#t.getContext(e.context);
      if (!t.isTopLevelContext())
        throw new R(`Non top-level browsing context ${t.id} cannot be closed.`);
      let n = t.cdpTarget.parentCdpClient;
      try {
        let r = new Promise((t) => {
          let r = (i) => {
            i.targetId === e.context && (n.off(`Target.detachedFromTarget`, r), t());
          };
          n.on(`Target.detachedFromTarget`, r);
        });
        try {
          e.promptUnload
            ? await t.close()
            : await n.sendCommand(`Target.closeTarget`, { targetId: e.context });
        } catch (e) {
          if (!n.isCloseError(e)) throw e;
        }
        await r;
      } catch (e) {
        if (!(e.code === -32e3 && e.message === `Not attached to an active page`)) throw e;
      }
      return {};
    }
    async locateNodes(e) {
      return await this.#t.getContext(e.context).locateNodes(e);
    }
    #o(e) {
      return (
        [this.#t.getContext(e), ...this.#t.getContext(e).allChildren].forEach((e) => {
          this.#r.registerEvent(
            {
              type: `event`,
              method: F.EventNames.ContextCreated,
              params: e.serializeToBidiValue(),
            },
            e.id
          );
        }),
        Promise.resolve()
      );
    }
  },
  It = class {
    #e;
    #t;
    #n;
    constructor(e, t, n) {
      ((this.#e = t), (this.#t = e), (this.#n = n));
    }
    async setGeolocationOverride(e) {
      if (`coordinates` in e && `error` in e)
        throw new R(`Coordinates and error cannot be set at the same time`);
      let t = null;
      if (`coordinates` in e) {
        if (
          (e.coordinates?.altitude ?? null) === null &&
          (e.coordinates?.altitudeAccuracy ?? null) !== null
        )
          throw new R(`Geolocation altitudeAccuracy can be set only with altitude`);
        t = e.coordinates;
      } else if (`error` in e) {
        if (e.error.type !== `positionUnavailable`)
          throw new R(`Unknown geolocation error ${e.error.type}`);
        t = e.error;
      } else throw new R(`Coordinates or error should be set`);
      let n = await this.#r(e.contexts, e.userContexts);
      for (let n of e.contexts ?? []) this.#n.updateBrowsingContextConfig(n, { geolocation: t });
      for (let n of e.userContexts ?? []) this.#n.updateUserContextConfig(n, { geolocation: t });
      return (
        await Promise.all(
          n.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setGeolocationOverride(t.geolocation ?? null);
          })
        ),
        {}
      );
    }
    async setLocaleOverride(e) {
      let t = e.locale ?? null;
      if (t !== null && !Lt(t)) throw new R(`Invalid locale "${t}"`);
      let n = await this.#r(e.contexts, e.userContexts);
      for (let n of e.contexts ?? []) this.#n.updateBrowsingContextConfig(n, { locale: t });
      for (let n of e.userContexts ?? []) this.#n.updateUserContextConfig(n, { locale: t });
      return (
        await Promise.all(
          n.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await Promise.all([
              e.setLocaleOverride(t.locale ?? null),
              e.setUserAgentAndAcceptLanguage(t.userAgent, t.locale, t.clientHints),
            ]);
          })
        ),
        {}
      );
    }
    async setScriptingEnabled(e) {
      let t = e.enabled,
        n = await this.#r(e.contexts, e.userContexts);
      for (let n of e.contexts ?? [])
        this.#n.updateBrowsingContextConfig(n, { scriptingEnabled: t });
      for (let n of e.userContexts ?? [])
        this.#n.updateUserContextConfig(n, { scriptingEnabled: t });
      return (
        await Promise.all(
          n.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setScriptingEnabled(t.scriptingEnabled ?? null);
          })
        ),
        {}
      );
    }
    async setScrollbarTypeOverride(e) {
      let t = await this.#r(e.contexts, e.userContexts);
      for (let t of e.contexts ?? [])
        this.#n.updateBrowsingContextConfig(t, { scrollbarType: e.scrollbarType });
      for (let t of e.userContexts ?? [])
        this.#n.updateUserContextConfig(t, { scrollbarType: e.scrollbarType });
      return (
        await Promise.all(
          t.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setScrollbarTypeOverride(t.scrollbarType ?? null);
          })
        ),
        {}
      );
    }
    async setScreenOrientationOverride(e) {
      let t = await this.#r(e.contexts, e.userContexts);
      for (let t of e.contexts ?? [])
        this.#n.updateBrowsingContextConfig(t, { screenOrientation: e.screenOrientation });
      for (let t of e.userContexts ?? [])
        this.#n.updateUserContextConfig(t, { screenOrientation: e.screenOrientation });
      return (
        await Promise.all(
          t.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setViewport(
              t.viewport ?? null,
              t.devicePixelRatio ?? null,
              t.screenOrientation ?? null
            );
          })
        ),
        {}
      );
    }
    async setScreenSettingsOverride(e) {
      let t = await this.#r(e.contexts, e.userContexts);
      for (let t of e.contexts ?? [])
        this.#n.updateBrowsingContextConfig(t, { screenArea: e.screenArea });
      for (let t of e.userContexts ?? [])
        this.#n.updateUserContextConfig(t, { screenArea: e.screenArea });
      return (
        await Promise.all(
          t.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setViewport(
              t.viewport ?? null,
              t.devicePixelRatio ?? null,
              t.screenOrientation ?? null
            );
          })
        ),
        {}
      );
    }
    async #r(e, t, n = !1) {
      if (e === void 0 && t === void 0) {
        if (n) return this.#t.getTopLevelContexts();
        throw new R(`Either user contexts or browsing contexts must be provided`);
      }
      if (e !== void 0 && t !== void 0)
        throw new R(`User contexts and browsing contexts are mutually exclusive`);
      let r = [];
      if (e === void 0) {
        if (t.length === 0) throw new R(`user context should be provided`);
        await this.#e.verifyUserContextIdList(t);
        for (let e of t) {
          let t = this.#t.getTopLevelContexts().filter((t) => t.userContext === e);
          r.push(...t);
        }
      } else {
        if (e.length === 0) throw new R(`browsing context should be provided`);
        for (let t of e) {
          let e = this.#t.getContext(t);
          if (!e.isTopLevelContext())
            throw new R(`The command is only supported on the top-level context`);
          r.push(e);
        }
      }
      return [...new Set(r).values()];
    }
    async setTimezoneOverride(e) {
      let t = e.timezone ?? null;
      if (t !== null && !Rt(t)) throw new R(`Invalid timezone "${t}"`);
      t !== null && zt(t) && (t = `GMT${t}`);
      let n = await this.#r(e.contexts, e.userContexts);
      for (let n of e.contexts ?? []) this.#n.updateBrowsingContextConfig(n, { timezone: t });
      for (let n of e.userContexts ?? []) this.#n.updateUserContextConfig(n, { timezone: t });
      return (
        await Promise.all(
          n.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setTimezoneOverride(t.timezone ?? null);
          })
        ),
        {}
      );
    }
    async setTouchOverride(e) {
      let t = e.maxTouchPoints,
        n = await this.#r(e.contexts, e.userContexts, !0);
      for (let n of e.contexts ?? []) this.#n.updateBrowsingContextConfig(n, { maxTouchPoints: t });
      for (let n of e.userContexts ?? []) this.#n.updateUserContextConfig(n, { maxTouchPoints: t });
      return (
        e.contexts === void 0 &&
          e.userContexts === void 0 &&
          this.#n.updateGlobalConfig({ maxTouchPoints: t }),
        await Promise.all(
          n.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setTouchOverride(t.maxTouchPoints ?? null);
          })
        ),
        {}
      );
    }
    async setUserAgentOverrideParams(e) {
      if (e.userAgent === ``) throw new B(`empty user agent string is not supported`);
      let t = await this.#r(e.contexts, e.userContexts, !0);
      for (let t of e.contexts ?? [])
        this.#n.updateBrowsingContextConfig(t, { userAgent: e.userAgent });
      for (let t of e.userContexts ?? [])
        this.#n.updateUserContextConfig(t, { userAgent: e.userAgent });
      return (
        e.contexts === void 0 &&
          e.userContexts === void 0 &&
          this.#n.updateGlobalConfig({ userAgent: e.userAgent }),
        await Promise.all(
          t.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setUserAgentAndAcceptLanguage(t.userAgent, t.locale, t.clientHints);
          })
        ),
        {}
      );
    }
    async setClientHintsOverride(e) {
      let t = e.clientHints ?? null,
        n = await this.#r(e.contexts, e.userContexts, !0);
      for (let n of e.contexts ?? []) this.#n.updateBrowsingContextConfig(n, { clientHints: t });
      for (let n of e.userContexts ?? []) this.#n.updateUserContextConfig(n, { clientHints: t });
      return (
        e.contexts === void 0 &&
          e.userContexts === void 0 &&
          this.#n.updateGlobalConfig({ clientHints: t }),
        await Promise.all(
          n.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setUserAgentAndAcceptLanguage(t.userAgent, t.locale, t.clientHints);
          })
        ),
        {}
      );
    }
    async setNetworkConditions(e) {
      let t = await this.#r(e.contexts, e.userContexts, !0);
      for (let t of e.contexts ?? [])
        this.#n.updateBrowsingContextConfig(t, { emulatedNetworkConditions: e.networkConditions });
      for (let t of e.userContexts ?? [])
        this.#n.updateUserContextConfig(t, { emulatedNetworkConditions: e.networkConditions });
      if (
        (e.contexts === void 0 &&
          e.userContexts === void 0 &&
          this.#n.updateGlobalConfig({ emulatedNetworkConditions: e.networkConditions }),
        e.networkConditions !== null && e.networkConditions.type !== `offline`)
      )
        throw new B(`Unsupported network conditions ${e.networkConditions.type}`);
      return (
        await Promise.all(
          t.map(async (e) => {
            let t = this.#n.getActiveConfig(e.id, e.userContext);
            await e.setEmulatedNetworkConditions(t.emulatedNetworkConditions ?? null);
          })
        ),
        {}
      );
    }
  };
function Lt(e) {
  try {
    return (new Intl.Locale(e), !0);
  } catch (e) {
    if (e instanceof RangeError) return !1;
    throw e;
  }
}
function Rt(e) {
  try {
    return (Intl.DateTimeFormat(void 0, { timeZone: e }), !0);
  } catch (e) {
    if (e instanceof RangeError) return !1;
    throw e;
  }
}
function zt(e) {
  return /^[+-](?:2[0-3]|[01]\d)(?::[0-5]\d)?$/.test(e);
}
function V(e, t) {
  if (!e) throw Error(t ?? `Internal assertion failed.`);
}
function Bt(e) {
  return Vt(e) && e.length > 1;
}
function Vt(e) {
  return [...new Intl.Segmenter(`en`, { granularity: `grapheme` }).segment(e)].length === 1;
}
var Ht = class {
    type = `none`;
  },
  Ut = class {
    type = `key`;
    pressed = new Set();
    #e = 0;
    get modifiers() {
      return this.#e;
    }
    get alt() {
      return (this.#e & 1) == 1;
    }
    set alt(e) {
      this.#t(e, 1);
    }
    get ctrl() {
      return (this.#e & 2) == 2;
    }
    set ctrl(e) {
      this.#t(e, 2);
    }
    get meta() {
      return (this.#e & 4) == 4;
    }
    set meta(e) {
      this.#t(e, 4);
    }
    get shift() {
      return (this.#e & 8) == 8;
    }
    set shift(e) {
      this.#t(e, 8);
    }
    #t(e, t) {
      e ? (this.#e |= t) : (this.#e &= ~t);
    }
  },
  Wt = class {
    type = `pointer`;
    subtype;
    pointerId;
    pressed = new Set();
    x = 0;
    y = 0;
    radiusX;
    radiusY;
    force;
    constructor(e, t) {
      ((this.pointerId = e), (this.subtype = t));
    }
    get buttons() {
      let e = 0;
      for (let t of this.pressed)
        switch (t) {
          case 0:
            e |= 1;
            break;
          case 1:
            e |= 4;
            break;
          case 2:
            e |= 2;
            break;
          case 3:
            e |= 8;
            break;
          case 4:
            e |= 16;
            break;
        }
      return e;
    }
    static ClickContext = class e {
      static #t = 500;
      static #n = 2;
      count = 0;
      #r;
      #i;
      #a;
      constructor(e, t, n) {
        ((this.#r = e), (this.#i = t), (this.#a = n));
      }
      compare(t) {
        return (
          t.#a - this.#a > e.#t ||
          Math.abs(t.#r - this.#r) > e.#n ||
          Math.abs(t.#i - this.#i) > e.#n
        );
      }
    };
    #e = new Map();
    setClickCount(e, t) {
      let n = this.#e.get(e);
      return ((!n || n.compare(t)) && (n = t), ++n.count, this.#e.set(e, n), n.count);
    }
    getClickCount(e) {
      return this.#e.get(e)?.count ?? 0;
    }
    resetClickCount() {
      this.#e = new Map();
    }
  },
  Gt = class {
    type = `wheel`;
  };
function Kt(e) {
  switch (e) {
    case ``:
      return `Unidentified`;
    case ``:
      return `Cancel`;
    case ``:
      return `Help`;
    case ``:
      return `Backspace`;
    case ``:
      return `Tab`;
    case ``:
      return `Clear`;
    case ``:
    case ``:
      return `Enter`;
    case ``:
      return `Shift`;
    case ``:
      return `Control`;
    case ``:
      return `Alt`;
    case ``:
      return `Pause`;
    case ``:
      return `Escape`;
    case ``:
      return ` `;
    case ``:
      return `PageUp`;
    case ``:
      return `PageDown`;
    case ``:
      return `End`;
    case ``:
      return `Home`;
    case ``:
      return `ArrowLeft`;
    case ``:
      return `ArrowUp`;
    case ``:
      return `ArrowRight`;
    case ``:
      return `ArrowDown`;
    case ``:
      return `Insert`;
    case ``:
      return `Delete`;
    case ``:
      return `;`;
    case ``:
      return `=`;
    case ``:
      return `0`;
    case ``:
      return `1`;
    case ``:
      return `2`;
    case ``:
      return `3`;
    case ``:
      return `4`;
    case ``:
      return `5`;
    case ``:
      return `6`;
    case ``:
      return `7`;
    case ``:
      return `8`;
    case ``:
      return `9`;
    case ``:
      return `*`;
    case ``:
      return `+`;
    case ``:
      return `,`;
    case ``:
      return `-`;
    case ``:
      return `.`;
    case ``:
      return `/`;
    case ``:
      return `F1`;
    case ``:
      return `F2`;
    case ``:
      return `F3`;
    case ``:
      return `F4`;
    case ``:
      return `F5`;
    case ``:
      return `F6`;
    case ``:
      return `F7`;
    case ``:
      return `F8`;
    case ``:
      return `F9`;
    case ``:
      return `F10`;
    case ``:
      return `F11`;
    case ``:
      return `F12`;
    case ``:
      return `Meta`;
    case ``:
      return `ZenkakuHankaku`;
    case ``:
      return `Shift`;
    case ``:
      return `Control`;
    case ``:
      return `Alt`;
    case ``:
      return `Meta`;
    case ``:
      return `PageUp`;
    case ``:
      return `PageDown`;
    case ``:
      return `End`;
    case ``:
      return `Home`;
    case ``:
      return `ArrowLeft`;
    case ``:
      return `ArrowUp`;
    case ``:
      return `ArrowRight`;
    case ``:
      return `ArrowDown`;
    case ``:
      return `Insert`;
    case ``:
      return `Delete`;
    default:
      return e;
  }
}
function qt(e) {
  switch (e) {
    case '`':
    case `~`:
      return `Backquote`;
    case `\\`:
    case `|`:
      return `Backslash`;
    case ``:
      return `Backspace`;
    case `[`:
    case `{`:
      return `BracketLeft`;
    case `]`:
    case `}`:
      return `BracketRight`;
    case `,`:
    case `<`:
      return `Comma`;
    case `0`:
    case `)`:
      return `Digit0`;
    case `1`:
    case `!`:
      return `Digit1`;
    case `2`:
    case `@`:
      return `Digit2`;
    case `3`:
    case `#`:
      return `Digit3`;
    case `4`:
    case `$`:
      return `Digit4`;
    case `5`:
    case `%`:
      return `Digit5`;
    case `6`:
    case `^`:
      return `Digit6`;
    case `7`:
    case `&`:
      return `Digit7`;
    case `8`:
    case `*`:
      return `Digit8`;
    case `9`:
    case `(`:
      return `Digit9`;
    case `=`:
    case `+`:
      return `Equal`;
    case `>`:
      return `IntlBackslash`;
    case `a`:
    case `A`:
      return `KeyA`;
    case `b`:
    case `B`:
      return `KeyB`;
    case `c`:
    case `C`:
      return `KeyC`;
    case `d`:
    case `D`:
      return `KeyD`;
    case `e`:
    case `E`:
      return `KeyE`;
    case `f`:
    case `F`:
      return `KeyF`;
    case `g`:
    case `G`:
      return `KeyG`;
    case `h`:
    case `H`:
      return `KeyH`;
    case `i`:
    case `I`:
      return `KeyI`;
    case `j`:
    case `J`:
      return `KeyJ`;
    case `k`:
    case `K`:
      return `KeyK`;
    case `l`:
    case `L`:
      return `KeyL`;
    case `m`:
    case `M`:
      return `KeyM`;
    case `n`:
    case `N`:
      return `KeyN`;
    case `o`:
    case `O`:
      return `KeyO`;
    case `p`:
    case `P`:
      return `KeyP`;
    case `q`:
    case `Q`:
      return `KeyQ`;
    case `r`:
    case `R`:
      return `KeyR`;
    case `s`:
    case `S`:
      return `KeyS`;
    case `t`:
    case `T`:
      return `KeyT`;
    case `u`:
    case `U`:
      return `KeyU`;
    case `v`:
    case `V`:
      return `KeyV`;
    case `w`:
    case `W`:
      return `KeyW`;
    case `x`:
    case `X`:
      return `KeyX`;
    case `y`:
    case `Y`:
      return `KeyY`;
    case `z`:
    case `Z`:
      return `KeyZ`;
    case `-`:
    case `_`:
      return `Minus`;
    case `.`:
      return `Period`;
    case `'`:
    case `"`:
      return `Quote`;
    case `;`:
    case `:`:
      return `Semicolon`;
    case `/`:
    case `?`:
      return `Slash`;
    case ``:
      return `AltLeft`;
    case ``:
      return `AltRight`;
    case ``:
      return `ControlLeft`;
    case ``:
      return `ControlRight`;
    case ``:
      return `Enter`;
    case ``:
      return `Pause`;
    case ``:
      return `MetaLeft`;
    case ``:
      return `MetaRight`;
    case ``:
      return `ShiftLeft`;
    case ``:
      return `ShiftRight`;
    case ` `:
    case ``:
      return `Space`;
    case ``:
      return `Tab`;
    case ``:
      return `Delete`;
    case ``:
      return `End`;
    case ``:
      return `Help`;
    case ``:
      return `Home`;
    case ``:
      return `Insert`;
    case ``:
      return `PageDown`;
    case ``:
      return `PageUp`;
    case ``:
      return `ArrowDown`;
    case ``:
      return `ArrowLeft`;
    case ``:
      return `ArrowRight`;
    case ``:
      return `ArrowUp`;
    case ``:
      return `Escape`;
    case ``:
      return `F1`;
    case ``:
      return `F2`;
    case ``:
      return `F3`;
    case ``:
      return `F4`;
    case ``:
      return `F5`;
    case ``:
      return `F6`;
    case ``:
      return `F7`;
    case ``:
      return `F8`;
    case ``:
      return `F9`;
    case ``:
      return `F10`;
    case ``:
      return `F11`;
    case ``:
      return `F12`;
    case ``:
      return `NumpadEqual`;
    case ``:
    case ``:
      return `Numpad0`;
    case ``:
    case ``:
      return `Numpad1`;
    case ``:
    case ``:
      return `Numpad2`;
    case ``:
    case ``:
      return `Numpad3`;
    case ``:
    case ``:
      return `Numpad4`;
    case ``:
      return `Numpad5`;
    case ``:
    case ``:
      return `Numpad6`;
    case ``:
    case ``:
      return `Numpad7`;
    case ``:
    case ``:
      return `Numpad8`;
    case ``:
    case ``:
      return `Numpad9`;
    case ``:
      return `NumpadAdd`;
    case ``:
      return `NumpadComma`;
    case ``:
    case ``:
      return `NumpadDecimal`;
    case ``:
      return `NumpadDivide`;
    case ``:
      return `NumpadEnter`;
    case ``:
      return `NumpadMultiply`;
    case ``:
      return `NumpadSubtract`;
    default:
      return;
  }
}
function Jt(e) {
  switch (e) {
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
      return 1;
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
    case ``:
      return 3;
    case ``:
    case ``:
    case ``:
    case ``:
      return 2;
    default:
      return 0;
  }
}
var Yt = {
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57,
    Abort: 3,
    Help: 6,
    Backspace: 8,
    Tab: 9,
    Numpad5: 12,
    NumpadEnter: 13,
    Enter: 13,
    '\\r': 13,
    '\\n': 13,
    ShiftLeft: 16,
    ShiftRight: 16,
    ControlLeft: 17,
    ControlRight: 17,
    AltLeft: 18,
    AltRight: 18,
    Pause: 19,
    CapsLock: 20,
    Escape: 27,
    Convert: 28,
    NonConvert: 29,
    Space: 32,
    Numpad9: 33,
    PageUp: 33,
    Numpad3: 34,
    PageDown: 34,
    End: 35,
    Numpad1: 35,
    Home: 36,
    Numpad7: 36,
    ArrowLeft: 37,
    Numpad4: 37,
    Numpad8: 38,
    ArrowUp: 38,
    ArrowRight: 39,
    Numpad6: 39,
    Numpad2: 40,
    ArrowDown: 40,
    Select: 41,
    Open: 43,
    PrintScreen: 44,
    Insert: 45,
    Numpad0: 45,
    Delete: 46,
    NumpadDecimal: 46,
    Digit0: 48,
    Digit1: 49,
    Digit2: 50,
    Digit3: 51,
    Digit4: 52,
    Digit5: 53,
    Digit6: 54,
    Digit7: 55,
    Digit8: 56,
    Digit9: 57,
    KeyA: 65,
    KeyB: 66,
    KeyC: 67,
    KeyD: 68,
    KeyE: 69,
    KeyF: 70,
    KeyG: 71,
    KeyH: 72,
    KeyI: 73,
    KeyJ: 74,
    KeyK: 75,
    KeyL: 76,
    KeyM: 77,
    KeyN: 78,
    KeyO: 79,
    KeyP: 80,
    KeyQ: 81,
    KeyR: 82,
    KeyS: 83,
    KeyT: 84,
    KeyU: 85,
    KeyV: 86,
    KeyW: 87,
    KeyX: 88,
    KeyY: 89,
    KeyZ: 90,
    MetaLeft: 91,
    MetaRight: 92,
    ContextMenu: 93,
    NumpadMultiply: 106,
    NumpadAdd: 107,
    NumpadSubtract: 109,
    NumpadDivide: 111,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    F13: 124,
    F14: 125,
    F15: 126,
    F16: 127,
    F17: 128,
    F18: 129,
    F19: 130,
    F20: 131,
    F21: 132,
    F22: 133,
    F23: 134,
    F24: 135,
    NumLock: 144,
    ScrollLock: 145,
    AudioVolumeMute: 173,
    AudioVolumeDown: 174,
    AudioVolumeUp: 175,
    MediaTrackNext: 176,
    MediaTrackPrevious: 177,
    MediaStop: 178,
    MediaPlayPause: 179,
    Semicolon: 186,
    Equal: 187,
    NumpadEqual: 187,
    Comma: 188,
    Minus: 189,
    Period: 190,
    Slash: 191,
    Backquote: 192,
    BracketLeft: 219,
    Backslash: 220,
    BracketRight: 221,
    Quote: 222,
    AltGraph: 225,
    Props: 247,
    Cancel: 3,
    Clear: 12,
    Shift: 16,
    Control: 17,
    Alt: 18,
    Accept: 30,
    ModeChange: 31,
    ' ': 32,
    Print: 42,
    Execute: 43,
    '\\u0000': 46,
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    Meta: 91,
    '*': 106,
    '+': 107,
    '-': 109,
    '/': 111,
    ';': 186,
    '=': 187,
    ',': 188,
    '.': 190,
    '`': 192,
    '[': 219,
    '\\\\': 220,
    ']': 221,
    "'": 222,
    Attn: 246,
    CrSel: 247,
    ExSel: 248,
    EraseEof: 249,
    Play: 250,
    ZoomOut: 251,
    ')': 48,
    '!': 49,
    '@': 50,
    '#': 51,
    $: 52,
    '%': 53,
    '^': 54,
    '&': 55,
    '(': 57,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    ':': 186,
    '<': 188,
    _: 189,
    '>': 190,
    '?': 191,
    '~': 192,
    '{': 219,
    '|': 220,
    '}': 221,
    '"': 222,
    Camera: 44,
    EndCall: 95,
    VolumeDown: 182,
    VolumeUp: 183,
  },
  Xt = ((e) => {
    let t = e.getClientRects()[0],
      n = Math.max(0, Math.min(t.x, t.x + t.width)),
      r = Math.min(window.innerWidth, Math.max(t.x, t.x + t.width)),
      i = Math.max(0, Math.min(t.y, t.y + t.height)),
      a = Math.min(window.innerHeight, Math.max(t.y, t.y + t.height));
    return [n + ((r - n) >> 1), i + ((a - i) >> 1)];
  }).toString(),
  Zt = (() => navigator.platform.toLowerCase().includes(`mac`)).toString();
async function Qt(e, t) {
  let n = await (
    await e.getOrCreateHiddenSandbox()
  ).callFunction(Xt, !1, { type: `undefined` }, [t]);
  if (n.type === `exception`) throw new mt(`Origin element ${t.sharedId} was not found`);
  (V(n.result.type === `array`),
    V(n.result.value?.[0]?.type === `number`),
    V(n.result.value?.[1]?.type === `number`));
  let {
    result: {
      value: [{ value: r }, { value: i }],
    },
  } = n;
  return { x: r, y: i };
}
var $t = class {
    static isMacOS = async (e) => {
      let t = await (await e.getOrCreateHiddenSandbox()).callFunction(Zt, !1);
      return (V(t.type !== `exception`), V(t.result.type === `boolean`), t.result.value);
    };
    #e;
    #t = 0;
    #n = 0;
    #r;
    #i;
    #a;
    constructor(e, t, n, r) {
      ((this.#e = t), (this.#r = e), (this.#i = n), (this.#a = r));
    }
    get #o() {
      return this.#e.getContext(this.#i);
    }
    async dispatchActions(e) {
      await this.#r.queue.run(async () => {
        for (let t of e) await this.dispatchTickActions(t);
      });
    }
    async dispatchTickActions(e) {
      ((this.#t = performance.now()), (this.#n = 0));
      for (let { action: t } of e)
        `duration` in t && t.duration !== void 0 && (this.#n = Math.max(this.#n, t.duration));
      let t = [new Promise((e) => setTimeout(e, this.#n))];
      for (let n of e) t.push(this.#s(n));
      await Promise.all(t);
    }
    async #s({ id: e, action: t }) {
      let n = this.#r.get(e),
        r = this.#r.getGlobalKeyState();
      switch (t.type) {
        case `keyDown`:
          (await this.#m(n, t),
            this.#r.cancelList.push({ id: e, action: { ...t, type: `keyUp` } }));
          break;
        case `keyUp`:
          await this.#h(n, t);
          break;
        case `pause`:
          break;
        case `pointerDown`:
          (await this.#c(n, r, t),
            this.#r.cancelList.push({ id: e, action: { ...t, type: `pointerUp` } }));
          break;
        case `pointerMove`:
          await this.#u(n, r, t);
          break;
        case `pointerUp`:
          await this.#l(n, r, t);
          break;
        case `scroll`:
          await this.#p(n, r, t);
          break;
      }
    }
    async #c(e, t, n) {
      let { button: r } = n;
      if (e.pressed.has(r)) return;
      e.pressed.add(r);
      let { x: i, y: a, subtype: o } = e,
        { width: s, height: c, pressure: l, twist: u, tangentialPressure: d } = n,
        { tiltX: f, tiltY: p } = rn(n),
        { modifiers: m } = t,
        { radiusX: h, radiusY: g } = an(s ?? 1, c ?? 1);
      switch (o) {
        case `mouse`:
        case `pen`:
          await this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchMouseEvent`, {
            type: `mousePressed`,
            x: i,
            y: a,
            modifiers: m,
            button: nn(r),
            buttons: e.buttons,
            clickCount: e.setClickCount(r, new Wt.ClickContext(i, a, performance.now())),
            pointerType: o,
            tangentialPressure: d,
            tiltX: f,
            tiltY: p,
            twist: u,
            force: l,
          });
          break;
        case `touch`:
          await this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchTouchEvent`, {
            type: `touchStart`,
            touchPoints: [
              {
                x: i,
                y: a,
                radiusX: h,
                radiusY: g,
                tangentialPressure: d,
                tiltX: f,
                tiltY: p,
                twist: u,
                force: l,
                id: e.pointerId,
              },
            ],
            modifiers: m,
          });
          break;
      }
      ((e.radiusX = h), (e.radiusY = g), (e.force = l));
    }
    #l(e, t, n) {
      let { button: r } = n;
      if (!e.pressed.has(r)) return;
      e.pressed.delete(r);
      let { x: i, y: a, force: o, radiusX: s, radiusY: c, subtype: l } = e,
        { modifiers: u } = t;
      switch (l) {
        case `mouse`:
        case `pen`:
          return this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchMouseEvent`, {
            type: `mouseReleased`,
            x: i,
            y: a,
            modifiers: u,
            button: nn(r),
            buttons: e.buttons,
            clickCount: e.getClickCount(r),
            pointerType: l,
          });
        case `touch`:
          return this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchTouchEvent`, {
            type: `touchEnd`,
            touchPoints: [{ x: i, y: a, id: e.pointerId, force: o, radiusX: s, radiusY: c }],
            modifiers: u,
          });
      }
    }
    async #u(e, t, n) {
      let { x: r, y: i, subtype: a } = e,
        {
          width: o,
          height: s,
          pressure: c,
          twist: l,
          tangentialPressure: u,
          x: d,
          y: f,
          origin: p = `viewport`,
          duration: m = this.#n,
        } = n,
        { tiltX: h, tiltY: g } = rn(n),
        { radiusX: _, radiusY: v } = an(o ?? 1, s ?? 1),
        { targetX: y, targetY: b } = await this.#f(p, d, f, r, i);
      if (y < 0 || b < 0) throw new ft(`Cannot move beyond viewport (x: ${y}, y: ${b})`);
      let x;
      do {
        let n = m > 0 ? (performance.now() - this.#t) / m : 1;
        x = n >= 1;
        let o, s;
        if (
          (x
            ? ((o = y), (s = b))
            : ((o = Math.round(n * (y - r) + r)), (s = Math.round(n * (b - i) + i))),
          e.x !== o || e.y !== s)
        ) {
          let { modifiers: n } = t;
          switch (a) {
            case `mouse`:
              await this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchMouseEvent`, {
                type: `mouseMoved`,
                x: o,
                y: s,
                modifiers: n,
                clickCount: 0,
                button: nn(e.pressed.values().next().value ?? 5),
                buttons: e.buttons,
                pointerType: a,
                tangentialPressure: u,
                tiltX: h,
                tiltY: g,
                twist: l,
                force: c,
              });
              break;
            case `pen`:
              e.pressed.size !== 0 &&
                (await this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchMouseEvent`, {
                  type: `mouseMoved`,
                  x: o,
                  y: s,
                  modifiers: n,
                  clickCount: 0,
                  button: nn(e.pressed.values().next().value ?? 5),
                  buttons: e.buttons,
                  pointerType: a,
                  tangentialPressure: u,
                  tiltX: h,
                  tiltY: g,
                  twist: l,
                  force: c ?? 0.5,
                }));
              break;
            case `touch`:
              e.pressed.size !== 0 &&
                (await this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchTouchEvent`, {
                  type: `touchMove`,
                  touchPoints: [
                    {
                      x: o,
                      y: s,
                      radiusX: _,
                      radiusY: v,
                      tangentialPressure: u,
                      tiltX: h,
                      tiltY: g,
                      twist: l,
                      force: c,
                      id: e.pointerId,
                    },
                  ],
                  modifiers: n,
                }));
              break;
          }
          ((e.x = o), (e.y = s), (e.radiusX = _), (e.radiusY = v), (e.force = c));
        }
      } while (!x);
    }
    async #d() {
      if (this.#o.id === this.#o.cdpTarget.id) return { x: 0, y: 0 };
      let { backendNodeId: e } = await this.#o.cdpTarget.cdpClient.sendCommand(
          `DOM.getFrameOwner`,
          { frameId: this.#o.id }
        ),
        { model: t } = await this.#o.cdpTarget.cdpClient.sendCommand(`DOM.getBoxModel`, {
          backendNodeId: e,
        });
      return { x: t.content[0], y: t.content[1] };
    }
    async #f(e, t, n, r, i) {
      let a,
        o,
        s = await this.#d();
      switch (e) {
        case `viewport`:
          ((a = t + s.x), (o = n + s.y));
          break;
        case `pointer`:
          ((a = r + t + s.x), (o = i + n + s.y));
          break;
        default: {
          let { x: r, y: i } = await Qt(this.#o, e.element);
          ((a = r + t + s.x), (o = i + n + s.y));
          break;
        }
      }
      return { targetX: a, targetY: o };
    }
    async #p(e, t, n) {
      let { deltaX: r, deltaY: i, x: a, y: o, origin: s = `viewport`, duration: c = this.#n } = n;
      if (s === `pointer`) throw new R(`"pointer" origin is invalid for scrolling.`);
      let { targetX: l, targetY: u } = await this.#f(s, a, o, 0, 0);
      if (l < 0 || u < 0) throw new ft(`Cannot move beyond viewport (x: ${l}, y: ${u})`);
      let d = 0,
        f = 0,
        p;
      do {
        let e = c > 0 ? (performance.now() - this.#t) / c : 1;
        p = e >= 1;
        let n, a;
        if (
          (p
            ? ((n = r - d), (a = i - f))
            : ((n = Math.round(e * r - d)), (a = Math.round(e * i - f))),
          n !== 0 || a !== 0)
        ) {
          let { modifiers: e } = t;
          (await this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchMouseEvent`, {
            type: `mouseWheel`,
            deltaX: n,
            deltaY: a,
            x: l,
            y: u,
            modifiers: e,
          }),
            (d += n),
            (f += a));
        }
      } while (!p);
    }
    async #m(e, t) {
      let n = t.value;
      if (!Vt(n)) throw new R(`Invalid key value: ${n}`);
      let r = Bt(n),
        i = Kt(n),
        a = e.pressed.has(i),
        o = qt(n),
        s = Jt(n);
      switch (i) {
        case `Alt`:
          e.alt = !0;
          break;
        case `Shift`:
          e.shift = !0;
          break;
        case `Control`:
          e.ctrl = !0;
          break;
        case `Meta`:
          e.meta = !0;
          break;
      }
      e.pressed.add(i);
      let { modifiers: c } = e,
        l = en(i, e, r),
        u = tn(o ?? ``, e) ?? l,
        d;
      if (this.#a && e.meta)
        switch (o) {
          case `KeyA`:
            d = `SelectAll`;
            break;
          case `KeyC`:
            d = `Copy`;
            break;
          case `KeyV`:
            d = e.shift ? `PasteAndMatchStyle` : `Paste`;
            break;
          case `KeyX`:
            d = `Cut`;
            break;
          case `KeyZ`:
            d = e.shift ? `Redo` : `Undo`;
            break;
          default:
        }
      let f = [
        this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchKeyEvent`, {
          type: u ? `keyDown` : `rawKeyDown`,
          windowsVirtualKeyCode: Yt[i],
          key: i,
          code: o,
          text: u,
          unmodifiedText: l,
          autoRepeat: a,
          isSystemKey: e.alt || void 0,
          location: s < 3 ? s : void 0,
          isKeypad: s === 3,
          modifiers: c,
          commands: d ? [d] : void 0,
        }),
      ];
      (i === `Escape` &&
        !e.alt &&
        ((this.#a && !e.ctrl && !e.meta) || !this.#a) &&
        f.push(this.#o.cdpTarget.cdpClient.sendCommand(`Input.cancelDragging`)),
        await Promise.all(f));
    }
    #h(e, t) {
      let n = t.value;
      if (!Vt(n)) throw new R(`Invalid key value: ${n}`);
      let r = Bt(n),
        i = Kt(n);
      if (!e.pressed.has(i)) return;
      let a = qt(n),
        o = Jt(n);
      switch (i) {
        case `Alt`:
          e.alt = !1;
          break;
        case `Shift`:
          e.shift = !1;
          break;
        case `Control`:
          e.ctrl = !1;
          break;
        case `Meta`:
          e.meta = !1;
          break;
      }
      e.pressed.delete(i);
      let { modifiers: s } = e,
        c = en(i, e, r),
        l = tn(a ?? ``, e) ?? c;
      return this.#o.cdpTarget.cdpClient.sendCommand(`Input.dispatchKeyEvent`, {
        type: `keyUp`,
        windowsVirtualKeyCode: Yt[i],
        key: i,
        code: a,
        text: l,
        unmodifiedText: c,
        location: o < 3 ? o : void 0,
        isSystemKey: e.alt || void 0,
        isKeypad: o === 3,
        modifiers: s,
      });
    }
  },
  en = (e, t, n) =>
    n
      ? e
      : e === `Enter`
        ? `\r`
        : [...e].length === 1
          ? t.shift
            ? e.toLocaleUpperCase(`en-US`)
            : e
          : void 0,
  tn = (e, t) => {
    if (t.ctrl) {
      switch (e) {
        case `Digit2`:
          if (t.shift) return `\0`;
          break;
        case `KeyA`:
          return ``;
        case `KeyB`:
          return ``;
        case `KeyC`:
          return ``;
        case `KeyD`:
          return ``;
        case `KeyE`:
          return ``;
        case `KeyF`:
          return ``;
        case `KeyG`:
          return `\x07`;
        case `KeyH`:
          return `\b`;
        case `KeyI`:
          return `	`;
        case `KeyJ`:
          return `
`;
        case `KeyK`:
          return `\v`;
        case `KeyL`:
          return `\f`;
        case `KeyM`:
          return `\r`;
        case `KeyN`:
          return ``;
        case `KeyO`:
          return ``;
        case `KeyP`:
          return ``;
        case `KeyQ`:
          return ``;
        case `KeyR`:
          return ``;
        case `KeyS`:
          return ``;
        case `KeyT`:
          return ``;
        case `KeyU`:
          return ``;
        case `KeyV`:
          return ``;
        case `KeyW`:
          return ``;
        case `KeyX`:
          return ``;
        case `KeyY`:
          return ``;
        case `KeyZ`:
          return ``;
        case `BracketLeft`:
          return `\x1B`;
        case `Backslash`:
          return ``;
        case `BracketRight`:
          return ``;
        case `Digit6`:
          if (t.shift) return ``;
          break;
        case `Minus`:
          return ``;
      }
      return ``;
    }
    if (t.alt) return ``;
  };
function nn(e) {
  switch (e) {
    case 0:
      return `left`;
    case 1:
      return `middle`;
    case 2:
      return `right`;
    case 3:
      return `back`;
    case 4:
      return `forward`;
    default:
      return `none`;
  }
}
function rn(e) {
  let t = e.altitudeAngle ?? Math.PI / 2,
    n = e.azimuthAngle ?? 0,
    r = 0,
    i = 0;
  if (
    (t === 0 &&
      ((n === 0 || n === 2 * Math.PI) && (r = Math.PI / 2),
      n === Math.PI / 2 && (i = Math.PI / 2),
      n === Math.PI && (r = -Math.PI / 2),
      n === (3 * Math.PI) / 2 && (i = -Math.PI / 2),
      n > 0 && n < Math.PI / 2 && ((r = Math.PI / 2), (i = Math.PI / 2)),
      n > Math.PI / 2 && n < Math.PI && ((r = -Math.PI / 2), (i = Math.PI / 2)),
      n > Math.PI && n < (3 * Math.PI) / 2 && ((r = -Math.PI / 2), (i = -Math.PI / 2)),
      n > (3 * Math.PI) / 2 && n < 2 * Math.PI && ((r = Math.PI / 2), (i = -Math.PI / 2))),
    t !== 0)
  ) {
    let e = Math.tan(t);
    ((r = Math.atan(Math.cos(n) / e)), (i = Math.atan(Math.sin(n) / e)));
  }
  let a = 180 / Math.PI;
  return { tiltX: Math.round(r * a), tiltY: Math.round(i * a) };
}
function an(e, t) {
  return { radiusX: e ? e / 2 : 0.5, radiusY: t ? t / 2 : 0.5 };
}
var on = class {
    #e = !1;
    #t = [];
    acquire() {
      let e = { resolved: !1 };
      return this.#e
        ? new Promise((t) => {
            this.#t.push(() => t(this.#n.bind(this, e)));
          })
        : ((this.#e = !0), Promise.resolve(this.#n.bind(this, e)));
    }
    #n(e) {
      if (e.resolved) throw Error(`Cannot release more than once.`);
      e.resolved = !0;
      let t = this.#t.shift();
      if (!t) {
        this.#e = !1;
        return;
      }
      t();
    }
    async run(e) {
      let t = await this.acquire();
      try {
        return await e();
      } finally {
        t();
      }
    }
  },
  sn = class {
    cancelList = [];
    #e = new Map();
    #t = new on();
    getOrCreate(e, t, n) {
      let r = this.#e.get(e);
      if (!r) {
        switch (t) {
          case `none`:
            r = new Ht();
            break;
          case `key`:
            r = new Ut();
            break;
          case `pointer`: {
            let e = n === `mouse` ? 0 : 2,
              t = new Set();
            for (let [, e] of this.#e) e.type === `pointer` && t.add(e.pointerId);
            for (; t.has(e); ) ++e;
            r = new Wt(e, n);
            break;
          }
          case `wheel`:
            r = new Gt();
            break;
          default:
            throw new R(
              `Expected "none", "key", "pointer", or "wheel". Found unknown source type ${t}.`
            );
        }
        return (this.#e.set(e, r), r);
      }
      if (r.type !== t) throw new R(`Input source type of ${e} is ${r.type}, but received ${t}.`);
      return r;
    }
    get(e) {
      let t = this.#e.get(e);
      if (!t) throw new z(`Internal error.`);
      return t;
    }
    getGlobalKeyState() {
      let e = new Ut();
      for (let [, t] of this.#e)
        if (t.type === `key`) {
          for (let n of t.pressed) e.pressed.add(n);
          ((e.alt ||= t.alt), (e.ctrl ||= t.ctrl), (e.meta ||= t.meta), (e.shift ||= t.shift));
        }
      return e;
    }
    get queue() {
      return this.#t;
    }
  },
  cn = class extends WeakMap {
    get(e) {
      return (V(e.isTopLevelContext()), this.has(e) || this.set(e, new sn()), super.get(e));
    }
  },
  ln = class {
    #e;
    #t = new cn();
    constructor(e) {
      this.#e = e;
    }
    async performActions(e) {
      let t = this.#e.getContext(e.context),
        n = this.#t.get(t.top),
        r = this.#n(e, n);
      return (
        await new $t(n, this.#e, e.context, await $t.isMacOS(t).catch(() => !1)).dispatchActions(r),
        {}
      );
    }
    async releaseActions(e) {
      let t = this.#e.getContext(e.context),
        n = t.top,
        r = this.#t.get(n);
      return (
        await new $t(
          r,
          this.#e,
          e.context,
          await $t.isMacOS(t).catch(() => !1)
        ).dispatchTickActions(r.cancelList.reverse()),
        this.#t.delete(n),
        {}
      );
    }
    async setFiles(e) {
      let t = await this.#e.getContext(e.context).getOrCreateHiddenSandbox(),
        n;
      try {
        n = await t.callFunction(
          String(function (e) {
            if (!(this instanceof HTMLInputElement)) return +(this instanceof Element);
            if (this.type !== `file`) return 2;
            if (this.disabled) return 3;
            if (e > 1 && !this.multiple) return 4;
          }),
          !1,
          e.element,
          [{ type: `number`, value: e.files.length }]
        );
      } catch {
        throw new yt(`Could not find element ${e.element.sharedId}`);
      }
      if ((V(n.type === `success`), n.result.type === `number`))
        switch (n.result.value) {
          case 0:
            throw new mt(`Could not find element ${e.element.sharedId}`);
          case 1:
            throw new Et(`Element ${e.element.sharedId} is not a input`);
          case 2:
            throw new Et(`Input element ${e.element.sharedId} is not a file type`);
          case 3:
            throw new Et(`Input element ${e.element.sharedId} is disabled`);
          case 4:
            throw new Et(`Cannot set multiple files on a non-multiple input element`);
        }
      if (e.files.length === 0)
        return (
          await t.callFunction(
            String(function () {
              if (this.files?.length === 0) {
                this.dispatchEvent(new Event(`cancel`, { bubbles: !0 }));
                return;
              }
              ((this.files = new DataTransfer().files),
                this.dispatchEvent(new Event(`input`, { bubbles: !0, composed: !0 })),
                this.dispatchEvent(new Event(`change`, { bubbles: !0 })));
            }),
            !1,
            e.element
          ),
          {}
        );
      let r = [];
      for (let n = 0; n < e.files.length; ++n) {
        let n = await t.callFunction(
          String(function (e) {
            return this.files?.item(e);
          }),
          !1,
          e.element,
          [{ type: `number`, value: 0 }],
          `root`
        );
        if ((V(n.type === `success`), n.result.type !== `object`)) break;
        let { handle: i } = n.result;
        V(i !== void 0);
        let { path: a } = await t.cdpClient.sendCommand(`DOM.getFileInfo`, { objectId: i });
        (r.push(a), t.disown(i).catch(void 0));
      }
      r.sort();
      let i = [...e.files].sort();
      if (r.length !== e.files.length || i.some((e, t) => r[t] !== e)) {
        let { objectId: n } = await t.deserializeForCdp(e.element);
        (V(n !== void 0),
          await t.cdpClient.sendCommand(`DOM.setFileInputFiles`, { files: e.files, objectId: n }));
      } else
        await t.callFunction(
          String(function () {
            this.dispatchEvent(new Event(`cancel`, { bubbles: !0 }));
          }),
          !1,
          e.element
        );
      return {};
    }
    #n(e, t) {
      let n = [];
      for (let r of e.actions) {
        switch (r.type) {
          case `pointer`: {
            ((r.parameters ??= { pointerType: `mouse` }), (r.parameters.pointerType ??= `mouse`));
            let e = t.getOrCreate(r.id, `pointer`, r.parameters.pointerType);
            if (e.subtype !== r.parameters.pointerType)
              throw new R(
                `Expected input source ${r.id} to be ${e.subtype}; got ${r.parameters.pointerType}.`
              );
            e.resetClickCount();
            break;
          }
          default:
            t.getOrCreate(r.id, r.type);
        }
        let e = r.actions.map((e) => ({ id: r.id, action: e }));
        for (let t = 0; t < e.length; t++) (n.length === t && n.push([]), n[t].push(e[t]));
      }
      return n;
    }
  };
function un(e) {
  return `atob` in globalThis ? globalThis.atob(e) : Buffer.from(e, `base64`).toString(`ascii`);
}
function dn(e) {
  let t = e.reduce((e, t) => `${e}${t.name}: ${t.value.value}\r\n`, ``);
  return new TextEncoder().encode(t).length;
}
function fn(e) {
  return pn(new TextEncoder().encode(e));
}
function pn(e) {
  let t = 65534,
    n = [];
  for (let r = 0; r < e.length; r += t) {
    let i = e.subarray(r, r + t);
    n.push(String.fromCodePoint.apply(null, i));
  }
  let r = n.join(``);
  return btoa(r);
}
function mn(e) {
  return e
    ? Object.entries(e).map(([e, t]) => ({ name: e, value: { type: `string`, value: t } }))
    : [];
}
function hn(e) {
  if (e !== void 0) return e.map(({ name: e, value: t }) => ({ name: e, value: t.value }));
}
function gn(e) {
  if (e !== void 0)
    return {
      name: `Cookie`,
      value: {
        type: `string`,
        value: e.reduce((e, t, n) => {
          n > 0 && (e += `;`);
          let r = t.value.type === `base64` ? btoa(t.value.value) : t.value.value;
          return ((e += `${t.name}=${r}`), e);
        }, ``),
      },
    };
}
function _n(e) {
  switch (e) {
    case `default`:
      return `Default`;
    case `cancel`:
      return `CancelAuth`;
    case `provideCredentials`:
      return `ProvideCredentials`;
  }
}
function vn(e) {
  let t = {
    name: e.name,
    value: { type: `string`, value: e.value },
    domain: e.domain,
    path: e.path,
    size: e.size,
    httpOnly: e.httpOnly,
    secure: e.secure,
    sameSite: e.sameSite === void 0 ? `none` : xn(e.sameSite),
    ...(e.expires >= 0 ? { expiry: Math.round(e.expires) } : void 0),
  };
  return (
    (t[`goog:session`] = e.session),
    (t[`goog:priority`] = e.priority),
    (t[`goog:sourceScheme`] = e.sourceScheme),
    (t[`goog:sourcePort`] = e.sourcePort),
    e.partitionKey !== void 0 && (t[`goog:partitionKey`] = e.partitionKey),
    e.partitionKeyOpaque !== void 0 && (t[`goog:partitionKeyOpaque`] = e.partitionKeyOpaque),
    t
  );
}
function yn(e) {
  return e.type === `base64` ? un(e.value) : e.value;
}
function bn(e, t) {
  let n = yn(e.cookie.value),
    r = {
      name: e.cookie.name,
      value: n,
      domain: e.cookie.domain,
      path: e.cookie.path ?? `/`,
      secure: e.cookie.secure ?? !1,
      httpOnly: e.cookie.httpOnly ?? !1,
      ...(t.sourceOrigin !== void 0 && {
        partitionKey: { hasCrossSiteAncestor: !1, topLevelSite: t.sourceOrigin },
      }),
      ...(e.cookie.expiry !== void 0 && { expires: e.cookie.expiry }),
      ...(e.cookie.sameSite !== void 0 && { sameSite: Sn(e.cookie.sameSite) }),
    };
  return (
    e.cookie[`goog:url`] !== void 0 && (r.url = e.cookie[`goog:url`]),
    e.cookie[`goog:priority`] !== void 0 && (r.priority = e.cookie[`goog:priority`]),
    e.cookie[`goog:sourceScheme`] !== void 0 && (r.sourceScheme = e.cookie[`goog:sourceScheme`]),
    e.cookie[`goog:sourcePort`] !== void 0 && (r.sourcePort = e.cookie[`goog:sourcePort`]),
    r
  );
}
function xn(e) {
  switch (e) {
    case `Strict`:
      return `strict`;
    case `None`:
      return `none`;
    case `Lax`:
      return `lax`;
    default:
      return `lax`;
  }
}
function Sn(e) {
  switch (e) {
    case `none`:
      return `None`;
    case `strict`:
      return `Strict`;
    case `default`:
    case `lax`:
      return `Lax`;
  }
  throw new R(`Unknown 'sameSite' value ${e}`);
}
function Cn(e) {
  return [`ftp`, `file`, `http`, `https`, `ws`, `wss`].includes(e.replace(/:$/, ``));
}
function wn(e) {
  return e.protocol.replace(/:$/, ``);
}
function Tn(e, t) {
  let n = new URL(t);
  return !(
    (e.protocol !== void 0 && e.protocol !== wn(n)) ||
    (e.hostname !== void 0 && e.hostname !== n.hostname) ||
    (e.port !== void 0 && e.port !== n.port) ||
    (e.pathname !== void 0 && e.pathname !== n.pathname) ||
    (e.search !== void 0 && e.search !== n.search)
  );
}
function En(e) {
  let t = 0;
  for (let n of e) t += atob(n.bytes ?? ``).length;
  return t;
}
function H(e, t = 0) {
  return !e || e <= 0 || e + t <= 0 ? 0 : e + t;
}
var Dn = class e {
  #e;
  #t;
  #n;
  #r;
  constructor(e, t, n, r) {
    ((this.#n = n), (this.#e = e), (this.#t = t), (this.#r = r));
  }
  async addIntercept(t) {
    this.#e.verifyTopLevelContextsList(t.contexts);
    let n = t.urlPatterns ?? [],
      r = e.parseUrlPatterns(n),
      i = this.#t.addIntercept({ urlPatterns: r, phases: t.phases, contexts: t.contexts });
    return (await this.#i(), { intercept: i });
  }
  async continueRequest(t) {
    if (
      (t.url !== void 0 && e.parseUrlString(t.url),
      t.method !== void 0 && !e.isMethodValid(t.method))
    )
      throw new R(`Method '${t.method}' is invalid.`);
    t.headers && e.validateHeaders(t.headers);
    let n = this.#o(t.request, [`beforeRequestSent`]);
    try {
      await n.continueRequest(t);
    } catch (t) {
      throw e.wrapInterceptionError(t);
    }
    return {};
  }
  async continueResponse(t) {
    t.headers && e.validateHeaders(t.headers);
    let n = this.#o(t.request, [`authRequired`, `responseStarted`]);
    try {
      await n.continueResponse(t);
    } catch (t) {
      throw e.wrapInterceptionError(t);
    }
    return {};
  }
  async continueWithAuth(e) {
    let t = e.request;
    return (await this.#o(t, [`authRequired`]).continueWithAuth(e), {});
  }
  async failRequest({ request: e }) {
    let t = this.#a(e);
    if (t.interceptPhase === `authRequired`)
      throw new R(`Request '${e}' in 'authRequired' phase cannot be failed`);
    if (!t.interceptPhase) throw new bt(`No blocked request found for network id '${e}'`);
    return (await t.failRequest(`Failed`), {});
  }
  async provideResponse(t) {
    t.headers && e.validateHeaders(t.headers);
    let n = this.#o(t.request, [`beforeRequestSent`, `responseStarted`, `authRequired`]);
    try {
      await n.provideResponse(t);
    } catch (t) {
      throw e.wrapInterceptionError(t);
    }
    return {};
  }
  async #i() {
    await Promise.all(this.#e.getAllContexts().map((e) => e.cdpTarget.toggleNetwork()));
  }
  async removeIntercept(e) {
    return (this.#t.removeIntercept(e.intercept), await this.#i(), {});
  }
  async setCacheBehavior(e) {
    let t = this.#e.verifyTopLevelContextsList(e.contexts);
    if (t.size === 0)
      return (
        (this.#t.defaultCacheBehavior = e.cacheBehavior),
        await Promise.all(
          this.#e.getAllContexts().map((e) => e.cdpTarget.toggleSetCacheDisabled())
        ),
        {}
      );
    let n = e.cacheBehavior === `bypass`;
    return (
      await Promise.all([...t.values()].map((e) => e.cdpTarget.toggleSetCacheDisabled(n))),
      {}
    );
  }
  #a(e) {
    let t = this.#t.getRequestById(e);
    if (!t) throw new bt(`Network request with ID '${e}' doesn't exist`);
    return t;
  }
  #o(e, t) {
    let n = this.#a(e);
    if (!n.interceptPhase) throw new bt(`No blocked request found for network id '${e}'`);
    if (n.interceptPhase && !t.includes(n.interceptPhase))
      throw new R(`Blocked request for network id '${e}' is in '${n.interceptPhase}' phase`);
    return n;
  }
  static validateHeaders(e) {
    for (let t of e) {
      let e;
      if (
        ((e = t.value.type === `string` ? t.value.value : atob(t.value.value)),
        e !== e.trim() ||
          e.includes(`
`) ||
          e.includes(`\0`))
      )
        throw new R(`Header value '${e}' is not acceptable value`);
    }
  }
  static isMethodValid(e) {
    return /^[!#$%&'*+\-.^_`|~a-zA-Z\d]+$/.test(e);
  }
  static parseUrlString(e) {
    try {
      return new URL(e);
    } catch (t) {
      throw new R(`Invalid URL '${e}': ${t}`);
    }
  }
  static parseUrlPatterns(e) {
    return e.map((e) => {
      let t = ``,
        n = !0,
        r = !0,
        i = !0,
        a = !0,
        o = !0;
      switch (e.type) {
        case `string`:
          t = On(e.pattern);
          break;
        case `pattern`: {
          if (e.protocol === void 0) ((n = !1), (t += `http`));
          else {
            if (e.protocol === ``) throw new R(`URL pattern must specify a protocol`);
            if (((e.protocol = On(e.protocol)), !e.protocol.match(/^[a-zA-Z+-.]+$/)))
              throw new R(`Forbidden characters`);
            t += e.protocol;
          }
          let s = t.toLocaleLowerCase();
          if (((t += `:`), Cn(s) && (t += `//`), e.hostname === void 0))
            (s !== `file` && (t += `placeholder`), (r = !1));
          else {
            if (e.hostname === ``) throw new R(`URL pattern must specify a hostname`);
            if (e.protocol === `file`) throw new R(`URL pattern protocol cannot be 'file'`);
            e.hostname = On(e.hostname);
            let n = !1;
            for (let t of e.hostname) {
              if (t === `/` || t === `?` || t === `#`)
                throw new R(`'/', '?', '#' are forbidden in hostname`);
              if (!n && t === `:`) throw new R(`':' is only allowed inside brackets in hostname`);
              (t === `[` && (n = !0), t === `]` && (n = !1));
            }
            t += e.hostname;
          }
          if (e.port === void 0) i = !1;
          else {
            if (e.port === ``) throw new R(`URL pattern must specify a port`);
            if (((e.port = On(e.port)), (t += `:`), !e.port.match(/^\d+$/)))
              throw new R(`Forbidden characters`);
            t += e.port;
          }
          if (e.pathname === void 0) a = !1;
          else {
            if (
              ((e.pathname = On(e.pathname)),
              e.pathname[0] !== `/` && (t += `/`),
              e.pathname.includes(`#`) || e.pathname.includes(`?`))
            )
              throw new R(`Forbidden characters`);
            t += e.pathname;
          }
          if (e.search === void 0) o = !1;
          else {
            if (
              ((e.search = On(e.search)), e.search[0] !== `?` && (t += `?`), e.search.includes(`#`))
            )
              throw new R(`Forbidden characters`);
            t += e.search;
          }
          break;
        }
      }
      let s = (e) => {
        let t = { 'ftp:': 21, 'file:': null, 'http:': 80, 'https:': 443, 'ws:': 80, 'wss:': 443 };
        if (
          Cn(e.protocol) &&
          t[e.protocol] !== null &&
          (!e.port || String(t[e.protocol]) === e.port)
        )
          return ``;
        if (e.port) return e.port;
      };
      try {
        let e = new URL(t);
        return {
          protocol: n ? e.protocol.replace(/:$/, ``) : void 0,
          hostname: r ? e.hostname : void 0,
          port: i ? s(e) : void 0,
          pathname: a && e.pathname ? e.pathname : void 0,
          search: o ? e.search : void 0,
        };
      } catch (e) {
        throw new R(`${e.message} '${t}'`);
      }
    });
  }
  static wrapInterceptionError(e) {
    return e?.message.includes(`Invalid header`) || e?.message.includes(`Unsafe header`)
      ? new R(e.message)
      : e;
  }
  async addDataCollector(e) {
    if (e.userContexts !== void 0 && e.contexts !== void 0)
      throw new R(`'contexts' and 'userContexts' are mutually exclusive`);
    if (
      (e.userContexts !== void 0 && (await this.#n.verifyUserContextIdList(e.userContexts)),
      e.contexts !== void 0)
    ) {
      for (let t of e.contexts)
        if (!this.#e.getContext(t).isTopLevelContext())
          throw new R(`Data collectors are available only on top-level browsing contexts`);
    }
    let t = this.#t.addDataCollector(e);
    return (await this.#i(), { collector: t });
  }
  async getData(e) {
    return await this.#t.getCollectedData(e);
  }
  async removeDataCollector(e) {
    return (this.#t.removeDataCollector(e), await this.#i(), {});
  }
  disownData(e) {
    return (this.#t.disownData(e), {});
  }
  async #s(e, t) {
    if (e === void 0 && t === void 0) return this.#e.getTopLevelContexts();
    if (e !== void 0 && t !== void 0)
      throw new R(`User contexts and browsing contexts are mutually exclusive`);
    let n = [];
    if (t !== void 0) {
      if (t.length === 0) throw new R(`user context should be provided`);
      await this.#n.verifyUserContextIdList(t);
      for (let e of t) {
        let t = this.#e.getTopLevelContexts().filter((t) => t.userContext === e);
        n.push(...t);
      }
    }
    if (e !== void 0) {
      if (e.length === 0) throw new R(`browsing context should be provided`);
      for (let t of e) {
        let e = this.#e.getContext(t);
        if (!e.isTopLevelContext())
          throw new R(`The command is only supported on the top-level context`);
        n.push(e);
      }
    }
    return [...new Set(n).values()];
  }
  async setExtraHeaders(e) {
    let t = await this.#s(e.contexts, e.userContexts),
      n = Mn(e.headers);
    return (
      e.userContexts === void 0 &&
        e.contexts === void 0 &&
        this.#r.updateGlobalConfig({ extraHeaders: n }),
      e.userContexts !== void 0 &&
        e.userContexts.forEach((e) => {
          this.#r.updateUserContextConfig(e, { extraHeaders: n });
        }),
      e.contexts !== void 0 &&
        e.contexts.forEach((e) => {
          this.#r.updateBrowsingContextConfig(e, { extraHeaders: n });
        }),
      await Promise.all(
        t.map(async (e) => {
          let t = this.#r.getActiveConfig(e.id, e.userContext).extraHeaders ?? {};
          await e.setExtraHeaders(t);
        })
      ),
      {}
    );
  }
};
function On(e) {
  let t = new Set([`(`, `)`, `*`, `{`, `}`]),
    n = ``,
    r = !1;
  for (let i of e) {
    if (!r) {
      if (t.has(i)) throw new R(`Forbidden characters`);
      if (i === `\\`) {
        r = !0;
        continue;
      }
    }
    ((n += i), (r = !1));
  }
  return n;
}
var kn = new Set([
    ` `,
    `	`,
    `
`,
    `"`,
    `(`,
    `)`,
    `,`,
    `/`,
    `:`,
    `;`,
    `<`,
    `=`,
    `>`,
    `?`,
    `@`,
    `[`,
    `\\`,
    `]`,
    `{`,
    `}`,
  ]),
  An = new Set([
    `\0`,
    `
`,
    `\r`,
  ]);
function jn(e, t) {
  for (let n of e) if (t.has(n)) return !0;
  return !1;
}
function Mn(e) {
  let t = {};
  for (let n of e)
    if (n.value.type === `string`) {
      let e = n.name,
        r = n.value.value;
      if (e.length === 0) throw new R(`Empty header name is not allowed`);
      if (jn(e, kn)) throw new R(`Header name '${e}' contains forbidden symbols`);
      if (jn(r, An)) throw new R(`Header value '${r}' contains forbidden symbols`);
      if (r.trim() !== r)
        throw new R(`Header value should not contain trailing or ending whitespaces`);
      t[n.name] = n.value.value;
    } else throw new B(`Only string headers values are supported`);
  return t;
}
var Nn = class {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async setPermissions(e) {
    try {
      let t = e[`goog:userContext`] || e.userContext;
      await this.#e.sendCommand(`Browser.setPermission`, {
        origin: e.origin,
        embeddedOrigin: e.embeddedOrigin,
        browserContextId: t && t !== 'default' ? t : void 0,
        permission: { name: e.descriptor.name },
        setting: e.state,
      });
    } catch (e) {
      if (e.message === `Permission can't be granted to opaque origins.`) return {};
      throw new R(e.message);
    }
    return {};
  }
};
function Pn(e) {
  return e.reduce((e, t) => e + t.toString(16).padStart(2, `0`), ``);
}
function U() {
  if (`crypto` in globalThis && `randomUUID` in globalThis.crypto)
    return globalThis.crypto.randomUUID();
  let t = new Uint8Array(16);
  return (
    `crypto` in globalThis && `getRandomValues` in globalThis.crypto
      ? globalThis.crypto.getRandomValues(t)
      : e().webcrypto.getRandomValues(t),
    (t[6] = (t[6] & 15) | 64),
    (t[8] = (t[8] & 63) | 128),
    [
      Pn(t.subarray(0, 4)),
      Pn(t.subarray(4, 6)),
      Pn(t.subarray(6, 8)),
      Pn(t.subarray(8, 10)),
      Pn(t.subarray(10, 16)),
    ].join(`-`)
  );
}
var Fn = class e {
    #e;
    #t = U();
    #n;
    constructor(e, t) {
      ((this.#e = e), (this.#n = t));
    }
    async init(t, n) {
      let r = await e.#i(t),
        i = await e.#a(t, r);
      return (this.#o(t, r, n), i);
    }
    async startListenerFromWindow(e, t) {
      try {
        let n = await this.#s(e);
        this.#o(e, n, t);
      } catch (e) {
        this.#n?.(j.debugError, e);
      }
    }
    static #r() {
      return `(${String(() => {
        let e = [],
          t = null;
        return {
          async getMessage() {
            return (
              await (e.length > 0
                ? Promise.resolve()
                : new Promise((e) => {
                    t = e;
                  })),
              e.shift()
            );
          },
          sendMessage(n) {
            (e.push(n), t !== null && (t(), (t = null)));
          },
        };
      })})()`;
    }
    static async #i(e) {
      let t = await e.cdpClient.sendCommand(`Runtime.evaluate`, {
        expression: this.#r(),
        contextId: e.executionContextId,
        serializationOptions: { serialization: `idOnly` },
      });
      if (t.exceptionDetails || t.result.objectId === void 0) throw Error(`Cannot create channel`);
      return t.result.objectId;
    }
    static async #a(e, t) {
      return (
        await e.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
          functionDeclaration: String((e) => e.sendMessage),
          arguments: [{ objectId: t }],
          executionContextId: e.executionContextId,
          serializationOptions: { serialization: `idOnly` },
        })
      ).result.objectId;
    }
    async #o(e, t, n) {
      for (;;)
        try {
          let r = await e.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
            functionDeclaration: String(async (e) => await e.getMessage()),
            arguments: [{ objectId: t }],
            awaitPromise: !0,
            executionContextId: e.executionContextId,
            serializationOptions: {
              serialization: `deep`,
              maxDepth: this.#e.serializationOptions?.maxObjectDepth ?? void 0,
            },
          });
          if (r.exceptionDetails)
            throw Error(`Runtime.callFunctionOn in ChannelProxy`, { cause: r.exceptionDetails });
          for (let t of e.associatedBrowsingContexts)
            n.registerEvent(
              {
                type: `event`,
                method: N.EventNames.Message,
                params: {
                  channel: this.#e.channel,
                  data: e.cdpToBidiValue(r, this.#e.ownership ?? `none`),
                  source: e.source,
                },
              },
              t.id
            );
        } catch (e) {
          this.#n?.(j.debugError, e);
          break;
        }
    }
    async #s(e) {
      let t = await e.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
        functionDeclaration: String((e) => {
          let t = window;
          if (t[e] === void 0) return new Promise((n) => (t[e] = n));
          let n = t[e];
          return (delete t[e], n);
        }),
        arguments: [{ value: this.#t }],
        executionContextId: e.executionContextId,
        awaitPromise: !0,
        serializationOptions: { serialization: `idOnly` },
      });
      if (t.exceptionDetails !== void 0 || t.result.objectId === void 0)
        throw Error(`ChannelHandle not found in window["${this.#t}"]`);
      return t.result.objectId;
    }
    getEvalInWindowStr() {
      let t = String((e, t) => {
          let n = window;
          return (n[e] === void 0 ? (n[e] = t) : (n[e](t), delete n[e]), t.sendMessage);
        }),
        n = e.#r();
      return `(${t})('${this.#t}',${n})`;
    }
  },
  In = class {
    #e = U();
    #t = [];
    #n;
    #r = new Set();
    #i;
    #a;
    #o;
    #s;
    get id() {
      return this.#e;
    }
    get targetIds() {
      return this.#r;
    }
    constructor(e, t) {
      ((this.#i = e.arguments?.map((e) => new Fn(e.value, t)) ?? []),
        (this.#n = e.functionDeclaration),
        (this.#a = e.sandbox),
        (this.#o = e.contexts),
        (this.#s = e.userContexts));
    }
    get channels() {
      return this.#i;
    }
    get contexts() {
      return this.#o;
    }
    get userContexts() {
      return this.#s;
    }
    #c() {
      let e = `[${this.channels.map((e) => e.getEvalInWindowStr()).join(`, `)}]`;
      return `(()=>{(${this.#n})(...${e})})()`;
    }
    async initInTargets(e, t) {
      await Promise.all(Array.from(e).map((e) => this.initInTarget(e, t)));
    }
    async initInTarget(e, t) {
      let n = await e.cdpClient.sendCommand(`Page.addScriptToEvaluateOnNewDocument`, {
        source: this.#c(),
        worldName: this.#a,
        runImmediately: t,
      });
      (this.#t.push({ target: e, preloadScriptId: n.identifier }), this.#r.add(e.id));
    }
    async remove() {
      await Promise.all([
        this.#t.map(async (e) => {
          let t = e.target,
            n = e.preloadScriptId;
          return await t.cdpClient.sendCommand(`Page.removeScriptToEvaluateOnNewDocument`, {
            identifier: n,
          });
        }),
      ]);
    }
    dispose(e) {
      ((this.#t = this.#t.filter((t) => t.target?.id !== e)), this.#r.delete(e));
    }
  },
  Ln = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    constructor(e, t, n, r, i, a) {
      ((this.#t = t),
        (this.#n = n),
        (this.#r = r),
        (this.#i = i),
        (this.#a = a),
        (this.#e = e),
        this.#e.addSubscribeHook(N.EventNames.RealmCreated, this.#o.bind(this)));
    }
    #o(e) {
      let t = this.#t.getContext(e),
        n = [t, ...this.#t.getContext(e).allChildren],
        r = new Set();
      for (let e of n) {
        let t = this.#n.findRealms({ browsingContextId: e.id });
        for (let e of t) r.add(e);
      }
      for (let e of r)
        this.#e.registerEvent(
          { type: `event`, method: N.EventNames.RealmCreated, params: e.realmInfo },
          t.id
        );
      return Promise.resolve();
    }
    async addPreloadScript(e) {
      if (e.userContexts?.length && e.contexts?.length)
        throw new R(`Both userContexts and contexts cannot be specified.`);
      let t = await this.#i.verifyUserContextIdList(e.userContexts ?? []),
        n = this.#t.verifyTopLevelContextsList(e.contexts),
        r = new In(e, this.#a);
      this.#r.add(r);
      let i = [];
      i = t.size
        ? this.#t.getTopLevelContexts().filter((e) => t.has(e.userContext))
        : n.size
          ? [...n.values()]
          : this.#t.getTopLevelContexts();
      let a = new Set(i.map((e) => e.cdpTarget));
      return (await r.initInTargets(a, !1), { script: r.id });
    }
    async removePreloadScript(e) {
      let { script: t } = e;
      return (await this.#r.getPreloadScript(t).remove(), this.#r.remove(t), {});
    }
    async callFunction(e) {
      return await (
        await this.#s(e.target)
      ).callFunction(
        e.functionDeclaration,
        e.awaitPromise,
        e.this,
        e.arguments,
        e.resultOwnership,
        e.serializationOptions,
        e.userActivation
      );
    }
    async evaluate(e) {
      return await (
        await this.#s(e.target)
      ).evaluate(
        e.expression,
        e.awaitPromise,
        e.resultOwnership,
        e.serializationOptions,
        e.userActivation
      );
    }
    async disown(e) {
      let t = await this.#s(e.target);
      return (await Promise.all(e.handles.map(async (e) => await t.disown(e))), {});
    }
    getRealms(e) {
      return (
        e.context !== void 0 && this.#t.getContext(e.context),
        {
          realms: this.#n
            .findRealms({ browsingContextId: e.context, type: e.type, isHidden: !1 })
            .map((e) => e.realmInfo),
        }
      );
    }
    async #s(e) {
      return `context` in e
        ? await this.#t.getContext(e.context).getOrCreateUserSandbox(e.sandbox)
        : this.#n.getRealm({ realmId: e.realm, isHidden: !1 });
    }
  },
  Rn = class {
    #e;
    #t;
    #n;
    #r = !1;
    constructor(e, t, n) {
      ((this.#e = e), (this.#t = t), (this.#n = n));
    }
    status() {
      return { ready: !1, message: `already connected` };
    }
    #i(e) {
      let t = [];
      for (let n of e.firstMatch ?? [{}]) {
        let r = { ...e.alwaysMatch };
        for (let e of Object.keys(n)) {
          if (r[e] !== void 0)
            throw new R(`Capability ${e} in firstMatch is already defined in alwaysMatch`);
          r[e] = n[e];
        }
        t.push(r);
      }
      let n = t.find((e) => e.browserName === `chrome`) ?? t[0] ?? {};
      return ((n.unhandledPromptBehavior = this.#a(n.unhandledPromptBehavior)), n);
    }
    #a(e) {
      if (e !== void 0) {
        if (typeof e == `object`) return e;
        if (typeof e != `string`)
          throw new R(`Unexpected 'unhandledPromptBehavior' type: ${typeof e}`);
        switch (e) {
          case `accept`:
          case `accept and notify`:
            return { default: `accept`, beforeUnload: `accept` };
          case `dismiss`:
          case `dismiss and notify`:
            return { default: `dismiss`, beforeUnload: `accept` };
          case `ignore`:
            return { default: `ignore`, beforeUnload: `accept` };
          default:
            throw new R(`Unexpected 'unhandledPromptBehavior' value: ${e}`);
        }
      }
    }
    async new(e) {
      if (this.#r) throw Error(`Session has been already created.`);
      this.#r = !0;
      let t = this.#i(e.capabilities);
      await this.#n(t);
      let n = await this.#t.sendCommand(`Browser.getVersion`);
      return {
        sessionId: `unknown`,
        capabilities: {
          ...t,
          acceptInsecureCerts: t.acceptInsecureCerts ?? !1,
          browserName: n.product,
          browserVersion: n.revision,
          platformName: ``,
          setWindowRect: !1,
          webSocketUrl: ``,
          userAgent: n.userAgent,
        },
      };
    }
    async subscribe(e, t = null) {
      return {
        subscription: await this.#e.subscribe(e.events, e.contexts ?? [], e.userContexts ?? [], t),
      };
    }
    async unsubscribe(e, t = null) {
      return `subscriptions` in e
        ? (await this.#e.unsubscribeByIds(e.subscriptions), {})
        : (await this.#e.unsubscribe(e.events, t), {});
    }
  },
  zn = class {
    #e;
    #t;
    #n;
    constructor(e, t, n) {
      ((this.#t = t), (this.#e = e), (this.#n = n));
    }
    async deleteCookies(e) {
      let t = this.#s(e.partition),
        n;
      try {
        n = await this.#e.sendCommand(`Storage.getCookies`, { browserContextId: this.#i(t) });
      } catch (e) {
        throw this.#r(e) ? new St(e.message) : e;
      }
      let r = n.cookies
        .filter((e) => t.sourceOrigin === void 0 || e.partitionKey?.topLevelSite === t.sourceOrigin)
        .filter((t) => {
          let n = vn(t);
          return this.#c(n, e.filter);
        })
        .map((e) => ({ ...e, expires: 1 }));
      return (
        await this.#e.sendCommand(`Storage.setCookies`, {
          cookies: r,
          browserContextId: this.#i(t),
        }),
        { partitionKey: t }
      );
    }
    async getCookies(e) {
      let t = this.#s(e.partition),
        n;
      try {
        n = await this.#e.sendCommand(`Storage.getCookies`, { browserContextId: this.#i(t) });
      } catch (e) {
        throw this.#r(e) ? new St(e.message) : e;
      }
      return {
        cookies: n.cookies
          .filter(
            (e) => t.sourceOrigin === void 0 || e.partitionKey?.topLevelSite === t.sourceOrigin
          )
          .map((e) => vn(e))
          .filter((t) => this.#c(t, e.filter)),
        partitionKey: t,
      };
    }
    async setCookie(e) {
      let t = this.#s(e.partition),
        n = bn(e, t);
      try {
        await this.#e.sendCommand(`Storage.setCookies`, {
          cookies: [n],
          browserContextId: this.#i(t),
        });
      } catch (e) {
        throw this.#r(e) ? new St(e.message) : (this.#n?.(j.debugError, e), new Tt(e.toString()));
      }
      return { partitionKey: t };
    }
    #r(e) {
      return e.message?.startsWith(`Failed to find browser context for id`);
    }
    #i(e) {
      return e.userContext === 'default' ? void 0 : e.userContext;
    }
    #a(e) {
      let t = e.context;
      return { userContext: this.#t.getContext(t).userContext };
    }
    #o(e) {
      let t = new Map(),
        n = e.sourceOrigin;
      if (n !== void 0) {
        let e = Dn.parseUrlString(n);
        n = e.origin === `null` ? e.origin : `${e.protocol}//${e.hostname}`;
      }
      for (let [n, r] of Object.entries(e))
        n !== void 0 &&
          r !== void 0 &&
          ![`type`, `sourceOrigin`, `userContext`].includes(n) &&
          t.set(n, r);
      return (
        t.size > 0 &&
          this.#n?.(
            j.debugInfo,
            `Unsupported partition keys: ${JSON.stringify(Object.fromEntries(t))}`
          ),
        { userContext: e.userContext ?? `default`, ...(n === void 0 ? {} : { sourceOrigin: n }) }
      );
    }
    #s(e) {
      return e === void 0
        ? { userContext: `default` }
        : e.type === `context`
          ? this.#a(e)
          : (V(e.type === `storageKey`, `Unknown partition type`), this.#o(e));
    }
    #c(e, t) {
      return t === void 0
        ? !0
        : (t.domain === void 0 || t.domain === e.domain) &&
            (t.name === void 0 || t.name === e.name) &&
            (t.value === void 0 || yn(t.value) === yn(e.value)) &&
            (t.path === void 0 || t.path === e.path) &&
            (t.size === void 0 || t.size === e.size) &&
            (t.httpOnly === void 0 || t.httpOnly === e.httpOnly) &&
            (t.secure === void 0 || t.secure === e.secure) &&
            (t.sameSite === void 0 || t.sameSite === e.sameSite) &&
            (t.expiry === void 0 || t.expiry === e.expiry);
    }
  },
  Bn = class {
    #e;
    constructor(e) {
      this.#e = e;
    }
    async install(e) {
      switch (e.extensionData.type) {
        case `archivePath`:
        case `base64`:
          throw new B(`Archived and Base64 extensions are not supported`);
        case `path`:
          break;
      }
      try {
        return {
          extension: (
            await this.#e.sendCommand(`Extensions.loadUnpacked`, { path: e.extensionData.path })
          ).id,
        };
      } catch (e) {
        throw e.message.startsWith(`invalid web extension`) ? new Dt(e.message) : e;
      }
    }
    async uninstall(e) {
      try {
        return (await this.#e.sendCommand(`Extensions.uninstall`, { id: e.extension }), {});
      } catch (e) {
        throw e.message === `Uninstall failed. Reason: could not find extension.`
          ? new Ot(`no such web extension`)
          : e;
      }
    }
  },
  W = class e {
    #e;
    #t;
    constructor(e, t = null) {
      ((this.#e = e), (this.#t = t));
    }
    static createFromPromise(t, n) {
      return t.then((t) =>
        t.kind === `success` ? { kind: `success`, value: new e(t.value, n) } : t
      );
    }
    static createResolved(t, n = null) {
      return Promise.resolve({ kind: `success`, value: new e(t, n) });
    }
    get message() {
      return this.#e;
    }
    get googChannel() {
      return this.#t;
    }
  },
  Vn = class extends it {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o;
    #s;
    #c;
    #l;
    #u;
    #d;
    #f;
    #p;
    #m;
    constructor(e, t, n, r, i, a, o, s, c, l, u = new jt(), d, f) {
      (super(),
        (this.#t = t),
        (this.#p = u),
        (this.#m = f),
        (this.#e = c),
        (this.#n = new Mt(t, r, s, l)),
        (this.#r = new Ft(t, r, l, s, n)),
        (this.#i = new Pt(r, i, e, t)),
        (this.#a = new It(r, l, s)),
        (this.#o = new ln(r)),
        (this.#s = new Dn(r, o, l, s)),
        (this.#c = new Nn(t)),
        (this.#l = new Ln(n, r, i, a, l, f)),
        (this.#u = new Rn(n, t, d)),
        (this.#d = new zn(t, r, f)),
        (this.#f = new Bn(t)));
    }
    async #h(e) {
      switch (e.method) {
        case `bluetooth.disableSimulation`:
          return await this.#e.disableSimulation(
            this.#p.parseDisableSimulationParameters(e.params)
          );
        case `bluetooth.handleRequestDevicePrompt`:
          return await this.#e.handleRequestDevicePrompt(
            this.#p.parseHandleRequestDevicePromptParams(e.params)
          );
        case `bluetooth.simulateAdapter`:
          return await this.#e.simulateAdapter(this.#p.parseSimulateAdapterParameters(e.params));
        case `bluetooth.simulateAdvertisement`:
          return await this.#e.simulateAdvertisement(
            this.#p.parseSimulateAdvertisementParameters(e.params)
          );
        case `bluetooth.simulateCharacteristic`:
          return await this.#e.simulateCharacteristic(
            this.#p.parseSimulateCharacteristicParameters(e.params)
          );
        case `bluetooth.simulateCharacteristicResponse`:
          return await this.#e.simulateCharacteristicResponse(
            this.#p.parseSimulateCharacteristicResponseParameters(e.params)
          );
        case `bluetooth.simulateDescriptor`:
          return await this.#e.simulateDescriptor(
            this.#p.parseSimulateDescriptorParameters(e.params)
          );
        case `bluetooth.simulateDescriptorResponse`:
          return await this.#e.simulateDescriptorResponse(
            this.#p.parseSimulateDescriptorResponseParameters(e.params)
          );
        case `bluetooth.simulateGattConnectionResponse`:
          return await this.#e.simulateGattConnectionResponse(
            this.#p.parseSimulateGattConnectionResponseParameters(e.params)
          );
        case `bluetooth.simulateGattDisconnection`:
          return await this.#e.simulateGattDisconnection(
            this.#p.parseSimulateGattDisconnectionParameters(e.params)
          );
        case `bluetooth.simulatePreconnectedPeripheral`:
          return await this.#e.simulatePreconnectedPeripheral(
            this.#p.parseSimulatePreconnectedPeripheralParameters(e.params)
          );
        case `bluetooth.simulateService`:
          return await this.#e.simulateService(this.#p.parseSimulateServiceParameters(e.params));
        case `browser.close`:
          return this.#n.close();
        case `browser.createUserContext`:
          return await this.#n.createUserContext(
            this.#p.parseCreateUserContextParameters(e.params)
          );
        case `browser.getClientWindows`:
          return await this.#n.getClientWindows();
        case `browser.getUserContexts`:
          return await this.#n.getUserContexts();
        case `browser.removeUserContext`:
          return await this.#n.removeUserContext(
            this.#p.parseRemoveUserContextParameters(e.params)
          );
        case `browser.setClientWindowState`:
          return await this.#n.setClientWindowState(
            this.#p.parseSetClientWindowStateParameters(e.params)
          );
        case `browser.setDownloadBehavior`:
          return await this.#n.setDownloadBehavior(
            this.#p.parseSetDownloadBehaviorParameters(e.params)
          );
        case `browsingContext.activate`:
          return await this.#r.activate(this.#p.parseActivateParams(e.params));
        case `browsingContext.captureScreenshot`:
          return await this.#r.captureScreenshot(this.#p.parseCaptureScreenshotParams(e.params));
        case `browsingContext.close`:
          return await this.#r.close(this.#p.parseCloseParams(e.params));
        case `browsingContext.create`:
          return await this.#r.create(this.#p.parseCreateParams(e.params));
        case `browsingContext.getTree`:
          return this.#r.getTree(this.#p.parseGetTreeParams(e.params));
        case `browsingContext.handleUserPrompt`:
          return await this.#r.handleUserPrompt(this.#p.parseHandleUserPromptParams(e.params));
        case `browsingContext.locateNodes`:
          return await this.#r.locateNodes(this.#p.parseLocateNodesParams(e.params));
        case `browsingContext.navigate`:
          return await this.#r.navigate(this.#p.parseNavigateParams(e.params));
        case `browsingContext.print`:
          return await this.#r.print(this.#p.parsePrintParams(e.params));
        case `browsingContext.reload`:
          return await this.#r.reload(this.#p.parseReloadParams(e.params));
        case `browsingContext.setBypassCSP`:
          throw (
            this.#p.parseSetBypassCspParams(e.params),
            new B(`Method ${e.method} is not implemented.`)
          );
        case `browsingContext.setViewport`:
          return await this.#r.setViewport(this.#p.parseSetViewportParams(e.params));
        case `browsingContext.traverseHistory`:
          return await this.#r.traverseHistory(this.#p.parseTraverseHistoryParams(e.params));
        case `goog:cdp.getSession`:
          return this.#i.getSession(this.#p.parseGetSessionParams(e.params));
        case `goog:cdp.resolveRealm`:
          return this.#i.resolveRealm(this.#p.parseResolveRealmParams(e.params));
        case `goog:cdp.sendCommand`:
          return await this.#i.sendCommand(this.#p.parseSendCommandParams(e.params));
        case `emulation.setForcedColorsModeThemeOverride`:
          throw (
            this.#p.parseSetForcedColorsModeThemeOverrideParams(e.params),
            new B(`Method ${e.method} is not implemented.`)
          );
        case `emulation.setGeolocationOverride`:
          return await this.#a.setGeolocationOverride(
            this.#p.parseSetGeolocationOverrideParams(e.params)
          );
        case `emulation.setLocaleOverride`:
          return await this.#a.setLocaleOverride(this.#p.parseSetLocaleOverrideParams(e.params));
        case `emulation.setNetworkConditions`:
          return await this.#a.setNetworkConditions(
            this.#p.parseSetNetworkConditionsParams(e.params)
          );
        case `emulation.setScreenOrientationOverride`:
          return await this.#a.setScreenOrientationOverride(
            this.#p.parseSetScreenOrientationOverrideParams(e.params)
          );
        case `emulation.setScreenSettingsOverride`:
          return await this.#a.setScreenSettingsOverride(
            this.#p.parseSetScreenSettingsOverrideParams(e.params)
          );
        case `emulation.setScriptingEnabled`:
          return await this.#a.setScriptingEnabled(
            this.#p.parseSetScriptingEnabledParams(e.params)
          );
        case `emulation.setScrollbarTypeOverride`:
          return await this.#a.setScrollbarTypeOverride(
            this.#p.parseSetScrollbarTypeOverrideParams(e.params)
          );
        case `emulation.setTimezoneOverride`:
          return await this.#a.setTimezoneOverride(
            this.#p.parseSetTimezoneOverrideParams(e.params)
          );
        case `emulation.setTouchOverride`:
          return await this.#a.setTouchOverride(this.#p.parseSetTouchOverrideParams(e.params));
        case `emulation.setUserAgentOverride`:
          return await this.#a.setUserAgentOverrideParams(
            this.#p.parseSetUserAgentOverrideParams(e.params)
          );
        case `userAgentClientHints.setClientHintsOverride`:
          return await this.#a.setClientHintsOverride(
            this.#p.parseSetClientHintsOverrideParams(e.params)
          );
        case `input.performActions`:
          return await this.#o.performActions(this.#p.parsePerformActionsParams(e.params));
        case `input.releaseActions`:
          return await this.#o.releaseActions(this.#p.parseReleaseActionsParams(e.params));
        case `input.setFiles`:
          return await this.#o.setFiles(this.#p.parseSetFilesParams(e.params));
        case `network.addDataCollector`:
          return await this.#s.addDataCollector(this.#p.parseAddDataCollectorParams(e.params));
        case `network.addIntercept`:
          return await this.#s.addIntercept(this.#p.parseAddInterceptParams(e.params));
        case `network.continueRequest`:
          return await this.#s.continueRequest(this.#p.parseContinueRequestParams(e.params));
        case `network.continueResponse`:
          return await this.#s.continueResponse(this.#p.parseContinueResponseParams(e.params));
        case `network.continueWithAuth`:
          return await this.#s.continueWithAuth(this.#p.parseContinueWithAuthParams(e.params));
        case `network.disownData`:
          return this.#s.disownData(this.#p.parseDisownDataParams(e.params));
        case `network.failRequest`:
          return await this.#s.failRequest(this.#p.parseFailRequestParams(e.params));
        case `network.getData`:
          return await this.#s.getData(this.#p.parseGetDataParams(e.params));
        case `network.provideResponse`:
          return await this.#s.provideResponse(this.#p.parseProvideResponseParams(e.params));
        case `network.removeDataCollector`:
          return await this.#s.removeDataCollector(
            this.#p.parseRemoveDataCollectorParams(e.params)
          );
        case `network.removeIntercept`:
          return await this.#s.removeIntercept(this.#p.parseRemoveInterceptParams(e.params));
        case `network.setCacheBehavior`:
          return await this.#s.setCacheBehavior(this.#p.parseSetCacheBehaviorParams(e.params));
        case `network.setExtraHeaders`:
          return await this.#s.setExtraHeaders(this.#p.parseSetExtraHeadersParams(e.params));
        case `permissions.setPermission`:
          return await this.#c.setPermissions(this.#p.parseSetPermissionsParams(e.params));
        case `script.addPreloadScript`:
          return await this.#l.addPreloadScript(this.#p.parseAddPreloadScriptParams(e.params));
        case `script.callFunction`:
          return await this.#l.callFunction(this.#p.parseCallFunctionParams(this.#g(e.params)));
        case `script.disown`:
          return await this.#l.disown(this.#p.parseDisownParams(this.#g(e.params)));
        case `script.evaluate`:
          return await this.#l.evaluate(this.#p.parseEvaluateParams(this.#g(e.params)));
        case `script.getRealms`:
          return this.#l.getRealms(this.#p.parseGetRealmsParams(e.params));
        case `script.removePreloadScript`:
          return await this.#l.removePreloadScript(
            this.#p.parseRemovePreloadScriptParams(e.params)
          );
        case `session.end`:
          throw new B(`Method ${e.method} is not implemented.`);
        case `session.new`:
          return await this.#u.new(e.params);
        case `session.status`:
          return this.#u.status();
        case `session.subscribe`:
          return await this.#u.subscribe(this.#p.parseSubscribeParams(e.params), e[`goog:channel`]);
        case `session.unsubscribe`:
          return await this.#u.unsubscribe(
            this.#p.parseUnsubscribeParams(e.params),
            e[`goog:channel`]
          );
        case `storage.deleteCookies`:
          return await this.#d.deleteCookies(this.#p.parseDeleteCookiesParams(e.params));
        case `storage.getCookies`:
          return await this.#d.getCookies(this.#p.parseGetCookiesParams(e.params));
        case `storage.setCookie`:
          return await this.#d.setCookie(this.#p.parseSetCookieParams(e.params));
        case `webExtension.install`:
          return await this.#f.install(this.#p.parseInstallParams(e.params));
        case `webExtension.uninstall`:
          return await this.#f.uninstall(this.#p.parseUninstallParams(e.params));
      }
      throw new Ct(`Unknown command '${e?.method}'.`);
    }
    #g(e) {
      return (
        typeof e == `object` &&
          e &&
          `target` in e &&
          typeof e.target == `object` &&
          e.target &&
          `context` in e.target &&
          delete e.target.realm,
        e
      );
    }
    async processCommand(e) {
      try {
        let t = await this.#h(e),
          n = { type: `success`, id: e.id, result: t };
        this.emit(`response`, { message: W.createResolved(n, e[`goog:channel`]), event: e.method });
      } catch (t) {
        if (t instanceof L)
          this.emit(`response`, {
            message: W.createResolved(t.toErrorResponse(e.id), e[`goog:channel`]),
            event: e.method,
          });
        else {
          let n = t;
          this.#m?.(j.bidi, n);
          let r = this.#t.isCloseError(t)
            ? new ht(`Browsing context is gone`)
            : new z(n.message, n.stack);
          this.emit(`response`, {
            message: W.createResolved(r.toErrorResponse(e.id), e[`goog:channel`]),
            event: e.method,
          });
        }
      }
    }
  },
  Hn = class {
    id;
    uuid;
    constructor(e, t) {
      ((this.id = e), (this.uuid = t));
    }
  },
  Un = class extends Hn {
    characteristic;
    constructor(e, t, n) {
      (super(e, t), (this.characteristic = n));
    }
  },
  Wn = class extends Hn {
    descriptors = new Map();
    service;
    constructor(e, t, n) {
      (super(e, t), (this.service = n));
    }
  },
  Gn = class extends Hn {
    characteristics = new Map();
    device;
    constructor(e, t, n) {
      (super(e, t), (this.device = n));
    }
  },
  Kn = class {
    address;
    services = new Map();
    constructor(e) {
      this.address = e;
    }
  },
  qn = class {
    #e;
    #t;
    #n = new Map();
    #r = new Map();
    #i = new Map();
    constructor(e, t) {
      ((this.#e = e), (this.#t = t));
    }
    #a(e) {
      let t = this.#n.get(e);
      if (!t) throw new R(`Bluetooth device with address ${e} does not exist`);
      return t;
    }
    #o(e, t) {
      let n = e.services.get(t);
      if (!n) throw new R(`Service with UUID ${t} on device ${e.address} does not exist`);
      return n;
    }
    #s(e, t) {
      let n = e.characteristics.get(t);
      if (!n)
        throw new R(
          `Characteristic with UUID ${t} does not exist for service ${e.uuid} on device ${e.device.address}`
        );
      return n;
    }
    #c(e, t) {
      let n = e.descriptors.get(t);
      if (!n)
        throw new R(
          `Descriptor with UUID ${t} does not exist for characteristic ${e.uuid} on service ${e.service.uuid} on device ${e.service.device.address}`
        );
      return n;
    }
    async simulateAdapter(e) {
      if (e.state === void 0)
        throw new R(`Parameter "state" is required for creating a Bluetooth adapter`);
      let t = this.#t.getContext(e.context);
      return (
        await t.cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.disable`),
        this.#n.clear(),
        this.#r.clear(),
        this.#i.clear(),
        await t.cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.enable`, {
          state: e.state,
          leSupported: e.leSupported ?? !0,
        }),
        {}
      );
    }
    async disableSimulation(e) {
      return (
        await this.#t
          .getContext(e.context)
          .cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.disable`),
        this.#n.clear(),
        this.#r.clear(),
        this.#i.clear(),
        {}
      );
    }
    async simulatePreconnectedPeripheral(e) {
      if (this.#n.has(e.address))
        throw new R(`Bluetooth device with address ${e.address} already exists`);
      return (
        await this.#t
          .getContext(e.context)
          .cdpTarget.browserCdpClient.sendCommand(
            `BluetoothEmulation.simulatePreconnectedPeripheral`,
            {
              address: e.address,
              name: e.name,
              knownServiceUuids: e.knownServiceUuids,
              manufacturerData: e.manufacturerData,
            }
          ),
        this.#n.set(e.address, new Kn(e.address)),
        {}
      );
    }
    async simulateAdvertisement(e) {
      return (
        await this.#t
          .getContext(e.context)
          .cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.simulateAdvertisement`, {
            entry: e.scanEntry,
          }),
        {}
      );
    }
    async simulateCharacteristic(e) {
      let t = this.#a(e.address),
        n = this.#o(t, e.serviceUuid),
        r = this.#t.getContext(e.context);
      switch (e.type) {
        case `add`: {
          if (e.characteristicProperties === void 0)
            throw new R(
              `Parameter "characteristicProperties" is required for adding a Bluetooth characteristic`
            );
          if (n.characteristics.has(e.characteristicUuid))
            throw new R(`Characteristic with UUID ${e.characteristicUuid} already exists`);
          let t = new Wn(
            (
              await r.cdpTarget.browserCdpClient.sendCommand(
                `BluetoothEmulation.addCharacteristic`,
                {
                  serviceId: n.id,
                  characteristicUuid: e.characteristicUuid,
                  properties: e.characteristicProperties,
                }
              )
            ).characteristicId,
            e.characteristicUuid,
            n
          );
          return (n.characteristics.set(e.characteristicUuid, t), this.#r.set(t.id, t), {});
        }
        case `remove`: {
          if (e.characteristicProperties !== void 0)
            throw new R(
              `Parameter "characteristicProperties" should not be provided for removing a Bluetooth characteristic`
            );
          let t = this.#s(n, e.characteristicUuid);
          return (
            await r.cdpTarget.browserCdpClient.sendCommand(
              `BluetoothEmulation.removeCharacteristic`,
              { characteristicId: t.id }
            ),
            n.characteristics.delete(e.characteristicUuid),
            this.#r.delete(t.id),
            {}
          );
        }
        default:
          throw new R(`Parameter "type" of ${e.type} is not supported`);
      }
    }
    async simulateCharacteristicResponse(e) {
      let t = this.#t.getContext(e.context),
        n = this.#a(e.address),
        r = this.#o(n, e.serviceUuid),
        i = this.#s(r, e.characteristicUuid);
      return (
        await t.cdpTarget.browserCdpClient.sendCommand(
          `BluetoothEmulation.simulateCharacteristicOperationResponse`,
          {
            characteristicId: i.id,
            type: e.type,
            code: e.code,
            ...(e.data && { data: btoa(String.fromCharCode(...e.data)) }),
          }
        ),
        {}
      );
    }
    async simulateDescriptor(e) {
      let t = this.#a(e.address),
        n = this.#o(t, e.serviceUuid),
        r = this.#s(n, e.characteristicUuid),
        i = this.#t.getContext(e.context);
      switch (e.type) {
        case `add`: {
          if (r.descriptors.has(e.descriptorUuid))
            throw new R(`Descriptor with UUID ${e.descriptorUuid} already exists`);
          let t = new Un(
            (
              await i.cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.addDescriptor`, {
                characteristicId: r.id,
                descriptorUuid: e.descriptorUuid,
              })
            ).descriptorId,
            e.descriptorUuid,
            r
          );
          return (r.descriptors.set(e.descriptorUuid, t), this.#i.set(t.id, t), {});
        }
        case `remove`: {
          let t = this.#c(r, e.descriptorUuid);
          return (
            await i.cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.removeDescriptor`, {
              descriptorId: t.id,
            }),
            r.descriptors.delete(e.descriptorUuid),
            this.#i.delete(t.id),
            {}
          );
        }
        default:
          throw new R(`Parameter "type" of ${e.type} is not supported`);
      }
    }
    async simulateDescriptorResponse(e) {
      let t = this.#t.getContext(e.context),
        n = this.#a(e.address),
        r = this.#o(n, e.serviceUuid),
        i = this.#s(r, e.characteristicUuid),
        a = this.#c(i, e.descriptorUuid);
      return (
        await t.cdpTarget.browserCdpClient.sendCommand(
          `BluetoothEmulation.simulateDescriptorOperationResponse`,
          {
            descriptorId: a.id,
            type: e.type,
            code: e.code,
            ...(e.data && { data: btoa(String.fromCharCode(...e.data)) }),
          }
        ),
        {}
      );
    }
    async simulateGattConnectionResponse(e) {
      return (
        await this.#t
          .getContext(e.context)
          .cdpTarget.browserCdpClient.sendCommand(
            `BluetoothEmulation.simulateGATTOperationResponse`,
            { address: e.address, type: `connection`, code: e.code }
          ),
        {}
      );
    }
    async simulateGattDisconnection(e) {
      return (
        await this.#t
          .getContext(e.context)
          .cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.simulateGATTDisconnection`, {
            address: e.address,
          }),
        {}
      );
    }
    async simulateService(e) {
      let t = this.#a(e.address),
        n = this.#t.getContext(e.context);
      switch (e.type) {
        case `add`: {
          if (t.services.has(e.uuid)) throw new R(`Service with UUID ${e.uuid} already exists`);
          let r = await n.cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.addService`, {
            address: e.address,
            serviceUuid: e.uuid,
          });
          return (t.services.set(e.uuid, new Gn(r.serviceId, e.uuid, t)), {});
        }
        case `remove`: {
          let r = this.#o(t, e.uuid);
          return (
            await n.cdpTarget.browserCdpClient.sendCommand(`BluetoothEmulation.removeService`, {
              serviceId: r.id,
            }),
            t.services.delete(e.uuid),
            {}
          );
        }
        default:
          throw new R(`Parameter "type" of ${e.type} is not supported`);
      }
    }
    onCdpTargetCreated(e) {
      (e.cdpClient.on(`DeviceAccess.deviceRequestPrompted`, (t) => {
        this.#e.registerEvent(
          {
            type: `event`,
            method: `bluetooth.requestDevicePromptUpdated`,
            params: { context: e.id, prompt: t.id, devices: t.devices },
          },
          e.id
        );
      }),
        e.browserCdpClient.on(`BluetoothEmulation.gattOperationReceived`, async (t) => {
          switch (t.type) {
            case `connection`:
              this.#e.registerEvent(
                {
                  type: `event`,
                  method: `bluetooth.gattConnectionAttempted`,
                  params: { context: e.id, address: t.address },
                },
                e.id
              );
              return;
            case `discovery`:
              await e.browserCdpClient.sendCommand(
                `BluetoothEmulation.simulateGATTOperationResponse`,
                { address: t.address, type: `discovery`, code: 0 }
              );
          }
        }),
        e.browserCdpClient.on(`BluetoothEmulation.characteristicOperationReceived`, (t) => {
          if (!this.#r.has(t.characteristicId)) return;
          let n;
          if (t.type === `write`) {
            if (t.writeType === `write-default-deprecated`) return;
            n = t.writeType;
          } else n = t.type;
          let r = this.#r.get(t.characteristicId);
          this.#e.registerEvent(
            {
              type: `event`,
              method: `bluetooth.characteristicEventGenerated`,
              params: {
                context: e.id,
                address: r.service.device.address,
                serviceUuid: r.service.uuid,
                characteristicUuid: r.uuid,
                type: n,
                ...(t.data && { data: Array.from(atob(t.data), (e) => e.charCodeAt(0)) }),
              },
            },
            e.id
          );
        }),
        e.browserCdpClient.on(`BluetoothEmulation.descriptorOperationReceived`, (t) => {
          if (!this.#i.has(t.descriptorId)) return;
          let n = this.#i.get(t.descriptorId);
          this.#e.registerEvent(
            {
              type: `event`,
              method: `bluetooth.descriptorEventGenerated`,
              params: {
                context: e.id,
                address: n.characteristic.service.device.address,
                serviceUuid: n.characteristic.service.uuid,
                characteristicUuid: n.characteristic.uuid,
                descriptorUuid: n.uuid,
                type: t.type,
                ...(t.data && { data: Array.from(atob(t.data), (e) => e.charCodeAt(0)) }),
              },
            },
            e.id
          );
        }));
    }
    async handleRequestDevicePrompt(e) {
      let t = this.#t.getContext(e.context);
      return (
        e.accept
          ? await t.cdpTarget.cdpClient.sendCommand(`DeviceAccess.selectPrompt`, {
              id: e.prompt,
              deviceId: e.device,
            })
          : await t.cdpTarget.cdpClient.sendCommand(`DeviceAccess.cancelPrompt`, { id: e.prompt }),
        {}
      );
    }
  },
  Jn = class e {
    acceptInsecureCerts;
    clientHints;
    devicePixelRatio;
    disableNetworkDurableMessages;
    downloadBehavior;
    emulatedNetworkConditions;
    extraHeaders;
    geolocation;
    locale;
    maxTouchPoints;
    prerenderingDisabled;
    screenArea;
    screenOrientation;
    scriptingEnabled;
    scrollbarType;
    timezone;
    userAgent;
    userPromptHandler;
    viewport;
    static merge(...t) {
      let n = new e();
      for (let e of t)
        if (e)
          for (let t in e) {
            let r = e[t];
            r === null ? delete n[t] : r !== void 0 && (n[t] = r);
          }
      return n;
    }
  },
  Yn = class {
    #e = new Jn();
    #t = new Map();
    #n = new Map();
    updateGlobalConfig(e) {
      this.#e = Jn.merge(this.#e, e);
    }
    updateBrowsingContextConfig(e, t) {
      this.#n.set(e, Jn.merge(this.#n.get(e), t));
    }
    updateUserContextConfig(e, t) {
      this.#t.set(e, Jn.merge(this.#t.get(e), t));
    }
    getGlobalConfig() {
      return this.#e;
    }
    #r(e, t) {
      let n = this.#e.extraHeaders ?? {},
        r = this.#t.get(t)?.extraHeaders ?? {},
        i = e === void 0 ? {} : (this.#n.get(e)?.extraHeaders ?? {});
      return { ...n, ...r, ...i };
    }
    getActiveConfig(e, t) {
      let n = Jn.merge(this.#e, this.#t.get(t));
      e !== void 0 && (n = Jn.merge(n, this.#n.get(e)));
      let r = this.#r(e, t);
      return ((n.extraHeaders = Object.keys(r).length > 0 ? r : void 0), n);
    }
  },
  Xn = class {
    #e;
    constructor(e) {
      this.#e = e;
    }
    async getUserContexts() {
      return [
        { userContext: `default` },
        ...(await this.#e.sendCommand(`Target.getBrowserContexts`)).browserContextIds.map((e) => ({
          userContext: e,
        })),
      ];
    }
    async verifyUserContextIdList(e) {
      let t = new Set();
      if (!e.length) return t;
      let n = await this.getUserContexts(),
        r = new Set(n.map((e) => e.userContext));
      for (let n of e) {
        if (!r.has(n)) throw new St(`User context ${n} not found`);
        t.add(n);
      }
      return t;
    }
  },
  G = class {
    #e = !1;
    #t;
    #n;
    #r;
    #i;
    get isFinished() {
      return this.#e;
    }
    get result() {
      if (!this.#e) throw Error(`Deferred is not finished yet`);
      return this.#n;
    }
    constructor() {
      ((this.#t = new Promise((e, t) => {
        ((this.#r = e), (this.#i = t));
      })),
        this.#t.catch((e) => {}));
    }
    then(e, t) {
      return this.#t.then(e, t);
    }
    catch(e) {
      return this.#t.catch(e);
    }
    resolve(e) {
      ((this.#n = e), this.#e || ((this.#e = !0), this.#r(e)));
    }
    reject(e) {
      this.#e || ((this.#e = !0), this.#i(e));
    }
    finally(e) {
      return this.#t.finally(e);
    }
    [Symbol.toStringTag] = `Promise`;
  };
function K() {
  return new Date().getTime();
}
function Zn(e) {
  return e / 2.54;
}
var Qn = `_element_`;
function $n(e, t, n) {
  return `f.${e}.d.${t}.e.${n}`;
}
function er(e) {
  let t = e.match(RegExp(`(.*)${Qn}(.*)`));
  if (!t) return null;
  let n = t[1],
    r = t[2];
  if (n === void 0 || r === void 0) return null;
  let i = parseInt(r ?? ``);
  return isNaN(i) ? null : { documentId: n, backendNodeId: i };
}
function tr(e) {
  let t = er(e);
  if (t !== null) return { ...t, frameId: void 0 };
  let n = e.match(/f\.(.*)\.d\.(.*)\.e\.([0-9]*)/);
  if (!n) return null;
  let r = n[1],
    i = n[2],
    a = n[3];
  if (r === void 0 || i === void 0 || a === void 0) return null;
  let o = parseInt(a ?? ``);
  return isNaN(o) ? null : { frameId: r, documentId: i, backendNodeId: o };
}
var nr = class e {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    realmStorage;
    constructor(e, t, n, r, i, a, o) {
      ((this.#e = e),
        (this.#t = t),
        (this.#n = n),
        (this.#r = r),
        (this.#i = i),
        (this.#a = a),
        (this.realmStorage = o),
        this.realmStorage.addRealm(this));
    }
    cdpToBidiValue(e, t) {
      let n = this.serializeForBiDi(e.result.deepSerializedValue, new Map());
      if (e.result.objectId) {
        let r = e.result.objectId;
        t === `root`
          ? ((n.handle = r), this.realmStorage.knownHandlesToRealmMap.set(r, this.realmId))
          : this.#h(r).catch((e) => this.#r?.(j.debugError, e));
      }
      return n;
    }
    isHidden() {
      return !1;
    }
    serializeForBiDi(e, t) {
      if (Object.hasOwn(e, `weakLocalObjectReference`)) {
        let n = e.weakLocalObjectReference;
        (t.has(n) || t.set(n, U()), (e.internalId = t.get(n)), delete e.weakLocalObjectReference);
      }
      if (
        (e.type === `node` &&
          e.value &&
          Object.hasOwn(e.value, `frameId`) &&
          delete e.value.frameId,
        e.type === `platformobject`)
      )
        return { type: `object` };
      let n = e.value;
      if (n === void 0) return e;
      if ([`array`, `set`, `htmlcollection`, `nodelist`].includes(e.type))
        for (let e in n) n[e] = this.serializeForBiDi(n[e], t);
      if ([`object`, `map`].includes(e.type))
        for (let e in n)
          n[e] = [this.serializeForBiDi(n[e][0], t), this.serializeForBiDi(n[e][1], t)];
      return e;
    }
    get realmId() {
      return this.#a;
    }
    get executionContextId() {
      return this.#n;
    }
    get origin() {
      return this.#i;
    }
    get source() {
      return { realm: this.realmId };
    }
    get cdpClient() {
      return this.#e;
    }
    get baseInfo() {
      return { realm: this.realmId, origin: this.origin };
    }
    async evaluate(t, n, r = `none`, i = {}, a = !1, o = !1) {
      let s = await this.cdpClient.sendCommand(`Runtime.evaluate`, {
        contextId: this.executionContextId,
        expression: t,
        awaitPromise: n,
        serializationOptions: e.#f(`deep`, i),
        userGesture: a,
        includeCommandLineAPI: o,
      });
      return s.exceptionDetails
        ? await this.#d(s.exceptionDetails, 0, r)
        : { realm: this.realmId, result: this.cdpToBidiValue(s, r), type: `success` };
    }
    #o(e) {
      if (this.associatedBrowsingContexts.length === 0) this.#t.registerGlobalEvent(e);
      else for (let t of this.associatedBrowsingContexts) this.#t.registerEvent(e, t.id);
    }
    initialize() {
      this.isHidden() ||
        this.#o({ type: `event`, method: N.EventNames.RealmCreated, params: this.realmInfo });
    }
    async serializeCdpObject(t, n) {
      let r = e.#s(t),
        i = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
          functionDeclaration: String((e) => e),
          awaitPromise: !1,
          arguments: [r],
          serializationOptions: { serialization: `deep` },
          executionContextId: this.executionContextId,
        });
      return this.cdpToBidiValue(i, n);
    }
    static #s(e) {
      return e.objectId === void 0
        ? e.unserializableValue === void 0
          ? { value: e.value }
          : { unserializableValue: e.unserializableValue }
        : { objectId: e.objectId };
    }
    async stringifyObject(e) {
      let { result: t } = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
        functionDeclaration: String((e) => String(e)),
        awaitPromise: !1,
        arguments: [e],
        returnByValue: !0,
        executionContextId: this.executionContextId,
      });
      return t.value;
    }
    async #c(e) {
      return (
        await Promise.all(
          e.map(async ([e, t]) => {
            let n;
            n = typeof e == `string` ? { value: e } : await this.deserializeForCdp(e);
            let r = await this.deserializeForCdp(t);
            return [n, r];
          })
        )
      ).flat();
    }
    async #l(e) {
      return await Promise.all(e.map((e) => this.deserializeForCdp(e)));
    }
    async #u(e, t, n) {
      let r =
          e.stackTrace?.callFrames.map((e) => ({
            url: e.url,
            functionName: e.functionName,
            lineNumber: e.lineNumber - t,
            columnNumber: e.columnNumber,
          })) ?? [],
        i = e.exception;
      return {
        exception: await this.serializeCdpObject(i, n),
        columnNumber: e.columnNumber,
        lineNumber: e.lineNumber - t,
        stackTrace: { callFrames: r },
        text: (await this.stringifyObject(i)) || e.text,
      };
    }
    async callFunction(t, n, r = { type: `undefined` }, i = [], a = `none`, o = {}, s = !1) {
      let c = `(...args) => {
      function callFunction(f, args) {
        const deserializedThis = args.shift();
        const deserializedArgs = args;
        return f.apply(deserializedThis, deserializedArgs);
      }
      return callFunction((
        ${t}
      ), args);
    }`,
        l = [
          await this.deserializeForCdp(r),
          ...(await Promise.all(i.map(async (e) => await this.deserializeForCdp(e)))),
        ],
        u;
      try {
        u = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
          functionDeclaration: c,
          awaitPromise: n,
          arguments: l,
          serializationOptions: e.#f(`deep`, o),
          executionContextId: this.executionContextId,
          userGesture: s,
        });
      } catch (e) {
        throw e.code === -32e3 &&
          [
            `Could not find object with given id`,
            `Argument should belong to the same JavaScript world as target object`,
            `Invalid remote object id`,
          ].includes(e.message)
          ? new gt(`Handle was not found.`)
          : e;
      }
      return u.exceptionDetails
        ? await this.#d(u.exceptionDetails, 1, a)
        : { type: `success`, result: this.cdpToBidiValue(u, a), realm: this.realmId };
    }
    async deserializeForCdp(e) {
      if (`handle` in e && e.handle) return { objectId: e.handle };
      if (`handle` in e || `sharedId` in e) throw new gt(`Handle was not found.`);
      switch (e.type) {
        case `undefined`:
          return { unserializableValue: `undefined` };
        case `null`:
          return { unserializableValue: `null` };
        case `string`:
          return { value: e.value };
        case `number`:
          return e.value === `NaN`
            ? { unserializableValue: `NaN` }
            : e.value === `-0`
              ? { unserializableValue: `-0` }
              : e.value === `Infinity`
                ? { unserializableValue: `Infinity` }
                : e.value === `-Infinity`
                  ? { unserializableValue: `-Infinity` }
                  : { value: e.value };
        case `boolean`:
          return { value: !!e.value };
        case `bigint`:
          return { unserializableValue: `BigInt(${JSON.stringify(e.value)})` };
        case `date`:
          return { unserializableValue: `new Date(Date.parse(${JSON.stringify(e.value)}))` };
        case `regexp`:
          return {
            unserializableValue: `new RegExp(${JSON.stringify(e.value.pattern)}, ${JSON.stringify(e.value.flags)})`,
          };
        case `map`: {
          let t = await this.#c(e.value),
            { result: n } = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
              functionDeclaration: String((...e) => {
                let t = new Map();
                for (let n = 0; n < e.length; n += 2) t.set(e[n], e[n + 1]);
                return t;
              }),
              awaitPromise: !1,
              arguments: t,
              returnByValue: !1,
              executionContextId: this.executionContextId,
            });
          return { objectId: n.objectId };
        }
        case `object`: {
          let t = await this.#c(e.value),
            { result: n } = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
              functionDeclaration: String((...e) => {
                let t = {};
                for (let n = 0; n < e.length; n += 2) {
                  let r = e[n];
                  t[r] = e[n + 1];
                }
                return t;
              }),
              awaitPromise: !1,
              arguments: t,
              returnByValue: !1,
              executionContextId: this.executionContextId,
            });
          return { objectId: n.objectId };
        }
        case `array`: {
          let t = await this.#l(e.value),
            { result: n } = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
              functionDeclaration: String((...e) => e),
              awaitPromise: !1,
              arguments: t,
              returnByValue: !1,
              executionContextId: this.executionContextId,
            });
          return { objectId: n.objectId };
        }
        case `set`: {
          let t = await this.#l(e.value),
            { result: n } = await this.cdpClient.sendCommand(`Runtime.callFunctionOn`, {
              functionDeclaration: String((...e) => new Set(e)),
              awaitPromise: !1,
              arguments: t,
              returnByValue: !1,
              executionContextId: this.executionContextId,
            });
          return { objectId: n.objectId };
        }
        case `channel`:
          return { objectId: await new Fn(e.value, this.#r).init(this, this.#t) };
      }
      throw Error(`Value ${JSON.stringify(e)} is not deserializable.`);
    }
    async #d(e, t, n) {
      return { exceptionDetails: await this.#u(e, t, n), realm: this.realmId, type: `exception` };
    }
    static #f(t, n) {
      return { serialization: t, additionalParameters: e.#p(n), ...e.#m(n) };
    }
    static #p(e) {
      let t = {};
      return (
        e.maxDomDepth !== void 0 && (t.maxNodeDepth = e.maxDomDepth === null ? 1e3 : e.maxDomDepth),
        e.includeShadowTree !== void 0 && (t.includeShadowTree = e.includeShadowTree),
        t
      );
    }
    static #m(e) {
      return e.maxObjectDepth === void 0 || e.maxObjectDepth === null
        ? {}
        : { maxDepth: e.maxObjectDepth };
    }
    async #h(e) {
      try {
        await this.cdpClient.sendCommand(`Runtime.releaseObject`, { objectId: e });
      } catch (e) {
        if (!(e.code === -32e3 && e.message === `Invalid remote object id`)) throw e;
      }
    }
    async disown(e) {
      this.realmStorage.knownHandlesToRealmMap.get(e) === this.realmId &&
        (await this.#h(e), this.realmStorage.knownHandlesToRealmMap.delete(e));
    }
    dispose() {
      this.isHidden() ||
        this.#o({
          type: `event`,
          method: N.EventNames.RealmDestroyed,
          params: { realm: this.realmId },
        });
    }
  },
  rr = class extends nr {
    #e;
    #t;
    sandbox;
    constructor(e, t, n, r, i, a, o, s, c, l) {
      (super(n, r, i, a, o, s, c),
        (this.#e = e),
        (this.#t = t),
        (this.sandbox = l),
        this.initialize());
    }
    #n(e) {
      return this.#t.getAllContexts().find((t) => t.navigableId === e)?.id ?? `UNKNOWN`;
    }
    get browsingContext() {
      return this.#t.getContext(this.#e);
    }
    isHidden() {
      return this.realmStorage.hiddenSandboxes.has(this.sandbox);
    }
    get associatedBrowsingContexts() {
      return [this.browsingContext];
    }
    get realmType() {
      return `window`;
    }
    get realmInfo() {
      return { ...this.baseInfo, type: this.realmType, context: this.#e, sandbox: this.sandbox };
    }
    get source() {
      return { realm: this.realmId, context: this.browsingContext.id };
    }
    serializeForBiDi(e, t) {
      let n = e.value;
      if (e.type === `node` && n !== void 0) {
        if (Object.hasOwn(n, `backendNodeId`)) {
          let t = this.browsingContext.navigableId ?? `UNKNOWN`;
          (Object.hasOwn(n, `loaderId`) && ((t = n.loaderId), delete n.loaderId),
            (e.sharedId = $n(this.#n(t), t, n.backendNodeId)),
            delete n.backendNodeId);
        }
        if (Object.hasOwn(n, `children`))
          for (let e in n.children) n.children[e] = this.serializeForBiDi(n.children[e], t);
        (Object.hasOwn(n, `shadowRoot`) &&
          n.shadowRoot !== null &&
          (n.shadowRoot = this.serializeForBiDi(n.shadowRoot, t)),
          n.namespaceURI === `` && (n.namespaceURI = null));
      }
      return super.serializeForBiDi(e, t);
    }
    async deserializeForCdp(e) {
      if (`sharedId` in e && e.sharedId) {
        let t = tr(e.sharedId);
        if (t === null) throw new yt(`SharedId "${e.sharedId}" was not found.`);
        let { documentId: n, backendNodeId: r } = t;
        if (this.browsingContext.navigableId !== n)
          throw new yt(
            `SharedId "${e.sharedId}" belongs to different document. Current document is ${this.browsingContext.navigableId}.`
          );
        try {
          let { object: e } = await this.cdpClient.sendCommand(`DOM.resolveNode`, {
            backendNodeId: r,
            executionContextId: this.executionContextId,
          });
          return { objectId: e.objectId };
        } catch (t) {
          throw t.code === -32e3 && t.message === `No node with given id found`
            ? new yt(`SharedId "${e.sharedId}" was not found.`)
            : new z(t.message, t.stack);
        }
      }
      return await super.deserializeForCdp(e);
    }
    async evaluate(e, t, n, r, i, a) {
      return (
        await this.#t.getContext(this.#e).targetUnblockedOrThrow(),
        await super.evaluate(e, t, n, r, i, a)
      );
    }
    async callFunction(e, t, n, r, i, a, o) {
      return (
        await this.#t.getContext(this.#e).targetUnblockedOrThrow(),
        await super.callFunction(e, t, n, r, i, a, o)
      );
    }
  };
function ir(e) {
  if (e === ``) return !0;
  try {
    let t = new URL(e);
    return (
      t.protocol.replace(/:$/, ``).toLowerCase() === `about` &&
      t.pathname.toLowerCase() === `blank` &&
      t.username === `` &&
      t.password === `` &&
      t.host === ``
    );
  } catch (e) {
    if (e instanceof TypeError) return !1;
    throw e;
  }
}
var ar = class {
    eventName;
    message;
    constructor(e, t) {
      ((this.eventName = e), (this.message = t));
    }
  },
  or = class {
    navigationId = U();
    #e;
    #t = !1;
    #n = new G();
    url;
    loaderId;
    #r;
    #i;
    committed = new G();
    isFragmentNavigation;
    get finished() {
      return this.#n;
    }
    constructor(e, t, n, r) {
      ((this.#e = t), (this.url = e), (this.#r = n), (this.#i = r));
    }
    navigationInfo() {
      return { context: this.#e, navigation: this.navigationId, timestamp: K(), url: this.url };
    }
    start() {
      (!this.#r &&
        !this.#t &&
        !this.isFragmentNavigation &&
        this.#i.registerEvent(
          { type: `event`, method: F.EventNames.NavigationStarted, params: this.navigationInfo() },
          this.#e
        ),
        (this.#t = !0));
    }
    #a(e) {
      ((this.#t = !0),
        !this.#r &&
          !this.#n.isFinished &&
          e.eventName !== `browsingContext.load` &&
          this.#i.registerEvent(
            { type: `event`, method: e.eventName, params: this.navigationInfo() },
            this.#e
          ),
        this.#n.resolve(e));
    }
    frameNavigated() {
      (this.committed.resolve(),
        this.#r ||
          this.#i.registerEvent(
            {
              type: `event`,
              method: F.EventNames.NavigationCommitted,
              params: this.navigationInfo(),
            },
            this.#e
          ));
    }
    fragmentNavigated() {
      (this.committed.resolve(), this.#a(new ar(`browsingContext.fragmentNavigated`)));
    }
    load() {
      this.#a(new ar(`browsingContext.load`));
    }
    fail(e) {
      this.#a(
        new ar(
          this.committed.isFinished
            ? `browsingContext.navigationAborted`
            : `browsingContext.navigationFailed`,
          e
        )
      );
    }
  },
  sr = class e {
    #e;
    #t;
    #n = new Map();
    #r;
    #i;
    #a;
    #o = !0;
    constructor(e, t, n, r) {
      ((this.#r = t),
        (this.#e = n),
        (this.#t = r),
        (this.#o = !0),
        (this.#i = new or(e, t, ir(e), this.#e)));
    }
    get currentNavigationId() {
      return this.#a?.isFragmentNavigation === !1 ? this.#a.navigationId : this.#i.navigationId;
    }
    get isInitialNavigation() {
      return this.#o;
    }
    get url() {
      return this.#i.url;
    }
    createPendingNavigation(e, t = !1) {
      (this.#t?.(j.debug, `createCommandNavigation`),
        (this.#o = t && this.#o && ir(e)),
        this.#a?.fail(`navigation canceled by concurrent navigation`));
      let n = new or(e, this.#r, this.#o, this.#e);
      return ((this.#a = n), n);
    }
    dispose() {
      (this.#a?.fail(`navigation canceled by context disposal`),
        this.#i.fail(`navigation canceled by context disposal`));
    }
    onTargetInfoChanged(e) {
      (this.#t?.(j.debug, `onTargetInfoChanged ${e}`), (this.#i.url = e));
    }
    #s(e, t) {
      return this.#n.has(t)
        ? this.#n.get(t)
        : this.#a !== void 0 && this.#a.loaderId === void 0
          ? this.#a
          : this.createPendingNavigation(e, !0);
    }
    frameNavigated(e, t, n) {
      if ((this.#t?.(j.debug, `frameNavigated ${e}`), n !== void 0)) {
        let e = this.#n.get(t) ?? this.#a ?? this.createPendingNavigation(n, !0);
        ((e.url = n), e.start(), e.fail(`the requested url is unreachable`));
        return;
      }
      let r = this.#s(e, t);
      (r !== this.#i && this.#i.fail(`navigation canceled by concurrent navigation`),
        (r.url = e),
        (r.loaderId = t),
        this.#n.set(t, r),
        r.start(),
        r.frameNavigated(),
        (this.#i = r),
        this.#a === r && (this.#a = void 0));
    }
    navigatedWithinDocument(e, t) {
      if (
        (this.#t?.(j.debug, `navigatedWithinDocument ${e}, ${t}`),
        (this.#i.url = e),
        t !== `fragment`)
      )
        return;
      let n = this.#a?.isFragmentNavigation === !0 ? this.#a : new or(e, this.#r, !1, this.#e);
      (n.fragmentNavigated(), n === this.#a && (this.#a = void 0));
    }
    loadPageEvent(e) {
      (this.#t?.(j.debug, `loadPageEvent`), (this.#o = !1), this.#n.get(e)?.load());
    }
    failNavigation(e, t) {
      (this.#t?.(j.debug, `failCommandNavigation`), e.fail(t));
    }
    navigationCommandFinished(e, t) {
      (this.#t?.(j.debug, `finishCommandNavigation ${e.navigationId}, ${t}`),
        t !== void 0 && ((e.loaderId = t), this.#n.set(t, e)),
        (e.isFragmentNavigation = t === void 0));
    }
    frameStartedNavigating(t, n, r) {
      if (
        (this.#t?.(j.debug, `frameStartedNavigating ${t}, ${n}`),
        this.#a &&
          this.#a?.loaderId !== void 0 &&
          this.#a?.loaderId !== n &&
          (this.#a?.fail(`navigation canceled by concurrent navigation`), (this.#a = void 0)),
        this.#n.has(n))
      ) {
        let t = this.#n.get(n);
        ((t.isFragmentNavigation = e.#c(r)), (this.#a = t));
        return;
      }
      let i = this.#a ?? this.createPendingNavigation(t, !0);
      (this.#n.set(n, i),
        (i.isFragmentNavigation = e.#c(r)),
        (i.url = t),
        (i.loaderId = n),
        i.start());
    }
    static #c(e) {
      return [`historySameDocument`, `sameDocument`].includes(e);
    }
    networkLoadingFailed(e, t) {
      this.#n.get(e)?.fail(t);
    }
  },
  cr,
  lr = class {
    static LOGGER_PREFIX = `${j.debug}:browsingContext`;
    #e = new Set();
    #t;
    userContext;
    #n = U();
    #r = new Map();
    #i;
    #a = null;
    #o;
    #s = { DOMContentLoaded: new G(), load: new G() };
    #c;
    #l = new G();
    #u;
    #d;
    #f;
    #p;
    #m;
    #h;
    #g;
    constructor(e, t, n, r, i, a, o, s, c, l, u) {
      ((this.#c = r),
        (this.#t = e),
        (this.#a = t),
        (this.userContext = n),
        (this.#d = i),
        (this.#u = a),
        (this.#m = o),
        (this.#h = s),
        (this.#f = u),
        (this.#o = l),
        this.#m.hiddenSandboxes.add(this.#n),
        (this.#p = new sr(c, e, i, u)));
    }
    static create(e, t, n, r, i, a, o, s, c, l, u) {
      let d = new cr(e, t, n, r, i, a, o, s, c, l, u);
      return (
        d.#y(),
        a.addContext(d),
        d.isTopLevelContext() || d.parent.addChild(d.id),
        i.registerPromiseEvent(
          d.targetUnblockedOrThrow().then(
            () => ({
              kind: `success`,
              value: {
                type: `event`,
                method: F.EventNames.ContextCreated,
                params: { ...d.serializeToBidiValue(), url: c },
              },
            }),
            (e) => ({ kind: `error`, error: e })
          ),
          d.id,
          F.EventNames.ContextCreated
        ),
        d
      );
    }
    get navigableId() {
      return this.#i;
    }
    get navigationId() {
      return this.#p.currentNavigationId;
    }
    dispose(e) {
      (this.#p.dispose(),
        this.#m.deleteRealms({ browsingContextId: this.id }),
        this.isTopLevelContext() || this.parent.#e.delete(this.id),
        this.#w(),
        e &&
          this.#d.registerEvent(
            {
              type: `event`,
              method: F.EventNames.ContextDestroyed,
              params: this.serializeToBidiValue(null),
            },
            this.id
          ),
        this.#_(),
        this.#d.clearBufferedEvents(this.id),
        this.#u.deleteContextById(this.id));
    }
    get id() {
      return this.#t;
    }
    get parentId() {
      return this.#a;
    }
    set parentId(e) {
      if (this.#a !== null) {
        this.#f?.(j.debugError, `Parent context already set`);
        return;
      }
      ((this.#a = e), this.isTopLevelContext() || this.parent.addChild(this.id));
    }
    get parent() {
      return this.parentId === null ? null : this.#u.getContext(this.parentId);
    }
    get directChildren() {
      return [...this.#e].map((e) => this.#u.getContext(e));
    }
    get allChildren() {
      let e = this.directChildren;
      return e.concat(...e.map((e) => e.allChildren));
    }
    isTopLevelContext() {
      return this.#a === null;
    }
    get top() {
      let e = this,
        t = e.parent;
      for (; t; ) ((e = t), (t = e.parent));
      return e;
    }
    addChild(e) {
      this.#e.add(e);
    }
    #_(e = !1) {
      this.directChildren.map((t) => t.dispose(e));
    }
    get cdpTarget() {
      return this.#c;
    }
    updateCdpTarget(e) {
      ((this.#c = e), this.#y());
    }
    get url() {
      return this.#p.url;
    }
    async lifecycleLoaded() {
      await this.#s.load;
    }
    async targetUnblockedOrThrow() {
      let e = await this.#c.unblocked;
      if (e.kind === `error`) throw e.error;
    }
    async getOrCreateHiddenSandbox() {
      return await this.#v(this.#n);
    }
    async getOrCreateUserSandbox(e) {
      let t = await this.#v(e);
      if (t.isHidden()) throw new ht(`Realm "${e}" not found`);
      return t;
    }
    async #v(e) {
      if (e === void 0 || e === ``) return await this.#l;
      let t = this.#m.findRealms({ browsingContextId: this.id, sandbox: e });
      return (
        t.length === 0 &&
          (await this.#c.cdpClient.sendCommand(`Page.createIsolatedWorld`, {
            frameId: this.id,
            worldName: e,
          }),
          (t = this.#m.findRealms({ browsingContextId: this.id, sandbox: e })),
          V(t.length !== 0)),
        t[0]
      );
    }
    serializeToBidiValue(e = 0, t = !0) {
      return {
        context: this.#t,
        url: this.url,
        userContext: this.userContext,
        originalOpener: this.#o ?? null,
        clientWindow: `${this.cdpTarget.windowId}`,
        children:
          e === null || e > 0
            ? this.directChildren.map((t) => t.serializeToBidiValue(e === null ? e : e - 1, !1))
            : null,
        ...(t ? { parent: this.#a } : {}),
      };
    }
    onTargetInfoChanged(e) {
      this.#p.onTargetInfoChanged(e.targetInfo.url);
    }
    #y() {
      (this.#c.cdpClient.on(`Network.loadingFailed`, (e) => {
        this.#p.networkLoadingFailed(e.requestId, e.errorText);
      }),
        this.#c.cdpClient.on(`Page.fileChooserOpened`, (e) => {
          if (this.id !== e.frameId) return;
          if (this.#i === void 0) {
            this.#f?.(j.debugError, `LoaderId should be defined when file upload is shown`, e);
            return;
          }
          let t =
            e.backendNodeId === void 0
              ? void 0
              : { sharedId: $n(this.id, this.#i, e.backendNodeId) };
          this.#d.registerEvent(
            {
              type: `event`,
              method: st.EventNames.FileDialogOpened,
              params: { context: this.id, multiple: e.mode === `selectMultiple`, element: t },
            },
            this.id
          );
        }),
        this.#c.cdpClient.on(`Page.frameNavigated`, (e) => {
          this.id === e.frame.id &&
            (this.#p.frameNavigated(
              e.frame.url + (e.frame.urlFragment ?? ``),
              e.frame.loaderId,
              e.frame.unreachableUrl
            ),
            this.#_(),
            this.#S(e.frame.loaderId));
        }),
        this.#c.cdpClient.on(`Page.frameStartedNavigating`, (e) => {
          this.id === e.frameId &&
            this.#p.frameStartedNavigating(e.url, e.loaderId, e.navigationType);
        }),
        this.#c.cdpClient.on(`Page.navigatedWithinDocument`, (e) => {
          if (
            this.id === e.frameId &&
            (this.#p.navigatedWithinDocument(e.url, e.navigationType),
            e.navigationType === `historyApi`)
          ) {
            this.#d.registerEvent(
              {
                type: `event`,
                method: `browsingContext.historyUpdated`,
                params: { context: this.id, timestamp: K(), url: this.#p.url },
              },
              this.id
            );
            return;
          }
        }),
        this.#c.cdpClient.on(`Page.lifecycleEvent`, (e) => {
          if (this.id === e.frameId) {
            if (e.name === `init`) {
              this.#S(e.loaderId);
              return;
            }
            if (e.name === `commit`) {
              this.#i = e.loaderId;
              return;
            }
            if (((this.#i ||= e.loaderId), e.loaderId === this.#i))
              switch (e.name) {
                case `DOMContentLoaded`:
                  (this.#p.isInitialNavigation ||
                    this.#d.registerEvent(
                      {
                        type: `event`,
                        method: F.EventNames.DomContentLoaded,
                        params: {
                          context: this.id,
                          navigation: this.#p.currentNavigationId,
                          timestamp: K(),
                          url: this.#p.url,
                        },
                      },
                      this.id
                    ),
                    this.#s.DOMContentLoaded.resolve());
                  break;
                case `load`:
                  (this.#p.isInitialNavigation ||
                    this.#d.registerEvent(
                      {
                        type: `event`,
                        method: F.EventNames.Load,
                        params: {
                          context: this.id,
                          navigation: this.#p.currentNavigationId,
                          timestamp: K(),
                          url: this.#p.url,
                        },
                      },
                      this.id
                    ),
                    this.#p.loadPageEvent(e.loaderId),
                    this.#s.load.resolve());
                  break;
              }
          }
        }),
        this.#c.cdpClient.on(`Runtime.executionContextCreated`, (e) => {
          let { auxData: t, name: n, uniqueId: r, id: i } = e.context;
          if (!t || t.frameId !== this.id || (t.type === `isolated` && n === ``)) return;
          let a, o;
          switch (t.type) {
            case `isolated`:
              ((o = n),
                this.#l.isFinished ||
                  this.#f?.(
                    j.debugError,
                    `Unexpectedly, isolated realm created before the default one`
                  ),
                (a = this.#l.isFinished ? this.#l.result.origin : ``));
              break;
            case `default`:
              a = ur(e.context.origin);
              break;
            default:
              return;
          }
          let s = new rr(
            this.id,
            this.#u,
            this.#c.cdpClient,
            this.#d,
            i,
            this.#f,
            a,
            r,
            this.#m,
            o
          );
          t.isDefault &&
            (this.#l.resolve(s),
            Promise.all(this.#c.getChannels().map((e) => e.startListenerFromWindow(s, this.#d))));
        }),
        this.#c.cdpClient.on(`Runtime.executionContextDestroyed`, (e) => {
          (this.#l.isFinished &&
            this.#l.result.executionContextId === e.executionContextId &&
            (this.#l = new G()),
            this.#m.deleteRealms({
              cdpSessionId: this.#c.cdpSessionId,
              executionContextId: e.executionContextId,
            }));
        }),
        this.#c.cdpClient.on(`Runtime.executionContextsCleared`, () => {
          (this.#l.isFinished || this.#l.reject(new z(`execution contexts cleared`)),
            (this.#l = new G()),
            this.#m.deleteRealms({ cdpSessionId: this.#c.cdpSessionId }));
        }),
        this.#c.cdpClient.on(`Page.javascriptDialogClosed`, (e) => {
          if (
            (e.frameId && this.id !== e.frameId) ||
            (!e.frameId &&
              this.#a &&
              this.#c.cdpClient !== this.#u.getContext(this.#a)?.cdpTarget.cdpClient)
          )
            return;
          let t = e.result;
          (this.#g === void 0 &&
            this.#f?.(j.debugError, `Unexpectedly no opening prompt event before closing one`),
            this.#d.registerEvent(
              {
                type: `event`,
                method: F.EventNames.UserPromptClosed,
                params: {
                  context: this.id,
                  accepted: t,
                  type: this.#g ?? `UNKNOWN`,
                  userText: t && e.userInput ? e.userInput : void 0,
                },
              },
              this.id
            ),
            (this.#g = void 0));
        }),
        this.#c.cdpClient.on(`Page.javascriptDialogOpening`, (e) => {
          if (
            (e.frameId && this.id !== e.frameId) ||
            (!e.frameId &&
              this.#a &&
              this.#c.cdpClient !== this.#u.getContext(this.#a)?.cdpTarget.cdpClient)
          )
            return;
          let t = cr.#b(e.type);
          this.#g = t;
          let n = this.#x(t);
          switch (
            (this.#d.registerEvent(
              {
                type: `event`,
                method: F.EventNames.UserPromptOpened,
                params: {
                  context: this.id,
                  handler: n,
                  type: t,
                  message: e.message,
                  ...(e.type === `prompt` ? { defaultValue: e.defaultPrompt } : {}),
                },
              },
              this.id
            ),
            n)
          ) {
            case `accept`:
              this.handleUserPrompt(!0);
              break;
            case `dismiss`:
              this.handleUserPrompt(!1);
              break;
            case `ignore`:
              break;
          }
        }),
        this.#c.browserCdpClient.on(`Browser.downloadWillBegin`, (e) => {
          this.id === e.frameId &&
            (this.#r.set(e.guid, e.url),
            this.#d.registerEvent(
              {
                type: `event`,
                method: F.EventNames.DownloadWillBegin,
                params: {
                  context: this.id,
                  suggestedFilename: e.suggestedFilename,
                  navigation: e.guid,
                  timestamp: K(),
                  url: e.url,
                },
              },
              this.id
            ));
        }),
        this.#c.browserCdpClient.on(`Browser.downloadProgress`, (e) => {
          if (!this.#r.has(e.guid) || e.state === `inProgress`) return;
          let t = this.#r.get(e.guid);
          switch (e.state) {
            case `canceled`:
              this.#d.registerEvent(
                {
                  type: `event`,
                  method: F.EventNames.DownloadEnd,
                  params: {
                    status: `canceled`,
                    context: this.id,
                    navigation: e.guid,
                    timestamp: K(),
                    url: t,
                  },
                },
                this.id
              );
              break;
            case `completed`:
              this.#d.registerEvent(
                {
                  type: `event`,
                  method: F.EventNames.DownloadEnd,
                  params: {
                    filepath: e.filePath ?? null,
                    status: `complete`,
                    context: this.id,
                    navigation: e.guid,
                    timestamp: K(),
                    url: t,
                  },
                },
                this.id
              );
              break;
            default:
              throw new z(`Unknown download state: ${e.state}`);
          }
        }));
    }
    static #b(e) {
      switch (e) {
        case `alert`:
          return `alert`;
        case `beforeunload`:
          return `beforeunload`;
        case `confirm`:
          return `confirm`;
        case `prompt`:
          return `prompt`;
      }
    }
    #x(e) {
      let t = `dismiss`,
        n = this.#h.getActiveConfig(this.top.id, this.userContext);
      switch (e) {
        case `alert`:
          return n.userPromptHandler?.alert ?? n.userPromptHandler?.default ?? t;
        case `beforeunload`:
          return n.userPromptHandler?.beforeUnload ?? n.userPromptHandler?.default ?? `accept`;
        case `confirm`:
          return n.userPromptHandler?.confirm ?? n.userPromptHandler?.default ?? t;
        case `prompt`:
          return n.userPromptHandler?.prompt ?? n.userPromptHandler?.default ?? t;
      }
    }
    #S(e) {
      e === void 0 || this.#i === e || (this.#C(), (this.#i = e), this.#_(!0));
    }
    #C() {
      (this.#s.DOMContentLoaded.isFinished
        ? (this.#s.DOMContentLoaded = new G())
        : this.#f?.(cr.LOGGER_PREFIX, `Document changed (DOMContentLoaded)`),
        this.#s.load.isFinished
          ? (this.#s.load = new G())
          : this.#f?.(cr.LOGGER_PREFIX, `Document changed (load)`));
    }
    #w() {
      (this.#s.DOMContentLoaded.isFinished ||
        this.#s.DOMContentLoaded.reject(new z(`navigation canceled`)),
        this.#s.load.isFinished || this.#s.load.reject(new z(`navigation canceled`)));
    }
    async navigate(e, t) {
      try {
        new URL(e);
      } catch {
        throw new R(`Invalid URL: ${e}`);
      }
      let n = this.#p.createPendingNavigation(e),
        r = (async () => {
          let t = await this.#c.cdpClient.sendCommand(`Page.navigate`, {
            url: e,
            frameId: this.id,
          });
          if (t.errorText) throw (this.#p.failNavigation(n, t.errorText), new z(t.errorText));
          (this.#p.navigationCommandFinished(n, t.loaderId), this.#S(t.loaderId));
        })(),
        i = await Promise.race([this.#T(t, r, n), n.finished]);
      if (
        i instanceof ar &&
        (i.eventName === `browsingContext.navigationAborted` ||
          i.eventName === `browsingContext.navigationFailed`)
      )
        throw new z(i.message ?? `unknown exception`);
      return { navigation: n.navigationId, url: n.url };
    }
    async #T(e, t, n) {
      if ((await Promise.all([n.committed, t]), e !== `none`)) {
        if (n.isFragmentNavigation === !0) {
          await n.finished;
          return;
        }
        if (e === `interactive`) {
          await this.#s.DOMContentLoaded;
          return;
        }
        if (e === `complete`) {
          await this.#s.load;
          return;
        }
        throw new R(`Wait condition ${e} is not supported`);
      }
    }
    async reload(e, t) {
      (await this.targetUnblockedOrThrow(), this.#C());
      let n = this.#p.createPendingNavigation(this.#p.url),
        r = this.#c.cdpClient.sendCommand(`Page.reload`, { ignoreCache: e }),
        i = await Promise.race([this.#T(t, r, n), n.finished]);
      if (
        i instanceof ar &&
        (i.eventName === `browsingContext.navigationAborted` ||
          i.eventName === `browsingContext.navigationFailed`)
      )
        throw new z(i.message ?? `unknown exception`);
      return { navigation: n.navigationId, url: n.url };
    }
    async setViewport(e, t, n) {
      let r = this.#h.getActiveConfig(this.id, this.userContext);
      await this.cdpTarget.setDeviceMetricsOverride(
        e,
        t,
        n,
        r.screenArea ?? null,
        r.scrollbarType ?? null
      );
    }
    async handleUserPrompt(e, t) {
      await this.top.#c.cdpClient.sendCommand(`Page.handleJavaScriptDialog`, {
        accept: e ?? !0,
        promptText: t,
      });
    }
    async activate() {
      await this.#c.cdpClient.sendCommand(`Page.bringToFront`);
    }
    async captureScreenshot(e) {
      if (!this.isTopLevelContext())
        throw new B(`Non-top-level 'context' (${e.context}) is currently not supported`);
      let t = dr(e),
        n = !1,
        r;
      switch (((e.origin ??= `viewport`), e.origin)) {
        case `document`:
          ((r = String(() => {
            let e = document.documentElement;
            return { x: 0, y: 0, width: e.scrollWidth, height: e.scrollHeight };
          })),
            (n = !0));
          break;
        case `viewport`:
          r = String(() => {
            let e = window.visualViewport;
            return { x: e.pageLeft, y: e.pageTop, width: e.width, height: e.height };
          });
          break;
      }
      let i = await (await this.getOrCreateHiddenSandbox()).callFunction(r, !1);
      V(i.type === `success`);
      let a = fr(i.result);
      V(a);
      let o = a;
      if (e.clip) {
        let t = e.clip;
        (e.origin === `viewport` && t.type === `box` && ((t.x += a.x), (t.y += a.y)),
          (o = mr(await this.#E(t), a)));
      }
      if (o.width === 0 || o.height === 0)
        throw new wt(
          `Unable to capture screenshot with zero dimensions: width=${o.width}, height=${o.height}`
        );
      return await this.#c.cdpClient.sendCommand(`Page.captureScreenshot`, {
        clip: { ...o, scale: 1 },
        ...t,
        captureBeyondViewport: n,
      });
    }
    async print(e) {
      if (!this.isTopLevelContext())
        throw new B(`Printing of non-top level contexts is not supported`);
      let t = {};
      if (
        (e.background !== void 0 && (t.printBackground = e.background),
        e.margin?.bottom !== void 0 && (t.marginBottom = Zn(e.margin.bottom)),
        e.margin?.left !== void 0 && (t.marginLeft = Zn(e.margin.left)),
        e.margin?.right !== void 0 && (t.marginRight = Zn(e.margin.right)),
        e.margin?.top !== void 0 && (t.marginTop = Zn(e.margin.top)),
        e.orientation !== void 0 && (t.landscape = e.orientation === `landscape`),
        e.page?.height !== void 0 && (t.paperHeight = Zn(e.page.height)),
        e.page?.width !== void 0 && (t.paperWidth = Zn(e.page.width)),
        e.pageRanges !== void 0)
      ) {
        for (let t of e.pageRanges) {
          if (typeof t == `number`) continue;
          let e = t.split(`-`);
          if (e.length < 1 || e.length > 2)
            throw new R(`Invalid page range: ${t} is not a valid integer range.`);
          if (e.length === 1) {
            hr(e[0] ?? ``);
            continue;
          }
          let n,
            r,
            [i = ``, a = ``] = e;
          if (((n = i === `` ? 1 : hr(i)), (r = a === `` ? 2 ** 53 - 1 : hr(a)), n > r))
            throw new R(`Invalid page range: ${i} > ${a}`);
        }
        t.pageRanges = e.pageRanges.join(`,`);
      }
      (e.scale !== void 0 && (t.scale = e.scale),
        e.shrinkToFit !== void 0 && (t.preferCSSPageSize = !e.shrinkToFit));
      try {
        return { data: (await this.#c.cdpClient.sendCommand(`Page.printToPDF`, t)).data };
      } catch (e) {
        throw e.message === `invalid print parameters: content area is empty`
          ? new B(e.message)
          : e;
      }
    }
    async #E(e) {
      switch (e.type) {
        case `box`:
          return { x: e.x, y: e.y, width: e.width, height: e.height };
        case `element`: {
          let t = await this.getOrCreateHiddenSandbox(),
            n = await t.callFunction(
              String((e) => e instanceof Element),
              !1,
              { type: `undefined` },
              [e.element]
            );
          if (n.type === `exception`) throw new mt(`Element '${e.element.sharedId}' was not found`);
          if ((V(n.result.type === `boolean`), !n.result.value))
            throw new mt(`Node '${e.element.sharedId}' is not an Element`);
          {
            let n = await t.callFunction(
              String((e) => {
                let t = e.getBoundingClientRect();
                return { x: t.x, y: t.y, height: t.height, width: t.width };
              }),
              !1,
              { type: `undefined` },
              [e.element]
            );
            V(n.type === `success`);
            let r = fr(n.result);
            if (!r) throw new wt(`Could not get bounding box for Element '${e.element.sharedId}'`);
            return r;
          }
        }
      }
    }
    async close() {
      await this.#c.cdpClient.sendCommand(`Page.close`);
    }
    async traverseHistory(e) {
      if (e === 0) return;
      let t = await this.#c.cdpClient.sendCommand(`Page.getNavigationHistory`),
        n = t.entries[t.currentIndex + e];
      if (!n) throw new _t(`No history entry at delta ${e}`);
      await this.#c.cdpClient.sendCommand(`Page.navigateToHistoryEntry`, { entryId: n.id });
    }
    async toggleModulesIfNeeded() {
      await Promise.all([
        this.#c.toggleNetworkIfNeeded(),
        this.#c.toggleDeviceAccessIfNeeded(),
        this.#c.togglePreloadIfNeeded(),
      ]);
    }
    async locateNodes(e) {
      return await this.#O(
        await this.#l,
        e.locator,
        e.startNodes ?? [],
        e.maxNodeCount,
        e.serializationOptions
      );
    }
    #D(e, t, n) {
      switch (e.type) {
        case `context`:
        case `accessibility`:
          throw Error(`Unreachable`);
        case `css`:
          return {
            functionDeclaration: String((e, t, ...n) => {
              let r = (t) => {
                if (
                  !(
                    t instanceof HTMLElement ||
                    t instanceof Document ||
                    t instanceof DocumentFragment ||
                    t instanceof SVGElement
                  )
                )
                  throw Error(
                    `startNodes in css selector should be HTMLElement, SVGElement or Document or DocumentFragment`
                  );
                return [...t.querySelectorAll(e)];
              };
              n = n.length > 0 ? n : [document];
              let i = n.map((e) => r(e)).flat(1);
              return t === 0 ? i : i.slice(0, t);
            }),
            argumentsLocalValues: [
              { type: `string`, value: e.value },
              { type: `number`, value: t ?? 0 },
              ...n,
            ],
          };
        case `xpath`:
          return {
            functionDeclaration: String((e, t, ...n) => {
              let r = new XPathEvaluator().createExpression(e),
                i = (e) => {
                  let t = r.evaluate(e, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE),
                    n = [];
                  for (let e = 0; e < t.snapshotLength; e++) n.push(t.snapshotItem(e));
                  return n;
                };
              n = n.length > 0 ? n : [document];
              let a = n.map((e) => i(e)).flat(1);
              return t === 0 ? a : a.slice(0, t);
            }),
            argumentsLocalValues: [
              { type: `string`, value: e.value },
              { type: `number`, value: t ?? 0 },
              ...n,
            ],
          };
        case `innerText`:
          if (e.value === ``) throw new dt(`innerText locator cannot be empty`);
          return {
            functionDeclaration: String((e, t, n, r, i, ...a) => {
              let o = n ? e.toUpperCase() : e,
                s = (e, r) => {
                  let i = [];
                  if (e instanceof DocumentFragment || e instanceof Document)
                    return ([...e.children].forEach((e) => i.push(...s(e, r))), i);
                  if (!(e instanceof HTMLElement)) return [];
                  let a = e,
                    c = n ? a.innerText?.toUpperCase() : a.innerText;
                  if (!c.includes(o)) return [];
                  let l = [];
                  for (let e of a.children) e instanceof HTMLElement && l.push(e);
                  if (l.length === 0) t && c === o ? i.push(a) : t || i.push(a);
                  else {
                    let e = r <= 0 ? [] : l.map((e) => s(e, r - 1)).flat(1);
                    e.length === 0 ? (!t || c === o) && i.push(a) : i.push(...e);
                  }
                  return i;
                };
              a = a.length > 0 ? a : [document];
              let c = a.map((e) => s(e, i)).flat(1);
              return r === 0 ? c : c.slice(0, r);
            }),
            argumentsLocalValues: [
              { type: `string`, value: e.value },
              { type: `boolean`, value: e.matchType !== `partial` },
              { type: `boolean`, value: e.ignoreCase === !0 },
              { type: `number`, value: t ?? 0 },
              { type: `number`, value: e.maxDepth ?? 1e3 },
              ...n,
            ],
          };
      }
    }
    async #O(e, t, n, r, i) {
      if (t.type === `context`) return await this.#k(t, n, e, i);
      if (t.type === `accessibility`) return await this.#A(t, n, r, e);
      let a = this.#D(t, r, n);
      i = { ...i, maxObjectDepth: 1 };
      let o = await e.callFunction(
        a.functionDeclaration,
        !1,
        { type: `undefined` },
        a.argumentsLocalValues,
        `none`,
        i
      );
      if (o.type !== `success`)
        throw (
          this.#f?.(cr.LOGGER_PREFIX, `Failed locateNodesByLocator`, o),
          o.exceptionDetails.text?.endsWith(`is not a valid selector.`) ||
          o.exceptionDetails.text?.endsWith(`is not a valid XPath expression.`)
            ? new dt(
                `Not valid selector ${typeof t.value == `string` ? t.value : JSON.stringify(t.value)}`
              )
            : o.exceptionDetails.text ===
                `Error: startNodes in css selector should be HTMLElement, SVGElement or Document or DocumentFragment`
              ? new R(
                  `startNodes in css selector should be HTMLElement, SVGElement or Document or DocumentFragment`
                )
              : new z(`Unexpected error in selector script: ${o.exceptionDetails.text}`)
        );
      if (o.result.type !== `array`)
        throw new z(`Unexpected selector script result type: ${o.result.type}`);
      return {
        nodes: o.result.value.map((e) => {
          if (e.type !== `node`)
            throw new z(`Unexpected selector script result element: ${e.type}`);
          return e;
        }),
      };
    }
    async #k(e, t, n, r) {
      if (t.length !== 0) throw new R(`Start nodes are not supported`);
      let i = e.value.context;
      if (!i) throw new dt(`Invalid context`);
      let a = this.#u.getContext(i).parent;
      if (!a) throw new R(`This context has no container`);
      try {
        let { backendNodeId: e } = await a.#c.cdpClient.sendCommand(`DOM.getFrameOwner`, {
            frameId: i,
          }),
          { object: t } = await a.#c.cdpClient.sendCommand(`DOM.resolveNode`, { backendNodeId: e }),
          o = await n.callFunction(
            `function () { return this; }`,
            !1,
            { handle: t.objectId },
            [],
            `none`,
            r
          );
        if (o.type === `exception`) throw Error(`Unknown exception`);
        return { nodes: [o.result] };
      } catch {
        throw new R(`Context does not exist`);
      }
    }
    async #A(e, t, n, r) {
      if (!e.value.name && !e.value.role) throw new dt(`Either name or role has to be specified`);
      await this.#c.cdpClient.sendCommand(`Accessibility.enable`);
      let i = [];
      if (t.length === 0) {
        let { root: e } = await this.#c.cdpClient.sendCommand(`DOM.getDocument`);
        i.push(e.backendNodeId);
      } else
        for (let e of t)
          if (e.sharedId) {
            let t = tr(e.sharedId);
            if (!t) throw new yt(`Invalid sharedId: ${e.sharedId}`);
            i.push(t.backendNodeId);
          } else if (e.handle) {
            let { nodeId: t } = await this.#c.cdpClient.sendCommand(`DOM.requestNode`, {
                objectId: e.handle,
              }),
              { node: n } = await this.#c.cdpClient.sendCommand(`DOM.describeNode`, { nodeId: t });
            i.push(n.backendNodeId);
          } else throw new yt(`Start node must have sharedId or handle`);
      let a = new Set();
      for (let t of i) {
        let { nodes: r } = await this.#c.cdpClient.sendCommand(`Accessibility.queryAXTree`, {
          backendNodeId: t,
          accessibleName: e.value.name,
          role: e.value.role,
        });
        for (let e of r)
          if (
            e.backendDOMNodeId &&
            e.role?.type === `role` &&
            (a.add(e.backendDOMNodeId), n !== void 0 && n > 0 && a.size >= n)
          )
            break;
      }
      return {
        nodes: (
          await Promise.all(
            Array.from(a).map(async (e) => {
              let { object: t } = await this.#c.cdpClient.sendCommand(`DOM.resolveNode`, {
                backendNodeId: e,
              });
              return await r.serializeCdpObject(t, `none`);
            })
          )
        ).filter((e) => e.type === `node`),
      };
    }
    #j() {
      let e = new Set();
      return (
        e.add(this.cdpTarget),
        this.allChildren.forEach((t) => e.add(t.cdpTarget)),
        Array.from(e)
      );
    }
    async setTimezoneOverride(e) {
      await Promise.all(this.#j().map(async (t) => await t.setTimezoneOverride(e)));
    }
    async setLocaleOverride(e) {
      await Promise.all(this.#j().map(async (t) => await t.setLocaleOverride(e)));
    }
    async setGeolocationOverride(e) {
      await Promise.all(this.#j().map(async (t) => await t.setGeolocationOverride(e)));
    }
    async setScriptingEnabled(e) {
      await Promise.all(this.#j().map(async (t) => await t.setScriptingEnabled(e)));
    }
    async setUserAgentAndAcceptLanguage(e, t, n) {
      await Promise.all(this.#j().map(async (r) => await r.setUserAgentAndAcceptLanguage(e, t, n)));
    }
    async setEmulatedNetworkConditions(e) {
      await Promise.all(this.#j().map(async (t) => await t.setEmulatedNetworkConditions(e)));
    }
    async setTouchOverride(e) {
      await Promise.allSettled(this.#j().map(async (t) => await t.setTouchOverride(e)));
    }
    async setExtraHeaders(e) {
      await Promise.all(this.#j().map(async (t) => await t.setExtraHeaders(e)));
    }
    async setScrollbarTypeOverride(e) {
      let t = this.#h.getActiveConfig(this.id, this.userContext);
      await this.cdpTarget.setDeviceMetricsOverride(
        t.viewport ?? null,
        t.devicePixelRatio ?? null,
        t.screenOrientation ?? null,
        t.screenArea ?? null,
        e
      );
    }
  };
cr = lr;
function ur(e) {
  return ([`://`, ``].includes(e) && (e = `null`), e);
}
function dr(e) {
  let { quality: t, type: n } = e.format ?? { type: `image/png` };
  switch (n) {
    case `image/png`:
      return { format: `png` };
    case `image/jpeg`:
      return { format: `jpeg`, ...(t === void 0 ? {} : { quality: Math.round(t * 100) }) };
    case `image/webp`:
      return { format: `webp`, ...(t === void 0 ? {} : { quality: Math.round(t * 100) }) };
  }
  throw new R(`Image format '${n}' is not a supported format`);
}
function fr(e) {
  if (e.type !== `object` || e.value === void 0) return;
  let t = e.value.find(([e]) => e === `x`)?.[1],
    n = e.value.find(([e]) => e === `y`)?.[1],
    r = e.value.find(([e]) => e === `height`)?.[1],
    i = e.value.find(([e]) => e === `width`)?.[1];
  if (
    !(t?.type !== `number` || n?.type !== `number` || r?.type !== `number` || i?.type !== `number`)
  )
    return { x: t.value, y: n.value, width: i.value, height: r.value };
}
function pr(e) {
  return {
    ...(e.width < 0 ? { x: e.x + e.width, width: -e.width } : { x: e.x, width: e.width }),
    ...(e.height < 0 ? { y: e.y + e.height, height: -e.height } : { y: e.y, height: e.height }),
  };
}
function mr(e, t) {
  ((e = pr(e)), (t = pr(t)));
  let n = Math.max(e.x, t.x),
    r = Math.max(e.y, t.y);
  return {
    x: n,
    y: r,
    width: Math.max(Math.min(e.x + e.width, t.x + t.width) - n, 0),
    height: Math.max(Math.min(e.y + e.height, t.y + t.height) - r, 0),
  };
}
function hr(e) {
  if (((e = e.trim()), !/^[0-9]+$/.test(e))) throw new R(`Invalid integer: ${e}`);
  return parseInt(e);
}
var gr = class extends nr {
    #e;
    #t;
    constructor(e, t, n, r, i, a, o, s, c) {
      (super(e, t, n, r, i, o, s), (this.#t = a), (this.#e = c), this.initialize());
    }
    get associatedBrowsingContexts() {
      return this.#t.flatMap((e) => e.associatedBrowsingContexts);
    }
    get realmType() {
      return this.#e;
    }
    get source() {
      return { realm: this.realmId, context: this.associatedBrowsingContexts[0]?.id };
    }
    get realmInfo() {
      let e = this.#t.map((e) => e.realmId),
        { realmType: t } = this;
      switch (t) {
        case `dedicated-worker`: {
          let n = e[0];
          if (n === void 0 || e.length !== 1)
            throw Error(`Dedicated worker must have exactly one owner`);
          return { ...this.baseInfo, type: t, owners: [n] };
        }
        case `service-worker`:
        case `shared-worker`:
          return { ...this.baseInfo, type: t };
      }
    }
  },
  _r = [`%s`, `%d`, `%i`, `%f`, `%o`, `%O`, `%c`];
function vr(e) {
  return _r.some((t) => e.includes(t));
}
function yr(e) {
  let t = ``,
    n = e[0].value.toString(),
    r = e.slice(1, void 0),
    i = n.split(new RegExp(_r.map((e) => `(${e})`).join(`|`), `g`));
  for (let n of i)
    if (!(n === void 0 || n === ``))
      if (vr(n)) {
        let i = r.shift();
        (V(i, `Less value is provided: "${Sr(e, !1)}"`),
          n === `%s`
            ? (t += xr(i))
            : n === `%d` || n === `%i`
              ? i.type === `bigint` || i.type === `number` || i.type === `string`
                ? (t += parseInt(i.value.toString(), 10))
                : (t += `NaN`)
              : n === `%f`
                ? i.type === `bigint` || i.type === `number` || i.type === `string`
                  ? (t += parseFloat(i.value.toString()))
                  : (t += `NaN`)
                : (t += br(i)));
      } else t += n;
  if (r.length > 0) throw Error(`More value is provided: "${Sr(e, !1)}"`);
  return t;
}
function br(e) {
  if (
    e.type !== `array` &&
    e.type !== `bigint` &&
    e.type !== `date` &&
    e.type !== `number` &&
    e.type !== `object` &&
    e.type !== `string`
  )
    return xr(e);
  if (e.type === `bigint`) return `${e.value.toString()}n`;
  if (e.type === `number`) return e.value.toString();
  if ([`date`, `string`].includes(e.type)) return JSON.stringify(e.value);
  if (e.type === `object`)
    return `{${e.value.map((e) => `${JSON.stringify(e[0])}:${br(e[1])}`).join(`,`)}}`;
  if (e.type === `array`) return `[${e.value?.map((e) => br(e)).join(`,`) ?? ``}]`;
  throw Error(`Invalid value type: ${e}`);
}
function xr(e) {
  if (!Object.hasOwn(e, `value`)) return e.type;
  switch (e.type) {
    case `string`:
    case `number`:
    case `boolean`:
    case `bigint`:
      return String(e.value);
    case `regexp`:
      return `/${e.value.pattern}/${e.value.flags ?? ``}`;
    case `date`:
      return new Date(e.value).toString();
    case `object`:
      return `Object(${e.value?.length ?? ``})`;
    case `array`:
      return `Array(${e.value?.length ?? ``})`;
    case `map`:
      return `Map(${e.value?.length})`;
    case `set`:
      return `Set(${e.value?.length})`;
    default:
      return e.type;
  }
}
function Sr(e, t) {
  let n = e[0];
  return n
    ? n.type === `string` && vr(n.value.toString()) && t
      ? yr(e)
      : e.map((e) => xr(e)).join(` `)
    : ``;
}
var Cr;
function wr(e) {
  let t = e?.callFrames.map((e) => ({
    columnNumber: e.columnNumber,
    functionName: e.functionName,
    lineNumber: e.lineNumber,
    url: e.url,
  }));
  return t ? { callFrames: t } : void 0;
}
function Tr(e) {
  return [`error`, `assert`].includes(e)
    ? `error`
    : [`debug`, `trace`].includes(e)
      ? `debug`
      : [`warn`, `warning`].includes(e)
        ? `warn`
        : `info`;
}
function Er(e) {
  switch (e) {
    case `warning`:
      return `warn`;
    case `startGroup`:
      return `group`;
    case `startGroupCollapsed`:
      return `groupCollapsed`;
    case `endGroup`:
      return `groupEnd`;
  }
  return e;
}
var Dr = class {
  #e;
  #t;
  #n;
  #r;
  constructor(e, t, n, r) {
    ((this.#n = e), (this.#t = t), (this.#e = n), (this.#r = r));
  }
  static create(e, t, n, r) {
    let i = new Cr(e, t, n, r);
    return (i.#a(), i);
  }
  async #i(e, t) {
    switch (e.type) {
      case `undefined`:
        return { type: `undefined` };
      case `boolean`:
        return { type: `boolean`, value: e.value };
      case `string`:
        return { type: `string`, value: e.value };
      case `number`:
        return { type: `number`, value: e.unserializableValue ?? e.value };
      case `bigint`:
        if (
          e.unserializableValue !== void 0 &&
          e.unserializableValue[e.unserializableValue.length - 1] === `n`
        )
          return { type: e.type, value: e.unserializableValue.slice(0, -1) };
        break;
      case `object`:
        if (e.subtype === `null`) return { type: `null` };
        break;
      default:
        break;
    }
    return await t.serializeCdpObject(e, `none`);
  }
  #a() {
    (this.#n.cdpClient.on(`Runtime.consoleAPICalled`, (e) => {
      let t = this.#t.findRealm({
        cdpSessionId: this.#n.cdpSessionId,
        executionContextId: e.executionContextId,
      });
      if (t === void 0) {
        this.#r?.(j.cdp, e);
        return;
      }
      let n = Promise.all(e.args.map((e) => this.#i(e, t)));
      for (let r of t.associatedBrowsingContexts)
        this.#e.registerPromiseEvent(
          n.then(
            (n) => ({
              kind: `success`,
              value: {
                type: `event`,
                method: P.EventNames.LogEntryAdded,
                params: {
                  level: Tr(e.type),
                  source: t.source,
                  text: Sr(n, !0),
                  timestamp: Math.round(e.timestamp),
                  stackTrace: wr(e.stackTrace),
                  type: `console`,
                  method: Er(e.type),
                  args: n,
                },
              },
            }),
            (e) => ({ kind: `error`, error: e })
          ),
          r.id,
          P.EventNames.LogEntryAdded
        );
    }),
      this.#n.cdpClient.on(`Runtime.exceptionThrown`, (e) => {
        let t = this.#t.findRealm({
          cdpSessionId: this.#n.cdpSessionId,
          executionContextId: e.exceptionDetails.executionContextId,
        });
        if (t === void 0) {
          this.#r?.(j.cdp, e);
          return;
        }
        for (let n of t.associatedBrowsingContexts)
          this.#e.registerPromiseEvent(
            Cr.#o(e, t).then(
              (n) => ({
                kind: `success`,
                value: {
                  type: `event`,
                  method: P.EventNames.LogEntryAdded,
                  params: {
                    level: `error`,
                    source: t.source,
                    text: n,
                    timestamp: Math.round(e.timestamp),
                    stackTrace: wr(e.exceptionDetails.stackTrace),
                    type: `javascript`,
                  },
                },
              }),
              (e) => ({ kind: `error`, error: e })
            ),
            n.id,
            P.EventNames.LogEntryAdded
          );
      }));
  }
  static async #o(e, t) {
    return e.exceptionDetails.exception
      ? t === void 0
        ? JSON.stringify(e.exceptionDetails.exception)
        : await t.stringifyObject(e.exceptionDetails.exception)
      : e.exceptionDetails.text;
  }
};
Cr = Dr;
var Or = class {
    #e = new Map();
    #t = new Map();
    #n = new Map();
    #r;
    #i;
    constructor(e, t) {
      ((this.#r = e), (this.#i = t));
    }
    addDataCollector(e) {
      if (e.maxEncodedDataSize < 1 || e.maxEncodedDataSize > this.#r)
        throw new R(`Max encoded data size should be between 1 and ${this.#r}`);
      let t = U();
      return (this.#e.set(t, e), t);
    }
    isCollected(e, t, n) {
      if (n !== void 0 && !this.#e.has(n)) throw new kt(`Unknown collector ${n}`);
      if (t === void 0)
        return this.isCollected(e, `response`, n) || this.isCollected(e, `request`, n);
      let r = this.#a(t).get(e);
      return r === void 0 || r.size === 0 ? !1 : n === void 0 ? !0 : !!r.has(n);
    }
    #a(e) {
      switch (e) {
        case `response`:
          return this.#t;
        case `request`:
          return this.#n;
        default:
          throw new B(`Unsupported data type ${e}`);
      }
    }
    disownData(e, t, n) {
      let r = this.#a(t);
      (n !== void 0 && r.get(e)?.delete(n), (n === void 0 || r.get(e)?.size === 0) && r.delete(e));
    }
    #o(e, t, n, r, i) {
      let a = this.#e.get(e);
      if (a === void 0) throw new kt(`Unknown collector ${e}`);
      return (a.userContexts && !a.userContexts.includes(i)) ||
        (a.contexts && !a.contexts.includes(r)) ||
        !a.dataTypes.includes(n)
        ? !1
        : n === `request` && t.bodySize > a.maxEncodedDataSize
          ? (this.#i?.(j.debug, `Request's ${t.id} body size is too big for the collector ${e}`),
            !1)
          : n === `response` && t.encodedResponseBodySize > a.maxEncodedDataSize
            ? (this.#i?.(j.debug, `Request's ${t.id} response is too big for the collector ${e}`),
              !1)
            : (this.#i?.(j.debug, `Collector ${e} collected ${n} of ${t.id}`), !0);
    }
    collectIfNeeded(e, t, n, r) {
      let i = [...this.#e.keys()].filter((i) => this.#o(i, e, t, n, r));
      i.length > 0 && this.#a(t).set(e.id, new Set(i));
    }
    removeDataCollector(e) {
      if (!this.#e.has(e)) throw new kt(`Collector ${e} does not exist`);
      this.#e.delete(e);
      let t = [];
      for (let [n, r] of this.#t)
        r.has(e) && (r.delete(e), r.size === 0 && (this.#t.delete(n), t.push(n)));
      for (let [n, r] of this.#n)
        r.has(e) && (r.delete(e), r.size === 0 && (this.#n.delete(n), t.push(n)));
      return t;
    }
  },
  kr = class extends Map {
    #e;
    constructor(e, t) {
      (super(t), (this.#e = e));
    }
    get(e) {
      return (this.has(e) || this.set(e, this.#e(e)), super.get(e));
    }
  },
  Ar,
  jr = /(?<=realm=").*(?=")/,
  Mr = class {
    static unknownParameter = `UNKNOWN`;
    #e;
    #t;
    #n;
    #r = !1;
    #i;
    #a = {};
    #o;
    #s;
    #c = { decodedSize: 0, encodedSize: 0 };
    #l;
    #u;
    #d;
    #f;
    #p = {
      [I.EventNames.AuthRequired]: !1,
      [I.EventNames.BeforeRequestSent]: !1,
      [I.EventNames.FetchError]: !1,
      [I.EventNames.ResponseCompleted]: !1,
      [I.EventNames.ResponseStarted]: !1,
    };
    waitNextPhase = new G();
    constructor(e, t, n, r, i = 0, a) {
      ((this.#e = e), (this.#l = t), (this.#u = n), (this.#d = r), (this.#i = i), (this.#f = a));
    }
    get id() {
      return this.#e;
    }
    get fetchId() {
      return this.#t;
    }
    get interceptPhase() {
      return this.#n;
    }
    get url() {
      let e = this.#a.info?.request.urlFragment ?? this.#a.paused?.request.urlFragment ?? ``;
      return `${this.#c.paused?.request.url ?? this.#o?.url ?? this.#c.info?.url ?? this.#a.auth?.request.url ?? this.#a.info?.request.url ?? this.#a.paused?.request.url ?? Ar.unknownParameter}${e}`;
    }
    get redirectCount() {
      return this.#i;
    }
    get cdpTarget() {
      return this.#d;
    }
    updateCdpTarget(e) {
      e !== this.#d &&
        (this.#f?.(j.debugInfo, `Request ${this.id} was moved from ${this.#d.id} to ${e.id}`),
        (this.#d = e));
    }
    get cdpClient() {
      return this.#d.cdpClient;
    }
    isRedirecting() {
      return !!this.#a.info;
    }
    #m() {
      return this.url.startsWith(`data:`);
    }
    #h() {
      return this.#m() || this.#r;
    }
    get #g() {
      return (
        this.#o?.method ??
        this.#a.info?.request.method ??
        this.#a.paused?.request.method ??
        this.#a.auth?.request.method ??
        this.#c.paused?.request.method
      );
    }
    get #_() {
      return !this.#a.info ||
        !this.#a.info.loaderId ||
        this.#a.info.loaderId !== this.#a.info.requestId
        ? null
        : this.#u.getNavigationId(this.#b ?? void 0);
    }
    get #v() {
      let e = [];
      return (
        this.#a.extraInfo &&
          (e = this.#a.extraInfo.associatedCookies
            .filter(({ blockedReasons: e }) => !Array.isArray(e) || e.length === 0)
            .map(({ cookie: e }) => vn(e))),
        e
      );
    }
    #y(e) {
      if (e !== void 0 && e[`Content-Length`] !== void 0) {
        let t = Number.parseInt(e[`Content-Length`]);
        if (Number.isInteger(t)) return t;
        this.#f?.(j.debugError, `Unexpected non-integer 'Content-Length' header`);
      }
    }
    get bodySize() {
      return typeof this.#o?.bodySize == `number`
        ? this.#o.bodySize
        : this.#a.info?.request.postDataEntries === void 0
          ? (this.#y(this.#a.info?.request.headers) ?? this.#y(this.#a.extraInfo?.headers) ?? 0)
          : En(this.#a.info?.request.postDataEntries);
    }
    get #b() {
      let e =
        this.#c.paused?.frameId ??
        this.#a.info?.frameId ??
        this.#a.paused?.frameId ??
        this.#a.auth?.frameId;
      if (e !== void 0) return e;
      if (
        this.#a?.info?.initiator.type === `preflight` &&
        this.#a?.info?.initiator.requestId !== void 0
      ) {
        let e = this.#u.getRequestById(this.#a?.info?.initiator.requestId);
        if (e !== void 0) return e.#a.info?.frameId ?? null;
      }
      return null;
    }
    get #x() {
      return (
        this.#s?.statusCode ??
        this.#c.paused?.responseStatusCode ??
        this.#c.extraInfo?.statusCode ??
        this.#c.info?.status
      );
    }
    get #S() {
      let e = [];
      if (this.#o?.headers) {
        let t = new kr(() => []);
        for (let e of this.#o.headers) t.get(e.name).push(e.value.value);
        for (let [n, r] of t.entries())
          e.push({
            name: n,
            value: {
              type: `string`,
              value: r
                .join(
                  `
`
                )
                .trimEnd(),
            },
          });
      } else e = [...mn(this.#a.info?.request.headers), ...mn(this.#a.extraInfo?.headers)];
      return e;
    }
    get #C() {
      if (!this.#c.info || !(this.#x === 401 || this.#x === 407)) return;
      let e = this.#x === 401 ? `WWW-Authenticate` : `Proxy-Authenticate`,
        t = [];
      for (let [n, r] of Object.entries(this.#c.info.headers))
        n.localeCompare(e, void 0, { sensitivity: `base` }) === 0 &&
          t.push({ scheme: r.split(` `).at(0) ?? ``, realm: r.match(jr)?.at(0) ?? `` });
      return t;
    }
    get #w() {
      let e = H(H(this.#c.info?.timing?.requestTime) - H(this.#a.info?.timestamp));
      return {
        timeOrigin: Math.round(H(this.#a.info?.wallTime) * 1e3),
        requestTime: 0,
        redirectStart: 0,
        redirectEnd: 0,
        fetchStart: H(this.#c.info?.timing?.workerFetchStart, e),
        dnsStart: H(this.#c.info?.timing?.dnsStart, e),
        dnsEnd: H(this.#c.info?.timing?.dnsEnd, e),
        connectStart: H(this.#c.info?.timing?.connectStart, e),
        connectEnd: H(this.#c.info?.timing?.connectEnd, e),
        tlsStart: H(this.#c.info?.timing?.sslStart, e),
        requestStart: H(this.#c.info?.timing?.sendStart, e),
        responseStart: H(this.#c.info?.timing?.receiveHeadersStart, e),
        responseEnd: H(this.#c.info?.timing?.receiveHeadersEnd, e),
      };
    }
    #T() {
      (this.waitNextPhase.resolve(), (this.waitNextPhase = new G()));
    }
    #E(e) {
      return this.#h() || !this.#d.isSubscribedTo(`network.${e}`)
        ? new Set()
        : this.#u.getInterceptsForPhase(this, e);
    }
    #D(e) {
      return this.#E(e).size > 0;
    }
    handleRedirect(e) {
      ((this.#c.hasExtraInfo = !1),
        (this.#c.decodedSize = 0),
        (this.#c.encodedSize = 0),
        (this.#c.info = e.redirectResponse),
        this.#O({ wasRedirected: !0 }));
    }
    #O(e = {}) {
      let t =
          e.wasRedirected ||
          !!this.#c.loadingFailed ||
          this.#m() ||
          !!this.#a.extraInfo ||
          this.#D(`authRequired`) ||
          this.#r ||
          !!(this.#c.info && !this.#c.hasExtraInfo),
        n = this.#h(),
        r = !n && this.#D(`beforeRequestSent`),
        i = !r || (r && !!this.#a.paused);
      this.#a.info && (r ? i : t) && this.#M(this.#R.bind(this));
      let a = !!this.#c.extraInfo || this.#r || !!(this.#c.info && !this.#c.hasExtraInfo),
        o = !n && this.#D(`responseStarted`);
      (this.#c.info || (o && this.#c.paused)) && this.#M(this.#z.bind(this));
      let s = !o || (o && !!this.#c.paused),
        c = !!this.#c.loadingFailed || !!this.#c.loadingFinished;
      this.#c.info &&
        a &&
        s &&
        (c || e.wasRedirected) &&
        (this.#M(this.#B.bind(this)), this.#u.disposeRequest(this.id));
    }
    onRequestWillBeSentEvent(e) {
      ((this.#a.info = e), this.#u.collectIfNeeded(this, `request`), this.#O());
    }
    onRequestWillBeSentExtraInfoEvent(e) {
      ((this.#a.extraInfo = e), this.#O());
    }
    onResponseReceivedExtraInfoEvent(e) {
      (e.statusCode >= 300 &&
        e.statusCode <= 399 &&
        this.#a.info &&
        e.headers.location === this.#a.info.request.url) ||
        ((this.#c.extraInfo = e), this.#O());
    }
    onResponseReceivedEvent(e) {
      ((this.#c.hasExtraInfo = e.hasExtraInfo),
        (this.#c.info = e.response),
        this.#u.collectIfNeeded(this, `response`),
        this.#O());
    }
    onServedFromCache() {
      ((this.#r = !0), this.#O());
    }
    onLoadingFinishedEvent(e) {
      ((this.#c.loadingFinished = e), this.#O());
    }
    onDataReceivedEvent(e) {
      ((this.#c.decodedSize += e.dataLength), (this.#c.encodedSize += e.encodedDataLength));
    }
    onLoadingFailedEvent(e) {
      ((this.#c.loadingFailed = e),
        this.#O(),
        this.#M(() => ({
          method: I.EventNames.FetchError,
          params: { ...this.#N(), errorText: e.errorText },
        })));
    }
    async failRequest(e) {
      (V(this.#t, `Network Interception not set-up.`),
        await this.cdpClient.sendCommand(`Fetch.failRequest`, {
          requestId: this.#t,
          errorReason: e,
        }),
        (this.#n = void 0));
    }
    onRequestPaused(e) {
      ((this.#t = e.requestId),
        e.responseStatusCode || e.responseErrorReason
          ? ((this.#c.paused = e),
            this.#D(`responseStarted`) &&
            !this.#p[I.EventNames.ResponseStarted] &&
            this.#t !== this.id
              ? (this.#n = `responseStarted`)
              : this.#A())
          : ((this.#a.paused = e),
            this.#D(`beforeRequestSent`) &&
            !this.#p[I.EventNames.BeforeRequestSent] &&
            this.#t !== this.id
              ? (this.#n = `beforeRequestSent`)
              : this.#k()),
        this.#O());
    }
    onAuthRequired(e) {
      ((this.#t = e.requestId),
        (this.#a.auth = e),
        this.#D(`authRequired`) && this.#t !== this.id
          ? ((this.#n = `authRequired`), this.#O())
          : this.#j({ response: `Default` }),
        this.#M(() => ({
          method: I.EventNames.AuthRequired,
          params: { ...this.#N(`authRequired`), response: this.#P() },
        })));
    }
    async continueRequest(e = {}) {
      let t = hn(this.#H(e.headers, e.cookies)),
        n = Nr(e.body);
      (await this.#k({ url: e.url, method: e.method, headers: t, postData: n }),
        (this.#o = {
          url: e.url,
          method: e.method,
          headers: e.headers,
          cookies: e.cookies,
          bodySize: Pr(e.body),
        }));
    }
    async #k(e = {}) {
      (V(this.#t, `Network Interception not set-up.`),
        await this.cdpClient.sendCommand(`Fetch.continueRequest`, {
          requestId: this.#t,
          url: e.url,
          method: e.method,
          headers: e.headers,
          postData: e.postData,
        }),
        (this.#n = void 0));
    }
    async continueResponse(e = {}) {
      if (this.interceptPhase === `authRequired`)
        if (e.credentials)
          await Promise.all([
            this.waitNextPhase,
            await this.#j({
              response: `ProvideCredentials`,
              username: e.credentials.username,
              password: e.credentials.password,
            }),
          ]);
        else return await this.#j({ response: `ProvideCredentials` });
      if (this.#n === `responseStarted`) {
        let t = this.#H(e.headers, e.cookies),
          n = hn(t);
        (await this.#A({
          responseCode: e.statusCode ?? this.#c.paused?.responseStatusCode,
          responsePhrase: e.reasonPhrase ?? this.#c.paused?.responseStatusText,
          responseHeaders: n ?? this.#c.paused?.responseHeaders,
        }),
          (this.#s = { statusCode: e.statusCode, headers: t }));
      }
    }
    async #A({ responseCode: e, responsePhrase: t, responseHeaders: n } = {}) {
      (V(this.#t, `Network Interception not set-up.`),
        await this.cdpClient.sendCommand(`Fetch.continueResponse`, {
          requestId: this.#t,
          responseCode: e,
          responsePhrase: t,
          responseHeaders: n,
        }),
        (this.#n = void 0));
    }
    async continueWithAuth(e) {
      let t, n;
      if (e.action === `provideCredentials`) {
        let { credentials: r } = e;
        ((t = r.username), (n = r.password));
      }
      let r = _n(e.action);
      await this.#j({ response: r, username: t, password: n });
    }
    async provideResponse(e) {
      if ((V(this.#t, `Network Interception not set-up.`), this.interceptPhase === `authRequired`))
        return await this.#j({ response: `ProvideCredentials` });
      if (!e.body && !e.headers) return await this.#k();
      let t = hn(this.#H(e.headers, e.cookies)),
        n = e.statusCode ?? this.#x ?? 200;
      (await this.cdpClient.sendCommand(`Fetch.fulfillRequest`, {
        requestId: this.#t,
        responseCode: n,
        responsePhrase: e.reasonPhrase,
        responseHeaders: t,
        body: Nr(e.body),
      }),
        (this.#n = void 0));
    }
    dispose() {
      this.waitNextPhase.reject(Error(`waitNextPhase disposed`));
    }
    async #j(e) {
      (V(this.#t, `Network Interception not set-up.`),
        await this.cdpClient.sendCommand(`Fetch.continueWithAuth`, {
          requestId: this.#t,
          authChallengeResponse: e,
        }),
        (this.#n = void 0));
    }
    #M(e) {
      let t;
      try {
        t = e();
      } catch (e) {
        this.#f?.(j.debugError, e);
        return;
      }
      this.#V() ||
        (this.#p[t.method] && t.method !== I.EventNames.AuthRequired) ||
        (this.#T(),
        (this.#p[t.method] = !0),
        this.#b
          ? this.#l.registerEvent(Object.assign(t, { type: `event` }), this.#b)
          : this.#l.registerGlobalEvent(Object.assign(t, { type: `event` })));
    }
    #N(e) {
      let t = { isBlocked: !1 };
      if (e) {
        let n = this.#E(e);
        ((t.isBlocked = n.size > 0), t.isBlocked && (t.intercepts = [...n]));
      }
      return {
        context: this.#b,
        navigation: this.#_,
        redirectCount: this.#i,
        request: this.#F(),
        timestamp: Math.round(H(this.#a.info?.wallTime) * 1e3),
        ...t,
      };
    }
    #P() {
      this.#c.info?.fromDiskCache && (this.#c.extraInfo = void 0);
      let e = this.#c.info?.headers ?? {},
        t = this.#c.extraInfo?.headers ?? {};
      for (let [n, r] of Object.entries(t)) e[n] = r;
      let n = mn(e),
        r = this.#C;
      return {
        url: this.url,
        protocol: this.#c.info?.protocol ?? ``,
        status: this.#x ?? -1,
        statusText: this.#c.info?.statusText || this.#c.paused?.responseStatusText || ``,
        fromCache: this.#c.info?.fromDiskCache || this.#c.info?.fromPrefetchCache || this.#r,
        headers: this.#s?.headers ?? n,
        mimeType: this.#c.info?.mimeType || ``,
        bytesReceived: this.encodedResponseBodySize,
        headersSize: dn(n),
        bodySize: this.encodedResponseBodySize,
        content: { size: this.#c.decodedSize ?? 0 },
        ...(r ? { authChallenges: r } : {}),
        'goog:securityDetails': this.#c.info?.securityDetails,
      };
    }
    get encodedResponseBodySize() {
      return (
        this.#c.loadingFinished?.encodedDataLength ??
        this.#c.info?.encodedDataLength ??
        this.#c.encodedSize ??
        0
      );
    }
    #F() {
      let e = this.#S;
      return {
        request: this.#e,
        url: this.url,
        method: this.#g ?? Ar.unknownParameter,
        headers: e,
        cookies: this.#v,
        headersSize: dn(e),
        bodySize: this.bodySize,
        destination: this.#I(),
        initiatorType: this.#L(),
        timings: this.#w,
        'goog:postData': this.#a.info?.request?.postData,
        'goog:hasPostData': this.#a.info?.request?.hasPostData,
        'goog:resourceType': this.#a.info?.type,
        'goog:resourceInitiator': this.#a.info?.initiator,
      };
    }
    #I() {
      switch (this.#a.info?.type) {
        case `Script`:
          return `script`;
        case `Stylesheet`:
          return `style`;
        case `Image`:
          return `image`;
        case `Document`:
          return this.#a.info?.initiator.type === `parser` ? `iframe` : `document`;
        default:
          return ``;
      }
    }
    #L() {
      if (this.#a.info?.initiator.type === `parser`)
        switch (this.#a.info?.type) {
          case `Document`:
            return `iframe`;
          case `Font`:
            return this.#a.info?.initiator?.url === this.#a.info?.documentURL ? `font` : `css`;
          case `Image`:
            return this.#a.info?.initiator?.url === this.#a.info?.documentURL ? `img` : `css`;
          case `Script`:
            return `script`;
          case `Stylesheet`:
            return `link`;
          default:
            return null;
        }
      return this.#a?.info?.type === `Fetch` ? `fetch` : null;
    }
    #R() {
      return (
        V(this.#a.info, `RequestWillBeSentEvent is not set`),
        {
          method: I.EventNames.BeforeRequestSent,
          params: {
            ...this.#N(`beforeRequestSent`),
            initiator: {
              type: Ar.#U(this.#a.info.initiator.type),
              columnNumber: this.#a.info.initiator.columnNumber,
              lineNumber: this.#a.info.initiator.lineNumber,
              stackTrace: this.#a.info.initiator.stack,
              request: this.#a.info.initiator.requestId,
            },
          },
        }
      );
    }
    #z() {
      return {
        method: I.EventNames.ResponseStarted,
        params: { ...this.#N(`responseStarted`), response: this.#P() },
      };
    }
    #B() {
      return {
        method: I.EventNames.ResponseCompleted,
        params: { ...this.#N(), response: this.#P() },
      };
    }
    #V() {
      let e = `/favicon.ico`;
      return this.#a.paused?.request.url.endsWith(e) ?? this.#a.info?.request.url.endsWith(e) ?? !1;
    }
    #H(e, t) {
      if (!e && !t) return;
      let n = e,
        r = gn(t);
      return (
        r && !n && (n = this.#S),
        r &&
          n &&
          (n.filter((e) => e.name.localeCompare(`cookie`, void 0, { sensitivity: `base` }) !== 0),
          n.push(r)),
        n
      );
    }
    static #U(e) {
      switch (e) {
        case `parser`:
        case `script`:
        case `preflight`:
          return e;
        default:
          return `other`;
      }
    }
  };
Ar = Mr;
function Nr(e) {
  let t;
  return (e?.type === `string` ? (t = fn(e.value)) : e?.type === `base64` && (t = e.value), t);
}
function Pr(e) {
  return e?.type === `string` ? e.value.length : e?.type === `base64` ? atob(e.value).length : 0;
}
var Fr = 2e8,
  Ir = class {
    #e;
    #t;
    #n;
    #r;
    #i = new Map();
    #a = new Map();
    #o = `default`;
    constructor(e, t, n, r) {
      ((this.#e = t),
        (this.#t = e),
        (this.#n = new Or(Fr, r)),
        n.on(`Target.detachedFromTarget`, ({ sessionId: e }) => {
          this.disposeRequestMap(e);
        }),
        (this.#r = r));
    }
    #s(e, t, n) {
      let r = this.getRequestById(e);
      return n === void 0 && r
        ? r
        : ((r = new Mr(e, this.#t, this, t, n, this.#r)), this.addRequest(r), r);
    }
    onCdpTargetCreated(e) {
      let t = e.cdpClient,
        n = [
          [
            `Network.requestWillBeSent`,
            (t) => {
              let n = this.getRequestById(t.requestId);
              (n?.updateCdpTarget(e),
                n && n.isRedirecting()
                  ? (n.handleRedirect(t),
                    this.disposeRequest(t.requestId),
                    this.#s(t.requestId, e, n.redirectCount + 1).onRequestWillBeSentEvent(t))
                  : this.#s(t.requestId, e).onRequestWillBeSentEvent(t));
            },
          ],
          [
            `Network.requestWillBeSentExtraInfo`,
            (t) => {
              let n = this.#s(t.requestId, e);
              (n.updateCdpTarget(e), n.onRequestWillBeSentExtraInfoEvent(t));
            },
          ],
          [
            `Network.responseReceived`,
            (t) => {
              let n = this.#s(t.requestId, e);
              (n.updateCdpTarget(e), n.onResponseReceivedEvent(t));
            },
          ],
          [
            `Network.responseReceivedExtraInfo`,
            (t) => {
              let n = this.#s(t.requestId, e);
              (n.updateCdpTarget(e), n.onResponseReceivedExtraInfoEvent(t));
            },
          ],
          [
            `Network.requestServedFromCache`,
            (t) => {
              let n = this.#s(t.requestId, e);
              (n.updateCdpTarget(e), n.onServedFromCache());
            },
          ],
          [
            `Fetch.requestPaused`,
            (t) => {
              let n = this.#s(t.networkId ?? t.requestId, e);
              (n.updateCdpTarget(e), n.onRequestPaused(t));
            },
          ],
          [
            `Fetch.authRequired`,
            (t) => {
              let n = this.getRequestByFetchId(t.requestId);
              ((n ||= this.#s(t.requestId, e)), n.updateCdpTarget(e), n.onAuthRequired(t));
            },
          ],
          [
            `Network.dataReceived`,
            (t) => {
              let n = this.getRequestById(t.requestId);
              (n?.updateCdpTarget(e), n?.onDataReceivedEvent(t));
            },
          ],
          [
            `Network.loadingFailed`,
            (t) => {
              let n = this.#s(t.requestId, e);
              (n.updateCdpTarget(e), n.onLoadingFailedEvent(t));
            },
          ],
          [
            `Network.loadingFinished`,
            (t) => {
              let n = this.getRequestById(t.requestId);
              (n?.updateCdpTarget(e), n?.onLoadingFinishedEvent(t));
            },
          ],
        ];
      for (let [e, r] of n) t.on(e, r);
    }
    async getCollectedData(e) {
      if (!this.#n.isCollected(e.request, e.dataType, e.collector))
        throw new At(
          e.collector === void 0
            ? `No collected ${e.dataType} data`
            : `Collector ${e.collector} didn't collect ${e.dataType} data`
        );
      if (e.disown && e.collector === void 0)
        throw new R(`Cannot disown collected data without collector ID`);
      let t = this.getRequestById(e.request);
      if (t === void 0) throw new At(`No data for ${e.request}`);
      let n;
      switch (e.dataType) {
        case `response`:
          n = await this.#c(t);
          break;
        case `request`:
          n = await this.#l(t);
          break;
        default:
          throw new B(`Unsupported data type ${e.dataType}`);
      }
      return (
        e.disown &&
          e.collector !== void 0 &&
          (this.#n.disownData(t.id, e.dataType, e.collector), this.disposeRequest(t.id)),
        n
      );
    }
    async #c(e) {
      try {
        let t = await e.cdpClient.sendCommand(`Network.getResponseBody`, { requestId: e.id });
        return { bytes: { type: t.base64Encoded ? `base64` : `string`, value: t.body } };
      } catch (e) {
        throw e.code === -32e3 && e.message === `No resource with given identifier found`
          ? new At(`Response data was disposed`)
          : e.code === -32001
            ? new At(`Response data is disposed after the related page`)
            : e;
      }
    }
    async #l(e) {
      return {
        bytes: {
          type: `string`,
          value: (await e.cdpClient.sendCommand(`Network.getRequestPostData`, { requestId: e.id }))
            .postData,
        },
      };
    }
    collectIfNeeded(e, t) {
      this.#n.collectIfNeeded(e, t, e.cdpTarget.topLevelId, e.cdpTarget.userContext);
    }
    getInterceptionStages(e) {
      let t = { request: !1, response: !1, auth: !1 };
      for (let n of this.#a.values())
        (n.contexts && !n.contexts.includes(e)) ||
          ((t.request ||= n.phases.includes(`beforeRequestSent`)),
          (t.response ||= n.phases.includes(`responseStarted`)),
          (t.auth ||= n.phases.includes(`authRequired`)));
      return t;
    }
    getInterceptsForPhase(e, t) {
      if (e.url === Mr.unknownParameter) return new Set();
      let n = new Set();
      for (let [r, i] of this.#a.entries())
        if (
          !(!i.phases.includes(t) || (i.contexts && !i.contexts.includes(e.cdpTarget.topLevelId)))
        ) {
          if (i.urlPatterns.length === 0) {
            n.add(r);
            continue;
          }
          for (let t of i.urlPatterns)
            if (Tn(t, e.url)) {
              n.add(r);
              break;
            }
        }
      return n;
    }
    disposeRequestMap(e) {
      for (let t of this.#i.values())
        t.cdpClient.sessionId === e && (this.#i.delete(t.id), t.dispose());
    }
    addIntercept(e) {
      let t = U();
      return (this.#a.set(t, e), t);
    }
    removeIntercept(e) {
      if (!this.#a.has(e)) throw new vt(`Intercept '${e}' does not exist.`);
      this.#a.delete(e);
    }
    getRequestsByTarget(e) {
      let t = [];
      for (let n of this.#i.values()) n.cdpTarget === e && t.push(n);
      return t;
    }
    getRequestById(e) {
      return this.#i.get(e);
    }
    getRequestByFetchId(e) {
      for (let t of this.#i.values()) if (t.fetchId === e) return t;
    }
    addRequest(e) {
      this.#i.set(e.id, e);
    }
    disposeRequest(e) {
      this.#n.isCollected(e) || this.#i.delete(e);
    }
    getNavigationId(e) {
      return e === void 0 ? null : (this.#e.findContext(e)?.navigationId ?? null);
    }
    set defaultCacheBehavior(e) {
      this.#o = e;
    }
    get defaultCacheBehavior() {
      return this.#o;
    }
    addDataCollector(e) {
      return this.#n.addDataCollector(e);
    }
    removeDataCollector(e) {
      this.#n.removeDataCollector(e.collector).map((e) => this.disposeRequest(e));
    }
    disownData(e) {
      if (!this.#n.isCollected(e.request, e.dataType, e.collector))
        throw new At(`Collector ${e.collector} didn't collect ${e.dataType} data`);
      (this.#n.disownData(e.request, e.dataType, e.collector), this.disposeRequest(e.request));
    }
  },
  Lr = class e {
    #e;
    userContext;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o;
    #s;
    #c;
    contextConfigStorage;
    #l = new G();
    #u;
    #d;
    #f;
    #p = !1;
    #m = !1;
    #h = !1;
    #g = { request: !1, response: !1, auth: !1 };
    static create(t, n, r, i, a, o, s, c, l, u, d, f, p) {
      let m = new e(t, n, r, i, o, a, s, c, u, l, d, f, p);
      return (Dr.create(m, a, o, p), m.#b(), m.#_(), m);
    }
    constructor(e, t, n, r, i, a, o, s, c, l, u, d, f) {
      ((this.#u = d),
        (this.userContext = u),
        (this.#e = e),
        (this.#t = t),
        (this.#n = n),
        (this.#r = r),
        (this.#a = i),
        (this.#i = a),
        (this.#o = o),
        (this.#c = l),
        (this.#s = s),
        (this.contextConfigStorage = c),
        (this.#d = f));
    }
    get unblocked() {
      return this.#l;
    }
    get id() {
      return this.#e;
    }
    get cdpClient() {
      return this.#t;
    }
    get parentCdpClient() {
      return this.#r;
    }
    get browserCdpClient() {
      return this.#n;
    }
    get cdpSessionId() {
      return this.#t.sessionId;
    }
    get windowId() {
      return (
        this.#f === void 0 &&
          this.#d?.(j.debugError, `Getting windowId before it was set, returning 0`),
        this.#f ?? 0
      );
    }
    async #_() {
      let e = this.contextConfigStorage.getActiveConfig(this.topLevelId, this.userContext),
        t = await Promise.allSettled([
          this.#t.sendCommand(`Page.enable`, { enableFileChooserOpenedEvent: !0 }),
          ...(this.#E()
            ? []
            : [
                this.#t.sendCommand(`Page.setInterceptFileChooserDialog`, {
                  enabled: !0,
                  cancel: !0,
                }),
              ]),
          this.#t.sendCommand(`Page.getFrameTree`).then((e) => this.#v(e.frameTree)),
          this.#t.sendCommand(`Runtime.enable`),
          this.#t.sendCommand(`Page.setLifecycleEventsEnabled`, { enabled: !0 }),
          this.#t
            .sendCommand(`Network.enable`, {
              enableDurableMessages: e.disableNetworkDurableMessages !== !0,
              maxTotalBufferSize: Fr,
            })
            .then(() => this.toggleNetworkIfNeeded()),
          this.#t.sendCommand(`Target.setAutoAttach`, {
            autoAttach: !0,
            waitForDebuggerOnStart: !0,
            flatten: !0,
          }),
          this.#C(),
          this.#T(e),
          this.#w(),
          this.#t.sendCommand(`Runtime.runIfWaitingForDebugger`),
          this.#r.sendCommand(`Runtime.runIfWaitingForDebugger`),
          this.toggleDeviceAccessIfNeeded(),
          this.togglePreloadIfNeeded(),
        ]);
      for (let e of t)
        e instanceof Error &&
          this.#d?.(j.debugError, `Error happened when configuring a new target`, e);
      this.#l.resolve({ kind: `success`, value: void 0 });
    }
    #v(e) {
      let t = e.frame,
        n = this.#s.findContext(t.id);
      if (
        (n !== void 0 &&
          n.parentId === null &&
          t.parentId !== null &&
          t.parentId !== void 0 &&
          (n.parentId = t.parentId),
        n === void 0 && t.parentId !== void 0)
      ) {
        let e = this.#s.getContext(t.parentId);
        lr.create(
          t.id,
          t.parentId,
          this.userContext,
          e.cdpTarget,
          this.#a,
          this.#s,
          this.#i,
          this.contextConfigStorage,
          t.url,
          void 0,
          this.#d
        );
      }
      e.childFrames?.map((e) => this.#v(e));
    }
    async toggleFetchIfNeeded() {
      let e = this.#c.getInterceptionStages(this.topLevelId);
      if (
        this.#g.request === e.request &&
        this.#g.response === e.response &&
        this.#g.auth === e.auth
      )
        return;
      let t = [];
      if (
        ((this.#g = e),
        (e.request || e.auth) && t.push({ urlPattern: `*`, requestStage: `Request` }),
        e.response && t.push({ urlPattern: `*`, requestStage: `Response` }),
        t.length)
      )
        await this.#t.sendCommand(`Fetch.enable`, { patterns: t, handleAuthRequests: e.auth });
      else {
        let e = this.#c.getRequestsByTarget(this).filter((e) => e.interceptPhase);
        Promise.allSettled(e.map((e) => e.waitNextPhase))
          .then(async () =>
            this.#c.getRequestsByTarget(this).filter((e) => e.interceptPhase).length
              ? await this.toggleFetchIfNeeded()
              : await this.#t.sendCommand(`Fetch.disable`)
          )
          .catch((e) => {
            this.#d?.(j.bidi, `Disable failed`, e);
          });
      }
    }
    async toggleNetworkIfNeeded() {
      try {
        await Promise.all([this.toggleSetCacheDisabled(), this.toggleFetchIfNeeded()]);
      } catch (e) {
        if ((this.#d?.(j.debugError, e), !this.#y(e))) throw e;
      }
    }
    async toggleSetCacheDisabled(e) {
      let t = this.#c.defaultCacheBehavior === `bypass`,
        n = e ?? t;
      if (this.#m !== n) {
        this.#m = n;
        try {
          await this.#t.sendCommand(`Network.setCacheDisabled`, { cacheDisabled: n });
        } catch (e) {
          if ((this.#d?.(j.debugError, e), (this.#m = !n), !this.#y(e))) throw e;
        }
      }
    }
    async toggleDeviceAccessIfNeeded() {
      let e = this.isSubscribedTo(ct.EventNames.RequestDevicePromptUpdated);
      if (this.#p !== e) {
        this.#p = e;
        try {
          await this.#t.sendCommand(e ? `DeviceAccess.enable` : `DeviceAccess.disable`);
        } catch (t) {
          if ((this.#d?.(j.debugError, t), (this.#p = !e), !this.#y(t))) throw t;
        }
      }
    }
    async togglePreloadIfNeeded() {
      let e = this.isSubscribedTo(lt.EventNames.PrefetchStatusUpdated);
      if (this.#h !== e) {
        this.#h = e;
        try {
          await this.#t.sendCommand(e ? `Preload.enable` : `Preload.disable`);
        } catch (t) {
          if ((this.#d?.(j.debugError, t), (this.#h = !e), !this.#y(t))) throw t;
        }
      }
    }
    #y(e) {
      let t = e;
      return (
        (t.code === -32001 && t.message === `Session with given id not found.`) ||
        this.#t.isCloseError(e)
      );
    }
    #b() {
      this.#t.on(`*`, (e, t) => {
        typeof e == `string` &&
          this.#a.registerEvent(
            {
              type: `event`,
              method: `goog:cdp.${e}`,
              params: { event: e, params: t, session: this.cdpSessionId },
            },
            this.id
          );
      });
    }
    async #x(e) {
      let t = [];
      if (
        ((e.request || e.auth) && t.push({ urlPattern: `*`, requestStage: `Request` }),
        e.response && t.push({ urlPattern: `*`, requestStage: `Response` }),
        t.length)
      ) {
        let n = this.#g;
        this.#g = e;
        try {
          await this.#t.sendCommand(`Fetch.enable`, { patterns: t, handleAuthRequests: e.auth });
        } catch {
          this.#g = n;
        }
      }
    }
    async #S() {
      this.#c.getRequestsByTarget(this).filter((e) => e.interceptPhase).length === 0 &&
        ((this.#g = { request: !1, response: !1, auth: !1 }),
        await this.#t.sendCommand(`Fetch.disable`));
    }
    async toggleNetwork() {
      let e = this.#c.getInterceptionStages(this.topLevelId),
        t = Object.values(e).some((e) => e),
        n =
          this.#g.request !== e.request ||
          this.#g.response !== e.response ||
          this.#g.auth !== e.auth;
      (this.#d?.(j.debugInfo, `Toggle Network`, `Fetch (${t}) ${n}`),
        t && n && (await this.#x(e)),
        !t && n && (await this.#S()));
    }
    getChannels() {
      return this.#o.find().flatMap((e) => e.channels);
    }
    async #C() {
      let { windowId: e } = await this.#n.sendCommand(`Browser.getWindowForTarget`, {
        targetId: this.id,
      });
      this.#f = e;
    }
    async #w() {
      await Promise.all(
        this.#o.find({ targetId: this.topLevelId }).map((e) => e.initInTarget(this, !0))
      );
    }
    async setDeviceMetricsOverride(e, t, n, r, i = null) {
      if (e === null && t === null && n === null && r === null && i === null) {
        await this.cdpClient.sendCommand(`Emulation.clearDeviceMetricsOverride`);
        return;
      }
      let a = {
        width: e?.width ?? 0,
        height: e?.height ?? 0,
        deviceScaleFactor: t ?? 0,
        screenOrientation: this.#D(n) ?? void 0,
        mobile: !1,
        screenWidth: r?.width,
        screenHeight: r?.height,
        scrollbarType: i === `overlay` ? `overlay` : `default`,
      };
      await this.cdpClient.sendCommand(`Emulation.setDeviceMetricsOverride`, a);
    }
    async #T(e) {
      let t = [];
      (t.push(
        this.#t
          .sendCommand(`Page.setPrerenderingAllowed`, { isAllowed: !e.prerenderingDisabled })
          .catch(() => {})
      ),
        (e.viewport !== void 0 ||
          e.devicePixelRatio !== void 0 ||
          e.screenOrientation !== void 0 ||
          e.screenArea !== void 0) &&
          t.push(
            this.setDeviceMetricsOverride(
              e.viewport ?? null,
              e.devicePixelRatio ?? null,
              e.screenOrientation ?? null,
              e.screenArea ?? null,
              e.scrollbarType ?? null
            ).catch(() => {})
          ),
        e.geolocation !== void 0 &&
          e.geolocation !== null &&
          t.push(this.setGeolocationOverride(e.geolocation)),
        e.locale !== void 0 && t.push(this.setLocaleOverride(e.locale)),
        e.timezone !== void 0 && t.push(this.setTimezoneOverride(e.timezone)),
        e.extraHeaders !== void 0 && t.push(this.setExtraHeaders(e.extraHeaders)),
        (e.userAgent !== void 0 || e.locale !== void 0 || e.clientHints !== void 0) &&
          t.push(this.setUserAgentAndAcceptLanguage(e.userAgent, e.locale, e.clientHints)),
        e.scriptingEnabled !== void 0 && t.push(this.setScriptingEnabled(e.scriptingEnabled)),
        e.acceptInsecureCerts !== void 0 &&
          t.push(
            this.cdpClient.sendCommand(`Security.setIgnoreCertificateErrors`, {
              ignore: e.acceptInsecureCerts,
            })
          ),
        e.emulatedNetworkConditions !== void 0 &&
          t.push(this.setEmulatedNetworkConditions(e.emulatedNetworkConditions)),
        e.maxTouchPoints !== void 0 && t.push(this.setTouchOverride(e.maxTouchPoints)),
        await Promise.all(t));
    }
    get topLevelId() {
      return this.#s.findTopLevelContextId(this.id) ?? this.id;
    }
    isSubscribedTo(e) {
      return this.#a.subscriptionManager.isSubscribedTo(e, this.topLevelId);
    }
    #E() {
      let e = this.contextConfigStorage.getActiveConfig(this.topLevelId, this.userContext);
      return (e.userPromptHandler?.file ?? e.userPromptHandler?.default ?? `ignore`) === `ignore`;
    }
    async setGeolocationOverride(e) {
      if (e === null) await this.cdpClient.sendCommand(`Emulation.clearGeolocationOverride`);
      else if (`type` in e) {
        if (e.type !== `positionUnavailable`) throw new z(`Unknown geolocation error ${e.type}`);
        await this.cdpClient.sendCommand(`Emulation.setGeolocationOverride`, {});
      } else if (`latitude` in e)
        await this.cdpClient.sendCommand(`Emulation.setGeolocationOverride`, {
          latitude: e.latitude,
          longitude: e.longitude,
          accuracy: e.accuracy ?? 1,
          altitude: e.altitude ?? void 0,
          altitudeAccuracy: e.altitudeAccuracy ?? void 0,
          heading: e.heading ?? void 0,
          speed: e.speed ?? void 0,
        });
      else throw new z(`Unexpected geolocation coordinates value`);
    }
    async setTouchOverride(e) {
      let t = { enabled: e !== null };
      (e !== null && (t.maxTouchPoints = e),
        await this.cdpClient.sendCommand(`Emulation.setTouchEmulationEnabled`, t));
    }
    #D(e) {
      if (e === null) return null;
      if (e.natural === `portrait`)
        switch (e.type) {
          case `portrait-primary`:
            return { angle: 0, type: `portraitPrimary` };
          case `landscape-primary`:
            return { angle: 90, type: `landscapePrimary` };
          case `portrait-secondary`:
            return { angle: 180, type: `portraitSecondary` };
          case `landscape-secondary`:
            return { angle: 270, type: `landscapeSecondary` };
          default:
            throw new z(`Unexpected screen orientation type ${e.type}`);
        }
      if (e.natural === `landscape`)
        switch (e.type) {
          case `landscape-primary`:
            return { angle: 0, type: `landscapePrimary` };
          case `portrait-primary`:
            return { angle: 90, type: `portraitPrimary` };
          case `landscape-secondary`:
            return { angle: 180, type: `landscapeSecondary` };
          case `portrait-secondary`:
            return { angle: 270, type: `portraitSecondary` };
          default:
            throw new z(`Unexpected screen orientation type ${e.type}`);
        }
      throw new z(`Unexpected orientation natural ${e.natural}`);
    }
    async setLocaleOverride(e) {
      e === null
        ? await this.cdpClient.sendCommand(`Emulation.setLocaleOverride`, {})
        : await this.cdpClient.sendCommand(`Emulation.setLocaleOverride`, { locale: e });
    }
    async setScriptingEnabled(e) {
      await this.cdpClient.sendCommand(`Emulation.setScriptExecutionDisabled`, { value: e === !1 });
    }
    async setTimezoneOverride(e) {
      e === null
        ? await this.cdpClient.sendCommand(`Emulation.setTimezoneOverride`, { timezoneId: `` })
        : await this.cdpClient.sendCommand(`Emulation.setTimezoneOverride`, { timezoneId: e });
    }
    async setExtraHeaders(e) {
      await this.cdpClient.sendCommand(`Network.setExtraHTTPHeaders`, { headers: e });
    }
    async setUserAgentAndAcceptLanguage(e, t, n) {
      let r = n
        ? {
            brands: n.brands?.map((e) => ({ brand: e.brand, version: e.version })),
            fullVersionList: n.fullVersionList,
            platform: n.platform ?? ``,
            platformVersion: n.platformVersion ?? ``,
            architecture: n.architecture ?? ``,
            model: n.model ?? ``,
            mobile: n.mobile ?? !1,
            bitness: n.bitness ?? void 0,
            wow64: n.wow64 ?? void 0,
            formFactors: n.formFactors ?? void 0,
          }
        : void 0;
      await this.cdpClient.sendCommand(`Emulation.setUserAgentOverride`, {
        userAgent: e || (r ? this.#u : ``),
        acceptLanguage: t ?? void 0,
        platform: n?.platform ?? void 0,
        userAgentMetadata: r,
      });
    }
    async setEmulatedNetworkConditions(e) {
      if (e !== null && e.type !== `offline`)
        throw new B(`Unsupported network conditions ${e.type}`);
      await Promise.all([
        this.cdpClient.sendCommand(`Network.emulateNetworkConditionsByRule`, {
          offline: e?.type === `offline`,
          matchedNetworkConditions: [
            { urlPattern: ``, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
          ],
        }),
        this.cdpClient.sendCommand(`Network.overrideNetworkState`, {
          offline: e?.type === `offline`,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
        }),
      ]);
    }
  },
  Rr = {
    service_worker: `service-worker`,
    shared_worker: `shared-worker`,
    worker: `dedicated-worker`,
  },
  zr = class {
    #e;
    #t;
    #n = new Set();
    #r;
    #i;
    #a;
    #o;
    #s;
    #c;
    #l;
    #u;
    #d;
    #f;
    #p;
    #m;
    constructor(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
      ((this.#t = e),
        (this.#e = t),
        this.#n.add(n),
        (this.#r = n),
        (this.#i = r),
        (this.#a = i),
        (this.#c = u),
        (this.#o = o),
        (this.#u = s),
        (this.#s = c),
        (this.#d = l),
        (this.#l = a),
        (this.#f = d),
        (this.#p = f),
        (this.#m = p),
        this.#h(t));
    }
    #h(e) {
      (e.on(`Target.attachedToTarget`, (t) => {
        this.#v(t, e);
      }),
        e.on(`Target.detachedFromTarget`, this.#C.bind(this)),
        e.on(`Target.targetInfoChanged`, this.#w.bind(this)),
        e.on(`Inspector.targetCrashed`, () => {
          this.#T(e);
        }),
        e.on(`Page.frameAttached`, this.#g.bind(this)),
        e.on(`Page.frameSubtreeWillBeDetached`, this.#_.bind(this)));
    }
    #g(e) {
      let t = this.#a.findContext(e.parentFrameId);
      t !== void 0 &&
        lr.create(
          e.frameId,
          e.parentFrameId,
          t.userContext,
          t.cdpTarget,
          this.#i,
          this.#a,
          this.#l,
          this.#u,
          `about:blank`,
          void 0,
          this.#m
        );
    }
    #_(e) {
      this.#a.findContext(e.frameId)?.dispose(!0);
    }
    #v(e, t) {
      let { sessionId: n, targetInfo: r } = e,
        i = this.#t.getCdpClient(n),
        a = async () => {
          await i
            .sendCommand(`Runtime.runIfWaitingForDebugger`)
            .then(() => t.sendCommand(`Target.detachFromTarget`, e))
            .catch((e) => this.#m?.(j.debugError, e));
        };
      if (this.#r === r.targetId) {
        a();
        return;
      }
      let o = r.type === `service_worker` ? `${t.sessionId}_${r.targetId}` : r.targetId;
      if (this.#n.has(o)) return;
      this.#n.add(o);
      let s = r.browserContextId && r.browserContextId !== this.#f ? r.browserContextId : `default`;
      switch (r.type) {
        case `tab`:
          (this.#h(i),
            (async () => {
              await i.sendCommand(`Target.setAutoAttach`, {
                autoAttach: !0,
                waitForDebuggerOnStart: !0,
                flatten: !0,
              });
            })());
          return;
        case `page`:
        case `iframe`: {
          let e = this.#b(i, t, r, s),
            n = this.#a.findContext(r.targetId);
          if (n && r.type === `iframe`) n.updateCdpTarget(e);
          else {
            let n = this.#y(r, t.sessionId);
            lr.create(
              r.targetId,
              n,
              s,
              e,
              this.#i,
              this.#a,
              this.#l,
              this.#u,
              r.url === `` ? `about:blank` : r.url,
              r.openerFrameId ?? r.openerId,
              this.#m
            );
          }
          return;
        }
        case `service_worker`:
        case `worker`: {
          let e = this.#l.findRealm({ cdpSessionId: t.sessionId, sandbox: null });
          if (!e) {
            a();
            return;
          }
          let n = this.#b(i, t, r, s);
          this.#S(Rr[r.type], n, e);
          return;
        }
        case `shared_worker`: {
          let e = this.#b(i, t, r, s);
          this.#S(Rr[r.type], e);
          return;
        }
      }
      a();
    }
    #y(e, t) {
      if (e.type !== `iframe`) return null;
      let n = e.openerFrameId ?? e.openerId;
      return n === void 0
        ? t === void 0
          ? null
          : (this.#a.findContextBySession(t)?.id ?? null)
        : n;
    }
    #b(e, t, n, r) {
      (this.#h(e), this.#c.onCdpTargetCreated(n.targetId, r));
      let i = Lr.create(
        n.targetId,
        e,
        this.#e,
        t,
        this.#l,
        this.#i,
        this.#c,
        this.#a,
        this.#o,
        this.#u,
        r,
        this.#p,
        this.#m
      );
      return (
        this.#o.onCdpTargetCreated(i),
        this.#s.onCdpTargetCreated(i),
        this.#d.onCdpTargetCreated(i),
        i
      );
    }
    #x = new Map();
    #S(e, t, n) {
      t.cdpClient.on(`Runtime.executionContextCreated`, (r) => {
        let { uniqueId: i, id: a, origin: o } = r.context,
          s = new gr(t.cdpClient, this.#i, a, this.#m, ur(o), n ? [n] : [], i, this.#l, e);
        this.#x.set(t.cdpSessionId, s);
      });
    }
    #C({ sessionId: e, targetId: t }) {
      t &&
        this.#c.find({ targetId: t }).map((e) => {
          e.dispose(t);
        });
      let n = this.#a.findContextBySession(e);
      if (n) {
        n.dispose(!0);
        return;
      }
      let r = this.#x.get(e);
      r && this.#l.deleteRealms({ cdpSessionId: r.cdpClient.sessionId });
    }
    #w(e) {
      let t = this.#a.findContext(e.targetInfo.targetId);
      t && t.onTargetInfoChanged(e);
    }
    #T(e) {
      let t = this.#l.findRealms({ cdpSessionId: e.sessionId });
      for (let e of t) e.dispose();
    }
  },
  Br = class {
    #e = new Map();
    #t = new it();
    getTopLevelContexts() {
      return this.getAllContexts().filter((e) => e.isTopLevelContext());
    }
    getAllContexts() {
      return Array.from(this.#e.values());
    }
    deleteContextById(e) {
      this.#e.delete(e);
    }
    deleteContext(e) {
      this.#e.delete(e.id);
    }
    addContext(e) {
      (this.#e.set(e.id, e), this.#t.emit(`added`, { browsingContext: e }));
    }
    waitForContext(e) {
      return this.#e.has(e)
        ? Promise.resolve(this.getContext(e))
        : new Promise((t) => {
            let n = (r) => {
              r.browsingContext.id === e && (this.#t.off(`added`, n), t(r.browsingContext));
            };
            this.#t.on(`added`, n);
          });
    }
    hasContext(e) {
      return this.#e.has(e);
    }
    findContext(e) {
      return this.#e.get(e);
    }
    findTopLevelContextId(e) {
      if (e === null) return null;
      let t = this.findContext(e);
      if (!t) return null;
      let n = t.parentId ?? null;
      return n === null ? e : this.findTopLevelContextId(n);
    }
    findContextBySession(e) {
      for (let t of this.#e.values()) if (t.cdpTarget.cdpSessionId === e) return t;
    }
    getContext(e) {
      let t = this.findContext(e);
      if (t === void 0) throw new ht(`Context ${e} not found`);
      return t;
    }
    verifyTopLevelContextsList(e) {
      let t = new Set();
      if (!e) return t;
      for (let n of e) {
        let e = this.getContext(n);
        if (e.isTopLevelContext()) t.add(e);
        else throw new R(`Non top-level context '${n}' given.`);
      }
      return t;
    }
    verifyContextsList(e) {
      if (e.length) for (let t of e) this.getContext(t);
    }
  },
  Vr = class {
    #e = new Set();
    find(e) {
      return e
        ? [...this.#e].filter(
            (t) =>
              !!(
                (t.contexts === void 0 && t.userContexts === void 0) ||
                (e.targetId !== void 0 && t.targetIds.has(e.targetId))
              )
          )
        : [...this.#e];
    }
    add(e) {
      this.#e.add(e);
    }
    remove(e) {
      let t = [...this.#e].find((t) => t.id === e);
      if (t === void 0) throw new xt(`No preload script with id '${e}'`);
      this.#e.delete(t);
    }
    getPreloadScript(e) {
      let t = [...this.#e].find((t) => t.id === e);
      if (t === void 0) throw new xt(`No preload script with id '${e}'`);
      return t;
    }
    onCdpTargetCreated(e, t) {
      let n = [...this.#e].filter((e) =>
        !e.userContexts && !e.contexts ? !0 : e.userContexts?.includes(t)
      );
      for (let t of n) t.targetIds.add(e);
    }
  },
  Hr = class {
    #e = new Map();
    #t = new Map();
    hiddenSandboxes = new Set();
    get knownHandlesToRealmMap() {
      return this.#e;
    }
    addRealm(e) {
      this.#t.set(e.realmId, e);
    }
    findRealms(e) {
      let t = e.sandbox === null ? void 0 : e.sandbox;
      return Array.from(this.#t.values()).filter(
        (n) =>
          !(
            (e.realmId !== void 0 && e.realmId !== n.realmId) ||
            (e.browsingContextId !== void 0 &&
              !n.associatedBrowsingContexts.map((e) => e.id).includes(e.browsingContextId)) ||
            (e.sandbox !== void 0 && (!(n instanceof rr) || t !== n.sandbox)) ||
            (e.executionContextId !== void 0 && e.executionContextId !== n.executionContextId) ||
            (e.origin !== void 0 && e.origin !== n.origin) ||
            (e.type !== void 0 && e.type !== n.realmType) ||
            (e.cdpSessionId !== void 0 && e.cdpSessionId !== n.cdpClient.sessionId) ||
            (e.isHidden !== void 0 && e.isHidden !== n.isHidden())
          )
      );
    }
    findRealm(e) {
      return this.findRealms(e)[0];
    }
    getRealm(e) {
      let t = this.findRealm(e);
      if (t === void 0) throw new ht(`Realm ${JSON.stringify(e)} not found`);
      return t;
    }
    deleteRealms(e) {
      this.findRealms(e).map((e) => {
        (e.dispose(),
          this.#t.delete(e.realmId),
          Array.from(this.knownHandlesToRealmMap.entries())
            .filter(([, t]) => t === e.realmId)
            .map(([e]) => this.knownHandlesToRealmMap.delete(e)));
      });
    }
  },
  Ur = class {
    #e;
    #t = [];
    #n;
    constructor(e, t) {
      ((this.#e = e), (this.#n = t));
    }
    get() {
      return this.#t;
    }
    add(e) {
      for (this.#t.push(e); this.#t.length > this.#e; ) {
        let e = this.#t.shift();
        e !== void 0 && this.#n?.(e);
      }
    }
  },
  Wr = class e {
    static #e = 0;
    #t;
    constructor() {
      this.#t = ++e.#e;
    }
    get id() {
      return this.#t;
    }
  };
function Gr(e) {
  return e.split(`.`).at(0)?.startsWith(M.Cdp) ?? !1;
}
function Kr(e) {
  if (!ut.has(e) && !Gr(e)) throw new R(`Unknown event: ${e}`);
}
function qr(e) {
  let t = new Set();
  function n(e) {
    for (let n of e) t.add(n);
  }
  for (let r of e)
    switch (r) {
      case M.Bluetooth:
        n(Object.values(ct.EventNames));
        break;
      case M.BrowsingContext:
        n(Object.values(F.EventNames));
        break;
      case M.Input:
        n(Object.values(st.EventNames));
        break;
      case M.Log:
        n(Object.values(P.EventNames));
        break;
      case M.Network:
        n(Object.values(I.EventNames));
        break;
      case M.Script:
        n(Object.values(N.EventNames));
        break;
      case M.Speculation:
        n(Object.values(lt.EventNames));
        break;
      default:
        t.add(r);
    }
  return t.values();
}
var Jr = class {
  #e = [];
  #t = new Set();
  #n;
  constructor(e) {
    this.#n = e;
  }
  getGoogChannelsSubscribedToEvent(e, t) {
    let n = new Set();
    for (let r of this.#e) this.#r(r, e, t) && n.add(r.googChannel);
    return Array.from(n);
  }
  getGoogChannelsSubscribedToEventGlobally(e) {
    let t = new Set();
    for (let n of this.#e) this.#r(n, e) && t.add(n.googChannel);
    return Array.from(t);
  }
  #r(e, t, n) {
    let r = !1;
    for (let n of e.eventNames)
      if (n === t || n === t.split(`.`).at(0) || n.split(`.`).at(0) === t) {
        r = !0;
        break;
      }
    if (!r) return !1;
    if (e.userContextIds.size !== 0) {
      if (!n) return !1;
      let t = this.#n.findContext(n);
      return t ? e.userContextIds.has(t.userContext) : !1;
    }
    if (e.topLevelTraversableIds.size !== 0) {
      if (!n) return !1;
      let t = this.#n.findTopLevelContextId(n);
      return t !== null && e.topLevelTraversableIds.has(t);
    }
    return !0;
  }
  isSubscribedTo(e, t) {
    for (let n of this.#e) if (this.#r(n, e, t)) return !0;
    return !1;
  }
  subscribe(e, t, n, r) {
    let i = {
      id: U(),
      eventNames: new Set(qr(e)),
      topLevelTraversableIds: new Set(
        t.map((e) => {
          let t = this.#n.findTopLevelContextId(e);
          if (!t) throw new ht(`Top-level navigable not found for context id ${e}`);
          return t;
        })
      ),
      userContextIds: new Set(n),
      googChannel: r,
    };
    return (this.#e.push(i), this.#t.add(i.id), i);
  }
  unsubscribe(e, t) {
    let n = new Set(qr(e)),
      r = [],
      i = new Set();
    for (let e of this.#e) {
      if (e.googChannel !== t) {
        r.push(e);
        continue;
      }
      if (e.userContextIds.size !== 0) {
        r.push(e);
        continue;
      }
      if (Yr(e.eventNames, n).size === 0) {
        r.push(e);
        continue;
      }
      if (e.topLevelTraversableIds.size !== 0) {
        r.push(e);
        continue;
      }
      let a = new Set(e.eventNames);
      for (let e of n) a.has(e) && (i.add(e), a.delete(e));
      a.size !== 0 && r.push({ ...e, eventNames: a });
    }
    if (!Zr(i, n)) throw new R(`No subscription found`);
    this.#e = r;
  }
  unsubscribeById(e) {
    let t = new Set(e);
    if (Xr(t, this.#t).size !== 0) throw new R(`No subscription found`);
    ((this.#e = this.#e.filter((e) => !t.has(e.id))), (this.#t = Xr(this.#t, t)));
  }
};
function Yr(e, t) {
  let n = new Set();
  for (let r of e) t.has(r) && n.add(r);
  return n;
}
function Xr(e, t) {
  let n = new Set();
  for (let r of e) t.has(r) || n.add(r);
  return n;
}
function Zr(e, t) {
  if (e.size !== t.size) return !1;
  for (let n of e) if (!t.has(n)) return !1;
  return !0;
}
var Qr,
  $r = class {
    #e = new Wr();
    #t;
    #n;
    constructor(e, t) {
      ((this.#n = e), (this.#t = t));
    }
    get id() {
      return this.#e.id;
    }
    get contextId() {
      return this.#t;
    }
    get event() {
      return this.#n;
    }
  },
  ei = new Map([[P.EventNames.LogEntryAdded, 100]]),
  ti = class extends it {
    #e = new kr(() => new Set());
    #t = new Map();
    #n = new Map();
    #r;
    #i;
    #a;
    #o;
    constructor(e, t) {
      (super(), (this.#i = e), (this.#o = t), (this.#r = new Jr(e)), (this.#a = new kr(() => [])));
    }
    get subscriptionManager() {
      return this.#r;
    }
    static #s(e, t) {
      return JSON.stringify({ eventName: e, browsingContext: t });
    }
    addSubscribeHook(e, t) {
      this.#a.get(e).push(t);
    }
    registerEvent(e, t) {
      this.registerPromiseEvent(Promise.resolve({ kind: `success`, value: e }), t, e.method);
    }
    registerGlobalEvent(e) {
      this.registerGlobalPromiseEvent(Promise.resolve({ kind: `success`, value: e }), e.method);
    }
    registerPromiseEvent(e, t, n) {
      let r = new $r(e, t),
        i = this.#r.getGoogChannelsSubscribedToEvent(n, t);
      this.#c(r, n);
      for (let t of i)
        (this.emit(`event`, { message: W.createFromPromise(e, t), event: n }), this.#l(r, t, n));
    }
    registerGlobalPromiseEvent(e, t) {
      let n = new $r(e, null),
        r = this.#r.getGoogChannelsSubscribedToEventGlobally(t);
      this.#c(n, t);
      for (let i of r)
        (this.emit(`event`, { message: W.createFromPromise(e, i), event: t }), this.#l(n, i, t));
    }
    async subscribe(e, t, n, r) {
      for (let t of e) Kr(t);
      if (n.length && t.length) throw new R(`Both userContexts and contexts cannot be specified.`);
      (this.#i.verifyContextsList(t), await this.#o.verifyUserContextIdList(n));
      let i = new Set(qr(e)),
        a = new Map(),
        o = new Set(
          t.length
            ? t.map((e) => {
                let t = this.#i.findTopLevelContextId(e);
                if (!t) throw new R(`Invalid context id`);
                return t;
              })
            : this.#i.getTopLevelContexts().map((e) => e.id)
        );
      for (let e of i) {
        let t = new Set(
          this.#i
            .getTopLevelContexts()
            .map((e) => e.id)
            .filter((t) => this.#r.isSubscribedTo(e, t))
        );
        a.set(e, Xr(o, t));
      }
      let s = this.#r.subscribe(e, t, n, r);
      for (let e of s.eventNames)
        for (let t of o)
          for (let n of this.#u(e, t, r))
            (this.emit(`event`, { message: W.createFromPromise(n.event, r), event: e }),
              this.#l(n, r, e));
      for (let [e, t] of a) for (let n of t) this.#a.get(e).forEach((e) => e(n));
      return (await this.toggleModulesIfNeeded(), s.id);
    }
    async unsubscribe(e, t) {
      for (let t of e) Kr(t);
      (this.#r.unsubscribe(e, t), await this.toggleModulesIfNeeded());
    }
    async unsubscribeByIds(e) {
      (this.#r.unsubscribeById(e), await this.toggleModulesIfNeeded());
    }
    async toggleModulesIfNeeded() {
      await Promise.all(this.#i.getAllContexts().map(async (e) => await e.toggleModulesIfNeeded()));
    }
    clearBufferedEvents(e) {
      for (let t of ei.keys()) {
        let n = Qr.#s(t, e);
        this.#t.delete(n);
      }
    }
    #c(e, t) {
      if (!ei.has(t)) return;
      let n = Qr.#s(t, e.contextId);
      (this.#t.has(n) || this.#t.set(n, new Ur(ei.get(t))),
        this.#t.get(n).add(e),
        this.#e.get(t).add(e.contextId));
    }
    #l(e, t, n) {
      if (!ei.has(n)) return;
      let r = Qr.#s(n, e.contextId),
        i = Math.max(this.#n.get(r)?.get(t) ?? 0, e.id),
        a = this.#n.get(r);
      a ? a.set(t, i) : this.#n.set(r, new Map([[t, i]]));
    }
    #u(e, t, n) {
      let r = Qr.#s(e, t),
        i = this.#n.get(r)?.get(n) ?? -1 / 0,
        a =
          this.#t
            .get(r)
            ?.get()
            .filter((e) => e.id > i) ?? [];
      return (
        t === null &&
          Array.from(this.#e.get(e).keys())
            .filter((e) => e !== null && this.#i.hasContext(e))
            .map((t) => this.#u(e, t, n))
            .forEach((e) => a.push(...e)),
        a.sort((e, t) => e.id - t.id)
      );
    }
  };
Qr = ti;
var ni = class {
    #e;
    #t;
    constructor(e, t) {
      ((this.#e = e), (this.#t = t));
    }
    onCdpTargetCreated(e) {
      e.cdpClient.on(`Preload.prefetchStatusUpdated`, (t) => {
        let n;
        switch (t.status) {
          case `Running`:
            n = `pending`;
            break;
          case `Ready`:
            n = `ready`;
            break;
          case `Success`:
            n = `success`;
            break;
          case `Failure`:
            n = `failure`;
            break;
          default:
            this.#t?.(j.debugWarn, `Unknown prefetch status: ${t.status}`);
            return;
        }
        this.#e.registerEvent(
          {
            type: `event`,
            method: `speculation.prefetchStatusUpdated`,
            params: { context: t.initiatingFrameId, url: t.prefetchUrl, status: n },
          },
          e.id
        );
      });
    }
  },
  ri = class e extends it {
    #e;
    #t;
    #n;
    #r;
    #i = new Br();
    #a = new Hr();
    #o = new Vr();
    #s;
    #c;
    #l;
    #u = (e) => {
      this.#n.processCommand(e).catch((e) => {
        this.#l?.(j.debugError, e);
      });
    };
    #d = async (e) => {
      let t = e.message;
      (e.googChannel !== null && (t[`goog:channel`] = e.googChannel), await this.#t.sendMessage(t));
    };
    constructor(e, t, n, r, i, a, o, s) {
      (super(),
        (this.#l = s),
        (this.#e = new ot(this.#d, this.#l)),
        (this.#t = e),
        this.#t.setOnMessage(this.#u));
      let c = new Yn(),
        l = new Xn(n);
      this.#r = new ti(this.#i, l);
      let u = new Ir(this.#r, this.#i, n, s);
      ((this.#s = new qn(this.#r, this.#i)),
        (this.#c = new ni(this.#r, this.#l)),
        (this.#n = new Vn(
          t,
          n,
          this.#r,
          this.#i,
          this.#a,
          this.#o,
          u,
          c,
          this.#s,
          l,
          o,
          async (e) => {
            (await n.sendCommand(`Security.setIgnoreCertificateErrors`, {
              ignore: e.acceptInsecureCerts ?? !1,
            }),
              c.updateGlobalConfig({
                acceptInsecureCerts: e.acceptInsecureCerts ?? !1,
                userPromptHandler: e.unhandledPromptBehavior,
                prerenderingDisabled: e?.[`goog:prerenderingDisabled`] ?? !1,
                disableNetworkDurableMessages: e?.[`goog:disableNetworkDurableMessages`],
              }),
              new zr(t, n, r, this.#r, this.#i, this.#a, u, c, this.#s, this.#c, this.#o, i, a, s),
              await n.sendCommand(`Target.setDiscoverTargets`, { discover: !0 }),
              await n.sendCommand(`Target.setAutoAttach`, {
                autoAttach: !0,
                waitForDebuggerOnStart: !0,
                flatten: !0,
                filter: [{ type: `page`, exclude: !0 }, {}],
              }),
              await this.#p());
          },
          this.#l
        )),
        this.#r.on(`event`, ({ message: e, event: t }) => {
          this.emitOutgoingMessage(e, t);
        }),
        this.#n.on(`response`, ({ message: e, event: t }) => {
          this.emitOutgoingMessage(e, t);
        }));
    }
    static async createAndStart(t, n, r, i, a, o) {
      let [s, c] = await Promise.all([
        this.#f(r),
        r.sendCommand(`Browser.getVersion`),
        r.sendCommand(`Browser.setDownloadBehavior`, { behavior: `default`, eventsEnabled: !0 }),
      ]);
      return new e(t, n, r, i, s, c.userAgent, a, o);
    }
    static async #f(e) {
      let [{ defaultBrowserContextId: t, browserContextIds: n }, { targetInfos: r }] =
        await Promise.all([
          e.sendCommand(`Target.getBrowserContexts`),
          e.sendCommand(`Target.getTargets`),
        ]);
      if (t) return t;
      for (let e of r)
        if (e.browserContextId && !n.includes(e.browserContextId)) return e.browserContextId;
      return `default`;
    }
    emitOutgoingMessage(e, t) {
      this.#e.add(e, t);
    }
    close() {
      this.#t.close();
    }
    async #p() {
      await Promise.all(this.#i.getTopLevelContexts().map((e) => e.lifecycleLoaded()));
    }
  },
  ii = class e extends ce {
    static sessions = new Map();
    #e = !1;
    #t;
    #n = f.create();
    frame;
    constructor(t, n) {
      if ((super(), (this.frame = t), !this.frame.page().browser().cdpSupported)) return;
      let r = this.frame.page().browser().connection;
      ((this.#t = r),
        n
          ? (this.#n.resolve(n), e.sessions.set(n, this))
          : (async () => {
              try {
                let { result: n } = await r.send(`goog:cdp.getSession`, { context: t._id });
                (this.#n.resolve(n.session), e.sessions.set(n.session, this));
              } catch (e) {
                this.#n.reject(e);
              }
            })(),
        e.sessions.set(this.#n.value(), this));
    }
    connection() {}
    get detached() {
      return this.#e;
    }
    async send(e, t, n) {
      if (this.#t === void 0)
        throw new D(
          `CDP support is required for this feature. The current browser does not support CDP.`
        );
      if (this.#e)
        throw new xe(
          `Protocol error (${e}): Session closed. Most likely the page has been closed.`
        );
      let r = await this.#n.valueOrThrow(),
        { result: i } = await this.#t.send(
          `goog:cdp.sendCommand`,
          { method: e, params: t, session: r },
          n?.timeout
        );
      return i.result;
    }
    async detach() {
      if (!(this.#t === void 0 || this.#t.closed || this.#e))
        try {
          await this.frame.client.send(`Target.detachFromTarget`, { sessionId: this.id() });
        } finally {
          this.onClose();
        }
    }
    onClose = () => {
      (e.sessions.delete(this.id()), (this.#e = !0));
    };
    id() {
      let e = this.#n.value();
      return typeof e == `string` ? e : ``;
    }
  },
  ai = De(`puppeteer:webDriverBiDi:SEND ►`),
  oi = De(`puppeteer:webDriverBiDi:RECV ◀`),
  si = class extends h {
    #e;
    #t;
    #n;
    #r = 0;
    #i = !1;
    #a;
    #o = [];
    constructor(e, t, n, r = 0, i) {
      (super(),
        (this.#e = e),
        (this.#n = r),
        (this.#r = i ?? 18e4),
        (this.#a = new Re(n)),
        (this.#t = t),
        (this.#t.onmessage = this.onMessage.bind(this)),
        (this.#t.onclose = this.unbind.bind(this)));
    }
    get closed() {
      return this.#i;
    }
    get url() {
      return this.#e;
    }
    pipeTo(e) {
      this.#o.push(e);
    }
    #s(e) {
      for (let t in e)
        t.startsWith(`goog:`)
          ? delete e[t]
          : typeof e[t] == `object` && e[t] !== null && this.#s(e[t]);
    }
    emit(e, t) {
      ({}).PUPPETEER_WEBDRIVER_BIDI_ONLY === `true` && this.#s(t);
      for (let n of this.#o) n.emit(e, t);
      return super.emit(e, t);
    }
    send(e, t, n) {
      return this.#i
        ? Promise.reject(new Pe(`Connection closed.`))
        : this.#a.create(e, n ?? this.#r, (n) => {
            let r = JSON.stringify({ id: n, method: e, params: t });
            (ai(r), this.#t.send(r));
          });
    }
    async onMessage(e) {
      (this.#n && (await new Promise((e) => setTimeout(e, this.#n))), oi(e));
      let t = JSON.parse(e);
      if (`type` in t)
        switch (t.type) {
          case `success`:
            this.#a.resolve(t.id, t);
            return;
          case `error`:
            if (t.id === null) break;
            this.#a.reject(t.id, ci(t), `${t.error}: ${t.message}`);
            return;
          case `event`:
            if (li(t)) {
              ii.sessions.get(t.params.session)?.emit(t.params.event, t.params.params);
              return;
            }
            this.emit(t.method, t.params);
            return;
        }
      (`id` in t &&
        this.#a.reject(
          t.id,
          `Protocol Error. Message is not in BiDi protocol format: '${e}'`,
          t.message
        ),
        C(t));
    }
    unbind() {
      this.#i ||
        ((this.#i = !0),
        (this.#t.onmessage = () => {}),
        (this.#t.onclose = () => {}),
        this.#a.clear());
    }
    dispose() {
      (this.unbind(), this.#t.close());
    }
    getPendingProtocolErrors() {
      return this.#a.getPendingProtocolErrors();
    }
  };
function ci(e) {
  let t = `${e.error} ${e.message}`;
  return (e.stacktrace && (t += ` ${e.stacktrace}`), t);
}
function li(e) {
  return e.method.startsWith(`goog:cdp.`);
}
var ui = (e, ...t) => {
  De(`bidi:${e}`)(t);
};
async function di(e) {
  let t = new mi(),
    n = new fi(e),
    r = {
      send(e) {
        t.emitMessage(JSON.parse(e));
      },
      close() {
        (a.close(), n.close(), e.dispose());
      },
      onmessage(e) {},
    };
  t.on(`bidiResponse`, (e) => {
    r.onmessage(JSON.stringify(e));
  });
  let i = new si(e.url(), r, e._idGenerator, e.delay, e.timeout),
    a = await ri.createAndStart(t, n, n.browserClient(), ``, void 0, ui);
  return i;
}
var fi = class {
    #e;
    #t = new Map();
    #n;
    constructor(e) {
      ((this.#e = e), (this.#n = new pi(e)));
    }
    browserClient() {
      return this.#n;
    }
    getCdpClient(e) {
      let t = this.#e.session(e);
      if (!t) throw Error(`Unknown CDP session with id ${e}`);
      if (!this.#t.has(t)) {
        let n = new pi(t, e, this.#n);
        return (this.#t.set(t, n), n);
      }
      return this.#t.get(t);
    }
    close() {
      this.#n.close();
      for (let e of this.#t.values()) e.close();
    }
  },
  pi = class extends it {
    #e = !1;
    #t;
    sessionId = void 0;
    #n;
    constructor(e, t, n) {
      (super(), (this.#t = e), (this.sessionId = t), (this.#n = n), this.#t.on(`*`, this.#r));
    }
    browserClient() {
      return this.#n;
    }
    #r = (e, t) => {
      this.emit(e, t);
    };
    async sendCommand(e, ...t) {
      if (!this.#e)
        try {
          return await this.#t.send(e, ...t);
        } catch (e) {
          if (this.#e) return;
          throw e;
        }
    }
    close() {
      (this.#t.off(`*`, this.#r), (this.#e = !0));
    }
    isCloseError(e) {
      return e instanceof xe;
    }
  },
  mi = class extends it {
    #e = async (e) => {};
    emitMessage(e) {
      this.#e(e);
    }
    setOnMessage(e) {
      this.#e = e;
    }
    async sendMessage(e) {
      this.emit(`bidiResponse`, e);
    }
    close() {
      this.#e = async (e) => {};
    }
  },
  hi = class {
    #e;
    #t;
    constructor(e, t) {
      ((this.#t = e), (this.#e = t));
    }
    async emulateAdapter(e, t = !0) {
      await this.#e.send(`bluetooth.simulateAdapter`, {
        context: this.#t,
        state: e,
        leSupported: t,
      });
    }
    async disableEmulation() {
      await this.#e.send(`bluetooth.disableSimulation`, { context: this.#t });
    }
    async simulatePreconnectedPeripheral(e) {
      await this.#e.send(`bluetooth.simulatePreconnectedPeripheral`, {
        context: this.#t,
        address: e.address,
        name: e.name,
        manufacturerData: e.manufacturerData,
        knownServiceUuids: e.knownServiceUuids,
      });
    }
  },
  gi = class {
    #e;
    #t;
    #n = !1;
    constructor(e, t) {
      ((this.#e = t), (this.#t = e));
    }
    async #r() {
      this.#n ||
        ((this.#n = !0),
        await this.#e.subscribe([`bluetooth.requestDevicePromptUpdated`], [this.#t]));
    }
    async waitForDevicePrompt(e, t) {
      let n = f.create({
          message: `Waiting for \`DeviceRequestPrompt\` failed: ${e}ms exceeded`,
          timeout: e,
        }),
        r = (e) => {
          e.context === this.#t &&
            (n.resolve(new _i(this.#t, e.prompt, this.#e, e.devices)),
            this.#e.off(`bluetooth.requestDevicePromptUpdated`, r));
        };
      return (
        this.#e.on(`bluetooth.requestDevicePromptUpdated`, r),
        t &&
          t.addEventListener(
            `abort`,
            () => {
              n.reject(t.reason);
            },
            { once: !0 }
          ),
        await this.#r(),
        await n.valueOrThrow()
      );
    }
  },
  _i = class extends p {
    #e;
    #t;
    #n;
    constructor(e, t, n, r) {
      (super(),
        (this.#e = n),
        (this.#t = t),
        (this.#n = e),
        this.devices.push(...r.map((e) => ({ id: e.id, name: e.name ?? `UNKNOWN` }))));
    }
    async cancel() {
      await this.#e.send(`bluetooth.handleRequestDevicePrompt`, {
        context: this.#n,
        prompt: this.#t,
        accept: !1,
      });
    }
    async select(e) {
      await this.#e.send(`bluetooth.handleRequestDevicePrompt`, {
        context: this.#n,
        prompt: this.#t,
        accept: !0,
        device: e.id,
      });
    }
    waitForDevice() {
      throw new D();
    }
  },
  vi = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  yi = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  bi = (() => {
    let e = h,
      t = [],
      n;
    return class r extends e {
      static {
        let r =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (yi(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `dispose`,
            static: !1,
            private: !1,
            access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
            metadata: r,
          },
          null,
          t
        ),
          r &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: r,
            }));
      }
      static from(e) {
        let t = new r(e);
        return (t.#a(), t);
      }
      #e = vi(this, t);
      #t;
      #n;
      #r = new w();
      #i;
      constructor(e) {
        (super(), (this.#n = e));
      }
      #a() {
        let e = this.#r.use(new h(this.#n));
        (e.once(`closed`, () => {
          (this.emit(`failed`, { url: this.#n.url, timestamp: new Date() }), this.dispose());
        }),
          e.on(`request`, (e) => {
            e.navigation === void 0 ||
              !this.#o(e.navigation) ||
              ((this.#e = e),
              this.emit(`request`, e),
              this.#r.use(new h(this.#e)).on(`redirect`, (e) => {
                this.#e = e;
              }));
          }));
        let t = this.#r.use(new h(this.#s));
        t.on(`browsingContext.navigationStarted`, (e) => {
          e.context !== this.#n.id || this.#t !== void 0 || (this.#t = r.from(this.#n));
        });
        for (let e of [
          `browsingContext.domContentLoaded`,
          `browsingContext.load`,
          `browsingContext.navigationCommitted`,
        ])
          t.on(e, (e) => {
            e.context !== this.#n.id ||
              e.navigation === null ||
              !this.#o(e.navigation) ||
              this.dispose();
          });
        for (let [e, n] of [
          [`browsingContext.fragmentNavigated`, `fragment`],
          [`browsingContext.navigationFailed`, `failed`],
          [`browsingContext.navigationAborted`, `aborted`],
        ])
          t.on(e, (e) => {
            e.context !== this.#n.id ||
              !this.#o(e.navigation) ||
              (this.emit(n, { url: e.url, timestamp: new Date(e.timestamp) }), this.dispose());
          });
      }
      #o(e) {
        return this.#t !== void 0 && !this.#t.disposed
          ? !1
          : this.#i === void 0
            ? ((this.#i = e), !0)
            : this.#i === e;
      }
      get #s() {
        return this.#n.userContext.browser.session;
      }
      get disposed() {
        return this.#r.disposed;
      }
      get request() {
        return this.#e;
      }
      get navigation() {
        return this.#t;
      }
      dispose() {
        this[A]();
      }
      [((n = [E]), A)]() {
        (this.#r.dispose(), super[A]());
      }
    };
  })(),
  xi = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Si = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Ci,
  wi = (() => {
    let e = h,
      t = [],
      n,
      r,
      i,
      a,
      o;
    return class extends e {
      static {
        let s =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (Si(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `dispose`,
            static: !1,
            private: !1,
            access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
            metadata: s,
          },
          null,
          t
        ),
          Si(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `disown`,
              static: !1,
              private: !1,
              access: { has: (e) => `disown` in e, get: (e) => e.disown },
              metadata: s,
            },
            null,
            t
          ),
          Si(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `callFunction`,
              static: !1,
              private: !1,
              access: { has: (e) => `callFunction` in e, get: (e) => e.callFunction },
              metadata: s,
            },
            null,
            t
          ),
          Si(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `evaluate`,
              static: !1,
              private: !1,
              access: { has: (e) => `evaluate` in e, get: (e) => e.evaluate },
              metadata: s,
            },
            null,
            t
          ),
          Si(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `resolveExecutionContextId`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `resolveExecutionContextId` in e,
                get: (e) => e.resolveExecutionContextId,
              },
              metadata: s,
            },
            null,
            t
          ),
          s &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: s,
            }));
      }
      #e = xi(this, t);
      disposables = new w();
      id;
      origin;
      executionContextId;
      constructor(e, t) {
        (super(), (this.id = e), (this.origin = t));
      }
      get disposed() {
        return this.#e !== void 0;
      }
      get target() {
        return { realm: this.id };
      }
      dispose(e) {
        ((this.#e = e), this[A]());
      }
      async disown(e) {
        await this.session.send(`script.disown`, { target: this.target, handles: e });
      }
      async callFunction(e, t, n = {}) {
        let { result: r } = await this.session.send(`script.callFunction`, {
          functionDeclaration: e,
          awaitPromise: t,
          target: this.target,
          ...n,
        });
        return r;
      }
      async evaluate(e, t, n = {}) {
        let { result: r } = await this.session.send(`script.evaluate`, {
          expression: e,
          awaitPromise: t,
          target: this.target,
          ...n,
        });
        return r;
      }
      async resolveExecutionContextId() {
        if (!this.executionContextId) {
          let { result: e } = await this.session.connection.send(`goog:cdp.resolveRealm`, {
            realm: this.id,
          });
          this.executionContextId = e.executionContextId;
        }
        return this.executionContextId;
      }
      [((n = [E]),
      (r = [b((e) => e.#e)]),
      (i = [b((e) => e.#e)]),
      (a = [b((e) => e.#e)]),
      (o = [b((e) => e.#e)]),
      A)]() {
        ((this.#e ??= `Realm already destroyed, probably because all associated browsing contexts closed.`),
          this.emit(`destroyed`, this.#e),
          this.disposables.dispose(),
          super[A]());
      }
    };
  })(),
  Ti = class e extends wi {
    static from(t, n) {
      let r = new e(t, n);
      return (r.#t(), r);
    }
    browsingContext;
    sandbox;
    #e = new Map();
    constructor(e, t) {
      (super(``, ``), (this.browsingContext = e), (this.sandbox = t));
    }
    #t() {
      this.disposables.use(new h(this.browsingContext)).on(`closed`, (e) => {
        this.dispose(e);
      });
      let e = this.disposables.use(new h(this.session));
      (e.on(`script.realmCreated`, (e) => {
        e.type !== `window` ||
          e.context !== this.browsingContext.id ||
          e.sandbox !== this.sandbox ||
          ((this.id = e.realm),
          (this.origin = e.origin),
          (this.executionContextId = void 0),
          this.emit(`updated`, this));
      }),
        e.on(`script.realmCreated`, (e) => {
          if (e.type !== `dedicated-worker` || !e.owners.includes(this.id)) return;
          let t = Ei.from(this, e.realm, e.origin);
          this.#e.set(t.id, t);
          let n = this.disposables.use(new h(t));
          (n.once(`destroyed`, () => {
            (n.removeAllListeners(), this.#e.delete(t.id));
          }),
            this.emit(`worker`, t));
        }),
        e.on(`log.entryAdded`, (e) => {
          e.source.realm === this.id && this.emit(`log`, e);
        }));
    }
    get session() {
      return this.browsingContext.userContext.browser.session;
    }
    get target() {
      return { context: this.browsingContext.id, sandbox: this.sandbox };
    }
  },
  Ei = class extends wi {
    static from(e, t, n) {
      let r = new Ci(e, t, n);
      return (r.#t(), r);
    }
    #e = new Map();
    owners;
    constructor(e, t, n) {
      (super(t, n), (this.owners = new Set([e])));
    }
    #t() {
      let e = this.disposables.use(new h(this.session));
      (e.on(`script.realmDestroyed`, (e) => {
        e.realm === this.id && this.dispose(`Realm already destroyed.`);
      }),
        e.on(`script.realmCreated`, (e) => {
          if (e.type !== `dedicated-worker` || !e.owners.includes(this.id)) return;
          let t = Ci.from(this, e.realm, e.origin);
          (this.#e.set(t.id, t),
            this.disposables.use(new h(t)).once(`destroyed`, () => {
              this.#e.delete(t.id);
            }),
            this.emit(`worker`, t));
        }),
        e.on(`log.entryAdded`, (e) => {
          e.source.realm === this.id && this.emit(`log`, e);
        }));
    }
    get session() {
      return this.owners.values().next().value.session;
    }
  };
Ci = Ei;
var Di = class e extends wi {
    static from(t, n, r) {
      let i = new e(t, n, r);
      return (i.#t(), i);
    }
    #e = new Map();
    browser;
    constructor(e, t, n) {
      (super(t, n), (this.browser = e));
    }
    #t() {
      let e = this.disposables.use(new h(this.session));
      (e.on(`script.realmDestroyed`, (e) => {
        e.realm === this.id && this.dispose(`Realm already destroyed.`);
      }),
        e.on(`script.realmCreated`, (e) => {
          if (e.type !== `dedicated-worker` || !e.owners.includes(this.id)) return;
          let t = Ei.from(this, e.realm, e.origin);
          (this.#e.set(t.id, t),
            this.disposables.use(new h(t)).once(`destroyed`, () => {
              this.#e.delete(t.id);
            }),
            this.emit(`worker`, t));
        }),
        e.on(`log.entryAdded`, (e) => {
          e.source.realm === this.id && this.emit(`log`, e);
        }));
    }
    get session() {
      return this.browser.session;
    }
  },
  Oi = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  ki = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Ai = (() => {
    let e = h,
      t = [],
      n;
    return class r extends e {
      static {
        let r =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (ki(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `dispose`,
            static: !1,
            private: !1,
            access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
            metadata: r,
          },
          null,
          t
        ),
          r &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: r,
            }));
      }
      static from(e, t) {
        let n = new r(e, t);
        return (n.#c(), n);
      }
      #e = (Oi(this, t), null);
      #t = null;
      #n;
      #r;
      #i;
      #a;
      #o = new w();
      #s;
      constructor(e, t) {
        (super(), (this.#a = e), (this.#s = t));
      }
      #c() {
        this.#o.use(new h(this.#a)).once(`closed`, (e) => {
          ((this.#n = e), this.emit(`error`, e), this.dispose());
        });
        let e = this.#o.use(new h(this.#l));
        (e.on(`network.beforeRequestSent`, (e) => {
          if (e.context !== this.#a.id || e.request.request !== this.id) return;
          let t = this.#s.request.headers.find((e) => e.name.toLowerCase() === `authorization`),
            n = e.request.headers.find((e) => e.name.toLowerCase() === `authorization`) && !t;
          (e.redirectCount !== this.#s.redirectCount + 1 && !n) ||
            ((this.#r = r.from(this.#a, e)), this.emit(`redirect`, this.#r), this.dispose());
        }),
          e.on(`network.authRequired`, (e) => {
            e.context !== this.#a.id ||
              e.request.request !== this.id ||
              !e.isBlocked ||
              this.emit(`authenticate`, void 0);
          }),
          e.on(`network.fetchError`, (e) => {
            e.context !== this.#a.id ||
              e.request.request !== this.id ||
              this.#s.redirectCount !== e.redirectCount ||
              ((this.#n = e.errorText), this.emit(`error`, this.#n), this.dispose());
          }),
          e.on(`network.responseStarted`, (e) => {
            e.context !== this.#a.id ||
              e.request.request !== this.id ||
              this.#s.redirectCount !== e.redirectCount ||
              ((this.#i = e.response),
              (this.#s.request.timings = e.request.timings),
              this.emit(`response`, this.#i));
          }),
          e.on(`network.responseCompleted`, (e) => {
            e.context !== this.#a.id ||
              e.request.request !== this.id ||
              this.#s.redirectCount !== e.redirectCount ||
              ((this.#i = e.response),
              (this.#s.request.timings = e.request.timings),
              this.emit(`success`, this.#i),
              !(this.#i.status >= 300 && this.#i.status < 400) && this.dispose());
          }));
      }
      get #l() {
        return this.#a.userContext.browser.session;
      }
      get disposed() {
        return this.#o.disposed;
      }
      get error() {
        return this.#n;
      }
      get headers() {
        return this.#s.request.headers;
      }
      get id() {
        return this.#s.request.request;
      }
      get initiator() {
        return {
          ...this.#s.initiator,
          url: this.#s.request[`goog:resourceInitiator`]?.url,
          stack: this.#s.request[`goog:resourceInitiator`]?.stack,
        };
      }
      get method() {
        return this.#s.request.method;
      }
      get navigation() {
        return this.#s.navigation ?? void 0;
      }
      get redirect() {
        return this.#r;
      }
      get lastRedirect() {
        let e = this.#r;
        for (; e; ) {
          if (e && !e.#r) return e;
          e = e.#r;
        }
        return e;
      }
      get response() {
        return this.#i;
      }
      get url() {
        return this.#s.request.url;
      }
      get isBlocked() {
        return this.#s.isBlocked;
      }
      get resourceType() {
        return this.#s.request[`goog:resourceType`] ?? void 0;
      }
      get postData() {
        return this.#s.request[`goog:postData`] ?? void 0;
      }
      get hasPostData() {
        return (this.#s.request.bodySize ?? 0) > 0;
      }
      async continueRequest({ url: e, method: t, headers: n, cookies: r, body: i }) {
        await this.#l.send(`network.continueRequest`, {
          request: this.id,
          url: e,
          method: t,
          headers: n,
          body: i,
          cookies: r,
        });
      }
      async failRequest() {
        await this.#l.send(`network.failRequest`, { request: this.id });
      }
      async provideResponse({ statusCode: e, reasonPhrase: t, headers: n, body: r }) {
        await this.#l.send(`network.provideResponse`, {
          request: this.id,
          statusCode: e,
          reasonPhrase: t,
          headers: n,
          body: r,
        });
      }
      async fetchPostData() {
        if (this.hasPostData)
          return (
            (this.#t ||= (async () => {
              let e = await this.#l.send(`network.getData`, {
                dataType: `request`,
                request: this.id,
              });
              if (e.result.bytes.type === `string`) return e.result.bytes.value;
              throw new D(
                `Collected request body data of type ${e.result.bytes.type} is not supported`
              );
            })()),
            await this.#t
          );
      }
      async getResponseContent() {
        return (
          (this.#e ||= (async () => {
            try {
              let e = await this.#l.send(`network.getData`, {
                dataType: `response`,
                request: this.id,
              });
              return me(e.result.bytes.value, e.result.bytes.type === `base64`);
            } catch (e) {
              throw e instanceof Xe &&
                e.originalMessage.includes(`No resource with given identifier found`)
                ? new Xe(
                    `Could not load response body for this request. This might happen if the request is a preflight request.`
                  )
                : e;
            }
          })()),
          await this.#e
        );
      }
      async continueWithAuth(e) {
        e.action === `provideCredentials`
          ? await this.#l.send(`network.continueWithAuth`, {
              request: this.id,
              action: e.action,
              credentials: e.credentials,
            })
          : await this.#l.send(`network.continueWithAuth`, { request: this.id, action: e.action });
      }
      dispose() {
        this[A]();
      }
      [((n = [E]), A)]() {
        (this.#o.dispose(), super[A]());
      }
      timing() {
        return this.#s.request.timings;
      }
    };
  })(),
  ji = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Mi = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Ni = (() => {
    let e = h,
      t = [],
      n,
      r;
    return class i extends e {
      static {
        let i =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (Mi(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `dispose`,
            static: !1,
            private: !1,
            access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
            metadata: i,
          },
          null,
          t
        ),
          Mi(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `handle`,
              static: !1,
              private: !1,
              access: { has: (e) => `handle` in e, get: (e) => e.handle },
              metadata: i,
            },
            null,
            t
          ),
          i &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: i,
            }));
      }
      static from(e, t) {
        let n = new i(e, t);
        return (n.#r(), n);
      }
      #e = ji(this, t);
      #t;
      #n = new w();
      browsingContext;
      info;
      constructor(e, t) {
        (super(), (this.browsingContext = e), (this.info = t));
      }
      #r() {
        (this.#n.use(new h(this.browsingContext)).once(`closed`, (e) => {
          this.dispose(`User prompt already closed: ${e}`);
        }),
          this.#n.use(new h(this.#i)).on(`browsingContext.userPromptClosed`, (e) => {
            e.context === this.browsingContext.id &&
              ((this.#t = e),
              this.emit(`handled`, e),
              this.dispose(`User prompt already handled.`));
          }));
      }
      get #i() {
        return this.browsingContext.userContext.browser.session;
      }
      get closed() {
        return this.#e !== void 0;
      }
      get disposed() {
        return this.closed;
      }
      get handled() {
        return this.info.handler === `accept` || this.info.handler === `dismiss`
          ? !0
          : this.#t !== void 0;
      }
      get result() {
        return this.#t;
      }
      dispose(e) {
        ((this.#e = e), this[A]());
      }
      async handle(e = {}) {
        return (
          await this.#i.send(`browsingContext.handleUserPrompt`, {
            ...e,
            context: this.info.context,
          }),
          this.#t
        );
      }
      [((n = [E]), (r = [b((e) => e.#e)]), A)]() {
        ((this.#e ??= `User prompt already closed, probably because the associated browsing context was destroyed.`),
          this.emit(`closed`, this.#e),
          this.#n.dispose(),
          super[A]());
      }
    };
  })(),
  Pi = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  q = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Fi = (() => {
    let e = h,
      t = [],
      n,
      r,
      i,
      a,
      o,
      s,
      c,
      l,
      u,
      d,
      f,
      p,
      m,
      g,
      _,
      v,
      y,
      x,
      ee,
      te,
      ne,
      re,
      ie,
      ae,
      S,
      oe,
      se,
      ce;
    return class le extends e {
      static {
        let h =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((se = [b((e) => e.#t)]),
          (ce = [b((e) => e.#t)]),
          q(
            this,
            null,
            n,
            {
              kind: `method`,
              name: `dispose`,
              static: !1,
              private: !1,
              access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `activate`,
              static: !1,
              private: !1,
              access: { has: (e) => `activate` in e, get: (e) => e.activate },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `captureScreenshot`,
              static: !1,
              private: !1,
              access: { has: (e) => `captureScreenshot` in e, get: (e) => e.captureScreenshot },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `close`,
              static: !1,
              private: !1,
              access: { has: (e) => `close` in e, get: (e) => e.close },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `traverseHistory`,
              static: !1,
              private: !1,
              access: { has: (e) => `traverseHistory` in e, get: (e) => e.traverseHistory },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `navigate`,
              static: !1,
              private: !1,
              access: { has: (e) => `navigate` in e, get: (e) => e.navigate },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            c,
            {
              kind: `method`,
              name: `reload`,
              static: !1,
              private: !1,
              access: { has: (e) => `reload` in e, get: (e) => e.reload },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            l,
            {
              kind: `method`,
              name: `setCacheBehavior`,
              static: !1,
              private: !1,
              access: { has: (e) => `setCacheBehavior` in e, get: (e) => e.setCacheBehavior },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            u,
            {
              kind: `method`,
              name: `print`,
              static: !1,
              private: !1,
              access: { has: (e) => `print` in e, get: (e) => e.print },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            d,
            {
              kind: `method`,
              name: `handleUserPrompt`,
              static: !1,
              private: !1,
              access: { has: (e) => `handleUserPrompt` in e, get: (e) => e.handleUserPrompt },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            f,
            {
              kind: `method`,
              name: `setViewport`,
              static: !1,
              private: !1,
              access: { has: (e) => `setViewport` in e, get: (e) => e.setViewport },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            p,
            {
              kind: `method`,
              name: `setTouchOverride`,
              static: !1,
              private: !1,
              access: { has: (e) => `setTouchOverride` in e, get: (e) => e.setTouchOverride },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            m,
            {
              kind: `method`,
              name: `performActions`,
              static: !1,
              private: !1,
              access: { has: (e) => `performActions` in e, get: (e) => e.performActions },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            g,
            {
              kind: `method`,
              name: `releaseActions`,
              static: !1,
              private: !1,
              access: { has: (e) => `releaseActions` in e, get: (e) => e.releaseActions },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            _,
            {
              kind: `method`,
              name: `createWindowRealm`,
              static: !1,
              private: !1,
              access: { has: (e) => `createWindowRealm` in e, get: (e) => e.createWindowRealm },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            v,
            {
              kind: `method`,
              name: `addPreloadScript`,
              static: !1,
              private: !1,
              access: { has: (e) => `addPreloadScript` in e, get: (e) => e.addPreloadScript },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            y,
            {
              kind: `method`,
              name: `addIntercept`,
              static: !1,
              private: !1,
              access: { has: (e) => `addIntercept` in e, get: (e) => e.addIntercept },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            x,
            {
              kind: `method`,
              name: `removePreloadScript`,
              static: !1,
              private: !1,
              access: { has: (e) => `removePreloadScript` in e, get: (e) => e.removePreloadScript },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            ee,
            {
              kind: `method`,
              name: `setGeolocationOverride`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `setGeolocationOverride` in e,
                get: (e) => e.setGeolocationOverride,
              },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            te,
            {
              kind: `method`,
              name: `setTimezoneOverride`,
              static: !1,
              private: !1,
              access: { has: (e) => `setTimezoneOverride` in e, get: (e) => e.setTimezoneOverride },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            ne,
            {
              kind: `method`,
              name: `setScreenOrientationOverride`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `setScreenOrientationOverride` in e,
                get: (e) => e.setScreenOrientationOverride,
              },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            re,
            {
              kind: `method`,
              name: `getCookies`,
              static: !1,
              private: !1,
              access: { has: (e) => `getCookies` in e, get: (e) => e.getCookies },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            ie,
            {
              kind: `method`,
              name: `setCookie`,
              static: !1,
              private: !1,
              access: { has: (e) => `setCookie` in e, get: (e) => e.setCookie },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            ae,
            {
              kind: `method`,
              name: `setFiles`,
              static: !1,
              private: !1,
              access: { has: (e) => `setFiles` in e, get: (e) => e.setFiles },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            S,
            {
              kind: `method`,
              name: `subscribe`,
              static: !1,
              private: !1,
              access: { has: (e) => `subscribe` in e, get: (e) => e.subscribe },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            oe,
            {
              kind: `method`,
              name: `addInterception`,
              static: !1,
              private: !1,
              access: { has: (e) => `addInterception` in e, get: (e) => e.addInterception },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            se,
            {
              kind: `method`,
              name: `deleteCookie`,
              static: !1,
              private: !1,
              access: { has: (e) => `deleteCookie` in e, get: (e) => e.deleteCookie },
              metadata: h,
            },
            null,
            t
          ),
          q(
            this,
            null,
            ce,
            {
              kind: `method`,
              name: `locateNodes`,
              static: !1,
              private: !1,
              access: { has: (e) => `locateNodes` in e, get: (e) => e.locateNodes },
              metadata: h,
            },
            null,
            t
          ),
          h &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: h,
            }));
      }
      static from(e, t, n, r, i, a) {
        let o = new le(e, t, n, r, i, a);
        return (o.#u(), o);
      }
      #e = Pi(this, t);
      #t;
      #n;
      #r = !1;
      #i = new Map();
      #a = new w();
      #o = new Map();
      defaultRealm;
      id;
      parent;
      userContext;
      originalOpener;
      windowId;
      #s = { javaScriptEnabled: !0 };
      #c;
      #l;
      constructor(e, t, n, r, i, a) {
        (super(),
          (this.#n = r),
          (this.id = n),
          (this.parent = t),
          (this.userContext = e),
          (this.originalOpener = i),
          (this.windowId = a),
          (this.defaultRealm = this.#f()),
          (this.#c = new hi(this.id, this.#d)),
          (this.#l = new gi(this.id, this.#d)));
      }
      #u() {
        this.#a.use(new h(this.userContext)).once(`closed`, (e) => {
          this.dispose(`Browsing context already closed: ${e}`);
        });
        let e = this.#a.use(new h(this.#d));
        (e.on(`input.fileDialogOpened`, (e) => {
          this.id === e.context && this.emit(`filedialogopened`, e);
        }),
          e.on(`browsingContext.contextCreated`, (e) => {
            if (e.parent !== this.id) return;
            let t = le.from(
              this.userContext,
              this,
              e.context,
              e.url,
              e.originalOpener,
              e.clientWindow
            );
            this.#i.set(e.context, t);
            let n = this.#a.use(new h(t));
            (n.once(`closed`, () => {
              (n.removeAllListeners(), this.#i.delete(t.id));
            }),
              this.emit(`browsingcontext`, t));
          }),
          e.on(`browsingContext.contextDestroyed`, (e) => {
            e.context === this.id && this.dispose(`Browsing context already closed.`);
          }),
          e.on(`browsingContext.historyUpdated`, (e) => {
            e.context === this.id && ((this.#n = e.url), this.emit(`historyUpdated`, void 0));
          }),
          e.on(`browsingContext.domContentLoaded`, (e) => {
            e.context === this.id && ((this.#n = e.url), this.emit(`DOMContentLoaded`, void 0));
          }),
          e.on(`browsingContext.load`, (e) => {
            e.context === this.id && ((this.#n = e.url), this.emit(`load`, void 0));
          }),
          e.on(`browsingContext.navigationStarted`, (e) => {
            if (e.context !== this.id || (this.#e !== void 0 && !this.#e.disposed)) return;
            this.#e = bi.from(this);
            let t = this.#a.use(new h(this.#e));
            for (let e of [`fragment`, `failed`, `aborted`])
              t.once(e, ({ url: e }) => {
                (t[A](), (this.#n = e));
              });
            this.emit(`navigation`, this.#e);
          }),
          e.on(`network.beforeRequestSent`, (e) => {
            if (e.context !== this.id || e.redirectCount > 0) return;
            let t = Ai.from(this, e);
            this.emit(`request`, t);
          }),
          e.on(`log.entryAdded`, (e) => {
            e.source.context === this.id && this.emit(`log`, e);
          }),
          e.on(`browsingContext.userPromptOpened`, (e) => {
            if (e.context !== this.id) return;
            let t = Ni.from(this, e);
            this.emit(`userprompt`, t);
          }));
      }
      get #d() {
        return this.userContext.browser.session;
      }
      get children() {
        return this.#i.values();
      }
      get closed() {
        return this.#t !== void 0;
      }
      get disposed() {
        return this.closed;
      }
      get realms() {
        let e = this;
        return (function* () {
          (yield e.defaultRealm, yield* e.#o.values());
        })();
      }
      get top() {
        let e = this;
        for (let { parent: t } = e; t; { parent: t } = e) e = t;
        return e;
      }
      get url() {
        return this.#n;
      }
      #f(e) {
        let t = Ti.from(this, e);
        return (
          t.on(`worker`, (e) => {
            this.emit(`worker`, e);
          }),
          t
        );
      }
      dispose(e) {
        this.#t = e;
        for (let e of this.#i.values()) e.dispose(`Parent browsing context was disposed`);
        this[A]();
      }
      async activate() {
        await this.#d.send(`browsingContext.activate`, { context: this.id });
      }
      async captureScreenshot(e = {}) {
        let {
          result: { data: t },
        } = await this.#d.send(`browsingContext.captureScreenshot`, { context: this.id, ...e });
        return t;
      }
      async close(e) {
        await this.#d.send(`browsingContext.close`, { context: this.id, promptUnload: e });
      }
      async traverseHistory(e) {
        await this.#d.send(`browsingContext.traverseHistory`, { context: this.id, delta: e });
      }
      async navigate(e, t) {
        await this.#d.send(`browsingContext.navigate`, { context: this.id, url: e, wait: t });
      }
      async reload(e = {}) {
        await this.#d.send(`browsingContext.reload`, { context: this.id, ...e });
      }
      async setCacheBehavior(e) {
        await this.#d.send(`network.setCacheBehavior`, { contexts: [this.id], cacheBehavior: e });
      }
      async print(e = {}) {
        let {
          result: { data: t },
        } = await this.#d.send(`browsingContext.print`, { context: this.id, ...e });
        return t;
      }
      async handleUserPrompt(e = {}) {
        await this.#d.send(`browsingContext.handleUserPrompt`, { context: this.id, ...e });
      }
      async setViewport(e = {}) {
        await this.#d.send(`browsingContext.setViewport`, { context: this.id, ...e });
      }
      async setTouchOverride(e) {
        await this.#d.send(`emulation.setTouchOverride`, {
          contexts: [this.id],
          maxTouchPoints: e,
        });
      }
      async performActions(e) {
        await this.#d.send(`input.performActions`, { context: this.id, actions: e });
      }
      async releaseActions() {
        await this.#d.send(`input.releaseActions`, { context: this.id });
      }
      createWindowRealm(e) {
        return this.#f(e);
      }
      async addPreloadScript(e, t = {}) {
        return await this.userContext.browser.addPreloadScript(e, { ...t, contexts: [this] });
      }
      async addIntercept(e) {
        let {
          result: { intercept: t },
        } = await this.userContext.browser.session.send(`network.addIntercept`, {
          ...e,
          contexts: [this.id],
        });
        return t;
      }
      async removePreloadScript(e) {
        await this.userContext.browser.removePreloadScript(e);
      }
      async setGeolocationOverride(e) {
        if (!(`coordinates` in e)) throw Error(`Missing coordinates`);
        await this.userContext.browser.session.send(`emulation.setGeolocationOverride`, {
          coordinates: e.coordinates,
          contexts: [this.id],
        });
      }
      async setTimezoneOverride(e) {
        (e?.startsWith(`GMT`) && (e = e?.replace(`GMT`, ``)),
          await this.userContext.browser.session.send(`emulation.setTimezoneOverride`, {
            timezone: e ?? null,
            contexts: [this.id],
          }));
      }
      async setScreenOrientationOverride(e) {
        await this.#d.send(`emulation.setScreenOrientationOverride`, {
          screenOrientation: e,
          contexts: [this.id],
        });
      }
      async getCookies(e = {}) {
        let {
          result: { cookies: t },
        } = await this.#d.send(`storage.getCookies`, {
          ...e,
          partition: { type: `context`, context: this.id },
        });
        return t;
      }
      async setCookie(e) {
        await this.#d.send(`storage.setCookie`, {
          cookie: e,
          partition: { type: `context`, context: this.id },
        });
      }
      async setFiles(e, t) {
        await this.#d.send(`input.setFiles`, { context: this.id, element: e, files: t });
      }
      async subscribe(e) {
        await this.#d.subscribe(e, [this.id]);
      }
      async addInterception(e) {
        await this.#d.subscribe(e, [this.id]);
      }
      [((n = [E]),
      (r = [b((e) => e.#t)]),
      (i = [b((e) => e.#t)]),
      (a = [b((e) => e.#t)]),
      (o = [b((e) => e.#t)]),
      (s = [b((e) => e.#t)]),
      (c = [b((e) => e.#t)]),
      (l = [b((e) => e.#t)]),
      (u = [b((e) => e.#t)]),
      (d = [b((e) => e.#t)]),
      (f = [b((e) => e.#t)]),
      (p = [b((e) => e.#t)]),
      (m = [b((e) => e.#t)]),
      (g = [b((e) => e.#t)]),
      (_ = [b((e) => e.#t)]),
      (v = [b((e) => e.#t)]),
      (y = [b((e) => e.#t)]),
      (x = [b((e) => e.#t)]),
      (ee = [b((e) => e.#t)]),
      (te = [b((e) => e.#t)]),
      (ne = [b((e) => e.#t)]),
      (re = [b((e) => e.#t)]),
      (ie = [b((e) => e.#t)]),
      (ae = [b((e) => e.#t)]),
      (S = [b((e) => e.#t)]),
      (oe = [b((e) => e.#t)]),
      A)]() {
        ((this.#t ??= `Browsing context already closed, probably because the user context closed.`),
          this.emit(`closed`, this.#t),
          this.#a.dispose(),
          super[A]());
      }
      async deleteCookie(...e) {
        await Promise.all(
          e.map(async (e) => {
            await this.#d.send(`storage.deleteCookies`, {
              filter: e,
              partition: { type: `context`, context: this.id },
            });
          })
        );
      }
      async locateNodes(e, t = []) {
        return (
          await this.#d.send(`browsingContext.locateNodes`, {
            context: this.id,
            locator: e,
            startNodes: t.length ? t : void 0,
          })
        ).result.nodes;
      }
      async setJavaScriptEnabled(e) {
        (await this.userContext.browser.session.send(`emulation.setScriptingEnabled`, {
          enabled: e ? null : !1,
          contexts: [this.id],
        }),
          (this.#s.javaScriptEnabled = e));
      }
      isJavaScriptEnabled() {
        return this.#s.javaScriptEnabled;
      }
      async setUserAgent(e) {
        await this.#d.send(`emulation.setUserAgentOverride`, { userAgent: e, contexts: [this.id] });
      }
      async setClientHintsOverride(e) {
        (e === null && !this.#r) ||
          ((this.#r = !0),
          await this.#d.send(`userAgentClientHints.setClientHintsOverride`, {
            clientHints: e,
            contexts: [this.id],
          }));
      }
      async setOfflineMode(e) {
        await this.#d.send(`emulation.setNetworkConditions`, {
          networkConditions: e ? { type: `offline` } : null,
          contexts: [this.id],
        });
      }
      get bluetooth() {
        return this.#c;
      }
      async waitForDevicePrompt(e, t) {
        return await this.#l.waitForDevicePrompt(e, t);
      }
      async setExtraHTTPHeaders(e) {
        await this.#d.send(`network.setExtraHeaders`, {
          headers: Object.entries(e).map(
            ([e, t]) => (
              k(ze(t), `Expected value of header "${e}" to be String, but "${typeof t}" is found.`),
              { name: e.toLowerCase(), value: { type: `string`, value: t } }
            )
          ),
          contexts: [this.id],
        });
      }
    };
  })(),
  Ii = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Li = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Ri = (() => {
    let e = h,
      t = [],
      n,
      r,
      i,
      a,
      o,
      s;
    return class c extends e {
      static {
        let c =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (Li(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `dispose`,
            static: !1,
            private: !1,
            access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
            metadata: c,
          },
          null,
          t
        ),
          Li(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `createBrowsingContext`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `createBrowsingContext` in e,
                get: (e) => e.createBrowsingContext,
              },
              metadata: c,
            },
            null,
            t
          ),
          Li(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `remove`,
              static: !1,
              private: !1,
              access: { has: (e) => `remove` in e, get: (e) => e.remove },
              metadata: c,
            },
            null,
            t
          ),
          Li(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `getCookies`,
              static: !1,
              private: !1,
              access: { has: (e) => `getCookies` in e, get: (e) => e.getCookies },
              metadata: c,
            },
            null,
            t
          ),
          Li(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `setCookie`,
              static: !1,
              private: !1,
              access: { has: (e) => `setCookie` in e, get: (e) => e.setCookie },
              metadata: c,
            },
            null,
            t
          ),
          Li(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `setPermissions`,
              static: !1,
              private: !1,
              access: { has: (e) => `setPermissions` in e, get: (e) => e.setPermissions },
              metadata: c,
            },
            null,
            t
          ),
          c &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: c,
            }));
      }
      static DEFAULT = `default`;
      static create(e, t) {
        let n = new c(e, t);
        return (n.#i(), n);
      }
      #e = Ii(this, t);
      #t = new Map();
      #n = new w();
      #r;
      browser;
      constructor(e, t) {
        (super(), (this.#r = t), (this.browser = e));
      }
      #i() {
        let e = this.#n.use(new h(this.browser));
        (e.once(`closed`, (e) => {
          this.dispose(`User context was closed: ${e}`);
        }),
          e.once(`disconnected`, (e) => {
            this.dispose(`User context was closed: ${e}`);
          }),
          this.#n.use(new h(this.#a)).on(`browsingContext.contextCreated`, (e) => {
            if (e.parent || e.userContext !== this.#r) return;
            let t = Fi.from(this, void 0, e.context, e.url, e.originalOpener, e.clientWindow);
            this.#t.set(t.id, t);
            let n = this.#n.use(new h(t));
            (n.on(`closed`, () => {
              (n.removeAllListeners(), this.#t.delete(t.id));
            }),
              this.emit(`browsingcontext`, t));
          }));
      }
      get #a() {
        return this.browser.session;
      }
      get browsingContexts() {
        return this.#t.values();
      }
      get closed() {
        return this.#e !== void 0;
      }
      get disposed() {
        return this.closed;
      }
      get id() {
        return this.#r;
      }
      dispose(e) {
        ((this.#e = e), this[A]());
      }
      async createBrowsingContext(e, t = {}) {
        let {
            result: { context: n },
          } = await this.#a.send(`browsingContext.create`, {
            type: e,
            ...t,
            referenceContext: t.referenceContext?.id,
            background: t.background,
            userContext: this.#r,
          }),
          r = this.#t.get(n);
        return (
          k(
            r,
            `The WebDriver BiDi implementation is failing to create a browsing context correctly.`
          ),
          r
        );
      }
      async remove() {
        try {
          await this.#a.send(`browser.removeUserContext`, { userContext: this.#r });
        } finally {
          this.dispose(`User context already closed.`);
        }
      }
      async getCookies(e = {}, t = void 0) {
        let {
          result: { cookies: n },
        } = await this.#a.send(`storage.getCookies`, {
          ...e,
          partition: { type: `storageKey`, userContext: this.#r, sourceOrigin: t },
        });
        return n;
      }
      async setCookie(e, t) {
        await this.#a.send(`storage.setCookie`, {
          cookie: e,
          partition: { type: `storageKey`, sourceOrigin: t, userContext: this.id },
        });
      }
      async setPermissions(e, t, n) {
        await this.#a.send(`permissions.setPermission`, {
          origin: e,
          descriptor: t,
          state: n,
          userContext: this.#r,
        });
      }
      [((n = [E]),
      (r = [b((e) => e.#e)]),
      (i = [b((e) => e.#e)]),
      (a = [b((e) => e.#e)]),
      (o = [b((e) => e.#e)]),
      (s = [b((e) => e.#e)]),
      A)]() {
        ((this.#e ??= `User context already closed, probably because the browser disconnected/closed.`),
          this.emit(`closed`, this.#e),
          this.#n.dispose(),
          super[A]());
      }
    };
  })(),
  zi = class {
    static deserialize(e) {
      if (!e) {
        C(`Service did not produce a result.`);
        return;
      }
      switch (e.type) {
        case `array`:
          return e.value?.map((e) => this.deserialize(e));
        case `set`:
          return e.value?.reduce((e, t) => e.add(this.deserialize(t)), new Set());
        case `object`:
          return e.value?.reduce((e, t) => {
            let { key: n, value: r } = this.#t(t);
            return ((e[n] = r), e);
          }, {});
        case `map`:
          return e.value?.reduce((e, t) => {
            let { key: n, value: r } = this.#t(t);
            return e.set(n, r);
          }, new Map());
        case `promise`:
          return {};
        case `regexp`:
          return new RegExp(e.value.pattern, e.value.flags);
        case `date`:
          return new Date(e.value);
        case `undefined`:
          return;
        case `null`:
          return null;
        case `number`:
          return this.#e(e.value);
        case `bigint`:
          return BigInt(e.value);
        case `boolean`:
          return !!e.value;
        case `string`:
          return e.value;
      }
      C(`Deserialization of type ${e.type} not supported.`);
    }
    static #e(e) {
      switch (e) {
        case `-0`:
          return -0;
        case `NaN`:
          return NaN;
        case `Infinity`:
          return 1 / 0;
        case `-Infinity`:
          return -1 / 0;
        default:
          return e;
      }
    }
    static #t([e, t]) {
      return { key: typeof e == `string` ? e : this.deserialize(e), value: this.deserialize(t) };
    }
  },
  Bi = class e extends je {
    static from(t, n) {
      return new e(t, n);
    }
    #e;
    realm;
    #t = !1;
    constructor(e, t) {
      (super(), (this.#e = e), (this.realm = t));
    }
    get disposed() {
      return this.#t;
    }
    async jsonValue() {
      return await this.evaluate((e) => e);
    }
    asElement() {
      return null;
    }
    async dispose() {
      this.#t || ((this.#t = !0), await this.realm.destroyHandles([this]));
    }
    get isPrimitiveValue() {
      switch (this.#e.type) {
        case `string`:
        case `number`:
        case `bigint`:
        case `boolean`:
        case `undefined`:
        case `null`:
          return !0;
        default:
          return !1;
      }
    }
    toString() {
      return this.isPrimitiveValue
        ? `JSHandle:` + zi.deserialize(this.#e)
        : `JSHandle@` + this.#e.type;
    }
    get id() {
      return `handle` in this.#e ? this.#e.handle : void 0;
    }
    remoteValue() {
      return this.#e;
    }
    remoteObject() {
      throw new D(`Not available in WebDriver BiDi`);
    }
  },
  Vi = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Hi = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Ui = function (e, t, n) {
    if (t != null) {
      if (typeof t != `object` && typeof t != `function`) throw TypeError(`Object expected.`);
      var r, i;
      if (n) {
        if (!Symbol.asyncDispose) throw TypeError(`Symbol.asyncDispose is not defined.`);
        r = t[Symbol.asyncDispose];
      }
      if (r === void 0) {
        if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
        ((r = t[Symbol.dispose]), n && (i = r));
      }
      if (typeof r != `function`) throw TypeError(`Object not disposable.`);
      (i &&
        (r = function () {
          try {
            i.call(this);
          } catch (e) {
            return Promise.reject(e);
          }
        }),
        e.stack.push({ value: t, dispose: r, async: n }));
    } else n && e.stack.push({ async: !0 });
    return t;
  },
  Wi = (function (e) {
    return function (t) {
      function n(n) {
        ((t.error = t.hasError ? new e(n, t.error, `An error was suppressed during disposal.`) : n),
          (t.hasError = !0));
      }
      var r,
        i = 0;
      function a() {
        for (; (r = t.stack.pop()); )
          try {
            if (!r.async && i === 1) return ((i = 0), t.stack.push(r), Promise.resolve().then(a));
            if (r.dispose) {
              var e = r.dispose.call(r.value);
              if (r.async)
                return (
                  (i |= 2),
                  Promise.resolve(e).then(a, function (e) {
                    return (n(e), a());
                  })
                );
            } else i |= 1;
          } catch (e) {
            n(e);
          }
        if (i === 1) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
        if (t.hasError) throw t.error;
      }
      return a();
    };
  })(
    typeof SuppressedError == `function`
      ? SuppressedError
      : function (e, t, n) {
          var r = Error(n);
          return ((r.name = `SuppressedError`), (r.error = e), (r.suppressed = t), r);
        }
  ),
  J = (() => {
    let e = s,
      t = [],
      n,
      r;
    return class a extends e {
      static {
        let i =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((n = [b()]),
          (r = [b(), ee]),
          Hi(
            this,
            null,
            n,
            {
              kind: `method`,
              name: `autofill`,
              static: !1,
              private: !1,
              access: { has: (e) => `autofill` in e, get: (e) => e.autofill },
              metadata: i,
            },
            null,
            t
          ),
          Hi(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `contentFrame`,
              static: !1,
              private: !1,
              access: { has: (e) => `contentFrame` in e, get: (e) => e.contentFrame },
              metadata: i,
            },
            null,
            t
          ),
          i &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: i,
            }));
      }
      #e = Vi(this, t);
      static from(e, t) {
        return new a(e, t);
      }
      constructor(e, t) {
        super(Bi.from(e, t));
      }
      get realm() {
        return this.handle.realm;
      }
      get frame() {
        return this.realm.environment;
      }
      remoteValue() {
        return this.handle.remoteValue();
      }
      async autofill(e) {
        let t = this.frame.client,
          n = (await t.send(`DOM.describeNode`, { objectId: this.handle.id })).node.backendNodeId,
          r = this.frame._id;
        await t.send(`Autofill.trigger`, {
          fieldId: n,
          frameId: r,
          card: e.creditCard,
          address: e.address,
        });
      }
      async contentFrame() {
        let e = { stack: [], error: void 0, hasError: !1 };
        try {
          let t = Ui(
            e,
            await this.evaluateHandle((e) => {
              if (e instanceof HTMLIFrameElement || e instanceof HTMLFrameElement)
                return e.contentWindow;
            }),
            !1
          ).remoteValue();
          return t.type === `window`
            ? (this.frame
                .page()
                .frames()
                .find((e) => e._id === t.value.context) ?? null)
            : null;
        } catch (t) {
          ((e.error = t), (e.hasError = !0));
        } finally {
          Wi(e);
        }
      }
      async uploadFile(...e) {
        let t = tt.value.path;
        (t &&
          (e = e.map((e) => (t.win32.isAbsolute(e) || t.posix.isAbsolute(e) ? e : t.resolve(e)))),
          await this.frame.setFiles(this, e));
      }
      async *queryAXTree(e, t) {
        let n = await this.frame.locateNodes(this, {
          type: `accessibility`,
          value: { role: t, name: e },
        });
        return yield* i.map(n, (e) => Promise.resolve(a.from(e, this.realm)));
      }
      async backendNodeId() {
        if (!this.frame.page().browser().cdpSupported) throw new D();
        if (this.#e) return this.#e;
        let { node: e } = await this.frame.client.send(`DOM.describeNode`, {
          objectId: this.handle.id,
        });
        return ((this.#e = e.backendNodeId), this.#e);
      }
    };
  })(),
  Gi = class e extends le {
    static from(t) {
      return new e(t);
    }
    #e;
    constructor(e) {
      (super(e.info.type, e.info.message, e.info.defaultValue),
        (this.#e = e),
        (this.handled = e.handled));
    }
    async handle(e) {
      await this.#e.handle({ accept: e.accept, userText: e.text });
    }
  },
  Ki = function (e, t, n) {
    if (t != null) {
      if (typeof t != `object` && typeof t != `function`) throw TypeError(`Object expected.`);
      var r, i;
      if (n) {
        if (!Symbol.asyncDispose) throw TypeError(`Symbol.asyncDispose is not defined.`);
        r = t[Symbol.asyncDispose];
      }
      if (r === void 0) {
        if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
        ((r = t[Symbol.dispose]), n && (i = r));
      }
      if (typeof r != `function`) throw TypeError(`Object not disposable.`);
      (i &&
        (r = function () {
          try {
            i.call(this);
          } catch (e) {
            return Promise.reject(e);
          }
        }),
        e.stack.push({ value: t, dispose: r, async: n }));
    } else n && e.stack.push({ async: !0 });
    return t;
  },
  qi = (function (e) {
    return function (t) {
      function n(n) {
        ((t.error = t.hasError ? new e(n, t.error, `An error was suppressed during disposal.`) : n),
          (t.hasError = !0));
      }
      var r,
        i = 0;
      function a() {
        for (; (r = t.stack.pop()); )
          try {
            if (!r.async && i === 1) return ((i = 0), t.stack.push(r), Promise.resolve().then(a));
            if (r.dispose) {
              var e = r.dispose.call(r.value);
              if (r.async)
                return (
                  (i |= 2),
                  Promise.resolve(e).then(a, function (e) {
                    return (n(e), a());
                  })
                );
            } else i |= 1;
          } catch (e) {
            n(e);
          }
        if (i === 1) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
        if (t.hasError) throw t.error;
      }
      return a();
    };
  })(
    typeof SuppressedError == `function`
      ? SuppressedError
      : function (e, t, n) {
          var r = Error(n);
          return ((r.name = `SuppressedError`), (r.error = e), (r.suppressed = t), r);
        }
  ),
  Ji = class e {
    static async from(t, n, r, i = !1) {
      let a = new e(t, n, r, i);
      return (await a.#o(), a);
    }
    #e;
    name;
    #t;
    #n;
    #r;
    #i = [];
    #a = new w();
    constructor(e, t, n, r = !1) {
      ((this.#e = e),
        (this.name = t),
        (this.#t = n),
        (this.#n = r),
        (this.#r = `__puppeteer__${this.#e._id}_page_exposeFunction_${this.name}`));
    }
    async #o() {
      let e = this.#s,
        t = { type: `channel`, value: { channel: this.#r, ownership: `root` } };
      this.#a.use(new h(e)).on(`script.message`, this.#c);
      let n = ie(
          _(
            (e) => {
              Object.assign(globalThis, {
                [PLACEHOLDER(`name`)]: function (...t) {
                  return new Promise((n, r) => {
                    e([n, r, t]);
                  });
                },
              });
            },
            { name: JSON.stringify(this.name) }
          )
        ),
        r = [this.#e];
      for (let e of r) r.push(...e.childFrames());
      await Promise.all(
        r.map(async (e) => {
          let r = this.#n ? e.isolatedRealm() : e.mainRealm();
          try {
            let [i] = await Promise.all([
              e.browsingContext.addPreloadScript(n, { arguments: [t], sandbox: r.sandbox }),
              r.realm.callFunction(n, !1, { arguments: [t] }),
            ]);
            this.#i.push([e, i]);
          } catch (e) {
            C(e);
          }
        })
      );
    }
    get #s() {
      return this.#e.page().browser().connection;
    }
    #c = async (e) => {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        if (e.channel !== this.#r) return;
        let n = this.#l(e.source);
        if (!n) return;
        let r = Ki(t, Bi.from(e.data, n), !1),
          i = Ki(t, new w(), !1),
          a = [],
          o;
        try {
          let e = { stack: [], error: void 0, hasError: !1 };
          try {
            let t = Ki(e, await r.evaluateHandle(([, , e]) => e), !1);
            for (let [e, n] of await t.getProperties()) {
              if ((i.use(n), n instanceof J)) {
                ((a[+e] = n), i.use(n));
                continue;
              }
              a[+e] = n.jsonValue();
            }
            o = await this.#t(...(await Promise.all(a)));
          } catch (t) {
            ((e.error = t), (e.hasError = !0));
          } finally {
            qi(e);
          }
        } catch (e) {
          try {
            e instanceof Error
              ? await r.evaluate(
                  ([, e], t, n, r) => {
                    let i = Error(n);
                    ((i.name = t), r && (i.stack = r), e(i));
                  },
                  e.name,
                  e.message,
                  e.stack
                )
              : await r.evaluate(([, e], t) => {
                  e(t);
                }, e);
          } catch (e) {
            C(e);
          }
          return;
        }
        try {
          await r.evaluate(([e], t) => {
            e(t);
          }, o);
        } catch (e) {
          C(e);
        }
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        qi(t);
      }
    };
    #l(e) {
      let t = this.#u(e.context);
      if (t) return t.realm(e.realm);
    }
    #u(e) {
      let t = [this.#e];
      for (let n of t) {
        if (n._id === e) return n;
        t.push(...n.childFrames());
      }
    }
    [Symbol.dispose]() {
      this[Symbol.asyncDispose]().catch(C);
    }
    async [Symbol.asyncDispose]() {
      (this.#a.dispose(),
        await Promise.all(
          this.#i.map(async ([e, t]) => {
            let n = this.#n ? e.isolatedRealm() : e.mainRealm();
            try {
              await Promise.all([
                n.evaluate((e) => {
                  delete globalThis[e];
                }, this.name),
                ...e.childFrames().map((e) =>
                  e.evaluate((e) => {
                    delete globalThis[e];
                  }, this.name)
                ),
                e.browsingContext.removePreloadScript(t),
              ]);
            } catch (e) {
              C(e);
            }
          })
        ));
    }
  },
  Yi = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Xi = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Zi = (() => {
    let e = _e,
      t = [],
      n;
    return class r extends e {
      static {
        let r =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((n = [v]),
          Xi(
            this,
            null,
            n,
            {
              kind: `method`,
              name: `remoteAddress`,
              static: !1,
              private: !1,
              access: { has: (e) => `remoteAddress` in e, get: (e) => e.remoteAddress },
              metadata: r,
            },
            null,
            t
          ),
          r &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: r,
            }));
      }
      static from(e, t, n) {
        let i = t.response();
        if (i) return ((i.#e = e), i);
        let a = new r(e, t, n);
        return (a.#i(), a);
      }
      #e = Yi(this, t);
      #t;
      #n;
      #r = !1;
      constructor(e, t, n) {
        (super(), (this.#e = e), (this.#t = t), (this.#r = n));
        let r = e[`goog:securityDetails`];
        n && r && (this.#n = new Ue(r));
      }
      #i() {
        (this.#e.fromCache &&
          ((this.#t._fromMemoryCache = !0),
          this.#t.frame()?.page().trustedEmitter.emit(`requestservedfromcache`, this.#t)),
          this.#t.frame()?.page().trustedEmitter.emit(`response`, this));
      }
      remoteAddress() {
        return { ip: ``, port: -1 };
      }
      url() {
        return this.#e.url;
      }
      status() {
        return this.#e.status;
      }
      statusText() {
        return this.#e.statusText;
      }
      headers() {
        let e = {};
        for (let t of this.#e.headers)
          t.value.type === `string` && (e[t.name.toLowerCase()] = Ie(t.value.value));
        return e;
      }
      request() {
        return this.#t;
      }
      fromCache() {
        return this.#e.fromCache;
      }
      timing() {
        let e = this.#t.timing();
        return {
          requestTime: e.requestTime,
          proxyStart: -1,
          proxyEnd: -1,
          dnsStart: e.dnsStart,
          dnsEnd: e.dnsEnd,
          connectStart: e.connectStart,
          connectEnd: e.connectEnd,
          sslStart: e.tlsStart,
          sslEnd: -1,
          workerStart: -1,
          workerReady: -1,
          workerFetchStart: -1,
          workerRespondWithSettled: -1,
          workerRouterEvaluationStart: -1,
          workerCacheLookupStart: -1,
          sendStart: e.requestStart,
          sendEnd: -1,
          pushStart: -1,
          pushEnd: -1,
          receiveHeadersStart: e.responseStart,
          receiveHeadersEnd: e.responseEnd,
        };
      }
      frame() {
        return this.#t.frame();
      }
      fromServiceWorker() {
        return !1;
      }
      securityDetails() {
        if (!this.#r) throw new D();
        return this.#n ?? null;
      }
      async content() {
        return await this.#t.getResponseContent();
      }
    };
  })(),
  Qi,
  $i = new WeakMap(),
  ea = class extends $e {
    static from(e, t, n, r) {
      let i = new Qi(e, t, n, r);
      return (i.#i(), i);
    }
    #e;
    #t = null;
    id;
    #n;
    #r;
    constructor(e, t, n, r) {
      (super(),
        $i.set(e, this),
        (this.interception.enabled = n),
        (this.#r = e),
        (this.#n = t),
        (this.#e = r ? r.#e : []),
        (this.id = e.id));
    }
    get client() {
      return this.#n.client;
    }
    #i() {
      (this.#r.on(`redirect`, (e) => {
        let t = Qi.from(e, this.#n, this.interception.enabled, this);
        (this.#e.push(this),
          e.once(`success`, () => {
            this.#n.page().trustedEmitter.emit(`requestfinished`, t);
          }),
          e.once(`error`, () => {
            this.#n.page().trustedEmitter.emit(`requestfailed`, t);
          }),
          t.finalizeInterceptions());
      }),
        this.#r.once(`response`, (e) => {
          this.#t = Zi.from(e, this, this.#n.page().browser().cdpSupported);
        }),
        this.#r.once(`success`, (e) => {
          this.#t = Zi.from(e, this, this.#n.page().browser().cdpSupported);
        }),
        this.#r.on(`authenticate`, this.#o),
        this.#n.page().trustedEmitter.emit(`request`, this));
    }
    canBeIntercepted() {
      return this.#r.isBlocked;
    }
    interceptResolutionState() {
      return this.#r.isBlocked ? super.interceptResolutionState() : { action: ae.Disabled };
    }
    url() {
      return this.#r.url;
    }
    resourceType() {
      if (!this.#n.page().browser().cdpSupported) throw new D();
      return (this.#r.resourceType || `other`).toLowerCase();
    }
    method() {
      return this.#r.method;
    }
    postData() {
      if (!this.#n.page().browser().cdpSupported) throw new D();
      return this.#r.postData;
    }
    hasPostData() {
      return this.#r.hasPostData;
    }
    async fetchPostData() {
      return await this.#r.fetchPostData();
    }
    headers() {
      let e = {};
      for (let t of this.#r.headers) e[t.name.toLowerCase()] = t.value.value;
      return { ...e };
    }
    response() {
      return this.#t;
    }
    failure() {
      return this.#r.error === void 0 ? null : { errorText: this.#r.error };
    }
    isNavigationRequest() {
      return this.#r.navigation !== void 0;
    }
    initiator() {
      return { ...this.#r.initiator, type: this.#r.initiator?.type ?? `other` };
    }
    redirectChain() {
      return this.#e.slice();
    }
    frame() {
      return this.#n;
    }
    async _continue(e = {}) {
      let t = ta(e.headers);
      return (
        (this.interception.handled = !0),
        await this.#r
          .continueRequest({
            url: e.url,
            method: e.method,
            body: e.postData ? { type: `base64`, value: Te(e.postData) } : void 0,
            headers: t.length > 0 ? t : void 0,
          })
          .catch((e) => ((this.interception.handled = !1), Ze(e)))
      );
    }
    async _abort() {
      return (
        (this.interception.handled = !0),
        await this.#r.failRequest().catch((e) => {
          throw ((this.interception.handled = !1), e);
        })
      );
    }
    async _respond(e, t) {
      this.interception.handled = !0;
      let n;
      e.body && (n = $e.getResponse(e.body));
      let r = ta(e.headers),
        i = r.some((e) => e.name === `content-length`);
      (e.contentType &&
        r.push({ name: `content-type`, value: { type: `string`, value: e.contentType } }),
        n?.contentLength &&
          !i &&
          r.push({
            name: `content-length`,
            value: { type: `string`, value: String(n.contentLength) },
          }));
      let o = e.status || 200;
      return await this.#r
        .provideResponse({
          statusCode: o,
          headers: r.length > 0 ? r : void 0,
          reasonPhrase: a[o],
          body: n?.base64 ? { type: `base64`, value: n?.base64 } : void 0,
        })
        .catch((e) => {
          throw ((this.interception.handled = !1), e);
        });
    }
    #a = !1;
    #o = async () => {
      if (!this.#n) return;
      let e = this.#n.page()._credentials;
      e && !this.#a
        ? ((this.#a = !0),
          this.#r.continueWithAuth({
            action: `provideCredentials`,
            credentials: { type: `password`, username: e.username, password: e.password },
          }))
        : this.#r.continueWithAuth({ action: `cancel` });
    };
    timing() {
      return this.#r.timing();
    }
    getResponseContent() {
      return this.#r.getResponseContent();
    }
  };
Qi = ea;
function ta(e) {
  let t = [];
  for (let [n, r] of Object.entries(e ?? []))
    if (!Object.is(r, void 0)) {
      let e = Array.isArray(r) ? r : [r];
      for (let r of e)
        t.push({ name: n.toLowerCase(), value: { type: `string`, value: String(r) } });
    }
  return t;
}
var na = class extends Error {},
  ra = class {
    static serialize(e) {
      switch (typeof e) {
        case `symbol`:
        case `function`:
          throw new na(`Unable to serializable ${typeof e}`);
        case `object`:
          return this.#t(e);
        case `undefined`:
          return { type: `undefined` };
        case `number`:
          return this.#e(e);
        case `bigint`:
          return { type: `bigint`, value: e.toString() };
        case `string`:
          return { type: `string`, value: e };
        case `boolean`:
          return { type: `boolean`, value: e };
      }
    }
    static #e(e) {
      let t;
      return (
        (t = Object.is(e, -0)
          ? `-0`
          : Object.is(e, 1 / 0)
            ? `Infinity`
            : Object.is(e, -1 / 0)
              ? `-Infinity`
              : Object.is(e, NaN)
                ? `NaN`
                : e),
        { type: `number`, value: t }
      );
    }
    static #t(e) {
      if (e === null) return { type: `null` };
      if (Array.isArray(e)) return { type: `array`, value: e.map((e) => this.serialize(e)) };
      if (ke(e)) {
        try {
          JSON.stringify(e);
        } catch (e) {
          throw (
            e instanceof TypeError &&
              e.message.startsWith(`Converting circular structure to JSON`) &&
              (e.message += ` Recursive objects are not allowed.`),
            e
          );
        }
        let t = [];
        for (let n in e) t.push([this.serialize(n), this.serialize(e[n])]);
        return { type: `object`, value: t };
      } else if (ge(e)) return { type: `regexp`, value: { pattern: e.source, flags: e.flags } };
      else if (We(e)) return { type: `date`, value: e.toISOString() };
      throw new na(`Custom object serialization not possible. Use plain objects instead.`);
    }
  };
function ia(e) {
  switch (e) {
    case `group`:
      return `startGroup`;
    case `groupCollapsed`:
      return `startGroupCollapsed`;
    case `groupEnd`:
      return `endGroup`;
    default:
      return e;
  }
}
function aa(e) {
  let t = [];
  if (e)
    for (let n of e.callFrames)
      t.push({ url: n.url, lineNumber: n.lineNumber, columnNumber: n.columnNumber });
  return t;
}
function oa(e, t, n, r) {
  let i = t
    .reduce(
      (e, t) =>
        `${e} ${t instanceof Bi && t.isPrimitiveValue ? zi.deserialize(t.remoteValue()) : t.toString()}`,
      ``
    )
    .slice(1);
  return new ve(ia(e.method), i, t, aa(e.stackTrace), n, void 0, r);
}
function sa(e) {
  return e.type === `console`;
}
function ca(e) {
  return e.type === `javascript`;
}
function la(e) {
  if (e.exception.type === `object` && !(`value` in e.exception)) return Error(e.text);
  if (e.exception.type !== `error`) return zi.deserialize(e.exception);
  let [t = ``, ...n] = e.text.split(`: `),
    r = n.join(`: `),
    i = Error(r);
  i.name = t;
  let a = [];
  if (e.stackTrace && a.length < Error.stackTraceLimit)
    for (let t of e.stackTrace.callFrames.reverse()) {
      if (fe.isPuppeteerURL(t.url) && t.url !== fe.INTERNAL_URL) {
        let e = fe.parse(t.url);
        a.unshift(
          `    at ${t.functionName || e.functionName} (${e.functionName} at ${e.siteString}, <anonymous>:${t.lineNumber}:${t.columnNumber})`
        );
      } else
        a.push(
          `    at ${t.functionName || `<anonymous>`} (${t.url}:${t.lineNumber}:${t.columnNumber})`
        );
      if (a.length >= Error.stackTraceLimit) break;
    }
  return (
    (i.stack = [e.text, ...a].join(`
`)),
    i
  );
}
function ua(e, t) {
  return (n) => {
    throw (
      n instanceof Xe
        ? (n.message += ` at ${e}`)
        : n instanceof Ce && (n.message = `Navigation timeout of ${t} ms exceeded`),
      n
    );
  };
}
function da(e) {
  throw e instanceof Error &&
    (e.message.includes(`ExecutionContext was destroyed`) ||
      e.message.includes(`Inspected target navigated or closed`))
    ? Error(`Execution context was destroyed, most likely because of a navigation.`)
    : e;
}
var fa = function (e, t, n) {
    if (t != null) {
      if (typeof t != `object` && typeof t != `function`) throw TypeError(`Object expected.`);
      var r, i;
      if (n) {
        if (!Symbol.asyncDispose) throw TypeError(`Symbol.asyncDispose is not defined.`);
        r = t[Symbol.asyncDispose];
      }
      if (r === void 0) {
        if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
        ((r = t[Symbol.dispose]), n && (i = r));
      }
      if (typeof r != `function`) throw TypeError(`Object not disposable.`);
      (i &&
        (r = function () {
          try {
            i.call(this);
          } catch (e) {
            return Promise.reject(e);
          }
        }),
        e.stack.push({ value: t, dispose: r, async: n }));
    } else n && e.stack.push({ async: !0 });
    return t;
  },
  pa = (function (e) {
    return function (t) {
      function n(n) {
        ((t.error = t.hasError ? new e(n, t.error, `An error was suppressed during disposal.`) : n),
          (t.hasError = !0));
      }
      var r,
        i = 0;
      function a() {
        for (; (r = t.stack.pop()); )
          try {
            if (!r.async && i === 1) return ((i = 0), t.stack.push(r), Promise.resolve().then(a));
            if (r.dispose) {
              var e = r.dispose.call(r.value);
              if (r.async)
                return (
                  (i |= 2),
                  Promise.resolve(e).then(a, function (e) {
                    return (n(e), a());
                  })
                );
            } else i |= 1;
          } catch (e) {
            n(e);
          }
        if (i === 1) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
        if (t.hasError) throw t.error;
      }
      return a();
    };
  })(
    typeof SuppressedError == `function`
      ? SuppressedError
      : function (e, t, n) {
          var r = Error(n);
          return ((r.name = `SuppressedError`), (r.error = e), (r.suppressed = t), r);
        }
  ),
  ma = class extends Fe {
    realm;
    constructor(e, t) {
      (super(t), (this.realm = e));
    }
    initialize() {
      (this.realm.on(`destroyed`, (e) => {
        (this.taskManager.terminateAll(Error(e)), this.dispose());
      }),
        this.realm.on(`updated`, () => {
          ((this.internalPuppeteerUtil = void 0), this.taskManager.rerunAll());
        }));
    }
    internalPuppeteerUtil;
    get puppeteerUtil() {
      let e = Promise.resolve();
      return (
        ne.inject((t) => {
          (this.internalPuppeteerUtil &&
            this.internalPuppeteerUtil.then((e) => {
              e.dispose();
            }),
            (this.internalPuppeteerUtil = e.then(() => this.evaluateHandle(t))));
        }, !this.internalPuppeteerUtil),
        this.internalPuppeteerUtil
      );
    }
    async evaluateHandle(e, ...t) {
      return await this.#e(!1, e, ...t);
    }
    async evaluate(e, ...t) {
      return await this.#e(!0, e, ...t);
    }
    async #e(e, t, ...n) {
      let r = Le(Je(t)?.toString() ?? fe.INTERNAL_URL),
        i,
        a = e ? `none` : `root`,
        o = e ? {} : { maxObjectDepth: 0, maxDomDepth: 0 };
      if (ze(t)) {
        let e = de.test(t) ? t : `${t}\n${r}\n`;
        i = this.realm.evaluate(e, !0, {
          resultOwnership: a,
          userActivation: !0,
          serializationOptions: o,
        });
      } else {
        let e = ie(t);
        ((e = de.test(e) ? e : `${e}\n${r}\n`),
          (i = this.realm.callFunction(e, !0, {
            arguments: n.some((e) => e instanceof m)
              ? await Promise.all(n.map((e) => this.serializeAsync(e)))
              : n.map((e) => this.serialize(e)),
            resultOwnership: a,
            userActivation: !0,
            serializationOptions: o,
          })));
      }
      let s = await i.catch(da);
      if (`type` in s && s.type === `exception`) throw la(s.exceptionDetails);
      return e ? zi.deserialize(s.result) : this.createHandle(s.result);
    }
    createHandle(e) {
      return (e.type === `node` || e.type === `window`) && this instanceof Y
        ? J.from(e, this)
        : Bi.from(e, this);
    }
    async serializeAsync(e) {
      return (e instanceof m && (e = await e.get(this)), this.serialize(e));
    }
    serialize(e) {
      if (e instanceof Bi || e instanceof J) {
        if (e.realm !== this) {
          if (!(e.realm instanceof Y) || !(this instanceof Y))
            throw Error(
              `Trying to evaluate JSHandle from different global types. Usually this means you're using a handle from a worker in a page or vice versa.`
            );
          if (e.realm.environment !== this.environment)
            throw Error(
              `Trying to evaluate JSHandle from different frames. Usually this means you're using a handle from a page on a different page.`
            );
        }
        if (e.disposed) throw Error(`JSHandle is disposed!`);
        return e.remoteValue();
      }
      return ra.serialize(e);
    }
    async destroyHandles(e) {
      if (this.disposed) return;
      let t = e.map(({ id: e }) => e).filter((e) => e !== void 0);
      t.length !== 0 &&
        (await this.realm.disown(t).catch((e) => {
          C(e);
        }));
    }
    async adoptHandle(e) {
      return await this.evaluateHandle((e) => e, e);
    }
    async transferHandle(e) {
      if (e.realm === this) return e;
      let t = this.adoptHandle(e);
      return (await e.dispose(), await t);
    }
    extension() {
      throw new D();
    }
    get origin() {
      throw new D();
    }
  },
  Y = class e extends ma {
    static from(t, n) {
      let r = new e(t, n);
      return (r.#t(), r);
    }
    #e;
    constructor(e, t) {
      (super(e, t.timeoutSettings), (this.#e = t));
    }
    #t() {
      (super.initialize(),
        this.realm.on(`updated`, () => {
          (this.environment.clearDocumentHandle(), (this.#n = !1));
        }));
    }
    #n = !1;
    get puppeteerUtil() {
      let e = Promise.resolve();
      return (
        (this.#n ||=
          ((e = Promise.all([
            Ji.from(this.environment, `__ariaQuerySelector`, d.queryOne, !!this.sandbox),
            Ji.from(
              this.environment,
              `__ariaQuerySelectorAll`,
              async (e, t) => {
                let n = d.queryAll(e, t);
                return await e.realm.evaluateHandle((...e) => e, ...(await i.collect(n)));
              },
              !!this.sandbox
            ),
          ])),
          !0)),
        e.then(() => super.puppeteerUtil)
      );
    }
    get sandbox() {
      return this.realm.sandbox;
    }
    get environment() {
      return this.#e;
    }
    async adoptBackendNode(e) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        let { object: n } = await this.#e.client.send(`DOM.resolveNode`, {
          backendNodeId: e,
          executionContextId: await this.realm.resolveExecutionContextId(),
        });
        return await fa(t, J.from({ handle: n.objectId, type: `node` }, this), !1).evaluateHandle(
          (e) => e
        );
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        pa(t);
      }
    }
  },
  ha = class e extends ma {
    static from(t, n) {
      let r = new e(t, n);
      return (r.initialize(), r);
    }
    #e;
    constructor(e, t) {
      (super(e, t.timeoutSettings), (this.#e = t));
    }
    initialize() {
      (super.initialize(),
        this.realm.on(`log`, (e) => {
          if (sa(e) && this.#e.listenerCount(be.Console)) {
            let t = oa(
              e,
              e.args.map((e) => this.createHandle(e)),
              void 0,
              this.realm.id
            );
            this.#e.emit(be.Console, t);
          }
        }));
    }
    get environment() {
      return this.#e;
    }
    async adoptBackendNode() {
      throw Error(`Cannot adopt DOM nodes into a worker.`);
    }
  },
  ga = class e extends Ye {
    static from(t, n) {
      return new e(t, n);
    }
    #e;
    #t;
    constructor(e, t) {
      (super(t.origin), (this.#e = e), (this.#t = ha.from(t, this)));
    }
    get frame() {
      return this.#e;
    }
    mainRealm() {
      return this.#t;
    }
    get client() {
      throw new D();
    }
  },
  _a = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  X = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  va = function (e, t, n) {
    return (
      typeof t == `symbol` && (t = t.description ? `[${t.description}]` : ``),
      Object.defineProperty(e, 'name', { configurable: !0, value: n ? `${n} ${t}` : t })
    );
  },
  ya = (() => {
    let e = oe,
      n = [],
      i,
      a,
      s,
      d,
      f,
      p,
      m,
      h,
      g,
      _;
    return class v extends e {
      static {
        let t =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((i = [l]),
          (a = [l]),
          (s = [l]),
          (d = [l]),
          (p = [l]),
          (h = [l]),
          (g = [l]),
          (_ = [l]),
          X(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `goto`,
              static: !1,
              private: !1,
              access: { has: (e) => `goto` in e, get: (e) => e.goto },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `setContent`,
              static: !1,
              private: !1,
              access: { has: (e) => `setContent` in e, get: (e) => e.setContent },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `waitForNavigation`,
              static: !1,
              private: !1,
              access: { has: (e) => `waitForNavigation` in e, get: (e) => e.waitForNavigation },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            (f = {
              value: va(function (e = {}) {
                let { waitUntil: t = `load` } = e,
                  { timeout: n = this.timeoutSettings.navigationTimeout() } = e;
                Array.isArray(t) || (t = [t]);
                let i = new Set();
                for (let e of t)
                  switch (e) {
                    case `load`:
                      i.add(`load`);
                      break;
                    case `domcontentloaded`:
                      i.add(`DOMContentLoaded`);
                      break;
                  }
                return i.size === 0
                  ? r(void 0)
                  : S([...i].map((e) => T(this.browsingContext, e))).pipe(
                      Me(() => {}),
                      u(),
                      y(
                        ye(n),
                        this.#i().pipe(
                          Me(() => {
                            throw Error(`Frame detached.`);
                          })
                        )
                      )
                    );
              }, `#waitForLoad$`),
            }),
            d,
            {
              kind: `method`,
              name: `#waitForLoad$`,
              static: !1,
              private: !0,
              access: { has: (e) => #o in e, get: (e) => e.#o },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            (m = {
              value: va(function (e = {}) {
                let { waitUntil: t = `load` } = e;
                Array.isArray(t) || (t = [t]);
                let n = 1 / 0;
                for (let e of t)
                  switch (e) {
                    case `networkidle0`:
                      n = Math.min(0, n);
                      break;
                    case `networkidle2`:
                      n = Math.min(2, n);
                      break;
                  }
                return n === 1 / 0
                  ? r(void 0)
                  : this.page().waitForNetworkIdle$({
                      idleTime: 500,
                      timeout: e.timeout ?? this.timeoutSettings.timeout(),
                      concurrency: n,
                    });
              }, `#waitForNetworkIdle$`),
            }),
            p,
            {
              kind: `method`,
              name: `#waitForNetworkIdle$`,
              static: !1,
              private: !0,
              access: { has: (e) => #s in e, get: (e) => e.#s },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            null,
            h,
            {
              kind: `method`,
              name: `setFiles`,
              static: !1,
              private: !1,
              access: { has: (e) => `setFiles` in e, get: (e) => e.setFiles },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            null,
            g,
            {
              kind: `method`,
              name: `frameElement`,
              static: !1,
              private: !1,
              access: { has: (e) => `frameElement` in e, get: (e) => e.frameElement },
              metadata: t,
            },
            null,
            n
          ),
          X(
            this,
            null,
            _,
            {
              kind: `method`,
              name: `locateNodes`,
              static: !1,
              private: !1,
              access: { has: (e) => `locateNodes` in e, get: (e) => e.locateNodes },
              metadata: t,
            },
            null,
            n
          ),
          t &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: t,
            }));
      }
      static from(e, t) {
        let n = new v(e, t);
        return (n.#n(), n);
      }
      #e = _a(this, n);
      browsingContext;
      #t = new WeakMap();
      realms;
      _id;
      client;
      accessibility;
      constructor(e, t) {
        (super(),
          (this.#e = e),
          (this.browsingContext = t),
          (this._id = t.id),
          (this.client = new ii(this)),
          (this.realms = {
            default: Y.from(this.browsingContext.defaultRealm, this),
            internal: Y.from(
              this.browsingContext.createWindowRealm(
                `__puppeteer_internal_${Math.ceil(Math.random() * 1e4)}`
              ),
              this
            ),
          }),
          (this.accessibility = new Ne(this.realms.default, this._id)));
      }
      #n() {
        for (let e of this.browsingContext.children) this.#r(e);
        (this.browsingContext.on(`browsingcontext`, (e) => {
          this.#r(e);
        }),
          this.browsingContext.on(`closed`, () => {
            for (let e of ii.sessions.values()) e.frame === this && e.onClose();
            this.page().trustedEmitter.emit(`framedetached`, this);
          }),
          this.browsingContext.on(`request`, (e) => {
            let t = ea.from(e, this, this.page().isNetworkInterceptionEnabled);
            (e.once(`success`, () => {
              this.page().trustedEmitter.emit(`requestfinished`, t);
            }),
              e.once(`error`, () => {
                this.page().trustedEmitter.emit(`requestfailed`, t);
              }),
              t.finalizeInterceptions());
          }),
          this.browsingContext.on(`navigation`, (e) => {
            e.once(`fragment`, () => {
              this.page().trustedEmitter.emit(`framenavigated`, this);
            });
          }),
          this.browsingContext.on(`load`, () => {
            this.page().trustedEmitter.emit(`load`, void 0);
          }),
          this.browsingContext.on(`DOMContentLoaded`, () => {
            ((this._hasStartedLoading = !0),
              this.page().trustedEmitter.emit(`domcontentloaded`, void 0),
              this.page().trustedEmitter.emit(`framenavigated`, this));
          }),
          this.browsingContext.on(`userprompt`, (e) => {
            this.page().trustedEmitter.emit(`dialog`, Gi.from(e));
          }),
          this.browsingContext.on(`log`, (e) => {
            if (this._id === e.source.context)
              if (sa(e)) {
                if (!this.page().listenerCount(`console`)) return;
                let t = e.args.map((e) => this.mainRealm().createHandle(e));
                this.page().trustedEmitter.emit(`console`, oa(e, t, this));
              } else if (ca(e)) {
                let t = Error(e.text ?? ``),
                  n = t.message.split(`
`).length,
                  r = t.stack
                    .split(
                      `
`
                    )
                    .splice(0, n),
                  i = [];
                if (e.stackTrace) {
                  for (let t of e.stackTrace.callFrames)
                    if (
                      (i.push(
                        `    at ${t.functionName || `<anonymous>`} (${t.url}:${t.lineNumber + 1}:${t.columnNumber + 1})`
                      ),
                      i.length >= Error.stackTraceLimit)
                    )
                      break;
                }
                ((t.stack = [...r, ...i].join(`
`)),
                  this.page().trustedEmitter.emit(`pageerror`, t));
              } else
                C(
                  `Unhandled LogEntry with type "${e.type}", text "${e.text}" and level "${e.level}"`
                );
          }),
          this.browsingContext.on(`worker`, (e) => {
            let t = ga.from(this, e);
            (e.on(`destroyed`, () => {
              this.page().trustedEmitter.emit(`workerdestroyed`, t);
            }),
              this.page().trustedEmitter.emit(`workercreated`, t));
          }));
      }
      #r(e) {
        let t = v.from(this, e);
        return (
          this.#t.set(e, t),
          this.page().trustedEmitter.emit(`frameattached`, t),
          e.on(`closed`, () => {
            this.#t.delete(e);
          }),
          t
        );
      }
      get timeoutSettings() {
        return this.page()._timeoutSettings;
      }
      mainRealm() {
        return this.realms.default;
      }
      isolatedRealm() {
        return this.realms.internal;
      }
      realm(e) {
        for (let t of Object.values(this.realms)) if (t.realm.id === e) return t;
      }
      page() {
        let e = this.#e;
        for (; e instanceof v; ) e = e.#e;
        return e;
      }
      url() {
        return this.browsingContext.url;
      }
      parentFrame() {
        return this.#e instanceof v ? this.#e : null;
      }
      childFrames() {
        return [...this.browsingContext.children].map((e) => this.#t.get(e));
      }
      #i() {
        return o(() =>
          this.detached
            ? r(this)
            : T(this.page().trustedEmitter, `framedetached`).pipe(se((e) => e === this))
        );
      }
      async goto(e, t = {}) {
        let [n] = await Promise.all([
          this.waitForNavigation(t),
          this.browsingContext.navigate(e, `interactive`).catch((e) => {
            if (
              !(nt(e) && e.message.includes(`net::ERR_HTTP_RESPONSE_CODE_FAILURE`)) &&
              !e.message.includes(`navigation canceled`) &&
              !e.message.includes(`Navigation was aborted by another navigation`)
            )
              throw e;
          }),
        ]).catch(ua(e, t.timeout ?? this.timeoutSettings.navigationTimeout()));
        return n;
      }
      async setContent(e, t = {}) {
        await Promise.all([this.setFrameContent(e), c(S([this.#o(t), this.#s(t)]))]);
      }
      async waitForNavigation(e = {}) {
        let { timeout: n = this.timeoutSettings.navigationTimeout(), signal: i } = e,
          a = this.childFrames().map((e) => e.#i());
        return await c(
          S([
            Ae(
              T(this.browsingContext, `navigation`),
              T(this.browsingContext, `historyUpdated`).pipe(Me(() => null))
            )
              .pipe(u())
              .pipe(
                x((t) =>
                  t === null
                    ? r(null)
                    : this.#o(e).pipe(
                        Qe(() => (a.length === 0 ? r(void 0) : S(a))),
                        y(T(t, `fragment`), T(t, `failed`), T(t, `aborted`)),
                        x(() => {
                          if (t.request) {
                            function e(n) {
                              return t === null
                                ? r(null)
                                : n.response || n.error
                                  ? r(t)
                                  : n.redirect
                                    ? e(n.redirect)
                                    : T(n, `success`)
                                        .pipe(y(T(n, `error`)), y(T(n, `redirect`)))
                                        .pipe(x(() => e(n)));
                            }
                            return e(t.request);
                          }
                          return r(t);
                        })
                      )
                )
              ),
            this.#s(e),
          ]).pipe(
            Me(([e]) => {
              if (!e) return null;
              let t = e.request;
              if (!t) return null;
              let n = t.lastRedirect ?? t;
              return $i.get(n).response();
            }),
            y(
              ye(n),
              t(i),
              this.#i().pipe(
                Me(() => {
                  throw new xe(`Frame detached.`);
                })
              )
            )
          )
        );
      }
      waitForDevicePrompt(e = {}) {
        let { timeout: t = this.timeoutSettings.timeout(), signal: n } = e;
        return this.browsingContext.waitForDevicePrompt(t, n);
      }
      get detached() {
        return this.browsingContext.closed;
      }
      #a = new Map();
      async exposeFunction(e, t) {
        if (this.#a.has(e))
          throw Error(
            `Failed to add page binding with name ${e}: globalThis['${e}'] already exists!`
          );
        let n = await Ji.from(this, e, t);
        this.#a.set(e, n);
      }
      async removeExposedFunction(e) {
        let t = this.#a.get(e);
        if (!t)
          throw Error(
            `Failed to remove page binding with name ${e}: window['${e}'] does not exists!`
          );
        (this.#a.delete(e), await t[Symbol.asyncDispose]());
      }
      async createCDPSession() {
        if (!this.page().browser().cdpSupported) throw new D();
        return await this.page().browser().cdpConnection._createSession({ targetId: this._id });
      }
      get #o() {
        return f.value;
      }
      get #s() {
        return m.value;
      }
      async setFiles(e, t) {
        await this.browsingContext.setFiles(e.remoteValue(), t);
      }
      async frameElement() {
        let e = this.parentFrame();
        if (!e) return null;
        let [t] = await e.browsingContext.locateNodes({
          type: `context`,
          value: { context: this._id },
        });
        return t ? J.from(t, e.mainRealm()) : null;
      }
      async locateNodes(e, t) {
        return await this.browsingContext.locateNodes(t, [e.remoteValue()]);
      }
      extensionRealms() {
        throw new D();
      }
    };
  })(),
  Z;
(function (e) {
  ((e.None = `none`), (e.Key = `key`), (e.Pointer = `pointer`), (e.Wheel = `wheel`));
})((Z ||= {}));
var Q;
(function (e) {
  ((e.Pause = `pause`),
    (e.KeyDown = `keyDown`),
    (e.KeyUp = `keyUp`),
    (e.PointerUp = `pointerUp`),
    (e.PointerDown = `pointerDown`),
    (e.PointerMove = `pointerMove`),
    (e.Scroll = `scroll`));
})((Q ||= {}));
var ba = (e) => {
    switch (e) {
      case `\r`:
      case `
`:
        e = `Enter`;
        break;
    }
    if ([...e].length === 1) return e;
    switch (e) {
      case `Cancel`:
        return ``;
      case `Help`:
        return ``;
      case `Backspace`:
        return ``;
      case `Tab`:
        return ``;
      case `Clear`:
        return ``;
      case `Enter`:
        return ``;
      case `Shift`:
      case `ShiftLeft`:
        return ``;
      case `Control`:
      case `ControlLeft`:
        return ``;
      case `Alt`:
      case `AltLeft`:
        return ``;
      case `Pause`:
        return ``;
      case `Escape`:
        return ``;
      case `PageUp`:
        return ``;
      case `PageDown`:
        return ``;
      case `End`:
        return ``;
      case `Home`:
        return ``;
      case `ArrowLeft`:
        return ``;
      case `ArrowUp`:
        return ``;
      case `ArrowRight`:
        return ``;
      case `ArrowDown`:
        return ``;
      case `Insert`:
        return ``;
      case `Delete`:
        return ``;
      case `NumpadEqual`:
        return ``;
      case `Numpad0`:
        return ``;
      case `Numpad1`:
        return ``;
      case `Numpad2`:
        return ``;
      case `Numpad3`:
        return ``;
      case `Numpad4`:
        return ``;
      case `Numpad5`:
        return ``;
      case `Numpad6`:
        return ``;
      case `Numpad7`:
        return ``;
      case `Numpad8`:
        return ``;
      case `Numpad9`:
        return ``;
      case `NumpadMultiply`:
        return ``;
      case `NumpadAdd`:
        return ``;
      case `NumpadSubtract`:
        return ``;
      case `NumpadDecimal`:
        return ``;
      case `NumpadDivide`:
        return ``;
      case `F1`:
        return ``;
      case `F2`:
        return ``;
      case `F3`:
        return ``;
      case `F4`:
        return ``;
      case `F5`:
        return ``;
      case `F6`:
        return ``;
      case `F7`:
        return ``;
      case `F8`:
        return ``;
      case `F9`:
        return ``;
      case `F10`:
        return ``;
      case `F11`:
        return ``;
      case `F12`:
        return ``;
      case `Meta`:
      case `MetaLeft`:
        return ``;
      case `ShiftRight`:
        return ``;
      case `ControlRight`:
        return ``;
      case `AltRight`:
        return ``;
      case `MetaRight`:
        return ``;
      case `Digit0`:
        return `0`;
      case `Digit1`:
        return `1`;
      case `Digit2`:
        return `2`;
      case `Digit3`:
        return `3`;
      case `Digit4`:
        return `4`;
      case `Digit5`:
        return `5`;
      case `Digit6`:
        return `6`;
      case `Digit7`:
        return `7`;
      case `Digit8`:
        return `8`;
      case `Digit9`:
        return `9`;
      case `KeyA`:
        return `a`;
      case `KeyB`:
        return `b`;
      case `KeyC`:
        return `c`;
      case `KeyD`:
        return `d`;
      case `KeyE`:
        return `e`;
      case `KeyF`:
        return `f`;
      case `KeyG`:
        return `g`;
      case `KeyH`:
        return `h`;
      case `KeyI`:
        return `i`;
      case `KeyJ`:
        return `j`;
      case `KeyK`:
        return `k`;
      case `KeyL`:
        return `l`;
      case `KeyM`:
        return `m`;
      case `KeyN`:
        return `n`;
      case `KeyO`:
        return `o`;
      case `KeyP`:
        return `p`;
      case `KeyQ`:
        return `q`;
      case `KeyR`:
        return `r`;
      case `KeyS`:
        return `s`;
      case `KeyT`:
        return `t`;
      case `KeyU`:
        return `u`;
      case `KeyV`:
        return `v`;
      case `KeyW`:
        return `w`;
      case `KeyX`:
        return `x`;
      case `KeyY`:
        return `y`;
      case `KeyZ`:
        return `z`;
      case `Semicolon`:
        return `;`;
      case `Equal`:
        return `=`;
      case `Comma`:
        return `,`;
      case `Minus`:
        return `-`;
      case `Period`:
        return `.`;
      case `Slash`:
        return `/`;
      case `Backquote`:
        return '`';
      case `BracketLeft`:
        return `[`;
      case `Backslash`:
        return `\\`;
      case `BracketRight`:
        return `]`;
      case `Quote`:
        return `"`;
      default:
        throw Error(`Unknown key: "${e}"`);
    }
  },
  xa = class extends we {
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    async down(e, t) {
      await this.#e
        .mainFrame()
        .browsingContext.performActions([
          { type: Z.Key, id: `__puppeteer_keyboard`, actions: [{ type: Q.KeyDown, value: ba(e) }] },
        ]);
    }
    async up(e) {
      await this.#e
        .mainFrame()
        .browsingContext.performActions([
          { type: Z.Key, id: `__puppeteer_keyboard`, actions: [{ type: Q.KeyUp, value: ba(e) }] },
        ]);
    }
    async press(e, t = {}) {
      let { delay: n = 0 } = t,
        r = [{ type: Q.KeyDown, value: ba(e) }];
      (n > 0 && r.push({ type: Q.Pause, duration: n }),
        r.push({ type: Q.KeyUp, value: ba(e) }),
        await this.#e
          .mainFrame()
          .browsingContext.performActions([
            { type: Z.Key, id: `__puppeteer_keyboard`, actions: r },
          ]));
    }
    async type(e, t = {}) {
      let { delay: n = 0 } = t,
        r = [...e].map(ba),
        i = [];
      if (n <= 0)
        for (let e of r) i.push({ type: Q.KeyDown, value: e }, { type: Q.KeyUp, value: e });
      else
        for (let e of r)
          i.push(
            { type: Q.KeyDown, value: e },
            { type: Q.Pause, duration: n },
            { type: Q.KeyUp, value: e }
          );
      await this.#e
        .mainFrame()
        .browsingContext.performActions([{ type: Z.Key, id: `__puppeteer_keyboard`, actions: i }]);
    }
    async sendCharacter(e) {
      if ([...e].length > 1) throw Error(`Cannot send more than 1 character.`);
      await (await this.#e.focusedFrame()).isolatedRealm().evaluate(async (e) => {
        document.execCommand(`insertText`, !1, e);
      }, e);
    }
  },
  Sa = (e) => {
    switch (e) {
      case O.Left:
        return 0;
      case O.Middle:
        return 1;
      case O.Right:
        return 2;
      case O.Back:
        return 3;
      case O.Forward:
        return 4;
    }
  },
  Ca = class extends pe {
    #e;
    #t = { x: 0, y: 0 };
    constructor(e) {
      (super(), (this.#e = e));
    }
    async reset() {
      ((this.#t = { x: 0, y: 0 }), await this.#e.mainFrame().browsingContext.releaseActions());
    }
    async move(e, t, n = {}) {
      let r = this.#t,
        i = { x: Math.round(e), y: Math.round(t) },
        a = [],
        o = n.steps ?? 0;
      for (let e = 0; e < o; ++e)
        a.push({
          type: Q.PointerMove,
          x: r.x + (i.x - r.x) * (e / o),
          y: r.y + (i.y - r.y) * (e / o),
          origin: n.origin,
        });
      (a.push({ type: Q.PointerMove, ...i, origin: n.origin }),
        (this.#t = i),
        await this.#e
          .mainFrame()
          .browsingContext.performActions([
            { type: Z.Pointer, id: `__puppeteer_mouse`, actions: a },
          ]));
    }
    async down(e = {}) {
      await this.#e.mainFrame().browsingContext.performActions([
        {
          type: Z.Pointer,
          id: `__puppeteer_mouse`,
          actions: [{ type: Q.PointerDown, button: Sa(e.button ?? O.Left) }],
        },
      ]);
    }
    async up(e = {}) {
      await this.#e.mainFrame().browsingContext.performActions([
        {
          type: Z.Pointer,
          id: `__puppeteer_mouse`,
          actions: [{ type: Q.PointerUp, button: Sa(e.button ?? O.Left) }],
        },
      ]);
    }
    async click(e, t, n = {}) {
      let r = [{ type: Q.PointerMove, x: Math.round(e), y: Math.round(t), origin: n.origin }],
        i = { type: Q.PointerDown, button: Sa(n.button ?? O.Left) },
        a = { type: Q.PointerUp, button: i.button };
      for (let e = 1; e < (n.count ?? 1); ++e) r.push(i, a);
      (r.push(i),
        n.delay && r.push({ type: Q.Pause, duration: n.delay }),
        r.push(a),
        await this.#e
          .mainFrame()
          .browsingContext.performActions([
            { type: Z.Pointer, id: `__puppeteer_mouse`, actions: r },
          ]));
    }
    async wheel(e = {}) {
      await this.#e.mainFrame().browsingContext.performActions([
        {
          type: Z.Wheel,
          id: `__puppeteer_wheel`,
          actions: [
            {
              type: Q.Scroll,
              ...(this.#t ?? { x: 0, y: 0 }),
              deltaX: e.deltaX ?? 0,
              deltaY: e.deltaY ?? 0,
            },
          ],
        },
      ]);
    }
    drag() {
      throw new D();
    }
    dragOver() {
      throw new D();
    }
    dragEnter() {
      throw new D();
    }
    drop() {
      throw new D();
    }
    dragAndDrop() {
      throw new D();
    }
  },
  wa = class {
    #e = !1;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o;
    constructor(e, t, n, r, i, a) {
      ((this.#i = e),
        (this.#a = t),
        (this.#t = Math.round(r)),
        (this.#n = Math.round(i)),
        (this.#o = a),
        (this.#r = `__puppeteer_finger_${n}`));
    }
    async start(e = {}) {
      if (this.#e) throw new Ve(`Touch has already started`);
      (await this.#i.mainFrame().browsingContext.performActions([
        {
          type: Z.Pointer,
          id: this.#r,
          parameters: { pointerType: `touch` },
          actions: [
            { type: Q.PointerMove, x: this.#t, y: this.#n, origin: e.origin },
            { ...this.#o, type: Q.PointerDown, button: 0 },
          ],
        },
      ]),
        (this.#e = !0));
    }
    move(e, t) {
      let n = Math.round(e),
        r = Math.round(t);
      return this.#i.mainFrame().browsingContext.performActions([
        {
          type: Z.Pointer,
          id: this.#r,
          parameters: { pointerType: `touch` },
          actions: [{ ...this.#o, type: Q.PointerMove, x: n, y: r }],
        },
      ]);
    }
    async end() {
      (await this.#i.mainFrame().browsingContext.performActions([
        {
          type: Z.Pointer,
          id: this.#r,
          parameters: { pointerType: `touch` },
          actions: [{ type: Q.PointerUp, button: 0 }],
        },
      ]),
        this.#a.removeHandle(this));
    }
  },
  Ta = class extends et {
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    async touchStart(e, t, n = {}) {
      let r = this.idGenerator(),
        i = new wa(this.#e, this, r, e, t, { width: 0.5 * 2, height: 0.5 * 2, pressure: 0.5 });
      return (await i.start(n), this.touches.push(i), i);
    }
  },
  Ea = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Da = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Oa = function (e, t, n) {
    if (t != null) {
      if (typeof t != `object` && typeof t != `function`) throw TypeError(`Object expected.`);
      var r, i;
      if (n) {
        if (!Symbol.asyncDispose) throw TypeError(`Symbol.asyncDispose is not defined.`);
        r = t[Symbol.asyncDispose];
      }
      if (r === void 0) {
        if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
        ((r = t[Symbol.dispose]), n && (i = r));
      }
      if (typeof r != `function`) throw TypeError(`Object not disposable.`);
      (i &&
        (r = function () {
          try {
            i.call(this);
          } catch (e) {
            return Promise.reject(e);
          }
        }),
        e.stack.push({ value: t, dispose: r, async: n }));
    } else n && e.stack.push({ async: !0 });
    return t;
  },
  ka = (function (e) {
    return function (t) {
      function n(n) {
        ((t.error = t.hasError ? new e(n, t.error, `An error was suppressed during disposal.`) : n),
          (t.hasError = !0));
      }
      var r,
        i = 0;
      function a() {
        for (; (r = t.stack.pop()); )
          try {
            if (!r.async && i === 1) return ((i = 0), t.stack.push(r), Promise.resolve().then(a));
            if (r.dispose) {
              var e = r.dispose.call(r.value);
              if (r.async)
                return (
                  (i |= 2),
                  Promise.resolve(e).then(a, function (e) {
                    return (n(e), a());
                  })
                );
            } else i |= 1;
          } catch (e) {
            n(e);
          }
        if (i === 1) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
        if (t.hasError) throw t.error;
      }
      return a();
    };
  })(
    typeof SuppressedError == `function`
      ? SuppressedError
      : function (e, t, n) {
          var r = Error(n);
          return ((r.name = `SuppressedError`), (r.error = e), (r.suppressed = t), r);
        }
  ),
  Aa = (() => {
    let e = Ee,
      t,
      r = [],
      i = [];
    return class a extends e {
      static {
        let a =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((t = [n()]),
          Ea(
            this,
            null,
            t,
            {
              kind: `accessor`,
              name: `trustedEmitter`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `trustedEmitter` in e,
                get: (e) => e.trustedEmitter,
                set: (e, t) => {
                  e.trustedEmitter = t;
                },
              },
              metadata: a,
            },
            r,
            i
          ),
          a &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: a,
            }));
      }
      static from(e, t) {
        let n = new a(e, t);
        return (n.#c(), n);
      }
      #e = Da(this, r, new h());
      get trustedEmitter() {
        return this.#e;
      }
      set trustedEmitter(e) {
        this.#e = e;
      }
      #t = Da(this, i);
      #n;
      #r = null;
      #i = new Set();
      keyboard;
      mouse;
      touchscreen;
      tracing;
      get webmcp() {
        throw new D();
      }
      coverage;
      #a;
      #o;
      #s = new Set();
      _client() {
        return this.#n.client;
      }
      constructor(e, t) {
        (super(),
          (this.#t = e),
          (this.#n = ya.from(this, t)),
          (this.#a = new Oe(this.#n.client)),
          (this.tracing = new qe(this.#n.client)),
          (this.coverage = new he(this.#n.client)),
          (this.keyboard = new xa(this)),
          (this.mouse = new Ca(this)),
          (this.touchscreen = new Ta(this)));
      }
      #c() {
        (this.#n.browsingContext.on(`closed`, () => {
          (this.trustedEmitter.emit(`close`, void 0), this.trustedEmitter.removeAllListeners());
        }),
          this.trustedEmitter.on(`workercreated`, (e) => {
            this.#i.add(e);
          }),
          this.trustedEmitter.on(`workerdestroyed`, (e) => {
            this.#i.delete(e);
          }));
      }
      async setUserAgent(e, t) {
        let n, r, i;
        (typeof e == `string`
          ? ((n = e), (r = t))
          : ((n = e.userAgent ?? null),
            (r = e.userAgentMetadata),
            (i = e.platform === `` ? void 0 : e.platform)),
          n === `` && (n = null),
          await this.#n.browsingContext.setUserAgent(n),
          i && i !== `` && ((r ??= {}), (r.platform = i)),
          await this.#n.browsingContext.setClientHintsOverride(r ?? null));
      }
      async setBypassCSP(e) {
        await this._client().send(`Page.setBypassCSP`, { enabled: e });
      }
      async queryObjects(e) {
        (k(!e.disposed, `Prototype JSHandle is disposed!`),
          k(e.id, `Prototype JSHandle must not be referencing primitive value`));
        let t = await this.#n.client.send(`Runtime.queryObjects`, { prototypeObjectId: e.id });
        return this.#n.mainRealm().createHandle({ type: `array`, handle: t.objects.objectId });
      }
      browser() {
        return this.browserContext().browser();
      }
      browserContext() {
        return this.#t;
      }
      mainFrame() {
        return this.#n;
      }
      async triggerExtensionAction(e) {
        throw new D();
      }
      async emulateFocusedPage(e) {
        return await this.#a.emulateFocus(e);
      }
      resize(e) {
        throw new D();
      }
      async windowId() {
        return this.#n.browsingContext.windowId;
      }
      openDevTools() {
        throw new D();
      }
      hasDevTools() {
        throw new D();
      }
      async focusedFrame() {
        let e = { stack: [], error: void 0, hasError: !1 };
        try {
          let t = Oa(
            e,
            await this.mainFrame()
              .isolatedRealm()
              .evaluateHandle(() => {
                let e = window;
                for (
                  ;
                  (e.document.activeElement instanceof e.HTMLIFrameElement ||
                    e.document.activeElement instanceof e.HTMLFrameElement) &&
                  e.document.activeElement.contentWindow !== null;
                )
                  e = e.document.activeElement.contentWindow;
                return e;
              }),
            !1
          ).remoteValue();
          k(t.type === `window`);
          let n = this.frames().find((e) => e._id === t.value.context);
          return (k(n), n);
        } catch (t) {
          ((e.error = t), (e.hasError = !0));
        } finally {
          ka(e);
        }
      }
      frames() {
        let e = [this.#n];
        for (let t of e) e.push(...t.childFrames());
        return e;
      }
      isClosed() {
        return this.#n.detached;
      }
      async close(e) {
        let t = { stack: [], error: void 0, hasError: !1 };
        try {
          Oa(t, await this.#t.waitForScreenshotOperations(), !1);
          try {
            await this.#n.browsingContext.close(e?.runBeforeUnload);
          } catch {
            return;
          }
        } catch (e) {
          ((t.error = e), (t.hasError = !0));
        } finally {
          ka(t);
        }
      }
      async reload(e = {}) {
        let [t] = await Promise.all([
          this.#n.waitForNavigation(e),
          this.#n.browsingContext.reload({ ignoreCache: e.ignoreCache ? !0 : void 0 }),
        ]).catch(ua(this.url(), e.timeout ?? this._timeoutSettings.navigationTimeout()));
        return t;
      }
      setDefaultNavigationTimeout(e) {
        this._timeoutSettings.setDefaultNavigationTimeout(e);
      }
      setDefaultTimeout(e) {
        this._timeoutSettings.setDefaultTimeout(e);
      }
      getDefaultTimeout() {
        return this._timeoutSettings.timeout();
      }
      getDefaultNavigationTimeout() {
        return this._timeoutSettings.navigationTimeout();
      }
      isJavaScriptEnabled() {
        return this.#n.browsingContext.isJavaScriptEnabled();
      }
      async setGeolocation(e) {
        let { longitude: t, latitude: n, accuracy: r = 0 } = e;
        if (t < -180 || t > 180)
          throw Error(`Invalid longitude "${t}": precondition -180 <= LONGITUDE <= 180 failed.`);
        if (n < -90 || n > 90)
          throw Error(`Invalid latitude "${n}": precondition -90 <= LATITUDE <= 90 failed.`);
        if (r < 0) throw Error(`Invalid accuracy "${r}": precondition 0 <= ACCURACY failed.`);
        return await this.#n.browsingContext.setGeolocationOverride({
          coordinates: { latitude: e.latitude, longitude: e.longitude, accuracy: e.accuracy },
        });
      }
      async setJavaScriptEnabled(e) {
        return await this.#n.browsingContext.setJavaScriptEnabled(e);
      }
      async emulateMediaType(e) {
        return await this.#a.emulateMediaType(e);
      }
      async emulateCPUThrottling(e) {
        return await this.#a.emulateCPUThrottling(e);
      }
      async emulateMediaFeatures(e) {
        return await this.#a.emulateMediaFeatures(e);
      }
      async emulateTimezone(e) {
        return await this.#n.browsingContext.setTimezoneOverride(e);
      }
      async emulateIdleState(e) {
        return await this.#a.emulateIdleState(e);
      }
      async emulateVisionDeficiency(e) {
        return await this.#a.emulateVisionDeficiency(e);
      }
      async setViewport(e) {
        let t = !1;
        if (this.browser().cdpSupported) t = await this.#a.emulateViewport(e);
        else {
          let n = e?.width && e?.height ? { width: e.width, height: e.height } : null,
            r = e?.deviceScaleFactor ? e.deviceScaleFactor : null,
            i = e
              ? e.isLandscape
                ? { natural: `landscape`, type: `landscape-primary` }
                : { natural: `portrait`, type: `portrait-primary` }
              : null,
            a = [
              this.#n.browsingContext.setViewport({ viewport: n, devicePixelRatio: r }),
              this.#n.browsingContext.setScreenOrientationOverride(i),
            ];
          if ((this.#r?.hasTouch ?? !1) !== (e?.hasTouch ?? !1)) {
            t = !0;
            let n = e?.hasTouch ? 1 : null;
            a.push(
              this.#n.browsingContext.setTouchOverride(n).catch((e) => {
                if (
                  !(
                    e instanceof Xe &&
                    (e.message.includes(`unknown command`) ||
                      e.message.includes(`unsupported operation`))
                  )
                )
                  throw e;
              })
            );
          }
          await Promise.all(a);
        }
        ((this.#r = e), t && (await this.reload()));
      }
      viewport() {
        return this.#r;
      }
      async pdf(e = {}) {
        let { timeout: t = this._timeoutSettings.timeout(), path: n = void 0 } = e,
          {
            printBackground: r,
            margin: i,
            landscape: a,
            width: o,
            height: s,
            pageRanges: l,
            scale: u,
            preferCSSPageSize: d,
          } = Ke(e, `cm`),
          f = l ? l.split(`, `) : [];
        await c(
          te(
            this.mainFrame()
              .isolatedRealm()
              .evaluate(() => document.fonts.ready)
          ).pipe(y(ye(t)))
        );
        let p = me(
          await c(
            te(
              this.#n.browsingContext.print({
                background: r,
                margin: i,
                orientation: a ? `landscape` : `portrait`,
                page: { width: o, height: s },
                pageRanges: f,
                scale: u,
                shrinkToFit: !d,
              })
            ).pipe(y(ye(t)))
          ),
          !0
        );
        return (await this._maybeWriteTypedArrayToFile(n, p), p);
      }
      async createPDFStream(e) {
        let t = await this.pdf(e);
        return new ReadableStream({
          start(e) {
            (e.enqueue(t), e.close());
          },
        });
      }
      async _screenshot(e) {
        let { clip: t, type: n, captureBeyondViewport: r, quality: i } = e;
        if (e.omitBackground !== void 0 && e.omitBackground)
          throw new D(`BiDi does not support 'omitBackground'.`);
        if (e.optimizeForSpeed !== void 0 && e.optimizeForSpeed)
          throw new D(`BiDi does not support 'optimizeForSpeed'.`);
        if (e.fromSurface !== void 0 && !e.fromSurface)
          throw new D(`BiDi does not support 'fromSurface'.`);
        if (t !== void 0 && t.scale !== void 0 && t.scale !== 1)
          throw new D(`BiDi does not support 'scale' in 'clip'.`);
        let a;
        if (t)
          if (r) a = t;
          else {
            let [e, n] = await this.evaluate(() => {
              if (!window.visualViewport) throw Error(`window.visualViewport is not supported.`);
              return [window.visualViewport.pageLeft, window.visualViewport.pageTop];
            });
            a = { ...t, x: t.x - e, y: t.y - n };
          }
        return await this.#n.browsingContext.captureScreenshot({
          origin: r ? `document` : `viewport`,
          format: { type: `image/${n}`, ...(i === void 0 ? {} : { quality: i / 100 }) },
          ...(a ? { clip: { type: `box`, ...a } } : {}),
        });
      }
      async createCDPSession() {
        return await this.#n.createCDPSession();
      }
      async bringToFront() {
        await this.#n.browsingContext.activate();
      }
      async evaluateOnNewDocument(e, ...t) {
        let n = ja(e, ...t);
        return { identifier: await this.#n.browsingContext.addPreloadScript(n) };
      }
      async removeScriptToEvaluateOnNewDocument(e) {
        await this.#n.browsingContext.removePreloadScript(e);
      }
      async exposeFunction(e, t) {
        return await this.mainFrame().exposeFunction(e, `default` in t ? t.default : t);
      }
      isDragInterceptionEnabled() {
        return !1;
      }
      async setCacheEnabled(e) {
        if (!this.#t.browser().cdpSupported) {
          await this.#n.browsingContext.setCacheBehavior(e ? `default` : `bypass`);
          return;
        }
        await this._client().send(`Network.setCacheDisabled`, { cacheDisabled: !e });
      }
      async cookies(...e) {
        let t = (e.length ? e : [this.url()]).map((e) => new URL(e));
        return (await this.#n.browsingContext.getCookies())
          .map((e) => Fa(e))
          .filter((e) => t.some((t) => Pa(e, t)));
      }
      isServiceWorkerBypassed() {
        throw new D();
      }
      target() {
        let e = this.browserContext().getTargetForPage(this);
        if (!e) throw Error(`Target not found for page`);
        return e;
      }
      async waitForFileChooser(e = {}) {
        let { timeout: t = this._timeoutSettings.timeout() } = e,
          n = f.create({
            message: `Waiting for \`FileChooser\` failed: ${t}ms exceeded`,
            timeout: t,
          });
        (this.#s.add(n),
          e.signal &&
            e.signal.addEventListener(
              `abort`,
              () => {
                n.reject(e.signal?.reason);
              },
              { once: !0 }
            ),
          this.#n.browsingContext.once(`filedialogopened`, (e) => {
            if (!e.element) return;
            let t = new Ge(
              J.from(
                { sharedId: e.element.sharedId, handle: e.element.handle, type: `node` },
                this.#n.mainRealm()
              ),
              e.multiple
            );
            for (let e of this.#s) (e.resolve(t), this.#s.delete(e));
          }));
        try {
          return await n.valueOrThrow();
        } catch (e) {
          throw (this.#s.delete(n), e);
        }
      }
      workers() {
        return [...this.#i];
      }
      get isNetworkInterceptionEnabled() {
        return !!this.#l || !!this.#u;
      }
      #l;
      async setRequestInterception(e) {
        this.#l = await this.#d([`beforeRequestSent`], this.#l, e);
      }
      async setExtraHTTPHeaders(e) {
        await this.#n.browsingContext.setExtraHTTPHeaders(e);
      }
      _credentials = null;
      #u;
      async authenticate(e) {
        ((this.#u = await this.#d([`authRequired`], this.#u, !!e)), (this._credentials = e));
      }
      async #d(e, t, n) {
        if (n && !t) return await this.#n.browsingContext.addIntercept({ phases: e });
        if (!n && t) {
          await this.#n.browsingContext.userContext.browser.removeIntercept(t);
          return;
        }
        return t;
      }
      setDragInterception() {
        throw new D();
      }
      setBypassServiceWorker() {
        throw new D();
      }
      async setOfflineMode(e) {
        return this.#t.browser().cdpSupported
          ? ((this.#o ||= { offline: !1, upload: -1, download: -1, latency: 0 }),
            (this.#o.offline = e),
            await this.#f())
          : await this.#n.browsingContext.setOfflineMode(e);
      }
      async emulateNetworkConditions(e) {
        if (!this.#t.browser().cdpSupported) {
          if (
            !e?.offline &&
            ((e?.upload ?? -1) >= 0 || (e?.download ?? -1) >= 0 || (e?.latency ?? 0) > 0)
          )
            throw new D();
          return await this.#n.browsingContext.setOfflineMode(e?.offline ?? !1);
        }
        return (
          (this.#o ||= { offline: e?.offline ?? !1, upload: -1, download: -1, latency: 0 }),
          (this.#o.upload = e ? e.upload : -1),
          (this.#o.download = e ? e.download : -1),
          (this.#o.latency = e ? e.latency : 0),
          (this.#o.offline = e?.offline ?? !1),
          await this.#f()
        );
      }
      async #f() {
        this.#o &&
          (await this._client().send(`Network.emulateNetworkConditions`, {
            offline: this.#o.offline,
            latency: this.#o.latency,
            uploadThroughput: this.#o.upload,
            downloadThroughput: this.#o.download,
          }));
      }
      async setCookie(...e) {
        let t = this.url(),
          n = t.startsWith(`http`);
        for (let r of e) {
          let e = r.url || ``;
          (!e && n && (e = t),
            k(e !== `about:blank`, `Blank page can not have cookie "${r.name}"`),
            k(
              !String.prototype.startsWith.call(e || ``, `data:`),
              `Data URL page can not have cookie "${r.name}"`
            ),
            k(
              r.partitionKey === void 0 || typeof r.partitionKey == `string`,
              `BiDi only allows domain partition keys`
            ));
          let i = URL.canParse(e) ? new URL(e) : void 0,
            a = r.domain ?? i?.hostname;
          k(a !== void 0, `At least one of the url and domain needs to be specified`);
          let o = {
            domain: a,
            name: r.name,
            value: { type: `string`, value: r.value },
            ...(r.path === void 0 ? {} : { path: r.path }),
            ...(r.httpOnly === void 0 ? {} : { httpOnly: r.httpOnly }),
            ...(r.secure === void 0 ? {} : { secure: r.secure }),
            ...(r.sameSite === void 0 ? {} : { sameSite: Ba(r.sameSite) }),
            expiry: Va(r.expires),
            ...Ra(r, `sourceScheme`, `priority`, `url`),
          };
          r.partitionKey === void 0
            ? await this.#n.browsingContext.setCookie(o)
            : await this.browserContext().userContext.setCookie(o, r.partitionKey);
        }
      }
      async deleteCookie(...e) {
        await Promise.all(
          e.map(async (e) => {
            let t = e.url ?? this.url(),
              n = URL.canParse(t) ? new URL(t) : void 0,
              r = e.domain ?? n?.hostname;
            k(r !== void 0, `At least one of the url and domain needs to be specified`);
            let i = { domain: r, name: e.name, ...(e.path === void 0 ? {} : { path: e.path }) };
            await this.#n.browsingContext.deleteCookie(i);
          })
        );
      }
      async removeExposedFunction(e) {
        await this.#n.removeExposedFunction(e);
      }
      metrics() {
        throw new D();
      }
      async captureHeapSnapshot(e) {
        throw new D();
      }
      async goBack(e = {}) {
        return await this.#p(-1, e);
      }
      async goForward(e = {}) {
        return await this.#p(1, e);
      }
      async #p(e, t) {
        let n = new AbortController();
        try {
          let [r] = await Promise.all([
            this.waitForNavigation({ ...t, signal: n.signal }),
            this.#n.browsingContext.traverseHistory(e),
          ]);
          return r;
        } catch (e) {
          throw (n.abort(), e);
        }
      }
      async waitForDevicePrompt(e = {}) {
        return await this.mainFrame().waitForDevicePrompt(e);
      }
      get bluetooth() {
        return this.mainFrame().browsingContext.bluetooth;
      }
      extensionRealms() {
        throw new D();
      }
    };
  })();
function ja(e, ...t) {
  return `() => {${re(e, ...t)}}`;
}
function Ma(e, t) {
  let n = e.domain.toLowerCase(),
    r = t.hostname.toLowerCase();
  return n === r ? !0 : n.startsWith(`.`) && r.endsWith(n);
}
function Na(e, t) {
  let n = t.pathname,
    r = e.path;
  return !!(n === r || (n.startsWith(r) && (r.endsWith(`/`) || n[r.length] === `/`)));
}
function Pa(e, t) {
  let n = new URL(t);
  return (k(e !== void 0), Ma(e, n) ? Na(e, n) : !1);
}
function Fa(e, t = !1) {
  let n = e[Ia + `partitionKey`];
  function r() {
    return typeof n == `string`
      ? { partitionKey: n }
      : typeof n == `object` && n
        ? t
          ? {
              partitionKey: {
                sourceOrigin: n.topLevelSite,
                hasCrossSiteAncestor: n.hasCrossSiteAncestor ?? !1,
              },
            }
          : { partitionKey: n.topLevelSite }
        : {};
  }
  return {
    name: e.name,
    value: e.value.value,
    domain: e.domain,
    path: e.path,
    size: e.size,
    httpOnly: e.httpOnly,
    secure: e.secure,
    sameSite: za(e.sameSite),
    expires: e.expiry ?? -1,
    session: e.expiry === void 0 || e.expiry <= 0,
    ...La(e, `sourceScheme`, `partitionKeyOpaque`, `priority`),
    ...r(),
  };
}
var Ia = `goog:`;
function La(e, ...t) {
  let n = {};
  for (let r of t) e[Ia + r] !== void 0 && (n[r] = e[Ia + r]);
  return n;
}
function Ra(e, ...t) {
  let n = {};
  for (let r of t) e[r] !== void 0 && (n[Ia + r] = e[r]);
  return n;
}
function za(e) {
  switch (e) {
    case `strict`:
      return `Strict`;
    case `lax`:
      return `Lax`;
    case `none`:
      return `None`;
    default:
      return `Default`;
  }
}
function Ba(e) {
  switch (e) {
    case `Strict`:
      return `strict`;
    case `Lax`:
      return `lax`;
    case `None`:
      return `none`;
    default:
      return `default`;
  }
}
function Va(e) {
  return [void 0, -1].includes(e) ? void 0 : e;
}
function Ha(e) {
  if (e === void 0 || typeof e == `string`) return e;
  if (e.hasCrossSiteAncestor)
    throw new D('WebDriver BiDi does not support `hasCrossSiteAncestor` yet.');
  return e.sourceOrigin;
}
var Ua = class extends Se {
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    asPage() {
      throw new D();
    }
    url() {
      return ``;
    }
    createCDPSession() {
      throw new D();
    }
    type() {
      return Be.BROWSER;
    }
    browser() {
      return this.#e;
    }
    browserContext() {
      return this.#e.defaultBrowserContext();
    }
    opener() {
      throw new D();
    }
  },
  Wa = class extends Se {
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    async page() {
      return this.#e;
    }
    async asPage() {
      return await this.page();
    }
    url() {
      return this.#e.url();
    }
    createCDPSession() {
      return this.#e.createCDPSession();
    }
    type() {
      return Be.PAGE;
    }
    browser() {
      return this.browserContext().browser();
    }
    browserContext() {
      return this.#e.browserContext();
    }
    opener() {
      throw new D();
    }
  },
  Ga = class extends Se {
    #e;
    #t;
    constructor(e) {
      (super(), (this.#e = e));
    }
    async page() {
      return (
        this.#t === void 0 && (this.#t = Aa.from(this.browserContext(), this.#e.browsingContext)),
        this.#t
      );
    }
    async asPage() {
      return await this.page();
    }
    url() {
      return this.#e.url();
    }
    createCDPSession() {
      return this.#e.createCDPSession();
    }
    type() {
      return Be.PAGE;
    }
    browser() {
      return this.browserContext().browser();
    }
    browserContext() {
      return this.#e.page().browserContext();
    }
    opener() {
      throw new D();
    }
  },
  Ka = class extends Se {
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    async page() {
      throw new D();
    }
    async asPage() {
      throw new D();
    }
    url() {
      return this.#e.url();
    }
    createCDPSession() {
      throw new D();
    }
    type() {
      return Be.OTHER;
    }
    browser() {
      return this.browserContext().browser();
    }
    browserContext() {
      return this.#e.frame.page().browserContext();
    }
    opener() {
      throw new D();
    }
  },
  qa = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  Ja = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Ya = function (e, t, n) {
    if (t != null) {
      if (typeof t != `object` && typeof t != `function`) throw TypeError(`Object expected.`);
      var r, i;
      if (n) {
        if (!Symbol.asyncDispose) throw TypeError(`Symbol.asyncDispose is not defined.`);
        r = t[Symbol.asyncDispose];
      }
      if (r === void 0) {
        if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
        ((r = t[Symbol.dispose]), n && (i = r));
      }
      if (typeof r != `function`) throw TypeError(`Object not disposable.`);
      (i &&
        (r = function () {
          try {
            i.call(this);
          } catch (e) {
            return Promise.reject(e);
          }
        }),
        e.stack.push({ value: t, dispose: r, async: n }));
    } else n && e.stack.push({ async: !0 });
    return t;
  },
  Xa = (function (e) {
    return function (t) {
      function n(n) {
        ((t.error = t.hasError ? new e(n, t.error, `An error was suppressed during disposal.`) : n),
          (t.hasError = !0));
      }
      var r,
        i = 0;
      function a() {
        for (; (r = t.stack.pop()); )
          try {
            if (!r.async && i === 1) return ((i = 0), t.stack.push(r), Promise.resolve().then(a));
            if (r.dispose) {
              var e = r.dispose.call(r.value);
              if (r.async)
                return (
                  (i |= 2),
                  Promise.resolve(e).then(a, function (e) {
                    return (n(e), a());
                  })
                );
            } else i |= 1;
          } catch (e) {
            n(e);
          }
        if (i === 1) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
        if (t.hasError) throw t.error;
      }
      return a();
    };
  })(
    typeof SuppressedError == `function`
      ? SuppressedError
      : function (e, t, n) {
          var r = Error(n);
          return ((r.name = `SuppressedError`), (r.error = e), (r.suppressed = t), r);
        }
  ),
  Za = (() => {
    let e = ue,
      t,
      r = [],
      i = [];
    return class a extends e {
      static {
        let a =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((t = [n()]),
          qa(
            this,
            null,
            t,
            {
              kind: `accessor`,
              name: `trustedEmitter`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `trustedEmitter` in e,
                get: (e) => e.trustedEmitter,
                set: (e, t) => {
                  e.trustedEmitter = t;
                },
              },
              metadata: a,
            },
            r,
            i
          ),
          a &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: a,
            }));
      }
      static from(e, t, n) {
        let r = new a(e, t, n);
        return (r.#o(), r);
      }
      #e = Ja(this, r, new h());
      get trustedEmitter() {
        return this.#e;
      }
      set trustedEmitter(e) {
        this.#e = e;
      }
      #t = Ja(this, i);
      #n;
      userContext;
      #r = new WeakMap();
      #i = new Map();
      #a = [];
      constructor(e, t, n) {
        (super(), (this.#t = e), (this.userContext = t), (this.#n = n.defaultViewport));
      }
      #o() {
        for (let e of this.userContext.browsingContexts) this.#s(e);
        (this.userContext.on(`browsingcontext`, (e) => {
          let t = this.#s(e);
          if (e.originalOpener)
            for (let n of this.userContext.browsingContexts)
              n.id === e.originalOpener && this.#r.get(n).trustedEmitter.emit(`popup`, t);
        }),
          this.userContext.on(`closed`, () => {
            this.trustedEmitter.removeAllListeners();
          }));
      }
      #s(e) {
        let t = Aa.from(this, e);
        (this.#r.set(e, t),
          t.trustedEmitter.on(`close`, () => {
            this.#r.delete(e);
          }));
        let n = new Wa(t),
          r = new Map();
        return (
          this.#i.set(t, [n, r]),
          t.trustedEmitter.on(`frameattached`, (e) => {
            let t = e,
              n = new Ga(t);
            (r.set(t, n), this.trustedEmitter.emit(`targetcreated`, n));
          }),
          t.trustedEmitter.on(`framenavigated`, (e) => {
            let t = e,
              i = r.get(t);
            i === void 0
              ? this.trustedEmitter.emit(`targetchanged`, n)
              : this.trustedEmitter.emit(`targetchanged`, i);
          }),
          t.trustedEmitter.on(`framedetached`, (e) => {
            let t = e,
              n = r.get(t);
            n !== void 0 && (r.delete(t), this.trustedEmitter.emit(`targetdestroyed`, n));
          }),
          t.trustedEmitter.on(`workercreated`, (e) => {
            let t = e,
              n = new Ka(t);
            (r.set(t, n), this.trustedEmitter.emit(`targetcreated`, n));
          }),
          t.trustedEmitter.on(`workerdestroyed`, (e) => {
            let t = e,
              n = r.get(t);
            n !== void 0 && (r.delete(e), this.trustedEmitter.emit(`targetdestroyed`, n));
          }),
          t.trustedEmitter.on(`close`, () => {
            (this.#i.delete(t), this.trustedEmitter.emit(`targetdestroyed`, n));
          }),
          this.trustedEmitter.emit(`targetcreated`, n),
          t
        );
      }
      targets() {
        return [...this.#i.values()].flatMap(([e, t]) => [e, ...t.values()]);
      }
      getTargetForPage(e) {
        return this.#i.get(e)?.[0];
      }
      async newPage(e) {
        let t = { stack: [], error: void 0, hasError: !1 };
        try {
          Ya(t, await this.waitForScreenshotOperations(), !1);
          let n = e?.type === `window` ? `window` : `tab`,
            r = await this.userContext.createBrowsingContext(n, { background: e?.background }),
            i = this.#r.get(r);
          if (!i) throw Error(`Page is not found`);
          if (this.#n)
            try {
              await i.setViewport(this.#n);
            } catch (e) {
              C(e);
            }
          if (e?.type === `window` && e?.windowBounds !== void 0)
            try {
              await this.browser().setWindowBounds(r.windowId, e.windowBounds);
            } catch (e) {
              C(e);
            }
          return i;
        } catch (e) {
          ((t.error = e), (t.hasError = !0));
        } finally {
          Xa(t);
        }
      }
      async close() {
        k(this.userContext.id !== Ri.DEFAULT, `Default BrowserContext cannot be closed!`);
        try {
          await this.userContext.remove();
        } catch (e) {
          C(e);
        }
        this.#i.clear();
      }
      browser() {
        return this.#t;
      }
      async pages(e = !1) {
        return [...this.userContext.browsingContexts].map((e) => this.#r.get(e));
      }
      async overridePermissions(e, t) {
        let n = new Set(
          t.map((e) => {
            if (!He.get(e)) throw Error(`Unknown permission: ` + e);
            return e;
          })
        );
        await Promise.all(
          Array.from(He.keys()).map((t) => {
            let r = this.userContext.setPermissions(
              e,
              { name: t },
              n.has(t) ? `granted` : `denied`
            );
            return (this.#a.push({ origin: e, permission: t }), n.has(t) ? r : r.catch(C));
          })
        );
      }
      async setPermission(e, ...t) {
        if (e === `*`) throw new D(`Origin (*) is not supported by WebDriver BiDi`);
        await Promise.all(
          t.map((t) => {
            if (t.permission.allowWithoutSanitization)
              throw new D(`allowWithoutSanitization is not supported by WebDriver BiDi`);
            if (t.permission.panTiltZoom)
              throw new D(`panTiltZoom is not supported by WebDriver BiDi`);
            if (t.permission.userVisibleOnly)
              throw new D(`userVisibleOnly is not supported by WebDriver BiDi`);
            return this.userContext.setPermissions(e, { name: t.permission.name }, t.state);
          })
        );
      }
      async clearPermissionOverrides() {
        let e = this.#a.map(({ permission: e, origin: t }) =>
          this.userContext.setPermissions(t, { name: e }, `prompt`).catch(C)
        );
        ((this.#a = []), await Promise.all(e));
      }
      get id() {
        if (this.userContext.id !== Ri.DEFAULT) return this.userContext.id;
      }
      async cookies() {
        return (await this.userContext.getCookies()).map((e) => Fa(e, !0));
      }
      async setCookie(...e) {
        await Promise.all(
          e.map(async (e) => {
            let t = {
              domain: e.domain,
              name: e.name,
              value: { type: `string`, value: e.value },
              ...(e.path === void 0 ? {} : { path: e.path }),
              ...(e.httpOnly === void 0 ? {} : { httpOnly: e.httpOnly }),
              ...(e.secure === void 0 ? {} : { secure: e.secure }),
              ...(e.sameSite === void 0 ? {} : { sameSite: Ba(e.sameSite) }),
              expiry: Va(e.expires),
              ...Ra(e, `sourceScheme`, `priority`, `url`),
            };
            return await this.userContext.setCookie(t, Ha(e.partitionKey));
          })
        );
      }
    };
  })(),
  Qa = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  $ = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  $a = function (e, t, n) {
    if (t != null) {
      if (typeof t != `object` && typeof t != `function`) throw TypeError(`Object expected.`);
      var r, i;
      if (n) {
        if (!Symbol.asyncDispose) throw TypeError(`Symbol.asyncDispose is not defined.`);
        r = t[Symbol.asyncDispose];
      }
      if (r === void 0) {
        if (!Symbol.dispose) throw TypeError(`Symbol.dispose is not defined.`);
        ((r = t[Symbol.dispose]), n && (i = r));
      }
      if (typeof r != `function`) throw TypeError(`Object not disposable.`);
      (i &&
        (r = function () {
          try {
            i.call(this);
          } catch (e) {
            return Promise.reject(e);
          }
        }),
        e.stack.push({ value: t, dispose: r, async: n }));
    } else n && e.stack.push({ async: !0 });
    return t;
  },
  eo = (function (e) {
    return function (t) {
      function n(n) {
        ((t.error = t.hasError ? new e(n, t.error, `An error was suppressed during disposal.`) : n),
          (t.hasError = !0));
      }
      var r,
        i = 0;
      function a() {
        for (; (r = t.stack.pop()); )
          try {
            if (!r.async && i === 1) return ((i = 0), t.stack.push(r), Promise.resolve().then(a));
            if (r.dispose) {
              var e = r.dispose.call(r.value);
              if (r.async)
                return (
                  (i |= 2),
                  Promise.resolve(e).then(a, function (e) {
                    return (n(e), a());
                  })
                );
            } else i |= 1;
          } catch (e) {
            n(e);
          }
        if (i === 1) return t.hasError ? Promise.reject(t.error) : Promise.resolve();
        if (t.hasError) throw t.error;
      }
      return a();
    };
  })(
    typeof SuppressedError == `function`
      ? SuppressedError
      : function (e, t, n) {
          var r = Error(n);
          return ((r.name = `SuppressedError`), (r.error = e), (r.suppressed = t), r);
        }
  ),
  to = (() => {
    let e = h,
      t = [],
      n,
      r,
      i,
      a,
      o,
      s,
      c,
      l,
      u,
      d;
    return class f extends e {
      static {
        let f =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ($(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `dispose`,
            static: !1,
            private: !1,
            access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
            metadata: f,
          },
          null,
          t
        ),
          $(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `close`,
              static: !1,
              private: !1,
              access: { has: (e) => `close` in e, get: (e) => e.close },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `addPreloadScript`,
              static: !1,
              private: !1,
              access: { has: (e) => `addPreloadScript` in e, get: (e) => e.addPreloadScript },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `removeIntercept`,
              static: !1,
              private: !1,
              access: { has: (e) => `removeIntercept` in e, get: (e) => e.removeIntercept },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `removePreloadScript`,
              static: !1,
              private: !1,
              access: { has: (e) => `removePreloadScript` in e, get: (e) => e.removePreloadScript },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `createUserContext`,
              static: !1,
              private: !1,
              access: { has: (e) => `createUserContext` in e, get: (e) => e.createUserContext },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            c,
            {
              kind: `method`,
              name: `installExtension`,
              static: !1,
              private: !1,
              access: { has: (e) => `installExtension` in e, get: (e) => e.installExtension },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            l,
            {
              kind: `method`,
              name: `uninstallExtension`,
              static: !1,
              private: !1,
              access: { has: (e) => `uninstallExtension` in e, get: (e) => e.uninstallExtension },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            u,
            {
              kind: `method`,
              name: `setClientWindowState`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `setClientWindowState` in e,
                get: (e) => e.setClientWindowState,
              },
              metadata: f,
            },
            null,
            t
          ),
          $(
            this,
            null,
            d,
            {
              kind: `method`,
              name: `getClientWindowInfo`,
              static: !1,
              private: !1,
              access: { has: (e) => `getClientWindowInfo` in e, get: (e) => e.getClientWindowInfo },
              metadata: f,
            },
            null,
            t
          ),
          f &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: f,
            }));
      }
      static async from(e) {
        let t = new f(e);
        return (await t.#a(), t);
      }
      #e = (Qa(this, t), !1);
      #t;
      #n = new w();
      #r = new Map();
      session;
      #i = new Map();
      constructor(e) {
        (super(), (this.session = e));
      }
      async #a() {
        let e = this.#n.use(new h(this.session));
        (e.once(`ended`, (e) => {
          this.dispose(e);
        }),
          e.on(`script.realmCreated`, (e) => {
            e.type === `shared-worker` && this.#i.set(e.realm, Di.from(this, e.realm, e.origin));
          }),
          await this.#o(),
          await this.#s());
      }
      async #o() {
        let {
          result: { userContexts: e },
        } = await this.session.send(`browser.getUserContexts`, {});
        for (let t of e) this.#c(t.userContext);
      }
      async #s() {
        let e = new Set(),
          t;
        {
          let n = { stack: [], error: void 0, hasError: !1 };
          try {
            $a(n, new h(this.session), !1).on(`browsingContext.contextCreated`, (t) => {
              e.add(t.context);
            });
            let { result: r } = await this.session.send(`browsingContext.getTree`, {});
            t = r.contexts;
          } catch (e) {
            ((n.error = e), (n.hasError = !0));
          } finally {
            eo(n);
          }
        }
        for (let n of t)
          (e.has(n.context) || this.session.emit(`browsingContext.contextCreated`, n),
            n.children && t.push(...n.children));
      }
      #c(e) {
        let t = Ri.create(this, e);
        this.#r.set(t.id, t);
        let n = this.#n.use(new h(t));
        return (
          n.once(`closed`, () => {
            (n.removeAllListeners(), this.#r.delete(t.id));
          }),
          t
        );
      }
      get closed() {
        return this.#e;
      }
      get defaultUserContext() {
        return this.#r.get(Ri.DEFAULT);
      }
      get disconnected() {
        return this.#t !== void 0;
      }
      get disposed() {
        return this.disconnected;
      }
      get userContexts() {
        return this.#r.values();
      }
      dispose(e, t = !1) {
        ((this.#e = t), (this.#t = e), this[A]());
      }
      async close() {
        try {
          await this.session.send(`browser.close`, {});
        } finally {
          this.dispose(`Browser already closed.`, !0);
        }
      }
      async addPreloadScript(e, t = {}) {
        let {
          result: { script: n },
        } = await this.session.send(`script.addPreloadScript`, {
          functionDeclaration: e,
          ...t,
          contexts: t.contexts?.map((e) => e.id),
        });
        return n;
      }
      async removeIntercept(e) {
        await this.session.send(`network.removeIntercept`, { intercept: e });
      }
      async removePreloadScript(e) {
        await this.session.send(`script.removePreloadScript`, { script: e });
      }
      async createUserContext(e) {
        let t =
            e.proxyServer === void 0
              ? void 0
              : {
                  proxyType: `manual`,
                  httpProxy: e.proxyServer,
                  sslProxy: e.proxyServer,
                  noProxy: e.proxyBypassList,
                },
          {
            result: { userContext: n },
          } = await this.session.send(`browser.createUserContext`, { proxy: t });
        if (e.downloadBehavior?.policy === `allowAndName`)
          throw new D('`allowAndName` is not supported in WebDriver BiDi');
        if (e.downloadBehavior?.policy === `allow`) {
          if (e.downloadBehavior.downloadPath === void 0)
            throw new D('`downloadPath` is required in `allow` download behavior');
          await this.session.send(`browser.setDownloadBehavior`, {
            downloadBehavior: {
              type: `allowed`,
              destinationFolder: e.downloadBehavior.downloadPath,
            },
            userContexts: [n],
          });
        }
        return (
          e.downloadBehavior?.policy === `deny` &&
            (await this.session.send(`browser.setDownloadBehavior`, {
              downloadBehavior: { type: `denied` },
              userContexts: [n],
            })),
          this.#c(n)
        );
      }
      async installExtension(e) {
        let {
          result: { extension: t },
        } = await this.session.send(`webExtension.install`, {
          extensionData: { type: `path`, path: e },
        });
        return t;
      }
      async uninstallExtension(e) {
        await this.session.send(`webExtension.uninstall`, { extension: e });
      }
      async setClientWindowState(e) {
        await this.session.send(`browser.setClientWindowState`, e);
      }
      async getClientWindowInfo(e) {
        let {
            result: { clientWindows: t },
          } = await this.session.send(`browser.getClientWindows`, {}),
          n = t.find((t) => t.clientWindow === e);
        if (!n) throw Error(`Window not found`);
        return n;
      }
      [((n = [E]),
      (r = [b((e) => e.#t)]),
      (i = [b((e) => e.#t)]),
      (a = [b((e) => e.#t)]),
      (o = [b((e) => e.#t)]),
      (s = [b((e) => e.#t)]),
      (c = [b((e) => e.#t)]),
      (l = [b((e) => e.#t)]),
      (u = [b((e) => e.#t)]),
      (d = [b((e) => e.#t)]),
      A)]() {
        ((this.#t ??= `Browser was disconnected, probably because the session ended.`),
          this.closed && this.emit(`closed`, this.#t),
          this.emit(`disconnected`, this.#t),
          this.#n.dispose(),
          super[A]());
      }
    };
  })(),
  no = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  ro = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  io = (() => {
    let e = h,
      t = [],
      r,
      i = [],
      a = [],
      o,
      s,
      c,
      l,
      u;
    return class d extends e {
      static {
        let n =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (ro(
          this,
          null,
          r,
          {
            kind: `accessor`,
            name: `connection`,
            static: !1,
            private: !1,
            access: {
              has: (e) => `connection` in e,
              get: (e) => e.connection,
              set: (e, t) => {
                e.connection = t;
              },
            },
            metadata: n,
          },
          i,
          a
        ),
          ro(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `dispose`,
              static: !1,
              private: !1,
              access: { has: (e) => `dispose` in e, get: (e) => e.dispose },
              metadata: n,
            },
            null,
            t
          ),
          ro(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `send`,
              static: !1,
              private: !1,
              access: { has: (e) => `send` in e, get: (e) => e.send },
              metadata: n,
            },
            null,
            t
          ),
          ro(
            this,
            null,
            c,
            {
              kind: `method`,
              name: `subscribe`,
              static: !1,
              private: !1,
              access: { has: (e) => `subscribe` in e, get: (e) => e.subscribe },
              metadata: n,
            },
            null,
            t
          ),
          ro(
            this,
            null,
            l,
            {
              kind: `method`,
              name: `addIntercepts`,
              static: !1,
              private: !1,
              access: { has: (e) => `addIntercepts` in e, get: (e) => e.addIntercepts },
              metadata: n,
            },
            null,
            t
          ),
          ro(
            this,
            null,
            u,
            {
              kind: `method`,
              name: `end`,
              static: !1,
              private: !1,
              access: { has: (e) => `end` in e, get: (e) => e.end },
              metadata: n,
            },
            null,
            t
          ),
          n &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: n,
            }));
      }
      static async from(e, t) {
        let { result: n } = await e.send(`session.new`, { capabilities: t }),
          r = new d(e, n);
        return (await r.#i(), r);
      }
      #e = no(this, t);
      #t = new w();
      #n;
      browser;
      #r = no(this, i, void 0);
      get connection() {
        return this.#r;
      }
      set connection(e) {
        this.#r = e;
      }
      constructor(e, t) {
        (super(), no(this, a), (this.#n = t), (this.connection = e));
      }
      async #i() {
        ((this.browser = await to.from(this)),
          this.#t.use(this.browser).once(`closed`, (e) => {
            this.dispose(e);
          }));
        let e = new WeakSet();
        this.on(`browsingContext.fragmentNavigated`, (t) => {
          e.has(t) ||
            (e.add(t),
            this.emit(`browsingContext.navigationStarted`, t),
            this.emit(`browsingContext.fragmentNavigated`, t));
        });
      }
      get capabilities() {
        return this.#n.capabilities;
      }
      get disposed() {
        return this.ended;
      }
      get ended() {
        return this.#e !== void 0;
      }
      get id() {
        return this.#n.sessionId;
      }
      dispose(e) {
        ((this.#e = e), this[A]());
      }
      async send(e, t) {
        return await this.connection.send(e, t);
      }
      async subscribe(e, t) {
        await this.send(`session.subscribe`, { events: e, contexts: t });
      }
      async addIntercepts(e, t) {
        await this.send(`session.subscribe`, { events: e, contexts: t });
      }
      async end() {
        try {
          await this.send(`session.end`, {});
        } finally {
          this.dispose(`Session already ended.`);
        }
      }
      [((r = [n()]),
      (o = [E]),
      (s = [b((e) => e.#e)]),
      (c = [b((e) => e.#e)]),
      (l = [b((e) => e.#e)]),
      (u = [b((e) => e.#e)]),
      A)]() {
        ((this.#e ??= `Session already destroyed, probably because the connection broke.`),
          this.emit(`ended`, this.#e),
          this.#t.dispose(),
          super[A]());
      }
    };
  })(),
  ao = function (e, t, n, r, i, a) {
    function o(e) {
      if (e !== void 0 && typeof e != `function`) throw TypeError(`Function expected`);
      return e;
    }
    for (
      var s = r.kind,
        c = s === `getter` ? `get` : s === `setter` ? `set` : `value`,
        l = !t && e ? (r.static ? e : e.prototype) : null,
        u = t || (l ? Object.getOwnPropertyDescriptor(l, r.name) : {}),
        d,
        f = !1,
        p = n.length - 1;
      p >= 0;
      p--
    ) {
      var m = {};
      for (var h in r) m[h] = h === `access` ? {} : r[h];
      for (var h in r.access) m.access[h] = r.access[h];
      m.addInitializer = function (e) {
        if (f) throw TypeError(`Cannot add initializers after decoration has completed`);
        a.push(o(e || null));
      };
      var g = (0, n[p])(s === `accessor` ? { get: u.get, set: u.set } : u[c], m);
      if (s === `accessor`) {
        if (g === void 0) continue;
        if (typeof g != `object` || !g) throw TypeError(`Object expected`);
        ((d = o(g.get)) && (u.get = d),
          (d = o(g.set)) && (u.set = d),
          (d = o(g.init)) && i.unshift(d));
      } else (d = o(g)) && (s === `field` ? i.unshift(d) : (u[c] = d));
    }
    (l && Object.defineProperty(l, r.name, u), (f = !0));
  },
  oo = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  so = function (e, t, n) {
    return (
      typeof t == `symbol` && (t = t.description ? `[${t.description}]` : ``),
      Object.defineProperty(e, 'name', { configurable: !0, value: n ? `${n} ${t}` : t })
    );
  },
  co = (() => {
    let e = g,
      t,
      r = [],
      i = [],
      a;
    return class o extends e {
      static {
        let o =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((t = [n()]),
          ao(
            this,
            (a = {
              get: so(
                function () {
                  return this.#e;
                },
                `#trustedEmitter`,
                `get`
              ),
              set: so(
                function (e) {
                  this.#e = e;
                },
                `#trustedEmitter`,
                `set`
              ),
            }),
            t,
            {
              kind: `accessor`,
              name: `#trustedEmitter`,
              static: !1,
              private: !0,
              access: {
                has: (e) => #n in e,
                get: (e) => e.#n,
                set: (e, t) => {
                  e.#n = t;
                },
              },
              metadata: o,
            },
            r,
            i
          ),
          o &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: o,
            }));
      }
      protocol = `webDriverBiDi`;
      static subscribeModules = [`browsingContext`, `network`, `log`, `script`, `input`];
      static subscribeCdpEvents = [
        `goog:cdp.Debugger.scriptParsed`,
        `goog:cdp.CSS.styleSheetAdded`,
        `goog:cdp.Runtime.executionContextsCleared`,
        `goog:cdp.Tracing.tracingComplete`,
        `goog:cdp.Network.requestWillBeSent`,
        `goog:cdp.Debugger.scriptParsed`,
        `goog:cdp.Page.screencastFrame`,
      ];
      static async create(e) {
        let t = await io.from(e.connection, {
          firstMatch: e.capabilities?.firstMatch,
          alwaysMatch: {
            ...e.capabilities?.alwaysMatch,
            acceptInsecureCerts: e.acceptInsecureCerts,
            unhandledPromptBehavior: { default: `ignore` },
            webSocketUrl: !0,
            'goog:prerenderingDisabled': !0,
            'goog:disableNetworkDurableMessages': !0,
          },
        });
        (await t.subscribe(
          (e.cdpConnection
            ? [...o.subscribeModules, ...o.subscribeCdpEvents]
            : o.subscribeModules
          ).filter((t) =>
            e.networkEnabled ? !0 : t !== `network` && t !== `goog:cdp.Network.requestWillBeSent`
          )
        ),
          await Promise.all(
            [`request`, `response`].map(async (e) => {
              try {
                await t.send(`network.addDataCollector`, {
                  dataTypes: [e],
                  maxEncodedDataSize: 2e7,
                });
              } catch (e) {
                if (e instanceof Xe) C(e);
                else throw e;
              }
            })
          ));
        let n = new o(t.browser, e);
        return (n.#f(), n);
      }
      #e = oo(this, r, new h());
      get #n() {
        return a.get.call(this);
      }
      set #n(e) {
        return a.set.call(this, e);
      }
      #r = oo(this, i);
      #i;
      #a;
      #o;
      #s = new WeakMap();
      #c = new Ua(this);
      #l;
      #u;
      #d;
      constructor(e, t) {
        (super(),
          (this.#r = t.process),
          (this.#i = t.closeCallback),
          (this.#a = e),
          (this.#o = t.defaultViewport),
          (this.#l = t.cdpConnection),
          (this.#u = t.networkEnabled),
          (this.#d = t.issuesEnabled));
      }
      #f() {
        for (let e of this.#a.userContexts) this.#h(e);
        (this.#a.once(`disconnected`, () => {
          (this.#n.emit(`disconnected`, void 0), this.#n.removeAllListeners());
        }),
          this.#r?.once(`close`, () => {
            (this.#a.dispose(`Browser process exited.`, !0), this.connection.dispose());
          }));
      }
      get #p() {
        return this.#a.session.capabilities.browserName;
      }
      get #m() {
        return this.#a.session.capabilities.browserVersion;
      }
      get cdpSupported() {
        return this.#l !== void 0;
      }
      get cdpConnection() {
        return this.#l;
      }
      async userAgent() {
        return this.#a.session.capabilities.userAgent;
      }
      #h(e) {
        let t = Za.from(this, e, { defaultViewport: this.#o });
        return (
          this.#s.set(e, t),
          t.trustedEmitter.on(`targetcreated`, (e) => {
            this.#n.emit(`targetcreated`, e);
          }),
          t.trustedEmitter.on(`targetchanged`, (e) => {
            this.#n.emit(`targetchanged`, e);
          }),
          t.trustedEmitter.on(`targetdestroyed`, (e) => {
            this.#n.emit(`targetdestroyed`, e);
          }),
          t
        );
      }
      get connection() {
        return this.#a.session.connection;
      }
      wsEndpoint() {
        return this.connection.url;
      }
      async close() {
        if (!this.connection.closed)
          try {
            (await this.#a.close(), await this.#i?.call(null));
          } catch (e) {
            C(e);
          } finally {
            this.connection.dispose();
          }
      }
      get connected() {
        return !this.#a.disconnected;
      }
      process() {
        return this.#r ?? null;
      }
      async createBrowserContext(e = {}) {
        let t = await this.#a.createUserContext(e);
        return this.#h(t);
      }
      async version() {
        return `${this.#p}/${this.#m}`;
      }
      browserContexts() {
        return [...this.#a.userContexts].map((e) => this.#s.get(e));
      }
      defaultBrowserContext() {
        return this.#s.get(this.#a.defaultUserContext);
      }
      newPage(e) {
        return this.defaultBrowserContext().newPage(e);
      }
      installExtension(e) {
        return this.#a.installExtension(e);
      }
      async uninstallExtension(e) {
        await this.#a.uninstallExtension(e);
      }
      screens() {
        throw new D();
      }
      addScreen(e) {
        throw new D();
      }
      removeScreen(e) {
        throw new D();
      }
      async getWindowBounds(e) {
        let t = await this.#a.getClientWindowInfo(e);
        return { left: t.x, top: t.y, width: t.width, height: t.height, windowState: t.state };
      }
      async setWindowBounds(e, t) {
        let n,
          r = t.windowState ?? `normal`;
        ((n =
          r === `normal`
            ? {
                clientWindow: e,
                state: `normal`,
                x: t.left,
                y: t.top,
                width: t.width,
                height: t.height,
              }
            : { clientWindow: e, state: r }),
          await this.#a.setClientWindowState(n));
      }
      targets() {
        return [this.#c, ...this.browserContexts().flatMap((e) => e.targets())];
      }
      target() {
        return this.#c;
      }
      async disconnect() {
        try {
          await this.#a.session.end();
        } catch (e) {
          C(e);
        } finally {
          this.connection.dispose();
        }
      }
      get debugInfo() {
        return { pendingProtocolErrors: this.connection.getPendingProtocolErrors() };
      }
      isNetworkEnabled() {
        return this.#u;
      }
      extensions() {
        throw new D();
      }
      isIssuesEnabled() {
        return this.#d;
      }
    };
  })();
export {
  co as BidiBrowser,
  Za as BidiBrowserContext,
  si as BidiConnection,
  J as BidiElementHandle,
  ya as BidiFrame,
  Y as BidiFrameRealm,
  ea as BidiHTTPRequest,
  Zi as BidiHTTPResponse,
  Bi as BidiJSHandle,
  xa as BidiKeyboard,
  Ca as BidiMouse,
  Aa as BidiPage,
  ma as BidiRealm,
  Ta as BidiTouchscreen,
  ha as BidiWorkerRealm,
  Fa as bidiToPuppeteerCookie,
  Ra as cdpSpecificCookiePropertiesFromPuppeteerToBidi,
  di as connectBidiOverCdp,
  Va as convertCookiesExpiryCdpToBiDi,
  Ha as convertCookiesPartitionKeyFromPuppeteerToBiDi,
  Ba as convertCookiesSameSiteCdpToBiDi,
  $i as requests,
};
