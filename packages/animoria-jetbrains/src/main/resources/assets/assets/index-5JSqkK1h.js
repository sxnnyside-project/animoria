const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      'assets/__vite-browser-external-DOOah4Mz.js',
      'assets/chunk-QTnfLwEv.js',
      'assets/bidi-C37lr4Tc.js',
    ])
) => i.map((i) => d[i]);
import { n as e, r as t, t as n } from './chunk-QTnfLwEv.js';
import { t as r } from './__vite-browser-external-DOOah4Mz.js';
import { t as i } from './preload-helper-zJ_50EbN.js';
(function () {
  let e = document.createElement(`link`).relList;
  if (e && e.supports && e.supports(`modulepreload`)) return;
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e);
  new MutationObserver((e) => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes) e.tagName === `LINK` && e.rel === `modulepreload` && n(e);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(e) {
    let t = {};
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      e.crossOrigin === `use-credentials`
        ? (t.credentials = `include`)
        : e.crossOrigin === `anonymous`
          ? (t.credentials = `omit`)
          : (t.credentials = `same-origin`),
      t
    );
  }
  function n(e) {
    if (e.ep) return;
    e.ep = !0;
    let n = t(e);
    fetch(e.href, n);
  }
})();
var a = globalThis,
  o =
    a.ShadowRoot &&
    (a.ShadyCSS === void 0 || a.ShadyCSS.nativeShadow) &&
    `adoptedStyleSheets` in Document.prototype &&
    `replace` in CSSStyleSheet.prototype,
  s = Symbol(),
  c = new WeakMap(),
  l = class {
    constructor(e, t, n) {
      if (((this._$cssResult$ = !0), n !== s))
        throw Error('CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
      ((this.cssText = e), (this.t = t));
    }
    get styleSheet() {
      let e = this.o,
        t = this.t;
      if (o && e === void 0) {
        let n = t !== void 0 && t.length === 1;
        (n && (e = c.get(t)),
          e === void 0 &&
            ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && c.set(t, e)));
      }
      return e;
    }
    toString() {
      return this.cssText;
    }
  },
  u = (e) => new l(typeof e == `string` ? e : e + ``, void 0, s),
  d = (e, ...t) =>
    new l(
      e.length === 1
        ? e[0]
        : t.reduce(
            (t, n, r) =>
              t +
              ((e) => {
                if (!0 === e._$cssResult$) return e.cssText;
                if (typeof e == `number`) return e;
                throw Error(
                  `Value passed to 'css' function must be a 'css' function result: ` +
                    e +
                    `. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`
                );
              })(n) +
              e[r + 1],
            e[0]
          ),
      e,
      s
    ),
  f = (e, t) => {
    if (o) e.adoptedStyleSheets = t.map((e) => (e instanceof CSSStyleSheet ? e : e.styleSheet));
    else
      for (let n of t) {
        let t = document.createElement(`style`),
          r = a.litNonce;
        (r !== void 0 && t.setAttribute(`nonce`, r), (t.textContent = n.cssText), e.appendChild(t));
      }
  },
  p = o
    ? (e) => e
    : (e) =>
        e instanceof CSSStyleSheet
          ? ((e) => {
              let t = ``;
              for (let n of e.cssRules) t += n.cssText;
              return u(t);
            })(e)
          : e,
  {
    is: m,
    defineProperty: h,
    getOwnPropertyDescriptor: g,
    getOwnPropertyNames: _,
    getOwnPropertySymbols: v,
    getPrototypeOf: y,
  } = Object,
  b = globalThis,
  x = b.trustedTypes,
  S = x ? x.emptyScript : ``,
  C = b.reactiveElementPolyfillSupport,
  w = (e, t) => e,
  T = {
    toAttribute(e, t) {
      switch (t) {
        case Boolean:
          e = e ? S : null;
          break;
        case Object:
        case Array:
          e = e == null ? e : JSON.stringify(e);
      }
      return e;
    },
    fromAttribute(e, t) {
      let n = e;
      switch (t) {
        case Boolean:
          n = e !== null;
          break;
        case Number:
          n = e === null ? null : Number(e);
          break;
        case Object:
        case Array:
          try {
            n = JSON.parse(e);
          } catch {
            n = null;
          }
      }
      return n;
    },
  },
  E = (e, t) => !m(e, t),
  D = { attribute: !0, type: String, converter: T, reflect: !1, useDefault: !1, hasChanged: E };
((Symbol.metadata ??= Symbol(`metadata`)), (b.litPropertyMetadata ??= new WeakMap()));
var O = class extends HTMLElement {
  static addInitializer(e) {
    (this._$Ei(), (this.l ??= []).push(e));
  }
  static get observedAttributes() {
    return (this.finalize(), this._$Eh && [...this._$Eh.keys()]);
  }
  static createProperty(e, t = D) {
    if (
      (t.state && (t.attribute = !1),
      this._$Ei(),
      this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0),
      this.elementProperties.set(e, t),
      !t.noAccessor)
    ) {
      let n = Symbol(),
        r = this.getPropertyDescriptor(e, n, t);
      r !== void 0 && h(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, n) {
    let { get: r, set: i } = g(this.prototype, e) ?? {
      get() {
        return this[t];
      },
      set(e) {
        this[t] = e;
      },
    };
    return {
      get: r,
      set(t) {
        let a = r?.call(this);
        (i?.call(this, t), this.requestUpdate(e, a, n));
      },
      configurable: !0,
      enumerable: !0,
    };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? D;
  }
  static _$Ei() {
    if (this.hasOwnProperty(w(`elementProperties`))) return;
    let e = y(this);
    (e.finalize(),
      e.l !== void 0 && (this.l = [...e.l]),
      (this.elementProperties = new Map(e.elementProperties)));
  }
  static finalize() {
    if (this.hasOwnProperty(w(`finalized`))) return;
    if (((this.finalized = !0), this._$Ei(), this.hasOwnProperty(w(`properties`)))) {
      let e = this.properties,
        t = [..._(e), ...v(e)];
      for (let n of t) this.createProperty(n, e[n]);
    }
    let e = this[Symbol.metadata];
    if (e !== null) {
      let t = litPropertyMetadata.get(e);
      if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
    }
    this._$Eh = new Map();
    for (let [e, t] of this.elementProperties) {
      let n = this._$Eu(e, t);
      n !== void 0 && this._$Eh.set(n, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    let t = [];
    if (Array.isArray(e)) {
      let n = new Set(e.flat(1 / 0).reverse());
      for (let e of n) t.unshift(p(e));
    } else e !== void 0 && t.push(p(e));
    return t;
  }
  static _$Eu(e, t) {
    let n = t.attribute;
    return !1 === n
      ? void 0
      : typeof n == `string`
        ? n
        : typeof e == `string`
          ? e.toLowerCase()
          : void 0;
  }
  constructor() {
    (super(),
      (this._$Ep = void 0),
      (this.isUpdatePending = !1),
      (this.hasUpdated = !1),
      (this._$Em = null),
      this._$Ev());
  }
  _$Ev() {
    ((this._$ES = new Promise((e) => (this.enableUpdating = e))),
      (this._$AL = new Map()),
      this._$E_(),
      this.requestUpdate(),
      this.constructor.l?.forEach((e) => e(this)));
  }
  addController(e) {
    ((this._$EO ??= new Set()).add(e),
      this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.());
  }
  removeController(e) {
    this._$EO?.delete(e);
  }
  _$E_() {
    let e = new Map(),
      t = this.constructor.elementProperties;
    for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return (f(e, this.constructor.elementStyles), e);
  }
  connectedCallback() {
    ((this.renderRoot ??= this.createRenderRoot()),
      this.enableUpdating(!0),
      this._$EO?.forEach((e) => e.hostConnected?.()));
  }
  enableUpdating(e) {}
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, t, n) {
    this._$AK(e, n);
  }
  _$ET(e, t) {
    let n = this.constructor.elementProperties.get(e),
      r = this.constructor._$Eu(e, n);
    if (r !== void 0 && !0 === n.reflect) {
      let i = (n.converter?.toAttribute === void 0 ? T : n.converter).toAttribute(t, n.type);
      ((this._$Em = e),
        i == null ? this.removeAttribute(r) : this.setAttribute(r, i),
        (this._$Em = null));
    }
  }
  _$AK(e, t) {
    let n = this.constructor,
      r = n._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      let e = n.getPropertyOptions(r),
        i =
          typeof e.converter == `function`
            ? { fromAttribute: e.converter }
            : e.converter?.fromAttribute === void 0
              ? T
              : e.converter;
      this._$Em = r;
      let a = i.fromAttribute(t, e.type);
      ((this[r] = a ?? this._$Ej?.get(r) ?? a), (this._$Em = null));
    }
  }
  requestUpdate(e, t, n, r = !1, i) {
    if (e !== void 0) {
      let a = this.constructor;
      if (
        (!1 === r && (i = this[e]),
        (n ??= a.getPropertyOptions(e)),
        !(
          (n.hasChanged ?? E)(i, t) ||
          (n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))
        ))
      )
        return;
      this.C(e, t, n);
    }
    !1 === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
    (n &&
      !(this._$Ej ??= new Map()).has(e) &&
      (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0)) ||
      (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)),
      !0 === r && this._$Em !== e && (this._$Eq ??= new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    let e = this.scheduleUpdate();
    return (e != null && (await e), !this.isUpdatePending);
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (((this.renderRoot ??= this.createRenderRoot()), this._$Ep)) {
        for (let [e, t] of this._$Ep) this[e] = t;
        this._$Ep = void 0;
      }
      let e = this.constructor.elementProperties;
      if (e.size > 0)
        for (let [t, n] of e) {
          let { wrapped: e } = n,
            r = this[t];
          !0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
        }
    }
    let e = !1,
      t = this._$AL;
    try {
      ((e = this.shouldUpdate(t)),
        e
          ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t))
          : this._$EM());
    } catch (t) {
      throw ((e = !1), this._$EM(), t);
    }
    e && this._$AE(t);
  }
  willUpdate(e) {}
  _$AE(e) {
    (this._$EO?.forEach((e) => e.hostUpdated?.()),
      this.hasUpdated || ((this.hasUpdated = !0), this.firstUpdated(e)),
      this.updated(e));
  }
  _$EM() {
    ((this._$AL = new Map()), (this.isUpdatePending = !1));
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    ((this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM());
  }
  updated(e) {}
  firstUpdated(e) {}
};
((O.elementStyles = []),
  (O.shadowRootOptions = { mode: `open` }),
  (O[w(`elementProperties`)] = new Map()),
  (O[w(`finalized`)] = new Map()),
  C?.({ ReactiveElement: O }),
  (b.reactiveElementVersions ??= []).push(`2.1.2`));
var ee = globalThis,
  k = (e) => e,
  te = ee.trustedTypes,
  ne = te ? te.createPolicy(`lit-html`, { createHTML: (e) => e }) : void 0,
  re = `$lit$`,
  ie = `lit$${Math.random().toFixed(9).slice(2)}$`,
  A = `?` + ie,
  ae = `<${A}>`,
  oe = document,
  j = () => oe.createComment(``),
  M = (e) => e === null || (typeof e != `object` && typeof e != `function`),
  se = Array.isArray,
  ce = (e) => se(e) || typeof e?.[Symbol.iterator] == `function`,
  N = `[ 	
\f\r]`,
  P = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
  le = /-->/g,
  ue = />/g,
  de = RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, `g`),
  fe = /'/g,
  pe = /"/g,
  me = /^(?:script|style|textarea|title)$/i,
  F = (
    (e) =>
    (t, ...n) => ({ _$litType$: e, strings: t, values: n })
  )(1),
  he = Symbol.for(`lit-noChange`),
  ge = Symbol.for(`lit-nothing`),
  I = new WeakMap(),
  _e = oe.createTreeWalker(oe, 129);
function ve(e, t) {
  if (!se(e) || !e.hasOwnProperty(`raw`)) throw Error(`invalid template strings array`);
  return ne === void 0 ? t : ne.createHTML(t);
}
var ye = (e, t) => {
    let n = e.length - 1,
      r = [],
      i,
      a = t === 2 ? `<svg>` : t === 3 ? `<math>` : ``,
      o = P;
    for (let t = 0; t < n; t++) {
      let n = e[t],
        s,
        c,
        l = -1,
        u = 0;
      for (; u < n.length && ((o.lastIndex = u), (c = o.exec(n)), c !== null); )
        ((u = o.lastIndex),
          o === P
            ? c[1] === `!--`
              ? (o = le)
              : c[1] === void 0
                ? c[2] === void 0
                  ? c[3] !== void 0 && (o = de)
                  : (me.test(c[2]) && (i = RegExp(`</` + c[2], `g`)), (o = de))
                : (o = ue)
            : o === de
              ? c[0] === `>`
                ? ((o = i ?? P), (l = -1))
                : c[1] === void 0
                  ? (l = -2)
                  : ((l = o.lastIndex - c[2].length),
                    (s = c[1]),
                    (o = c[3] === void 0 ? de : c[3] === `"` ? pe : fe))
              : o === pe || o === fe
                ? (o = de)
                : o === le || o === ue
                  ? (o = P)
                  : ((o = de), (i = void 0)));
      let d = o === de && e[t + 1].startsWith(`/>`) ? ` ` : ``;
      a +=
        o === P
          ? n + ae
          : l >= 0
            ? (r.push(s), n.slice(0, l) + re + n.slice(l) + ie + d)
            : n + ie + (l === -2 ? t : d);
    }
    return [ve(e, a + (e[n] || `<?>`) + (t === 2 ? `</svg>` : t === 3 ? `</math>` : ``)), r];
  },
  be = class e {
    constructor({ strings: t, _$litType$: n }, r) {
      let i;
      this.parts = [];
      let a = 0,
        o = 0,
        s = t.length - 1,
        c = this.parts,
        [l, u] = ye(t, n);
      if (
        ((this.el = e.createElement(l, r)), (_e.currentNode = this.el.content), n === 2 || n === 3)
      ) {
        let e = this.el.content.firstChild;
        e.replaceWith(...e.childNodes);
      }
      for (; (i = _e.nextNode()) !== null && c.length < s; ) {
        if (i.nodeType === 1) {
          if (i.hasAttributes())
            for (let e of i.getAttributeNames())
              if (e.endsWith(re)) {
                let t = u[o++],
                  n = i.getAttribute(e).split(ie),
                  r = /([.?@])?(.*)/.exec(t);
                (c.push({
                  type: 1,
                  index: a,
                  name: r[2],
                  strings: n,
                  ctor: r[1] === `.` ? Te : r[1] === `?` ? Ee : r[1] === `@` ? De : we,
                }),
                  i.removeAttribute(e));
              } else e.startsWith(ie) && (c.push({ type: 6, index: a }), i.removeAttribute(e));
          if (me.test(i.tagName)) {
            let e = i.textContent.split(ie),
              t = e.length - 1;
            if (t > 0) {
              i.textContent = te ? te.emptyScript : ``;
              for (let n = 0; n < t; n++)
                (i.append(e[n], j()), _e.nextNode(), c.push({ type: 2, index: ++a }));
              i.append(e[t], j());
            }
          }
        } else if (i.nodeType === 8)
          if (i.data === A) c.push({ type: 2, index: a });
          else {
            let e = -1;
            for (; (e = i.data.indexOf(ie, e + 1)) !== -1; )
              (c.push({ type: 7, index: a }), (e += ie.length - 1));
          }
        a++;
      }
    }
    static createElement(e, t) {
      let n = oe.createElement(`template`);
      return ((n.innerHTML = e), n);
    }
  };
function xe(e, t, n = e, r) {
  if (t === he) return t;
  let i = r === void 0 ? n._$Cl : n._$Co?.[r],
    a = M(t) ? void 0 : t._$litDirective$;
  return (
    i?.constructor !== a &&
      (i?._$AO?.(!1),
      a === void 0 ? (i = void 0) : ((i = new a(e)), i._$AT(e, n, r)),
      r === void 0 ? (n._$Cl = i) : ((n._$Co ??= [])[r] = i)),
    i !== void 0 && (t = xe(e, i._$AS(e, t.values), i, r)),
    t
  );
}
var Se = class {
    constructor(e, t) {
      ((this._$AV = []), (this._$AN = void 0), (this._$AD = e), (this._$AM = t));
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    u(e) {
      let {
          el: { content: t },
          parts: n,
        } = this._$AD,
        r = (e?.creationScope ?? oe).importNode(t, !0);
      _e.currentNode = r;
      let i = _e.nextNode(),
        a = 0,
        o = 0,
        s = n[0];
      for (; s !== void 0; ) {
        if (a === s.index) {
          let t;
          (s.type === 2
            ? (t = new Ce(i, i.nextSibling, this, e))
            : s.type === 1
              ? (t = new s.ctor(i, s.name, s.strings, this, e))
              : s.type === 6 && (t = new Oe(i, this, e)),
            this._$AV.push(t),
            (s = n[++o]));
        }
        a !== s?.index && ((i = _e.nextNode()), a++);
      }
      return ((_e.currentNode = oe), r);
    }
    p(e) {
      let t = 0;
      for (let n of this._$AV)
        (n !== void 0 &&
          (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), (t += n.strings.length - 2))),
          t++);
    }
  },
  Ce = class e {
    get _$AU() {
      return this._$AM?._$AU ?? this._$Cv;
    }
    constructor(e, t, n, r) {
      ((this.type = 2),
        (this._$AH = ge),
        (this._$AN = void 0),
        (this._$AA = e),
        (this._$AB = t),
        (this._$AM = n),
        (this.options = r),
        (this._$Cv = r?.isConnected ?? !0));
    }
    get parentNode() {
      let e = this._$AA.parentNode,
        t = this._$AM;
      return (t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e);
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(e, t = this) {
      ((e = xe(this, e, t)),
        M(e)
          ? e === ge || e == null || e === ``
            ? (this._$AH !== ge && this._$AR(), (this._$AH = ge))
            : e !== this._$AH && e !== he && this._(e)
          : e._$litType$ === void 0
            ? e.nodeType === void 0
              ? ce(e)
                ? this.k(e)
                : this._(e)
              : this.T(e)
            : this.$(e));
    }
    O(e) {
      return this._$AA.parentNode.insertBefore(e, this._$AB);
    }
    T(e) {
      this._$AH !== e && (this._$AR(), (this._$AH = this.O(e)));
    }
    _(e) {
      (this._$AH !== ge && M(this._$AH)
        ? (this._$AA.nextSibling.data = e)
        : this.T(oe.createTextNode(e)),
        (this._$AH = e));
    }
    $(e) {
      let { values: t, _$litType$: n } = e,
        r =
          typeof n == `number`
            ? this._$AC(e)
            : (n.el === void 0 && (n.el = be.createElement(ve(n.h, n.h[0]), this.options)), n);
      if (this._$AH?._$AD === r) this._$AH.p(t);
      else {
        let e = new Se(r, this),
          n = e.u(this.options);
        (e.p(t), this.T(n), (this._$AH = e));
      }
    }
    _$AC(e) {
      let t = I.get(e.strings);
      return (t === void 0 && I.set(e.strings, (t = new be(e))), t);
    }
    k(t) {
      se(this._$AH) || ((this._$AH = []), this._$AR());
      let n = this._$AH,
        r,
        i = 0;
      for (let a of t)
        (i === n.length
          ? n.push((r = new e(this.O(j()), this.O(j()), this, this.options)))
          : (r = n[i]),
          r._$AI(a),
          i++);
      i < n.length && (this._$AR(r && r._$AB.nextSibling, i), (n.length = i));
    }
    _$AR(e = this._$AA.nextSibling, t) {
      for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
        let t = k(e).nextSibling;
        (k(e).remove(), (e = t));
      }
    }
    setConnected(e) {
      this._$AM === void 0 && ((this._$Cv = e), this._$AP?.(e));
    }
  },
  we = class {
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    constructor(e, t, n, r, i) {
      ((this.type = 1),
        (this._$AH = ge),
        (this._$AN = void 0),
        (this.element = e),
        (this.name = t),
        (this._$AM = r),
        (this.options = i),
        n.length > 2 || n[0] !== `` || n[1] !== ``
          ? ((this._$AH = Array(n.length - 1).fill(new String())), (this.strings = n))
          : (this._$AH = ge));
    }
    _$AI(e, t = this, n, r) {
      let i = this.strings,
        a = !1;
      if (i === void 0)
        ((e = xe(this, e, t, 0)),
          (a = !M(e) || (e !== this._$AH && e !== he)),
          a && (this._$AH = e));
      else {
        let r = e,
          o,
          s;
        for (e = i[0], o = 0; o < i.length - 1; o++)
          ((s = xe(this, r[n + o], t, o)),
            s === he && (s = this._$AH[o]),
            (a ||= !M(s) || s !== this._$AH[o]),
            s === ge ? (e = ge) : e !== ge && (e += (s ?? ``) + i[o + 1]),
            (this._$AH[o] = s));
      }
      a && !r && this.j(e);
    }
    j(e) {
      e === ge
        ? this.element.removeAttribute(this.name)
        : this.element.setAttribute(this.name, e ?? ``);
    }
  },
  Te = class extends we {
    constructor() {
      (super(...arguments), (this.type = 3));
    }
    j(e) {
      this.element[this.name] = e === ge ? void 0 : e;
    }
  },
  Ee = class extends we {
    constructor() {
      (super(...arguments), (this.type = 4));
    }
    j(e) {
      this.element.toggleAttribute(this.name, !!e && e !== ge);
    }
  },
  De = class extends we {
    constructor(e, t, n, r, i) {
      (super(e, t, n, r, i), (this.type = 5));
    }
    _$AI(e, t = this) {
      if ((e = xe(this, e, t, 0) ?? ge) === he) return;
      let n = this._$AH,
        r =
          (e === ge && n !== ge) ||
          e.capture !== n.capture ||
          e.once !== n.once ||
          e.passive !== n.passive,
        i = e !== ge && (n === ge || r);
      (r && this.element.removeEventListener(this.name, this, n),
        i && this.element.addEventListener(this.name, this, e),
        (this._$AH = e));
    }
    handleEvent(e) {
      typeof this._$AH == `function`
        ? this._$AH.call(this.options?.host ?? this.element, e)
        : this._$AH.handleEvent(e);
    }
  },
  Oe = class {
    constructor(e, t, n) {
      ((this.element = e),
        (this.type = 6),
        (this._$AN = void 0),
        (this._$AM = t),
        (this.options = n));
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(e) {
      xe(this, e);
    }
  },
  ke = ee.litHtmlPolyfillSupport;
(ke?.(be, Ce), (ee.litHtmlVersions ??= []).push(`3.3.3`));
var Ae = (e, t, n) => {
    let r = n?.renderBefore ?? t,
      i = r._$litPart$;
    if (i === void 0) {
      let e = n?.renderBefore ?? null;
      r._$litPart$ = i = new Ce(t.insertBefore(j(), e), e, void 0, n ?? {});
    }
    return (i._$AI(e), i);
  },
  je = globalThis,
  Me = class extends O {
    constructor() {
      (super(...arguments), (this.renderOptions = { host: this }), (this._$Do = void 0));
    }
    createRenderRoot() {
      let e = super.createRenderRoot();
      return ((this.renderOptions.renderBefore ??= e.firstChild), e);
    }
    update(e) {
      let t = this.render();
      (this.hasUpdated || (this.renderOptions.isConnected = this.isConnected),
        super.update(e),
        (this._$Do = Ae(t, this.renderRoot, this.renderOptions)));
    }
    connectedCallback() {
      (super.connectedCallback(), this._$Do?.setConnected(!0));
    }
    disconnectedCallback() {
      (super.disconnectedCallback(), this._$Do?.setConnected(!1));
    }
    render() {
      return he;
    }
  };
((Me._$litElement$ = !0), (Me.finalized = !0), je.litElementHydrateSupport?.({ LitElement: Me }));
var Ne = je.litElementPolyfillSupport;
(Ne?.({ LitElement: Me }), (je.litElementVersions ??= []).push(`4.2.2`));
var Pe = (e) => (t, n) => {
    n === void 0
      ? customElements.define(e, t)
      : n.addInitializer(() => {
          customElements.define(e, t);
        });
  },
  Fe = { attribute: !0, type: String, converter: T, reflect: !1, hasChanged: E },
  Ie = (e = Fe, t, n) => {
    let { kind: r, metadata: i } = n,
      a = globalThis.litPropertyMetadata.get(i);
    if (
      (a === void 0 && globalThis.litPropertyMetadata.set(i, (a = new Map())),
      r === `setter` && ((e = Object.create(e)).wrapped = !0),
      a.set(n.name, e),
      r === `accessor`)
    ) {
      let { name: r } = n;
      return {
        set(n) {
          let i = t.get.call(this);
          (t.set.call(this, n), this.requestUpdate(r, i, e, !0, n));
        },
        init(t) {
          return (t !== void 0 && this.C(r, void 0, e, t), t);
        },
      };
    }
    if (r === `setter`) {
      let { name: r } = n;
      return function (n) {
        let i = this[r];
        (t.call(this, n), this.requestUpdate(r, i, e, !0, n));
      };
    }
    throw Error(`Unsupported decorator location: ` + r);
  };
function Le(e) {
  return (t, n) =>
    typeof n == `object`
      ? Ie(e, t, n)
      : ((e, t, n) => {
          let r = t.hasOwnProperty(n);
          return (
            t.constructor.createProperty(n, e),
            r ? Object.getOwnPropertyDescriptor(t, n) : void 0
          );
        })(e, t, n);
}
function Re(e) {
  return Le({ ...e, state: !0, attribute: !1 });
}
function ze(e) {
  if (typeof e != `string`) return ``;
  let t = e.replace(/<[^>]*>?/gm, ``);
  return (
    (t = t
      .replace(/&/g, `&amp;`)
      .replace(/</g, `&lt;`)
      .replace(/>/g, `&gt;`)
      .replace(/"/g, `&quot;`)
      .replace(/'/g, `&#39;`)),
    t
  );
}
var Be = class {
    validate(e) {
      if (typeof e != `object` || !e) return !1;
      let t = e;
      return (
        typeof t.v == `string` && typeof t.fr == `number` && t.fr > 0 && Array.isArray(t.layers)
      );
    }
    parse(e) {
      try {
        if (!this.validate(e))
          return { success: !1, error: `Invalid Lottie file: validation failed` };
        let t = e,
          n = t.fr,
          r = typeof t.ip == `number` ? t.ip : 0,
          i = t.op - r,
          a = parseFloat((i / n).toFixed(4)),
          o = Array.isArray(t.markers)
            ? t.markers.map((e) => ({ name: ze(e.cm), frame: e.tm, durationFrames: e.dr }))
            : [];
        return {
          success: !0,
          metadata: {
            format: `lottie`,
            fps: n,
            totalFrames: i,
            durationSeconds: a,
            width: t.w,
            height: t.h,
            layerCount: t.layers.length,
            markers: o,
          },
        };
      } catch (e) {
        return { success: !1, error: e instanceof Error ? e.message : String(e) };
      }
    }
  },
  Ve = {},
  He = function (e, t, n, r, i) {
    var a = new Worker(
      Ve[t] ||
        (Ve[t] = URL.createObjectURL(
          new Blob(
            [
              e +
                `;addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})`,
            ],
            { type: `text/javascript` }
          )
        ))
    );
    return (
      (a.onmessage = function (e) {
        var t = e.data,
          n = t.$e$;
        if (n) {
          var r = Error(n[0]);
          ((r.code = n[1]), (r.stack = n[2]), i(r, null));
        } else i(null, t);
      }),
      a.postMessage(n, r),
      a
    );
  },
  Ue = Uint8Array,
  We = Uint16Array,
  Ge = Int32Array,
  Ke = new Ue([
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0,
  ]),
  qe = new Ue([
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
    13, 0, 0,
  ]),
  Je = new Ue([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]),
  Ye = function (e, t) {
    for (var n = new We(31), r = 0; r < 31; ++r) n[r] = t += 1 << e[r - 1];
    for (var i = new Ge(n[30]), r = 1; r < 30; ++r)
      for (var a = n[r]; a < n[r + 1]; ++a) i[a] = ((a - n[r]) << 5) | r;
    return { b: n, r: i };
  },
  Xe = Ye(Ke, 2),
  Ze = Xe.b,
  Qe = Xe.r;
((Ze[28] = 258), (Qe[258] = 28));
for (var $e = Ye(qe, 0), et = $e.b, tt = $e.r, nt = new We(32768), rt = 0; rt < 32768; ++rt) {
  var it = ((rt & 43690) >> 1) | ((rt & 21845) << 1);
  ((it = ((it & 52428) >> 2) | ((it & 13107) << 2)),
    (it = ((it & 61680) >> 4) | ((it & 3855) << 4)),
    (nt[rt] = (((it & 65280) >> 8) | ((it & 255) << 8)) >> 1));
}
for (
  var at = function (e, t, n) {
      for (var r = e.length, i = 0, a = new We(t); i < r; ++i) e[i] && ++a[e[i] - 1];
      var o = new We(t);
      for (i = 1; i < t; ++i) o[i] = (o[i - 1] + a[i - 1]) << 1;
      var s;
      if (n) {
        s = new We(1 << t);
        var c = 15 - t;
        for (i = 0; i < r; ++i)
          if (e[i])
            for (
              var l = (i << 4) | e[i], u = t - e[i], d = o[e[i] - 1]++ << u, f = d | ((1 << u) - 1);
              d <= f;
              ++d
            )
              s[nt[d] >> c] = l;
      } else
        for (s = new We(r), i = 0; i < r; ++i) e[i] && (s[i] = nt[o[e[i] - 1]++] >> (15 - e[i]));
      return s;
    },
    ot = new Ue(288),
    rt = 0;
  rt < 144;
  ++rt
)
  ot[rt] = 8;
for (var rt = 144; rt < 256; ++rt) ot[rt] = 9;
for (var rt = 256; rt < 280; ++rt) ot[rt] = 7;
for (var rt = 280; rt < 288; ++rt) ot[rt] = 8;
for (var st = new Ue(32), rt = 0; rt < 32; ++rt) st[rt] = 5;
var ct = at(ot, 9, 0),
  lt = at(ot, 9, 1),
  ut = at(st, 5, 0),
  dt = at(st, 5, 1),
  ft = function (e) {
    for (var t = e[0], n = 1; n < e.length; ++n) e[n] > t && (t = e[n]);
    return t;
  },
  pt = function (e, t, n) {
    var r = (t / 8) | 0;
    return ((e[r] | (e[r + 1] << 8)) >> (t & 7)) & n;
  },
  mt = function (e, t) {
    var n = (t / 8) | 0;
    return (e[n] | (e[n + 1] << 8) | (e[n + 2] << 16)) >> (t & 7);
  },
  ht = function (e) {
    return ((e + 7) / 8) | 0;
  },
  gt = function (e, t, n) {
    return (
      (t == null || t < 0) && (t = 0),
      (n == null || n > e.length) && (n = e.length),
      new Ue(e.subarray(t, n))
    );
  },
  _t = [
    `unexpected EOF`,
    `invalid block type`,
    `invalid length/literal`,
    `invalid distance`,
    `stream finished`,
    `no stream handler`,
    ,
    `no callback`,
    `invalid UTF-8 data`,
    `extra field too long`,
    `date not in range 1980-2099`,
    `filename too long`,
    `stream finishing`,
    `invalid zip data`,
  ],
  vt = function (e, t, n) {
    var r = Error(t || _t[e]);
    if (((r.code = e), Error.captureStackTrace && Error.captureStackTrace(r, vt), !n)) throw r;
    return r;
  },
  yt = function (e, t, n, r) {
    var i = e.length,
      a = r ? r.length : 0;
    if (!i || (t.f && !t.l)) return n || new Ue(0);
    var o = !n,
      s = o || t.i != 2,
      c = t.i;
    o && (n = new Ue(i * 3));
    var l = function (e) {
        var t = n.length;
        if (e > t) {
          var r = new Ue(Math.max(t * 2, e));
          (r.set(n), (n = r));
        }
      },
      u = t.f || 0,
      d = t.p || 0,
      f = t.b || 0,
      p = t.l,
      m = t.d,
      h = t.m,
      g = t.n,
      _ = i * 8;
    do {
      if (!p) {
        u = pt(e, d, 1);
        var v = pt(e, d + 1, 3);
        if (((d += 3), !v)) {
          var y = ht(d) + 4,
            b = e[y - 4] | (e[y - 3] << 8),
            x = y + b;
          if (x > i) {
            c && vt(0);
            break;
          }
          (s && l(f + b), n.set(e.subarray(y, x), f), (t.b = f += b), (t.p = d = x * 8), (t.f = u));
          continue;
        } else if (v == 1) ((p = lt), (m = dt), (h = 9), (g = 5));
        else if (v == 2) {
          var S = pt(e, d, 31) + 257,
            C = pt(e, d + 10, 15) + 4,
            w = S + pt(e, d + 5, 31) + 1;
          d += 14;
          for (var T = new Ue(w), E = new Ue(19), D = 0; D < C; ++D) E[Je[D]] = pt(e, d + D * 3, 7);
          d += C * 3;
          for (var O = ft(E), ee = (1 << O) - 1, k = at(E, O, 1), D = 0; D < w; ) {
            var te = k[pt(e, d, ee)];
            d += te & 15;
            var y = te >> 4;
            if (y < 16) T[D++] = y;
            else {
              var ne = 0,
                re = 0;
              for (
                y == 16
                  ? ((re = 3 + pt(e, d, 3)), (d += 2), (ne = T[D - 1]))
                  : y == 17
                    ? ((re = 3 + pt(e, d, 7)), (d += 3))
                    : y == 18 && ((re = 11 + pt(e, d, 127)), (d += 7));
                re--;
              )
                T[D++] = ne;
            }
          }
          var ie = T.subarray(0, S),
            A = T.subarray(S);
          ((h = ft(ie)), (g = ft(A)), (p = at(ie, h, 1)), (m = at(A, g, 1)));
        } else vt(1);
        if (d > _) {
          c && vt(0);
          break;
        }
      }
      s && l(f + 131072);
      for (var ae = (1 << h) - 1, oe = (1 << g) - 1, j = d; ; j = d) {
        var ne = p[mt(e, d) & ae],
          M = ne >> 4;
        if (((d += ne & 15), d > _)) {
          c && vt(0);
          break;
        }
        if ((ne || vt(2), M < 256)) n[f++] = M;
        else if (M == 256) {
          ((j = d), (p = null));
          break;
        } else {
          var se = M - 254;
          if (M > 264) {
            var D = M - 257,
              ce = Ke[D];
            ((se = pt(e, d, (1 << ce) - 1) + Ze[D]), (d += ce));
          }
          var N = m[mt(e, d) & oe],
            P = N >> 4;
          (N || vt(3), (d += N & 15));
          var A = et[P];
          if (P > 3) {
            var ce = qe[P];
            ((A += mt(e, d) & ((1 << ce) - 1)), (d += ce));
          }
          if (d > _) {
            c && vt(0);
            break;
          }
          s && l(f + 131072);
          var le = f + se;
          if (f < A) {
            var ue = a - A,
              de = Math.min(A, le);
            for (ue + f < 0 && vt(3); f < de; ++f) n[f] = r[ue + f];
          }
          for (; f < le; ++f) n[f] = n[f - A];
        }
      }
      ((t.l = p), (t.p = j), (t.b = f), (t.f = u), p && ((u = 1), (t.m = h), (t.d = m), (t.n = g)));
    } while (!u);
    return f != n.length && o ? gt(n, 0, f) : n.subarray(0, f);
  },
  bt = function (e, t, n) {
    n <<= t & 7;
    var r = (t / 8) | 0;
    ((e[r] |= n), (e[r + 1] |= n >> 8));
  },
  xt = function (e, t, n) {
    n <<= t & 7;
    var r = (t / 8) | 0;
    ((e[r] |= n), (e[r + 1] |= n >> 8), (e[r + 2] |= n >> 16));
  },
  St = function (e, t) {
    for (var n = [], r = 0; r < e.length; ++r) e[r] && n.push({ s: r, f: e[r] });
    var i = n.length,
      a = n.slice();
    if (!i) return { t: kt, l: 0 };
    if (i == 1) {
      var o = new Ue(n[0].s + 1);
      return ((o[n[0].s] = 1), { t: o, l: 1 });
    }
    (n.sort(function (e, t) {
      return e.f - t.f;
    }),
      n.push({ s: -1, f: 25001 }));
    var s = n[0],
      c = n[1],
      l = 0,
      u = 1,
      d = 2;
    for (n[0] = { s: -1, f: s.f + c.f, l: s, r: c }; u != i - 1; )
      ((s = n[n[l].f < n[d].f ? l++ : d++]),
        (c = n[l != u && n[l].f < n[d].f ? l++ : d++]),
        (n[u++] = { s: -1, f: s.f + c.f, l: s, r: c }));
    for (var f = a[0].s, r = 1; r < i; ++r) a[r].s > f && (f = a[r].s);
    var p = new We(f + 1),
      m = Ct(n[u - 1], p, 0);
    if (m > t) {
      var r = 0,
        h = 0,
        g = m - t,
        _ = 1 << g;
      for (
        a.sort(function (e, t) {
          return p[t.s] - p[e.s] || e.f - t.f;
        });
        r < i;
        ++r
      ) {
        var v = a[r].s;
        if (p[v] > t) ((h += _ - (1 << (m - p[v]))), (p[v] = t));
        else break;
      }
      for (h >>= g; h > 0; ) {
        var y = a[r].s;
        p[y] < t ? (h -= 1 << (t - p[y]++ - 1)) : ++r;
      }
      for (; r >= 0 && h; --r) {
        var b = a[r].s;
        p[b] == t && (--p[b], ++h);
      }
      m = t;
    }
    return { t: new Ue(p), l: m };
  },
  Ct = function (e, t, n) {
    return e.s == -1 ? Math.max(Ct(e.l, t, n + 1), Ct(e.r, t, n + 1)) : (t[e.s] = n);
  },
  wt = function (e) {
    for (var t = e.length; t && !e[--t]; );
    for (
      var n = new We(++t),
        r = 0,
        i = e[0],
        a = 1,
        o = function (e) {
          n[r++] = e;
        },
        s = 1;
      s <= t;
      ++s
    )
      if (e[s] == i && s != t) ++a;
      else {
        if (!i && a > 2) {
          for (; a > 138; a -= 138) o(32754);
          a > 2 && (o(a > 10 ? ((a - 11) << 5) | 28690 : ((a - 3) << 5) | 12305), (a = 0));
        } else if (a > 3) {
          for (o(i), --a; a > 6; a -= 6) o(8304);
          a > 2 && (o(((a - 3) << 5) | 8208), (a = 0));
        }
        for (; a--; ) o(i);
        ((a = 1), (i = e[s]));
      }
    return { c: n.subarray(0, r), n: t };
  },
  Tt = function (e, t) {
    for (var n = 0, r = 0; r < t.length; ++r) n += e[r] * t[r];
    return n;
  },
  Et = function (e, t, n) {
    var r = n.length,
      i = ht(t + 2);
    ((e[i] = r & 255), (e[i + 1] = r >> 8), (e[i + 2] = e[i] ^ 255), (e[i + 3] = e[i + 1] ^ 255));
    for (var a = 0; a < r; ++a) e[i + a + 4] = n[a];
    return (i + 4 + r) * 8;
  },
  Dt = function (e, t, n, r, i, a, o, s, c, l, u) {
    (bt(t, u++, n), ++i[256]);
    for (
      var d = St(i, 15),
        f = d.t,
        p = d.l,
        m = St(a, 15),
        h = m.t,
        g = m.l,
        _ = wt(f),
        v = _.c,
        y = _.n,
        b = wt(h),
        x = b.c,
        S = b.n,
        C = new We(19),
        w = 0;
      w < v.length;
      ++w
    )
      ++C[v[w] & 31];
    for (var w = 0; w < x.length; ++w) ++C[x[w] & 31];
    for (var T = St(C, 7), E = T.t, D = T.l, O = 19; O > 4 && !E[Je[O - 1]]; --O);
    var ee = (l + 5) << 3,
      k = Tt(i, ot) + Tt(a, st) + o,
      te = Tt(i, f) + Tt(a, h) + o + 14 + 3 * O + Tt(C, E) + 2 * C[16] + 3 * C[17] + 7 * C[18];
    if (c >= 0 && ee <= k && ee <= te) return Et(t, u, e.subarray(c, c + l));
    var ne, re, ie, A;
    if ((bt(t, u, 1 + (te < k)), (u += 2), te < k)) {
      ((ne = at(f, p, 0)), (re = f), (ie = at(h, g, 0)), (A = h));
      var ae = at(E, D, 0);
      (bt(t, u, y - 257), bt(t, u + 5, S - 1), bt(t, u + 10, O - 4), (u += 14));
      for (var w = 0; w < O; ++w) bt(t, u + 3 * w, E[Je[w]]);
      u += 3 * O;
      for (var oe = [v, x], j = 0; j < 2; ++j)
        for (var M = oe[j], w = 0; w < M.length; ++w) {
          var se = M[w] & 31;
          (bt(t, u, ae[se]),
            (u += E[se]),
            se > 15 && (bt(t, u, (M[w] >> 5) & 127), (u += M[w] >> 12)));
        }
    } else ((ne = ct), (re = ot), (ie = ut), (A = st));
    for (var w = 0; w < s; ++w) {
      var ce = r[w];
      if (ce > 255) {
        var se = (ce >> 18) & 31;
        (xt(t, u, ne[se + 257]),
          (u += re[se + 257]),
          se > 7 && (bt(t, u, (ce >> 23) & 31), (u += Ke[se])));
        var N = ce & 31;
        (xt(t, u, ie[N]), (u += A[N]), N > 3 && (xt(t, u, (ce >> 5) & 8191), (u += qe[N])));
      } else (xt(t, u, ne[ce]), (u += re[ce]));
    }
    return (xt(t, u, ne[256]), u + re[256]);
  },
  Ot = new Ge([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]),
  kt = new Ue(0),
  At = function (e, t, n, r, i, a) {
    var o = a.z || e.length,
      s = new Ue(r + o + 5 * (1 + Math.ceil(o / 7e3)) + i),
      c = s.subarray(r, s.length - i),
      l = a.l,
      u = (a.r || 0) & 7;
    if (t) {
      u && (c[0] = a.r >> 3);
      for (
        var d = Ot[t - 1],
          f = d >> 13,
          p = d & 8191,
          m = (1 << n) - 1,
          h = a.p || new We(32768),
          g = a.h || new We(m + 1),
          _ = Math.ceil(n / 3),
          v = 2 * _,
          y = function (t) {
            return (e[t] ^ (e[t + 1] << _) ^ (e[t + 2] << v)) & m;
          },
          b = new Ge(25e3),
          x = new We(288),
          S = new We(32),
          C = 0,
          w = 0,
          T = a.i || 0,
          E = 0,
          D = a.w || 0,
          O = 0;
        T + 2 < o;
        ++T
      ) {
        var ee = y(T),
          k = T & 32767,
          te = g[ee];
        if (((h[k] = te), (g[ee] = k), D <= T)) {
          var ne = o - T;
          if ((C > 7e3 || E > 24576) && (ne > 423 || !l)) {
            ((u = Dt(e, c, 0, b, x, S, w, E, O, T - O, u)), (E = C = w = 0), (O = T));
            for (var re = 0; re < 286; ++re) x[re] = 0;
            for (var re = 0; re < 30; ++re) S[re] = 0;
          }
          var ie = 2,
            A = 0,
            ae = p,
            oe = (k - te) & 32767;
          if (ne > 2 && ee == y(T - oe))
            for (
              var j = Math.min(f, ne) - 1, M = Math.min(32767, T), se = Math.min(258, ne);
              oe <= M && --ae && k != te;
            ) {
              if (e[T + ie] == e[T + ie - oe]) {
                for (var ce = 0; ce < se && e[T + ce] == e[T + ce - oe]; ++ce);
                if (ce > ie) {
                  if (((ie = ce), (A = oe), ce > j)) break;
                  for (var N = Math.min(oe, ce - 2), P = 0, re = 0; re < N; ++re) {
                    var le = (T - oe + re) & 32767,
                      ue = (le - h[le]) & 32767;
                    ue > P && ((P = ue), (te = le));
                  }
                }
              }
              ((k = te), (te = h[k]), (oe += (k - te) & 32767));
            }
          if (A) {
            b[E++] = 268435456 | (Qe[ie] << 18) | tt[A];
            var de = Qe[ie] & 31,
              fe = tt[A] & 31;
            ((w += Ke[de] + qe[fe]), ++x[257 + de], ++S[fe], (D = T + ie), ++C);
          } else ((b[E++] = e[T]), ++x[e[T]]);
        }
      }
      for (T = Math.max(T, D); T < o; ++T) ((b[E++] = e[T]), ++x[e[T]]);
      ((u = Dt(e, c, l, b, x, S, w, E, O, T - O, u)),
        l ||
          ((a.r = (u & 7) | (c[(u / 8) | 0] << 3)),
          (u -= 7),
          (a.h = g),
          (a.p = h),
          (a.i = T),
          (a.w = D)));
    } else {
      for (var T = a.w || 0; T < o + l; T += 65535) {
        var pe = T + 65535;
        (pe >= o && ((c[(u / 8) | 0] = l), (pe = o)), (u = Et(c, u + 1, e.subarray(T, pe))));
      }
      a.i = o;
    }
    return gt(s, 0, r + ht(u) + i);
  },
  jt = (function () {
    for (var e = new Int32Array(256), t = 0; t < 256; ++t) {
      for (var n = t, r = 9; --r; ) n = (n & 1 && -306674912) ^ (n >>> 1);
      e[t] = n;
    }
    return e;
  })(),
  Mt = function () {
    var e = -1;
    return {
      p: function (t) {
        for (var n = e, r = 0; r < t.length; ++r) n = jt[(n & 255) ^ t[r]] ^ (n >>> 8);
        e = n;
      },
      d: function () {
        return ~e;
      },
    };
  },
  Nt = function (e, t, n, r, i) {
    if (!i && ((i = { l: 1 }), t.dictionary)) {
      var a = t.dictionary.subarray(-32768),
        o = new Ue(a.length + e.length);
      (o.set(a), o.set(e, a.length), (e = o), (i.w = a.length));
    }
    return At(
      e,
      t.level == null ? 6 : t.level,
      t.mem == null
        ? i.l
          ? Math.ceil(Math.max(8, Math.min(13, Math.log(e.length))) * 1.5)
          : 20
        : 12 + t.mem,
      n,
      r,
      i
    );
  },
  Pt = function (e, t) {
    var n = {};
    for (var r in e) n[r] = e[r];
    for (var r in t) n[r] = t[r];
    return n;
  },
  Ft = function (e, t, n) {
    for (
      var r = e(),
        i = e.toString(),
        a = i
          .slice(i.indexOf(`[`) + 1, i.lastIndexOf(`]`))
          .replace(/\s+/g, ``)
          .split(`,`),
        o = 0;
      o < r.length;
      ++o
    ) {
      var s = r[o],
        c = a[o];
      if (typeof s == `function`) {
        t += `;` + c + `=`;
        var l = s.toString();
        if (s.prototype)
          if (l.indexOf(`[native code]`) != -1) {
            var u = l.indexOf(` `, 8) + 1;
            t += l.slice(u, l.indexOf(`(`, u));
          } else
            for (var d in ((t += l), s.prototype))
              t += `;` + c + `.prototype.` + d + `=` + s.prototype[d].toString();
        else t += l;
      } else n[c] = s;
    }
    return t;
  },
  It = [],
  Lt = function (e) {
    var t = [];
    for (var n in e) e[n].buffer && t.push((e[n] = new e[n].constructor(e[n])).buffer);
    return t;
  },
  Rt = function (e, t, n, r) {
    if (!It[n]) {
      for (var i = ``, a = {}, o = e.length - 1, s = 0; s < o; ++s) i = Ft(e[s], i, a);
      It[n] = { c: Ft(e[o], i, a), e: a };
    }
    var c = Pt({}, It[n].e);
    return He(
      It[n].c +
        `;onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=` +
        t.toString() +
        `}`,
      n,
      c,
      Lt(c),
      r
    );
  },
  zt = function () {
    return [
      Ue,
      We,
      Ge,
      Ke,
      qe,
      Je,
      Ze,
      et,
      lt,
      dt,
      nt,
      _t,
      at,
      ft,
      pt,
      mt,
      ht,
      gt,
      vt,
      yt,
      Zt,
      Vt,
      Ht,
    ];
  },
  Bt = function () {
    return [
      Ue,
      We,
      Ge,
      Ke,
      qe,
      Je,
      Qe,
      tt,
      ct,
      ot,
      ut,
      st,
      nt,
      Ot,
      kt,
      at,
      bt,
      xt,
      St,
      Ct,
      wt,
      Tt,
      Et,
      Dt,
      ht,
      gt,
      At,
      Nt,
      Yt,
      Vt,
    ];
  },
  Vt = function (e) {
    return postMessage(e, [e.buffer]);
  },
  Ht = function (e) {
    return e && { out: e.size && new Ue(e.size), dictionary: e.dictionary };
  },
  Ut = function (e, t, n, r, i, a) {
    var o = Rt(n, r, i, function (e, t) {
      (o.terminate(), a(e, t));
    });
    return (
      o.postMessage([e, t], t.consume ? [e.buffer] : []),
      function () {
        o.terminate();
      }
    );
  },
  Wt = function (e, t) {
    return e[t] | (e[t + 1] << 8);
  },
  Gt = function (e, t) {
    return (e[t] | (e[t + 1] << 8) | (e[t + 2] << 16) | (e[t + 3] << 24)) >>> 0;
  },
  Kt = function (e, t) {
    return Gt(e, t) + Gt(e, t + 4) * 4294967296;
  },
  qt = function (e, t, n) {
    for (; n; ++t) ((e[t] = n), (n >>>= 8));
  };
function Jt(e, t, n) {
  return (
    n || ((n = t), (t = {})),
    typeof n != `function` && vt(7),
    Ut(
      e,
      t,
      [Bt],
      function (e) {
        return Vt(Yt(e.data[0], e.data[1]));
      },
      0,
      n
    )
  );
}
function Yt(e, t) {
  return Nt(e, t || {}, 0, 0);
}
function Xt(e, t, n) {
  return (
    n || ((n = t), (t = {})),
    typeof n != `function` && vt(7),
    Ut(
      e,
      t,
      [zt],
      function (e) {
        return Vt(Zt(e.data[0], Ht(e.data[1])));
      },
      1,
      n
    )
  );
}
function Zt(e, t) {
  return yt(e, { i: 2 }, t && t.out, t && t.dictionary);
}
var Qt = function (e, t, n, r) {
    for (var i in e) {
      var a = e[i],
        o = t + i,
        s = r;
      (Array.isArray(a) && ((s = Pt(r, a[1])), (a = a[0])),
        ArrayBuffer.isView(a)
          ? (n[o] = [a, s])
          : ((n[(o += `/`)] = [new Ue(0), s]), Qt(a, o, n, r)));
    }
  },
  $t = typeof TextEncoder < `u` && new TextEncoder(),
  en = typeof TextDecoder < `u` && new TextDecoder();
try {
  en.decode(kt, { stream: !0 });
} catch {}
var tn = function (e) {
  for (var t = ``, n = 0; ; ) {
    var r = e[n++],
      i = (r > 127) + (r > 223) + (r > 239);
    if (n + i > e.length) return { s: t, r: gt(e, n - 1) };
    i
      ? i == 3
        ? ((r =
            (((r & 15) << 18) | ((e[n++] & 63) << 12) | ((e[n++] & 63) << 6) | (e[n++] & 63)) -
            65536),
          (t += String.fromCharCode(55296 | (r >> 10), 56320 | (r & 1023))))
        : i & 1
          ? (t += String.fromCharCode(((r & 31) << 6) | (e[n++] & 63)))
          : (t += String.fromCharCode(((r & 15) << 12) | ((e[n++] & 63) << 6) | (e[n++] & 63)))
      : (t += String.fromCharCode(r));
  }
};
function nn(e, t) {
  if (t) {
    for (var n = new Ue(e.length), r = 0; r < e.length; ++r) n[r] = e.charCodeAt(r);
    return n;
  }
  if ($t) return $t.encode(e);
  for (
    var i = e.length,
      a = new Ue(e.length + (e.length >> 1)),
      o = 0,
      s = function (e) {
        a[o++] = e;
      },
      r = 0;
    r < i;
    ++r
  ) {
    if (o + 5 > a.length) {
      var c = new Ue(o + 8 + ((i - r) << 1));
      (c.set(a), (a = c));
    }
    var l = e.charCodeAt(r);
    l < 128 || t
      ? s(l)
      : l < 2048
        ? (s(192 | (l >> 6)), s(128 | (l & 63)))
        : l > 55295 && l < 57344
          ? ((l = (65536 + (l & 1047552)) | (e.charCodeAt(++r) & 1023)),
            s(240 | (l >> 18)),
            s(128 | ((l >> 12) & 63)),
            s(128 | ((l >> 6) & 63)),
            s(128 | (l & 63)))
          : (s(224 | (l >> 12)), s(128 | ((l >> 6) & 63)), s(128 | (l & 63)));
  }
  return gt(a, 0, o);
}
function rn(e, t) {
  if (t) {
    for (var n = ``, r = 0; r < e.length; r += 16384)
      n += String.fromCharCode.apply(null, e.subarray(r, r + 16384));
    return n;
  } else if (en) return en.decode(e);
  else {
    var i = tn(e),
      a = i.s,
      n = i.r;
    return (n.length && vt(8), a);
  }
}
var an = function (e, t) {
    return t + 30 + Wt(e, t + 26) + Wt(e, t + 28);
  },
  on = function (e, t, n) {
    var r = Wt(e, t + 28),
      i = Wt(e, t + 30),
      a = rn(e.subarray(t + 46, t + 46 + r), !(Wt(e, t + 8) & 2048)),
      o = t + 46 + r,
      s = sn(e, o, i, n, Gt(e, t + 20), Gt(e, t + 24), Gt(e, t + 42)),
      c = s[0],
      l = s[1],
      u = s[2];
    return [Wt(e, t + 10), c, l, a, o + i + Wt(e, t + 32), u];
  },
  sn = function (e, t, n, r, i, a, o) {
    var s = i == 4294967295,
      c = a == 4294967295,
      l = o == 4294967295,
      u = t + n,
      d = s + c + l;
    if (r && d) {
      for (; t + 4 < u; t += 4 + Wt(e, t + 2))
        if (Wt(e, t) == 1)
          return [
            s ? Kt(e, t + 4 + 8 * c) : i,
            c ? Kt(e, t + 4) : a,
            l ? Kt(e, t + 4 + 8 * (c + s)) : o,
            1,
          ];
      r < 2 && vt(13);
    }
    return [i, a, o, 0];
  },
  cn = function (e) {
    var t = 0;
    if (e)
      for (var n in e) {
        var r = e[n].length;
        (r > 65535 && vt(9), (t += r + 4));
      }
    return t;
  },
  ln = function (e, t, n, r, i, a, o, s) {
    var c = r.length,
      l = n.extra,
      u = s && s.length,
      d = cn(l);
    (qt(e, t, o == null ? 67324752 : 33639248),
      (t += 4),
      o != null && ((e[t++] = 20), (e[t++] = n.os)),
      (e[t] = 20),
      (t += 2),
      (e[t++] = (n.flag << 1) | (a < 0 && 8)),
      (e[t++] = i && 8),
      (e[t++] = n.compression & 255),
      (e[t++] = n.compression >> 8));
    var f = new Date(n.mtime == null ? Date.now() : n.mtime),
      p = f.getFullYear() - 1980;
    if (
      ((p < 0 || p > 119) && vt(10),
      qt(
        e,
        t,
        (p << 25) |
          ((f.getMonth() + 1) << 21) |
          (f.getDate() << 16) |
          (f.getHours() << 11) |
          (f.getMinutes() << 5) |
          (f.getSeconds() >> 1)
      ),
      (t += 4),
      a != -1 && (qt(e, t, n.crc), qt(e, t + 4, a < 0 ? -a - 2 : a), qt(e, t + 8, n.size)),
      qt(e, t + 12, c),
      qt(e, t + 14, d),
      (t += 16),
      o != null && (qt(e, t, u), qt(e, t + 6, n.attrs), qt(e, t + 10, o), (t += 14)),
      e.set(r, t),
      (t += c),
      d)
    )
      for (var m in l) {
        var h = l[m],
          g = h.length;
        (qt(e, t, +m), qt(e, t + 2, g), e.set(h, t + 4), (t += 4 + g));
      }
    return (u && (e.set(s, t), (t += u)), t);
  },
  un = function (e, t, n, r, i) {
    (qt(e, t, 101010256), qt(e, t + 8, n), qt(e, t + 10, n), qt(e, t + 12, r), qt(e, t + 16, i));
  };
function dn(e, t, n) {
  (n || ((n = t), (t = {})), typeof n != `function` && vt(7));
  var r = {};
  Qt(e, ``, r, t);
  var i = Object.keys(r),
    a = i.length,
    o = 0,
    s = 0,
    c = a,
    l = Array(a),
    u = [],
    d = function () {
      for (var e = 0; e < u.length; ++e) u[e]();
    },
    f = function (e, t) {
      fn(function () {
        n(e, t);
      });
    };
  fn(function () {
    f = n;
  });
  var p = function () {
    var e = new Ue(s + 22),
      t = o,
      n = s - o;
    s = 0;
    for (var r = 0; r < c; ++r) {
      var i = l[r];
      try {
        var a = i.c.length;
        ln(e, s, i, i.f, i.u, a);
        var u = 30 + i.f.length + cn(i.extra),
          d = s + u;
        (e.set(i.c, d),
          ln(e, o, i, i.f, i.u, a, s, i.m),
          (o += 16 + u + (i.m ? i.m.length : 0)),
          (s = d + a));
      } catch (e) {
        return f(e, null);
      }
    }
    (un(e, o, l.length, n, t), f(null, e));
  };
  a || p();
  for (
    var m = function (e) {
        var t = i[e],
          n = r[t],
          c = n[0],
          m = n[1],
          h = Mt(),
          g = c.length;
        h.p(c);
        var _ = nn(t),
          v = _.length,
          y = m.comment,
          b = y && nn(y),
          x = b && b.length,
          S = cn(m.extra),
          C = m.level == 0 ? 0 : 8,
          w = function (n, r) {
            if (n) (d(), f(n, null));
            else {
              var i = r.length;
              ((l[e] = Pt(m, {
                size: g,
                crc: h.d(),
                c: r,
                f: _,
                m: b,
                u: v != t.length || (b && y.length != x),
                compression: C,
              })),
                (o += 30 + v + S + i),
                (s += 76 + 2 * (v + S) + (x || 0) + i),
                --a || p());
            }
          };
        if ((v > 65535 && w(vt(11, 0, 1), null), !C)) w(null, c);
        else if (g < 16e4)
          try {
            w(null, Yt(c, m));
          } catch (e) {
            w(e, null);
          }
        else u.push(Jt(c, m, w));
      },
      h = 0;
    h < c;
    ++h
  )
    m(h);
  return d;
}
var fn =
  typeof queueMicrotask == `function`
    ? queueMicrotask
    : typeof setTimeout == `function`
      ? setTimeout
      : function (e) {
          e();
        };
function pn(e, t, n) {
  (n || ((n = t), (t = {})), typeof n != `function` && vt(7));
  var r = [],
    i = function () {
      for (var e = 0; e < r.length; ++e) r[e]();
    },
    a = {},
    o = function (e, t) {
      fn(function () {
        n(e, t);
      });
    };
  fn(function () {
    o = n;
  });
  for (var s = e.length - 22; Gt(e, s) != 101010256; --s)
    if (!s || e.length - s > 65558) return (o(vt(13, 0, 1), null), i);
  var c = Wt(e, s + 8);
  if (c) {
    var l = c,
      u = Gt(e, s + 16),
      d = Gt(e, s - 20) == 117853008;
    if (d) {
      var f = Gt(e, s - 12);
      ((d = Gt(e, f) == 101075792), d && ((l = c = Gt(e, f + 32)), (u = Gt(e, f + 48))));
    }
    for (
      var p = t && t.filter,
        m = function (t) {
          var n = on(e, u, d),
            s = n[0],
            l = n[1],
            f = n[2],
            m = n[3],
            h = n[4],
            g = n[5],
            _ = an(e, g);
          u = h;
          var v = function (e, t) {
            e ? (i(), o(e, null)) : (t && (a[m] = t), --c || o(null, a));
          };
          if (!p || p({ name: m, size: l, originalSize: f, compression: s }))
            if (!s) v(null, gt(e, _, _ + l));
            else if (s == 8) {
              var y = e.subarray(_, _ + l);
              if (f < 524288 || l > 0.8 * f)
                try {
                  v(null, Zt(y, { out: new Ue(f) }));
                } catch (e) {
                  v(e, null);
                }
              else r.push(Xt(y, { size: f }, v));
            } else v(vt(14, `unknown compression type ` + s, 1), null);
          else v(null, null);
        },
        h = 0;
      h < l;
      ++h
    )
      m(h);
  } else o(null, {});
  return i;
}
function mn(e) {
  return (Array.isArray(e) ? e : e.issues).reduce(
    (e, t) => {
      if (t.path) {
        let n = t.path.map(({ key: e }) => e).join(`.`);
        e.nested[n] = [...(e.nested[n] || []), t.message];
      } else e.root = [...(e.root || []), t.message];
      return e;
    },
    { nested: {} }
  );
}
var hn = class extends Error {
  issues;
  constructor(e) {
    (super(e[0].message), (this.name = `ValiError`), (this.issues = e));
  }
};
function gn(e, t) {
  return {
    reason: e?.reason,
    validation: t.validation,
    origin: e?.origin || `value`,
    message: t.message,
    input: t.input,
    abortEarly: e?.abortEarly,
    abortPipeEarly: e?.abortPipeEarly,
  };
}
function _n(e, t) {
  return {
    reason: t,
    origin: e?.origin,
    abortEarly: e?.abortEarly,
    abortPipeEarly: e?.abortPipeEarly,
  };
}
function vn(e, t, n, r) {
  if (!t || !t.length) return { output: e };
  let i,
    a,
    o = e;
  for (let e of t) {
    let t = e(o);
    if (t.issue) {
      i ||= _n(n, r);
      let e = gn(i, t.issue);
      if ((a ? a.push(e) : (a = [e]), i.abortEarly || i.abortPipeEarly)) break;
    } else o = t.output;
  }
  return a ? { issues: a } : { output: o };
}
function yn(e, t) {
  return !e || typeof e == `string` ? [e, t] : [void 0, e];
}
function bn(e, t, n, r, i, a) {
  return {
    issues: [
      {
        reason: t,
        validation: n,
        origin: e?.origin || `value`,
        message: r,
        input: i,
        issues: a,
        abortEarly: e?.abortEarly,
        abortPipeEarly: e?.abortPipeEarly,
      },
    ],
  };
}
function xn(e = []) {
  return {
    schema: `any`,
    async: !1,
    _parse(t, n) {
      return vn(t, e, n, `any`);
    },
  };
}
function L(e, t, n) {
  let [r, i] = yn(t, n);
  return {
    schema: `array`,
    array: { item: e },
    async: !1,
    _parse(t, n) {
      if (!Array.isArray(t)) return bn(n, `type`, `array`, r || `Invalid type`, t);
      let a,
        o = [];
      for (let r = 0; r < t.length; r++) {
        let i = t[r],
          s = e._parse(i, n);
        if (s.issues) {
          let e = { schema: `array`, input: t, key: r, value: i };
          for (let t of s.issues) (t.path ? t.path.unshift(e) : (t.path = [e]), a?.push(t));
          if (((a ||= s.issues), n?.abortEarly)) break;
        } else o.push(s.output);
      }
      return a ? { issues: a } : vn(o, i, n, `array`);
    },
  };
}
function Sn(e, t) {
  let [n, r] = yn(e, t);
  return {
    schema: `boolean`,
    async: !1,
    _parse(e, t) {
      return typeof e == `boolean`
        ? vn(e, r, t, `boolean`)
        : bn(t, `type`, `boolean`, n || `Invalid type`, e);
    },
  };
}
function R(e, t) {
  return {
    schema: `literal`,
    literal: e,
    async: !1,
    _parse(n, r) {
      return n === e ? { output: n } : bn(r, `type`, `literal`, t || `Invalid type`, n);
    },
  };
}
function Cn(e, t) {
  return {
    schema: `native_enum`,
    nativeEnum: e,
    async: !1,
    _parse(n, r) {
      return Object.values(e).includes(n)
        ? { output: n }
        : bn(r, `type`, `native_enum`, t || `Invalid type`, n);
    },
  };
}
function z(e, t) {
  let [n, r] = yn(e, t);
  return {
    schema: `number`,
    async: !1,
    _parse(e, t) {
      return typeof e == `number`
        ? vn(e, r, t, `number`)
        : bn(t, `type`, `number`, n || `Invalid type`, e);
    },
  };
}
function B(e, t, n) {
  let [r, i] = yn(t, n),
    a;
  return {
    schema: `object`,
    object: e,
    async: !1,
    _parse(t, n) {
      if (!t || typeof t != `object`) return bn(n, `type`, `object`, r || `Invalid type`, t);
      a ||= Object.entries(e);
      let o,
        s = {};
      for (let [e, r] of a) {
        let i = t[e],
          a = r._parse(i, n);
        if (a.issues) {
          let r = { schema: `object`, input: t, key: e, value: i };
          for (let e of a.issues) (e.path ? e.path.unshift(r) : (e.path = [r]), o?.push(e));
          if (((o ||= a.issues), n?.abortEarly)) break;
        } else s[e] = a.output;
      }
      return o ? { issues: o } : vn(s, i, n, `object`);
    },
  };
}
function V(e) {
  return {
    schema: `optional`,
    wrapped: e,
    async: !1,
    _parse(t, n) {
      return t === void 0 ? { output: t } : e._parse(t, n);
    },
  };
}
function H(e, t) {
  let [n, r] = yn(e, t);
  return {
    schema: `string`,
    async: !1,
    _parse(e, t) {
      return typeof e == `string`
        ? vn(e, r, t, `string`)
        : bn(t, `type`, `string`, n || `Invalid type`, e);
    },
  };
}
function wn(e, t, n, r) {
  if (typeof t == `object` && !Array.isArray(t)) {
    let [i, a] = yn(n, r);
    return [e, t, i, a];
  }
  let [i, a] = yn(t, n);
  return [H(), e, i, a];
}
var Tn = [`__proto__`, `prototype`, `constructor`];
function En(e, t, n, r) {
  let [i, a, o, s] = wn(e, t, n, r);
  return {
    schema: `record`,
    record: { key: i, value: a },
    async: !1,
    _parse(e, t) {
      if (!e || typeof e != `object`) return bn(t, `type`, `record`, o || `Invalid type`, e);
      let n,
        r = {};
      for (let [o, s] of Object.entries(e))
        if (!Tn.includes(o)) {
          let c,
            l = i._parse(o, {
              origin: `key`,
              abortEarly: t?.abortEarly,
              abortPipeEarly: t?.abortPipeEarly,
            });
          if (l.issues) {
            c = { schema: `record`, input: e, key: o, value: s };
            for (let e of l.issues) ((e.path = [c]), n?.push(e));
            if (((n ||= l.issues), t?.abortEarly)) break;
          }
          let u = a._parse(s, t);
          if (u.issues) {
            c ||= { schema: `record`, input: e, key: o, value: s };
            for (let e of u.issues) (e.path ? e.path.unshift(c) : (e.path = [c]), n?.push(e));
            if (((n ||= u.issues), t?.abortEarly)) break;
          }
          !l.issues && !u.issues && (r[l.output] = u.output);
        }
      return n ? { issues: n } : vn(r, s, t, `record`);
    },
  };
}
function Dn(e, t) {
  return {
    schema: `union`,
    union: e,
    async: !1,
    _parse(n, r) {
      let i, a;
      for (let t of e) {
        let e = t._parse(n, r);
        if (e.issues)
          if (i) for (let t of e.issues) i.push(t);
          else i = e.issues;
        else {
          a = [e.output];
          break;
        }
      }
      return a ? { output: a[0] } : bn(r, `type`, `union`, t || `Invalid type`, n, i);
    },
  };
}
function On(e, t, n) {
  let r = e._parse(t, n);
  return r.issues
    ? { success: !1, error: new hn(r.issues), issues: r.issues }
    : { success: !0, data: r.output, output: r.output };
}
var kn = Object.create,
  An = Object.defineProperty,
  jn = Object.getOwnPropertyDescriptor,
  Mn = Object.getOwnPropertyNames,
  Nn = Object.getPrototypeOf,
  Pn = Object.prototype.hasOwnProperty,
  Fn = (e, t, n) =>
    t in e ? An(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (e[t] = n),
  In = (e, t) =>
    function () {
      return (t || (0, e[Mn(e)[0]])((t = { exports: {} }).exports, t), t.exports);
    },
  Ln = (e, t, n, r) => {
    if ((t && typeof t == `object`) || typeof t == `function`)
      for (let i of Mn(t))
        !Pn.call(e, i) &&
          i !== n &&
          An(e, i, { get: () => t[i], enumerable: !(r = jn(t, i)) || r.enumerable });
    return e;
  },
  Rn = (e, t, n) => (
    (n = e == null ? {} : kn(Nn(e))),
    Ln(t || !e || !e.__esModule ? An(n, `default`, { value: e, enumerable: !0 }) : n, e)
  ),
  U = (e, t, n) => Fn(e, typeof t == `symbol` ? t : t + ``, n),
  zn = In({
    '../../node_modules/.pnpm/ieee754@1.2.1/node_modules/ieee754/index.js'(e) {
      ((e.read = function (e, t, n, r, i) {
        var a,
          o,
          s = i * 8 - r - 1,
          c = (1 << s) - 1,
          l = c >> 1,
          u = -7,
          d = n ? i - 1 : 0,
          f = n ? -1 : 1,
          p = e[t + d];
        for (
          d += f, a = p & ((1 << -u) - 1), p >>= -u, u += s;
          u > 0;
          a = a * 256 + e[t + d], d += f, u -= 8
        );
        for (
          o = a & ((1 << -u) - 1), a >>= -u, u += r;
          u > 0;
          o = o * 256 + e[t + d], d += f, u -= 8
        );
        if (a === 0) a = 1 - l;
        else if (a === c) return o ? NaN : (p ? -1 : 1) * (1 / 0);
        else ((o += 2 ** r), (a -= l));
        return (p ? -1 : 1) * o * 2 ** (a - r);
      }),
        (e.write = function (e, t, n, r, i, a) {
          var o,
            s,
            c,
            l = a * 8 - i - 1,
            u = (1 << l) - 1,
            d = u >> 1,
            f = i === 23 ? 2 ** -24 - 2 ** -77 : 0,
            p = r ? 0 : a - 1,
            m = r ? 1 : -1,
            h = +(t < 0 || (t === 0 && 1 / t < 0));
          for (
            t = Math.abs(t),
              isNaN(t) || t === 1 / 0
                ? ((s = +!!isNaN(t)), (o = u))
                : ((o = Math.floor(Math.log(t) / Math.LN2)),
                  t * (c = 2 ** -o) < 1 && (o--, (c *= 2)),
                  o + d >= 1 ? (t += f / c) : (t += f * 2 ** (1 - d)),
                  t * c >= 2 && (o++, (c /= 2)),
                  o + d >= u
                    ? ((s = 0), (o = u))
                    : o + d >= 1
                      ? ((s = (t * c - 1) * 2 ** i), (o += d))
                      : ((s = t * 2 ** (d - 1) * 2 ** i), (o = 0)));
            i >= 8;
            e[n + p] = s & 255, p += m, s /= 256, i -= 8
          );
          for (o = (o << i) | s, l += i; l > 0; e[n + p] = o & 255, p += m, o /= 256, l -= 8);
          e[n + p - m] |= h * 128;
        }));
    },
  }),
  Bn = In({
    '../../node_modules/.pnpm/@rgba-image+copy@0.1.3/node_modules/@rgba-image/copy/dist/index.js'(
      e
    ) {
      (Object.defineProperty(e, '__esModule', { value: !0 }),
        (e.copy = void 0),
        (e.copy = (e, t, n = 0, r = 0, i = e.width - n, a = e.height - r, o = 0, s = 0) => {
          if (((n |= 0), (r |= 0), (i |= 0), (a |= 0), (o |= 0), (s |= 0), i <= 0 || a <= 0))
            return;
          let c = new Uint32Array(e.data.buffer),
            l = new Uint32Array(t.data.buffer);
          for (let u = 0; u < a; u++) {
            let a = r + u;
            if (a < 0 || a >= e.height) continue;
            let d = s + u;
            if (!(d < 0 || d >= t.height))
              for (let r = 0; r < i; r++) {
                let i = n + r;
                if (i < 0 || i >= e.width) continue;
                let s = o + r;
                if (s < 0 || s >= t.width) continue;
                let u = a * e.width + i,
                  f = d * t.width + s;
                l[f] = c[u];
              }
          }
        }));
    },
  }),
  Vn = In({
    '../../node_modules/.pnpm/@rgba-image+create-image@0.1.1/node_modules/@rgba-image/create-image/dist/index.js'(
      e
    ) {
      (Object.defineProperty(e, '__esModule', { value: !0 }),
        (e.CreateImageFactory = (e = [0, 0, 0, 0], t = 4) => {
          if (((t = Math.floor(t)), isNaN(t) || t < 1))
            throw TypeError(`channels should be a positive non-zero number`);
          if (!(`length` in e) || e.length < t)
            throw TypeError(`fill should be iterable with at least ${t} members`);
          e = new Uint8ClampedArray(e).slice(0, t);
          let n = e.every((e) => e === 0);
          return (r, i, a) => {
            if (r === void 0 || i === void 0) throw TypeError(`Not enough arguments`);
            if (((r = Math.floor(r)), (i = Math.floor(i)), isNaN(r) || r < 1 || isNaN(i) || i < 1))
              throw TypeError(`Index or size is negative or greater than the allowed amount`);
            let o = r * i * t;
            if ((a === void 0 && (a = new Uint8ClampedArray(o)), a instanceof Uint8ClampedArray)) {
              if (a.length !== o)
                throw TypeError(`Index or size is negative or greater than the allowed amount`);
              if (!n)
                for (let n = 0; n < i; n++)
                  for (let i = 0; i < r; i++) {
                    let o = (n * r + i) * t;
                    for (let n = 0; n < t; n++) a[o + n] = e[n];
                  }
              return {
                get width() {
                  return r;
                },
                get height() {
                  return i;
                },
                get data() {
                  return a;
                },
              };
            }
            throw TypeError(`Expected data to be Uint8ClampedArray or undefined`);
          };
        }),
        (e.createImage = e.CreateImageFactory()));
    },
  }),
  Hn = In({
    '../../node_modules/.pnpm/@rgba-image+lanczos@0.1.1/node_modules/@rgba-image/lanczos/dist/filters.js'(
      e
    ) {
      (Object.defineProperty(e, '__esModule', { value: !0 }), (e.filters = void 0));
      var t = 14,
        n = (e, t) => {
          if (e <= -t || e >= t || e == 0) return 0;
          let n = e * Math.PI;
          return ((Math.sin(n) / n) * Math.sin(n / t)) / (n / t);
        },
        r = (e) => Math.round(e * ((1 << t) - 1));
      e.filters = (e, t, i, a, o) => {
        let s = o ? 2 : 3,
          c = 1 / i,
          l = Math.min(1, i),
          u = s / l,
          d = Math.floor((u + 1) * 2),
          f = new Int16Array((d + 2) * t),
          p = 0;
        for (let i = 0; i < t; i++) {
          let o = (i + 0.5) * c + a,
            d = Math.max(0, Math.floor(o - u)),
            m = Math.min(e - 1, Math.ceil(o + u)),
            h = m - d + 1,
            g = new Float32Array(h),
            _ = new Int16Array(h),
            v = 0,
            y = 0;
          for (let e = d; e <= m; e++) {
            let t = n((e + 0.5 - o) * l, s);
            ((v += t), (g[y] = t), y++);
          }
          let b = 0;
          for (let e = 0; e < g.length; e++) {
            let t = g[e] / v;
            ((b += t), (_[e] = r(t)));
          }
          _[t >> 1] += r(1 - b);
          let x = 0;
          for (; x < _.length && _[x] === 0; ) x++;
          let S = _.length - 1;
          for (; S > 0 && _[S] === 0; ) S--;
          let C = d + x,
            w = S - x + 1;
          ((f[p++] = C), (f[p++] = w), f.set(_.subarray(x, S + 1), p), (p += w));
        }
        return f;
      };
    },
  }),
  Un = In({
    '../../node_modules/.pnpm/@rgba-image+lanczos@0.1.1/node_modules/@rgba-image/lanczos/dist/convolve.js'(
      e
    ) {
      (Object.defineProperty(e, '__esModule', { value: !0 }), (e.convolve = void 0));
      var t = 14;
      e.convolve = (e, n, r, i, a, o) => {
        let s = 0,
          c = 0;
        for (let l = 0; l < i; l++) {
          let u = 0;
          for (let r = 0; r < a; r++) {
            let r = o[u++],
              a = (s + r * 4) | 0,
              l = 0,
              d = 0,
              f = 0,
              p = 0;
            for (let t = o[u++]; t > 0; t--) {
              let t = o[u++];
              ((l = (l + t * e[a]) | 0),
                (d = (d + t * e[a + 1]) | 0),
                (f = (f + t * e[a + 2]) | 0),
                (p = (p + t * e[a + 3]) | 0),
                (a = (a + 4) | 0));
            }
            ((n[c] = (l + 8192) >> t),
              (n[c + 1] = (d + 8192) >> t),
              (n[c + 2] = (f + 8192) >> t),
              (n[c + 3] = (p + 8192) >> t),
              (c = (c + i * 4) | 0));
          }
          ((c = ((l + 1) * 4) | 0), (s = ((l + 1) * r * 4) | 0));
        }
      };
    },
  }),
  Wn = In({
    '../../node_modules/.pnpm/@rgba-image+lanczos@0.1.1/node_modules/@rgba-image/lanczos/dist/index.js'(
      e
    ) {
      (Object.defineProperty(e, '__esModule', { value: !0 }), (e.lanczos2 = e.lanczos = void 0));
      var t = Bn(),
        n = Vn(),
        r = Hn(),
        i = Un(),
        a = (e, t, n = !1) => {
          let a = t.width / e.width,
            o = t.height / e.height,
            s = r.filters(e.width, t.width, a, 0, n),
            c = r.filters(e.height, t.height, o, 0, n),
            l = new Uint8ClampedArray(t.width * e.height * 4);
          (i.convolve(e.data, l, e.width, e.height, t.width, s),
            i.convolve(l, t.data, e.height, t.width, t.height, c));
        };
      ((e.lanczos = (
        e,
        r,
        i = 0,
        o = 0,
        s = e.width - i,
        c = e.height - o,
        l = 0,
        u = 0,
        d = r.width - l,
        f = r.height - u
      ) => {
        if (
          ((i |= 0),
          (o |= 0),
          (s |= 0),
          (c |= 0),
          (l |= 0),
          (u |= 0),
          (d |= 0),
          (f |= 0),
          s <= 0 || c <= 0 || d <= 0 || f <= 0)
        )
          return;
        if (
          i === 0 &&
          o === 0 &&
          s === e.width &&
          c === e.height &&
          l === 0 &&
          u === 0 &&
          d === r.width &&
          f === r.height
        ) {
          a(e, r);
          return;
        }
        let p = n.createImage(s, c),
          m = n.createImage(d, f);
        (t.copy(e, p, i, o), a(p, m), t.copy(m, r, 0, 0, m.width, m.height, l, u));
      }),
        (e.lanczos2 = (
          e,
          r,
          i = 0,
          o = 0,
          s = e.width - i,
          c = e.height - o,
          l = 0,
          u = 0,
          d = r.width - l,
          f = r.height - u
        ) => {
          if (
            ((i |= 0),
            (o |= 0),
            (s |= 0),
            (c |= 0),
            (l |= 0),
            (u |= 0),
            (d |= 0),
            (f |= 0),
            s <= 0 || c <= 0 || d <= 0 || f <= 0)
          )
            return;
          if (
            i === 0 &&
            o === 0 &&
            s === e.width &&
            c === e.height &&
            l === 0 &&
            u === 0 &&
            d === r.width &&
            f === r.height
          ) {
            a(e, r, !0);
            return;
          }
          let p = n.createImage(s, c),
            m = n.createImage(d, f);
          (t.copy(e, p, i, o), a(p, m, !0), t.copy(m, r, 0, 0, m.width, m.height, l, u));
        }));
    },
  });
Rn(zn(), 1);
function Gn(e) {
  return new DataView(e.buffer, e.byteOffset);
}
var Kn = {
    len: 1,
    get(e, t) {
      return Gn(e).getUint8(t);
    },
    put(e, t, n) {
      return (Gn(e).setUint8(t, n), t + 1);
    },
  },
  qn = {
    len: 2,
    get(e, t) {
      return Gn(e).getUint16(t, !0);
    },
    put(e, t, n) {
      return (Gn(e).setUint16(t, n, !0), t + 2);
    },
  },
  Jn = {
    len: 2,
    get(e, t) {
      return Gn(e).getUint16(t);
    },
    put(e, t, n) {
      return (Gn(e).setUint16(t, n), t + 2);
    },
  },
  Yn = {
    len: 4,
    get(e, t) {
      return Gn(e).getUint32(t, !0);
    },
    put(e, t, n) {
      return (Gn(e).setUint32(t, n, !0), t + 4);
    },
  },
  Xn = {
    len: 4,
    get(e, t) {
      return Gn(e).getUint32(t);
    },
    put(e, t, n) {
      return (Gn(e).setUint32(t, n), t + 4);
    },
  },
  Zn = {
    len: 4,
    get(e, t) {
      return Gn(e).getInt32(t);
    },
    put(e, t, n) {
      return (Gn(e).setInt32(t, n), t + 4);
    },
  },
  Qn = {
    len: 8,
    get(e, t) {
      return Gn(e).getBigUint64(t, !0);
    },
    put(e, t, n) {
      return (Gn(e).setBigUint64(t, n, !0), t + 8);
    },
  },
  $n = class {
    constructor(e, t) {
      ((this.len = e), (this.encoding = t), (this.textDecoder = new TextDecoder(t)));
    }
    get(e, t) {
      return this.textDecoder.decode(e.subarray(t, t + this.len));
    }
  },
  er = `End-Of-Stream`,
  tr = class extends Error {
    constructor() {
      super(er);
    }
  },
  nr = class {
    constructor() {
      ((this.maxStreamReadSize = 1 * 1024 * 1024), (this.endOfStream = !1), (this.peekQueue = []));
    }
    async peek(e, t, n) {
      let r = await this.read(e, t, n);
      return (this.peekQueue.push(e.subarray(t, t + r)), r);
    }
    async read(e, t, n) {
      if (n === 0) return 0;
      let r = this.readFromPeekBuffer(e, t, n);
      if (((r += await this.readRemainderFromStream(e, t + r, n - r)), r === 0)) throw new tr();
      return r;
    }
    readFromPeekBuffer(e, t, n) {
      let r = n,
        i = 0;
      for (; this.peekQueue.length > 0 && r > 0; ) {
        let n = this.peekQueue.pop();
        if (!n) throw Error(`peekData should be defined`);
        let a = Math.min(n.length, r);
        (e.set(n.subarray(0, a), t + i),
          (i += a),
          (r -= a),
          a < n.length && this.peekQueue.push(n.subarray(a)));
      }
      return i;
    }
    async readRemainderFromStream(e, t, n) {
      let r = n,
        i = 0;
      for (; r > 0 && !this.endOfStream; ) {
        let n = Math.min(r, this.maxStreamReadSize),
          a = await this.readFromStream(e, t + i, n);
        if (a === 0) break;
        ((i += a), (r -= a));
      }
      return i;
    }
  },
  rr = class extends nr {
    constructor(e) {
      (super(), (this.reader = e.getReader({ mode: `byob` })));
    }
    async readFromStream(e, t, n) {
      if (this.endOfStream) throw new tr();
      let r = await this.reader.read(new Uint8Array(n));
      return (
        r.done && (this.endOfStream = r.done),
        r.value ? (e.set(r.value, t), r.value.byteLength) : 0
      );
    }
    async abort() {
      (await this.reader.cancel(), this.reader.releaseLock());
    }
  },
  ir = class {
    constructor(e) {
      ((this.position = 0),
        (this.numBuffer = new Uint8Array(8)),
        (this.fileInfo = e?.fileInfo ?? {}),
        (this.onClose = e?.onClose),
        e?.abortSignal &&
          e.abortSignal.addEventListener(`abort`, () => {
            this.abort();
          }));
    }
    async readToken(e, t = this.position) {
      let n = new Uint8Array(e.len);
      if ((await this.readBuffer(n, { position: t })) < e.len) throw new tr();
      return e.get(n, 0);
    }
    async peekToken(e, t = this.position) {
      let n = new Uint8Array(e.len);
      if ((await this.peekBuffer(n, { position: t })) < e.len) throw new tr();
      return e.get(n, 0);
    }
    async readNumber(e) {
      if ((await this.readBuffer(this.numBuffer, { length: e.len })) < e.len) throw new tr();
      return e.get(this.numBuffer, 0);
    }
    async peekNumber(e) {
      if ((await this.peekBuffer(this.numBuffer, { length: e.len })) < e.len) throw new tr();
      return e.get(this.numBuffer, 0);
    }
    async ignore(e) {
      if (this.fileInfo.size !== void 0) {
        let t = this.fileInfo.size - this.position;
        if (e > t) return ((this.position += t), t);
      }
      return ((this.position += e), e);
    }
    async close() {
      (await this.abort(), await this.onClose?.());
    }
    normalizeOptions(e, t) {
      if (t && t.position !== void 0 && t.position < this.position)
        throw Error('`options.position` must be equal or greater than `tokenizer.position`');
      return t
        ? {
            mayBeLess: t.mayBeLess === !0,
            offset: t.offset ? t.offset : 0,
            length: t.length ? t.length : e.length - (t.offset ? t.offset : 0),
            position: t.position ? t.position : this.position,
          }
        : { mayBeLess: !1, offset: 0, length: e.length, position: this.position };
    }
    abort() {
      return Promise.resolve();
    }
  },
  ar = 256e3,
  or = class extends ir {
    constructor(e, t) {
      (super(t), (this.streamReader = e));
    }
    async readBuffer(e, t) {
      let n = this.normalizeOptions(e, t),
        r = n.position - this.position;
      if (r > 0) return (await this.ignore(r), this.readBuffer(e, t));
      if (r < 0)
        throw Error('`options.position` must be equal or greater than `tokenizer.position`');
      if (n.length === 0) return 0;
      let i = await this.streamReader.read(e, n.offset, n.length);
      if (((this.position += i), (!t || !t.mayBeLess) && i < n.length)) throw new tr();
      return i;
    }
    async peekBuffer(e, t) {
      let n = this.normalizeOptions(e, t),
        r = 0;
      if (n.position) {
        let t = n.position - this.position;
        if (t > 0) {
          let i = new Uint8Array(n.length + t);
          return (
            (r = await this.peekBuffer(i, { mayBeLess: n.mayBeLess })),
            e.set(i.subarray(t), n.offset),
            r - t
          );
        }
        if (t < 0) throw Error(`Cannot peek from a negative offset in a stream`);
      }
      if (n.length > 0) {
        try {
          r = await this.streamReader.peek(e, n.offset, n.length);
        } catch (e) {
          if (t?.mayBeLess && e instanceof tr) return 0;
          throw e;
        }
        if (!n.mayBeLess && r < n.length) throw new tr();
      }
      return r;
    }
    async ignore(e) {
      let t = Math.min(ar, e),
        n = new Uint8Array(t),
        r = 0;
      for (; r < e; ) {
        let i = e - r,
          a = await this.readBuffer(n, { length: Math.min(t, i) });
        if (a < 0) return a;
        r += a;
      }
      return r;
    }
    abort() {
      return this.streamReader.abort();
    }
  },
  sr = class extends ir {
    constructor(e, t) {
      (super(t),
        (this.uint8Array = e),
        (this.fileInfo.size = this.fileInfo.size ? this.fileInfo.size : e.length));
    }
    async readBuffer(e, t) {
      if (t?.position) {
        if (t.position < this.position)
          throw Error('`options.position` must be equal or greater than `tokenizer.position`');
        this.position = t.position;
      }
      let n = await this.peekBuffer(e, t);
      return ((this.position += n), n);
    }
    async peekBuffer(e, t) {
      let n = this.normalizeOptions(e, t),
        r = Math.min(this.uint8Array.length - n.position, n.length);
      if (!n.mayBeLess && r < n.length) throw new tr();
      return (e.set(this.uint8Array.subarray(n.position, n.position + r), n.offset), r);
    }
    close() {
      return super.close();
    }
  };
function cr(e, t) {
  return new or(new rr(e), t);
}
function lr(e, t) {
  return new sr(e, t);
}
(new globalThis.TextDecoder(`utf8`),
  new globalThis.TextEncoder(),
  Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, `0`)));
function ur(e) {
  let { byteLength: t } = e;
  if (t === 6) return e.getUint16(0) * 2 ** 32 + e.getUint32(2);
  if (t === 5) return e.getUint8(0) * 2 ** 32 + e.getUint32(1);
  if (t === 4) return e.getUint32(0);
  if (t === 3) return e.getUint8(0) * 2 ** 16 + e.getUint16(1);
  if (t === 2) return e.getUint16(0);
  if (t === 1) return e.getUint8(0);
}
function dr(e, t) {
  let n = e.length,
    r = t.length;
  if (r === 0 || r > n) return -1;
  let i = n - r;
  for (let n = 0; n <= i; n++) {
    let i = !0;
    for (let a = 0; a < r; a++)
      if (e[n + a] !== t[a]) {
        i = !1;
        break;
      }
    if (i) return n;
  }
  return -1;
}
function fr(e, t) {
  return dr(e, t) !== -1;
}
function pr(e) {
  return [...e].map((e) => e.charCodeAt(0));
}
function mr(e, t = 0) {
  let n = Number.parseInt(new $n(6).get(e, 148).replace(/\0.*$/, ``).trim(), 8);
  if (Number.isNaN(n)) return !1;
  let r = 256;
  for (let n = t; n < t + 148; n++) r += e[n];
  for (let n = t + 156; n < t + 512; n++) r += e[n];
  return n === r;
}
var hr = {
    get: (e, t) => (e[t + 3] & 127) | (e[t + 2] << 7) | (e[t + 1] << 14) | (e[t] << 21),
    len: 4,
  },
  gr =
    `jpg.png.apng.gif.webp.flif.xcf.cr2.cr3.orf.arw.dng.nef.rw2.raf.tif.bmp.icns.jxr.psd.indd.zip.tar.rar.gz.bz2.7z.dmg.mp4.mid.mkv.webm.mov.avi.mpg.mp2.mp3.m4a.oga.ogg.ogv.opus.flac.wav.spx.amr.pdf.epub.elf.macho.exe.swf.rtf.wasm.woff.woff2.eot.ttf.otf.ico.flv.ps.xz.sqlite.nes.crx.xpi.cab.deb.ar.rpm.Z.lz.cfb.mxf.mts.blend.bpg.docx.pptx.xlsx.3gp.3g2.j2c.jp2.jpm.jpx.mj2.aif.qcp.odt.ods.odp.xml.mobi.heic.cur.ktx.ape.wv.dcm.ics.glb.pcap.dsf.lnk.alias.voc.ac3.m4v.m4p.m4b.f4v.f4p.f4b.f4a.mie.asf.ogm.ogx.mpc.arrow.shp.aac.mp1.it.s3m.xm.ai.skp.avif.eps.lzh.pgp.asar.stl.chm.3mf.zst.jxl.vcf.jls.pst.dwg.parquet.class.arj.cpio.ace.avro.icc.fbx.vsdx.vtt.apk`.split(
      `.`
    ),
  _r =
    `image/jpeg,image/png,image/gif,image/webp,image/flif,image/x-xcf,image/x-canon-cr2,image/x-canon-cr3,image/tiff,image/bmp,image/vnd.ms-photo,image/vnd.adobe.photoshop,application/x-indesign,application/epub+zip,application/x-xpinstall,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-tar,application/x-rar-compressed,application/gzip,application/x-bzip2,application/x-7z-compressed,application/x-apple-diskimage,application/x-apache-arrow,video/mp4,audio/midi,video/x-matroska,video/webm,video/quicktime,video/vnd.avi,audio/wav,audio/qcelp,audio/x-ms-asf,video/x-ms-asf,application/vnd.ms-asf,video/mpeg,video/3gpp,audio/mpeg,audio/mp4,video/ogg,audio/ogg,audio/ogg; codecs=opus,application/ogg,audio/x-flac,audio/ape,audio/wavpack,audio/amr,application/pdf,application/x-elf,application/x-mach-binary,application/x-msdownload,application/x-shockwave-flash,application/rtf,application/wasm,font/woff,font/woff2,application/vnd.ms-fontobject,font/ttf,font/otf,image/x-icon,video/x-flv,application/postscript,application/eps,application/x-xz,application/x-sqlite3,application/x-nintendo-nes-rom,application/x-google-chrome-extension,application/vnd.ms-cab-compressed,application/x-deb,application/x-unix-archive,application/x-rpm,application/x-compress,application/x-lzip,application/x-cfb,application/x-mie,application/mxf,video/mp2t,application/x-blender,image/bpg,image/j2c,image/jp2,image/jpx,image/jpm,image/mj2,audio/aiff,application/xml,application/x-mobipocket-ebook,image/heif,image/heif-sequence,image/heic,image/heic-sequence,image/icns,image/ktx,application/dicom,audio/x-musepack,text/calendar,text/vcard,text/vtt,model/gltf-binary,application/vnd.tcpdump.pcap,audio/x-dsf,application/x.ms.shortcut,application/x.apple.alias,audio/x-voc,audio/vnd.dolby.dd-raw,audio/x-m4a,image/apng,image/x-olympus-orf,image/x-sony-arw,image/x-adobe-dng,image/x-nikon-nef,image/x-panasonic-rw2,image/x-fujifilm-raf,video/x-m4v,video/3gpp2,application/x-esri-shape,audio/aac,audio/x-it,audio/x-s3m,audio/x-xm,video/MP1S,video/MP2P,application/vnd.sketchup.skp,image/avif,application/x-lzh-compressed,application/pgp-encrypted,application/x-asar,model/stl,application/vnd.ms-htmlhelp,model/3mf,image/jxl,application/zstd,image/jls,application/vnd.ms-outlook,image/vnd.dwg,application/x-parquet,application/java-vm,application/x-arj,application/x-cpio,application/x-ace-compressed,application/avro,application/vnd.iccprofile,application/x.autodesk.fbx,application/vnd.visio,application/vnd.android.package-archive`.split(
      `,`
    ),
  vr = 4100;
async function yr(e) {
  return new xr().fromBuffer(e);
}
function br(e, t, n) {
  n = { offset: 0, ...n };
  for (let [r, i] of t.entries())
    if (n.mask) {
      if (i !== (n.mask[r] & e[r + n.offset])) return !1;
    } else if (i !== e[r + n.offset]) return !1;
  return !0;
}
var xr = class {
  constructor(e) {
    ((this.detectors = e?.customDetectors),
      (this.tokenizerOptions = { abortSignal: e?.signal }),
      (this.fromTokenizer = this.fromTokenizer.bind(this)),
      (this.fromBuffer = this.fromBuffer.bind(this)),
      (this.parse = this.parse.bind(this)));
  }
  async fromTokenizer(e) {
    let t = e.position;
    for (let n of this.detectors || []) {
      let r = await n(e);
      if (r) return r;
      if (t !== e.position) return;
    }
    return this.parse(e);
  }
  async fromBuffer(e) {
    if (!(e instanceof Uint8Array || e instanceof ArrayBuffer))
      throw TypeError(
        `Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``
      );
    let t = e instanceof Uint8Array ? e : new Uint8Array(e);
    if (t?.length > 1) return this.fromTokenizer(lr(t, this.tokenizerOptions));
  }
  async fromBlob(e) {
    return this.fromStream(e.stream());
  }
  async fromStream(e) {
    let t = await cr(e, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(t);
    } finally {
      await t.close();
    }
  }
  async toDetectionStream(e, t) {
    let { sampleSize: n = vr } = t,
      r,
      i,
      a = e.getReader({ mode: `byob` });
    try {
      let { value: e, done: t } = await a.read(new Uint8Array(n));
      if (((i = e), !t && e))
        try {
          r = await this.fromBuffer(e.slice(0, n));
        } catch (e) {
          if (!(e instanceof tr)) throw e;
          r = void 0;
        }
      i = e;
    } finally {
      a.releaseLock();
    }
    let o = new TransformStream({
        async start(e) {
          e.enqueue(i);
        },
        transform(e, t) {
          t.enqueue(e);
        },
      }),
      s = e.pipeThrough(o);
    return ((s.fileType = r), s);
  }
  check(e, t) {
    return br(this.buffer, e, t);
  }
  checkString(e, t) {
    return this.check(pr(e), t);
  }
  async parse(e) {
    if (
      ((this.buffer = new Uint8Array(vr)),
      e.fileInfo.size === void 0 && (e.fileInfo.size = 2 ** 53 - 1),
      (this.tokenizer = e),
      await e.peekBuffer(this.buffer, { length: 12, mayBeLess: !0 }),
      this.check([66, 77]))
    )
      return { ext: `bmp`, mime: `image/bmp` };
    if (this.check([11, 119])) return { ext: `ac3`, mime: `audio/vnd.dolby.dd-raw` };
    if (this.check([120, 1])) return { ext: `dmg`, mime: `application/x-apple-diskimage` };
    if (this.check([77, 90])) return { ext: `exe`, mime: `application/x-msdownload` };
    if (this.check([37, 33]))
      return (
        await e.peekBuffer(this.buffer, { length: 24, mayBeLess: !0 }),
        this.checkString(`PS-Adobe-`, { offset: 2 }) && this.checkString(` EPSF-`, { offset: 14 })
          ? { ext: `eps`, mime: `application/eps` }
          : { ext: `ps`, mime: `application/postscript` }
      );
    if (this.check([31, 160]) || this.check([31, 157]))
      return { ext: `Z`, mime: `application/x-compress` };
    if (this.check([199, 113])) return { ext: `cpio`, mime: `application/x-cpio` };
    if (this.check([96, 234])) return { ext: `arj`, mime: `application/x-arj` };
    if (this.check([239, 187, 191])) return (this.tokenizer.ignore(3), this.parse(e));
    if (this.check([71, 73, 70])) return { ext: `gif`, mime: `image/gif` };
    if (this.check([73, 73, 188])) return { ext: `jxr`, mime: `image/vnd.ms-photo` };
    if (this.check([31, 139, 8])) return { ext: `gz`, mime: `application/gzip` };
    if (this.check([66, 90, 104])) return { ext: `bz2`, mime: `application/x-bzip2` };
    if (this.checkString(`ID3`)) {
      await e.ignore(6);
      let t = await e.readToken(hr);
      return e.position + t > e.fileInfo.size
        ? { ext: `mp3`, mime: `audio/mpeg` }
        : (await e.ignore(t), this.fromTokenizer(e));
    }
    if (this.checkString(`MP+`)) return { ext: `mpc`, mime: `audio/x-musepack` };
    if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], { offset: 1 }))
      return { ext: `swf`, mime: `application/x-shockwave-flash` };
    if (this.check([255, 216, 255]))
      return this.check([247], { offset: 3 })
        ? { ext: `jls`, mime: `image/jls` }
        : { ext: `jpg`, mime: `image/jpeg` };
    if (this.check([79, 98, 106, 1])) return { ext: `avro`, mime: `application/avro` };
    if (this.checkString(`FLIF`)) return { ext: `flif`, mime: `image/flif` };
    if (this.checkString(`8BPS`)) return { ext: `psd`, mime: `image/vnd.adobe.photoshop` };
    if (this.checkString(`WEBP`, { offset: 8 })) return { ext: `webp`, mime: `image/webp` };
    if (this.checkString(`MPCK`)) return { ext: `mpc`, mime: `audio/x-musepack` };
    if (this.checkString(`FORM`)) return { ext: `aif`, mime: `audio/aiff` };
    if (this.checkString(`icns`, { offset: 0 })) return { ext: `icns`, mime: `image/icns` };
    if (this.check([80, 75, 3, 4])) {
      try {
        for (; e.position + 30 < e.fileInfo.size; ) {
          await e.readBuffer(this.buffer, { length: 30 });
          let t = new DataView(this.buffer.buffer),
            n = {
              compressedSize: t.getUint32(18, !0),
              uncompressedSize: t.getUint32(22, !0),
              filenameLength: t.getUint16(26, !0),
              extraFieldLength: t.getUint16(28, !0),
            };
          if (
            ((n.filename = await e.readToken(new $n(n.filenameLength, `utf-8`))),
            await e.ignore(n.extraFieldLength),
            /classes\d*\.dex/.test(n.filename))
          )
            return { ext: `apk`, mime: `application/vnd.android.package-archive` };
          if (n.filename === `META-INF/mozilla.rsa`)
            return { ext: `xpi`, mime: `application/x-xpinstall` };
          if (n.filename.endsWith(`.rels`) || n.filename.endsWith(`.xml`))
            switch (n.filename.split(`/`)[0]) {
              case `_rels`:
                break;
              case `word`:
                return {
                  ext: `docx`,
                  mime: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
                };
              case `ppt`:
                return {
                  ext: `pptx`,
                  mime: `application/vnd.openxmlformats-officedocument.presentationml.presentation`,
                };
              case `xl`:
                return {
                  ext: `xlsx`,
                  mime: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
                };
              case `visio`:
                return { ext: `vsdx`, mime: `application/vnd.visio` };
              default:
                break;
            }
          if (n.filename.startsWith(`xl/`))
            return {
              ext: `xlsx`,
              mime: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
            };
          if (n.filename.startsWith(`3D/`) && n.filename.endsWith(`.model`))
            return { ext: `3mf`, mime: `model/3mf` };
          if (n.filename === `mimetype` && n.compressedSize === n.uncompressedSize) {
            let t = await e.readToken(new $n(n.compressedSize, `utf-8`));
            switch (((t = t.trim()), t)) {
              case `application/epub+zip`:
                return { ext: `epub`, mime: `application/epub+zip` };
              case `application/vnd.oasis.opendocument.text`:
                return { ext: `odt`, mime: `application/vnd.oasis.opendocument.text` };
              case `application/vnd.oasis.opendocument.spreadsheet`:
                return { ext: `ods`, mime: `application/vnd.oasis.opendocument.spreadsheet` };
              case `application/vnd.oasis.opendocument.presentation`:
                return { ext: `odp`, mime: `application/vnd.oasis.opendocument.presentation` };
              default:
            }
          }
          if (n.compressedSize === 0) {
            let t = -1;
            for (; t < 0 && e.position < e.fileInfo.size; )
              (await e.peekBuffer(this.buffer, { mayBeLess: !0 }),
                (t = dr(this.buffer, new Uint8Array([80, 75, 3, 4]))),
                await e.ignore(t >= 0 ? t : this.buffer.length));
          } else await e.ignore(n.compressedSize);
        }
      } catch (e) {
        if (!(e instanceof tr)) throw e;
      }
      return { ext: `zip`, mime: `application/zip` };
    }
    if (this.checkString(`OggS`)) {
      await e.ignore(28);
      let t = new Uint8Array(8);
      return (
        await e.readBuffer(t),
        br(t, [79, 112, 117, 115, 72, 101, 97, 100])
          ? { ext: `opus`, mime: `audio/ogg; codecs=opus` }
          : br(t, [128, 116, 104, 101, 111, 114, 97])
            ? { ext: `ogv`, mime: `video/ogg` }
            : br(t, [1, 118, 105, 100, 101, 111, 0])
              ? { ext: `ogm`, mime: `video/ogg` }
              : br(t, [127, 70, 76, 65, 67])
                ? { ext: `oga`, mime: `audio/ogg` }
                : br(t, [83, 112, 101, 101, 120, 32, 32])
                  ? { ext: `spx`, mime: `audio/ogg` }
                  : br(t, [1, 118, 111, 114, 98, 105, 115])
                    ? { ext: `ogg`, mime: `audio/ogg` }
                    : { ext: `ogx`, mime: `application/ogg` }
      );
    }
    if (
      this.check([80, 75]) &&
      (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) &&
      (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8)
    )
      return { ext: `zip`, mime: `application/zip` };
    if (this.checkString(`ftyp`, { offset: 4 }) && this.buffer[8] & 96) {
      let e = new $n(4, `latin1`).get(this.buffer, 8).replace(`\0`, ` `).trim();
      switch (e) {
        case `avif`:
        case `avis`:
          return { ext: `avif`, mime: `image/avif` };
        case `mif1`:
          return { ext: `heic`, mime: `image/heif` };
        case `msf1`:
          return { ext: `heic`, mime: `image/heif-sequence` };
        case `heic`:
        case `heix`:
          return { ext: `heic`, mime: `image/heic` };
        case `hevc`:
        case `hevx`:
          return { ext: `heic`, mime: `image/heic-sequence` };
        case `qt`:
          return { ext: `mov`, mime: `video/quicktime` };
        case `M4V`:
        case `M4VH`:
        case `M4VP`:
          return { ext: `m4v`, mime: `video/x-m4v` };
        case `M4P`:
          return { ext: `m4p`, mime: `video/mp4` };
        case `M4B`:
          return { ext: `m4b`, mime: `audio/mp4` };
        case `M4A`:
          return { ext: `m4a`, mime: `audio/x-m4a` };
        case `F4V`:
          return { ext: `f4v`, mime: `video/mp4` };
        case `F4P`:
          return { ext: `f4p`, mime: `video/mp4` };
        case `F4A`:
          return { ext: `f4a`, mime: `audio/mp4` };
        case `F4B`:
          return { ext: `f4b`, mime: `audio/mp4` };
        case `crx`:
          return { ext: `cr3`, mime: `image/x-canon-cr3` };
        default:
          return e.startsWith(`3g`)
            ? e.startsWith(`3g2`)
              ? { ext: `3g2`, mime: `video/3gpp2` }
              : { ext: `3gp`, mime: `video/3gpp` }
            : { ext: `mp4`, mime: `video/mp4` };
      }
    }
    if (this.checkString(`MThd`)) return { ext: `mid`, mime: `audio/midi` };
    if (
      this.checkString(`wOFF`) &&
      (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString(`OTTO`, { offset: 4 }))
    )
      return { ext: `woff`, mime: `font/woff` };
    if (
      this.checkString(`wOF2`) &&
      (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString(`OTTO`, { offset: 4 }))
    )
      return { ext: `woff2`, mime: `font/woff2` };
    if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212]))
      return { ext: `pcap`, mime: `application/vnd.tcpdump.pcap` };
    if (this.checkString(`DSD `)) return { ext: `dsf`, mime: `audio/x-dsf` };
    if (this.checkString(`LZIP`)) return { ext: `lz`, mime: `application/x-lzip` };
    if (this.checkString(`fLaC`)) return { ext: `flac`, mime: `audio/x-flac` };
    if (this.check([66, 80, 71, 251])) return { ext: `bpg`, mime: `image/bpg` };
    if (this.checkString(`wvpk`)) return { ext: `wv`, mime: `audio/wavpack` };
    if (this.checkString(`%PDF`)) {
      try {
        await e.ignore(1350);
        let t = new Uint8Array(Math.min(10 * 1024 * 1024, e.fileInfo.size));
        if (
          (await e.readBuffer(t, { mayBeLess: !0 }),
          fr(t, new TextEncoder().encode(`AIPrivateData`)))
        )
          return { ext: `ai`, mime: `application/postscript` };
      } catch (e) {
        if (!(e instanceof tr)) throw e;
      }
      return { ext: `pdf`, mime: `application/pdf` };
    }
    if (this.check([0, 97, 115, 109])) return { ext: `wasm`, mime: `application/wasm` };
    if (this.check([73, 73])) {
      let e = await this.readTiffHeader(!1);
      if (e) return e;
    }
    if (this.check([77, 77])) {
      let e = await this.readTiffHeader(!0);
      if (e) return e;
    }
    if (this.checkString(`MAC `)) return { ext: `ape`, mime: `audio/ape` };
    if (this.check([26, 69, 223, 163])) {
      async function t() {
        let t = await e.peekNumber(Kn),
          n = 128,
          r = 0;
        for (; (t & n) === 0 && n !== 0; ) (++r, (n >>= 1));
        let i = new Uint8Array(r + 1);
        return (await e.readBuffer(i), i);
      }
      async function n() {
        let e = await t(),
          n = await t();
        n[0] ^= 128 >> (n.length - 1);
        let r = Math.min(6, n.length),
          i = new DataView(e.buffer),
          a = new DataView(n.buffer, n.length - r, r);
        return { id: ur(i), len: ur(a) };
      }
      async function r(t) {
        for (; t > 0; ) {
          let r = await n();
          if (r.id === 17026) return (await e.readToken(new $n(r.len))).replaceAll(/\00.*$/g, ``);
          (await e.ignore(r.len), --t);
        }
      }
      switch (await r((await n()).len)) {
        case `webm`:
          return { ext: `webm`, mime: `video/webm` };
        case `matroska`:
          return { ext: `mkv`, mime: `video/x-matroska` };
        default:
          return;
      }
    }
    if (this.check([82, 73, 70, 70])) {
      if (this.check([65, 86, 73], { offset: 8 })) return { ext: `avi`, mime: `video/vnd.avi` };
      if (this.check([87, 65, 86, 69], { offset: 8 })) return { ext: `wav`, mime: `audio/wav` };
      if (this.check([81, 76, 67, 77], { offset: 8 })) return { ext: `qcp`, mime: `audio/qcelp` };
    }
    if (this.checkString(`SQLi`)) return { ext: `sqlite`, mime: `application/x-sqlite3` };
    if (this.check([78, 69, 83, 26])) return { ext: `nes`, mime: `application/x-nintendo-nes-rom` };
    if (this.checkString(`Cr24`))
      return { ext: `crx`, mime: `application/x-google-chrome-extension` };
    if (this.checkString(`MSCF`) || this.checkString(`ISc(`))
      return { ext: `cab`, mime: `application/vnd.ms-cab-compressed` };
    if (this.check([237, 171, 238, 219])) return { ext: `rpm`, mime: `application/x-rpm` };
    if (this.check([197, 208, 211, 198])) return { ext: `eps`, mime: `application/eps` };
    if (this.check([40, 181, 47, 253])) return { ext: `zst`, mime: `application/zstd` };
    if (this.check([127, 69, 76, 70])) return { ext: `elf`, mime: `application/x-elf` };
    if (this.check([33, 66, 68, 78])) return { ext: `pst`, mime: `application/vnd.ms-outlook` };
    if (this.checkString(`PAR1`)) return { ext: `parquet`, mime: `application/x-parquet` };
    if (this.check([207, 250, 237, 254]))
      return { ext: `macho`, mime: `application/x-mach-binary` };
    if (this.check([79, 84, 84, 79, 0])) return { ext: `otf`, mime: `font/otf` };
    if (this.checkString(`#!AMR`)) return { ext: `amr`, mime: `audio/amr` };
    if (this.checkString(`{\\rtf`)) return { ext: `rtf`, mime: `application/rtf` };
    if (this.check([70, 76, 86, 1])) return { ext: `flv`, mime: `video/x-flv` };
    if (this.checkString(`IMPM`)) return { ext: `it`, mime: `audio/x-it` };
    if (
      this.checkString(`-lh0-`, { offset: 2 }) ||
      this.checkString(`-lh1-`, { offset: 2 }) ||
      this.checkString(`-lh2-`, { offset: 2 }) ||
      this.checkString(`-lh3-`, { offset: 2 }) ||
      this.checkString(`-lh4-`, { offset: 2 }) ||
      this.checkString(`-lh5-`, { offset: 2 }) ||
      this.checkString(`-lh6-`, { offset: 2 }) ||
      this.checkString(`-lh7-`, { offset: 2 }) ||
      this.checkString(`-lzs-`, { offset: 2 }) ||
      this.checkString(`-lz4-`, { offset: 2 }) ||
      this.checkString(`-lz5-`, { offset: 2 }) ||
      this.checkString(`-lhd-`, { offset: 2 })
    )
      return { ext: `lzh`, mime: `application/x-lzh-compressed` };
    if (this.check([0, 0, 1, 186])) {
      if (this.check([33], { offset: 4, mask: [241] })) return { ext: `mpg`, mime: `video/MP1S` };
      if (this.check([68], { offset: 4, mask: [196] })) return { ext: `mpg`, mime: `video/MP2P` };
    }
    if (this.checkString(`ITSF`)) return { ext: `chm`, mime: `application/vnd.ms-htmlhelp` };
    if (this.check([202, 254, 186, 190])) return { ext: `class`, mime: `application/java-vm` };
    if (this.check([253, 55, 122, 88, 90, 0])) return { ext: `xz`, mime: `application/x-xz` };
    if (this.checkString(`<?xml `)) return { ext: `xml`, mime: `application/xml` };
    if (this.check([55, 122, 188, 175, 39, 28]))
      return { ext: `7z`, mime: `application/x-7z-compressed` };
    if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1))
      return { ext: `rar`, mime: `application/x-rar-compressed` };
    if (this.checkString(`solid `)) return { ext: `stl`, mime: `model/stl` };
    if (this.checkString(`AC`)) {
      let e = new $n(4, `latin1`).get(this.buffer, 2);
      if (e.match(`^d*`) && e >= 1e3 && e <= 1050) return { ext: `dwg`, mime: `image/vnd.dwg` };
    }
    if (this.checkString(`070707`)) return { ext: `cpio`, mime: `application/x-cpio` };
    if (this.checkString(`BLENDER`)) return { ext: `blend`, mime: `application/x-blender` };
    if (this.checkString(`!<arch>`))
      return (
        await e.ignore(8),
        (await e.readToken(new $n(13, `ascii`))) === `debian-binary`
          ? { ext: `deb`, mime: `application/x-deb` }
          : { ext: `ar`, mime: `application/x-unix-archive` }
      );
    if (
      this.checkString(`WEBVTT`) &&
      [
        `
`,
        `\r`,
        `	`,
        ` `,
        `\0`,
      ].some((e) => this.checkString(e, { offset: 6 }))
    )
      return { ext: `vtt`, mime: `text/vtt` };
    if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
      await e.ignore(8);
      async function t() {
        return { length: await e.readToken(Zn), type: await e.readToken(new $n(4, `latin1`)) };
      }
      do {
        let n = await t();
        if (n.length < 0) return;
        switch (n.type) {
          case `IDAT`:
            return { ext: `png`, mime: `image/png` };
          case `acTL`:
            return { ext: `apng`, mime: `image/apng` };
          default:
            await e.ignore(n.length + 4);
        }
      } while (e.position + 8 < e.fileInfo.size);
      return { ext: `png`, mime: `image/png` };
    }
    if (this.check([65, 82, 82, 79, 87, 49, 0, 0]))
      return { ext: `arrow`, mime: `application/x-apache-arrow` };
    if (this.check([103, 108, 84, 70, 2, 0, 0, 0]))
      return { ext: `glb`, mime: `model/gltf-binary` };
    if (
      this.check([102, 114, 101, 101], { offset: 4 }) ||
      this.check([109, 100, 97, 116], { offset: 4 }) ||
      this.check([109, 111, 111, 118], { offset: 4 }) ||
      this.check([119, 105, 100, 101], { offset: 4 })
    )
      return { ext: `mov`, mime: `video/quicktime` };
    if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24]))
      return { ext: `orf`, mime: `image/x-olympus-orf` };
    if (this.checkString(`gimp xcf `)) return { ext: `xcf`, mime: `image/x-xcf` };
    if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216]))
      return { ext: `rw2`, mime: `image/x-panasonic-rw2` };
    if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
      async function t() {
        let t = new Uint8Array(16);
        return (await e.readBuffer(t), { id: t, size: Number(await e.readToken(Qn)) });
      }
      for (await e.ignore(30); e.position + 24 < e.fileInfo.size; ) {
        let n = await t(),
          r = n.size - 24;
        if (br(n.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
          let t = new Uint8Array(16);
          if (
            ((r -= await e.readBuffer(t)),
            br(t, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43]))
          )
            return { ext: `asf`, mime: `audio/x-ms-asf` };
          if (br(t, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43]))
            return { ext: `asf`, mime: `video/x-ms-asf` };
          break;
        }
        await e.ignore(r);
      }
      return { ext: `asf`, mime: `application/vnd.ms-asf` };
    }
    if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10]))
      return { ext: `ktx`, mime: `image/ktx` };
    if (
      (this.check([126, 16, 4]) || this.check([126, 24, 4])) &&
      this.check([48, 77, 73, 69], { offset: 4 })
    )
      return { ext: `mie`, mime: `application/x-mie` };
    if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { offset: 2 }))
      return { ext: `shp`, mime: `application/x-esri-shape` };
    if (this.check([255, 79, 255, 81])) return { ext: `j2c`, mime: `image/j2c` };
    if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10]))
      switch ((await e.ignore(20), await e.readToken(new $n(4, `ascii`)))) {
        case `jp2 `:
          return { ext: `jp2`, mime: `image/jp2` };
        case `jpx `:
          return { ext: `jpx`, mime: `image/jpx` };
        case `jpm `:
          return { ext: `jpm`, mime: `image/jpm` };
        case `mjp2`:
          return { ext: `mj2`, mime: `image/mj2` };
        default:
          return;
      }
    if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10]))
      return { ext: `jxl`, mime: `image/jxl` };
    if (this.check([254, 255]))
      return this.check([0, 60, 0, 63, 0, 120, 0, 109, 0, 108], { offset: 2 })
        ? { ext: `xml`, mime: `application/xml` }
        : void 0;
    if (this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179]))
      return { ext: `mpg`, mime: `video/mpeg` };
    if (this.check([0, 1, 0, 0, 0])) return { ext: `ttf`, mime: `font/ttf` };
    if (this.check([0, 0, 1, 0])) return { ext: `ico`, mime: `image/x-icon` };
    if (this.check([0, 0, 2, 0])) return { ext: `cur`, mime: `image/x-icon` };
    if (this.check([208, 207, 17, 224, 161, 177, 26, 225]))
      return { ext: `cfb`, mime: `application/x-cfb` };
    if (
      (await e.peekBuffer(this.buffer, { length: Math.min(256, e.fileInfo.size), mayBeLess: !0 }),
      this.check([97, 99, 115, 112], { offset: 36 }))
    )
      return { ext: `icc`, mime: `application/vnd.iccprofile` };
    if (this.checkString(`**ACE`, { offset: 7 }) && this.checkString(`**`, { offset: 12 }))
      return { ext: `ace`, mime: `application/x-ace-compressed` };
    if (this.checkString(`BEGIN:`)) {
      if (this.checkString(`VCARD`, { offset: 6 })) return { ext: `vcf`, mime: `text/vcard` };
      if (this.checkString(`VCALENDAR`, { offset: 6 }))
        return { ext: `ics`, mime: `text/calendar` };
    }
    if (this.checkString(`FUJIFILMCCD-RAW`)) return { ext: `raf`, mime: `image/x-fujifilm-raf` };
    if (this.checkString(`Extended Module:`)) return { ext: `xm`, mime: `audio/x-xm` };
    if (this.checkString(`Creative Voice File`)) return { ext: `voc`, mime: `audio/x-voc` };
    if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
      let e = new DataView(this.buffer.buffer).getUint32(12, !0);
      if (e > 12 && this.buffer.length >= e + 16)
        try {
          let t = new TextDecoder().decode(this.buffer.slice(16, e + 16));
          if (JSON.parse(t).files) return { ext: `asar`, mime: `application/x-asar` };
        } catch {}
    }
    if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2]))
      return { ext: `mxf`, mime: `application/mxf` };
    if (this.checkString(`SCRM`, { offset: 44 })) return { ext: `s3m`, mime: `audio/x-s3m` };
    if (
      (this.check([71]) && this.check([71], { offset: 188 })) ||
      (this.check([71], { offset: 4 }) && this.check([71], { offset: 196 }))
    )
      return { ext: `mts`, mime: `video/mp2t` };
    if (this.check([66, 79, 79, 75, 77, 79, 66, 73], { offset: 60 }))
      return { ext: `mobi`, mime: `application/x-mobipocket-ebook` };
    if (this.check([68, 73, 67, 77], { offset: 128 }))
      return { ext: `dcm`, mime: `application/dicom` };
    if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70]))
      return { ext: `lnk`, mime: `application/x.ms.shortcut` };
    if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0]))
      return { ext: `alias`, mime: `application/x.apple.alias` };
    if (this.checkString(`Kaydara FBX Binary  \0`))
      return { ext: `fbx`, mime: `application/x.autodesk.fbx` };
    if (
      this.check([76, 80], { offset: 34 }) &&
      (this.check([0, 0, 1], { offset: 8 }) ||
        this.check([1, 0, 2], { offset: 8 }) ||
        this.check([2, 0, 2], { offset: 8 }))
    )
      return { ext: `eot`, mime: `application/vnd.ms-fontobject` };
    if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29]))
      return { ext: `indd`, mime: `application/x-indesign` };
    if (
      (await e.peekBuffer(this.buffer, { length: Math.min(512, e.fileInfo.size), mayBeLess: !0 }),
      mr(this.buffer))
    )
      return { ext: `tar`, mime: `application/x-tar` };
    if (this.check([255, 254]))
      return this.check([60, 0, 63, 0, 120, 0, 109, 0, 108, 0], { offset: 2 })
        ? { ext: `xml`, mime: `application/xml` }
        : this.check(
              [
                255, 14, 83, 0, 107, 0, 101, 0, 116, 0, 99, 0, 104, 0, 85, 0, 112, 0, 32, 0, 77, 0,
                111, 0, 100, 0, 101, 0, 108, 0,
              ],
              { offset: 2 }
            )
          ? { ext: `skp`, mime: `application/vnd.sketchup.skp` }
          : void 0;
    if (this.checkString(`-----BEGIN PGP MESSAGE-----`))
      return { ext: `pgp`, mime: `application/pgp-encrypted` };
    if (this.buffer.length >= 2 && this.check([255, 224], { offset: 0, mask: [255, 224] })) {
      if (this.check([16], { offset: 1, mask: [22] }))
        return (this.check([8], { offset: 1, mask: [8] }), { ext: `aac`, mime: `audio/aac` });
      if (this.check([2], { offset: 1, mask: [6] })) return { ext: `mp3`, mime: `audio/mpeg` };
      if (this.check([4], { offset: 1, mask: [6] })) return { ext: `mp2`, mime: `audio/mpeg` };
      if (this.check([6], { offset: 1, mask: [6] })) return { ext: `mp1`, mime: `audio/mpeg` };
    }
  }
  async readTiffTag(e) {
    let t = await this.tokenizer.readToken(e ? Jn : qn);
    switch ((this.tokenizer.ignore(10), t)) {
      case 50341:
        return { ext: `arw`, mime: `image/x-sony-arw` };
      case 50706:
        return { ext: `dng`, mime: `image/x-adobe-dng` };
    }
  }
  async readTiffIFD(e) {
    let t = await this.tokenizer.readToken(e ? Jn : qn);
    for (let n = 0; n < t; ++n) {
      let t = await this.readTiffTag(e);
      if (t) return t;
    }
  }
  async readTiffHeader(e) {
    let t = (e ? Jn : qn).get(this.buffer, 2),
      n = (e ? Xn : Yn).get(this.buffer, 4);
    if (t === 42) {
      if (n >= 6) {
        if (this.checkString(`CR`, { offset: 8 })) return { ext: `cr2`, mime: `image/x-canon-cr2` };
        if (
          n >= 8 &&
          (this.check([28, 0, 254, 0], { offset: 8 }) || this.check([31, 0, 11, 0], { offset: 8 }))
        )
          return { ext: `nef`, mime: `image/x-nikon-nef` };
      }
      return (
        await this.tokenizer.ignore(n),
        (await this.readTiffIFD(e)) ?? { ext: `tif`, mime: `image/tiff` }
      );
    }
    if (t === 43) return { ext: `tif`, mime: `image/tiff` };
  }
};
(new Set(gr), new Set(_r));
var W = class extends Error {
    constructor(e, t) {
      (super(e), U(this, `code`), (this.name = `[dotLottie-js]`), (this.code = t));
    }
  },
  Sr = (e) => {
    let t = e.substring(e.indexOf(`,`) + 1),
      n = typeof window > `u` ? Buffer.from(t, `base64`).toString(`binary`) : atob(t),
      r = new Uint8Array(n.length);
    for (let e = 0; e < n.length; e += 1) r[e] = n.charCodeAt(e);
    return r;
  },
  Cr = async (e) => (await yr(e))?.mime.toString(),
  wr = async (e) => {
    let t = await yr(Sr(e));
    return t?.ext.toString() === `jpg` ? `jpeg` : t?.ext.toString();
  },
  Tr = (e) => {
    try {
      return (new URL(e), !0);
    } catch {
      return !1;
    }
  };
async function Er(e) {
  let t;
  if (typeof window > `u`) t = Buffer.from(e).toString(`base64`);
  else {
    let n = Array.prototype.map.call(e, (e) => String.fromCharCode(e)).join(``);
    t = window.btoa(n);
  }
  return `data:${await Cr(e)};base64,${t}`;
}
function Dr(e) {
  return `w` in e && `h` in e && !(`xt` in e) && `p` in e;
}
function Or(e) {
  return !(`h` in e) && !(`w` in e) && `p` in e && `e` in e && `u` in e && `id` in e;
}
function kr(e) {
  return typeof e == `string` && e.startsWith(`data:font/`);
}
async function Ar(e, t = () => !0) {
  if (!(e instanceof Uint8Array)) throw new W(`dotLottie not found`, `INVALID_DOTLOTTIE`);
  return await new Promise((n, r) => {
    pn(e, { filter: t }, (e, t) => {
      (e && r(e), n(t));
    });
  });
}
async function jr(e) {
  let t = `manifest.json`,
    n = (await Ar(e, (e) => e.name === t))[t];
  if (n !== void 0) return JSON.parse(rn(n, !1));
}
async function Mr(e) {
  return (await jr(e))?.version ?? `1.0.0`;
}
var Nr = {
    name: `@dotlottie/dotlottie-js`,
    version: `1.6.3`,
    type: `module`,
    description: `This library helps in creating and modifying .lottie files.`,
    repository: {
      type: `git`,
      url: `git+https://github.com/dotlottie/dotlottie-js.git`,
      directory: `packages/dotlottie-js`,
    },
    homepage: `https://github.com/dotlottie/dotlottie-js#readme`,
    bugs: `https://github.com/dotlottie/dotlottie-js/issues`,
    author: `dotLottie`,
    contributors: [
      `Karam Ali <karam@lottiefiles.com>`,
      `Sam Osborne <sam@lottiefiles.com>`,
      `Jawish Hameed <jawish@lottiefiles.com>`,
      `Abdelrahman Ashraf <a.theashraf@gmail.com>`,
    ],
    license: `MIT`,
    engines: { node: `>=18.0.0` },
    main: `./dist/index.node.js`,
    exports: {
      '.': { node: `./dist/index.node.js`, default: `./dist/index.browser.js` },
      './*': `./dist/*.js`,
    },
    browser: `dist/index.browser.js`,
    types: `./dist/index.browser.d.ts`,
    typesVersions: { '*': { '*': [`dist/*`, `dist/index.browser.d.ts`] } },
    files: [`dist`],
    scripts: {
      build: `tsup`,
      dev: `tsup --watch`,
      docs: `typedoc src`,
      lint: `eslint --fix .`,
      'stats:eslint': `cross-env TIMING=1 eslint .`,
      'stats:ts': `tsc -p tsconfig.build.json --extendedDiagnostics`,
      test: `pnpm run test:node && pnpm run test:browser`,
      'test:browser': `vitest --config=vitest.browser.config.js`,
      'test:node': `vitest --config=vitest.config.js`,
      'type-check': `tsc --noEmit`,
    },
    dependencies: {
      '@lottie-animation-community/lottie-types': `^1.2.0`,
      'browser-image-hash': `^0.0.5`,
      fflate: `^0.8.1`,
      'file-type': `^19.6.0`,
      sharp: `^0.33.2`,
      'sharp-phash': `^2.1.0`,
      valibot: `^0.13.1`,
    },
    devDependencies: {
      '@types/jasmine': `4.3.5`,
      '@types/node': `22.8.7`,
      '@types/sharp': `0.31.1`,
      '@vitest/browser': `2.1.3`,
      '@vitest/coverage-v8': `2.1.3`,
      'cross-env': `7.0.3`,
      'js-base64': `3.7.5`,
      nodemon: `2.0.20`,
      playwright: `^1.48.2`,
      tsup: `8.3.0`,
      typescript: `4.7.4`,
      'vite-plugin-arraybuffer': `^0.0.8`,
      vitest: `^2.1.3`,
    },
    publishConfig: { access: `public` },
  },
  Pr = `${Nr.name}@${Nr.version}`,
  Fr = B({ id: H(), name: V(H()), initialTheme: V(H()), background: V(H()), themes: V(L(H())) }),
  Ir = B({ id: H(), name: V(H()) }),
  Lr = B({ id: H(), name: V(H()) }),
  Rr = B({ animation: V(H()), stateMachine: V(H()) });
B({
  version: H(),
  generator: H(),
  initial: V(Rr),
  animations: L(Fr),
  themes: V(L(Ir)),
  stateMachines: V(L(Lr)),
});
var zr = Dn([
  B({ type: R(`Numeric`), inputName: H(), conditionType: H(), compareTo: Dn([H(), z(), Sn()]) }),
  B({ type: R(`String`), inputName: H(), conditionType: H(), compareTo: H() }),
  B({ type: R(`Boolean`), inputName: H(), conditionType: H(), compareTo: Dn([H(), Sn()]) }),
  B({ type: R(`Event`), inputName: H() }),
]);
(B({ value: z() }), B({ value: Sn() }), B({ value: H() }), B({ target: V(H()) }));
var Br = L(
    Dn([
      B({ type: R(`Transition`), toState: H(), guards: V(L(zr)) }),
      B({ type: R(`Tweened`), toState: H(), guards: V(L(zr)), duration: z(), easing: L(z()) }),
    ])
  ),
  Vr = Dn([H(`_blank`), H(`_self`), H(`_parent`), H(`_top`), H(`_unfencedTop`)]),
  Hr = Dn([
    B({ type: R(`OpenUrl`), url: H(), target: Vr }),
    B({ type: R(`SetTheme`), value: H() }),
    B({ type: R(`Increment`), inputName: H(), value: V(Dn([H(), z()])) }),
    B({ type: R(`Decrement`), inputName: H(), value: V(Dn([H(), z()])) }),
    B({ type: R(`Toggle`), inputName: H() }),
    B({ type: R(`SetBoolean`), inputName: H(), value: V(Sn()) }),
    B({ type: R(`SetString`), inputName: H(), value: V(H()) }),
    B({ type: R(`SetNumeric`), inputName: H(), value: V(z()) }),
    B({ type: R(`Fire`), inputName: H() }),
    B({ type: R(`Reset`), inputName: H() }),
    B({ type: R(`SetExpression`), layerName: H(), propertyIndex: z(), varName: H(), value: z() }),
    B({ type: R(`SetTheme`), themeId: H() }),
    B({ type: R(`SetFrame`), value: Dn([H(), z()]) }),
    B({ type: R(`SetProgress`), value: Dn([H(), z()]) }),
    B({ type: R(`SetSlot`), value: H() }),
    B({ type: R(`FireCustomEvent`), value: H() }),
  ]),
  Ur = Dn([R(`Forward`), R(`Reverse`), R(`Bounce`), R(`ReverseBounce`)]),
  Wr = L(
    Dn([
      B({
        name: H(),
        type: R(`PlaybackState`),
        animation: H(),
        loop: V(Sn()),
        loopCount: V(z()),
        autoplay: V(Sn()),
        final: V(Sn()),
        mode: V(Ur),
        speed: V(z()),
        segment: V(H()),
        backgroundColor: V(z()),
        useFrameInterpolation: V(Sn()),
        entryActions: V(L(Hr)),
        exitActions: V(L(Hr)),
        transitions: V(Br),
      }),
      B({
        name: H(),
        type: R(`GlobalState`),
        entryActions: V(L(Hr)),
        exitActions: V(L(Hr)),
        transitions: V(Br),
      }),
    ])
  ),
  Gr = L(
    Dn([
      B({ type: R(`PointerUp`), layerName: V(H()), actions: L(Hr) }),
      B({ type: R(`PointerDown`), layerName: V(H()), actions: L(Hr) }),
      B({ type: R(`PointerEnter`), layerName: V(H()), actions: L(Hr) }),
      B({ type: R(`PointerMove`), actions: L(Hr) }),
      B({ type: R(`PointerExit`), layerName: V(H()), actions: L(Hr) }),
      B({ type: R(`Click`), layerName: V(H()), actions: L(Hr) }),
      B({ type: R(`OnComplete`), stateName: H(), actions: L(Hr) }),
      B({ type: R(`OnLoopComplete`), stateName: H(), actions: L(Hr) }),
    ])
  ),
  Kr = L(
    Dn([
      B({ type: R(`Numeric`), name: H(), value: z() }),
      B({ type: R(`String`), name: H(), value: H() }),
      B({ type: R(`Boolean`), name: H(), value: Sn() }),
      B({ type: R(`Event`), name: H() }),
    ])
  );
B({ initial: H(), states: Wr, interactions: V(Gr), inputs: V(Kr) });
var qr = B({ x: Dn([z(), L(z())]), y: Dn([z(), L(z())]) }),
  Jr = { frame: z(), inTangent: V(qr), outTangent: V(qr), hold: V(Sn()) },
  Yr = B({ ...Jr, value: z() }),
  Xr = B({ ...Jr, value: L(z()) }),
  Zr = { animations: V(L(H())), id: H() },
  Qr = B({ ...Zr, type: R(`Scalar`), value: V(z()), keyframes: V(L(Yr)), expression: V(H()) }),
  $r = B({ ...Jr, value: L(z()), valueInTangent: V(z()), valueOutTangent: V(z()) }),
  ei = B({ ...Zr, type: R(`Position`), split: V(Sn()), keyframes: V(L($r)), expression: V(H()) }),
  ti = B({ ...Jr, value: L(z()) }),
  ni = B({ ...Zr, type: R(`Vector`), value: V(L(z())), keyframes: V(L(ti)), expression: V(H()) }),
  ri = B({ ...Zr, type: R(`Color`), value: V(L(z())), keyframes: V(L(Xr)), expression: V(H()) }),
  ii = B({
    ...Zr,
    type: R(`Image`),
    value: B({ id: V(H()), width: V(z()), height: V(z()), url: V(H()) }),
  }),
  ai = B({ ...Jr, value: L(B({ color: L(z()), offset: z() })) }),
  oi = B({
    ...Zr,
    type: R(`Gradient`),
    value: V(L(B({ color: L(z()), offset: z() }))),
    keyframes: V(L(ai)),
  }),
  si = B({
    text: V(H()),
    fontName: V(H()),
    fontSize: V(z()),
    fillColor: V(L(z())),
    strokeColor: V(L(z())),
    strokeWidth: V(z()),
    strokeOverFill: V(Sn()),
    lineHeight: V(z()),
    tracking: V(z()),
    justify: V(
      Dn([
        R(`Left`),
        R(`Right`),
        R(`Center`),
        R(`JustifyLastLeft`),
        R(`JustifyLastRight`),
        R(`JustifyLastCenter`),
        R(`JustifyLastFull`),
      ])
    ),
    textCaps: V(Dn([R(`Regular`), R(`AllCaps`), R(`SmallCaps`)])),
    baselineShift: V(z()),
    wrapSize: V(L(z())),
    wrapPosition: V(L(z())),
  }),
  ci = B({ frame: z(), value: si }),
  li = B({
    rules: L(
      Dn([
        ri,
        Qr,
        ei,
        ni,
        ii,
        oi,
        B({ ...Zr, type: R(`Text`), value: V(si), keyframes: V(L(ci)), expression: V(H()) }),
      ])
    ),
  }),
  ui = class {
    constructor(e) {
      (U(this, `_name`),
        U(this, `_id`),
        U(this, `_initial`),
        U(this, `_zipOptions`),
        U(this, `_states`),
        U(this, `_interactions`),
        U(this, `_inputs`),
        this._requireValidId(e.id),
        e.data.inputs && this._requireValidInputs(e.data.inputs),
        e.data.interactions && this._requireValidInteractions(e.data.interactions),
        this._requireValidStates(e.data.states),
        this._requireValidInitial(e.data.initial, e.data.states),
        (this._name = e.name),
        (this._id = e.id),
        (this._initial = e.data.initial),
        (this._zipOptions = e.zipOptions ?? {}),
        (this._states = e.data.states),
        (this._interactions = e.data.interactions ?? []),
        (this._inputs = e.data.inputs ?? []));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get name() {
      return this._name;
    }
    set name(e) {
      this._name = e;
    }
    get states() {
      return this._states;
    }
    set states(e) {
      this._states = e;
    }
    get interactions() {
      return this._interactions;
    }
    set interactions(e) {
      this._interactions = e;
    }
    get inputs() {
      return this._inputs;
    }
    set inputs(e) {
      this._inputs = e;
    }
    get initial() {
      return this._initial;
    }
    set initial(e) {
      this.initial = e;
    }
    toString() {
      return JSON.stringify({
        initial: this._initial,
        states: this._states,
        inputs: this._inputs,
        interactions: this._interactions,
      });
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid id.`);
    }
    _requireValidInitial(e, t) {
      let n = On(Wr, t);
      if (!n.success)
        throw new W(
          `Invalid initial state: ${`${JSON.stringify(mn(n.issues).nested, null, 2)}`}`,
          `INVALID_STATEMACHINE`
        );
      let r = !1;
      for (let n of t) n.name === e && (r = !0);
      if (!r) throw new W(`Initial state not found.`, `INVALID_STATEMACHINE`);
    }
    _requireValidStates(e) {
      let t = On(Wr, e);
      if (!t.success)
        throw new W(
          `Invalid states declaration: ${`${JSON.stringify(mn(t.issues).nested, null, 2)}`}`,
          `INVALID_STATEMACHINE`
        );
    }
    _requireValidInputs(e) {
      let t = On(Kr, e);
      if (!t.success)
        throw new W(
          `Invalid inputs: ${`${JSON.stringify(mn(t.issues).nested, null, 2)}`}`,
          `INVALID_STATEMACHINE`
        );
    }
    _requireValidInteractions(e) {
      let t = On(Gr, e);
      if (!t.success)
        throw new W(
          `Invalid interactions: ${`${JSON.stringify(mn(t.issues).nested, null, 2)}`}`,
          `INVALID_STATEMACHINE`
        );
    }
    _requireValidTransitions(e) {
      let t = On(Br, e);
      if (!t.success)
        throw new W(
          `Invalid transitions: ${`${JSON.stringify(mn(t.issues).nested, null, 2)}`}`,
          `INVALID_STATEMACHINE`
        );
    }
  },
  di = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`),
        U(this, `_name`),
        U(this, `_zipOptions`),
        this._requireValidId(e.id),
        this._requireValidData(e.data),
        (this._name = e.name),
        (this._data = e.data),
        (this._id = e.id),
        (this._zipOptions = e.zipOptions ?? {}));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get name() {
      return this._name;
    }
    set name(e) {
      this._name = e;
    }
    get data() {
      return this._data;
    }
    set data(e) {
      (this._requireValidData(e), (this._data = e));
    }
    async toString() {
      return JSON.stringify(this._data);
    }
    _requireValidId(e) {
      if (typeof e != `string` || !e) throw new W(`Invalid theme id`);
    }
    _requireValidData(e) {
      let t = On(li, e);
      if (!t.success) throw new W(`Invalid theme data: ${JSON.stringify(t.issues, null, 2)}`);
    }
  },
  fi = class {
    constructor(e) {
      (U(this, `_animationsMap`, new Map()),
        U(this, `_plugins`, []),
        U(this, `_themesMap`, new Map()),
        U(this, `_stateMachinesMap`, new Map()),
        U(this, `_generator`, Pr),
        U(this, `_version`, `2`),
        U(this, `enableDuplicateImageOptimization`),
        e?.generator && (this._generator = e.generator),
        (this.enableDuplicateImageOptimization = e?.enableDuplicateImageOptimization ?? !1));
    }
    async toBase64(e) {
      throw new W(`toBase64() method not implemented in concrete class!`);
    }
    create(e) {
      throw new W(`create() method not implemented in concrete class!`);
    }
    async download(e, t = void 0) {
      throw new W(`download(fileName:string) method not implemented in concrete class!`);
    }
    addPlugins(...e) {
      throw new W(`addPlugins(...plugins: DotLottiePlugin[]) not implemented in concrete class!`);
    }
    addAnimation(e) {
      throw new W(
        `addAnimation(animationOptions: AnimationOptions) not implemented in concrete class!`
      );
    }
    async fromArrayBuffer(e) {
      throw new W(
        `fromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<DotLottieCommon> not implemented in concrete class!`
      );
    }
    async toArrayBuffer(e = void 0) {
      throw new W(`toArrayBuffer(): Promise<ArrayBuffer> is not implemented in concrete class!`);
    }
    get plugins() {
      return this._plugins;
    }
    get version() {
      return this._version;
    }
    get generator() {
      return this._generator;
    }
    get animations() {
      return Array.from(this._animationsMap.values());
    }
    get manifest() {
      return this._buildManifest();
    }
    get themes() {
      return Array.from(this._themesMap.values());
    }
    get stateMachines() {
      return Array.from(this._stateMachinesMap.values());
    }
    async _renameImage(e, t, n) {
      for (let r of e.imageAssets)
        if (r.lottieAssetId === n) {
          let n = r.fileName;
          if ((await r.renameImage(t), !e.data)) throw new W(`No animation data available.`);
          let i = e.data.assets;
          if (!i) throw new W(`No image assets to rename.`);
          for (let e of i) `w` in e && `h` in e && e.p === n && (e.p = r.fileName);
        }
    }
    _generateMapOfOccurencesFromImageIds() {
      let e = new Map();
      return (
        this.animations.forEach((t) => {
          t.imageAssets.forEach((t) => {
            if (e.has(t.lottieAssetId)) {
              let n = e.get(t.lottieAssetId) ?? 0;
              e.set(t.lottieAssetId, n + 1);
            } else e.set(t.lottieAssetId, 1);
          });
        }),
        e
      );
    }
    async _renameImageAssets() {
      let e = this._generateMapOfOccurencesFromImageIds();
      for (let t = this.animations.length - 1; t >= 0; --t) {
        let n = this.animations.at(t);
        if (n)
          for (let t = n.imageAssets.length - 1; t >= 0; --t) {
            let r = n.imageAssets.at(t);
            if (r) {
              let t = e.get(r.lottieAssetId) ?? 0;
              (t > 0 && --t,
                e.set(r.lottieAssetId, t),
                t > 0 && (await this._renameImage(n, `${r.lottieAssetId}_${t}`, r.lottieAssetId)));
            }
          }
      }
    }
    async _renameAudio(e, t, n) {
      for (let r of e.audioAssets)
        if (r.id === n) {
          if ((await r.renameAudio(t), !e.data)) throw new W(`No animation data available.`);
          let i = e.data.assets;
          if (!i) throw new W(`No audio assets to rename.`);
          for (let e of i) Or(e) && e.id === n && (e.p = r.fileName);
        }
    }
    async _renameAudioAssets() {
      let e = new Map();
      this.animations.forEach((t) => {
        e.set(t.id, t.audioAssets);
      });
      let t = 0;
      e.forEach((e) => {
        t += e.length;
      });
      for (let e = this.animations.length - 1; e >= 0; --e) {
        let n = this.animations.at(e);
        if (n)
          for (let e = n.audioAssets.length - 1; e >= 0; --e) {
            let r = n.audioAssets.at(e);
            r && (await this._renameAudio(n, `audio_${t}`, r.id), --t);
          }
      }
    }
    async _renameFont(e, t, n) {
      for (let r of e.fontAssets)
        if (r.fileName === n) {
          if ((await r.renameFont(t), !e.data)) throw new W(`No animation data available.`);
          let i = e.data.fonts?.list;
          if (!i) throw new W(`No font list to rename.`);
          for (let e of i) e.fPath === `/f/${n}` && (e.fPath = `/f/${r.fileName}`);
        }
    }
    async _renameFontAssets() {
      let e = new Map();
      this.animations.forEach((t) => {
        e.set(t.id, t.fontAssets);
      });
      let t = 0;
      e.forEach((e) => {
        t += e.length;
      });
      for (let e = this.animations.length - 1; e >= 0; --e) {
        let n = this.animations.at(e);
        if (n)
          for (let e = n.fontAssets.length - 1; e >= 0; --e) {
            let r = n.fontAssets.at(e);
            if (r) {
              let e = r.fileName;
              (await this._renameFont(n, `font_${t}`, e), --t);
            }
          }
      }
    }
    _addLottieAnimation(e) {
      if (this._animationsMap.get(e.id)) throw new W(`Duplicate animation id detected, aborting.`);
      return (this._animationsMap.set(e.id, e), this);
    }
    async _findAssetsAndInline(e) {
      let t = e.data?.assets;
      if (!t) throw new W(`Failed to inline assets, the animation's assets are undefined.`);
      let n = this.getImages(),
        r = this.getAudio(),
        i = this.getFonts();
      for (let e of t)
        if (Dr(e))
          for (let t of n)
            t.fileName === e.p && ((e.e = 1), (e.u = ``), (e.p = await t.toDataURL()));
        else if (Or(e))
          for (let t of r)
            t.fileName === e.p && ((e.e = 1), (e.u = ``), (e.p = await t.toDataURL()));
      let a = e.data?.fonts?.list;
      if (a)
        for (let e of a)
          for (let t of i)
            e.fPath === `/f/${t.fileName}` && ((e.fPath = await t.toDataURL()), (e.origin = 3));
      return e;
    }
    async getAnimation(e, t) {
      if (!t?.inlineAssets) return this._animationsMap.get(e);
      let n = this._animationsMap.get(e);
      if (!n) throw new W(`Failed to find animation.`);
      return ((n = await this._findAssetsAndInline(n)), n);
    }
    getAnimations() {
      return Array.from(this._animationsMap);
    }
    removeAnimation(e) {
      let t = this._animationsMap.get(e);
      if (t) {
        let e = t.themes;
        for (let n of e) this.unscopeTheme({ animationId: t.id, themeId: n.id });
        this._animationsMap.delete(t.id);
      }
      return this;
    }
    getImages() {
      let e = [];
      return (this.animations.map((t) => e.push(...t.imageAssets)), e);
    }
    getAudio() {
      let e = [];
      return (this.animations.map((t) => e.push(...t.audioAssets)), e);
    }
    getFonts() {
      let e = [];
      return (this.animations.map((t) => e.push(...t.fontAssets)), e);
    }
    getTheme(e) {
      return this._themesMap.get(e);
    }
    _buildManifest() {
      let e = Array.from(this._animationsMap.values()),
        t = Array.from(this._themesMap.values()),
        n = Array.from(this._stateMachinesMap.values()),
        r = e.find((e) => e.defaultActiveAnimation)?.id ?? ``,
        i = {
          version: this.version,
          generator: this.generator,
          animations: e.map((e) => ({
            id: e.id,
            ...(e.name ? { name: e.name } : {}),
            ...(e.initialTheme ? { initialTheme: e.initialTheme } : {}),
            ...(e.background ? { background: e.background } : {}),
            ...(e.themes.length > 0 ? { themes: e.themes.map((e) => e.id) } : {}),
          })),
        };
      return (
        t.length > 0 &&
          (i.themes = t.map((e) => ({ id: e.id, ...(e.name ? { name: e.name } : {}) }))),
        n.length > 0 &&
          (i.stateMachines = n.map((e) => ({ id: e.id, ...(e.name ? { name: e.name } : {}) }))),
        r && (i.initial = { animation: r }),
        i
      );
    }
    _validateStateMachineAnimations() {
      let e = Array.from(this._animationsMap.keys());
      for (let t of this.stateMachines)
        for (let n of t.states)
          if (
            `animation` in n &&
            n.animation &&
            n.animation.trim() !== `` &&
            !e.includes(n.animation)
          )
            throw new W(
              `State machine "${t.id}": State "${n.name}" references animation "${n.animation}" which does not exist in the bundle. Available animations: ${e.join(`, `)}`
            );
    }
    async build() {
      (this._buildManifest(), this._validateStateMachineAnimations());
      for (let e of this.animations) await e.toJSON();
      this.animations.length > 1 &&
        (await this._renameImageAssets(),
        await this._renameAudioAssets(),
        await this._renameFontAssets());
      let e = [],
        t = [];
      for (let n of this.plugins) n.parallel ? e.push(n) : t.push(n);
      await Promise.all(e.map(async (e) => e.onBuild()));
      for (let e of t) await e.onBuild();
      return this;
    }
    async toBlob(e = void 0) {
      let t = await this.toArrayBuffer(e);
      return new Blob([t], { type: `application/zip` });
    }
    async fromURL(e) {
      if (!Tr(e)) throw new W(`Invalid URL`);
      try {
        let t = await fetch(e);
        if (!t.ok) throw new W(t.statusText);
        let n = await t.arrayBuffer();
        return this.fromArrayBuffer(n);
      } catch (e) {
        if (e instanceof Error) throw new W(e.message);
      }
      throw new W(`Unknown error`);
    }
    merge(...e) {
      let t = this.create();
      for (let n of [this, ...e])
        (n.themes.forEach((e) => {
          t.addTheme({ id: e.id, name: e.name, data: e.data });
        }),
          n.animations.forEach((e) => {
            (e.data
              ? t.addAnimation({ id: e.id, name: e.name, data: e.data })
              : e.url && t.addAnimation({ id: e.id, name: e.name, url: e.url }),
              e.themes.forEach((n) => {
                t.scopeTheme({ animationId: e.id, themeId: n.id });
              }));
          }),
          n.stateMachines.forEach((e) => {
            let n = {
              id: e.id,
              name: e.name,
              data: {
                states: e.states,
                initial: e.initial,
                interactions: e.interactions,
                inputs: e.inputs,
              },
              zipOptions: e.zipOptions,
            };
            t.addStateMachine(n);
          }));
      return t;
    }
    addTheme(e) {
      let t = new di(e);
      return (this._themesMap.set(t.id, t), this);
    }
    removeTheme(e) {
      let t = this._themesMap.get(e);
      if (t) {
        for (let e of this.animations) e.themes.includes(t) && e.unscopeTheme(t.id);
        this._themesMap.delete(t.id);
      }
      return this;
    }
    scopeTheme({ animationId: e, themeId: t }) {
      let n = this._themesMap.get(t);
      if (!n) throw new W(`Failed to find theme with id ${t}`);
      let r = this._animationsMap.get(e);
      if (!r) throw new W(`Failed to find animation with id ${e}`);
      return (r.scopeTheme(n), this);
    }
    unscopeTheme({ animationId: e, themeId: t }) {
      let n = this._themesMap.get(t);
      if (!n) throw new W(`Failed to find theme with id ${t}`);
      let r = this._animationsMap.get(e);
      if (!r) throw new W(`Failed to find animation with id ${e}`);
      return (r.unscopeTheme(n.id), this);
    }
    addStateMachine(e) {
      let t = new ui(e);
      return (this._stateMachinesMap.set(e.id, t), this);
    }
    getStateMachine(e) {
      return this._stateMachinesMap.get(e);
    }
    removeStateMachine(e) {
      return (this._stateMachinesMap.delete(e), this);
    }
    _requireValidDescription(e) {
      if (typeof e != `string`) throw new W(`Invalid description`);
    }
    _requireValidGenerator(e) {
      if (typeof e != `string`) throw new W(`Invalid generator`);
    }
    _requireValidKeywords(e) {
      if (typeof e != `string`) throw new W(`Invalid keywords`);
    }
    _requireValidVersion(e) {
      if (typeof e != `string`) throw new W(`Invalid version`);
    }
    _requireValidCustomData(e) {
      if (!e) throw new W(`Invalid customData`);
    }
  },
  pi = class {
    constructor(e) {
      (U(this, `_name`),
        U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_url`),
        U(this, `_zipOptions`),
        U(this, `_defaultActiveAnimation`),
        U(this, `_imageAssets`, []),
        U(this, `_audioAssets`, []),
        U(this, `_fontAssets`, []),
        U(this, `_themesMap`, new Map()),
        U(this, `_initialTheme`, null),
        U(this, `_background`, null),
        this._requireValidOptions(e),
        (this._id = e.id),
        (this._name = e.name),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.url && (this._url = e.url),
        (this._background = e.background ?? null),
        (this._initialTheme = e.initialTheme ?? null),
        (this._defaultActiveAnimation = e.defaultActiveAnimation ?? !1));
    }
    async toBase64() {
      throw new W(`lottie animation controls tobase64 not implemented!`);
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get name() {
      return this._name;
    }
    set name(e) {
      this._name = e;
    }
    get background() {
      return this._background;
    }
    set background(e) {
      this._background = e;
    }
    get initialTheme() {
      return this._initialTheme;
    }
    set initialTheme(e) {
      this._initialTheme = e;
    }
    get themes() {
      return Array.from(this._themesMap.values());
    }
    set themes(e) {
      ((this._themesMap = new Map()),
        e.forEach((e) => {
          this._themesMap.set(e.id, e);
        }));
    }
    get imageAssets() {
      return this._imageAssets;
    }
    set imageAssets(e) {
      this._imageAssets = e;
    }
    get audioAssets() {
      return this._audioAssets;
    }
    set audioAssets(e) {
      this._audioAssets = e;
    }
    get fontAssets() {
      return this._fontAssets;
    }
    set fontAssets(e) {
      this._fontAssets = e;
    }
    get data() {
      return this._data;
    }
    set data(e) {
      (this._requireValidLottieData(e), (this._data = e));
    }
    get url() {
      return this._url;
    }
    set url(e) {
      (this._requireValidUrl(e), (this._url = e));
    }
    get defaultActiveAnimation() {
      return this._defaultActiveAnimation;
    }
    set defaultActiveAnimation(e) {
      this._defaultActiveAnimation = e;
    }
    scopeTheme(e) {
      this._themesMap.set(e.id, e);
    }
    unscopeTheme(e) {
      this._themesMap.delete(e);
    }
    async toArrayBuffer(e) {
      let t = await this.toJSON(e);
      return new TextEncoder().encode(JSON.stringify(t)).buffer;
    }
    async _extractImageAssets() {
      throw new W(
        `_extractImageAssets(): Promise<boolean> method not implemented in concrete class`
      );
    }
    async _extractAudioAssets() {
      throw new W(
        `_extractAudioAssets(): Promise<boolean> method not implemented in concrete class`
      );
    }
    async _extractFontAssets() {
      throw new W(
        `_extractFontAssets(): Promise<boolean> method not implemented in concrete class`
      );
    }
    async toBlob(e) {
      let t = await this.toJSON(e);
      return new Blob([JSON.stringify(t)], { type: `application/json` });
    }
    async toJSON(e) {
      if (
        (this._url && !this._data && (this._data = await this._fromUrl(this._url)),
        this._requireValidLottieData(this._data),
        this._data.fonts?.list?.length && (await this._extractFontAssets()),
        this._data.assets?.length &&
          (await this._extractImageAssets(), await this._extractAudioAssets(), e?.inlineAssets))
      ) {
        let e = this.data?.assets;
        if (!e) throw new W(`Failed to inline assets, the animation's assets are undefined.`);
        let t = this.imageAssets,
          n = this.audioAssets;
        for (let r of e)
          if (`w` in r && `h` in r && !(`xt` in r) && `p` in r)
            for (let e of t)
              e.fileName === r.p && ((r.e = 1), (r.u = ``), (r.p = await e.toDataURL()));
          else if (Or(r))
            for (let e of n)
              e.fileName === r.p && ((r.e = 1), (r.u = ``), (r.p = await e.toDataURL()));
      }
      if (e?.inlineAssets) {
        let e = this._data.fonts?.list;
        if (e)
          for (let t of e)
            for (let e of this.fontAssets)
              t.fPath === `/f/${e.fileName}` && ((t.fPath = await e.toDataURL()), (t.origin = 3));
      }
      return this._data;
    }
    async _fromUrl(e) {
      let t = await (await fetch(e)).text(),
        n;
      try {
        n = JSON.parse(t);
      } catch (e) {
        if (e instanceof Error) throw new W(`${e.message}: Invalid json returned from url`);
      }
      return (this._requireValidLottieData(n), n);
    }
    _requireValidUrl(e) {
      try {
        new URL(e || ``);
      } catch {
        throw new W(`Invalid animation url`);
      }
    }
    _requireValidLottieData(e) {
      if (
        ![`v`, `ip`, `op`, `layers`, `fr`, `w`, `h`].every((t) =>
          Object.prototype.hasOwnProperty.call(e, t)
        )
      )
        throw new W(`Received invalid Lottie data.`);
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid animation id`);
    }
    _requireValidOptions(e) {
      if ((this._requireValidId(e.id), !e.data && !e.url)) throw new W(`No data or url provided.`);
      (e.data && this._requireValidLottieData(e.data), e.url && this._requireValidUrl(e.url));
    }
  },
  mi = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_lottieAssetId`, ``),
        U(this, `_fileName`, ``),
        U(this, `_parentAnimations`),
        U(this, `_zipOptions`),
        this._requireValidId(e.id),
        this._requireValidLottieAssetId(e.lottieAssetId),
        this._requireValidFileName(e.fileName),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.id && (this._id = e.id),
        e.lottieAssetId && (this._lottieAssetId = e.lottieAssetId),
        e.fileName && (this._fileName = e.fileName),
        (this._parentAnimations = e.parentAnimations || []));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid image id`);
    }
    _requireValidLottieAssetId(e) {
      if (!e) throw new W(`Invalid Lottie Image Asset Id`);
    }
    _requireValidFileName(e) {
      if (!e) throw new W(`Invalid image fileName`);
    }
    get fileName() {
      return this._fileName;
    }
    set fileName(e) {
      (this._requireValidFileName(e), (this._fileName = e));
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get lottieAssetId() {
      return this._lottieAssetId;
    }
    set lottieAssetId(e) {
      (this._requireValidLottieAssetId(e), (this._lottieAssetId = e));
    }
    get data() {
      return this._data;
    }
    set data(e) {
      if (!e) throw new W(`Invalid data`);
      this._data = e;
    }
    get parentAnimations() {
      return this._parentAnimations;
    }
    set parentAnimations(e) {
      this._parentAnimations = e;
    }
    async toDataURL() {
      if (this._data && this._isDataURL(this._data)) return this.data;
      let e = await this.toArrayBuffer();
      return Er(new Uint8Array(e));
    }
    async renameImage(e) {
      this._lottieAssetId = e;
      let t = await wr(await this.toDataURL());
      if (!t) throw new W(`File extension type could not be detected from asset file.`);
      this.fileName = `${e}.${t}`;
    }
    async toArrayBuffer() {
      return await (await this.toBlob()).arrayBuffer();
    }
    async toBlob() {
      if (!this._data) throw new W(`Invalid image data.`);
      if (this._isDataURL(this._data)) {
        let e = this._data,
          [t, n] = e.split(`,`);
        if ((!t || !n) && e.length) return new Blob([e]);
        if (!t || !n) throw new W(`Invalid image data.`);
        let r = t.replace(`data:`, ``).replace(/;base64$/, ``);
        return new Blob([n], { type: r });
      }
      if (this._isArrayBuffer(this._data)) return new Blob([this._data]);
      if (this._isBlob(this._data)) return this._data;
      throw new W(`Invalid image data.`);
    }
    async _fromUrlToBlob(e) {
      return (await fetch(e)).blob();
    }
    _isArrayBuffer(e) {
      return e instanceof ArrayBuffer;
    }
    _isDataURL(e) {
      return typeof e == `string` && e.startsWith(`data:`);
    }
    _isBlob(e) {
      return e instanceof Blob;
    }
  },
  hi = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_url`),
        U(this, `_fileName`, ``),
        U(this, `_parentAnimations`),
        U(this, `_zipOptions`),
        this._requireValidId(e.id),
        this._requireValidFileName(e.fileName),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.id && (this._id = e.id),
        e.url && (this._url = e.url),
        e.fileName && (this._fileName = e.fileName),
        (this._parentAnimations = e.parentAnimations || []));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    get fileName() {
      return this._fileName;
    }
    set fileName(e) {
      if (!e) throw new W(`Invalid audio file name`, `ASSET_NOT_FOUND`);
      this._fileName = e;
    }
    get id() {
      return this._id;
    }
    set id(e) {
      if (!e) throw new W(`Invalid audio id`, `ASSET_NOT_FOUND`);
      this._id = e;
    }
    get data() {
      return this._data;
    }
    set data(e) {
      if (!e) throw new W(`Invalid data`);
      this._data = e;
    }
    get parentAnimations() {
      return this._parentAnimations;
    }
    set parentAnimations(e) {
      this._parentAnimations = e;
    }
    async toDataURL() {
      if (this._data && this._isDataURL(this._data)) return this.data;
      let e = await this.toArrayBuffer();
      return Er(new Uint8Array(e));
    }
    async renameAudio(e) {
      this.id = e;
      let t = await wr(await this.toDataURL());
      if (!t) throw new W(`File extension type could not be detected from asset file.`);
      this.fileName = `${e}.${t}`;
    }
    async toArrayBuffer() {
      return await (await this.toBlob()).arrayBuffer();
    }
    async toBlob() {
      if (
        (!this._data && this._url && (this._data = await this._fromUrlToBlob(this._url)),
        !this._data)
      )
        throw Error(`Invalid data`);
      if (this._isDataURL(this._data)) {
        let e = this._data,
          [t, n] = e.split(`,`);
        if ((!t || !n) && e.length) return new Blob([e]);
        if (!t || !n) throw Error(`Invalid data`);
        let r = t.replace(`data:`, ``).replace(/;base64$/, ``);
        return new Blob([n], { type: r });
      }
      if (this._isArrayBuffer(this._data)) return new Blob([this._data]);
      if (this._isBlob(this._data)) return this._data;
      throw Error(`Invalid data`);
    }
    async _fromUrlToBlob(e) {
      return (await fetch(e)).blob();
    }
    _isArrayBuffer(e) {
      return e instanceof ArrayBuffer;
    }
    _isDataURL(e) {
      return typeof e == `string` && e.startsWith(`data:`);
    }
    _isBlob(e) {
      return e instanceof Blob;
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid audio id`);
    }
    _requireValidFileName(e) {
      if (!e) throw new W(`Invalid audio fileName`);
    }
  },
  gi = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_fileName`, ``),
        U(this, `_parentAnimations`),
        U(this, `_zipOptions`),
        this._requireValidId(e.id),
        this._requireValidFileName(e.fileName),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.id && (this._id = e.id),
        e.fileName && (this._fileName = e.fileName),
        (this._parentAnimations = e.parentAnimations || []));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid font id`);
    }
    _requireValidFileName(e) {
      if (!e) throw new W(`Invalid font fileName`);
    }
    get fileName() {
      return this._fileName;
    }
    set fileName(e) {
      (this._requireValidFileName(e), (this._fileName = e));
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get data() {
      return this._data;
    }
    set data(e) {
      if (!e) throw new W(`Invalid data`);
      this._data = e;
    }
    get parentAnimations() {
      return this._parentAnimations;
    }
    set parentAnimations(e) {
      this._parentAnimations = e;
    }
    async toDataURL() {
      if (this._data && this._isDataURL(this._data)) return this.data;
      let e = await this.toArrayBuffer();
      return Er(new Uint8Array(e));
    }
    async renameFont(e) {
      let t = await wr(await this.toDataURL());
      if (!t) throw new W(`File extension type could not be detected from font file.`);
      this.fileName = `${e}.${t}`;
    }
    async toArrayBuffer() {
      return await (await this.toBlob()).arrayBuffer();
    }
    async toBlob() {
      if (!this._data) throw new W(`Invalid font data.`);
      if (this._isDataURL(this._data)) {
        let e = this._data,
          [t, n] = e.split(`,`);
        if ((!t || !n) && e.length) return new Blob([e]);
        if (!t || !n) throw new W(`Invalid font data.`);
        let r = t.replace(`data:`, ``).replace(/;base64$/, ``);
        return new Blob([n], { type: r });
      }
      if (this._isArrayBuffer(this._data)) return new Blob([this._data]);
      if (this._isBlob(this._data)) return this._data;
      throw new W(`Invalid font data.`);
    }
    async _fromUrlToBlob(e) {
      return (await fetch(e)).blob();
    }
    _isArrayBuffer(e) {
      return e instanceof ArrayBuffer;
    }
    _isDataURL(e) {
      return typeof e == `string` && e.startsWith(`data:`);
    }
    _isBlob(e) {
      return e instanceof Blob;
    }
  },
  _i = class extends hi {
    constructor(e) {
      super(e);
    }
  },
  vi = class extends gi {
    constructor(e) {
      super(e);
    }
  },
  yi = class extends mi {
    constructor(e) {
      super(e);
    }
  },
  bi = class extends pi {
    constructor(e) {
      super(e);
    }
    async toBase64() {
      let e = await this.toArrayBuffer();
      if (typeof window > `u`) return Buffer.from(e).toString(`base64`);
      let t = new Uint8Array(e).reduce((e, t) => e + String.fromCharCode(t), ``);
      return window.btoa(t);
    }
    async _extractImageAssets() {
      if (!this._data) throw new W(`Failed to extract image assets: Animation data does not exist`);
      let e = this._data.assets;
      if (!e) throw new W(`Failed to extract image assets: No assets found inside animation`);
      for (let t of e)
        if (`w` in t && `h` in t && !(`xt` in t) && `p` in t) {
          let e = t.p.split(`,`);
          if (!e.length || !e[0] || !e[1]) break;
          let n = null,
            r = await wr(t.p);
          if (r) {
            n = r;
            let e = `${t.id}.${n}`;
            (this._imageAssets.push(
              new yi({
                data: t.p,
                id: t.id,
                lottieAssetId: t.id,
                fileName: e,
                parentAnimations: [this],
              })
            ),
              (t.p = e),
              (t.u = `/i/`),
              (t.e = 0));
          }
        }
      return !1;
    }
    async _extractAudioAssets() {
      if (!this._data) throw new W(`Failed to extract audio assets: Animation data does not exist`);
      let e = this._data.assets;
      if (!e) throw new W(`Failed to extract image assets: No assets found inside animation`);
      for (let t of e)
        if (Or(t)) {
          let e = t.p.split(`,`);
          if (!e.length || !e[0] || !e[1]) break;
          let n = null;
          n = await wr(t.p);
          let r = `${t.id}.${n}`;
          (this._audioAssets.push(
            new _i({ data: t.p, id: t.id, fileName: r, parentAnimations: [this] })
          ),
            (t.p = r),
            (t.u = `/u/`),
            (t.e = 0));
        }
      return !1;
    }
    async _extractFontAssets() {
      if (!this._data) throw new W(`Failed to extract font assets: Animation data does not exist`);
      let e = this._data.fonts?.list;
      if (!e) throw new W(`Failed to extract font assets: No fonts found inside animation`);
      for (let t of e)
        if (t.fPath && kr(t.fPath)) {
          let e = t.fPath,
            n = null,
            r = await wr(t.fPath);
          if (r) {
            n = r;
            let i = `${t.fName}.${n}`;
            (this._fontAssets.push(
              new vi({ data: e, id: t.fName, fileName: i, parentAnimations: [this] })
            ),
              (t.fPath = `/f/${i}`),
              (t.origin = 3));
          }
        }
      return !1;
    }
  },
  xi = function (e, t) {
    var n = typeof Symbol == `function` && e[Symbol.iterator];
    if (!n) return e;
    var r = n.call(e),
      i,
      a = [],
      o;
    try {
      for (; (t === void 0 || t-- > 0) && !(i = r.next()).done; ) a.push(i.value);
    } catch (e) {
      o = { error: e };
    } finally {
      try {
        i && !i.done && (n = r.return) && n.call(r);
      } finally {
        if (o) throw o.error;
      }
    }
    return a;
  },
  Si = function (e, t) {
    for (var n = 0, r = t.length, i = e.length; n < r; n++, i++) e[i] = t[n];
    return e;
  },
  Ci = (function () {
    function e(e, t, n) {
      ((this.document = e), (this.glayScaleCalculator = t), (this.resizer = n));
    }
    return (
      (e.prototype.createCanvasRenderingContext2D = function (e, t) {
        var n = this.document.createElement(`canvas`);
        ((n.width = e),
          (n.height = t),
          n.setAttribute(
            `style`,
            `image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;`
          ));
        var r = n.getContext(`2d`);
        if (r === null) throw ReferenceError(`undefined CanvasRenderingContext2D`);
        return (
          (r.mozImageSmoothingEnabled = !0),
          (r.webkitImageSmoothingEnabled = !0),
          (r.msImageSmoothingEnabled = !0),
          (r.imageSmoothingEnabled = !0),
          r
        );
      }),
      (e.prototype.convert = function (e) {
        var t = this,
          n = new Image(),
          r = new Promise(function (e) {
            n.onload = function () {
              var r = t.createCanvasRenderingContext2D(n.width, n.height);
              r.drawImage(n, 0, 0, n.width, n.height);
              var i = r.getImageData(0, 0, n.width, n.height).data;
              e(i);
            };
          })
            .then(function (r) {
              return t.resizer.resize(r, n.width, n.height, e.width, e.height);
            })
            .then(function (e) {
              var n = Si([], xi(Array(e.length / 4).keys())).map(function (n) {
                var r = n * 4,
                  i = xi([e[r], e[r + 1], e[r + 2]], 3),
                  a = i[0],
                  o = i[1],
                  s = i[2];
                return t.glayScaleCalculator(a, o, s);
              });
              return new Uint8ClampedArray(n);
            });
        return ((n.src = e.url.toString()), r);
      }),
      e
    );
  })(),
  wi = (function () {
    function e(e, t) {
      (t === void 0 && (t = 8),
        (this.url = e),
        (this.hashSize = t),
        (this.width = t + 1),
        (this.height = t));
    }
    return (
      (e.prototype.calculateArea = function () {
        return this.width * this.height;
      }),
      e
    );
  })(),
  Ti = Rn(Wn()),
  Ei = (function () {
    function e() {}
    return (
      (e.prototype.resize = function (e, t, n, r, i) {
        var a = new Di(t, n, e),
          o = new Di(r, i, new Uint8ClampedArray(r * i * 4));
        return ((0, Ti.lanczos)(a, o), o.data);
      }),
      e
    );
  })(),
  Di = (function () {
    function e(e, t, n) {
      ((this.width = e), (this.height = t), (this.data = n));
    }
    return e;
  })(),
  Oi = function (e, t) {
    var n = typeof Symbol == `function` && e[Symbol.iterator];
    if (!n) return e;
    var r = n.call(e),
      i,
      a = [],
      o;
    try {
      for (; (t === void 0 || t-- > 0) && !(i = r.next()).done; ) a.push(i.value);
    } catch (e) {
      o = { error: e };
    } finally {
      try {
        i && !i.done && (n = r.return) && n.call(r);
      } finally {
        if (o) throw o.error;
      }
    }
    return a;
  },
  ki = function (e, t) {
    for (var n = 0, r = t.length, i = e.length; n < r; n++, i++) e[i] = t[n];
    return e;
  },
  Ai = (function () {
    function e(e) {
      if (
        e.split(``).find(function (e) {
          return e !== `1` && e !== `0`;
        })
      )
        throw TypeError(`Not bits.`);
      this.rawHash = e;
    }
    return (
      (e.prototype.getHammingDistance = function (e) {
        if (this.rawHash.length !== e.rawHash.length) throw TypeError(`Not equal to hash length.`);
        var t = e.rawHash.split(``);
        return this.rawHash.split(``).filter(function (e, n) {
          return e !== (t[n] || `0`);
        }).length;
      }),
      (e.prototype.toString = function () {
        return this.calcuateHexadecimal(
          this.rawHash.split(``).map(function (e) {
            return +(e === `1`);
          })
        );
      }),
      (e.prototype.arrayChunk = function (e, t) {
        return ki([], Oi(Array(Math.ceil(e.length / t)).keys())).map(function (n) {
          return e.slice(n * t, n * t + t);
        });
      }),
      (e.prototype.calcuateHexadecimal = function (e) {
        return this.arrayChunk(e, 4)
          .map(function (e) {
            return parseInt(e.join(``), 2).toString(16);
          })
          .join(``);
      }),
      e
    );
  })(),
  ji = function (e, t) {
    var n = typeof Symbol == `function` && e[Symbol.iterator];
    if (!n) return e;
    var r = n.call(e),
      i,
      a = [],
      o;
    try {
      for (; (t === void 0 || t-- > 0) && !(i = r.next()).done; ) a.push(i.value);
    } catch (e) {
      o = { error: e };
    } finally {
      try {
        i && !i.done && (n = r.return) && n.call(r);
      } finally {
        if (o) throw o.error;
      }
    }
    return a;
  },
  Mi = function (e, t) {
    for (var n = 0, r = t.length, i = e.length; n < r; n++, i++) e[i] = t[n];
    return e;
  },
  Ni = (function () {
    function e(e) {
      this.document = e;
    }
    return (
      (e.prototype.generateByImage = function (e, t) {
        ((t.width = e.width), (t.height = e.height));
        var n = this.document.createElement(`canvas`).getContext(`2d`);
        if (n === null) throw ReferenceError(`undefined CanvasRenderingContext2D`);
        return (n.drawImage(t, 0, 0, e.width, e.height), this.generate(e, n));
      }),
      (e.prototype.generateByCanvasRenderingContext2D = function (e, t) {
        var n = t.getImageData(0, 0, e.width, e.height).data,
          r = new Uint8ClampedArray(
            Mi([], ji(Array(n.length / 4).keys())).map(function (e) {
              return n[e * 4];
            })
          );
        return this.generate(e, r);
      }),
      (e.prototype.generateByUint8ClampedArray = function (e, t) {
        if (t.length !== e.calculateArea())
          throw Error(
            `Not convertable grayArray, convertable grayArray length is ` + e.calculateArea()
          );
        return new Ai(
          Array.from(t)
            .map(function (e, t, n) {
              return +(e <= n[t + 1]);
            })
            .filter(function (t, n) {
              return (n + 1) % e.width !== 0;
            })
            .join(``)
        );
      }),
      (e.prototype.generate = function (e, t) {
        if (t instanceof HTMLImageElement) return this.generateByImage(e, t);
        if (t instanceof CanvasRenderingContext2D)
          return this.generateByCanvasRenderingContext2D(e, t);
        if (t instanceof Uint8ClampedArray) return this.generateByUint8ClampedArray(e, t);
        throw TypeError(`Not generatable glay image source.`);
      }),
      e
    );
  })();
function Pi(e, t, n) {
  return Math.round((e * 299) / 1e3 + (t * 587) / 1e3 + (n * 114) / 1e3);
}
var Fi = function (e, t, n, r) {
    function i(e) {
      return e instanceof n
        ? e
        : new n(function (t) {
            t(e);
          });
    }
    return new (n ||= Promise)(function (t, n) {
      function a(e) {
        try {
          s(r.next(e));
        } catch (e) {
          n(e);
        }
      }
      function o(e) {
        try {
          s(r.throw(e));
        } catch (e) {
          n(e);
        }
      }
      function s(e) {
        e.done ? t(e.value) : i(e.value).then(a, o);
      }
      s((r = r.apply(e, [])).next());
    });
  },
  Ii = function (e, t) {
    var n = {
        label: 0,
        sent: function () {
          if (a[0] & 1) throw a[1];
          return a[1];
        },
        trys: [],
        ops: [],
      },
      r,
      i,
      a,
      o;
    return (
      (o = { next: s(0), throw: s(1), return: s(2) }),
      typeof Symbol == `function` &&
        (o[Symbol.iterator] = function () {
          return this;
        }),
      o
    );
    function s(e) {
      return function (t) {
        return c([e, t]);
      };
    }
    function c(o) {
      if (r) throw TypeError(`Generator is already executing.`);
      for (; n; )
        try {
          if (
            ((r = 1),
            i &&
              (a =
                o[0] & 2
                  ? i.return
                  : o[0]
                    ? i.throw || ((a = i.return) && a.call(i), 0)
                    : i.next) &&
              !(a = a.call(i, o[1])).done)
          )
            return a;
          switch (((i = 0), a && (o = [o[0] & 2, a.value]), o[0])) {
            case 0:
            case 1:
              a = o;
              break;
            case 4:
              return (n.label++, { value: o[1], done: !1 });
            case 5:
              (n.label++, (i = o[1]), (o = [0]));
              continue;
            case 7:
              ((o = n.ops.pop()), n.trys.pop());
              continue;
            default:
              if (
                ((a = n.trys), !(a = a.length > 0 && a[a.length - 1])) &&
                (o[0] === 6 || o[0] === 2)
              ) {
                n = 0;
                continue;
              }
              if (o[0] === 3 && (!a || (o[1] > a[0] && o[1] < a[3]))) {
                n.label = o[1];
                break;
              }
              if (o[0] === 6 && n.label < a[1]) {
                ((n.label = a[1]), (a = o));
                break;
              }
              if (a && n.label < a[2]) {
                ((n.label = a[2]), n.ops.push(o));
                break;
              }
              (a[2] && n.ops.pop(), n.trys.pop());
              continue;
          }
          o = t.call(e, n);
        } catch (e) {
          ((o = [6, e]), (i = 0));
        } finally {
          r = a = 0;
        }
      if (o[0] & 5) throw o[1];
      return { value: o[0] ? o[1] : void 0, done: !0 };
    }
  },
  Li = (function () {
    function e(e, t) {
      (e === void 0 && (e = null),
        t === void 0 && (t = window.document),
        e === null && (e = new Ci(t, Pi, new Ei())),
        (this.dHashConverter = e),
        (this.generator = new Ni(t)));
    }
    return (
      (e.prototype.build = function (e, t) {
        return (
          t === void 0 && (t = 8),
          Fi(this, void 0, void 0, function () {
            var n, r;
            return Ii(this, function (i) {
              switch (i.label) {
                case 0:
                  return ((n = new wi(e, t)), [4, this.dHashConverter.convert(n)]);
                case 1:
                  return ((r = i.sent()), [2, this.generator.generate(n, r)]);
              }
            });
          })
        );
      }),
      e
    );
  })(),
  Ri = class {
    constructor(e) {
      (U(this, `dotlottie`),
        U(this, `_parallel`, !1),
        (this.dotlottie = void 0),
        e?.parallel && (this._parallel = e.parallel));
    }
    install(e) {
      this.dotlottie = e;
    }
    uninstall() {
      this.dotlottie = void 0;
    }
    get parallel() {
      return this._parallel;
    }
    set parallel(e) {
      this._parallel = e;
    }
    async onBuild() {
      throw new W(`dotlottie-plugin build Not implemented!`);
    }
    _requireDotLottie(e) {
      if (!e) throw new W(`dotLottie context is null inside of duplicate image detector plugin.`);
    }
  },
  zi = class extends Ri {
    async generatePhash(e) {
      throw new W(
        `generatePhash(image: LottieImageCommon): Promise<Hash> is not implemented in concrete class.`
      );
    }
    distanceTo(e, t) {
      throw new W(
        `distanceTo(_imageHash: string, _targetImageHash: string): Promise<number> is not implemented in concrete class.`
      );
    }
    async _createRecordOfDuplicates() {
      this._requireDotLottie(this.dotlottie);
      let e = [],
        t = {};
      for (let t of this.dotlottie.animations)
        for (let n of t.imageAssets)
          e.push({ excludeFromExport: !1, image: n, hash: await this.generatePhash(n) });
      for (let n of e)
        for (let r of e)
          n.image.lottieAssetId !== r.image.lottieAssetId &&
            !n.excludeFromExport &&
            !r.excludeFromExport &&
            n.hash &&
            r.hash &&
            this.distanceTo(n.hash, r.hash) < 5 &&
            (!t[n.image.fileName] && !t[r.image.fileName]
              ? ((r.excludeFromExport = !0), (t[n.image.fileName] = [r.image]))
              : t[r.image.fileName] &&
                (t[r.image.fileName]?.find((e) => e.id === n.image.lottieAssetId) ||
                  ((n.excludeFromExport = !0), t[r.image.fileName]?.push(n.image))));
      return t;
    }
    adjustDuplicateImageAssetPath(e, t) {
      for (let n in t)
        n &&
          t[n]?.forEach((t) => {
            if (e.data) {
              let r = e.data.assets;
              r &&
                r.forEach((e) => {
                  `w` in e && `h` in e && e.p === t.fileName && (e.p = n);
                });
            }
          });
    }
    async onBuild() {
      this._requireDotLottie(this.dotlottie);
      let e = await this._createRecordOfDuplicates();
      this.dotlottie.animations.forEach((t) => {
        this.adjustDuplicateImageAssetPath(t, e);
      });
      let t = {},
        n = this.dotlottie.getImages();
      for (let r in e)
        if (r)
          for (let e of n)
            e.fileName === r &&
              e.data !== void 0 &&
              (t[r] = new yi({
                data: e.data,
                id: e.id,
                lottieAssetId: e.lottieAssetId,
                fileName: e.fileName,
              }));
      if (Object.keys(t).length !== Object.keys(e).length)
        throw new W(`The number of cloned images does not match the number of duplicate keys.`);
      for (let n in e)
        n &&
          e[n]?.forEach((e) => {
            if (e.parentAnimations.length)
              for (let r of e.parentAnimations) {
                r.imageAssets.splice(r.imageAssets.indexOf(e), 1);
                let i = t[n];
                i !== void 0 && (r.imageAssets.push(i), i.parentAnimations.push(r));
              }
          });
    }
  },
  Bi = class extends zi {
    async generatePhash(e) {
      let t = new Li(),
        n = new URL(await e.toDataURL());
      return (await t.build(n)).rawHash;
    }
    distanceTo(e, t) {
      let n = new Ai(e),
        r = new Ai(t);
      return n.getHammingDistance(r);
    }
  };
async function Vi(e) {
  if ((await Mr(new Uint8Array(e))) !== `2`) {
    let t = new Hi(),
      n = await new ra().fromArrayBuffer(e),
      r = n.animations.map((e) => e.id);
    for (let e of r) {
      let r = await n.getAnimation(e, { inlineAssets: !0 });
      r && r.data && t.addAnimation({ data: r.data, id: e });
    }
    return (await t.build(), t);
  }
  return new Hi().fromArrayBuffer(e);
}
var Hi = class e extends fi {
    constructor(e) {
      if ((super(e), this.enableDuplicateImageOptimization)) {
        let e = new Bi();
        (e.install(this), this._plugins.push(e));
      }
    }
    addAnimation(e) {
      let t = new bi(e);
      if (this._animationsMap.get(e.id)) throw new W(`Duplicate animation id detected, aborting.`);
      return (this._animationsMap.set(t.id, t), this);
    }
    async toBase64(e) {
      let t = await this.toArrayBuffer(e),
        n = new Uint8Array(t).reduce((e, t) => e + String.fromCharCode(t), ``);
      return window.btoa(n);
    }
    async download(e, t) {
      let n = await this.toBlob(t),
        r = URL.createObjectURL(n),
        i = document.createElement(`a`);
      ((i.href = r),
        (i.download = e),
        (i.style.display = `none`),
        document.body.append(i),
        i.click(),
        setTimeout(() => {
          (URL.revokeObjectURL(r), i.remove());
        }, 1e3));
    }
    create(t) {
      return new e(t);
    }
    async toArrayBuffer(e) {
      let t = this._buildManifest(),
        n = { 'manifest.json': [nn(JSON.stringify(t)), {}] };
      for (let e of this.animations) {
        let t = await e.toJSON();
        n[`a/${e.id}.json`] = [nn(JSON.stringify(t)), e.zipOptions];
        let r = e.imageAssets,
          i = e.audioAssets;
        for (let e of r) {
          let t = await e.toDataURL();
          n[`i/${e.fileName}`] = [Sr(t), e.zipOptions];
        }
        for (let e of i) {
          let t = await e.toDataURL();
          n[`u/${e.fileName}`] = [Sr(t), e.zipOptions];
        }
        let a = e.fontAssets;
        for (let e of a) {
          let t = await e.toDataURL();
          n[`f/${e.fileName}`] = [Sr(t), e.zipOptions];
        }
      }
      for (let e of this.themes) {
        let t = await e.toString();
        n[`t/${e.id}.json`] = [nn(t), e.zipOptions];
      }
      for (let e of this.stateMachines) {
        let t = e.toString();
        n[`s/${e.id}.json`] = [nn(t), e.zipOptions];
      }
      return await new Promise((t, r) => {
        dn(n, e?.zipOptions || {}, (e, n) => {
          if (e) {
            r(e);
            return;
          }
          t(n.buffer);
        });
      });
    }
    async fromArrayBuffer(t) {
      if ((await Mr(new Uint8Array(t))) !== `2`) return Vi(t);
      let n = new e();
      try {
        let e = await new Promise((e, n) => {
            pn(new Uint8Array(t), (t, r) => {
              (t && n(t), e(r));
            });
          }),
          r = [],
          i = [],
          a = [];
        if (e[`manifest.json`] instanceof Uint8Array)
          try {
            let t = JSON.parse(rn(e[`manifest.json`], !1));
            for (let o of Object.keys(e)) {
              let s = rn(e[o], !0);
              if (o.startsWith(`a/`) && o.endsWith(`.json`)) {
                let e = /a\/(.+)\.json/u.exec(o)?.[1];
                if (!e) throw new W(`Invalid animation id`);
                let r = JSON.parse(s),
                  i = t.animations.find((t) => t.id === e);
                if (i === void 0) throw new W(`Animation not found inside manifest`);
                n.addAnimation({ data: r, ...i });
              } else if (o.startsWith(`i/`)) {
                let e = /i\/(.+)\./u.exec(o)?.[1];
                if (!e) throw new W(`Invalid image id`);
                let t = btoa(s);
                ((t = `data:image/${await wr(t)};base64,${t}`),
                  r.push(
                    new yi({ id: e, lottieAssetId: e, data: t, fileName: o.split(`/`)[1] || `` })
                  ));
              } else if (o.startsWith(`u/`)) {
                let e = /u\/(.+)\./u.exec(o)?.[1];
                if (!e) throw new W(`Invalid image id`);
                let t = btoa(s);
                ((t = `data:audio/${await wr(t)};base64,${t}`),
                  i.push(new _i({ id: e, data: t, fileName: o.split(`/`)[1] || `` })));
              } else if (o.startsWith(`f/`)) {
                let e = /f\/(.+)\./u.exec(o)?.[1];
                if (!e) throw new W(`Invalid font id`);
                let t = btoa(s);
                ((t = `data:font/${await wr(t)};base64,${t}`),
                  a.push(new vi({ id: e, data: t, fileName: o.split(`/`)[1] || `` })));
              } else if (o.startsWith(`t/`) && o.endsWith(`.json`)) {
                let e = /t\/(.+)\.json/u.exec(o)?.[1];
                if (!e) throw new W(`Invalid theme id`);
                t.themes?.forEach((t) => {
                  t.id === e && n.addTheme({ id: t.id, name: t.name, data: JSON.parse(s) });
                });
              } else if (o.startsWith(`s/`) && o.endsWith(`.json`)) {
                let e = /s\/(.+)\.json/u.exec(o)?.[1];
                if (!e) throw new W(`Invalid theme id`);
                t.stateMachines?.forEach((t) => {
                  t.id === e && n.addStateMachine({ id: t.id, name: t.name, data: JSON.parse(s) });
                });
              }
            }
            for (let e of r)
              for (let t of n.animations)
                if (t.data) {
                  let n = t.data.assets;
                  if (n)
                    for (let r of n)
                      `w` in r &&
                        `h` in r &&
                        r.p === e.fileName &&
                        (e.parentAnimations.push(t), t.imageAssets.push(e));
                }
            for (let e of i)
              for (let t of n.animations)
                if (t.data) {
                  let n = t.data.assets;
                  if (n)
                    for (let r of n)
                      Or(r) &&
                        r.p.includes(e.id) &&
                        (e.parentAnimations.push(t), t.audioAssets.push(e));
                }
            for (let e of a)
              for (let t of n.animations)
                if (t.data) {
                  let n = t.data.fonts?.list;
                  if (n)
                    for (let r of n)
                      r.fPath === `/f/${e.fileName}` &&
                        (e.parentAnimations.push(t), t.fontAssets.push(e));
                }
          } catch (e) {
            if (e instanceof Error) throw new W(`Invalid manifest inside buffer! ${e.message}`);
          }
        else throw new W(`Invalid buffer`);
      } catch (e) {
        if (e instanceof Error) throw new W(e.message);
      }
      return n;
    }
  },
  Ui = class {
    constructor(e) {
      (U(this, `_animationsMap`, new Map()),
        U(this, `_plugins`, []),
        U(this, `_author`, Pr),
        U(this, `_description`),
        U(this, `_generator`, Pr),
        U(this, `_keywords`),
        U(this, `_version`, `1`),
        U(this, `_revision`),
        U(this, `_customData`),
        U(this, `enableDuplicateImageOptimization`),
        typeof e?.author == `string` && (this._author = e.author),
        typeof e?.description == `string` && (this._description = e.description),
        typeof e?.generator == `string` && (this._generator = e.generator),
        typeof e?.keywords == `string` && (this._keywords = e.keywords),
        typeof e?.revision == `number` && (this._revision = e.revision),
        (this.enableDuplicateImageOptimization = e?.enableDuplicateImageOptimization ?? !1));
    }
    async toBase64(e = void 0) {
      throw new W(`toBase64() method not implemented in concrete class!`);
    }
    create(e) {
      throw new W(`create() method not implemented in concrete class!`);
    }
    async download(e, t = void 0) {
      throw new W(`download(fileName:string) method not implemented in concrete class!`);
    }
    addPlugins(...e) {
      throw new W(`addPlugins(...plugins: DotLottieV1Plugin[]) not implemented in concrete class!`);
    }
    addAnimation(e) {
      throw new W(
        `addAnimation(animationOptions: AnimationOptions) not implemented in concrete class!`
      );
    }
    async fromArrayBuffer(e) {
      throw new W(
        `fromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<DotLottieCommonV1> not implemented in concrete class!`
      );
    }
    async toArrayBuffer(e = void 0) {
      throw new W(`toArrayBuffer(): Promise<ArrayBuffer> is not implemented in concrete class!`);
    }
    get plugins() {
      return this._plugins;
    }
    get version() {
      return this._version;
    }
    get revision() {
      return this._revision;
    }
    get author() {
      return this._author;
    }
    get description() {
      return this._description;
    }
    get keywords() {
      return this._keywords;
    }
    get generator() {
      return this._generator;
    }
    get animations() {
      return Array.from(this._animationsMap.values());
    }
    get manifest() {
      return this._buildManifest();
    }
    get custom() {
      return this._customData;
    }
    setCustomData(e) {
      return ((this._customData = e ?? {}), this);
    }
    setAuthor(e) {
      return ((this._author = e), this);
    }
    setDescription(e) {
      return ((this._description = typeof e == `string` ? e : ``), this);
    }
    setKeywords(e) {
      return ((this._keywords = typeof e == `string` ? e : `DotLottieV1`), this);
    }
    setRevision(e) {
      return ((this._revision = e), this);
    }
    async _renameImage(e, t, n) {
      for (let r of e.imageAssets)
        if (r.lottieAssetId === n) {
          let n = r.fileName;
          if ((await r.renameImage(t), !e.data)) throw new W(`No animation data available.`);
          let i = e.data.assets;
          if (!i) throw new W(`No image assets to rename.`);
          for (let e of i) `w` in e && `h` in e && e.p === n && (e.p = r.fileName);
        }
    }
    _generateMapOfOccurencesFromImageIds() {
      let e = new Map();
      return (
        this.animations.forEach((t) => {
          t.imageAssets.forEach((t) => {
            if (e.has(t.lottieAssetId)) {
              let n = e.get(t.lottieAssetId) ?? 0;
              e.set(t.lottieAssetId, n + 1);
            } else e.set(t.lottieAssetId, 1);
          });
        }),
        e
      );
    }
    async _renameImageAssets() {
      let e = this._generateMapOfOccurencesFromImageIds();
      for (let t = this.animations.length - 1; t >= 0; --t) {
        let n = this.animations.at(t);
        if (n)
          for (let t = n.imageAssets.length - 1; t >= 0; --t) {
            let r = n.imageAssets.at(t);
            if (r) {
              let t = e.get(r.lottieAssetId) ?? 0;
              (t > 0 && --t,
                e.set(r.lottieAssetId, t),
                t > 0 && (await this._renameImage(n, `${r.lottieAssetId}_${t}`, r.lottieAssetId)));
            }
          }
      }
    }
    async _renameAudio(e, t, n) {
      for (let r of e.audioAssets)
        if (r.id === n) {
          if ((await r.renameAudio(t), !e.data)) throw new W(`No animation data available.`);
          let i = e.data.assets;
          if (!i) throw new W(`No audio assets to rename.`);
          for (let e of i) Or(e) && e.id === n && (e.p = r.fileName);
        }
    }
    async _renameAudioAssets() {
      let e = new Map();
      this.animations.forEach((t) => {
        e.set(t.id, t.audioAssets);
      });
      let t = 0;
      e.forEach((e) => {
        t += e.length;
      });
      for (let e = this.animations.length - 1; e >= 0; --e) {
        let n = this.animations.at(e);
        if (n)
          for (let e = n.audioAssets.length - 1; e >= 0; --e) {
            let r = n.audioAssets.at(e);
            r && (await this._renameAudio(n, `audio_${t}`, r.id), --t);
          }
      }
    }
    _addLottieAnimation(e) {
      if (this._animationsMap.get(e.id)) throw new W(`Duplicate animation id detected, aborting.`);
      return (this._animationsMap.set(e.id, e), this);
    }
    async _findAssetsAndInline(e) {
      let t = e.data?.assets;
      if (!t) throw new W(`Failed to inline assets, the animation's assets are undefined.`);
      let n = this.getImages(),
        r = this.getAudio();
      for (let e of t)
        if (Dr(e))
          for (let t of n)
            t.fileName === e.p && ((e.e = 1), (e.u = ``), (e.p = await t.toDataURL()));
        else if (Or(e))
          for (let t of r)
            t.fileName === e.p && ((e.e = 1), (e.u = ``), (e.p = await t.toDataURL()));
      return e;
    }
    async getAnimation(e, t) {
      if (!t?.inlineAssets) return this._animationsMap.get(e);
      let n = this._animationsMap.get(e);
      if (!n) throw new W(`Failed to find animation.`);
      return ((n = await this._findAssetsAndInline(n)), n);
    }
    getAnimations() {
      return Array.from(this._animationsMap);
    }
    removeAnimation(e) {
      let t = this._animationsMap.get(e);
      return (t && this._animationsMap.delete(t.id), this);
    }
    getImages() {
      let e = [];
      return (this.animations.map((t) => e.push(...t.imageAssets)), e);
    }
    getAudio() {
      let e = [];
      return (this.animations.map((t) => e.push(...t.audioAssets)), e);
    }
    _buildManifest() {
      let e = Array.from(this._animationsMap.values()).map((e) => ({
        id: e.id,
        ...(e.autoplay !== void 0 && { autoplay: e.autoplay }),
        ...(e.loop !== void 0 && { loop: e.loop }),
        ...(e.speed !== void 0 && { speed: e.speed }),
        ...(e.direction !== void 0 && { direction: e.direction }),
        ...(e.playMode !== void 0 && { playMode: e.playMode }),
        ...(e.hover !== void 0 && { hover: e.hover }),
        ...(e.intermission !== void 0 && { intermission: e.intermission }),
        ...(e.themeColor !== void 0 && { themeColor: e.themeColor }),
      }));
      return {
        version: this.version,
        generator: this.generator,
        author: this.author,
        ...(this.keywords !== void 0 && { keywords: this.keywords }),
        ...(this.revision !== void 0 && { revision: this.revision }),
        animations: e,
        ...(this.description && this.description.trim() !== ``
          ? { description: this.description }
          : {}),
        ...(this._customData && Object.keys(this._customData).length !== 0
          ? { custom: this._customData }
          : {}),
      };
    }
    async build() {
      this._buildManifest();
      for (let e of this.animations) await e.toJSON();
      this.animations.length > 1 &&
        (await this._renameImageAssets(), await this._renameAudioAssets());
      let e = [],
        t = [];
      for (let n of this.plugins) n.parallel ? e.push(n) : t.push(n);
      await Promise.all(e.map(async (e) => e.onBuild()));
      for (let e of t) await e.onBuild();
      return this;
    }
    async toBlob(e = void 0) {
      let t = await this.toArrayBuffer(e);
      return new Blob([t], { type: `application/zip` });
    }
    async fromURL(e) {
      if (!Tr(e)) throw new W(`Invalid URL`);
      try {
        let t = await fetch(e);
        if (!t.ok) throw new W(t.statusText);
        let n = await t.arrayBuffer();
        return this.fromArrayBuffer(n);
      } catch (e) {
        if (e instanceof Error) throw new W(e.message);
      }
      throw new W(`Unknown error`);
    }
    merge(...e) {
      let t = this.create();
      for (let n of e)
        n.animations.forEach((e) => {
          e.data
            ? t.addAnimation({ id: e.id, data: e.data })
            : e.url && t.addAnimation({ id: e.id, url: e.url });
        });
      return t;
    }
    _requireValidAuthor(e) {
      if (typeof e != `string`) throw new W(`Invalid author`);
    }
    _requireValidDescription(e) {
      if (typeof e != `string`) throw new W(`Invalid description`);
    }
    _requireValidGenerator(e) {
      if (typeof e != `string`) throw new W(`Invalid generator`);
    }
    _requireValidKeywords(e) {
      if (typeof e != `string`) throw new W(`Invalid keywords`);
    }
    _requireValidVersion(e) {
      if (typeof e != `string`) throw new W(`Invalid version`);
    }
    _requireValidCustomData(e) {
      if (!e) throw new W(`Invalid customData`);
    }
  },
  Wi = ((e) => ((e.Bounce = `bounce`), (e.Normal = `normal`), e))(Wi || {}),
  Gi = Cn(Wi),
  Ki = B({
    id: H(),
    autoplay: V(Sn()),
    loop: V(Dn([Sn(), z()])),
    speed: V(z()),
    direction: V(Dn([R(1), R(-1)])),
    playMode: V(Gi),
    hover: V(Sn()),
    intermission: V(z()),
    themeColor: V(H()),
  });
B({
  version: V(H()),
  generator: V(H()),
  activeAnimationId: V(H()),
  animations: L(Ki),
  author: V(H()),
  custom: V(En(H(), xn())),
  description: V(H()),
  keywords: V(H()),
  revision: V(z()),
});
var qi = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_url`),
        U(this, `_direction`),
        U(this, `_speed`),
        U(this, `_playMode`),
        U(this, `_loop`),
        U(this, `_autoplay`),
        U(this, `_hover`),
        U(this, `_intermission`),
        U(this, `_themeColor`),
        U(this, `_zipOptions`),
        U(this, `_defaultActiveAnimation`),
        U(this, `_imageAssets`, []),
        U(this, `_audioAssets`, []),
        this._requireValidOptions(e),
        (this._id = e.id),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.url && (this._url = e.url),
        (this._defaultActiveAnimation = e.defaultActiveAnimation ?? !1),
        typeof e.direction == `number` && (this.direction = e.direction),
        typeof e.speed == `number` && (this.speed = e.speed),
        typeof e.playMode == `string` && (this.playMode = e.playMode),
        (typeof e.loop == `boolean` || typeof e.loop == `number`) && (this.loop = e.loop),
        typeof e.autoplay == `boolean` && (this.autoplay = e.autoplay),
        typeof e.hover == `boolean` && (this.hover = e.hover),
        typeof e.intermission == `number` && (this.intermission = e.intermission),
        typeof e.themeColor == `string` && (this.themeColor = e.themeColor));
    }
    async toBase64() {
      throw new W(`lottie animation controls tobase64 not implemented!`);
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get imageAssets() {
      return this._imageAssets;
    }
    set imageAssets(e) {
      this._imageAssets = e;
    }
    get audioAssets() {
      return this._audioAssets;
    }
    set audioAssets(e) {
      this._audioAssets = e;
    }
    get data() {
      return this._data;
    }
    set data(e) {
      (this._requireValidLottieData(e), (this._data = e));
    }
    get url() {
      return this._url;
    }
    set url(e) {
      (this._requireValidUrl(e), (this._url = e));
    }
    get themeColor() {
      return this._themeColor;
    }
    set themeColor(e) {
      (e && this._requireValidThemeColor(e), (this._themeColor = e));
    }
    get direction() {
      return this._direction;
    }
    set direction(e) {
      this._direction = e;
    }
    get speed() {
      return this._speed;
    }
    set speed(e) {
      (typeof e == `number` && this._requireValidSpeed(e), (this._speed = e));
    }
    get playMode() {
      return this._playMode;
    }
    set playMode(e) {
      (typeof e == `string` && this._requireValidPlayMode(e), (this._playMode = e));
    }
    get loop() {
      return this._loop;
    }
    set loop(e) {
      ((typeof e == `number` || typeof e == `boolean`) && this._requireValidLoop(e),
        (this._loop = e));
    }
    get autoplay() {
      return this._autoplay;
    }
    set autoplay(e) {
      (typeof e == `boolean` && this._requireValidAutoplay(e), (this._autoplay = e));
    }
    get defaultActiveAnimation() {
      return this._defaultActiveAnimation;
    }
    set defaultActiveAnimation(e) {
      this._defaultActiveAnimation = e;
    }
    get hover() {
      return this._hover;
    }
    set hover(e) {
      (typeof e == `boolean` && this._requireValidHover(e), (this._hover = e));
    }
    get intermission() {
      return this._intermission;
    }
    set intermission(e) {
      (typeof e == `number` && this._requireValidIntermission(e), (this._intermission = e));
    }
    async toArrayBuffer(e) {
      let t = await this.toJSON(e);
      return new TextEncoder().encode(JSON.stringify(t)).buffer;
    }
    async _extractImageAssets() {
      throw new W(
        `_extractImageAssets(): Promise<boolean> method not implemented in concrete class`
      );
    }
    async _extractAudioAssets() {
      throw new W(
        `_extractAudioAssets(): Promise<boolean> method not implemented in concrete class`
      );
    }
    async toBlob(e = {}) {
      let t = await this.toJSON(e);
      return new Blob([JSON.stringify(t)], { type: `application/json` });
    }
    async toJSON(e) {
      if (
        (this._url && !this._data && (this._data = await this._fromUrl(this._url)),
        this._requireValidLottieData(this._data),
        this._data.assets?.length &&
          (await this._extractImageAssets(), await this._extractAudioAssets(), e?.inlineAssets))
      ) {
        let e = this.data?.assets;
        if (!e) throw new W(`Failed to inline assets, the animation's assets are undefined.`);
        let t = this.imageAssets,
          n = this.audioAssets;
        for (let r of e)
          if (`w` in r && `h` in r && !(`xt` in r) && `p` in r)
            for (let e of t)
              e.fileName === r.p && ((r.e = 1), (r.u = ``), (r.p = await e.toDataURL()));
          else if (Or(r))
            for (let e of n)
              e.fileName === r.p && ((r.e = 1), (r.u = ``), (r.p = await e.toDataURL()));
      }
      return this._data;
    }
    async _fromUrl(e) {
      let t = await (await fetch(e)).text(),
        n;
      try {
        n = JSON.parse(t);
      } catch (e) {
        if (e instanceof Error) throw new W(`${e.message}: Invalid json returned from url`);
      }
      return (this._requireValidLottieData(n), n);
    }
    _requireValidUrl(e) {
      try {
        new URL(e || ``);
      } catch {
        throw new W(`Invalid animation url`);
      }
    }
    _requireValidLottieData(e) {
      if (
        ![`v`, `ip`, `op`, `layers`, `fr`, `w`, `h`].every((t) =>
          Object.prototype.hasOwnProperty.call(e, t)
        )
      )
        throw new W(`Received invalid Lottie data.`);
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid animation id`);
    }
    _requireValidDirection(e) {
      if (e !== -1 && e !== 1) throw new W(`Direction can only be -1 (backwards) or 1 (forwards)`);
    }
    _requireValidIntermission(e) {
      if (e < 0 || !Number.isInteger(e)) throw new W(`intermission must be a positive number`);
    }
    _requireValidLoop(e) {
      if (typeof e == `number` && (!Number.isInteger(e) || e < 0))
        throw new W(`loop must be a positive number or boolean`);
    }
    _requireValidOptions(e) {
      if ((this._requireValidId(e.id), !e.data && !e.url)) throw new W(`No data or url provided.`);
      (e.data && this._requireValidLottieData(e.data),
        e.url && this._requireValidUrl(e.url),
        e.direction && this._requireValidDirection(e.direction),
        e.intermission && this._requireValidIntermission(e.intermission),
        e.loop && this._requireValidLoop(e.loop));
    }
    _requireValidSpeed(e) {
      if (e !== void 0 && (typeof e != `number` || e < 0))
        throw new W(`Speed must be a non-negative number`);
    }
    _requireValidPlayMode(e) {
      let t = Object.values(Wi);
      if (e !== void 0 && !t.includes(e)) throw new W(`playMode must be one of: ${t.join(`, `)}`);
    }
    _requireValidAutoplay(e) {
      if (e !== void 0 && typeof e != `boolean`) throw new W(`autoplay must be a boolean`);
    }
    _requireValidHover(e) {
      if (e !== void 0 && typeof e != `boolean`) throw new W(`Hover must be a boolean`);
    }
    _requireValidThemeColor(e) {
      if ((e !== void 0 && typeof e != `string`) || (e !== void 0 && !e.startsWith(`#`)))
        throw new W(`themeColor must be a string and start with #`);
    }
  },
  Ji = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_lottieAssetId`, ``),
        U(this, `_fileName`, ``),
        U(this, `_parentAnimations`),
        U(this, `_zipOptions`),
        this._requireValidId(e.id),
        this._requireValidLottieAssetId(e.lottieAssetId),
        this._requireValidFileName(e.fileName),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.id && (this._id = e.id),
        e.lottieAssetId && (this._lottieAssetId = e.lottieAssetId),
        e.fileName && (this._fileName = e.fileName),
        (this._parentAnimations = e.parentAnimations || []));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid image id`);
    }
    _requireValidLottieAssetId(e) {
      if (!e) throw new W(`Invalid Lottie Image Asset Id`);
    }
    _requireValidFileName(e) {
      if (!e) throw new W(`Invalid image fileName`);
    }
    get fileName() {
      return this._fileName;
    }
    set fileName(e) {
      (this._requireValidFileName(e), (this._fileName = e));
    }
    get id() {
      return this._id;
    }
    set id(e) {
      (this._requireValidId(e), (this._id = e));
    }
    get lottieAssetId() {
      return this._lottieAssetId;
    }
    set lottieAssetId(e) {
      (this._requireValidLottieAssetId(e), (this._lottieAssetId = e));
    }
    get data() {
      return this._data;
    }
    set data(e) {
      if (!e) throw new W(`Invalid data`);
      this._data = e;
    }
    get parentAnimations() {
      return this._parentAnimations;
    }
    set parentAnimations(e) {
      this._parentAnimations = e;
    }
    async toDataURL() {
      if (this._data && this._isDataURL(this._data)) return this.data;
      let e = await this.toArrayBuffer();
      return Er(new Uint8Array(e));
    }
    async renameImage(e) {
      this._lottieAssetId = e;
      let t = await wr(await this.toDataURL());
      if (!t) throw new W(`File extension type could not be detected from asset file.`);
      this.fileName = `${e}.${t}`;
    }
    async toArrayBuffer() {
      return await (await this.toBlob()).arrayBuffer();
    }
    async toBlob() {
      if (!this._data) throw new W(`Invalid image data.`);
      if (this._isDataURL(this._data)) {
        let e = this._data,
          [t, n] = e.split(`,`);
        if ((!t || !n) && e.length) return new Blob([e]);
        if (!t || !n) throw new W(`Invalid image data.`);
        let r = t.replace(`data:`, ``).replace(/;base64$/, ``);
        return new Blob([n], { type: r });
      }
      if (this._isArrayBuffer(this._data)) return new Blob([this._data]);
      if (this._isBlob(this._data)) return this._data;
      throw new W(`Invalid image data.`);
    }
    async _fromUrlToBlob(e) {
      return (await fetch(e)).blob();
    }
    _isArrayBuffer(e) {
      return e instanceof ArrayBuffer;
    }
    _isDataURL(e) {
      return typeof e == `string` && e.startsWith(`data:`);
    }
    _isBlob(e) {
      return e instanceof Blob;
    }
  },
  Yi = class {
    constructor(e) {
      (U(this, `_data`),
        U(this, `_id`, ``),
        U(this, `_url`),
        U(this, `_fileName`, ``),
        U(this, `_parentAnimations`),
        U(this, `_zipOptions`),
        this._requireValidId(e.id),
        this._requireValidFileName(e.fileName),
        (this._zipOptions = e.zipOptions ?? {}),
        e.data && (this._data = e.data),
        e.id && (this._id = e.id),
        e.url && (this._url = e.url),
        e.fileName && (this._fileName = e.fileName),
        (this._parentAnimations = e.parentAnimations || []));
    }
    get zipOptions() {
      return this._zipOptions;
    }
    set zipOptions(e) {
      this._zipOptions = e;
    }
    get fileName() {
      return this._fileName;
    }
    set fileName(e) {
      if (!e) throw new W(`Invalid audio file name`, `ASSET_NOT_FOUND`);
      this._fileName = e;
    }
    get id() {
      return this._id;
    }
    set id(e) {
      if (!e) throw new W(`Invalid audio id`, `ASSET_NOT_FOUND`);
      this._id = e;
    }
    get data() {
      return this._data;
    }
    set data(e) {
      if (!e) throw new W(`Invalid data`);
      this._data = e;
    }
    get parentAnimations() {
      return this._parentAnimations;
    }
    set parentAnimations(e) {
      this._parentAnimations = e;
    }
    async toDataURL() {
      if (this._data && this._isDataURL(this._data)) return this.data;
      let e = await this.toArrayBuffer();
      return Er(new Uint8Array(e));
    }
    async renameAudio(e) {
      this.id = e;
      let t = await wr(await this.toDataURL());
      if (!t) throw new W(`File extension type could not be detected from asset file.`);
      this.fileName = `${e}.${t}`;
    }
    async toArrayBuffer() {
      return await (await this.toBlob()).arrayBuffer();
    }
    async toBlob() {
      if (
        (!this._data && this._url && (this._data = await this._fromUrlToBlob(this._url)),
        !this._data)
      )
        throw Error(`Invalid data`);
      if (this._isDataURL(this._data)) {
        let e = this._data,
          [t, n] = e.split(`,`);
        if ((!t || !n) && e.length) return new Blob([e]);
        if (!t || !n) throw Error(`Invalid data`);
        let r = t.replace(`data:`, ``).replace(/;base64$/, ``);
        return new Blob([n], { type: r });
      }
      if (this._isArrayBuffer(this._data)) return new Blob([this._data]);
      if (this._isBlob(this._data)) return this._data;
      throw Error(`Invalid data`);
    }
    async _fromUrlToBlob(e) {
      return (await fetch(e)).blob();
    }
    _isArrayBuffer(e) {
      return e instanceof ArrayBuffer;
    }
    _isDataURL(e) {
      return typeof e == `string` && e.startsWith(`data:`);
    }
    _isBlob(e) {
      return e instanceof Blob;
    }
    _requireValidId(e) {
      if (!e) throw new W(`Invalid audio id`);
    }
    _requireValidFileName(e) {
      if (!e) throw new W(`Invalid audio fileName`);
    }
  },
  Xi = class extends Yi {
    constructor(e) {
      super(e);
    }
  },
  Zi = class extends Ji {
    constructor(e) {
      super(e);
    }
  },
  Qi = class extends qi {
    constructor(e) {
      super(e);
    }
    async toBase64() {
      let e = await this.toArrayBuffer();
      if (typeof window > `u`) return Buffer.from(e).toString(`base64`);
      let t = new Uint8Array(e).reduce((e, t) => e + String.fromCharCode(t), ``);
      return window.btoa(t);
    }
    async _extractImageAssets() {
      if (!this._data) throw new W(`Failed to extract image assets: Animation data does not exist`);
      let e = this._data.assets;
      if (!e) throw new W(`Failed to extract image assets: No assets found inside animation`);
      for (let t of e)
        if (`w` in t && `h` in t && !(`xt` in t) && `p` in t) {
          let e = t.p.split(`,`);
          if (!e.length || !e[0] || !e[1]) break;
          let n = null,
            r = await wr(t.p);
          if (r) {
            n = r;
            let e = `${t.id}.${n}`;
            (this._imageAssets.push(
              new Zi({
                data: t.p,
                id: t.id,
                lottieAssetId: t.id,
                fileName: e,
                parentAnimations: [this],
              })
            ),
              (t.p = e),
              (t.u = `/images/`),
              (t.e = 0));
          }
        }
      return !1;
    }
    async _extractAudioAssets() {
      if (!this._data) throw new W(`Failed to extract audio assets: Animation data does not exist`);
      let e = this._data.assets;
      if (!e) throw new W(`Failed to extract image assets: No assets found inside animation`);
      for (let t of e)
        if (Or(t)) {
          let e = t.p.split(`,`);
          if (!e.length || !e[0] || !e[1]) break;
          let n = null;
          n = await wr(t.p);
          let r = `${t.id}.${n}`;
          (this._audioAssets.push(
            new Xi({ data: t.p, id: t.id, fileName: r, parentAnimations: [this] })
          ),
            (t.p = r),
            (t.u = `/audio/`),
            (t.e = 0));
        }
      return !1;
    }
  },
  $i = class {
    constructor(e) {
      (U(this, `dotLottieV1`),
        U(this, `_parallel`, !1),
        (this.dotLottieV1 = void 0),
        e?.parallel && (this._parallel = e.parallel));
    }
    install(e) {
      this.dotLottieV1 = e;
    }
    uninstall() {
      this.dotLottieV1 = void 0;
    }
    get parallel() {
      return this._parallel;
    }
    set parallel(e) {
      this._parallel = e;
    }
    async onBuild() {
      throw new W(`DotLottieV1-plugin build Not implemented!`);
    }
    _requireDotLottieV1(e) {
      if (!e) throw new W(`DotLottieV1 context is null inside of duplicate image detector plugin.`);
    }
  },
  ea = class extends $i {
    async generatePhash(e) {
      throw new W(
        `generatePhash(image: LottieImageCommonV1): Promise<Hash> is not implemented in concrete class.`
      );
    }
    distanceTo(e, t) {
      throw new W(
        `distanceTo(_imageHash: string, _targetImageHash: string): Promise<number> is not implemented in concrete class.`
      );
    }
    async _createRecordOfDuplicates() {
      this._requireDotLottieV1(this.dotLottieV1);
      let e = [],
        t = {};
      for (let t of this.dotLottieV1.animations)
        for (let n of t.imageAssets)
          e.push({ excludeFromExport: !1, image: n, hash: await this.generatePhash(n) });
      for (let n of e)
        for (let r of e)
          n.image.lottieAssetId !== r.image.lottieAssetId &&
            !n.excludeFromExport &&
            !r.excludeFromExport &&
            n.hash &&
            r.hash &&
            this.distanceTo(n.hash, r.hash) < 5 &&
            (!t[n.image.fileName] && !t[r.image.fileName]
              ? ((r.excludeFromExport = !0), (t[n.image.fileName] = [r.image]))
              : t[r.image.fileName] &&
                (t[r.image.fileName]?.find((e) => e.lottieAssetId === n.image.lottieAssetId) ||
                  ((n.excludeFromExport = !0), t[r.image.fileName]?.push(n.image))));
      return t;
    }
    adjustDuplicateImageAssetPath(e, t) {
      for (let n in t)
        n &&
          t[n]?.forEach((t) => {
            if (e.data) {
              let r = e.data.assets;
              r &&
                r.forEach((e) => {
                  `w` in e && `h` in e && e.p === t.fileName && (e.p = n);
                });
            }
          });
    }
    async onBuild() {
      this._requireDotLottieV1(this.dotLottieV1);
      let e = await this._createRecordOfDuplicates();
      this.dotLottieV1.animations.forEach((t) => {
        this.adjustDuplicateImageAssetPath(t, e);
      });
      let t = {},
        n = this.dotLottieV1.getImages();
      for (let r in e)
        if (r)
          for (let e of n)
            e.fileName === r &&
              e.data !== void 0 &&
              (t[r] = new Zi({
                data: e.data,
                id: e.id,
                lottieAssetId: e.lottieAssetId,
                fileName: e.fileName,
              }));
      if (Object.keys(t).length !== Object.keys(e).length)
        throw new W(`The number of cloned images does not match the number of duplicate keys.`);
      for (let n in e)
        n &&
          e[n]?.forEach((e) => {
            if (e.parentAnimations.length)
              for (let r of e.parentAnimations) {
                r.imageAssets.splice(r.imageAssets.indexOf(e), 1);
                let i = t[n];
                i !== void 0 && (r.imageAssets.push(i), i.parentAnimations.push(r));
              }
          });
    }
  },
  ta = class extends ea {
    async generatePhash(e) {
      let t = new Li(),
        n = new URL(await e.toDataURL());
      return (await t.build(n)).rawHash;
    }
    distanceTo(e, t) {
      let n = new Ai(e),
        r = new Ai(t);
      return n.getHammingDistance(r);
    }
  };
async function na(e) {
  if ((await Mr(new Uint8Array(e))) === `2`) {
    let t = new ra(),
      n = await new Hi().fromArrayBuffer(e),
      r = n.animations.map((e) => e.id);
    for (let e of r) {
      let r = await n.getAnimation(e, { inlineAssets: !0 });
      r && r.data && t.addAnimation({ data: r.data, id: e });
    }
    return (await t.build(), t);
  } else return new ra().fromArrayBuffer(e);
}
var ra = class e extends Ui {
    constructor(e) {
      if ((super(e), this.enableDuplicateImageOptimization)) {
        let e = new ta();
        (e.install(this), this._plugins.push(e));
      }
    }
    addAnimation(e) {
      let t = new Qi(e);
      if (this._animationsMap.get(e.id)) throw new W(`Duplicate animation id detected, aborting.`);
      return (this._animationsMap.set(t.id, t), this);
    }
    async toBase64(e) {
      let t = await this.toArrayBuffer(e),
        n = new Uint8Array(t).reduce((e, t) => e + String.fromCharCode(t), ``);
      return window.btoa(n);
    }
    async download(e, t) {
      let n = await this.toBlob(t),
        r = URL.createObjectURL(n),
        i = document.createElement(`a`);
      ((i.href = r),
        (i.download = e),
        (i.style.display = `none`),
        document.body.append(i),
        i.click(),
        setTimeout(() => {
          (URL.revokeObjectURL(r), i.remove());
        }, 1e3));
    }
    create(t) {
      return new e(t);
    }
    async toArrayBuffer(e) {
      let t = this._buildManifest(),
        n = { 'manifest.json': [nn(JSON.stringify(t)), {}] };
      for (let e of this.animations) {
        let t = await e.toJSON();
        n[`animations/${e.id}.json`] = [nn(JSON.stringify(t)), e.zipOptions];
        let r = e.imageAssets,
          i = e.audioAssets;
        for (let e of r) {
          let t = await e.toDataURL();
          n[`images/${e.fileName}`] = [Sr(t), e.zipOptions];
        }
        for (let e of i) {
          let t = await e.toDataURL();
          n[`audio/${e.fileName}`] = [Sr(t), e.zipOptions];
        }
      }
      return await new Promise((t, r) => {
        dn(n, e?.zipOptions || {}, (e, n) => {
          if (e) {
            r(e);
            return;
          }
          t(n.buffer);
        });
      });
    }
    async fromArrayBuffer(t) {
      if ((await Mr(new Uint8Array(t))) === `2`) return na(t);
      let n = new e();
      try {
        let e = await new Promise((e, n) => {
            pn(new Uint8Array(t), (t, r) => {
              (t && n(t), e(r));
            });
          }),
          r = [],
          i = [];
        if (e[`manifest.json`] instanceof Uint8Array)
          try {
            let t = JSON.parse(rn(e[`manifest.json`], !1)),
              { author: a, custom: o, description: s, keywords: c } = t;
            (a && (this._requireValidAuthor(a), n.setAuthor(a)),
              o && (this._requireValidCustomData(o), n.setCustomData(o)),
              s && (this._requireValidDescription(s), n.setDescription(s)),
              c && (this._requireValidKeywords(c), n.setKeywords(c)));
            for (let a of Object.keys(e)) {
              let o = rn(e[a], !0);
              if (a.startsWith(`animations/`) && a.endsWith(`.json`)) {
                let e = /animations\/(.+)\.json/u.exec(a)?.[1];
                if (!e) throw new W(`Invalid animation id`);
                let r = JSON.parse(o),
                  i = t.animations.find((t) => t.id === e);
                if (i === void 0) throw new W(`Animation not found inside manifest`);
                n.addAnimation({ data: r, ...i });
              } else if (a.startsWith(`images/`)) {
                let e = /images\/(.+)\./u.exec(a)?.[1];
                if (!e) throw new W(`Invalid image id`);
                let t = btoa(o);
                ((t = `data:image/${await wr(t)};base64,${t}`),
                  r.push(
                    new Zi({ id: e, lottieAssetId: e, data: t, fileName: a.split(`/`)[1] || `` })
                  ));
              } else if (a.startsWith(`audio/`)) {
                let e = /audio\/(.+)\./u.exec(a)?.[1];
                if (!e) throw new W(`Invalid image id`);
                let t = btoa(o);
                ((t = `data:audio/${await wr(t)};base64,${t}`),
                  i.push(new Xi({ id: e, data: t, fileName: a.split(`/`)[1] || `` })));
              }
            }
            for (let e of r)
              for (let t of n.animations)
                if (t.data) {
                  let n = t.data.assets;
                  if (n)
                    for (let r of n)
                      `w` in r &&
                        `h` in r &&
                        r.p === e.fileName &&
                        (e.parentAnimations.push(t), t.imageAssets.push(e));
                }
            for (let e of i)
              for (let t of n.animations)
                if (t.data) {
                  let n = t.data.assets;
                  if (n)
                    for (let r of n)
                      Or(r) &&
                        r.p.includes(e.id) &&
                        (e.parentAnimations.push(t), t.audioAssets.push(e));
                }
          } catch (e) {
            if (e instanceof Error) throw new W(`Invalid manifest inside buffer! ${e.message}`);
          }
        else throw new W(`Invalid buffer`);
      } catch (e) {
        if (e instanceof Error) throw new W(e.message);
      }
      return n;
    }
  },
  G = t(r()),
  ia = class {
    validate(e) {
      return e.toLowerCase().endsWith(`.lottie`);
    }
    async parseFile(e) {
      try {
        let t = await (0, G.readFile)(e),
          n = t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength),
          r = await new Hi().fromArrayBuffer(n),
          i = r.animations;
        if (!i || i.length === 0)
          return { success: !1, error: `No animations found in .lottie archive` };
        let a = i[0],
          o = await a.toJSON(),
          s = o.fr,
          c = typeof o.ip == `number` ? o.ip : 0,
          l = o.op - c,
          u = parseFloat((l / s).toFixed(4)),
          d = Array.isArray(o.layers) ? o.layers : [],
          f = (Array.isArray(o.markers) ? o.markers : []).map((e) => ({
            name: ze(e.cm),
            frame: e.tm,
            durationFrames: e.dr,
          })),
          p = i.map((e) => ({ id: ze(e.id), name: e.name ? ze(e.name) : void 0 })),
          m = r.getImages().length > 0;
        return {
          success: !0,
          metadata: {
            format: `dotlottie`,
            fps: s,
            totalFrames: l,
            durationSeconds: u,
            width: o.w,
            height: o.h,
            layerCount: d.length,
            markers: f,
            dotLottie: { animations: p, primaryAnimation: ze(a.id), hasImages: m },
          },
        };
      } catch (e) {
        return { success: !1, error: e instanceof Error ? e.message : String(e) };
      }
    }
    async extractAnimationData(e, t) {
      try {
        let n = await (0, G.readFile)(e),
          r = n.buffer.slice(n.byteOffset, n.byteOffset + n.byteLength),
          i = await new Hi().fromArrayBuffer(r),
          a;
        return ((a = t ? await i.getAnimation(t) : i.animations[0]), a ? await a.toJSON() : null);
      } catch {
        return null;
      }
    }
  },
  aa = class {
    constructor() {
      this._parser = new Be();
    }
    supports(e, t) {
      if (e !== `.json`) return !1;
      try {
        let e = t.toString(`utf8`).trim();
        if (!e.startsWith(`{`)) return !1;
        let n = e.includes(`"v"`) || e.includes(`'v'`),
          r = e.includes(`"layers"`) || e.includes(`'layers'`);
        return n && r;
      } catch {
        return !1;
      }
    }
    async parse(e, t) {
      try {
        let e = JSON.parse(t.toString(`utf8`)),
          n = this._parser.parse(e);
        if (!n.success || !n.metadata) throw Error(n.error ?? `Lottie parsing validation failed`);
        return n.metadata;
      } catch (e) {
        throw Error(`Failed to parse Lottie file: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    getFormat() {
      return `lottie`;
    }
  },
  oa = class {
    constructor() {
      this._parser = new ia();
    }
    supports(e, t) {
      return e === `.lottie`;
    }
    async parse(e, t) {
      try {
        let t = await this._parser.parseFile(e);
        if (!t.success || !t.metadata)
          throw Error(t.error ?? `dotLottie parsing validation failed`);
        return t.metadata;
      } catch (e) {
        throw Error(
          `Failed to parse dotLottie file: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    getFormat() {
      return `dotlottie`;
    }
  },
  sa = class {
    supports(e, t) {
      return e !== `.riv` || t.length < 4 ? !1 : t.toString(`ascii`, 0, 4) === `RIVE`;
    }
    async parse(e, t) {
      try {
        let e = this._extractStrings(t),
          n = Array.from(
            new Set(
              e.filter(
                (e) =>
                  e.length >= 3 &&
                  e.length < 40 &&
                  /^[a-zA-Z0-9_\-\s]+$/.test(e) &&
                  ![`RIVE`, `rive`, `properties`, `StateMachine`, `Transition`].includes(e)
              )
            )
          ),
          r = n
            .filter(
              (e) =>
                e.toLowerCase().includes(`board`) ||
                e.toLowerCase().includes(`main`) ||
                e.toLowerCase().includes(`scene`) ||
                [`logo`, `icon`, `button`, `hero`, `avatar`].includes(e.toLowerCase())
            )
            .map(ze),
          i = n
            .filter(
              (e) =>
                e.toLowerCase().includes(`state`) ||
                e.toLowerCase().includes(`machine`) ||
                e.toLowerCase().includes(`hover`) ||
                e.toLowerCase().includes(`click`) ||
                e.toLowerCase().includes(`controller`)
            )
            .map(ze),
          a = n
            .filter(
              (e) =>
                !r.includes(e) &&
                !i.includes(e) &&
                e.length < 15 &&
                [
                  `idle`,
                  `play`,
                  `show`,
                  `hide`,
                  `open`,
                  `close`,
                  `run`,
                  `walk`,
                  `spin`,
                  `start`,
                ].some((t) => e.toLowerCase().includes(t))
            )
            .map(ze);
        return {
          format: `rive`,
          width: 500,
          height: 500,
          durationSeconds: 0,
          sizeBytes: t.length,
          artboards: r.length > 0 ? r : [`main`],
          stateMachines: i.length > 0 ? i : [`StateMachine`],
          animations: a.length > 0 ? a.slice(0, 6) : [`idle`],
        };
      } catch (e) {
        throw Error(`Rive parsing failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    getFormat() {
      return `rive`;
    }
    _extractStrings(e) {
      let t = [],
        n = ``;
      for (let r = 0; r < e.length; r++) {
        let i = e[r];
        i >= 32 && i <= 126
          ? (n += String.fromCharCode(i))
          : (n.length >= 3 && t.push(n), (n = ``));
      }
      return (n.length >= 3 && t.push(n), t);
    }
  },
  ca = class {
    supports(e, t) {
      if (e !== `.gif` || t.length < 6) return !1;
      let n = t.toString(`ascii`, 0, 6);
      return n === `GIF89a` || n === `GIF87a`;
    }
    async parse(e, t) {
      try {
        let e = t.readUInt16LE(6),
          n = t.readUInt16LE(8),
          r = 0,
          i = 10,
          a = (t[10] & 128) != 0,
          o = 3 * 2 ** ((t[10] & 7) + 1);
        for (i = 13 + (a ? o : 0); i < t.length; ) {
          let e = t[i];
          if (e === 33)
            for (t[i + 1] === 249 && r++, i += 2; i < t.length; ) {
              let e = t[i];
              if (e === 0) {
                i++;
                break;
              }
              i += e + 1;
            }
          else if (e === 44) {
            let e = (t[i + 9] & 128) != 0,
              n = 3 * 2 ** ((t[i + 9] & 7) + 1);
            for (i += 10 + (e ? n : 0), i++; i < t.length; ) {
              let e = t[i];
              if (e === 0) {
                i++;
                break;
              }
              i += e + 1;
            }
          } else if (e === 59) break;
          else i++;
        }
        return (
          r === 0 && (r = 1),
          {
            format: `gif`,
            width: e,
            height: n,
            durationSeconds: parseFloat((r * 0.1).toFixed(4)),
            sizeBytes: t.length,
            frameCount: r,
            loopCount: 0,
          }
        );
      } catch (e) {
        throw Error(`GIF parsing failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    getFormat() {
      return `gif`;
    }
  },
  la = class {
    supports(e, t) {
      return (e !== `.png` && e !== `.apng`) ||
        t.length < 8 ||
        !(
          t[0] === 137 &&
          t[1] === 80 &&
          t[2] === 78 &&
          t[3] === 71 &&
          t[4] === 13 &&
          t[5] === 10 &&
          t[6] === 26 &&
          t[7] === 10
        )
        ? !1
        : t.indexOf(`acTL`) !== -1;
    }
    async parse(e, t) {
      try {
        let e = t.readUInt32BE(16),
          n = t.readUInt32BE(20),
          r = t.indexOf(`acTL`);
        if (r === -1)
          throw Error(`acTL chunk not found. This is a static PNG, not an animated APNG.`);
        let i = t.readUInt32BE(r + 4),
          a = t.readUInt32BE(r + 8);
        return {
          format: `apng`,
          width: e,
          height: n,
          durationSeconds: parseFloat((i * 0.1).toFixed(4)),
          sizeBytes: t.length,
          frameCount: i,
          loopCount: a,
        };
      } catch (e) {
        throw Error(`APNG parsing failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    getFormat() {
      return `apng`;
    }
  },
  ua = class {
    supports(e, t) {
      return e === `.svg` ? t.toString(`utf8`).trim().includes(`<svg`) : !1;
    }
    async parse(e, t) {
      try {
        let e = t.toString(`utf8`),
          n = e.match(/<svg([^>]+)>/),
          r = 400,
          i = 400;
        if (n) {
          let e = n[1],
            t = e.match(/width=["']([^"']+)["']/),
            a = e.match(/height=["']([^"']+)["']/),
            o = e.match(/viewBox=["']([^"']+)["']/);
          if (t && a) ((r = parseFloat(t[1]) || 400), (i = parseFloat(a[1]) || 400));
          else if (o) {
            let e = o[1].trim().split(/\s+/);
            e.length === 4 && ((r = parseFloat(e[2]) || 400), (i = parseFloat(e[3]) || 400));
          }
        }
        let a = /<(animate|animateTransform|animateMotion|set|mpath)\b/.test(e),
          o = /@keyframes\b/.test(e) || /animation\s*:\s*/.test(e) || /transition\s*:\s*/.test(e),
          s = `css`;
        a && o ? (s = `mixed`) : a && (s = `smil`);
        let c = (e.match(/<[a-zA-Z0-9_\-]+/g) || []).length;
        return {
          format: `animated-svg`,
          width: r,
          height: i,
          durationSeconds: 0,
          sizeBytes: t.length,
          animationType: s,
          elementCount: c,
        };
      } catch (e) {
        throw Error(`SVG parsing failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    getFormat() {
      return `animated-svg`;
    }
  };
(class e {
  static {
    this._instance = null;
  }
  constructor() {
    ((this._parsers = new Map()), this.initializeDefaults());
  }
  static getInstance() {
    return ((e._instance ||= new e()), e._instance);
  }
  registerParser(e) {
    this._parsers.set(e.getFormat(), e);
  }
  getParserFor(e, t) {
    for (let n of this._parsers.values()) if (n.supports(e, t)) return n;
    return null;
  }
  initializeDefaults() {
    (this.registerParser(new aa()),
      this.registerParser(new oa()),
      this.registerParser(new sa()),
      this.registerParser(new ca()),
      this.registerParser(new la()),
      this.registerParser(new ua()));
  }
  getRegisteredFormats() {
    return Array.from(this._parsers.keys());
  }
  clear() {
    this._parsers.clear();
  }
});
var da = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.splitWhen = e.flatten = void 0));
    function t(e) {
      return e.reduce((e, t) => [].concat(e, t), []);
    }
    e.flatten = t;
    function n(e, t) {
      let n = [[]],
        r = 0;
      for (let i of e) t(i) ? (r++, (n[r] = [])) : n[r].push(i);
      return n;
    }
    e.splitWhen = n;
  }),
  fa = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.isEnoentCodeError = void 0));
    function t(e) {
      return e.code === `ENOENT`;
    }
    e.isEnoentCodeError = t;
  }),
  pa = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.createDirentFromStats = void 0));
    var t = class {
      constructor(e, t) {
        ((this.name = e),
          (this.isBlockDevice = t.isBlockDevice.bind(t)),
          (this.isCharacterDevice = t.isCharacterDevice.bind(t)),
          (this.isDirectory = t.isDirectory.bind(t)),
          (this.isFIFO = t.isFIFO.bind(t)),
          (this.isFile = t.isFile.bind(t)),
          (this.isSocket = t.isSocket.bind(t)),
          (this.isSymbolicLink = t.isSymbolicLink.bind(t)));
      }
    };
    function n(e, n) {
      return new t(e, n);
    }
    e.createDirentFromStats = n;
  }),
  ma = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.convertPosixPathToPattern =
        e.convertWindowsPathToPattern =
        e.convertPathToPattern =
        e.escapePosixPath =
        e.escapeWindowsPath =
        e.escape =
        e.removeLeadingDotSegment =
        e.makeAbsolute =
        e.unixify =
          void 0));
    var t = r(),
      n = r(),
      i = t.platform() === `win32`,
      a = 2,
      o = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g,
      s = /(\\?)([()[\]{}]|^!|[!+@](?=\())/g,
      c = /^\\\\([.?])/,
      l = /\\(?![!()+@[\]{}])/g;
    function u(e) {
      return e.replace(/\\/g, `/`);
    }
    e.unixify = u;
    function d(e, t) {
      return n.resolve(e, t);
    }
    e.makeAbsolute = d;
    function f(e) {
      if (e.charAt(0) === `.`) {
        let t = e.charAt(1);
        if (t === `/` || t === `\\`) return e.slice(a);
      }
      return e;
    }
    ((e.removeLeadingDotSegment = f), (e.escape = i ? p : m));
    function p(e) {
      return e.replace(s, `\\$2`);
    }
    e.escapeWindowsPath = p;
    function m(e) {
      return e.replace(o, `\\$2`);
    }
    ((e.escapePosixPath = m), (e.convertPathToPattern = i ? h : g));
    function h(e) {
      return p(e).replace(c, `//$1`).replace(l, `/`);
    }
    e.convertWindowsPathToPattern = h;
    function g(e) {
      return m(e);
    }
    e.convertPosixPathToPattern = g;
  }),
  ha = n((e, t) => {
    t.exports = function (e) {
      if (typeof e != `string` || e === ``) return !1;
      for (var t; (t = /(\\).|([@?!+*]\(.*\))/g.exec(e)); ) {
        if (t[2]) return !0;
        e = e.slice(t.index + t[0].length);
      }
      return !1;
    };
  }),
  ga = n((e, t) => {
    var n = ha(),
      r = { '{': `}`, '(': `)`, '[': `]` },
      i = function (e) {
        if (e[0] === `!`) return !0;
        for (var t = 0, n = -2, i = -2, a = -2, o = -2, s = -2; t < e.length; ) {
          if (
            e[t] === `*` ||
            (e[t + 1] === `?` && /[\].+)]/.test(e[t])) ||
            (i !== -1 &&
              e[t] === `[` &&
              e[t + 1] !== `]` &&
              (i < t && (i = e.indexOf(`]`, t)),
              i > t && (s === -1 || s > i || ((s = e.indexOf(`\\`, t)), s === -1 || s > i)))) ||
            (a !== -1 &&
              e[t] === `{` &&
              e[t + 1] !== `}` &&
              ((a = e.indexOf(`}`, t)), a > t && ((s = e.indexOf(`\\`, t)), s === -1 || s > a))) ||
            (o !== -1 &&
              e[t] === `(` &&
              e[t + 1] === `?` &&
              /[:!=]/.test(e[t + 2]) &&
              e[t + 3] !== `)` &&
              ((o = e.indexOf(`)`, t)), o > t && ((s = e.indexOf(`\\`, t)), s === -1 || s > o))) ||
            (n !== -1 &&
              e[t] === `(` &&
              e[t + 1] !== `|` &&
              (n < t && (n = e.indexOf(`|`, t)),
              n !== -1 &&
                e[n + 1] !== `)` &&
                ((o = e.indexOf(`)`, n)), o > n && ((s = e.indexOf(`\\`, n)), s === -1 || s > o))))
          )
            return !0;
          if (e[t] === `\\`) {
            var c = e[t + 1];
            t += 2;
            var l = r[c];
            if (l) {
              var u = e.indexOf(l, t);
              u !== -1 && (t = u + 1);
            }
            if (e[t] === `!`) return !0;
          } else t++;
        }
        return !1;
      },
      a = function (e) {
        if (e[0] === `!`) return !0;
        for (var t = 0; t < e.length; ) {
          if (/[*?{}()[\]]/.test(e[t])) return !0;
          if (e[t] === `\\`) {
            var n = e[t + 1];
            t += 2;
            var i = r[n];
            if (i) {
              var a = e.indexOf(i, t);
              a !== -1 && (t = a + 1);
            }
            if (e[t] === `!`) return !0;
          } else t++;
        }
        return !1;
      };
    t.exports = function (e, t) {
      if (typeof e != `string` || e === ``) return !1;
      if (n(e)) return !0;
      var r = i;
      return (t && t.strict === !1 && (r = a), r(e));
    };
  }),
  _a = n((e, t) => {
    var n = ga(),
      i = r().posix.dirname,
      a = r().platform() === `win32`,
      o = `/`,
      s = /\\/g,
      c = /[\{\[].*[\}\]]$/,
      l = /(^|[^\\])([\{\[]|\([^\)]+$)/,
      u = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
    t.exports = function (e, t) {
      (Object.assign({ flipBackslashes: !0 }, t).flipBackslashes &&
        a &&
        e.indexOf(o) < 0 &&
        (e = e.replace(s, o)),
        c.test(e) && (e += o),
        (e += `a`));
      do e = i(e);
      while (n(e) || l.test(e));
      return e.replace(u, `$1`);
    };
  }),
  va = n((e) => {
    ((e.isInteger = (e) =>
      typeof e == `number`
        ? Number.isInteger(e)
        : typeof e == `string` && e.trim() !== ``
          ? Number.isInteger(Number(e))
          : !1),
      (e.find = (e, t) => e.nodes.find((e) => e.type === t)),
      (e.exceedsLimit = (t, n, r = 1, i) =>
        i === !1 || !e.isInteger(t) || !e.isInteger(n)
          ? !1
          : (Number(n) - Number(t)) / Number(r) >= i),
      (e.escapeNode = (e, t = 0, n) => {
        let r = e.nodes[t];
        r &&
          ((n && r.type === n) || r.type === `open` || r.type === `close`) &&
          r.escaped !== !0 &&
          ((r.value = `\\` + r.value), (r.escaped = !0));
      }),
      (e.encloseBrace = (e) =>
        e.type === `brace`
          ? (e.commas >> (0 + e.ranges)) >> 0
            ? !1
            : ((e.invalid = !0), !0)
          : !1),
      (e.isInvalidBrace = (e) =>
        e.type === `brace`
          ? e.invalid === !0 || e.dollar
            ? !0
            : !((e.commas >> (0 + e.ranges)) >> 0) || e.open !== !0 || e.close !== !0
              ? ((e.invalid = !0), !0)
              : !1
          : !1),
      (e.isOpenOrClose = (e) =>
        e.type === `open` || e.type === `close` ? !0 : e.open === !0 || e.close === !0),
      (e.reduce = (e) =>
        e.reduce(
          (e, t) => (
            t.type === `text` && e.push(t.value),
            t.type === `range` && (t.type = `text`),
            e
          ),
          []
        )),
      (e.flatten = (...e) => {
        let t = [],
          n = (e) => {
            for (let r = 0; r < e.length; r++) {
              let i = e[r];
              if (Array.isArray(i)) {
                n(i);
                continue;
              }
              i !== void 0 && t.push(i);
            }
            return t;
          };
        return (n(e), t);
      }));
  }),
  ya = n((e, t) => {
    var n = va();
    t.exports = (e, t = {}) => {
      let r = (e, i = {}) => {
        let a = t.escapeInvalid && n.isInvalidBrace(i),
          o = e.invalid === !0 && t.escapeInvalid === !0,
          s = ``;
        if (e.value) return (a || o) && n.isOpenOrClose(e) ? `\\` + e.value : e.value;
        if (e.value) return e.value;
        if (e.nodes) for (let t of e.nodes) s += r(t);
        return s;
      };
      return r(e);
    };
  }),
  ba = n((e, t) => {
    t.exports = function (e) {
      return typeof e == `number`
        ? e - e === 0
        : typeof e == `string` && e.trim() !== ``
          ? Number.isFinite
            ? Number.isFinite(+e)
            : isFinite(+e)
          : !1;
    };
  }),
  xa = n((e, t) => {
    var n = ba(),
      r = (e, t, a) => {
        if (n(e) === !1)
          throw TypeError(`toRegexRange: expected the first argument to be a number`);
        if (t === void 0 || e === t) return String(e);
        if (n(t) === !1)
          throw TypeError(`toRegexRange: expected the second argument to be a number.`);
        let o = { relaxZeros: !0, ...a };
        typeof o.strictZeros == `boolean` && (o.relaxZeros = o.strictZeros === !1);
        let c = String(o.relaxZeros),
          l = String(o.shorthand),
          u = String(o.capture),
          d = String(o.wrap),
          f = e + `:` + t + `=` + c + l + u + d;
        if (r.cache.hasOwnProperty(f)) return r.cache[f].result;
        let p = Math.min(e, t),
          m = Math.max(e, t);
        if (Math.abs(p - m) === 1) {
          let n = e + `|` + t;
          return o.capture ? `(${n})` : o.wrap === !1 ? n : `(?:${n})`;
        }
        let h = g(e) || g(t),
          _ = { min: e, max: t, a: p, b: m },
          v = [],
          y = [];
        return (
          h && ((_.isPadded = h), (_.maxLen = String(_.max).length)),
          p < 0 && ((y = s(m < 0 ? Math.abs(m) : 1, Math.abs(p), _, o)), (p = _.a = 0)),
          m >= 0 && (v = s(p, m, _, o)),
          (_.negatives = y),
          (_.positives = v),
          (_.result = i(y, v, o)),
          o.capture === !0
            ? (_.result = `(${_.result})`)
            : o.wrap !== !1 && v.length + y.length > 1 && (_.result = `(?:${_.result})`),
          (r.cache[f] = _),
          _.result
        );
      };
    function i(e, t, n) {
      let r = c(e, t, `-`, !1, n) || [],
        i = c(t, e, ``, !1, n) || [],
        a = c(e, t, `-?`, !0, n) || [];
      return r.concat(a).concat(i).join(`|`);
    }
    function a(e, t) {
      let n = 1,
        r = 1,
        i = f(e, n),
        a = new Set([t]);
      for (; e <= i && i <= t; ) (a.add(i), (n += 1), (i = f(e, n)));
      for (i = p(t + 1, r) - 1; e < i && i <= t; ) (a.add(i), (r += 1), (i = p(t + 1, r) - 1));
      return ((a = [...a]), a.sort(u), a);
    }
    function o(e, t, n) {
      if (e === t) return { pattern: e, count: [], digits: 0 };
      let r = l(e, t),
        i = r.length,
        a = ``,
        o = 0;
      for (let e = 0; e < i; e++) {
        let [t, i] = r[e];
        t === i ? (a += t) : t !== `0` || i !== `9` ? (a += h(t, i, n)) : o++;
      }
      return (
        o && (a += n.shorthand === !0 ? `\\d` : `[0-9]`),
        { pattern: a, count: [o], digits: i }
      );
    }
    function s(e, t, n, r) {
      let i = a(e, t),
        s = [],
        c = e,
        l;
      for (let e = 0; e < i.length; e++) {
        let t = i[e],
          a = o(String(c), String(t), r),
          u = ``;
        if (!n.isPadded && l && l.pattern === a.pattern) {
          (l.count.length > 1 && l.count.pop(),
            l.count.push(a.count[0]),
            (l.string = l.pattern + m(l.count)),
            (c = t + 1));
          continue;
        }
        (n.isPadded && (u = _(t, n, r)),
          (a.string = u + a.pattern + m(a.count)),
          s.push(a),
          (c = t + 1),
          (l = a));
      }
      return s;
    }
    function c(e, t, n, r, i) {
      let a = [];
      for (let i of e) {
        let { string: e } = i;
        (!r && !d(t, `string`, e) && a.push(n + e), r && d(t, `string`, e) && a.push(n + e));
      }
      return a;
    }
    function l(e, t) {
      let n = [];
      for (let r = 0; r < e.length; r++) n.push([e[r], t[r]]);
      return n;
    }
    function u(e, t) {
      return e > t ? 1 : t > e ? -1 : 0;
    }
    function d(e, t, n) {
      return e.some((e) => e[t] === n);
    }
    function f(e, t) {
      return Number(String(e).slice(0, -t) + `9`.repeat(t));
    }
    function p(e, t) {
      return e - (e % 10 ** t);
    }
    function m(e) {
      let [t = 0, n = ``] = e;
      return n || t > 1 ? `{${t + (n ? `,` + n : ``)}}` : ``;
    }
    function h(e, t, n) {
      return `[${e}${t - e === 1 ? `` : `-`}${t}]`;
    }
    function g(e) {
      return /^-?(0+)\d/.test(e);
    }
    function _(e, t, n) {
      if (!t.isPadded) return e;
      let r = Math.abs(t.maxLen - String(e).length),
        i = n.relaxZeros !== !1;
      switch (r) {
        case 0:
          return ``;
        case 1:
          return i ? `0?` : `0`;
        case 2:
          return i ? `0{0,2}` : `00`;
        default:
          return i ? `0{0,${r}}` : `0{${r}}`;
      }
    }
    ((r.cache = {}), (r.clearCache = () => (r.cache = {})), (t.exports = r));
  }),
  Sa = n((e, t) => {
    var n = r(),
      i = xa(),
      a = (e) => typeof e == `object` && !!e && !Array.isArray(e),
      o = (e) => (t) => (e === !0 ? Number(t) : String(t)),
      s = (e) => typeof e == `number` || (typeof e == `string` && e !== ``),
      c = (e) => Number.isInteger(+e),
      l = (e) => {
        let t = `${e}`,
          n = -1;
        if ((t[0] === `-` && (t = t.slice(1)), t === `0`)) return !1;
        for (; t[++n] === `0`; );
        return n > 0;
      },
      u = (e, t, n) => (typeof e == `string` || typeof t == `string` ? !0 : n.stringify === !0),
      d = (e, t, n) => {
        if (t > 0) {
          let n = e[0] === `-` ? `-` : ``;
          (n && (e = e.slice(1)), (e = n + e.padStart(n ? t - 1 : t, `0`)));
        }
        return n === !1 ? String(e) : e;
      },
      f = (e, t) => {
        let n = e[0] === `-` ? `-` : ``;
        for (n && ((e = e.slice(1)), t--); e.length < t; ) e = `0` + e;
        return n ? `-` + e : e;
      },
      p = (e, t, n) => {
        (e.negatives.sort((e, t) => (e < t ? -1 : +(e > t))),
          e.positives.sort((e, t) => (e < t ? -1 : +(e > t))));
        let r = t.capture ? `` : `?:`,
          i = ``,
          a = ``,
          o;
        return (
          e.positives.length && (i = e.positives.map((e) => f(String(e), n)).join(`|`)),
          e.negatives.length && (a = `-(${r}${e.negatives.map((e) => f(String(e), n)).join(`|`)})`),
          (o = i && a ? `${i}|${a}` : i || a),
          t.wrap ? `(${r}${o})` : o
        );
      },
      m = (e, t, n, r) => {
        if (n) return i(e, t, { wrap: !1, ...r });
        let a = String.fromCharCode(e);
        return e === t ? a : `[${a}-${String.fromCharCode(t)}]`;
      },
      h = (e, t, n) => {
        if (Array.isArray(e)) {
          let t = n.wrap === !0,
            r = n.capture ? `` : `?:`;
          return t ? `(${r}${e.join(`|`)})` : e.join(`|`);
        }
        return i(e, t, n);
      },
      g = (...e) => RangeError(`Invalid range arguments: ` + n.inspect(...e)),
      _ = (e, t, n) => {
        if (n.strictRanges === !0) throw g([e, t]);
        return [];
      },
      v = (e, t) => {
        if (t.strictRanges === !0) throw TypeError(`Expected step "${e}" to be a number`);
        return [];
      },
      y = (e, t, n = 1, r = {}) => {
        let i = Number(e),
          a = Number(t);
        if (!Number.isInteger(i) || !Number.isInteger(a)) {
          if (r.strictRanges === !0) throw g([e, t]);
          return [];
        }
        (i === 0 && (i = 0), a === 0 && (a = 0));
        let s = i > a,
          c = String(e),
          _ = String(t),
          v = String(n);
        n = Math.max(Math.abs(n), 1);
        let y = l(c) || l(_) || l(v),
          b = y ? Math.max(c.length, _.length, v.length) : 0,
          x = y === !1 && u(e, t, r) === !1,
          S = r.transform || o(x);
        if (r.toRegex && n === 1) return m(f(e, b), f(t, b), !0, r);
        let C = { negatives: [], positives: [] },
          w = (e) => C[e < 0 ? `negatives` : `positives`].push(Math.abs(e)),
          T = [],
          E = 0;
        for (; s ? i >= a : i <= a; )
          (r.toRegex === !0 && n > 1 ? w(i) : T.push(d(S(i, E), b, x)),
            (i = s ? i - n : i + n),
            E++);
        return r.toRegex === !0 ? (n > 1 ? p(C, r, b) : h(T, null, { wrap: !1, ...r })) : T;
      },
      b = (e, t, n = 1, r = {}) => {
        if ((!c(e) && e.length > 1) || (!c(t) && t.length > 1)) return _(e, t, r);
        let i = r.transform || ((e) => String.fromCharCode(e)),
          a = `${e}`.charCodeAt(0),
          o = `${t}`.charCodeAt(0),
          s = a > o,
          l = Math.min(a, o),
          u = Math.max(a, o);
        if (r.toRegex && n === 1) return m(l, u, !1, r);
        let d = [],
          f = 0;
        for (; s ? a >= o : a <= o; ) (d.push(i(a, f)), (a = s ? a - n : a + n), f++);
        return r.toRegex === !0 ? h(d, null, { wrap: !1, options: r }) : d;
      },
      x = (e, t, n, r = {}) => {
        if (t == null && s(e)) return [e];
        if (!s(e) || !s(t)) return _(e, t, r);
        if (typeof n == `function`) return x(e, t, 1, { transform: n });
        if (a(n)) return x(e, t, 0, n);
        let i = { ...r };
        return (
          i.capture === !0 && (i.wrap = !0),
          (n = n || i.step || 1),
          c(n)
            ? c(e) && c(t)
              ? y(e, t, n, i)
              : b(e, t, Math.max(Math.abs(n), 1), i)
            : n != null && !a(n)
              ? v(n, i)
              : x(e, t, 1, n)
        );
      };
    t.exports = x;
  }),
  Ca = n((e, t) => {
    var n = Sa(),
      r = va();
    t.exports = (e, t = {}) => {
      let i = (e, a = {}) => {
        let o = r.isInvalidBrace(a),
          s = e.invalid === !0 && t.escapeInvalid === !0,
          c = o === !0 || s === !0,
          l = t.escapeInvalid === !0 ? `\\` : ``,
          u = ``;
        if (e.isOpen === !0) return l + e.value;
        if (e.isClose === !0) return (console.log(`node.isClose`, l, e.value), l + e.value);
        if (e.type === `open`) return c ? l + e.value : `(`;
        if (e.type === `close`) return c ? l + e.value : `)`;
        if (e.type === `comma`) return e.prev.type === `comma` ? `` : c ? e.value : `|`;
        if (e.value) return e.value;
        if (e.nodes && e.ranges > 0) {
          let i = r.reduce(e.nodes),
            a = n(...i, { ...t, wrap: !1, toRegex: !0, strictZeros: !0 });
          if (a.length !== 0) return i.length > 1 && a.length > 1 ? `(${a})` : a;
        }
        if (e.nodes) for (let t of e.nodes) u += i(t, e);
        return u;
      };
      return i(e);
    };
  }),
  wa = n((e, t) => {
    var n = Sa(),
      r = ya(),
      i = va(),
      a = (e = ``, t = ``, n = !1) => {
        let r = [];
        if (((e = [].concat(e)), (t = [].concat(t)), !t.length)) return e;
        if (!e.length) return n ? i.flatten(t).map((e) => `{${e}}`) : t;
        for (let i of e)
          if (Array.isArray(i)) for (let e of i) r.push(a(e, t, n));
          else
            for (let e of t)
              (n === !0 && typeof e == `string` && (e = `{${e}}`),
                r.push(Array.isArray(e) ? a(i, e, n) : i + e));
        return i.flatten(r);
      };
    t.exports = (e, t = {}) => {
      let o = t.rangeLimit === void 0 ? 1e3 : t.rangeLimit,
        s = (e, c = {}) => {
          e.queue = [];
          let l = c,
            u = c.queue;
          for (; l.type !== `brace` && l.type !== `root` && l.parent; )
            ((l = l.parent), (u = l.queue));
          if (e.invalid || e.dollar) {
            u.push(a(u.pop(), r(e, t)));
            return;
          }
          if (e.type === `brace` && e.invalid !== !0 && e.nodes.length === 2) {
            u.push(a(u.pop(), [`{}`]));
            return;
          }
          if (e.nodes && e.ranges > 0) {
            let s = i.reduce(e.nodes);
            if (i.exceedsLimit(...s, t.step, o))
              throw RangeError(
                `expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.`
              );
            let c = n(...s, t);
            (c.length === 0 && (c = r(e, t)), u.push(a(u.pop(), c)), (e.nodes = []));
            return;
          }
          let d = i.encloseBrace(e),
            f = e.queue,
            p = e;
          for (; p.type !== `brace` && p.type !== `root` && p.parent; )
            ((p = p.parent), (f = p.queue));
          for (let t = 0; t < e.nodes.length; t++) {
            let n = e.nodes[t];
            if (n.type === `comma` && e.type === `brace`) {
              (t === 1 && f.push(``), f.push(``));
              continue;
            }
            if (n.type === `close`) {
              u.push(a(u.pop(), f, d));
              continue;
            }
            if (n.value && n.type !== `open`) {
              f.push(a(f.pop(), n.value));
              continue;
            }
            n.nodes && s(n, e);
          }
          return f;
        };
      return i.flatten(s(e));
    };
  }),
  Ta = n((e, t) => {
    t.exports = {
      MAX_LENGTH: 1e4,
      CHAR_0: `0`,
      CHAR_9: `9`,
      CHAR_UPPERCASE_A: `A`,
      CHAR_LOWERCASE_A: `a`,
      CHAR_UPPERCASE_Z: `Z`,
      CHAR_LOWERCASE_Z: `z`,
      CHAR_LEFT_PARENTHESES: `(`,
      CHAR_RIGHT_PARENTHESES: `)`,
      CHAR_ASTERISK: `*`,
      CHAR_AMPERSAND: `&`,
      CHAR_AT: `@`,
      CHAR_BACKSLASH: `\\`,
      CHAR_BACKTICK: '`',
      CHAR_CARRIAGE_RETURN: `\r`,
      CHAR_CIRCUMFLEX_ACCENT: `^`,
      CHAR_COLON: `:`,
      CHAR_COMMA: `,`,
      CHAR_DOLLAR: `$`,
      CHAR_DOT: `.`,
      CHAR_DOUBLE_QUOTE: `"`,
      CHAR_EQUAL: `=`,
      CHAR_EXCLAMATION_MARK: `!`,
      CHAR_FORM_FEED: `\f`,
      CHAR_FORWARD_SLASH: `/`,
      CHAR_HASH: `#`,
      CHAR_HYPHEN_MINUS: `-`,
      CHAR_LEFT_ANGLE_BRACKET: `<`,
      CHAR_LEFT_CURLY_BRACE: `{`,
      CHAR_LEFT_SQUARE_BRACKET: `[`,
      CHAR_LINE_FEED: `
`,
      CHAR_NO_BREAK_SPACE: `\xA0`,
      CHAR_PERCENT: `%`,
      CHAR_PLUS: `+`,
      CHAR_QUESTION_MARK: `?`,
      CHAR_RIGHT_ANGLE_BRACKET: `>`,
      CHAR_RIGHT_CURLY_BRACE: `}`,
      CHAR_RIGHT_SQUARE_BRACKET: `]`,
      CHAR_SEMICOLON: `;`,
      CHAR_SINGLE_QUOTE: `'`,
      CHAR_SPACE: ` `,
      CHAR_TAB: `	`,
      CHAR_UNDERSCORE: `_`,
      CHAR_VERTICAL_LINE: `|`,
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: `﻿`,
    };
  }),
  Ea = n((e, t) => {
    var n = ya(),
      {
        MAX_LENGTH: r,
        CHAR_BACKSLASH: i,
        CHAR_BACKTICK: a,
        CHAR_COMMA: o,
        CHAR_DOT: s,
        CHAR_LEFT_PARENTHESES: c,
        CHAR_RIGHT_PARENTHESES: l,
        CHAR_LEFT_CURLY_BRACE: u,
        CHAR_RIGHT_CURLY_BRACE: d,
        CHAR_LEFT_SQUARE_BRACKET: f,
        CHAR_RIGHT_SQUARE_BRACKET: p,
        CHAR_DOUBLE_QUOTE: m,
        CHAR_SINGLE_QUOTE: h,
        CHAR_NO_BREAK_SPACE: g,
        CHAR_ZERO_WIDTH_NOBREAK_SPACE: _,
      } = Ta();
    t.exports = (e, t = {}) => {
      if (typeof e != `string`) throw TypeError(`Expected a string`);
      let v = t || {},
        y = typeof v.maxLength == `number` ? Math.min(r, v.maxLength) : r;
      if (e.length > y)
        throw SyntaxError(`Input length (${e.length}), exceeds max characters (${y})`);
      let b = { type: `root`, input: e, nodes: [] },
        x = [b],
        S = b,
        C = b,
        w = 0,
        T = e.length,
        E = 0,
        D = 0,
        O,
        ee = () => e[E++],
        k = (e) => {
          if (
            (e.type === `text` && C.type === `dot` && (C.type = `text`),
            C && C.type === `text` && e.type === `text`)
          ) {
            C.value += e.value;
            return;
          }
          return (S.nodes.push(e), (e.parent = S), (e.prev = C), (C = e), e);
        };
      for (k({ type: `bos` }); E < T; )
        if (((S = x[x.length - 1]), (O = ee()), !(O === _ || O === g))) {
          if (O === i) {
            k({ type: `text`, value: (t.keepEscaping ? O : ``) + ee() });
            continue;
          }
          if (O === p) {
            k({ type: `text`, value: `\\` + O });
            continue;
          }
          if (O === f) {
            w++;
            let e;
            for (; E < T && (e = ee()); ) {
              if (((O += e), e === f)) {
                w++;
                continue;
              }
              if (e === i) {
                O += ee();
                continue;
              }
              if (e === p && (w--, w === 0)) break;
            }
            k({ type: `text`, value: O });
            continue;
          }
          if (O === c) {
            ((S = k({ type: `paren`, nodes: [] })), x.push(S), k({ type: `text`, value: O }));
            continue;
          }
          if (O === l) {
            if (S.type !== `paren`) {
              k({ type: `text`, value: O });
              continue;
            }
            ((S = x.pop()), k({ type: `text`, value: O }), (S = x[x.length - 1]));
            continue;
          }
          if (O === m || O === h || O === a) {
            let e = O,
              n;
            for (t.keepQuotes !== !0 && (O = ``); E < T && (n = ee()); ) {
              if (n === i) {
                O += n + ee();
                continue;
              }
              if (n === e) {
                t.keepQuotes === !0 && (O += n);
                break;
              }
              O += n;
            }
            k({ type: `text`, value: O });
            continue;
          }
          if (O === u) {
            (D++,
              (S = k({
                type: `brace`,
                open: !0,
                close: !1,
                dollar: (C.value && C.value.slice(-1) === `$`) || S.dollar === !0,
                depth: D,
                commas: 0,
                ranges: 0,
                nodes: [],
              })),
              x.push(S),
              k({ type: `open`, value: O }));
            continue;
          }
          if (O === d) {
            if (S.type !== `brace`) {
              k({ type: `text`, value: O });
              continue;
            }
            ((S = x.pop()),
              (S.close = !0),
              k({ type: `close`, value: O }),
              D--,
              (S = x[x.length - 1]));
            continue;
          }
          if (O === o && D > 0) {
            if (S.ranges > 0) {
              S.ranges = 0;
              let e = S.nodes.shift();
              S.nodes = [e, { type: `text`, value: n(S) }];
            }
            (k({ type: `comma`, value: O }), S.commas++);
            continue;
          }
          if (O === s && D > 0 && S.commas === 0) {
            let e = S.nodes;
            if (D === 0 || e.length === 0) {
              k({ type: `text`, value: O });
              continue;
            }
            if (C.type === `dot`) {
              if (
                ((S.range = []),
                (C.value += O),
                (C.type = `range`),
                S.nodes.length !== 3 && S.nodes.length !== 5)
              ) {
                ((S.invalid = !0), (S.ranges = 0), (C.type = `text`));
                continue;
              }
              (S.ranges++, (S.args = []));
              continue;
            }
            if (C.type === `range`) {
              e.pop();
              let t = e[e.length - 1];
              ((t.value += C.value + O), (C = t), S.ranges--);
              continue;
            }
            k({ type: `dot`, value: O });
            continue;
          }
          k({ type: `text`, value: O });
        }
      do
        if (((S = x.pop()), S.type !== `root`)) {
          S.nodes.forEach((e) => {
            e.nodes ||
              (e.type === `open` && (e.isOpen = !0),
              e.type === `close` && (e.isClose = !0),
              e.nodes || (e.type = `text`),
              (e.invalid = !0));
          });
          let e = x[x.length - 1],
            t = e.nodes.indexOf(S);
          e.nodes.splice(t, 1, ...S.nodes);
        }
      while (x.length > 0);
      return (k({ type: `eos` }), b);
    };
  }),
  Da = n((e, t) => {
    var n = ya(),
      r = Ca(),
      i = wa(),
      a = Ea(),
      o = (e, t = {}) => {
        let n = [];
        if (Array.isArray(e))
          for (let r of e) {
            let e = o.create(r, t);
            Array.isArray(e) ? n.push(...e) : n.push(e);
          }
        else n = [].concat(o.create(e, t));
        return (t && t.expand === !0 && t.nodupes === !0 && (n = [...new Set(n)]), n);
      };
    ((o.parse = (e, t = {}) => a(e, t)),
      (o.stringify = (e, t = {}) => n(typeof e == `string` ? o.parse(e, t) : e, t)),
      (o.compile = (e, t = {}) => (typeof e == `string` && (e = o.parse(e, t)), r(e, t))),
      (o.expand = (e, t = {}) => {
        typeof e == `string` && (e = o.parse(e, t));
        let n = i(e, t);
        return (
          t.noempty === !0 && (n = n.filter(Boolean)),
          t.nodupes === !0 && (n = [...new Set(n)]),
          n
        );
      }),
      (o.create = (e, t = {}) =>
        e === `` || e.length < 3 ? [e] : t.expand === !0 ? o.expand(e, t) : o.compile(e, t)),
      (t.exports = o));
  }),
  Oa = n((e, t) => {
    var n = r(),
      i = `\\\\/`,
      a = `[^${i}]`,
      o = 0,
      s = `\\.`,
      c = `\\+`,
      l = `\\?`,
      u = `\\/`,
      d = `(?=.)`,
      f = `[^/]`,
      p = `(?:${u}|$)`,
      m = `(?:^|${u})`,
      h = `${s}{1,2}${p}`,
      g = {
        DOT_LITERAL: s,
        PLUS_LITERAL: c,
        QMARK_LITERAL: l,
        SLASH_LITERAL: u,
        ONE_CHAR: d,
        QMARK: f,
        END_ANCHOR: p,
        DOTS_SLASH: h,
        NO_DOT: `(?!${s})`,
        NO_DOTS: `(?!${m}${h})`,
        NO_DOT_SLASH: `(?!${s}{0,1}${p})`,
        NO_DOTS_SLASH: `(?!${h})`,
        QMARK_NO_DOT: `[^.${u}]`,
        STAR: `${f}*?`,
        START_ANCHOR: m,
      },
      _ = {
        ...g,
        SLASH_LITERAL: `[${i}]`,
        QMARK: a,
        STAR: `${a}*?`,
        DOTS_SLASH: `${s}{1,2}(?:[${i}]|$)`,
        NO_DOT: `(?!${s})`,
        NO_DOTS: `(?!(?:^|[${i}])${s}{1,2}(?:[${i}]|$))`,
        NO_DOT_SLASH: `(?!${s}{0,1}(?:[${i}]|$))`,
        NO_DOTS_SLASH: `(?!${s}{1,2}(?:[${i}]|$))`,
        QMARK_NO_DOT: `[^.${i}]`,
        START_ANCHOR: `(?:^|[${i}])`,
        END_ANCHOR: `(?:[${i}]|$)`,
      };
    t.exports = {
      DEFAULT_MAX_EXTGLOB_RECURSION: o,
      MAX_LENGTH: 1024 * 64,
      POSIX_REGEX_SOURCE: {
        __proto__: null,
        alnum: `a-zA-Z0-9`,
        alpha: `a-zA-Z`,
        ascii: `\\x00-\\x7F`,
        blank: ` \\t`,
        cntrl: `\\x00-\\x1F\\x7F`,
        digit: `0-9`,
        graph: `\\x21-\\x7E`,
        lower: `a-z`,
        print: `\\x20-\\x7E `,
        punct: `\\-!"#$%&'()\\*+,./:;<=>?@[\\]^_\`{|}~`,
        space: ` \\t\\r\\n\\v\\f`,
        upper: `A-Z`,
        word: `A-Za-z0-9_`,
        xdigit: `A-Fa-f0-9`,
      },
      REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
      REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
      REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
      REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
      REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
      REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
      REPLACEMENTS: { __proto__: null, '***': `*`, '**/**': `**`, '**/**/**': `**` },
      CHAR_0: 48,
      CHAR_9: 57,
      CHAR_UPPERCASE_A: 65,
      CHAR_LOWERCASE_A: 97,
      CHAR_UPPERCASE_Z: 90,
      CHAR_LOWERCASE_Z: 122,
      CHAR_LEFT_PARENTHESES: 40,
      CHAR_RIGHT_PARENTHESES: 41,
      CHAR_ASTERISK: 42,
      CHAR_AMPERSAND: 38,
      CHAR_AT: 64,
      CHAR_BACKWARD_SLASH: 92,
      CHAR_CARRIAGE_RETURN: 13,
      CHAR_CIRCUMFLEX_ACCENT: 94,
      CHAR_COLON: 58,
      CHAR_COMMA: 44,
      CHAR_DOT: 46,
      CHAR_DOUBLE_QUOTE: 34,
      CHAR_EQUAL: 61,
      CHAR_EXCLAMATION_MARK: 33,
      CHAR_FORM_FEED: 12,
      CHAR_FORWARD_SLASH: 47,
      CHAR_GRAVE_ACCENT: 96,
      CHAR_HASH: 35,
      CHAR_HYPHEN_MINUS: 45,
      CHAR_LEFT_ANGLE_BRACKET: 60,
      CHAR_LEFT_CURLY_BRACE: 123,
      CHAR_LEFT_SQUARE_BRACKET: 91,
      CHAR_LINE_FEED: 10,
      CHAR_NO_BREAK_SPACE: 160,
      CHAR_PERCENT: 37,
      CHAR_PLUS: 43,
      CHAR_QUESTION_MARK: 63,
      CHAR_RIGHT_ANGLE_BRACKET: 62,
      CHAR_RIGHT_CURLY_BRACE: 125,
      CHAR_RIGHT_SQUARE_BRACKET: 93,
      CHAR_SEMICOLON: 59,
      CHAR_SINGLE_QUOTE: 39,
      CHAR_SPACE: 32,
      CHAR_TAB: 9,
      CHAR_UNDERSCORE: 95,
      CHAR_VERTICAL_LINE: 124,
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
      SEP: n.sep,
      extglobChars(e) {
        return {
          '!': { type: `negate`, open: `(?:(?!(?:`, close: `))${e.STAR})` },
          '?': { type: `qmark`, open: `(?:`, close: `)?` },
          '+': { type: `plus`, open: `(?:`, close: `)+` },
          '*': { type: `star`, open: `(?:`, close: `)*` },
          '@': { type: `at`, open: `(?:`, close: `)` },
        };
      },
      globChars(e) {
        return e === !0 ? _ : g;
      },
    };
  }),
  ka = n((e) => {
    var t = r(),
      n = process.platform === `win32`,
      {
        REGEX_BACKSLASH: i,
        REGEX_REMOVE_BACKSLASH: a,
        REGEX_SPECIAL_CHARS: o,
        REGEX_SPECIAL_CHARS_GLOBAL: s,
      } = Oa();
    ((e.isObject = (e) => typeof e == `object` && !!e && !Array.isArray(e)),
      (e.hasRegexChars = (e) => o.test(e)),
      (e.isRegexChar = (t) => t.length === 1 && e.hasRegexChars(t)),
      (e.escapeRegex = (e) => e.replace(s, `\\$1`)),
      (e.toPosixSlashes = (e) => e.replace(i, `/`)),
      (e.removeBackslashes = (e) => e.replace(a, (e) => (e === `\\` ? `` : e))),
      (e.supportsLookbehinds = () => {
        let e = process.version.slice(1).split(`.`).map(Number);
        return (e.length === 3 && e[0] >= 9) || (e[0] === 8 && e[1] >= 10);
      }),
      (e.isWindows = (e) =>
        e && typeof e.windows == `boolean` ? e.windows : n === !0 || t.sep === `\\`),
      (e.escapeLast = (t, n, r) => {
        let i = t.lastIndexOf(n, r);
        return i === -1
          ? t
          : t[i - 1] === `\\`
            ? e.escapeLast(t, n, i - 1)
            : `${t.slice(0, i)}\\${t.slice(i)}`;
      }),
      (e.removePrefix = (e, t = {}) => {
        let n = e;
        return (n.startsWith(`./`) && ((n = n.slice(2)), (t.prefix = `./`)), n);
      }),
      (e.wrapOutput = (e, t = {}, n = {}) => {
        let r = `${n.contains ? `` : `^`}(?:${e})${n.contains ? `` : `$`}`;
        return (t.negated === !0 && (r = `(?:^(?!${r}).*$)`), r);
      }));
  }),
  Aa = n((e, t) => {
    var n = ka(),
      {
        CHAR_ASTERISK: r,
        CHAR_AT: i,
        CHAR_BACKWARD_SLASH: a,
        CHAR_COMMA: o,
        CHAR_DOT: s,
        CHAR_EXCLAMATION_MARK: c,
        CHAR_FORWARD_SLASH: l,
        CHAR_LEFT_CURLY_BRACE: u,
        CHAR_LEFT_PARENTHESES: d,
        CHAR_LEFT_SQUARE_BRACKET: f,
        CHAR_PLUS: p,
        CHAR_QUESTION_MARK: m,
        CHAR_RIGHT_CURLY_BRACE: h,
        CHAR_RIGHT_PARENTHESES: g,
        CHAR_RIGHT_SQUARE_BRACKET: _,
      } = Oa(),
      v = (e) => e === l || e === a,
      y = (e) => {
        e.isPrefix !== !0 && (e.depth = e.isGlobstar ? 1 / 0 : 1);
      };
    t.exports = (e, t) => {
      let b = t || {},
        x = e.length - 1,
        S = b.parts === !0 || b.scanToEnd === !0,
        C = [],
        w = [],
        T = [],
        E = e,
        D = -1,
        O = 0,
        ee = 0,
        k = !1,
        te = !1,
        ne = !1,
        re = !1,
        ie = !1,
        A = !1,
        ae = !1,
        oe = !1,
        j = !1,
        M = !1,
        se = 0,
        ce,
        N,
        P = { value: ``, depth: 0, isGlob: !1 },
        le = () => D >= x,
        ue = () => E.charCodeAt(D + 1),
        de = () => ((ce = N), E.charCodeAt(++D));
      for (; D < x; ) {
        N = de();
        let e;
        if (N === a) {
          ((ae = P.backslashes = !0), (N = de()), N === u && (A = !0));
          continue;
        }
        if (A === !0 || N === u) {
          for (se++; le() !== !0 && (N = de()); ) {
            if (N === a) {
              ((ae = P.backslashes = !0), de());
              continue;
            }
            if (N === u) {
              se++;
              continue;
            }
            if (A !== !0 && N === s && (N = de()) === s) {
              if (((k = P.isBrace = !0), (ne = P.isGlob = !0), (M = !0), S === !0)) continue;
              break;
            }
            if (A !== !0 && N === o) {
              if (((k = P.isBrace = !0), (ne = P.isGlob = !0), (M = !0), S === !0)) continue;
              break;
            }
            if (N === h && (se--, se === 0)) {
              ((A = !1), (k = P.isBrace = !0), (M = !0));
              break;
            }
          }
          if (S === !0) continue;
          break;
        }
        if (N === l) {
          if ((C.push(D), w.push(P), (P = { value: ``, depth: 0, isGlob: !1 }), M === !0)) continue;
          if (ce === s && D === O + 1) {
            O += 2;
            continue;
          }
          ee = D + 1;
          continue;
        }
        if (b.noext !== !0 && (N === p || N === i || N === r || N === m || N === c) && ue() === d) {
          if (
            ((ne = P.isGlob = !0),
            (re = P.isExtglob = !0),
            (M = !0),
            N === c && D === O && (j = !0),
            S === !0)
          ) {
            for (; le() !== !0 && (N = de()); ) {
              if (N === a) {
                ((ae = P.backslashes = !0), (N = de()));
                continue;
              }
              if (N === g) {
                ((ne = P.isGlob = !0), (M = !0));
                break;
              }
            }
            continue;
          }
          break;
        }
        if (N === r) {
          if ((ce === r && (ie = P.isGlobstar = !0), (ne = P.isGlob = !0), (M = !0), S === !0))
            continue;
          break;
        }
        if (N === m) {
          if (((ne = P.isGlob = !0), (M = !0), S === !0)) continue;
          break;
        }
        if (N === f) {
          for (; le() !== !0 && (e = de()); ) {
            if (e === a) {
              ((ae = P.backslashes = !0), de());
              continue;
            }
            if (e === _) {
              ((te = P.isBracket = !0), (ne = P.isGlob = !0), (M = !0));
              break;
            }
          }
          if (S === !0) continue;
          break;
        }
        if (b.nonegate !== !0 && N === c && D === O) {
          ((oe = P.negated = !0), O++);
          continue;
        }
        if (b.noparen !== !0 && N === d) {
          if (((ne = P.isGlob = !0), S === !0)) {
            for (; le() !== !0 && (N = de()); ) {
              if (N === d) {
                ((ae = P.backslashes = !0), (N = de()));
                continue;
              }
              if (N === g) {
                M = !0;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (ne === !0) {
          if (((M = !0), S === !0)) continue;
          break;
        }
      }
      b.noext === !0 && ((re = !1), (ne = !1));
      let fe = E,
        pe = ``,
        me = ``;
      (O > 0 && ((pe = E.slice(0, O)), (E = E.slice(O)), (ee -= O)),
        fe && ne === !0 && ee > 0
          ? ((fe = E.slice(0, ee)), (me = E.slice(ee)))
          : ne === !0
            ? ((fe = ``), (me = E))
            : (fe = E),
        fe &&
          fe !== `` &&
          fe !== `/` &&
          fe !== E &&
          v(fe.charCodeAt(fe.length - 1)) &&
          (fe = fe.slice(0, -1)),
        b.unescape === !0 &&
          ((me &&= n.removeBackslashes(me)), fe && ae === !0 && (fe = n.removeBackslashes(fe))));
      let F = {
        prefix: pe,
        input: e,
        start: O,
        base: fe,
        glob: me,
        isBrace: k,
        isBracket: te,
        isGlob: ne,
        isExtglob: re,
        isGlobstar: ie,
        negated: oe,
        negatedExtglob: j,
      };
      if (
        (b.tokens === !0 && ((F.maxDepth = 0), v(N) || w.push(P), (F.tokens = w)),
        b.parts === !0 || b.tokens === !0)
      ) {
        let t;
        for (let n = 0; n < C.length; n++) {
          let r = t ? t + 1 : O,
            i = C[n],
            a = e.slice(r, i);
          (b.tokens &&
            (n === 0 && O !== 0 ? ((w[n].isPrefix = !0), (w[n].value = pe)) : (w[n].value = a),
            y(w[n]),
            (F.maxDepth += w[n].depth)),
            (n !== 0 || a !== ``) && T.push(a),
            (t = i));
        }
        if (t && t + 1 < e.length) {
          let n = e.slice(t + 1);
          (T.push(n),
            b.tokens &&
              ((w[w.length - 1].value = n),
              y(w[w.length - 1]),
              (F.maxDepth += w[w.length - 1].depth)));
        }
        ((F.slashes = C), (F.parts = T));
      }
      return F;
    };
  }),
  ja = n((e, t) => {
    var n = Oa(),
      r = ka(),
      {
        MAX_LENGTH: i,
        POSIX_REGEX_SOURCE: a,
        REGEX_NON_SPECIAL_CHARS: o,
        REGEX_SPECIAL_CHARS_BACKREF: s,
        REPLACEMENTS: c,
      } = n,
      l = (e, t) => {
        if (typeof t.expandRange == `function`) return t.expandRange(...e, t);
        e.sort();
        let n = `[${e.join(`-`)}]`;
        try {
          new RegExp(n);
        } catch {
          return e.map((e) => r.escapeRegex(e)).join(`..`);
        }
        return n;
      },
      u = (e, t) => `Missing ${e}: "${t}" - use "\\\\${t}" to match literal characters`,
      d = (e) => {
        let t = [],
          n = 0,
          r = 0,
          i = 0,
          a = ``,
          o = !1;
        for (let s of e) {
          if (o === !0) {
            ((a += s), (o = !1));
            continue;
          }
          if (s === `\\`) {
            ((a += s), (o = !0));
            continue;
          }
          if (s === `"`) {
            ((i = i === 1 ? 0 : 1), (a += s));
            continue;
          }
          if (i === 0) {
            if (s === `[`) n++;
            else if (s === `]` && n > 0) n--;
            else if (n === 0) {
              if (s === `(`) r++;
              else if (s === `)` && r > 0) r--;
              else if (s === `|` && r === 0) {
                (t.push(a), (a = ``));
                continue;
              }
            }
          }
          a += s;
        }
        return (t.push(a), t);
      },
      f = (e) => {
        let t = !1;
        for (let n of e) {
          if (t === !0) {
            t = !1;
            continue;
          }
          if (n === `\\`) {
            t = !0;
            continue;
          }
          if (/[?*+@!()[\]{}]/.test(n)) return !1;
        }
        return !0;
      },
      p = (e) => {
        let t = e.trim(),
          n = !0;
        for (; n === !0; )
          ((n = !1), /^@\([^\\()[\]{}|]+\)$/.test(t) && ((t = t.slice(2, -1)), (n = !0)));
        if (f(t)) return t.replace(/\\(.)/g, `$1`);
      },
      m = (e) => {
        let t = e.map(p).filter(Boolean);
        for (let e = 0; e < t.length; e++)
          for (let n = e + 1; n < t.length; n++) {
            let r = t[e],
              i = t[n],
              a = r[0];
            if (
              !(!a || r !== a.repeat(r.length) || i !== a.repeat(i.length)) &&
              (r === i || r.startsWith(i) || i.startsWith(r))
            )
              return !0;
          }
        return !1;
      },
      h = (e, t = !0) => {
        if ((e[0] !== `+` && e[0] !== `*`) || e[1] !== `(`) return;
        let n = 0,
          r = 0,
          i = 0,
          a = !1;
        for (let o = 1; o < e.length; o++) {
          let s = e[o];
          if (a === !0) {
            a = !1;
            continue;
          }
          if (s === `\\`) {
            a = !0;
            continue;
          }
          if (s === `"`) {
            i = i === 1 ? 0 : 1;
            continue;
          }
          if (i !== 1) {
            if (s === `[`) {
              n++;
              continue;
            }
            if (s === `]` && n > 0) {
              n--;
              continue;
            }
            if (!(n > 0)) {
              if (s === `(`) {
                r++;
                continue;
              }
              if (s === `)` && (r--, r === 0))
                return t === !0 && o !== e.length - 1
                  ? void 0
                  : { type: e[0], body: e.slice(2, o), end: o };
            }
          }
        }
      },
      g = (e) => {
        let t = 0,
          n = [];
        for (; t < e.length; ) {
          let r = h(e.slice(t), !1);
          if (!r || r.type !== `*`) return;
          let i = d(r.body).map((e) => e.trim());
          if (i.length !== 1) return;
          let a = p(i[0]);
          if (!a || a.length !== 1) return;
          (n.push(a), (t += r.end + 1));
        }
        if (!(n.length < 1))
          return `${n.length === 1 ? r.escapeRegex(n[0]) : `[${n.map((e) => r.escapeRegex(e)).join(``)}]`}*`;
      },
      _ = (e) => {
        let t = 0,
          n = e.trim(),
          r = h(n);
        for (; r; ) (t++, (n = r.body.trim()), (r = h(n)));
        return t;
      },
      v = (e, t) => {
        if (t.maxExtglobRecursion === !1) return { risky: !1 };
        let r =
            typeof t.maxExtglobRecursion == `number`
              ? t.maxExtglobRecursion
              : n.DEFAULT_MAX_EXTGLOB_RECURSION,
          i = d(e).map((e) => e.trim());
        if (i.length > 1 && (i.some((e) => e === ``) || i.some((e) => /^[*?]+$/.test(e)) || m(i)))
          return { risky: !0 };
        for (let e of i) {
          let t = g(e);
          if (t) return { risky: !0, safeOutput: t };
          if (_(e) > r) return { risky: !0 };
        }
        return { risky: !1 };
      },
      y = (e, t) => {
        if (typeof e != `string`) throw TypeError(`Expected a string`);
        e = c[e] || e;
        let d = { ...t },
          f = typeof d.maxLength == `number` ? Math.min(i, d.maxLength) : i,
          p = e.length;
        if (p > f) throw SyntaxError(`Input length: ${p}, exceeds maximum allowed length: ${f}`);
        let m = { type: `bos`, value: ``, output: d.prepend || `` },
          h = [m],
          g = d.capture ? `` : `?:`,
          _ = r.isWindows(t),
          b = n.globChars(_),
          x = n.extglobChars(b),
          {
            DOT_LITERAL: S,
            PLUS_LITERAL: C,
            SLASH_LITERAL: w,
            ONE_CHAR: T,
            DOTS_SLASH: E,
            NO_DOT: D,
            NO_DOT_SLASH: O,
            NO_DOTS_SLASH: ee,
            QMARK: k,
            QMARK_NO_DOT: te,
            STAR: ne,
            START_ANCHOR: re,
          } = b,
          ie = (e) => `(${g}(?:(?!${re}${e.dot ? E : S}).)*?)`,
          A = d.dot ? `` : D,
          ae = d.dot ? k : te,
          oe = d.bash === !0 ? ie(d) : ne;
        (d.capture && (oe = `(${oe})`), typeof d.noext == `boolean` && (d.noextglob = d.noext));
        let j = {
          input: e,
          index: -1,
          start: 0,
          dot: d.dot === !0,
          consumed: ``,
          output: ``,
          prefix: ``,
          backtrack: !1,
          negated: !1,
          brackets: 0,
          braces: 0,
          parens: 0,
          quotes: 0,
          globstar: !1,
          tokens: h,
        };
        ((e = r.removePrefix(e, j)), (p = e.length));
        let M = [],
          se = [],
          ce = [],
          N = m,
          P,
          le = () => j.index === p - 1,
          ue = (j.peek = (t = 1) => e[j.index + t]),
          de = (j.advance = () => e[++j.index] || ``),
          fe = () => e.slice(j.index + 1),
          pe = (e = ``, t = 0) => {
            ((j.consumed += e), (j.index += t));
          },
          me = (e) => {
            ((j.output += e.output == null ? e.value : e.output), pe(e.value));
          },
          F = () => {
            let e = 1;
            for (; ue() === `!` && (ue(2) !== `(` || ue(3) === `?`); ) (de(), j.start++, e++);
            return e % 2 == 0 ? !1 : ((j.negated = !0), j.start++, !0);
          },
          he = (e) => {
            (j[e]++, ce.push(e));
          },
          ge = (e) => {
            (j[e]--, ce.pop());
          },
          I = (e) => {
            if (N.type === `globstar`) {
              let t = j.braces > 0 && (e.type === `comma` || e.type === `brace`),
                n = e.extglob === !0 || (M.length && (e.type === `pipe` || e.type === `paren`));
              e.type !== `slash` &&
                e.type !== `paren` &&
                !t &&
                !n &&
                ((j.output = j.output.slice(0, -N.output.length)),
                (N.type = `star`),
                (N.value = `*`),
                (N.output = oe),
                (j.output += N.output));
            }
            if (
              (M.length && e.type !== `paren` && (M[M.length - 1].inner += e.value),
              (e.value || e.output) && me(e),
              N && N.type === `text` && e.type === `text`)
            ) {
              ((N.value += e.value), (N.output = (N.output || ``) + e.value));
              return;
            }
            ((e.prev = N), h.push(e), (N = e));
          },
          _e = (e, t) => {
            let n = { ...x[t], conditions: 1, inner: `` };
            ((n.prev = N),
              (n.parens = j.parens),
              (n.output = j.output),
              (n.startIndex = j.index),
              (n.tokensIndex = h.length));
            let r = (d.capture ? `(` : ``) + n.open;
            (he(`parens`),
              I({ type: e, value: t, output: j.output ? `` : T }),
              I({ type: `paren`, extglob: !0, value: de(), output: r }),
              M.push(n));
          },
          ve = (n) => {
            let i = e.slice(n.startIndex, j.index + 1),
              a = v(e.slice(n.startIndex + 2, j.index), d);
            if ((n.type === `plus` || n.type === `star`) && a.risky) {
              let e = a.safeOutput
                  ? (n.output ? `` : T) + (d.capture ? `(${a.safeOutput})` : a.safeOutput)
                  : void 0,
                t = h[n.tokensIndex];
              ((t.type = `text`), (t.value = i), (t.output = e || r.escapeRegex(i)));
              for (let e = n.tokensIndex + 1; e < h.length; e++)
                ((h[e].value = ``), (h[e].output = ``), delete h[e].suffix);
              ((j.output = n.output + t.output),
                (j.backtrack = !0),
                I({ type: `paren`, extglob: !0, value: P, output: `` }),
                ge(`parens`));
              return;
            }
            let o = n.close + (d.capture ? `)` : ``),
              s;
            if (n.type === `negate`) {
              let e = oe;
              (n.inner && n.inner.length > 1 && n.inner.includes(`/`) && (e = ie(d)),
                (e !== oe || le() || /^\)+$/.test(fe())) && (o = n.close = `)$))${e}`),
                n.inner.includes(`*`) &&
                  (s = fe()) &&
                  /^\.[^\\/.]+$/.test(s) &&
                  (o = n.close = `)${y(s, { ...t, fastpaths: !1 }).output})${e})`),
                n.prev.type === `bos` && (j.negatedExtglob = !0));
            }
            (I({ type: `paren`, extglob: !0, value: P, output: o }), ge(`parens`));
          };
        if (d.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(e)) {
          let n = !1,
            i = e.replace(s, (e, t, r, i, a, o) =>
              i === `\\`
                ? ((n = !0), e)
                : i === `?`
                  ? t
                    ? t + i + (a ? k.repeat(a.length) : ``)
                    : o === 0
                      ? ae + (a ? k.repeat(a.length) : ``)
                      : k.repeat(r.length)
                  : i === `.`
                    ? S.repeat(r.length)
                    : i === `*`
                      ? t
                        ? t + i + (a ? oe : ``)
                        : oe
                      : t
                        ? e
                        : `\\${e}`
            );
          return (
            n === !0 &&
              (i =
                d.unescape === !0
                  ? i.replace(/\\/g, ``)
                  : i.replace(/\\+/g, (e) => (e.length % 2 == 0 ? `\\\\` : e ? `\\` : ``))),
            i === e && d.contains === !0
              ? ((j.output = e), j)
              : ((j.output = r.wrapOutput(i, j, t)), j)
          );
        }
        for (; !le(); ) {
          if (((P = de()), P === `\0`)) continue;
          if (P === `\\`) {
            let e = ue();
            if ((e === `/` && d.bash !== !0) || e === `.` || e === `;`) continue;
            if (!e) {
              ((P += `\\`), I({ type: `text`, value: P }));
              continue;
            }
            let t = /^\\+/.exec(fe()),
              n = 0;
            if (
              (t &&
                t[0].length > 2 &&
                ((n = t[0].length), (j.index += n), n % 2 != 0 && (P += `\\`)),
              d.unescape === !0 ? (P = de()) : (P += de()),
              j.brackets === 0)
            ) {
              I({ type: `text`, value: P });
              continue;
            }
          }
          if (j.brackets > 0 && (P !== `]` || N.value === `[` || N.value === `[^`)) {
            if (d.posix !== !1 && P === `:`) {
              let e = N.value.slice(1);
              if (e.includes(`[`) && ((N.posix = !0), e.includes(`:`))) {
                let e = N.value.lastIndexOf(`[`),
                  t = N.value.slice(0, e),
                  n = a[N.value.slice(e + 2)];
                if (n) {
                  ((N.value = t + n),
                    (j.backtrack = !0),
                    de(),
                    !m.output && h.indexOf(N) === 1 && (m.output = T));
                  continue;
                }
              }
            }
            (((P === `[` && ue() !== `:`) || (P === `-` && ue() === `]`)) && (P = `\\${P}`),
              P === `]` && (N.value === `[` || N.value === `[^`) && (P = `\\${P}`),
              d.posix === !0 && P === `!` && N.value === `[` && (P = `^`),
              (N.value += P),
              me({ value: P }));
            continue;
          }
          if (j.quotes === 1 && P !== `"`) {
            ((P = r.escapeRegex(P)), (N.value += P), me({ value: P }));
            continue;
          }
          if (P === `"`) {
            ((j.quotes = j.quotes === 1 ? 0 : 1),
              d.keepQuotes === !0 && I({ type: `text`, value: P }));
            continue;
          }
          if (P === `(`) {
            (he(`parens`), I({ type: `paren`, value: P }));
            continue;
          }
          if (P === `)`) {
            if (j.parens === 0 && d.strictBrackets === !0) throw SyntaxError(u(`opening`, `(`));
            let e = M[M.length - 1];
            if (e && j.parens === e.parens + 1) {
              ve(M.pop());
              continue;
            }
            (I({ type: `paren`, value: P, output: j.parens ? `)` : `\\)` }), ge(`parens`));
            continue;
          }
          if (P === `[`) {
            if (d.nobracket === !0 || !fe().includes(`]`)) {
              if (d.nobracket !== !0 && d.strictBrackets === !0)
                throw SyntaxError(u(`closing`, `]`));
              P = `\\${P}`;
            } else he(`brackets`);
            I({ type: `bracket`, value: P });
            continue;
          }
          if (P === `]`) {
            if (d.nobracket === !0 || (N && N.type === `bracket` && N.value.length === 1)) {
              I({ type: `text`, value: P, output: `\\${P}` });
              continue;
            }
            if (j.brackets === 0) {
              if (d.strictBrackets === !0) throw SyntaxError(u(`opening`, `[`));
              I({ type: `text`, value: P, output: `\\${P}` });
              continue;
            }
            ge(`brackets`);
            let e = N.value.slice(1);
            if (
              (N.posix !== !0 && e[0] === `^` && !e.includes(`/`) && (P = `/${P}`),
              (N.value += P),
              me({ value: P }),
              d.literalBrackets === !1 || r.hasRegexChars(e))
            )
              continue;
            let t = r.escapeRegex(N.value);
            if (((j.output = j.output.slice(0, -N.value.length)), d.literalBrackets === !0)) {
              ((j.output += t), (N.value = t));
              continue;
            }
            ((N.value = `(${g}${t}|${N.value})`), (j.output += N.value));
            continue;
          }
          if (P === `{` && d.nobrace !== !0) {
            he(`braces`);
            let e = {
              type: `brace`,
              value: P,
              output: `(`,
              outputIndex: j.output.length,
              tokensIndex: j.tokens.length,
            };
            (se.push(e), I(e));
            continue;
          }
          if (P === `}`) {
            let e = se[se.length - 1];
            if (d.nobrace === !0 || !e) {
              I({ type: `text`, value: P, output: P });
              continue;
            }
            let t = `)`;
            if (e.dots === !0) {
              let e = h.slice(),
                n = [];
              for (let t = e.length - 1; t >= 0 && (h.pop(), e[t].type !== `brace`); t--)
                e[t].type !== `dots` && n.unshift(e[t].value);
              ((t = l(n, d)), (j.backtrack = !0));
            }
            if (e.comma !== !0 && e.dots !== !0) {
              let n = j.output.slice(0, e.outputIndex),
                r = j.tokens.slice(e.tokensIndex);
              ((e.value = e.output = `\\{`), (P = t = `\\}`), (j.output = n));
              for (let e of r) j.output += e.output || e.value;
            }
            (I({ type: `brace`, value: P, output: t }), ge(`braces`), se.pop());
            continue;
          }
          if (P === `|`) {
            (M.length > 0 && M[M.length - 1].conditions++, I({ type: `text`, value: P }));
            continue;
          }
          if (P === `,`) {
            let e = P,
              t = se[se.length - 1];
            (t && ce[ce.length - 1] === `braces` && ((t.comma = !0), (e = `|`)),
              I({ type: `comma`, value: P, output: e }));
            continue;
          }
          if (P === `/`) {
            if (N.type === `dot` && j.index === j.start + 1) {
              ((j.start = j.index + 1), (j.consumed = ``), (j.output = ``), h.pop(), (N = m));
              continue;
            }
            I({ type: `slash`, value: P, output: w });
            continue;
          }
          if (P === `.`) {
            if (j.braces > 0 && N.type === `dot`) {
              N.value === `.` && (N.output = S);
              let e = se[se.length - 1];
              ((N.type = `dots`), (N.output += P), (N.value += P), (e.dots = !0));
              continue;
            }
            if (j.braces + j.parens === 0 && N.type !== `bos` && N.type !== `slash`) {
              I({ type: `text`, value: P, output: S });
              continue;
            }
            I({ type: `dot`, value: P, output: S });
            continue;
          }
          if (P === `?`) {
            if (!(N && N.value === `(`) && d.noextglob !== !0 && ue() === `(` && ue(2) !== `?`) {
              _e(`qmark`, P);
              continue;
            }
            if (N && N.type === `paren`) {
              let e = ue(),
                t = P;
              if (e === `<` && !r.supportsLookbehinds())
                throw Error(`Node.js v10 or higher is required for regex lookbehinds`);
              (((N.value === `(` && !/[!=<:]/.test(e)) ||
                (e === `<` && !/<([!=]|\w+>)/.test(fe()))) &&
                (t = `\\${P}`),
                I({ type: `text`, value: P, output: t }));
              continue;
            }
            if (d.dot !== !0 && (N.type === `slash` || N.type === `bos`)) {
              I({ type: `qmark`, value: P, output: te });
              continue;
            }
            I({ type: `qmark`, value: P, output: k });
            continue;
          }
          if (P === `!`) {
            if (d.noextglob !== !0 && ue() === `(` && (ue(2) !== `?` || !/[!=<:]/.test(ue(3)))) {
              _e(`negate`, P);
              continue;
            }
            if (d.nonegate !== !0 && j.index === 0) {
              F();
              continue;
            }
          }
          if (P === `+`) {
            if (d.noextglob !== !0 && ue() === `(` && ue(2) !== `?`) {
              _e(`plus`, P);
              continue;
            }
            if ((N && N.value === `(`) || d.regex === !1) {
              I({ type: `plus`, value: P, output: C });
              continue;
            }
            if (
              (N && (N.type === `bracket` || N.type === `paren` || N.type === `brace`)) ||
              j.parens > 0
            ) {
              I({ type: `plus`, value: P });
              continue;
            }
            I({ type: `plus`, value: C });
            continue;
          }
          if (P === `@`) {
            if (d.noextglob !== !0 && ue() === `(` && ue(2) !== `?`) {
              I({ type: `at`, extglob: !0, value: P, output: `` });
              continue;
            }
            I({ type: `text`, value: P });
            continue;
          }
          if (P !== `*`) {
            (P === `$` || P === `^`) && (P = `\\${P}`);
            let e = o.exec(fe());
            (e && ((P += e[0]), (j.index += e[0].length)), I({ type: `text`, value: P }));
            continue;
          }
          if (N && (N.type === `globstar` || N.star === !0)) {
            ((N.type = `star`),
              (N.star = !0),
              (N.value += P),
              (N.output = oe),
              (j.backtrack = !0),
              (j.globstar = !0),
              pe(P));
            continue;
          }
          let t = fe();
          if (d.noextglob !== !0 && /^\([^?]/.test(t)) {
            _e(`star`, P);
            continue;
          }
          if (N.type === `star`) {
            if (d.noglobstar === !0) {
              pe(P);
              continue;
            }
            let n = N.prev,
              r = n.prev,
              i = n.type === `slash` || n.type === `bos`,
              a = r && (r.type === `star` || r.type === `globstar`);
            if (d.bash === !0 && (!i || (t[0] && t[0] !== `/`))) {
              I({ type: `star`, value: P, output: `` });
              continue;
            }
            let o = j.braces > 0 && (n.type === `comma` || n.type === `brace`),
              s = M.length && (n.type === `pipe` || n.type === `paren`);
            if (!i && n.type !== `paren` && !o && !s) {
              I({ type: `star`, value: P, output: `` });
              continue;
            }
            for (; t.slice(0, 3) === `/**`; ) {
              let n = e[j.index + 4];
              if (n && n !== `/`) break;
              ((t = t.slice(3)), pe(`/**`, 3));
            }
            if (n.type === `bos` && le()) {
              ((N.type = `globstar`),
                (N.value += P),
                (N.output = ie(d)),
                (j.output = N.output),
                (j.globstar = !0),
                pe(P));
              continue;
            }
            if (n.type === `slash` && n.prev.type !== `bos` && !a && le()) {
              ((j.output = j.output.slice(0, -(n.output + N.output).length)),
                (n.output = `(?:${n.output}`),
                (N.type = `globstar`),
                (N.output = ie(d) + (d.strictSlashes ? `)` : `|$)`)),
                (N.value += P),
                (j.globstar = !0),
                (j.output += n.output + N.output),
                pe(P));
              continue;
            }
            if (n.type === `slash` && n.prev.type !== `bos` && t[0] === `/`) {
              let e = t[1] === void 0 ? `` : `|$`;
              ((j.output = j.output.slice(0, -(n.output + N.output).length)),
                (n.output = `(?:${n.output}`),
                (N.type = `globstar`),
                (N.output = `${ie(d)}${w}|${w}${e})`),
                (N.value += P),
                (j.output += n.output + N.output),
                (j.globstar = !0),
                pe(P + de()),
                I({ type: `slash`, value: `/`, output: `` }));
              continue;
            }
            if (n.type === `bos` && t[0] === `/`) {
              ((N.type = `globstar`),
                (N.value += P),
                (N.output = `(?:^|${w}|${ie(d)}${w})`),
                (j.output = N.output),
                (j.globstar = !0),
                pe(P + de()),
                I({ type: `slash`, value: `/`, output: `` }));
              continue;
            }
            ((j.output = j.output.slice(0, -N.output.length)),
              (N.type = `globstar`),
              (N.output = ie(d)),
              (N.value += P),
              (j.output += N.output),
              (j.globstar = !0),
              pe(P));
            continue;
          }
          let n = { type: `star`, value: P, output: oe };
          if (d.bash === !0) {
            ((n.output = `.*?`),
              (N.type === `bos` || N.type === `slash`) && (n.output = A + n.output),
              I(n));
            continue;
          }
          if (N && (N.type === `bracket` || N.type === `paren`) && d.regex === !0) {
            ((n.output = P), I(n));
            continue;
          }
          ((j.index === j.start || N.type === `slash` || N.type === `dot`) &&
            (N.type === `dot`
              ? ((j.output += O), (N.output += O))
              : d.dot === !0
                ? ((j.output += ee), (N.output += ee))
                : ((j.output += A), (N.output += A)),
            ue() !== `*` && ((j.output += T), (N.output += T))),
            I(n));
        }
        for (; j.brackets > 0; ) {
          if (d.strictBrackets === !0) throw SyntaxError(u(`closing`, `]`));
          ((j.output = r.escapeLast(j.output, `[`)), ge(`brackets`));
        }
        for (; j.parens > 0; ) {
          if (d.strictBrackets === !0) throw SyntaxError(u(`closing`, `)`));
          ((j.output = r.escapeLast(j.output, `(`)), ge(`parens`));
        }
        for (; j.braces > 0; ) {
          if (d.strictBrackets === !0) throw SyntaxError(u(`closing`, `}`));
          ((j.output = r.escapeLast(j.output, `{`)), ge(`braces`));
        }
        if (
          (d.strictSlashes !== !0 &&
            (N.type === `star` || N.type === `bracket`) &&
            I({ type: `maybe_slash`, value: ``, output: `${w}?` }),
          j.backtrack === !0)
        ) {
          j.output = ``;
          for (let e of j.tokens)
            ((j.output += e.output == null ? e.value : e.output),
              e.suffix && (j.output += e.suffix));
        }
        return j;
      };
    ((y.fastpaths = (e, t) => {
      let a = { ...t },
        o = typeof a.maxLength == `number` ? Math.min(i, a.maxLength) : i,
        s = e.length;
      if (s > o) throw SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${o}`);
      e = c[e] || e;
      let l = r.isWindows(t),
        {
          DOT_LITERAL: u,
          SLASH_LITERAL: d,
          ONE_CHAR: f,
          DOTS_SLASH: p,
          NO_DOT: m,
          NO_DOTS: h,
          NO_DOTS_SLASH: g,
          STAR: _,
          START_ANCHOR: v,
        } = n.globChars(l),
        y = a.dot ? h : m,
        b = a.dot ? g : m,
        x = a.capture ? `` : `?:`,
        S = { negated: !1, prefix: `` },
        C = a.bash === !0 ? `.*?` : _;
      a.capture && (C = `(${C})`);
      let w = (e) => (e.noglobstar === !0 ? C : `(${x}(?:(?!${v}${e.dot ? p : u}).)*?)`),
        T = (e) => {
          switch (e) {
            case `*`:
              return `${y}${f}${C}`;
            case `.*`:
              return `${u}${f}${C}`;
            case `*.*`:
              return `${y}${C}${u}${f}${C}`;
            case `*/*`:
              return `${y}${C}${d}${f}${b}${C}`;
            case `**`:
              return y + w(a);
            case `**/*`:
              return `(?:${y}${w(a)}${d})?${b}${f}${C}`;
            case `**/*.*`:
              return `(?:${y}${w(a)}${d})?${b}${C}${u}${f}${C}`;
            case `**/.*`:
              return `(?:${y}${w(a)}${d})?${u}${f}${C}`;
            default: {
              let t = /^(.*?)\.(\w+)$/.exec(e);
              if (!t) return;
              let n = T(t[1]);
              return n ? n + u + t[2] : void 0;
            }
          }
        },
        E = T(r.removePrefix(e, S));
      return (E && a.strictSlashes !== !0 && (E += `${d}?`), E);
    }),
      (t.exports = y));
  }),
  Ma = n((e, t) => {
    var n = r(),
      i = Aa(),
      a = ja(),
      o = ka(),
      s = Oa(),
      c = (e) => e && typeof e == `object` && !Array.isArray(e),
      l = (e, t, n = !1) => {
        if (Array.isArray(e)) {
          let r = e.map((e) => l(e, t, n));
          return (e) => {
            for (let t of r) {
              let n = t(e);
              if (n) return n;
            }
            return !1;
          };
        }
        let r = c(e) && e.tokens && e.input;
        if (e === `` || (typeof e != `string` && !r))
          throw TypeError(`Expected pattern to be a non-empty string`);
        let i = t || {},
          a = o.isWindows(t),
          s = r ? l.compileRe(e, t) : l.makeRe(e, t, !1, !0),
          u = s.state;
        delete s.state;
        let d = () => !1;
        if (i.ignore) {
          let e = { ...t, ignore: null, onMatch: null, onResult: null };
          d = l(i.ignore, e, n);
        }
        let f = (n, r = !1) => {
          let { isMatch: o, match: c, output: f } = l.test(n, s, t, { glob: e, posix: a }),
            p = {
              glob: e,
              state: u,
              regex: s,
              posix: a,
              input: n,
              output: f,
              match: c,
              isMatch: o,
            };
          return (
            typeof i.onResult == `function` && i.onResult(p),
            o === !1
              ? ((p.isMatch = !1), r ? p : !1)
              : d(n)
                ? (typeof i.onIgnore == `function` && i.onIgnore(p), (p.isMatch = !1), r ? p : !1)
                : (typeof i.onMatch == `function` && i.onMatch(p), r ? p : !0)
          );
        };
        return (n && (f.state = u), f);
      };
    ((l.test = (e, t, n, { glob: r, posix: i } = {}) => {
      if (typeof e != `string`) throw TypeError(`Expected input to be a string`);
      if (e === ``) return { isMatch: !1, output: `` };
      let a = n || {},
        s = a.format || (i ? o.toPosixSlashes : null),
        c = e === r,
        u = c && s ? s(e) : e;
      return (
        c === !1 && ((u = s ? s(e) : e), (c = u === r)),
        (c === !1 || a.capture === !0) &&
          (c = a.matchBase === !0 || a.basename === !0 ? l.matchBase(e, t, n, i) : t.exec(u)),
        { isMatch: !!c, match: c, output: u }
      );
    }),
      (l.matchBase = (e, t, r, i = o.isWindows(r)) =>
        (t instanceof RegExp ? t : l.makeRe(t, r)).test(n.basename(e))),
      (l.isMatch = (e, t, n) => l(t, n)(e)),
      (l.parse = (e, t) =>
        Array.isArray(e) ? e.map((e) => l.parse(e, t)) : a(e, { ...t, fastpaths: !1 })),
      (l.scan = (e, t) => i(e, t)),
      (l.compileRe = (e, t, n = !1, r = !1) => {
        if (n === !0) return e.output;
        let i = t || {},
          a = i.contains ? `` : `^`,
          o = i.contains ? `` : `$`,
          s = `${a}(?:${e.output})${o}`;
        e && e.negated === !0 && (s = `^(?!${s}).*$`);
        let c = l.toRegex(s, t);
        return (r === !0 && (c.state = e), c);
      }),
      (l.makeRe = (e, t = {}, n = !1, r = !1) => {
        if (!e || typeof e != `string`) throw TypeError(`Expected a non-empty string`);
        let i = { negated: !1, fastpaths: !0 };
        return (
          t.fastpaths !== !1 && (e[0] === `.` || e[0] === `*`) && (i.output = a.fastpaths(e, t)),
          i.output || (i = a(e, t)),
          l.compileRe(i, t, n, r)
        );
      }),
      (l.toRegex = (e, t) => {
        try {
          let n = t || {};
          return new RegExp(e, n.flags || (n.nocase ? `i` : ``));
        } catch (e) {
          if (t && t.debug === !0) throw e;
          return /$^/;
        }
      }),
      (l.constants = s),
      (t.exports = l));
  }),
  Na = n((e, t) => {
    t.exports = Ma();
  }),
  Pa = n((e, t) => {
    var n = r(),
      i = Da(),
      a = Na(),
      o = ka(),
      s = (e) => e === `` || e === `./`,
      c = (e) => {
        let t = e.indexOf(`{`);
        return t > -1 && e.indexOf(`}`, t) > -1;
      },
      l = (e, t, n) => {
        ((t = [].concat(t)), (e = [].concat(e)));
        let r = new Set(),
          i = new Set(),
          o = new Set(),
          s = 0,
          c = (e) => {
            (o.add(e.output), n && n.onResult && n.onResult(e));
          };
        for (let o = 0; o < t.length; o++) {
          let l = a(String(t[o]), { ...n, onResult: c }, !0),
            u = l.state.negated || l.state.negatedExtglob;
          u && s++;
          for (let t of e) {
            let e = l(t, !0);
            (u ? !e.isMatch : e.isMatch) &&
              (u ? r.add(e.output) : (r.delete(e.output), i.add(e.output)));
          }
        }
        let l = (s === t.length ? [...o] : [...i]).filter((e) => !r.has(e));
        if (n && l.length === 0) {
          if (n.failglob === !0) throw Error(`No matches found for "${t.join(`, `)}"`);
          if (n.nonull === !0 || n.nullglob === !0)
            return n.unescape ? t.map((e) => e.replace(/\\/g, ``)) : t;
        }
        return l;
      };
    ((l.match = l),
      (l.matcher = (e, t) => a(e, t)),
      (l.isMatch = (e, t, n) => a(t, n)(e)),
      (l.any = l.isMatch),
      (l.not = (e, t, n = {}) => {
        t = [].concat(t).map(String);
        let r = new Set(),
          i = [],
          a = (e) => {
            (n.onResult && n.onResult(e), i.push(e.output));
          },
          o = new Set(l(e, t, { ...n, onResult: a }));
        for (let e of i) o.has(e) || r.add(e);
        return [...r];
      }),
      (l.contains = (e, t, r) => {
        if (typeof e != `string`) throw TypeError(`Expected a string: "${n.inspect(e)}"`);
        if (Array.isArray(t)) return t.some((t) => l.contains(e, t, r));
        if (typeof t == `string`) {
          if (s(e) || s(t)) return !1;
          if (e.includes(t) || (e.startsWith(`./`) && e.slice(2).includes(t))) return !0;
        }
        return l.isMatch(e, t, { ...r, contains: !0 });
      }),
      (l.matchKeys = (e, t, n) => {
        if (!o.isObject(e)) throw TypeError(`Expected the first argument to be an object`);
        let r = l(Object.keys(e), t, n),
          i = {};
        for (let t of r) i[t] = e[t];
        return i;
      }),
      (l.some = (e, t, n) => {
        let r = [].concat(e);
        for (let e of [].concat(t)) {
          let t = a(String(e), n);
          if (r.some((e) => t(e))) return !0;
        }
        return !1;
      }),
      (l.every = (e, t, n) => {
        let r = [].concat(e);
        for (let e of [].concat(t)) {
          let t = a(String(e), n);
          if (!r.every((e) => t(e))) return !1;
        }
        return !0;
      }),
      (l.all = (e, t, r) => {
        if (typeof e != `string`) throw TypeError(`Expected a string: "${n.inspect(e)}"`);
        return [].concat(t).every((t) => a(t, r)(e));
      }),
      (l.capture = (e, t, n) => {
        let r = o.isWindows(n),
          i = a.makeRe(String(e), { ...n, capture: !0 }).exec(r ? o.toPosixSlashes(t) : t);
        if (i) return i.slice(1).map((e) => (e === void 0 ? `` : e));
      }),
      (l.makeRe = (...e) => a.makeRe(...e)),
      (l.scan = (...e) => a.scan(...e)),
      (l.parse = (e, t) => {
        let n = [];
        for (let r of [].concat(e || [])) for (let e of i(String(r), t)) n.push(a.parse(e, t));
        return n;
      }),
      (l.braces = (e, t) => {
        if (typeof e != `string`) throw TypeError(`Expected a string`);
        return (t && t.nobrace === !0) || !c(e) ? [e] : i(e, t);
      }),
      (l.braceExpand = (e, t) => {
        if (typeof e != `string`) throw TypeError(`Expected a string`);
        return l.braces(e, { ...t, expand: !0 });
      }),
      (l.hasBraces = c),
      (t.exports = l));
  }),
  Fa = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.isAbsolute =
        e.partitionAbsoluteAndRelative =
        e.removeDuplicateSlashes =
        e.matchAny =
        e.convertPatternsToRe =
        e.makeRe =
        e.getPatternParts =
        e.expandBraceExpansion =
        e.expandPatternsWithBraceExpansion =
        e.isAffectDepthOfReadingPattern =
        e.endsWithSlashGlobStar =
        e.hasGlobStar =
        e.getBaseDirectory =
        e.isPatternRelatedToParentDirectory =
        e.getPatternsOutsideCurrentDirectory =
        e.getPatternsInsideCurrentDirectory =
        e.getPositivePatterns =
        e.getNegativePatterns =
        e.isPositivePattern =
        e.isNegativePattern =
        e.convertToNegativePattern =
        e.convertToPositivePattern =
        e.isDynamicPattern =
        e.isStaticPattern =
          void 0));
    var t = r(),
      n = _a(),
      i = Pa(),
      a = `**`,
      o = `\\`,
      s = /[*?]|^!/,
      c = /\[[^[]*]/,
      l = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/,
      u = /[!*+?@]\([^(]*\)/,
      d = /,|\.\./,
      f = /(?!^)\/{2,}/g;
    function p(e, t = {}) {
      return !m(e, t);
    }
    e.isStaticPattern = p;
    function m(e, t = {}) {
      return e === ``
        ? !1
        : !!(
            t.caseSensitiveMatch === !1 ||
            e.includes(o) ||
            s.test(e) ||
            c.test(e) ||
            l.test(e) ||
            (t.extglob !== !1 && u.test(e)) ||
            (t.braceExpansion !== !1 && h(e))
          );
    }
    e.isDynamicPattern = m;
    function h(e) {
      let t = e.indexOf(`{`);
      if (t === -1) return !1;
      let n = e.indexOf(`}`, t + 1);
      if (n === -1) return !1;
      let r = e.slice(t, n);
      return d.test(r);
    }
    function g(e) {
      return v(e) ? e.slice(1) : e;
    }
    e.convertToPositivePattern = g;
    function _(e) {
      return `!` + e;
    }
    e.convertToNegativePattern = _;
    function v(e) {
      return e.startsWith(`!`) && e[1] !== `(`;
    }
    e.isNegativePattern = v;
    function y(e) {
      return !v(e);
    }
    e.isPositivePattern = y;
    function b(e) {
      return e.filter(v);
    }
    e.getNegativePatterns = b;
    function x(e) {
      return e.filter(y);
    }
    e.getPositivePatterns = x;
    function S(e) {
      return e.filter((e) => !w(e));
    }
    e.getPatternsInsideCurrentDirectory = S;
    function C(e) {
      return e.filter(w);
    }
    e.getPatternsOutsideCurrentDirectory = C;
    function w(e) {
      return e.startsWith(`..`) || e.startsWith(`./..`);
    }
    e.isPatternRelatedToParentDirectory = w;
    function T(e) {
      return n(e, { flipBackslashes: !1 });
    }
    e.getBaseDirectory = T;
    function E(e) {
      return e.includes(a);
    }
    e.hasGlobStar = E;
    function D(e) {
      return e.endsWith(`/**`);
    }
    e.endsWithSlashGlobStar = D;
    function O(e) {
      let n = t.basename(e);
      return D(e) || p(n);
    }
    e.isAffectDepthOfReadingPattern = O;
    function ee(e) {
      return e.reduce((e, t) => e.concat(k(t)), []);
    }
    e.expandPatternsWithBraceExpansion = ee;
    function k(e) {
      let t = i.braces(e, { expand: !0, nodupes: !0, keepEscaping: !0 });
      return (t.sort((e, t) => e.length - t.length), t.filter((e) => e !== ``));
    }
    e.expandBraceExpansion = k;
    function te(e, t) {
      let { parts: n } = i.scan(e, Object.assign(Object.assign({}, t), { parts: !0 }));
      return (
        n.length === 0 && (n = [e]),
        n[0].startsWith(`/`) && ((n[0] = n[0].slice(1)), n.unshift(``)),
        n
      );
    }
    e.getPatternParts = te;
    function ne(e, t) {
      return i.makeRe(e, t);
    }
    e.makeRe = ne;
    function re(e, t) {
      return e.map((e) => ne(e, t));
    }
    e.convertPatternsToRe = re;
    function ie(e, t) {
      return t.some((t) => t.test(e));
    }
    e.matchAny = ie;
    function A(e) {
      return e.replace(f, `/`);
    }
    e.removeDuplicateSlashes = A;
    function ae(e) {
      let t = [],
        n = [];
      for (let r of e) oe(r) ? t.push(r) : n.push(r);
      return [t, n];
    }
    e.partitionAbsoluteAndRelative = ae;
    function oe(e) {
      return t.isAbsolute(e);
    }
    e.isAbsolute = oe;
  }),
  Ia = n((e, t) => {
    var n = r().PassThrough,
      i = Array.prototype.slice;
    t.exports = a;
    function a() {
      let e = [],
        t = i.call(arguments),
        r = !1,
        a = t[t.length - 1];
      a && !Array.isArray(a) && a.pipe == null ? t.pop() : (a = {});
      let s = a.end !== !1,
        c = a.pipeError === !0;
      ((a.objectMode ??= !0), (a.highWaterMark ??= 64 * 1024));
      let l = n(a);
      function u() {
        for (let t = 0, n = arguments.length; t < n; t++) e.push(o(arguments[t], a));
        return (d(), this);
      }
      function d() {
        if (r) return;
        r = !0;
        let t = e.shift();
        if (!t) {
          process.nextTick(f);
          return;
        }
        Array.isArray(t) || (t = [t]);
        let n = t.length + 1;
        function i() {
          --n > 0 || ((r = !1), d());
        }
        function a(e) {
          function t() {
            (e.removeListener(`merge2UnpipeEnd`, t),
              e.removeListener(`end`, t),
              c && e.removeListener(`error`, n),
              i());
          }
          function n(e) {
            l.emit(`error`, e);
          }
          if (e._readableState.endEmitted) return i();
          (e.on(`merge2UnpipeEnd`, t),
            e.on(`end`, t),
            c && e.on(`error`, n),
            e.pipe(l, { end: !1 }),
            e.resume());
        }
        for (let e = 0; e < t.length; e++) a(t[e]);
        i();
      }
      function f() {
        ((r = !1), l.emit(`queueDrain`), s && l.end());
      }
      return (
        l.setMaxListeners(0),
        (l.add = u),
        l.on(`unpipe`, function (e) {
          e.emit(`merge2UnpipeEnd`);
        }),
        t.length && u.apply(null, t),
        l
      );
    }
    function o(e, t) {
      if (Array.isArray(e)) for (let n = 0, r = e.length; n < r; n++) e[n] = o(e[n], t);
      else {
        if (
          (!e._readableState && e.pipe && (e = e.pipe(n(t))),
          !e._readableState || !e.pause || !e.pipe)
        )
          throw Error(`Only readable stream can be merged.`);
        e.pause();
      }
      return e;
    }
  }),
  La = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.merge = void 0));
    var t = Ia();
    function n(e) {
      let n = t(e);
      return (
        e.forEach((e) => {
          e.once(`error`, (e) => n.emit(`error`, e));
        }),
        n.once(`close`, () => r(e)),
        n.once(`end`, () => r(e)),
        n
      );
    }
    e.merge = n;
    function r(e) {
      e.forEach((e) => e.emit(`close`));
    }
  }),
  Ra = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.isEmpty = e.isString = void 0));
    function t(e) {
      return typeof e == `string`;
    }
    e.isString = t;
    function n(e) {
      return e === ``;
    }
    e.isEmpty = n;
  }),
  za = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.string = e.stream = e.pattern = e.path = e.fs = e.errno = e.array = void 0),
      (e.array = da()),
      (e.errno = fa()),
      (e.fs = pa()),
      (e.path = ma()),
      (e.pattern = Fa()),
      (e.stream = La()),
      (e.string = Ra()));
  }),
  Ba = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.convertPatternGroupToTask =
        e.convertPatternGroupsToTasks =
        e.groupPatternsByBaseDirectory =
        e.getNegativePatternsAsPositive =
        e.getPositivePatterns =
        e.convertPatternsToTasks =
        e.generate =
          void 0));
    var t = za();
    function n(e, n) {
      let s = r(e, n),
        c = r(n.ignore, n),
        l = a(s),
        u = o(s, c),
        d = l.filter((e) => t.pattern.isStaticPattern(e, n)),
        f = l.filter((e) => t.pattern.isDynamicPattern(e, n)),
        p = i(d, u, !1),
        m = i(f, u, !0);
      return p.concat(m);
    }
    e.generate = n;
    function r(e, n) {
      let r = e;
      return (
        n.braceExpansion && (r = t.pattern.expandPatternsWithBraceExpansion(r)),
        n.baseNameMatch && (r = r.map((e) => (e.includes(`/`) ? e : `**/${e}`))),
        r.map((e) => t.pattern.removeDuplicateSlashes(e))
      );
    }
    function i(e, n, r) {
      let i = [],
        a = t.pattern.getPatternsOutsideCurrentDirectory(e),
        o = t.pattern.getPatternsInsideCurrentDirectory(e),
        u = s(a),
        d = s(o);
      return (i.push(...c(u, n, r)), `.` in d ? i.push(l(`.`, o, n, r)) : i.push(...c(d, n, r)), i);
    }
    e.convertPatternsToTasks = i;
    function a(e) {
      return t.pattern.getPositivePatterns(e);
    }
    e.getPositivePatterns = a;
    function o(e, n) {
      return t.pattern.getNegativePatterns(e).concat(n).map(t.pattern.convertToPositivePattern);
    }
    e.getNegativePatternsAsPositive = o;
    function s(e) {
      return e.reduce((e, n) => {
        let r = t.pattern.getBaseDirectory(n);
        return (r in e ? e[r].push(n) : (e[r] = [n]), e);
      }, {});
    }
    e.groupPatternsByBaseDirectory = s;
    function c(e, t, n) {
      return Object.keys(e).map((r) => l(r, e[r], t, n));
    }
    e.convertPatternGroupsToTasks = c;
    function l(e, n, r, i) {
      return {
        dynamic: i,
        positive: n,
        negative: r,
        base: e,
        patterns: [].concat(n, r.map(t.pattern.convertToNegativePattern)),
      };
    }
    e.convertPatternGroupToTask = l;
  }),
  Va = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.read = void 0));
    function t(e, t, i) {
      t.fs.lstat(e, (a, o) => {
        if (a !== null) {
          n(i, a);
          return;
        }
        if (!o.isSymbolicLink() || !t.followSymbolicLink) {
          r(i, o);
          return;
        }
        t.fs.stat(e, (e, a) => {
          if (e !== null) {
            if (t.throwErrorOnBrokenSymbolicLink) {
              n(i, e);
              return;
            }
            r(i, o);
            return;
          }
          (t.markSymbolicLink && (a.isSymbolicLink = () => !0), r(i, a));
        });
      });
    }
    e.read = t;
    function n(e, t) {
      e(t);
    }
    function r(e, t) {
      e(null, t);
    }
  }),
  Ha = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.read = void 0));
    function t(e, t) {
      let n = t.fs.lstatSync(e);
      if (!n.isSymbolicLink() || !t.followSymbolicLink) return n;
      try {
        let n = t.fs.statSync(e);
        return (t.markSymbolicLink && (n.isSymbolicLink = () => !0), n);
      } catch (e) {
        if (!t.throwErrorOnBrokenSymbolicLink) return n;
        throw e;
      }
    }
    e.read = t;
  }),
  Ua = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.createFileSystemAdapter = e.FILE_SYSTEM_ADAPTER = void 0));
    var t = r();
    e.FILE_SYSTEM_ADAPTER = {
      lstat: t.lstat,
      stat: t.stat,
      lstatSync: t.lstatSync,
      statSync: t.statSync,
    };
    function n(t) {
      return t === void 0
        ? e.FILE_SYSTEM_ADAPTER
        : Object.assign(Object.assign({}, e.FILE_SYSTEM_ADAPTER), t);
    }
    e.createFileSystemAdapter = n;
  }),
  Wa = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = Ua();
    e.default = class {
      constructor(e = {}) {
        ((this._options = e),
          (this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, !0)),
          (this.fs = t.createFileSystemAdapter(this._options.fs)),
          (this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, !1)),
          (this.throwErrorOnBrokenSymbolicLink = this._getValue(
            this._options.throwErrorOnBrokenSymbolicLink,
            !0
          )));
      }
      _getValue(e, t) {
        return e ?? t;
      }
    };
  }),
  Ga = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.statSync = e.stat = e.Settings = void 0));
    var t = Va(),
      n = Ha(),
      r = Wa();
    e.Settings = r.default;
    function i(e, n, r) {
      if (typeof n == `function`) {
        t.read(e, o(), n);
        return;
      }
      t.read(e, o(n), r);
    }
    e.stat = i;
    function a(e, t) {
      let r = o(t);
      return n.read(e, r);
    }
    e.statSync = a;
    function o(e = {}) {
      return e instanceof r.default ? e : new r.default(e);
    }
  }),
  Ka = n((e, t) => {
    var n;
    t.exports =
      typeof queueMicrotask == `function`
        ? queueMicrotask.bind(typeof window < `u` ? window : global)
        : (e) =>
            (n ||= Promise.resolve()).then(e).catch((e) =>
              setTimeout(() => {
                throw e;
              }, 0)
            );
  }),
  qa = n((e, t) => {
    t.exports = r;
    var n = Ka();
    function r(e, t) {
      let r,
        i,
        a,
        o = !0;
      Array.isArray(e)
        ? ((r = []), (i = e.length))
        : ((a = Object.keys(e)), (r = {}), (i = a.length));
      function s(e) {
        function i() {
          (t && t(e, r), (t = null));
        }
        o ? n(i) : i();
      }
      function c(e, t, n) {
        ((r[e] = n), (--i === 0 || t) && s(t));
      }
      (i
        ? a
          ? a.forEach(function (t) {
              e[t](function (e, n) {
                c(t, e, n);
              });
            })
          : e.forEach(function (e, t) {
              e(function (e, n) {
                c(t, e, n);
              });
            })
        : s(null),
        (o = !1));
    }
  }),
  Ja = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0));
    var t = process.versions.node.split(`.`);
    if (t[0] === void 0 || t[1] === void 0)
      throw Error(
        `Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`
      );
    var n = Number.parseInt(t[0], 10),
      r = Number.parseInt(t[1], 10),
      i = 10;
    e.IS_SUPPORT_READDIR_WITH_FILE_TYPES = n > i || (n === i && r >= 10);
  }),
  Ya = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.createDirentFromStats = void 0));
    var t = class {
      constructor(e, t) {
        ((this.name = e),
          (this.isBlockDevice = t.isBlockDevice.bind(t)),
          (this.isCharacterDevice = t.isCharacterDevice.bind(t)),
          (this.isDirectory = t.isDirectory.bind(t)),
          (this.isFIFO = t.isFIFO.bind(t)),
          (this.isFile = t.isFile.bind(t)),
          (this.isSocket = t.isSocket.bind(t)),
          (this.isSymbolicLink = t.isSymbolicLink.bind(t)));
      }
    };
    function n(e, n) {
      return new t(e, n);
    }
    e.createDirentFromStats = n;
  }),
  Xa = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.fs = void 0), (e.fs = Ya()));
  }),
  Za = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }), (e.joinPathSegments = void 0));
    function t(e, t, n) {
      return e.endsWith(n) ? e + t : e + n + t;
    }
    e.joinPathSegments = t;
  }),
  Qa = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.readdir = e.readdirWithFileTypes = e.read = void 0));
    var t = Ga(),
      n = qa(),
      r = Ja(),
      i = Xa(),
      a = Za();
    function o(e, t, n) {
      if (!t.stats && r.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        s(e, t, n);
        return;
      }
      l(e, t, n);
    }
    e.read = o;
    function s(e, t, r) {
      t.fs.readdir(e, { withFileTypes: !0 }, (i, o) => {
        if (i !== null) {
          u(r, i);
          return;
        }
        let s = o.map((n) => ({
          dirent: n,
          name: n.name,
          path: a.joinPathSegments(e, n.name, t.pathSegmentSeparator),
        }));
        if (!t.followSymbolicLinks) {
          d(r, s);
          return;
        }
        n(
          s.map((e) => c(e, t)),
          (e, t) => {
            if (e !== null) {
              u(r, e);
              return;
            }
            d(r, t);
          }
        );
      });
    }
    e.readdirWithFileTypes = s;
    function c(e, t) {
      return (n) => {
        if (!e.dirent.isSymbolicLink()) {
          n(null, e);
          return;
        }
        t.fs.stat(e.path, (r, a) => {
          if (r !== null) {
            if (t.throwErrorOnBrokenSymbolicLink) {
              n(r);
              return;
            }
            n(null, e);
            return;
          }
          ((e.dirent = i.fs.createDirentFromStats(e.name, a)), n(null, e));
        });
      };
    }
    function l(e, r, o) {
      r.fs.readdir(e, (s, c) => {
        if (s !== null) {
          u(o, s);
          return;
        }
        n(
          c.map((n) => {
            let o = a.joinPathSegments(e, n, r.pathSegmentSeparator);
            return (e) => {
              t.stat(o, r.fsStatSettings, (t, a) => {
                if (t !== null) {
                  e(t);
                  return;
                }
                let s = { name: n, path: o, dirent: i.fs.createDirentFromStats(n, a) };
                (r.stats && (s.stats = a), e(null, s));
              });
            };
          }),
          (e, t) => {
            if (e !== null) {
              u(o, e);
              return;
            }
            d(o, t);
          }
        );
      });
    }
    e.readdir = l;
    function u(e, t) {
      e(t);
    }
    function d(e, t) {
      e(null, t);
    }
  }),
  $a = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.readdir = e.readdirWithFileTypes = e.read = void 0));
    var t = Ga(),
      n = Ja(),
      r = Xa(),
      i = Za();
    function a(e, t) {
      return !t.stats && n.IS_SUPPORT_READDIR_WITH_FILE_TYPES ? o(e, t) : s(e, t);
    }
    e.read = a;
    function o(e, t) {
      return t.fs.readdirSync(e, { withFileTypes: !0 }).map((n) => {
        let a = {
          dirent: n,
          name: n.name,
          path: i.joinPathSegments(e, n.name, t.pathSegmentSeparator),
        };
        if (a.dirent.isSymbolicLink() && t.followSymbolicLinks)
          try {
            let e = t.fs.statSync(a.path);
            a.dirent = r.fs.createDirentFromStats(a.name, e);
          } catch (e) {
            if (t.throwErrorOnBrokenSymbolicLink) throw e;
          }
        return a;
      });
    }
    e.readdirWithFileTypes = o;
    function s(e, n) {
      return n.fs.readdirSync(e).map((a) => {
        let o = i.joinPathSegments(e, a, n.pathSegmentSeparator),
          s = t.statSync(o, n.fsStatSettings),
          c = { name: a, path: o, dirent: r.fs.createDirentFromStats(a, s) };
        return (n.stats && (c.stats = s), c);
      });
    }
    e.readdir = s;
  }),
  eo = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.createFileSystemAdapter = e.FILE_SYSTEM_ADAPTER = void 0));
    var t = r();
    e.FILE_SYSTEM_ADAPTER = {
      lstat: t.lstat,
      stat: t.stat,
      lstatSync: t.lstatSync,
      statSync: t.statSync,
      readdir: t.readdir,
      readdirSync: t.readdirSync,
    };
    function n(t) {
      return t === void 0
        ? e.FILE_SYSTEM_ADAPTER
        : Object.assign(Object.assign({}, e.FILE_SYSTEM_ADAPTER), t);
    }
    e.createFileSystemAdapter = n;
  }),
  to = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = Ga(),
      i = eo();
    e.default = class {
      constructor(e = {}) {
        ((this._options = e),
          (this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !1)),
          (this.fs = i.createFileSystemAdapter(this._options.fs)),
          (this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, t.sep)),
          (this.stats = this._getValue(this._options.stats, !1)),
          (this.throwErrorOnBrokenSymbolicLink = this._getValue(
            this._options.throwErrorOnBrokenSymbolicLink,
            !0
          )),
          (this.fsStatSettings = new n.Settings({
            followSymbolicLink: this.followSymbolicLinks,
            fs: this.fs,
            throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink,
          })));
      }
      _getValue(e, t) {
        return e ?? t;
      }
    };
  }),
  no = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.Settings = e.scandirSync = e.scandir = void 0));
    var t = Qa(),
      n = $a(),
      r = to();
    e.Settings = r.default;
    function i(e, n, r) {
      if (typeof n == `function`) {
        t.read(e, o(), n);
        return;
      }
      t.read(e, o(n), r);
    }
    e.scandir = i;
    function a(e, t) {
      let r = o(t);
      return n.read(e, r);
    }
    e.scandirSync = a;
    function o(e = {}) {
      return e instanceof r.default ? e : new r.default(e);
    }
  }),
  ro = n((e, t) => {
    function n(e) {
      var t = new e(),
        n = t;
      function r() {
        var r = t;
        return (r.next ? (t = r.next) : ((t = new e()), (n = t)), (r.next = null), r);
      }
      function i(e) {
        ((n.next = e), (n = e));
      }
      return { get: r, release: i };
    }
    t.exports = n;
  }),
  io = n((e, t) => {
    var n = ro();
    function r(e, t, r) {
      if ((typeof e == `function` && ((r = t), (t = e), (e = null)), !(r >= 1)))
        throw Error(`fastqueue concurrency must be equal to or greater than 1`);
      var o = n(a),
        s = null,
        c = null,
        l = 0,
        u = null,
        d = {
          push: v,
          drain: i,
          saturated: i,
          pause: p,
          paused: !1,
          get concurrency() {
            return r;
          },
          set concurrency(e) {
            if (!(e >= 1)) throw Error(`fastqueue concurrency must be equal to or greater than 1`);
            if (((r = e), !d.paused)) for (; s && l < r; ) (l++, b());
          },
          running: f,
          resume: g,
          idle: _,
          length: m,
          getQueue: h,
          unshift: y,
          empty: i,
          kill: x,
          killAndDrain: S,
          error: w,
          abort: C,
        };
      return d;
      function f() {
        return l;
      }
      function p() {
        d.paused = !0;
      }
      function m() {
        for (var e = s, t = 0; e; ) ((e = e.next), t++);
        return t;
      }
      function h() {
        for (var e = s, t = []; e; ) (t.push(e.value), (e = e.next));
        return t;
      }
      function g() {
        if (d.paused) {
          if (((d.paused = !1), s === null)) {
            (l++, b());
            return;
          }
          for (; s && l < r; ) (l++, b());
        }
      }
      function _() {
        return l === 0 && d.length() === 0;
      }
      function v(n, a) {
        var f = o.get();
        ((f.context = e),
          (f.release = b),
          (f.value = n),
          (f.callback = a || i),
          (f.errorHandler = u),
          l >= r || d.paused
            ? c
              ? ((c.next = f), (c = f))
              : ((s = f), (c = f), d.saturated())
            : (l++, t.call(e, f.value, f.worked)));
      }
      function y(n, a) {
        var f = o.get();
        ((f.context = e),
          (f.release = b),
          (f.value = n),
          (f.callback = a || i),
          (f.errorHandler = u),
          l >= r || d.paused
            ? s
              ? ((f.next = s), (s = f))
              : ((s = f), (c = f), d.saturated())
            : (l++, t.call(e, f.value, f.worked)));
      }
      function b(n) {
        n && o.release(n);
        var i = s;
        i && l <= r
          ? d.paused
            ? l--
            : (c === s && (c = null),
              (s = i.next),
              (i.next = null),
              t.call(e, i.value, i.worked),
              c === null && d.empty())
          : --l === 0 && d.drain();
      }
      function x() {
        ((s = null), (c = null), (d.drain = i));
      }
      function S() {
        ((s = null), (c = null), d.drain(), (d.drain = i));
      }
      function C() {
        var e = s;
        for (s = null, c = null; e; ) {
          var t = e.next,
            n = e.callback,
            r = e.errorHandler,
            a = e.value,
            o = e.context;
          ((e.value = null),
            (e.callback = i),
            (e.errorHandler = null),
            r && r(Error(`abort`), a),
            n.call(o, Error(`abort`)),
            e.release(e),
            (e = t));
        }
        d.drain = i;
      }
      function w(e) {
        u = e;
      }
    }
    function i() {}
    function a() {
      ((this.value = null),
        (this.callback = i),
        (this.next = null),
        (this.release = i),
        (this.context = null),
        (this.errorHandler = null));
      var e = this;
      this.worked = function (t, n) {
        var r = e.callback,
          a = e.errorHandler,
          o = e.value;
        ((e.value = null),
          (e.callback = i),
          e.errorHandler && a(t, o),
          r.call(e.context, t, n),
          e.release(e));
      };
    }
    function o(e, t, n) {
      typeof e == `function` && ((n = t), (t = e), (e = null));
      function a(e, n) {
        t.call(this, e).then(function (e) {
          n(null, e);
        }, n);
      }
      var o = r(e, a, n),
        s = o.push,
        c = o.unshift;
      return ((o.push = l), (o.unshift = u), (o.drained = d), o);
      function l(e) {
        var t = new Promise(function (t, n) {
          s(e, function (e, r) {
            if (e) {
              n(e);
              return;
            }
            t(r);
          });
        });
        return (t.catch(i), t);
      }
      function u(e) {
        var t = new Promise(function (t, n) {
          c(e, function (e, r) {
            if (e) {
              n(e);
              return;
            }
            t(r);
          });
        });
        return (t.catch(i), t);
      }
      function d() {
        return new Promise(function (e) {
          process.nextTick(function () {
            if (o.idle()) e();
            else {
              var t = o.drain;
              o.drain = function () {
                (typeof t == `function` && t(), e(), (o.drain = t));
              };
            }
          });
        });
      }
    }
    ((t.exports = r), (t.exports.promise = o));
  }),
  ao = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.joinPathSegments =
        e.replacePathSegmentSeparator =
        e.isAppliedFilter =
        e.isFatalError =
          void 0));
    function t(e, t) {
      return e.errorFilter === null ? !0 : !e.errorFilter(t);
    }
    e.isFatalError = t;
    function n(e, t) {
      return e === null || e(t);
    }
    e.isAppliedFilter = n;
    function r(e, t) {
      return e.split(/[/\\]/).join(t);
    }
    e.replacePathSegmentSeparator = r;
    function i(e, t, n) {
      return e === `` ? t : e.endsWith(n) ? e + t : e + n + t;
    }
    e.joinPathSegments = i;
  }),
  oo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = ao();
    e.default = class {
      constructor(e, n) {
        ((this._root = e),
          (this._settings = n),
          (this._root = t.replacePathSegmentSeparator(e, n.pathSegmentSeparator)));
      }
    };
  }),
  so = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = no(),
      i = io(),
      a = ao(),
      o = oo();
    e.default = class extends o.default {
      constructor(e, r) {
        (super(e, r),
          (this._settings = r),
          (this._scandir = n.scandir),
          (this._emitter = new t.EventEmitter()),
          (this._queue = i(this._worker.bind(this), this._settings.concurrency)),
          (this._isFatalError = !1),
          (this._isDestroyed = !1),
          (this._queue.drain = () => {
            this._isFatalError || this._emitter.emit(`end`);
          }));
      }
      read() {
        return (
          (this._isFatalError = !1),
          (this._isDestroyed = !1),
          setImmediate(() => {
            this._pushToQueue(this._root, this._settings.basePath);
          }),
          this._emitter
        );
      }
      get isDestroyed() {
        return this._isDestroyed;
      }
      destroy() {
        if (this._isDestroyed) throw Error(`The reader is already destroyed`);
        ((this._isDestroyed = !0), this._queue.killAndDrain());
      }
      onEntry(e) {
        this._emitter.on(`entry`, e);
      }
      onError(e) {
        this._emitter.once(`error`, e);
      }
      onEnd(e) {
        this._emitter.once(`end`, e);
      }
      _pushToQueue(e, t) {
        let n = { directory: e, base: t };
        this._queue.push(n, (e) => {
          e !== null && this._handleError(e);
        });
      }
      _worker(e, t) {
        this._scandir(e.directory, this._settings.fsScandirSettings, (n, r) => {
          if (n !== null) {
            t(n, void 0);
            return;
          }
          for (let t of r) this._handleEntry(t, e.base);
          t(null, void 0);
        });
      }
      _handleError(e) {
        this._isDestroyed ||
          !a.isFatalError(this._settings, e) ||
          ((this._isFatalError = !0), (this._isDestroyed = !0), this._emitter.emit(`error`, e));
      }
      _handleEntry(e, t) {
        if (this._isDestroyed || this._isFatalError) return;
        let n = e.path;
        (t !== void 0 &&
          (e.path = a.joinPathSegments(t, e.name, this._settings.pathSegmentSeparator)),
          a.isAppliedFilter(this._settings.entryFilter, e) && this._emitEntry(e),
          e.dirent.isDirectory() &&
            a.isAppliedFilter(this._settings.deepFilter, e) &&
            this._pushToQueue(n, t === void 0 ? void 0 : e.path));
      }
      _emitEntry(e) {
        this._emitter.emit(`entry`, e);
      }
    };
  }),
  co = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = so();
    e.default = class {
      constructor(e, n) {
        ((this._root = e),
          (this._settings = n),
          (this._reader = new t.default(this._root, this._settings)),
          (this._storage = []));
      }
      read(e) {
        (this._reader.onError((t) => {
          n(e, t);
        }),
          this._reader.onEntry((e) => {
            this._storage.push(e);
          }),
          this._reader.onEnd(() => {
            r(e, this._storage);
          }),
          this._reader.read());
      }
    };
    function n(e, t) {
      e(t);
    }
    function r(e, t) {
      e(null, t);
    }
  }),
  lo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = so();
    e.default = class {
      constructor(e, r) {
        ((this._root = e),
          (this._settings = r),
          (this._reader = new n.default(this._root, this._settings)),
          (this._stream = new t.Readable({
            objectMode: !0,
            read: () => {},
            destroy: () => {
              this._reader.isDestroyed || this._reader.destroy();
            },
          })));
      }
      read() {
        return (
          this._reader.onError((e) => {
            this._stream.emit(`error`, e);
          }),
          this._reader.onEntry((e) => {
            this._stream.push(e);
          }),
          this._reader.onEnd(() => {
            this._stream.push(null);
          }),
          this._reader.read(),
          this._stream
        );
      }
    };
  }),
  uo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = no(),
      n = ao(),
      r = oo();
    e.default = class extends r.default {
      constructor() {
        (super(...arguments),
          (this._scandir = t.scandirSync),
          (this._storage = []),
          (this._queue = new Set()));
      }
      read() {
        return (
          this._pushToQueue(this._root, this._settings.basePath),
          this._handleQueue(),
          this._storage
        );
      }
      _pushToQueue(e, t) {
        this._queue.add({ directory: e, base: t });
      }
      _handleQueue() {
        for (let e of this._queue.values()) this._handleDirectory(e.directory, e.base);
      }
      _handleDirectory(e, t) {
        try {
          let n = this._scandir(e, this._settings.fsScandirSettings);
          for (let e of n) this._handleEntry(e, t);
        } catch (e) {
          this._handleError(e);
        }
      }
      _handleError(e) {
        if (n.isFatalError(this._settings, e)) throw e;
      }
      _handleEntry(e, t) {
        let r = e.path;
        (t !== void 0 &&
          (e.path = n.joinPathSegments(t, e.name, this._settings.pathSegmentSeparator)),
          n.isAppliedFilter(this._settings.entryFilter, e) && this._pushToStorage(e),
          e.dirent.isDirectory() &&
            n.isAppliedFilter(this._settings.deepFilter, e) &&
            this._pushToQueue(r, t === void 0 ? void 0 : e.path));
      }
      _pushToStorage(e) {
        this._storage.push(e);
      }
    };
  }),
  fo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = uo();
    e.default = class {
      constructor(e, n) {
        ((this._root = e),
          (this._settings = n),
          (this._reader = new t.default(this._root, this._settings)));
      }
      read() {
        return this._reader.read();
      }
    };
  }),
  po = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = no();
    e.default = class {
      constructor(e = {}) {
        ((this._options = e),
          (this.basePath = this._getValue(this._options.basePath, void 0)),
          (this.concurrency = this._getValue(this._options.concurrency, 1 / 0)),
          (this.deepFilter = this._getValue(this._options.deepFilter, null)),
          (this.entryFilter = this._getValue(this._options.entryFilter, null)),
          (this.errorFilter = this._getValue(this._options.errorFilter, null)),
          (this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, t.sep)),
          (this.fsScandirSettings = new n.Settings({
            followSymbolicLinks: this._options.followSymbolicLinks,
            fs: this._options.fs,
            pathSegmentSeparator: this._options.pathSegmentSeparator,
            stats: this._options.stats,
            throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink,
          })));
      }
      _getValue(e, t) {
        return e ?? t;
      }
    };
  }),
  mo = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.Settings = e.walkStream = e.walkSync = e.walk = void 0));
    var t = co(),
      n = lo(),
      r = fo(),
      i = po();
    e.Settings = i.default;
    function a(e, n, r) {
      if (typeof n == `function`) {
        new t.default(e, c()).read(n);
        return;
      }
      new t.default(e, c(n)).read(r);
    }
    e.walk = a;
    function o(e, t) {
      let n = c(t);
      return new r.default(e, n).read();
    }
    e.walkSync = o;
    function s(e, t) {
      let r = c(t);
      return new n.default(e, r).read();
    }
    e.walkStream = s;
    function c(e = {}) {
      return e instanceof i.default ? e : new i.default(e);
    }
  }),
  ho = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = Ga(),
      i = za();
    e.default = class {
      constructor(e) {
        ((this._settings = e),
          (this._fsStatSettings = new n.Settings({
            followSymbolicLink: this._settings.followSymbolicLinks,
            fs: this._settings.fs,
            throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks,
          })));
      }
      _getFullEntryPath(e) {
        return t.resolve(this._settings.cwd, e);
      }
      _makeEntry(e, t) {
        let n = { name: t, path: t, dirent: i.fs.createDirentFromStats(t, e) };
        return (this._settings.stats && (n.stats = e), n);
      }
      _isFatalError(e) {
        return !i.errno.isEnoentCodeError(e) && !this._settings.suppressErrors;
      }
    };
  }),
  go = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = Ga(),
      i = mo(),
      a = ho();
    e.default = class extends a.default {
      constructor() {
        (super(...arguments), (this._walkStream = i.walkStream), (this._stat = n.stat));
      }
      dynamic(e, t) {
        return this._walkStream(e, t);
      }
      static(e, n) {
        let r = e.map(this._getFullEntryPath, this),
          i = new t.PassThrough({ objectMode: !0 });
        i._write = (t, a, o) =>
          this._getEntry(r[t], e[t], n)
            .then((e) => {
              (e !== null && n.entryFilter(e) && i.push(e), t === r.length - 1 && i.end(), o());
            })
            .catch(o);
        for (let e = 0; e < r.length; e++) i.write(e);
        return i;
      }
      _getEntry(e, t, n) {
        return this._getStat(e)
          .then((e) => this._makeEntry(e, t))
          .catch((e) => {
            if (n.errorFilter(e)) return null;
            throw e;
          });
      }
      _getStat(e) {
        return new Promise((t, n) => {
          this._stat(e, this._fsStatSettings, (e, r) => (e === null ? t(r) : n(e)));
        });
      }
    };
  }),
  _o = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = mo(),
      n = ho(),
      r = go();
    e.default = class extends n.default {
      constructor() {
        (super(...arguments),
          (this._walkAsync = t.walk),
          (this._readerStream = new r.default(this._settings)));
      }
      dynamic(e, t) {
        return new Promise((n, r) => {
          this._walkAsync(e, t, (e, t) => {
            e === null ? n(t) : r(e);
          });
        });
      }
      async static(e, t) {
        let n = [],
          r = this._readerStream.static(e, t);
        return new Promise((e, t) => {
          (r.once(`error`, t), r.on(`data`, (e) => n.push(e)), r.once(`end`, () => e(n)));
        });
      }
    };
  }),
  vo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = za();
    e.default = class {
      constructor(e, t, n) {
        ((this._patterns = e),
          (this._settings = t),
          (this._micromatchOptions = n),
          (this._storage = []),
          this._fillStorage());
      }
      _fillStorage() {
        for (let e of this._patterns) {
          let t = this._getPatternSegments(e),
            n = this._splitSegmentsIntoSections(t);
          this._storage.push({ complete: n.length <= 1, pattern: e, segments: t, sections: n });
        }
      }
      _getPatternSegments(e) {
        return t.pattern
          .getPatternParts(e, this._micromatchOptions)
          .map((e) =>
            t.pattern.isDynamicPattern(e, this._settings)
              ? { dynamic: !0, pattern: e, patternRe: t.pattern.makeRe(e, this._micromatchOptions) }
              : { dynamic: !1, pattern: e }
          );
      }
      _splitSegmentsIntoSections(e) {
        return t.array.splitWhen(e, (e) => e.dynamic && t.pattern.hasGlobStar(e.pattern));
      }
    };
  }),
  yo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = vo();
    e.default = class extends t.default {
      match(e) {
        let t = e.split(`/`),
          n = t.length,
          r = this._storage.filter((e) => !e.complete || e.segments.length > n);
        for (let e of r) {
          let r = e.sections[0];
          if (
            (!e.complete && n > r.length) ||
            t.every((t, n) => {
              let r = e.segments[n];
              return !!((r.dynamic && r.patternRe.test(t)) || (!r.dynamic && r.pattern === t));
            })
          )
            return !0;
        }
        return !1;
      }
    };
  }),
  bo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = za(),
      n = yo();
    e.default = class {
      constructor(e, t) {
        ((this._settings = e), (this._micromatchOptions = t));
      }
      getFilter(e, t, n) {
        let r = this._getMatcher(t),
          i = this._getNegativePatternsRe(n);
        return (t) => this._filter(e, t, r, i);
      }
      _getMatcher(e) {
        return new n.default(e, this._settings, this._micromatchOptions);
      }
      _getNegativePatternsRe(e) {
        let n = e.filter(t.pattern.isAffectDepthOfReadingPattern);
        return t.pattern.convertPatternsToRe(n, this._micromatchOptions);
      }
      _filter(e, n, r, i) {
        if (this._isSkippedByDeep(e, n.path) || this._isSkippedSymbolicLink(n)) return !1;
        let a = t.path.removeLeadingDotSegment(n.path);
        return this._isSkippedByPositivePatterns(a, r)
          ? !1
          : this._isSkippedByNegativePatterns(a, i);
      }
      _isSkippedByDeep(e, t) {
        return this._settings.deep === 1 / 0
          ? !1
          : this._getEntryLevel(e, t) >= this._settings.deep;
      }
      _getEntryLevel(e, t) {
        let n = t.split(`/`).length;
        return e === `` ? n : n - e.split(`/`).length;
      }
      _isSkippedSymbolicLink(e) {
        return !this._settings.followSymbolicLinks && e.dirent.isSymbolicLink();
      }
      _isSkippedByPositivePatterns(e, t) {
        return !this._settings.baseNameMatch && !t.match(e);
      }
      _isSkippedByNegativePatterns(e, n) {
        return !t.pattern.matchAny(e, n);
      }
    };
  }),
  xo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = za();
    e.default = class {
      constructor(e, t) {
        ((this._settings = e), (this._micromatchOptions = t), (this.index = new Map()));
      }
      getFilter(e, n) {
        let [r, i] = t.pattern.partitionAbsoluteAndRelative(n),
          a = {
            positive: { all: t.pattern.convertPatternsToRe(e, this._micromatchOptions) },
            negative: {
              absolute: t.pattern.convertPatternsToRe(
                r,
                Object.assign(Object.assign({}, this._micromatchOptions), { dot: !0 })
              ),
              relative: t.pattern.convertPatternsToRe(
                i,
                Object.assign(Object.assign({}, this._micromatchOptions), { dot: !0 })
              ),
            },
          };
        return (e) => this._filter(e, a);
      }
      _filter(e, n) {
        let r = t.path.removeLeadingDotSegment(e.path);
        if (
          (this._settings.unique && this._isDuplicateEntry(r)) ||
          this._onlyFileFilter(e) ||
          this._onlyDirectoryFilter(e)
        )
          return !1;
        let i = this._isMatchToPatternsSet(r, n, e.dirent.isDirectory());
        return (this._settings.unique && i && this._createIndexRecord(r), i);
      }
      _isDuplicateEntry(e) {
        return this.index.has(e);
      }
      _createIndexRecord(e) {
        this.index.set(e, void 0);
      }
      _onlyFileFilter(e) {
        return this._settings.onlyFiles && !e.dirent.isFile();
      }
      _onlyDirectoryFilter(e) {
        return this._settings.onlyDirectories && !e.dirent.isDirectory();
      }
      _isMatchToPatternsSet(e, t, n) {
        return !(
          !this._isMatchToPatterns(e, t.positive.all, n) ||
          this._isMatchToPatterns(e, t.negative.relative, n) ||
          this._isMatchToAbsoluteNegative(e, t.negative.absolute, n)
        );
      }
      _isMatchToAbsoluteNegative(e, n, r) {
        if (n.length === 0) return !1;
        let i = t.path.makeAbsolute(this._settings.cwd, e);
        return this._isMatchToPatterns(i, n, r);
      }
      _isMatchToPatterns(e, n, r) {
        if (n.length === 0) return !1;
        let i = t.pattern.matchAny(e, n);
        return !i && r ? t.pattern.matchAny(e + `/`, n) : i;
      }
    };
  }),
  So = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = za();
    e.default = class {
      constructor(e) {
        this._settings = e;
      }
      getFilter() {
        return (e) => this._isNonFatalError(e);
      }
      _isNonFatalError(e) {
        return t.errno.isEnoentCodeError(e) || this._settings.suppressErrors;
      }
    };
  }),
  Co = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = za();
    e.default = class {
      constructor(e) {
        this._settings = e;
      }
      getTransformer() {
        return (e) => this._transform(e);
      }
      _transform(e) {
        let n = e.path;
        return (
          this._settings.absolute &&
            ((n = t.path.makeAbsolute(this._settings.cwd, n)), (n = t.path.unixify(n))),
          this._settings.markDirectories && e.dirent.isDirectory() && (n += `/`),
          this._settings.objectMode ? Object.assign(Object.assign({}, e), { path: n }) : n
        );
      }
    };
  }),
  wo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = bo(),
      i = xo(),
      a = So(),
      o = Co();
    e.default = class {
      constructor(e) {
        ((this._settings = e),
          (this.errorFilter = new a.default(this._settings)),
          (this.entryFilter = new i.default(this._settings, this._getMicromatchOptions())),
          (this.deepFilter = new n.default(this._settings, this._getMicromatchOptions())),
          (this.entryTransformer = new o.default(this._settings)));
      }
      _getRootDirectory(e) {
        return t.resolve(this._settings.cwd, e.base);
      }
      _getReaderOptions(e) {
        let t = e.base === `.` ? `` : e.base;
        return {
          basePath: t,
          pathSegmentSeparator: `/`,
          concurrency: this._settings.concurrency,
          deepFilter: this.deepFilter.getFilter(t, e.positive, e.negative),
          entryFilter: this.entryFilter.getFilter(e.positive, e.negative),
          errorFilter: this.errorFilter.getFilter(),
          followSymbolicLinks: this._settings.followSymbolicLinks,
          fs: this._settings.fs,
          stats: this._settings.stats,
          throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink,
          transform: this.entryTransformer.getTransformer(),
        };
      }
      _getMicromatchOptions() {
        return {
          dot: this._settings.dot,
          matchBase: this._settings.baseNameMatch,
          nobrace: !this._settings.braceExpansion,
          nocase: !this._settings.caseSensitiveMatch,
          noext: !this._settings.extglob,
          noglobstar: !this._settings.globstar,
          posix: !0,
          strictSlashes: !1,
        };
      }
    };
  }),
  To = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = _o(),
      n = wo();
    e.default = class extends n.default {
      constructor() {
        (super(...arguments), (this._reader = new t.default(this._settings)));
      }
      async read(e) {
        let t = this._getRootDirectory(e),
          n = this._getReaderOptions(e);
        return (await this.api(t, e, n)).map((e) => n.transform(e));
      }
      api(e, t, n) {
        return t.dynamic ? this._reader.dynamic(e, n) : this._reader.static(t.patterns, n);
      }
    };
  }),
  Eo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = r(),
      n = go(),
      i = wo();
    e.default = class extends i.default {
      constructor() {
        (super(...arguments), (this._reader = new n.default(this._settings)));
      }
      read(e) {
        let n = this._getRootDirectory(e),
          r = this._getReaderOptions(e),
          i = this.api(n, e, r),
          a = new t.Readable({ objectMode: !0, read: () => {} });
        return (
          i
            .once(`error`, (e) => a.emit(`error`, e))
            .on(`data`, (e) => a.emit(`data`, r.transform(e)))
            .once(`end`, () => a.emit(`end`)),
          a.once(`close`, () => i.destroy()),
          a
        );
      }
      api(e, t, n) {
        return t.dynamic ? this._reader.dynamic(e, n) : this._reader.static(t.patterns, n);
      }
    };
  }),
  Do = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = Ga(),
      n = mo(),
      r = ho();
    e.default = class extends r.default {
      constructor() {
        (super(...arguments), (this._walkSync = n.walkSync), (this._statSync = t.statSync));
      }
      dynamic(e, t) {
        return this._walkSync(e, t);
      }
      static(e, t) {
        let n = [];
        for (let r of e) {
          let e = this._getFullEntryPath(r),
            i = this._getEntry(e, r, t);
          i === null || !t.entryFilter(i) || n.push(i);
        }
        return n;
      }
      _getEntry(e, t, n) {
        try {
          let n = this._getStat(e);
          return this._makeEntry(n, t);
        } catch (e) {
          if (n.errorFilter(e)) return null;
          throw e;
        }
      }
      _getStat(e) {
        return this._statSync(e, this._fsStatSettings);
      }
    };
  }),
  Oo = n((e) => {
    Object.defineProperty(e, '__esModule', { value: !0 });
    var t = Do(),
      n = wo();
    e.default = class extends n.default {
      constructor() {
        (super(...arguments), (this._reader = new t.default(this._settings)));
      }
      read(e) {
        let t = this._getRootDirectory(e),
          n = this._getReaderOptions(e);
        return this.api(t, e, n).map(n.transform);
      }
      api(e, t, n) {
        return t.dynamic ? this._reader.dynamic(e, n) : this._reader.static(t.patterns, n);
      }
    };
  }),
  ko = n((e) => {
    (Object.defineProperty(e, '__esModule', { value: !0 }),
      (e.DEFAULT_FILE_SYSTEM_ADAPTER = void 0));
    var t = r(),
      n = r(),
      i = Math.max(n.cpus().length, 1);
    ((e.DEFAULT_FILE_SYSTEM_ADAPTER = {
      lstat: t.lstat,
      lstatSync: t.lstatSync,
      stat: t.stat,
      statSync: t.statSync,
      readdir: t.readdir,
      readdirSync: t.readdirSync,
    }),
      (e.default = class {
        constructor(e = {}) {
          ((this._options = e),
            (this.absolute = this._getValue(this._options.absolute, !1)),
            (this.baseNameMatch = this._getValue(this._options.baseNameMatch, !1)),
            (this.braceExpansion = this._getValue(this._options.braceExpansion, !0)),
            (this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, !0)),
            (this.concurrency = this._getValue(this._options.concurrency, i)),
            (this.cwd = this._getValue(this._options.cwd, process.cwd())),
            (this.deep = this._getValue(this._options.deep, 1 / 0)),
            (this.dot = this._getValue(this._options.dot, !1)),
            (this.extglob = this._getValue(this._options.extglob, !0)),
            (this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !0)),
            (this.fs = this._getFileSystemMethods(this._options.fs)),
            (this.globstar = this._getValue(this._options.globstar, !0)),
            (this.ignore = this._getValue(this._options.ignore, [])),
            (this.markDirectories = this._getValue(this._options.markDirectories, !1)),
            (this.objectMode = this._getValue(this._options.objectMode, !1)),
            (this.onlyDirectories = this._getValue(this._options.onlyDirectories, !1)),
            (this.onlyFiles = this._getValue(this._options.onlyFiles, !0)),
            (this.stats = this._getValue(this._options.stats, !1)),
            (this.suppressErrors = this._getValue(this._options.suppressErrors, !1)),
            (this.throwErrorOnBrokenSymbolicLink = this._getValue(
              this._options.throwErrorOnBrokenSymbolicLink,
              !1
            )),
            (this.unique = this._getValue(this._options.unique, !0)),
            this.onlyDirectories && (this.onlyFiles = !1),
            this.stats && (this.objectMode = !0),
            (this.ignore = [].concat(this.ignore)));
        }
        _getValue(e, t) {
          return e === void 0 ? t : e;
        }
        _getFileSystemMethods(t = {}) {
          return Object.assign(Object.assign({}, e.DEFAULT_FILE_SYSTEM_ADAPTER), t);
        }
      }));
  });
n((e, t) => {
  var n = Ba(),
    r = To(),
    i = Eo(),
    a = Oo(),
    o = ko(),
    s = za();
  async function c(e, t) {
    u(e);
    let n = l(e, r.default, t),
      i = await Promise.all(n);
    return s.array.flatten(i);
  }
  (function (e) {
    ((e.glob = e), (e.globSync = t), (e.globStream = r), (e.async = e));
    function t(e, t) {
      u(e);
      let n = l(e, a.default, t);
      return s.array.flatten(n);
    }
    e.sync = t;
    function r(e, t) {
      u(e);
      let n = l(e, i.default, t);
      return s.stream.merge(n);
    }
    e.stream = r;
    function c(e, t) {
      u(e);
      let r = [].concat(e),
        i = new o.default(t);
      return n.generate(r, i);
    }
    e.generateTasks = c;
    function d(e, t) {
      u(e);
      let n = new o.default(t);
      return s.pattern.isDynamicPattern(e, n);
    }
    e.isDynamicPattern = d;
    function f(e) {
      return (u(e), s.path.escape(e));
    }
    e.escapePath = f;
    function p(e) {
      return (u(e), s.path.convertPathToPattern(e));
    }
    ((e.convertPathToPattern = p),
      (function (e) {
        function t(e) {
          return (u(e), s.path.escapePosixPath(e));
        }
        e.escapePath = t;
        function n(e) {
          return (u(e), s.path.convertPosixPathToPattern(e));
        }
        e.convertPathToPattern = n;
      })((e.posix ||= {})),
      (function (e) {
        function t(e) {
          return (u(e), s.path.escapeWindowsPath(e));
        }
        e.escapePath = t;
        function n(e) {
          return (u(e), s.path.convertWindowsPathToPattern(e));
        }
        e.convertPathToPattern = n;
      })((e.win32 ||= {})));
  })((c ||= {}));
  function l(e, t, r) {
    let i = [].concat(e),
      a = new o.default(r),
      s = n.generate(i, a),
      c = new t(a);
    return s.map(c.read, c);
  }
  function u(e) {
    if (![].concat(e).every((e) => s.string.isString(e) && !s.string.isEmpty(e)))
      throw TypeError(`Patterns must be a string (non empty) or an array of strings`);
  }
  t.exports = c;
})();
var Ao = function (e, t) {
  return (
    (Ao =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (e, t) {
          e.__proto__ = t;
        }) ||
      function (e, t) {
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n]);
      }),
    Ao(e, t)
  );
};
function jo(e, t) {
  if (typeof t != `function` && t !== null)
    throw TypeError(`Class extends value ` + String(t) + ` is not a constructor or null`);
  Ao(e, t);
  function n() {
    this.constructor = e;
  }
  e.prototype = t === null ? Object.create(t) : ((n.prototype = t.prototype), new n());
}
function Mo(e, t, n, r) {
  function i(e) {
    return e instanceof n
      ? e
      : new n(function (t) {
          t(e);
        });
  }
  return new (n ||= Promise)(function (n, a) {
    function o(e) {
      try {
        c(r.next(e));
      } catch (e) {
        a(e);
      }
    }
    function s(e) {
      try {
        c(r.throw(e));
      } catch (e) {
        a(e);
      }
    }
    function c(e) {
      e.done ? n(e.value) : i(e.value).then(o, s);
    }
    c((r = r.apply(e, t || [])).next());
  });
}
function No(e, t) {
  var n = {
      label: 0,
      sent: function () {
        if (a[0] & 1) throw a[1];
        return a[1];
      },
      trys: [],
      ops: [],
    },
    r,
    i,
    a,
    o = Object.create((typeof Iterator == `function` ? Iterator : Object).prototype);
  return (
    (o.next = s(0)),
    (o.throw = s(1)),
    (o.return = s(2)),
    typeof Symbol == `function` &&
      (o[Symbol.iterator] = function () {
        return this;
      }),
    o
  );
  function s(e) {
    return function (t) {
      return c([e, t]);
    };
  }
  function c(s) {
    if (r) throw TypeError(`Generator is already executing.`);
    for (; o && ((o = 0), s[0] && (n = 0)), n; )
      try {
        if (
          ((r = 1),
          i &&
            (a =
              s[0] & 2 ? i.return : s[0] ? i.throw || ((a = i.return) && a.call(i), 0) : i.next) &&
            !(a = a.call(i, s[1])).done)
        )
          return a;
        switch (((i = 0), a && (s = [s[0] & 2, a.value]), s[0])) {
          case 0:
          case 1:
            a = s;
            break;
          case 4:
            return (n.label++, { value: s[1], done: !1 });
          case 5:
            (n.label++, (i = s[1]), (s = [0]));
            continue;
          case 7:
            ((s = n.ops.pop()), n.trys.pop());
            continue;
          default:
            if (
              ((a = n.trys), !(a = a.length > 0 && a[a.length - 1])) &&
              (s[0] === 6 || s[0] === 2)
            ) {
              n = 0;
              continue;
            }
            if (s[0] === 3 && (!a || (s[1] > a[0] && s[1] < a[3]))) {
              n.label = s[1];
              break;
            }
            if (s[0] === 6 && n.label < a[1]) {
              ((n.label = a[1]), (a = s));
              break;
            }
            if (a && n.label < a[2]) {
              ((n.label = a[2]), n.ops.push(s));
              break;
            }
            (a[2] && n.ops.pop(), n.trys.pop());
            continue;
        }
        s = t.call(e, n);
      } catch (e) {
        ((s = [6, e]), (i = 0));
      } finally {
        r = a = 0;
      }
    if (s[0] & 5) throw s[1];
    return { value: s[0] ? s[1] : void 0, done: !0 };
  }
}
function Po(e) {
  var t = typeof Symbol == `function` && Symbol.iterator,
    n = t && e[t],
    r = 0;
  if (n) return n.call(e);
  if (e && typeof e.length == `number`)
    return {
      next: function () {
        return (e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e });
      },
    };
  throw TypeError(t ? `Object is not iterable.` : `Symbol.iterator is not defined.`);
}
function Fo(e, t) {
  var n = typeof Symbol == `function` && e[Symbol.iterator];
  if (!n) return e;
  var r = n.call(e),
    i,
    a = [],
    o;
  try {
    for (; (t === void 0 || t-- > 0) && !(i = r.next()).done; ) a.push(i.value);
  } catch (e) {
    o = { error: e };
  } finally {
    try {
      i && !i.done && (n = r.return) && n.call(r);
    } finally {
      if (o) throw o.error;
    }
  }
  return a;
}
function Io(e, t, n) {
  if (n || arguments.length === 2)
    for (var r = 0, i = t.length, a; r < i; r++)
      (a || !(r in t)) && ((a ||= Array.prototype.slice.call(t, 0, r)), (a[r] = t[r]));
  return e.concat(a || Array.prototype.slice.call(t));
}
function Lo(e) {
  return this instanceof Lo ? ((this.v = e), this) : new Lo(e);
}
function Ro(e, t, n) {
  if (!Symbol.asyncIterator) throw TypeError(`Symbol.asyncIterator is not defined.`);
  var r = n.apply(e, t || []),
    i,
    a = [];
  return (
    (i = Object.create((typeof AsyncIterator == `function` ? AsyncIterator : Object).prototype)),
    s(`next`),
    s(`throw`),
    s(`return`, o),
    (i[Symbol.asyncIterator] = function () {
      return this;
    }),
    i
  );
  function o(e) {
    return function (t) {
      return Promise.resolve(t).then(e, d);
    };
  }
  function s(e, t) {
    r[e] &&
      ((i[e] = function (t) {
        return new Promise(function (n, r) {
          a.push([e, t, n, r]) > 1 || c(e, t);
        });
      }),
      t && (i[e] = t(i[e])));
  }
  function c(e, t) {
    try {
      l(r[e](t));
    } catch (e) {
      f(a[0][3], e);
    }
  }
  function l(e) {
    e.value instanceof Lo ? Promise.resolve(e.value.v).then(u, d) : f(a[0][2], e);
  }
  function u(e) {
    c(`next`, e);
  }
  function d(e) {
    c(`throw`, e);
  }
  function f(e, t) {
    (e(t), a.shift(), a.length && c(a[0][0], a[0][1]));
  }
}
function zo(e) {
  if (!Symbol.asyncIterator) throw TypeError(`Symbol.asyncIterator is not defined.`);
  var t = e[Symbol.asyncIterator],
    n;
  return t
    ? t.call(e)
    : ((e = typeof Po == `function` ? Po(e) : e[Symbol.iterator]()),
      (n = {}),
      r(`next`),
      r(`throw`),
      r(`return`),
      (n[Symbol.asyncIterator] = function () {
        return this;
      }),
      n);
  function r(t) {
    n[t] =
      e[t] &&
      function (n) {
        return new Promise(function (r, a) {
          ((n = e[t](n)), i(r, a, n.done, n.value));
        });
      };
  }
  function i(e, t, n, r) {
    Promise.resolve(r).then(function (t) {
      e({ value: t, done: n });
    }, t);
  }
}
function Bo(e) {
  return typeof e == `function`;
}
function Vo(e) {
  var t = e(function (e) {
    (Error.call(e), (e.stack = Error().stack));
  });
  return ((t.prototype = Object.create(Error.prototype)), (t.prototype.constructor = t), t);
}
var Ho = Vo(function (e) {
  return function (t) {
    (e(this),
      (this.message = t
        ? t.length +
          ` errors occurred during unsubscription:
` +
          t.map(function (e, t) {
            return t + 1 + `) ` + e.toString();
          }).join(`
  `)
        : ``),
      (this.name = `UnsubscriptionError`),
      (this.errors = t));
  };
});
function Uo(e, t) {
  if (e) {
    var n = e.indexOf(t);
    0 <= n && e.splice(n, 1);
  }
}
var Wo = (function () {
    function e(e) {
      ((this.initialTeardown = e),
        (this.closed = !1),
        (this._parentage = null),
        (this._finalizers = null));
    }
    return (
      (e.prototype.unsubscribe = function () {
        var e, t, n, r, i;
        if (!this.closed) {
          this.closed = !0;
          var a = this._parentage;
          if (a)
            if (((this._parentage = null), Array.isArray(a)))
              try {
                for (var o = Po(a), s = o.next(); !s.done; s = o.next()) s.value.remove(this);
              } catch (t) {
                e = { error: t };
              } finally {
                try {
                  s && !s.done && (t = o.return) && t.call(o);
                } finally {
                  if (e) throw e.error;
                }
              }
            else a.remove(this);
          var c = this.initialTeardown;
          if (Bo(c))
            try {
              c();
            } catch (e) {
              i = e instanceof Ho ? e.errors : [e];
            }
          var l = this._finalizers;
          if (l) {
            this._finalizers = null;
            try {
              for (var u = Po(l), d = u.next(); !d.done; d = u.next()) {
                var f = d.value;
                try {
                  qo(f);
                } catch (e) {
                  ((i ??= []), e instanceof Ho ? (i = Io(Io([], Fo(i)), Fo(e.errors))) : i.push(e));
                }
              }
            } catch (e) {
              n = { error: e };
            } finally {
              try {
                d && !d.done && (r = u.return) && r.call(u);
              } finally {
                if (n) throw n.error;
              }
            }
          }
          if (i) throw new Ho(i);
        }
      }),
      (e.prototype.add = function (t) {
        if (t && t !== this)
          if (this.closed) qo(t);
          else {
            if (t instanceof e) {
              if (t.closed || t._hasParent(this)) return;
              t._addParent(this);
            }
            (this._finalizers = this._finalizers ?? []).push(t);
          }
      }),
      (e.prototype._hasParent = function (e) {
        var t = this._parentage;
        return t === e || (Array.isArray(t) && t.includes(e));
      }),
      (e.prototype._addParent = function (e) {
        var t = this._parentage;
        this._parentage = Array.isArray(t) ? (t.push(e), t) : t ? [t, e] : e;
      }),
      (e.prototype._removeParent = function (e) {
        var t = this._parentage;
        t === e ? (this._parentage = null) : Array.isArray(t) && Uo(t, e);
      }),
      (e.prototype.remove = function (t) {
        var n = this._finalizers;
        (n && Uo(n, t), t instanceof e && t._removeParent(this));
      }),
      (e.EMPTY = (function () {
        var t = new e();
        return ((t.closed = !0), t);
      })()),
      e
    );
  })(),
  Go = Wo.EMPTY;
function Ko(e) {
  return e instanceof Wo || (e && `closed` in e && Bo(e.remove) && Bo(e.add) && Bo(e.unsubscribe));
}
function qo(e) {
  Bo(e) ? e() : e.unsubscribe();
}
var Jo = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: void 0,
    useDeprecatedSynchronousErrorHandling: !1,
    useDeprecatedNextContext: !1,
  },
  Yo = {
    setTimeout: function (e, t) {
      var n = [...arguments].slice(2),
        r = Yo.delegate;
      return r?.setTimeout
        ? r.setTimeout.apply(r, Io([e, t], Fo(n)))
        : setTimeout.apply(void 0, Io([e, t], Fo(n)));
    },
    clearTimeout: function (e) {
      return (Yo.delegate?.clearTimeout || clearTimeout)(e);
    },
    delegate: void 0,
  };
function Xo(e) {
  Yo.setTimeout(function () {
    var t = Jo.onUnhandledError;
    if (t) t(e);
    else throw e;
  });
}
function Zo() {}
var Qo = (function () {
  return ts(`C`, void 0, void 0);
})();
function $o(e) {
  return ts(`E`, void 0, e);
}
function es(e) {
  return ts(`N`, e, void 0);
}
function ts(e, t, n) {
  return { kind: e, value: t, error: n };
}
var ns = null;
function rs(e) {
  if (Jo.useDeprecatedSynchronousErrorHandling) {
    var t = !ns;
    if ((t && (ns = { errorThrown: !1, error: null }), e(), t)) {
      var n = ns,
        r = n.errorThrown,
        i = n.error;
      if (((ns = null), r)) throw i;
    }
  } else e();
}
function is(e) {
  Jo.useDeprecatedSynchronousErrorHandling && ns && ((ns.errorThrown = !0), (ns.error = e));
}
var as = (function (e) {
    jo(t, e);
    function t(t) {
      var n = e.call(this) || this;
      return (
        (n.isStopped = !1),
        t ? ((n.destination = t), Ko(t) && t.add(n)) : (n.destination = ps),
        n
      );
    }
    return (
      (t.create = function (e, t, n) {
        return new ls(e, t, n);
      }),
      (t.prototype.next = function (e) {
        this.isStopped ? fs(es(e), this) : this._next(e);
      }),
      (t.prototype.error = function (e) {
        this.isStopped ? fs($o(e), this) : ((this.isStopped = !0), this._error(e));
      }),
      (t.prototype.complete = function () {
        this.isStopped ? fs(Qo, this) : ((this.isStopped = !0), this._complete());
      }),
      (t.prototype.unsubscribe = function () {
        this.closed ||
          ((this.isStopped = !0), e.prototype.unsubscribe.call(this), (this.destination = null));
      }),
      (t.prototype._next = function (e) {
        this.destination.next(e);
      }),
      (t.prototype._error = function (e) {
        try {
          this.destination.error(e);
        } finally {
          this.unsubscribe();
        }
      }),
      (t.prototype._complete = function () {
        try {
          this.destination.complete();
        } finally {
          this.unsubscribe();
        }
      }),
      t
    );
  })(Wo),
  os = Function.prototype.bind;
function ss(e, t) {
  return os.call(e, t);
}
var cs = (function () {
    function e(e) {
      this.partialObserver = e;
    }
    return (
      (e.prototype.next = function (e) {
        var t = this.partialObserver;
        if (t.next)
          try {
            t.next(e);
          } catch (e) {
            us(e);
          }
      }),
      (e.prototype.error = function (e) {
        var t = this.partialObserver;
        if (t.error)
          try {
            t.error(e);
          } catch (e) {
            us(e);
          }
        else us(e);
      }),
      (e.prototype.complete = function () {
        var e = this.partialObserver;
        if (e.complete)
          try {
            e.complete();
          } catch (e) {
            us(e);
          }
      }),
      e
    );
  })(),
  ls = (function (e) {
    jo(t, e);
    function t(t, n, r) {
      var i = e.call(this) || this,
        a;
      if (Bo(t) || !t) a = { next: t ?? void 0, error: n ?? void 0, complete: r ?? void 0 };
      else {
        var o;
        i && Jo.useDeprecatedNextContext
          ? ((o = Object.create(t)),
            (o.unsubscribe = function () {
              return i.unsubscribe();
            }),
            (a = {
              next: t.next && ss(t.next, o),
              error: t.error && ss(t.error, o),
              complete: t.complete && ss(t.complete, o),
            }))
          : (a = t);
      }
      return ((i.destination = new cs(a)), i);
    }
    return t;
  })(as);
function us(e) {
  Jo.useDeprecatedSynchronousErrorHandling ? is(e) : Xo(e);
}
function ds(e) {
  throw e;
}
function fs(e, t) {
  var n = Jo.onStoppedNotification;
  n &&
    Yo.setTimeout(function () {
      return n(e, t);
    });
}
var ps = { closed: !0, next: Zo, error: ds, complete: Zo },
  ms = (function () {
    return (typeof Symbol == `function` && Symbol.observable) || `@@observable`;
  })();
function hs(e) {
  return e;
}
function gs() {
  return _s([...arguments]);
}
function _s(e) {
  return e.length === 0
    ? hs
    : e.length === 1
      ? e[0]
      : function (t) {
          return e.reduce(function (e, t) {
            return t(e);
          }, t);
        };
}
var vs = (function () {
  function e(e) {
    e && (this._subscribe = e);
  }
  return (
    (e.prototype.lift = function (t) {
      var n = new e();
      return ((n.source = this), (n.operator = t), n);
    }),
    (e.prototype.subscribe = function (e, t, n) {
      var r = this,
        i = xs(e) ? e : new ls(e, t, n);
      return (
        rs(function () {
          var e = r,
            t = e.operator,
            n = e.source;
          i.add(t ? t.call(i, n) : n ? r._subscribe(i) : r._trySubscribe(i));
        }),
        i
      );
    }),
    (e.prototype._trySubscribe = function (e) {
      try {
        return this._subscribe(e);
      } catch (t) {
        e.error(t);
      }
    }),
    (e.prototype.forEach = function (e, t) {
      var n = this;
      return (
        (t = ys(t)),
        new t(function (t, r) {
          var i = new ls({
            next: function (t) {
              try {
                e(t);
              } catch (e) {
                (r(e), i.unsubscribe());
              }
            },
            error: r,
            complete: t,
          });
          n.subscribe(i);
        })
      );
    }),
    (e.prototype._subscribe = function (e) {
      return this.source?.subscribe(e);
    }),
    (e.prototype[ms] = function () {
      return this;
    }),
    (e.prototype.pipe = function () {
      return _s([...arguments])(this);
    }),
    (e.prototype.toPromise = function (e) {
      var t = this;
      return (
        (e = ys(e)),
        new e(function (e, n) {
          var r;
          t.subscribe(
            function (e) {
              return (r = e);
            },
            function (e) {
              return n(e);
            },
            function () {
              return e(r);
            }
          );
        })
      );
    }),
    (e.create = function (t) {
      return new e(t);
    }),
    e
  );
})();
function ys(e) {
  return e ?? Jo.Promise ?? Promise;
}
function bs(e) {
  return e && Bo(e.next) && Bo(e.error) && Bo(e.complete);
}
function xs(e) {
  return (e && e instanceof as) || (bs(e) && Ko(e));
}
function Ss(e) {
  return Bo(e?.lift);
}
function Cs(e) {
  return function (t) {
    if (Ss(t))
      return t.lift(function (t) {
        try {
          return e(t, this);
        } catch (e) {
          this.error(e);
        }
      });
    throw TypeError(`Unable to lift unknown Observable type`);
  };
}
function ws(e, t, n, r, i) {
  return new Ts(e, t, n, r, i);
}
var Ts = (function (e) {
    jo(t, e);
    function t(t, n, r, i, a, o) {
      var s = e.call(this, t) || this;
      return (
        (s.onFinalize = a),
        (s.shouldUnsubscribe = o),
        (s._next = n
          ? function (e) {
              try {
                n(e);
              } catch (e) {
                t.error(e);
              }
            }
          : e.prototype._next),
        (s._error = i
          ? function (e) {
              try {
                i(e);
              } catch (e) {
                t.error(e);
              } finally {
                this.unsubscribe();
              }
            }
          : e.prototype._error),
        (s._complete = r
          ? function () {
              try {
                r();
              } catch (e) {
                t.error(e);
              } finally {
                this.unsubscribe();
              }
            }
          : e.prototype._complete),
        s
      );
    }
    return (
      (t.prototype.unsubscribe = function () {
        var t;
        if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
          var n = this.closed;
          (e.prototype.unsubscribe.call(this),
            !n && ((t = this.onFinalize) == null || t.call(this)));
        }
      }),
      t
    );
  })(as),
  Es = Vo(function (e) {
    return function () {
      (e(this), (this.name = `ObjectUnsubscribedError`), (this.message = `object unsubscribed`));
    };
  }),
  Ds = (function (e) {
    jo(t, e);
    function t() {
      var t = e.call(this) || this;
      return (
        (t.closed = !1),
        (t.currentObservers = null),
        (t.observers = []),
        (t.isStopped = !1),
        (t.hasError = !1),
        (t.thrownError = null),
        t
      );
    }
    return (
      (t.prototype.lift = function (e) {
        var t = new Os(this, this);
        return ((t.operator = e), t);
      }),
      (t.prototype._throwIfClosed = function () {
        if (this.closed) throw new Es();
      }),
      (t.prototype.next = function (e) {
        var t = this;
        rs(function () {
          var n, r;
          if ((t._throwIfClosed(), !t.isStopped)) {
            t.currentObservers ||= Array.from(t.observers);
            try {
              for (var i = Po(t.currentObservers), a = i.next(); !a.done; a = i.next())
                a.value.next(e);
            } catch (e) {
              n = { error: e };
            } finally {
              try {
                a && !a.done && (r = i.return) && r.call(i);
              } finally {
                if (n) throw n.error;
              }
            }
          }
        });
      }),
      (t.prototype.error = function (e) {
        var t = this;
        rs(function () {
          if ((t._throwIfClosed(), !t.isStopped)) {
            ((t.hasError = t.isStopped = !0), (t.thrownError = e));
            for (var n = t.observers; n.length; ) n.shift().error(e);
          }
        });
      }),
      (t.prototype.complete = function () {
        var e = this;
        rs(function () {
          if ((e._throwIfClosed(), !e.isStopped)) {
            e.isStopped = !0;
            for (var t = e.observers; t.length; ) t.shift().complete();
          }
        });
      }),
      (t.prototype.unsubscribe = function () {
        ((this.isStopped = this.closed = !0), (this.observers = this.currentObservers = null));
      }),
      Object.defineProperty(t.prototype, 'observed', {
        get: function () {
          return this.observers?.length > 0;
        },
        enumerable: !1,
        configurable: !0,
      }),
      (t.prototype._trySubscribe = function (t) {
        return (this._throwIfClosed(), e.prototype._trySubscribe.call(this, t));
      }),
      (t.prototype._subscribe = function (e) {
        return (this._throwIfClosed(), this._checkFinalizedStatuses(e), this._innerSubscribe(e));
      }),
      (t.prototype._innerSubscribe = function (e) {
        var t = this,
          n = this,
          r = n.hasError,
          i = n.isStopped,
          a = n.observers;
        return r || i
          ? Go
          : ((this.currentObservers = null),
            a.push(e),
            new Wo(function () {
              ((t.currentObservers = null), Uo(a, e));
            }));
      }),
      (t.prototype._checkFinalizedStatuses = function (e) {
        var t = this,
          n = t.hasError,
          r = t.thrownError,
          i = t.isStopped;
        n ? e.error(r) : i && e.complete();
      }),
      (t.prototype.asObservable = function () {
        var e = new vs();
        return ((e.source = this), e);
      }),
      (t.create = function (e, t) {
        return new Os(e, t);
      }),
      t
    );
  })(vs),
  Os = (function (e) {
    jo(t, e);
    function t(t, n) {
      var r = e.call(this) || this;
      return ((r.destination = t), (r.source = n), r);
    }
    return (
      (t.prototype.next = function (e) {
        var t, n;
        (n = (t = this.destination)?.next) == null || n.call(t, e);
      }),
      (t.prototype.error = function (e) {
        var t, n;
        (n = (t = this.destination)?.error) == null || n.call(t, e);
      }),
      (t.prototype.complete = function () {
        var e, t;
        (t = (e = this.destination)?.complete) == null || t.call(e);
      }),
      (t.prototype._subscribe = function (e) {
        return this.source?.subscribe(e) ?? Go;
      }),
      t
    );
  })(Ds),
  ks = {
    now: function () {
      return (ks.delegate || Date).now();
    },
    delegate: void 0,
  },
  As = (function (e) {
    jo(t, e);
    function t(t, n, r) {
      (t === void 0 && (t = 1 / 0), n === void 0 && (n = 1 / 0), r === void 0 && (r = ks));
      var i = e.call(this) || this;
      return (
        (i._bufferSize = t),
        (i._windowTime = n),
        (i._timestampProvider = r),
        (i._buffer = []),
        (i._infiniteTimeWindow = !0),
        (i._infiniteTimeWindow = n === 1 / 0),
        (i._bufferSize = Math.max(1, t)),
        (i._windowTime = Math.max(1, n)),
        i
      );
    }
    return (
      (t.prototype.next = function (t) {
        var n = this,
          r = n.isStopped,
          i = n._buffer,
          a = n._infiniteTimeWindow,
          o = n._timestampProvider,
          s = n._windowTime;
        (r || (i.push(t), !a && i.push(o.now() + s)),
          this._trimBuffer(),
          e.prototype.next.call(this, t));
      }),
      (t.prototype._subscribe = function (e) {
        (this._throwIfClosed(), this._trimBuffer());
        for (
          var t = this._innerSubscribe(e),
            n = this,
            r = n._infiniteTimeWindow,
            i = n._buffer.slice(),
            a = 0;
          a < i.length && !e.closed;
          a += r ? 1 : 2
        )
          e.next(i[a]);
        return (this._checkFinalizedStatuses(e), t);
      }),
      (t.prototype._trimBuffer = function () {
        var e = this,
          t = e._bufferSize,
          n = e._timestampProvider,
          r = e._buffer,
          i = e._infiniteTimeWindow,
          a = (i ? 1 : 2) * t;
        if ((t < 1 / 0 && a < r.length && r.splice(0, r.length - a), !i)) {
          for (var o = n.now(), s = 0, c = 1; c < r.length && r[c] <= o; c += 2) s = c;
          s && r.splice(0, s + 1);
        }
      }),
      t
    );
  })(Ds),
  js = (function (e) {
    jo(t, e);
    function t(t, n) {
      return e.call(this) || this;
    }
    return (
      (t.prototype.schedule = function (e, t) {
        return (t === void 0 && (t = 0), this);
      }),
      t
    );
  })(Wo),
  Ms = {
    setInterval: function (e, t) {
      var n = [...arguments].slice(2),
        r = Ms.delegate;
      return r?.setInterval
        ? r.setInterval.apply(r, Io([e, t], Fo(n)))
        : setInterval.apply(void 0, Io([e, t], Fo(n)));
    },
    clearInterval: function (e) {
      return (Ms.delegate?.clearInterval || clearInterval)(e);
    },
    delegate: void 0,
  },
  Ns = (function (e) {
    jo(t, e);
    function t(t, n) {
      var r = e.call(this, t, n) || this;
      return ((r.scheduler = t), (r.work = n), (r.pending = !1), r);
    }
    return (
      (t.prototype.schedule = function (e, t) {
        if ((t === void 0 && (t = 0), this.closed)) return this;
        this.state = e;
        var n = this.id,
          r = this.scheduler;
        return (
          n != null && (this.id = this.recycleAsyncId(r, n, t)),
          (this.pending = !0),
          (this.delay = t),
          (this.id = this.id ?? this.requestAsyncId(r, this.id, t)),
          this
        );
      }),
      (t.prototype.requestAsyncId = function (e, t, n) {
        return (n === void 0 && (n = 0), Ms.setInterval(e.flush.bind(e, this), n));
      }),
      (t.prototype.recycleAsyncId = function (e, t, n) {
        if ((n === void 0 && (n = 0), n != null && this.delay === n && this.pending === !1))
          return t;
        t != null && Ms.clearInterval(t);
      }),
      (t.prototype.execute = function (e, t) {
        if (this.closed) return Error(`executing a cancelled action`);
        this.pending = !1;
        var n = this._execute(e, t);
        if (n) return n;
        this.pending === !1 &&
          this.id != null &&
          (this.id = this.recycleAsyncId(this.scheduler, this.id, null));
      }),
      (t.prototype._execute = function (e, t) {
        var n = !1,
          r;
        try {
          this.work(e);
        } catch (e) {
          ((n = !0), (r = e || Error(`Scheduled action threw falsy error`)));
        }
        if (n) return (this.unsubscribe(), r);
      }),
      (t.prototype.unsubscribe = function () {
        if (!this.closed) {
          var t = this,
            n = t.id,
            r = t.scheduler,
            i = r.actions;
          ((this.work = this.state = this.scheduler = null),
            (this.pending = !1),
            Uo(i, this),
            n != null && (this.id = this.recycleAsyncId(r, n, null)),
            (this.delay = null),
            e.prototype.unsubscribe.call(this));
        }
      }),
      t
    );
  })(js),
  Ps = (function () {
    function e(t, n) {
      (n === void 0 && (n = e.now), (this.schedulerActionCtor = t), (this.now = n));
    }
    return (
      (e.prototype.schedule = function (e, t, n) {
        return (t === void 0 && (t = 0), new this.schedulerActionCtor(this, e).schedule(n, t));
      }),
      (e.now = ks.now),
      e
    );
  })(),
  Fs = new ((function (e) {
    jo(t, e);
    function t(t, n) {
      n === void 0 && (n = Ps.now);
      var r = e.call(this, t, n) || this;
      return ((r.actions = []), (r._active = !1), r);
    }
    return (
      (t.prototype.flush = function (e) {
        var t = this.actions;
        if (this._active) {
          t.push(e);
          return;
        }
        var n;
        this._active = !0;
        do if ((n = e.execute(e.state, e.delay))) break;
        while ((e = t.shift()));
        if (((this._active = !1), n)) {
          for (; (e = t.shift()); ) e.unsubscribe();
          throw n;
        }
      }),
      t
    );
  })(Ps))(Ns),
  Is = new vs(function (e) {
    return e.complete();
  });
function Ls(e) {
  return e && Bo(e.schedule);
}
function Rs(e) {
  return e[e.length - 1];
}
function zs(e) {
  return Bo(Rs(e)) ? e.pop() : void 0;
}
function Bs(e) {
  return Ls(Rs(e)) ? e.pop() : void 0;
}
function Vs(e, t) {
  return typeof Rs(e) == `number` ? e.pop() : t;
}
var Hs = function (e) {
  return e && typeof e.length == `number` && typeof e != `function`;
};
function Us(e) {
  return Bo(e?.then);
}
function Ws(e) {
  return Bo(e[ms]);
}
function Gs(e) {
  return Symbol.asyncIterator && Bo(e?.[Symbol.asyncIterator]);
}
function Ks(e) {
  return TypeError(
    `You provided ` +
      (typeof e == `object` && e ? `an invalid object` : `'` + e + `'`) +
      ` where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.`
  );
}
function qs() {
  return typeof Symbol != `function` || !Symbol.iterator ? `@@iterator` : Symbol.iterator;
}
var Js = qs();
function Ys(e) {
  return Bo(e?.[Js]);
}
function Xs(e) {
  return Ro(this, arguments, function () {
    var t, n, r, i;
    return No(this, function (a) {
      switch (a.label) {
        case 0:
          ((t = e.getReader()), (a.label = 1));
        case 1:
          (a.trys.push([1, , 9, 10]), (a.label = 2));
        case 2:
          return [4, Lo(t.read())];
        case 3:
          return ((n = a.sent()), (r = n.value), (i = n.done), i ? [4, Lo(void 0)] : [3, 5]);
        case 4:
          return [2, a.sent()];
        case 5:
          return [4, Lo(r)];
        case 6:
          return [4, a.sent()];
        case 7:
          return (a.sent(), [3, 2]);
        case 8:
          return [3, 10];
        case 9:
          return (t.releaseLock(), [7]);
        case 10:
          return [2];
      }
    });
  });
}
function Zs(e) {
  return Bo(e?.getReader);
}
function Qs(e) {
  if (e instanceof vs) return e;
  if (e != null) {
    if (Ws(e)) return $s(e);
    if (Hs(e)) return ec(e);
    if (Us(e)) return tc(e);
    if (Gs(e)) return rc(e);
    if (Ys(e)) return nc(e);
    if (Zs(e)) return ic(e);
  }
  throw Ks(e);
}
function $s(e) {
  return new vs(function (t) {
    var n = e[ms]();
    if (Bo(n.subscribe)) return n.subscribe(t);
    throw TypeError(`Provided object does not correctly implement Symbol.observable`);
  });
}
function ec(e) {
  return new vs(function (t) {
    for (var n = 0; n < e.length && !t.closed; n++) t.next(e[n]);
    t.complete();
  });
}
function tc(e) {
  return new vs(function (t) {
    e.then(
      function (e) {
        t.closed || (t.next(e), t.complete());
      },
      function (e) {
        return t.error(e);
      }
    ).then(null, Xo);
  });
}
function nc(e) {
  return new vs(function (t) {
    var n, r;
    try {
      for (var i = Po(e), a = i.next(); !a.done; a = i.next()) {
        var o = a.value;
        if ((t.next(o), t.closed)) return;
      }
    } catch (e) {
      n = { error: e };
    } finally {
      try {
        a && !a.done && (r = i.return) && r.call(i);
      } finally {
        if (n) throw n.error;
      }
    }
    t.complete();
  });
}
function rc(e) {
  return new vs(function (t) {
    ac(e, t).catch(function (e) {
      return t.error(e);
    });
  });
}
function ic(e) {
  return rc(Xs(e));
}
function ac(e, t) {
  var n, r, i, a;
  return Mo(this, void 0, void 0, function () {
    var o, s;
    return No(this, function (c) {
      switch (c.label) {
        case 0:
          (c.trys.push([0, 5, 6, 11]), (n = zo(e)), (c.label = 1));
        case 1:
          return [4, n.next()];
        case 2:
          if (((r = c.sent()), r.done)) return [3, 4];
          if (((o = r.value), t.next(o), t.closed)) return [2];
          c.label = 3;
        case 3:
          return [3, 1];
        case 4:
          return [3, 11];
        case 5:
          return ((s = c.sent()), (i = { error: s }), [3, 11]);
        case 6:
          return (
            c.trys.push([6, , 9, 10]),
            r && !r.done && (a = n.return) ? [4, a.call(n)] : [3, 8]
          );
        case 7:
          (c.sent(), (c.label = 8));
        case 8:
          return [3, 10];
        case 9:
          if (i) throw i.error;
          return [7];
        case 10:
          return [7];
        case 11:
          return (t.complete(), [2]);
      }
    });
  });
}
function oc(e, t, n, r, i) {
  (r === void 0 && (r = 0), i === void 0 && (i = !1));
  var a = t.schedule(function () {
    (n(), i ? e.add(this.schedule(null, r)) : this.unsubscribe());
  }, r);
  if ((e.add(a), !i)) return a;
}
function sc(e, t) {
  return (
    t === void 0 && (t = 0),
    Cs(function (n, r) {
      n.subscribe(
        ws(
          r,
          function (n) {
            return oc(
              r,
              e,
              function () {
                return r.next(n);
              },
              t
            );
          },
          function () {
            return oc(
              r,
              e,
              function () {
                return r.complete();
              },
              t
            );
          },
          function (n) {
            return oc(
              r,
              e,
              function () {
                return r.error(n);
              },
              t
            );
          }
        )
      );
    })
  );
}
function cc(e, t) {
  return (
    t === void 0 && (t = 0),
    Cs(function (n, r) {
      r.add(
        e.schedule(function () {
          return n.subscribe(r);
        }, t)
      );
    })
  );
}
function lc(e, t) {
  return Qs(e).pipe(cc(t), sc(t));
}
function uc(e, t) {
  return Qs(e).pipe(cc(t), sc(t));
}
function dc(e, t) {
  return new vs(function (n) {
    var r = 0;
    return t.schedule(function () {
      r === e.length ? n.complete() : (n.next(e[r++]), n.closed || this.schedule());
    });
  });
}
function fc(e, t) {
  return new vs(function (n) {
    var r;
    return (
      oc(n, t, function () {
        ((r = e[Js]()),
          oc(
            n,
            t,
            function () {
              var e, t, i;
              try {
                ((e = r.next()), (t = e.value), (i = e.done));
              } catch (e) {
                n.error(e);
                return;
              }
              i ? n.complete() : n.next(t);
            },
            0,
            !0
          ));
      }),
      function () {
        return Bo(r?.return) && r.return();
      }
    );
  });
}
function pc(e, t) {
  if (!e) throw Error(`Iterable cannot be null`);
  return new vs(function (n) {
    oc(n, t, function () {
      var r = e[Symbol.asyncIterator]();
      oc(
        n,
        t,
        function () {
          r.next().then(function (e) {
            e.done ? n.complete() : n.next(e.value);
          });
        },
        0,
        !0
      );
    });
  });
}
function mc(e, t) {
  return pc(Xs(e), t);
}
function hc(e, t) {
  if (e != null) {
    if (Ws(e)) return lc(e, t);
    if (Hs(e)) return dc(e, t);
    if (Us(e)) return uc(e, t);
    if (Gs(e)) return pc(e, t);
    if (Ys(e)) return fc(e, t);
    if (Zs(e)) return mc(e, t);
  }
  throw Ks(e);
}
function gc(e, t) {
  return t ? hc(e, t) : Qs(e);
}
function _c() {
  var e = [...arguments];
  return gc(e, Bs(e));
}
var vc = Vo(function (e) {
  return function () {
    (e(this), (this.name = `EmptyError`), (this.message = `no elements in sequence`));
  };
});
function yc(e, t) {
  var n = typeof t == `object`;
  return new Promise(function (r, i) {
    var a = !1,
      o;
    e.subscribe({
      next: function (e) {
        ((o = e), (a = !0));
      },
      error: i,
      complete: function () {
        a ? r(o) : n ? r(t.defaultValue) : i(new vc());
      },
    });
  });
}
function bc(e, t) {
  var n = typeof t == `object`;
  return new Promise(function (r, i) {
    var a = new ls({
      next: function (e) {
        (r(e), a.unsubscribe());
      },
      error: i,
      complete: function () {
        n ? r(t.defaultValue) : i(new vc());
      },
    });
    e.subscribe(a);
  });
}
function xc(e) {
  return e instanceof Date && !isNaN(e);
}
function Sc(e, t) {
  return Cs(function (n, r) {
    var i = 0;
    n.subscribe(
      ws(r, function (n) {
        r.next(e.call(t, n, i++));
      })
    );
  });
}
var Cc = Array.isArray;
function wc(e, t) {
  return Cc(t) ? e.apply(void 0, Io([], Fo(t))) : e(t);
}
function Tc(e) {
  return Sc(function (t) {
    return wc(e, t);
  });
}
var Ec = Array.isArray,
  Dc = Object.getPrototypeOf,
  Oc = Object.prototype,
  kc = Object.keys;
function Ac(e) {
  if (e.length === 1) {
    var t = e[0];
    if (Ec(t)) return { args: t, keys: null };
    if (jc(t)) {
      var n = kc(t);
      return {
        args: n.map(function (e) {
          return t[e];
        }),
        keys: n,
      };
    }
  }
  return { args: e, keys: null };
}
function jc(e) {
  return e && typeof e == `object` && Dc(e) === Oc;
}
function Mc(e, t) {
  return e.reduce(function (e, n, r) {
    return ((e[n] = t[r]), e);
  }, {});
}
function Nc() {
  var e = [...arguments],
    t = Bs(e),
    n = zs(e),
    r = Ac(e),
    i = r.args,
    a = r.keys;
  if (i.length === 0) return gc([], t);
  var o = new vs(
    Pc(
      i,
      t,
      a
        ? function (e) {
            return Mc(a, e);
          }
        : hs
    )
  );
  return n ? o.pipe(Tc(n)) : o;
}
function Pc(e, t, n) {
  return (
    n === void 0 && (n = hs),
    function (r) {
      Fc(
        t,
        function () {
          for (
            var i = e.length,
              a = Array(i),
              o = i,
              s = i,
              c = function (i) {
                Fc(
                  t,
                  function () {
                    var c = gc(e[i], t),
                      l = !1;
                    c.subscribe(
                      ws(
                        r,
                        function (e) {
                          ((a[i] = e), l || ((l = !0), s--), s || r.next(n(a.slice())));
                        },
                        function () {
                          --o || r.complete();
                        }
                      )
                    );
                  },
                  r
                );
              },
              l = 0;
            l < i;
            l++
          )
            c(l);
        },
        r
      );
    }
  );
}
function Fc(e, t, n) {
  e ? oc(n, e, t) : t();
}
function Ic(e, t, n, r, i, a, o, s) {
  var c = [],
    l = 0,
    u = 0,
    d = !1,
    f = function () {
      d && !c.length && !l && t.complete();
    },
    p = function (e) {
      return l < r ? m(e) : c.push(e);
    },
    m = function (e) {
      (a && t.next(e), l++);
      var s = !1;
      Qs(n(e, u++)).subscribe(
        ws(
          t,
          function (e) {
            (i?.(e), a ? p(e) : t.next(e));
          },
          function () {
            s = !0;
          },
          void 0,
          function () {
            if (s)
              try {
                l--;
                for (
                  var e = function () {
                    var e = c.shift();
                    o
                      ? oc(t, o, function () {
                          return m(e);
                        })
                      : m(e);
                  };
                  c.length && l < r;
                )
                  e();
                f();
              } catch (e) {
                t.error(e);
              }
          }
        )
      );
    };
  return (
    e.subscribe(
      ws(t, p, function () {
        ((d = !0), f());
      })
    ),
    function () {
      s?.();
    }
  );
}
function Lc(e, t, n) {
  return (
    n === void 0 && (n = 1 / 0),
    Bo(t)
      ? Lc(function (n, r) {
          return Sc(function (e, i) {
            return t(n, e, r, i);
          })(Qs(e(n, r)));
        }, n)
      : (typeof t == `number` && (n = t),
        Cs(function (t, r) {
          return Ic(t, r, e, n);
        }))
  );
}
function Rc(e) {
  return (e === void 0 && (e = 1 / 0), Lc(hs, e));
}
function zc() {
  return Rc(1);
}
function Bc() {
  var e = [...arguments];
  return zc()(gc(e, Bs(e)));
}
function Vc(e) {
  return new vs(function (t) {
    Qs(e()).subscribe(t);
  });
}
var Hc = [`addListener`, `removeListener`],
  Uc = [`addEventListener`, `removeEventListener`],
  Wc = [`on`, `off`];
function Gc(e, t, n, r) {
  if ((Bo(n) && ((r = n), (n = void 0)), r)) return Gc(e, t, n).pipe(Tc(r));
  var i = Fo(
      Yc(e)
        ? Uc.map(function (r) {
            return function (i) {
              return e[r](t, i, n);
            };
          })
        : qc(e)
          ? Hc.map(Kc(e, t))
          : Jc(e)
            ? Wc.map(Kc(e, t))
            : [],
      2
    ),
    a = i[0],
    o = i[1];
  if (!a && Hs(e))
    return Lc(function (e) {
      return Gc(e, t, n);
    })(Qs(e));
  if (!a) throw TypeError(`Invalid event target`);
  return new vs(function (e) {
    var t = function () {
      var t = [...arguments];
      return e.next(1 < t.length ? t : t[0]);
    };
    return (
      a(t),
      function () {
        return o(t);
      }
    );
  });
}
function Kc(e, t) {
  return function (n) {
    return function (r) {
      return e[n](t, r);
    };
  };
}
function qc(e) {
  return Bo(e.addListener) && Bo(e.removeListener);
}
function Jc(e) {
  return Bo(e.on) && Bo(e.off);
}
function Yc(e) {
  return Bo(e.addEventListener) && Bo(e.removeEventListener);
}
function Xc(e, t, n) {
  (e === void 0 && (e = 0), n === void 0 && (n = Fs));
  var r = -1;
  return (
    t != null && (Ls(t) ? (n = t) : (r = t)),
    new vs(function (t) {
      var i = xc(e) ? +e - n.now() : e;
      i < 0 && (i = 0);
      var a = 0;
      return n.schedule(function () {
        t.closed || (t.next(a++), 0 <= r ? this.schedule(void 0, r) : t.complete());
      }, i);
    })
  );
}
function Zc() {
  var e = [...arguments],
    t = Bs(e),
    n = Vs(e, 1 / 0),
    r = e;
  return r.length ? (r.length === 1 ? Qs(r[0]) : Rc(n)(gc(r, t))) : Is;
}
var Qc = new vs(Zo),
  $c = Array.isArray;
function el(e) {
  return e.length === 1 && $c(e[0]) ? e[0] : e;
}
function tl(e, t) {
  return Cs(function (n, r) {
    var i = 0;
    n.subscribe(
      ws(r, function (n) {
        return e.call(t, n, i++) && r.next(n);
      })
    );
  });
}
function nl() {
  var e = [...arguments];
  return ((e = el(e)), e.length === 1 ? Qs(e[0]) : new vs(rl(e)));
}
function rl(e) {
  return function (t) {
    for (
      var n = [],
        r = function (r) {
          n.push(
            Qs(e[r]).subscribe(
              ws(t, function (e) {
                if (n) {
                  for (var i = 0; i < n.length; i++) i !== r && n[i].unsubscribe();
                  n = null;
                }
                t.next(e);
              })
            )
          );
        },
        i = 0;
      n && !t.closed && i < e.length;
      i++
    )
      r(i);
  };
}
function il(e, t) {
  return (
    t === void 0 && (t = null),
    (t ??= e),
    Cs(function (n, r) {
      var i = [],
        a = 0;
      n.subscribe(
        ws(
          r,
          function (n) {
            var o,
              s,
              c,
              l,
              u = null;
            a++ % t === 0 && i.push([]);
            try {
              for (var d = Po(i), f = d.next(); !f.done; f = d.next()) {
                var p = f.value;
                (p.push(n), e <= p.length && ((u ??= []), u.push(p)));
              }
            } catch (e) {
              o = { error: e };
            } finally {
              try {
                f && !f.done && (s = d.return) && s.call(d);
              } finally {
                if (o) throw o.error;
              }
            }
            if (u)
              try {
                for (var m = Po(u), h = m.next(); !h.done; h = m.next()) {
                  var p = h.value;
                  (Uo(i, p), r.next(p));
                }
              } catch (e) {
                c = { error: e };
              } finally {
                try {
                  h && !h.done && (l = m.return) && l.call(m);
                } finally {
                  if (c) throw c.error;
                }
              }
          },
          function () {
            var e, t;
            try {
              for (var n = Po(i), a = n.next(); !a.done; a = n.next()) {
                var o = a.value;
                r.next(o);
              }
            } catch (t) {
              e = { error: t };
            } finally {
              try {
                a && !a.done && (t = n.return) && t.call(n);
              } finally {
                if (e) throw e.error;
              }
            }
            r.complete();
          },
          void 0,
          function () {
            i = null;
          }
        )
      );
    })
  );
}
function al(e) {
  return Cs(function (t, n) {
    var r = null,
      i = !1,
      a;
    ((r = t.subscribe(
      ws(n, void 0, void 0, function (o) {
        ((a = Qs(e(o, al(e)(t)))), r ? (r.unsubscribe(), (r = null), a.subscribe(n)) : (i = !0));
      })
    )),
      i && (r.unsubscribe(), (r = null), a.subscribe(n)));
  });
}
function ol(e, t) {
  return Bo(t) ? Lc(e, t, 1) : Lc(e, 1);
}
function sl(e) {
  return Cs(function (t, n) {
    var r = !1;
    t.subscribe(
      ws(
        n,
        function (e) {
          ((r = !0), n.next(e));
        },
        function () {
          (r || n.next(e), n.complete());
        }
      )
    );
  });
}
function cl(e) {
  return e <= 0
    ? function () {
        return Is;
      }
    : Cs(function (t, n) {
        var r = 0;
        t.subscribe(
          ws(n, function (t) {
            ++r <= e && (n.next(t), e <= r && n.complete());
          })
        );
      });
}
function ll() {
  return Cs(function (e, t) {
    e.subscribe(ws(t, Zo));
  });
}
function ul(e) {
  return Sc(function () {
    return e;
  });
}
function dl(e, t) {
  return t
    ? function (n) {
        return Bc(t.pipe(cl(1), ll()), n.pipe(dl(e)));
      }
    : Lc(function (t, n) {
        return Qs(e(t, n)).pipe(cl(1), ul(t));
      });
}
function fl(e, t) {
  return (
    t === void 0 && (t = hs),
    (e ??= pl),
    Cs(function (n, r) {
      var i,
        a = !0;
      n.subscribe(
        ws(r, function (n) {
          var o = t(n);
          (a || !e(i, o)) && ((a = !1), (i = o), r.next(n));
        })
      );
    })
  );
}
function pl(e, t) {
  return e === t;
}
function ml(e) {
  return (
    e === void 0 && (e = hl),
    Cs(function (t, n) {
      var r = !1;
      t.subscribe(
        ws(
          n,
          function (e) {
            ((r = !0), n.next(e));
          },
          function () {
            return r ? n.complete() : n.error(e());
          }
        )
      );
    })
  );
}
function hl() {
  return new vc();
}
function gl(e, t) {
  var n = arguments.length >= 2;
  return function (r) {
    return r.pipe(
      e
        ? tl(function (t, n) {
            return e(t, n, r);
          })
        : hs,
      cl(1),
      n
        ? sl(t)
        : ml(function () {
            return new vc();
          })
    );
  };
}
function _l(e, t, n) {
  return (
    n === void 0 && (n = 1 / 0),
    Cs(function (r, i) {
      var a = t;
      return Ic(
        r,
        i,
        function (t, n) {
          return e(a, t, n);
        },
        n,
        function (e) {
          a = e;
        },
        !1,
        void 0,
        function () {
          return (a = null);
        }
      );
    })
  );
}
function vl() {
  var e = [...arguments];
  return e.length
    ? Cs(function (t, n) {
        rl(Io([t], Fo(e)))(n);
      })
    : hs;
}
function yl(e) {
  e === void 0 && (e = 1 / 0);
  var t = e && typeof e == `object` ? e : { count: e },
    n = t.count,
    r = n === void 0 ? 1 / 0 : n,
    i = t.delay,
    a = t.resetOnSuccess,
    o = a === void 0 ? !1 : a;
  return r <= 0
    ? hs
    : Cs(function (e, t) {
        var n = 0,
          a,
          s = function () {
            var c = !1;
            ((a = e.subscribe(
              ws(
                t,
                function (e) {
                  (o && (n = 0), t.next(e));
                },
                void 0,
                function (e) {
                  if (n++ < r) {
                    var o = function () {
                      a ? (a.unsubscribe(), (a = null), s()) : (c = !0);
                    };
                    if (i != null) {
                      var l = typeof i == `number` ? Xc(i) : Qs(i(e, n)),
                        u = ws(
                          t,
                          function () {
                            (u.unsubscribe(), o());
                          },
                          function () {
                            t.complete();
                          }
                        );
                      l.subscribe(u);
                    } else o();
                  } else t.error(e);
                }
              )
            )),
              c && (a.unsubscribe(), (a = null), s()));
          };
        s();
      });
}
function bl() {
  var e = [...arguments],
    t = Bs(e);
  return Cs(function (n, r) {
    (t ? Bc(e, n, t) : Bc(e, n)).subscribe(r);
  });
}
function xl(e, t) {
  return Cs(function (n, r) {
    var i = null,
      a = 0,
      o = !1,
      s = function () {
        return o && !i && r.complete();
      };
    n.subscribe(
      ws(
        r,
        function (n) {
          i?.unsubscribe();
          var o = 0,
            c = a++;
          Qs(e(n, c)).subscribe(
            (i = ws(
              r,
              function (e) {
                return r.next(t ? t(n, e, c, o++) : e);
              },
              function () {
                ((i = null), s());
              }
            ))
          );
        },
        function () {
          ((o = !0), s());
        }
      )
    );
  });
}
function Sl(e) {
  return Cs(function (t, n) {
    (Qs(e).subscribe(
      ws(
        n,
        function () {
          return n.complete();
        },
        Zo
      )
    ),
      !n.closed && t.subscribe(n));
  });
}
function Cl(e, t, n) {
  var r = Bo(e) || t || n ? { next: e, error: t, complete: n } : e;
  return r
    ? Cs(function (e, t) {
        var n;
        (n = r.subscribe) == null || n.call(r);
        var i = !0;
        e.subscribe(
          ws(
            t,
            function (e) {
              var n;
              ((n = r.next) == null || n.call(r, e), t.next(e));
            },
            function () {
              var e;
              ((i = !1), (e = r.complete) == null || e.call(r), t.complete());
            },
            function (e) {
              var n;
              ((i = !1), (n = r.error) == null || n.call(r, e), t.error(e));
            },
            function () {
              var e, t;
              (i && ((e = r.unsubscribe) == null || e.call(r)),
                (t = r.finalize) == null || t.call(r));
            }
          )
        );
      })
    : hs;
}
function wl(e) {
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
((Symbol.dispose ??= Symbol(`dispose`)), (Symbol.asyncDispose ??= Symbol(`asyncDispose`)));
var Tl = Symbol.dispose,
  El = Symbol.asyncDispose,
  Dl = class e {
    #e = !1;
    #t = [];
    get disposed() {
      return this.#e;
    }
    dispose() {
      this[Tl]();
    }
    use(e) {
      return (e && typeof e[Tl] == `function` && this.#t.push(e), e);
    }
    adopt(e, t) {
      return (
        this.#t.push({
          [Tl]() {
            t(e);
          },
        }),
        e
      );
    }
    defer(e) {
      this.#t.push({
        [Tl]() {
          e();
        },
      });
    }
    move() {
      if (this.#e) throw ReferenceError(`A disposed stack can not use anything new`);
      let t = new e();
      return ((t.#t = this.#t), (this.#t = []), (this.#e = !0), t);
    }
    [Tl]() {
      if (this.#e) return;
      this.#e = !0;
      let e = [];
      for (let t of this.#t.reverse())
        try {
          t[Tl]();
        } catch (t) {
          e.push(t);
        }
      if (e.length === 1) throw e[0];
      if (e.length > 1) {
        let t = null;
        for (let n of e) t = t === null ? n : new jl(n, t);
        throw t;
      }
    }
    [Symbol.toStringTag] = `DisposableStack`;
  },
  Ol = globalThis.DisposableStack ?? Dl,
  kl = class e {
    #e = !1;
    #t = [];
    get disposed() {
      return this.#e;
    }
    async disposeAsync() {
      await this[El]();
    }
    use(e) {
      if (e) {
        let t = e[El],
          n = e[Tl];
        typeof t == `function`
          ? this.#t.push(e)
          : typeof n == `function` &&
            this.#t.push({
              [El]: async () => {
                e[Tl]();
              },
            });
      }
      return e;
    }
    adopt(e, t) {
      return (
        this.#t.push({
          [El]() {
            return t(e);
          },
        }),
        e
      );
    }
    defer(e) {
      this.#t.push({
        [El]() {
          return e();
        },
      });
    }
    move() {
      if (this.#e) throw ReferenceError(`A disposed stack can not use anything new`);
      let t = new e();
      return ((t.#t = this.#t), (this.#t = []), (this.#e = !0), t);
    }
    async [El]() {
      if (this.#e) return;
      this.#e = !0;
      let e = [];
      for (let t of this.#t.reverse())
        try {
          await t[El]();
        } catch (t) {
          e.push(t);
        }
      if (e.length === 1) throw e[0];
      if (e.length > 1) {
        let t = null;
        for (let n of e) t = t === null ? n : new jl(n, t);
        throw t;
      }
    }
    [Symbol.toStringTag] = `AsyncDisposableStack`;
  },
  Al = globalThis.AsyncDisposableStack ?? kl,
  jl = class extends Error {
    #e;
    #t;
    constructor(e, t, n = `An error was suppressed during disposal`) {
      (super(n), (this.name = `SuppressedError`), (this.#e = e), (this.#t = t));
    }
    get error() {
      return this.#e;
    }
    get suppressed() {
      return this.#t;
    }
  };
globalThis.SuppressedError;
var Ml = !!(typeof process < `u` && process.version),
  Nl = {
    value: {
      get fs() {
        throw Error(`fs is not available in this environment`);
      },
      get ScreenRecorder() {
        throw Error(`ScreenRecorder is not available in this environment`);
      },
    },
  },
  K = (e, t) => {
    if (!e) throw Error(t);
  };
function Pl(e, t = !1) {
  return t
    ? `fromBase64` in Uint8Array
      ? Uint8Array.fromBase64(e)
      : typeof Buffer == `function`
        ? Buffer.from(e, `base64`)
        : Uint8Array.from(atob(e), (e) => e.codePointAt(0))
    : new TextEncoder().encode(e);
}
function Fl(e) {
  return Il(new TextEncoder().encode(e));
}
function Il(e) {
  let t = 65534,
    n = [];
  for (let r = 0; r < e.length; r += t) {
    let i = e.subarray(r, r + t);
    n.push(String.fromCodePoint.apply(null, i));
  }
  let r = n.join(``);
  return btoa(r);
}
function Ll(e) {
  let t = 0;
  for (let n of e) t += n.length;
  let n = new Uint8Array(t),
    r = 0;
  for (let t of e) (n.set(t, r), (r += t.length));
  return n;
}
var Rl = `25.1.0`,
  zl = null;
async function Bl() {
  return (
    (zl ||= (
      await i(
        async () => {
          let { debuglog: e } = await import(`./__vite-browser-external-DOOah4Mz.js`).then((e) =>
            t(e.t(), 1)
          );
          return { debuglog: e };
        },
        __vite__mapDeps([0, 1])
      )
    ).debuglog),
    zl
  );
}
var Vl = (e) =>
    Ml
      ? async (...t) => {
          (Ul && Hl.push(e + t), (await Bl())(e)(...t));
        }
      : (...t) => {
          let n = globalThis.__PUPPETEER_DEBUG;
          n &&
            (n === `*` || (n.endsWith(`*`) ? e.startsWith(n) : e === n)) &&
            console.log(`${e}:`, ...t);
        },
  Hl = [],
  Ul = !1,
  Wl = class extends Error {
    constructor(e, t) {
      (super(e, t), (this.name = this.constructor.name));
    }
    get [Symbol.toStringTag]() {
      return this.constructor.name;
    }
  },
  Gl = class extends Wl {},
  Kl = class extends Wl {},
  ql = class extends Wl {
    #e;
    #t = ``;
    set code(e) {
      this.#e = e;
    }
    get code() {
      return this.#e;
    }
    set originalMessage(e) {
      this.#t = e;
    }
    get originalMessage() {
      return this.#t;
    }
  },
  Jl = class extends Wl {},
  Yl = class extends ql {},
  Xl = class extends ql {},
  Zl = {
    letter: { cm: { width: 21.59, height: 27.94 }, in: { width: 8.5, height: 11 } },
    legal: { cm: { width: 21.59, height: 35.56 }, in: { width: 8.5, height: 14 } },
    tabloid: { cm: { width: 27.94, height: 43.18 }, in: { width: 11, height: 17 } },
    ledger: { cm: { width: 43.18, height: 27.94 }, in: { width: 17, height: 11 } },
    a0: { cm: { width: 84.1, height: 118.9 }, in: { width: 33.1102, height: 46.811 } },
    a1: { cm: { width: 59.4, height: 84.1 }, in: { width: 23.3858, height: 33.1102 } },
    a2: { cm: { width: 42, height: 59.4 }, in: { width: 16.5354, height: 23.3858 } },
    a3: { cm: { width: 29.7, height: 42 }, in: { width: 11.6929, height: 16.5354 } },
    a4: { cm: { width: 21, height: 29.7 }, in: { width: 8.2677, height: 11.6929 } },
    a5: { cm: { width: 14.8, height: 21 }, in: { width: 5.8268, height: 8.2677 } },
    a6: { cm: { width: 10.5, height: 14.8 }, in: { width: 4.1339, height: 5.8268 } },
  },
  q = Vl(`puppeteer:error`),
  Ql = Object.freeze({ width: 800, height: 600 }),
  $l = Symbol(`Source URL for Puppeteer evaluation scripts`),
  eu = class e {
    static INTERNAL_URL = `pptr:internal`;
    static fromCallSite(t, n) {
      let r = new e();
      return ((r.#e = t), (r.#t = n.toString()), r);
    }
    static parse = (t) => {
      t = t.slice(5);
      let [n = ``, r = ``] = t.split(`;`),
        i = new e();
      return ((i.#e = n), (i.#t = decodeURIComponent(r)), i);
    };
    static isPuppeteerURL = (e) => e.startsWith(`pptr:`);
    #e;
    #t;
    get functionName() {
      return this.#e;
    }
    get siteString() {
      return this.#t;
    }
    toString() {
      return `pptr:${[this.#e, encodeURIComponent(this.#t)].join(`;`)}`;
    }
  },
  tu = (e, t) => {
    if (Object.prototype.hasOwnProperty.call(t, $l)) return t;
    let n = Error.prepareStackTrace;
    Error.prepareStackTrace = (e, t) => t[2];
    let r = Error().stack;
    return ((Error.prepareStackTrace = n), Object.assign(t, { [$l]: eu.fromCallSite(e, r) }));
  },
  nu = (e) => {
    if (Object.prototype.hasOwnProperty.call(e, $l)) return e[$l];
  },
  ru = (e) => typeof e == `string` || e instanceof String,
  iu = (e) => typeof e == `number` || e instanceof Number,
  au = (e) => typeof e == `object` && e?.constructor === Object,
  ou = (e) => typeof e == `object` && e?.constructor === RegExp,
  su = (e) => typeof e == `object` && e?.constructor === Date;
function cu(e, ...t) {
  if (ru(e)) return (K(t.length === 0, `Cannot evaluate a string with arguments`), e);
  function n(e) {
    return Object.is(e, void 0) ? `undefined` : JSON.stringify(e);
  }
  return `(${e})(${t.map(n).join(`,`)})`;
}
async function lu(e, t) {
  let n = [],
    r = e.getReader();
  if (t) {
    let e = await Nl.value.fs.promises.open(t, `w+`);
    try {
      for (;;) {
        let { done: t, value: i } = await r.read();
        if (t) break;
        (n.push(i), await e.writeFile(i));
      }
    } finally {
      await e.close();
    }
  } else
    for (;;) {
      let { done: e, value: t } = await r.read();
      if (e) break;
      n.push(t);
    }
  try {
    let e = Ll(n);
    return e.length === 0 ? null : e;
  } catch (e) {
    return (q(e), null);
  }
}
async function uu(e, t) {
  return new ReadableStream({
    async pull(n) {
      let { data: r, base64Encoded: i, eof: a } = await e.send(`IO.read`, { handle: t });
      (n.enqueue(Pl(r, i ?? !1)), a && (await e.send(`IO.close`, { handle: t }), n.close()));
    },
  });
}
var du = new Set([`alert`, `confirm`, `prompt`, `beforeunload`]);
function fu(e) {
  let t = null;
  return (du.has(e) && (t = e), K(t, `Unknown javascript dialog type: ${e}`), t);
}
function pu(e, t) {
  return e === 0
    ? Qc
    : Xc(e).pipe(
        Sc(() => {
          throw new Gl(`Timed out after waiting ${e}ms`, { cause: t });
        })
      );
}
var mu = `__puppeteer_utility_world__` + Rl,
  hu = /^[\x20\t]*\/\/[@#] sourceURL=\s{0,10}(\S*?)\s{0,10}$/m;
function gu(e) {
  return `//# sourceURL=${e}`;
}
function _u(e = {}, t = `in`) {
  let n = {
      scale: 1,
      displayHeaderFooter: !1,
      headerTemplate: ``,
      footerTemplate: ``,
      printBackground: !1,
      landscape: !1,
      pageRanges: ``,
      preferCSSPageSize: !1,
      omitBackground: !1,
      outline: !1,
      tagged: !0,
      waitForFonts: !0,
    },
    r = 8.5,
    i = 11;
  if (e.format) {
    let n = Zl[e.format.toLowerCase()][t];
    (K(n, `Unknown paper format: ` + e.format), (r = n.width), (i = n.height));
  } else ((r = yu(e.width, t) ?? r), (i = yu(e.height, t) ?? i));
  let a = {
    top: yu(e.margin?.top, t) || 0,
    left: yu(e.margin?.left, t) || 0,
    bottom: yu(e.margin?.bottom, t) || 0,
    right: yu(e.margin?.right, t) || 0,
  };
  return (e.outline && (e.tagged = !0), { ...n, ...e, width: r, height: i, margin: a });
}
var vu = { px: 1, in: 96, cm: 37.8, mm: 3.78 };
function yu(e, t = `in`) {
  if (e === void 0) return;
  let n;
  if (iu(e)) n = e;
  else if (ru(e)) {
    let t = e,
      r = t.substring(t.length - 2).toLowerCase(),
      i = ``;
    r in vu ? (i = t.substring(0, t.length - 2)) : ((r = `px`), (i = t));
    let a = Number(i);
    (K(!isNaN(a), `Failed to parse parameter value: ` + t), (n = a * vu[r]));
  } else throw Error(`page.pdf() Cannot handle parameter type: ` + typeof e);
  return n / vu[t];
}
function bu(e, t) {
  return new vs((n) => {
    let r = (e) => {
      n.next(e);
    };
    return (
      e.on(t, r),
      () => {
        e.off(t, r);
      }
    );
  });
}
function xu(e, t) {
  return e
    ? Gc(e, `abort`).pipe(
        Sc(() => {
          throw e.reason instanceof Error
            ? ((e.reason.cause = t), e.reason)
            : Error(e.reason, { cause: t });
        })
      )
    : Qc;
}
function Su(e) {
  return Lc((t) =>
    gc(Promise.resolve(e(t))).pipe(
      tl((e) => e),
      Sc(() => t)
    )
  );
}
var Cu = class {
    #e;
    #t = new Map();
    constructor(e = wl(new Map())) {
      this.#e = e;
    }
    on(e, t) {
      let n = this.#t.get(e);
      return (n === void 0 ? this.#t.set(e, [t]) : n.push(t), this.#e.on(e, t), this);
    }
    off(e, t) {
      let n = this.#t.get(e) ?? [];
      if (t === void 0) {
        for (let t of n) this.#e.off(e, t);
        return (this.#t.delete(e), this);
      }
      let r = n.lastIndexOf(t);
      return (r > -1 && this.#e.off(e, ...n.splice(r, 1)), this);
    }
    emit(e, t) {
      return (this.#e.emit(e, t), this.listenerCount(e) > 0);
    }
    once(e, t) {
      let n = (r) => {
        (t(r), this.off(e, n));
      };
      return this.on(e, n);
    }
    listenerCount(e) {
      return this.#t.get(e)?.length || 0;
    }
    removeAllListeners(e) {
      return e === void 0 ? (this[Tl](), this) : this.off(e);
    }
    [Tl]() {
      this[El]().catch(q);
    }
    async [El]() {
      for (let [e, t] of this.#t) for (let n of t) this.#e.off(e, n);
      this.#t.clear();
    }
  },
  wu = new Map([
    [`accelerometer`, `sensors`],
    [`ambient-light-sensor`, `sensors`],
    [`background-sync`, `backgroundSync`],
    [`camera`, `videoCapture`],
    [`clipboard-read`, `clipboardReadWrite`],
    [`clipboard-sanitized-write`, `clipboardSanitizedWrite`],
    [`clipboard-write`, `clipboardReadWrite`],
    [`geolocation`, `geolocation`],
    [`gyroscope`, `sensors`],
    [`idle-detection`, `idleDetection`],
    [`keyboard-lock`, `keyboardLock`],
    [`magnetometer`, `sensors`],
    [`microphone`, `audioCapture`],
    [`midi`, `midi`],
    [`notifications`, `notifications`],
    [`payment-handler`, `paymentHandler`],
    [`persistent-storage`, `durableStorage`],
    [`pointer-lock`, `pointerLock`],
    [`midi-sysex`, `midiSysex`],
  ]),
  Tu = class extends Cu {
    constructor() {
      super();
    }
    async waitForTarget(e, t = {}) {
      let { timeout: n = 3e4, signal: r } = t;
      return await bc(
        Zc(bu(this, `targetcreated`), bu(this, `targetchanged`), gc(this.targets())).pipe(
          Su(e),
          vl(xu(r), pu(n))
        )
      );
    }
    async pages(e = !1) {
      return (await Promise.all(this.browserContexts().map((t) => t.pages(e)))).reduce(
        (e, t) => e.concat(t),
        []
      );
    }
    async cookies() {
      return await this.defaultBrowserContext().cookies();
    }
    async setCookie(...e) {
      return await this.defaultBrowserContext().setCookie(...e);
    }
    async deleteCookie(...e) {
      return await this.defaultBrowserContext().deleteCookie(...e);
    }
    async deleteMatchingCookies(...e) {
      return await this.defaultBrowserContext().deleteMatchingCookies(...e);
    }
    async setPermission(e, ...t) {
      return await this.defaultBrowserContext().setPermission(e, ...t);
    }
    [Tl]() {
      this[El]().catch(q);
    }
    async [El]() {
      (this.process() ? await this.close() : await this.disconnect(), await super[El]());
    }
  },
  Eu = class e {
    static create(t) {
      return new e(t);
    }
    static async race(t) {
      let n = new Set();
      try {
        let r = t.map((t) => (t instanceof e ? (t.#a && n.add(t), t.valueOrThrow()) : t));
        return await Promise.race(r);
      } finally {
        for (let e of n) e.reject(Error(`Timeout cleared`));
      }
    }
    #e = !1;
    #t = !1;
    #n;
    #r;
    #i = new Promise((e) => {
      this.#r = e;
    });
    #a;
    #o;
    constructor(e) {
      e &&
        e.timeout > 0 &&
        ((this.#o = new Gl(e.message)),
        (this.#a = setTimeout(() => {
          this.reject(this.#o);
        }, e.timeout)));
    }
    #s(e) {
      (clearTimeout(this.#a), (this.#n = e), this.#r());
    }
    resolve(e) {
      this.#t || this.#e || ((this.#e = !0), this.#s(e));
    }
    reject(e) {
      this.#t || this.#e || ((this.#t = !0), this.#s(e));
    }
    resolved() {
      return this.#e;
    }
    finished() {
      return this.#e || this.#t;
    }
    value() {
      return this.#n;
    }
    #c;
    valueOrThrow() {
      return (
        (this.#c ||= (async () => {
          if ((await this.#i, this.#t)) throw this.#n;
          return this.#n;
        })()),
        this.#c
      );
    }
  },
  Du = class {
    #e;
    #t;
    constructor(e, t) {
      ((this.#e = e), (this.#t = t));
    }
    [Tl]() {
      return (this.#t?.(), this.#e.release());
    }
  },
  Ou = class e {
    static Guard = Du;
    #e = !1;
    #t = [];
    async acquire(t) {
      if (!this.#e) return ((this.#e = !0), new e.Guard(this, t));
      let n = Eu.create();
      return (this.#t.push(n.resolve.bind(n)), await n.valueOrThrow(), new e.Guard(this, t));
    }
    release() {
      let e = this.#t.shift();
      if (!e) {
        this.#e = !1;
        return;
      }
      e();
    }
  },
  ku = class extends Cu {
    constructor() {
      super();
    }
    #e;
    #t = 0;
    startScreenshot() {
      let e = this.#e || new Ou();
      return (
        (this.#e = e),
        this.#t++,
        e.acquire(() => {
          (this.#t--, this.#t === 0 && (this.#e = void 0));
        })
      );
    }
    waitForScreenshotOperations() {
      return this.#e?.acquire();
    }
    async waitForTarget(e, t = {}) {
      let { timeout: n = 3e4 } = t;
      return await bc(
        Zc(bu(this, `targetcreated`), bu(this, `targetchanged`), gc(this.targets())).pipe(
          Su(e),
          vl(pu(n))
        )
      );
    }
    async deleteCookie(...e) {
      return await this.setCookie(...e.map((e) => ({ ...e, expires: 1 })));
    }
    async deleteMatchingCookies(...e) {
      let t = (await this.cookies()).filter((t) =>
        e.some((e) => {
          if (e.name === t.name) {
            if (
              (e.domain !== void 0 && e.domain === t.domain) ||
              (e.path !== void 0 && e.path === t.path)
            )
              return !0;
            if (e.partitionKey !== void 0 && t.partitionKey !== void 0) {
              if (typeof t.partitionKey != `object`) throw Error(`Unexpected string partition key`);
              if (typeof e.partitionKey == `string`) {
                if (e.partitionKey === t.partitionKey?.sourceOrigin) return !0;
              } else if (e.partitionKey.sourceOrigin === t.partitionKey?.sourceOrigin) return !0;
            }
            if (e.url !== void 0) {
              let n = new URL(e.url);
              if (n.hostname === t.domain && n.pathname === t.path) return !0;
            }
            return !0;
          }
          return !1;
        })
      );
      await this.deleteCookie(...t);
    }
    get closed() {
      return !this.browser().browserContexts().includes(this);
    }
    get id() {}
    [Tl]() {
      this[El]().catch(q);
    }
    async [El]() {
      (await this.close(), await super[El]());
    }
  },
  Au;
(function (e) {
  ((e.Disconnected = Symbol(`CDPSession.Disconnected`)),
    (e.Swapped = Symbol(`CDPSession.Swapped`)),
    (e.Ready = Symbol(`CDPSession.Ready`)),
    (e.SessionAttached = `sessionattached`),
    (e.SessionDetached = `sessiondetached`));
})((Au ||= {}));
var ju = class extends Cu {
    constructor() {
      super();
    }
    parentSession() {}
  },
  Mu = class {
    devices = [];
  },
  Nu = class {
    #e;
    #t;
    #n;
    handled = !1;
    constructor(e, t, n = ``) {
      ((this.#e = e), (this.#t = t), (this.#n = n));
    }
    type() {
      return this.#e;
    }
    message() {
      return this.#t;
    }
    defaultValue() {
      return this.#n;
    }
    async accept(e) {
      (K(!this.handled, `Cannot accept dialog which is already handled!`),
        (this.handled = !0),
        await this.handle({ accept: !0, text: e }));
    }
    async dismiss() {
      (K(!this.handled, `Cannot dismiss dialog which is already handled!`),
        (this.handled = !0),
        await this.handle({ accept: !1 }));
    }
  },
  Pu = class {
    static async *map(e, t) {
      for await (let n of e) yield await t(n);
    }
    static async *flatMap(e, t) {
      for await (let n of e) yield* t(n);
    }
    static async collect(e) {
      let t = [];
      for await (let n of e) t.push(n);
      return t;
    }
    static async first(e) {
      for await (let t of e) return t;
    }
  },
  Fu = Symbol(`_isElementHandle`);
function Iu(e) {
  return typeof e == `object` && !!e && `name` in e && `message` in e;
}
function Lu(e, t, n) {
  return ((e.message = t), (e.originalMessage = n ?? e.originalMessage), e);
}
function Ru(e) {
  let t = e.error.message;
  return (
    e.error && typeof e.error == `object` && `data` in e.error && (t += ` ${e.error.data}`),
    t
  );
}
var zu = new Map(),
  Bu = (e) => {
    let t = zu.get(e);
    return t || ((t = Function(`return ${e}`)()), zu.set(e, t), t);
  };
function Vu(e) {
  let t = e.toString();
  if (
    t.match(/^(async )*function(\(|\s)/) ||
    t.match(/^(async )*function\s*\*\s*/) ||
    t.startsWith(`(`) ||
    t.match(/^async\s*\(/) ||
    t.match(/^(async)*\s*(?:[$_\p{ID_Start}])(?:[$\u200C\u200D\p{ID_Continue}])*\s*=>/u)
  )
    return t;
  let n = `function `;
  return (t.startsWith(`async `) && ((n = `async ${n}`), (t = t.substring(6))), `${n}${t}`);
}
var Hu = (e, t) => {
    let n = Vu(e);
    for (let [e, r] of Object.entries(t))
      n = n.replace(RegExp(`PLACEHOLDER\\(\\s*(?:'${e}'|"${e}")\\s*\\)`, `g`), `(${r})`);
    return Bu(n);
  },
  Uu = function (e, t, n) {
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
  Wu = (function (e) {
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
  Gu = 20;
async function* Ku(e, t) {
  let n = { stack: [], error: void 0, hasError: !1 };
  try {
    let r = await Uu(
        n,
        await e.evaluateHandle(async (e, t) => {
          let n = [];
          for (; n.length < t; ) {
            let t = await e.next();
            if (t.done) break;
            n.push(t.value);
          }
          return n;
        }, t),
        !1
      ).getProperties(),
      i = r.values();
    return (
      Uu(n, new Ol(), !1).defer(() => {
        for (let e of i) {
          let t = { stack: [], error: void 0, hasError: !1 };
          try {
            Uu(t, e, !1)[Tl]();
          } catch (e) {
            ((t.error = e), (t.hasError = !0));
          } finally {
            Wu(t);
          }
        }
      }),
      yield* i,
      r.size === 0
    );
  } catch (e) {
    ((n.error = e), (n.hasError = !0));
  } finally {
    Wu(n);
  }
}
async function* qu(e) {
  let t = Gu;
  for (; !(yield* Ku(e, t)); ) t <<= 1;
}
async function* Ju(e) {
  let t = { stack: [], error: void 0, hasError: !1 };
  try {
    yield* qu(
      Uu(
        t,
        await e.evaluateHandle((e) =>
          (async function* () {
            yield* e;
          })()
        ),
        !1
      )
    );
  } catch (e) {
    ((t.error = e), (t.hasError = !0));
  } finally {
    Wu(t);
  }
}
var Yu = class e {
    static create = (t) => new e(t);
    #e;
    constructor(e) {
      this.#e = e;
    }
    async get(e) {
      return await this.#e(e);
    }
  },
  Xu = function (e, t, n) {
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
  Zu = (function (e) {
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
  Qu = class {
    static querySelectorAll;
    static querySelector;
    static get _querySelector() {
      if (this.querySelector) return this.querySelector;
      if (!this.querySelectorAll) throw Error('Cannot create default `querySelector`.');
      return (this.querySelector = Hu(
        async (e, t, n) => {
          let r = PLACEHOLDER(`querySelectorAll`)(e, t, n);
          for await (let e of r) return e;
          return null;
        },
        { querySelectorAll: Vu(this.querySelectorAll) }
      ));
    }
    static get _querySelectorAll() {
      if (this.querySelectorAll) return this.querySelectorAll;
      if (!this.querySelector) throw Error('Cannot create default `querySelectorAll`.');
      return (this.querySelectorAll = Hu(
        async function* (e, t, n) {
          let r = await PLACEHOLDER(`querySelector`)(e, t, n);
          r && (yield r);
        },
        { querySelector: Vu(this.querySelector) }
      ));
    }
    static async *queryAll(e, t) {
      let n = { stack: [], error: void 0, hasError: !1 };
      try {
        yield* Ju(
          Xu(
            n,
            await e.evaluateHandle(
              this._querySelectorAll,
              t,
              Yu.create((e) => e.puppeteerUtil)
            ),
            !1
          )
        );
      } catch (e) {
        ((n.error = e), (n.hasError = !0));
      } finally {
        Zu(n);
      }
    }
    static async queryOne(e, t) {
      let n = { stack: [], error: void 0, hasError: !1 };
      try {
        let r = Xu(
          n,
          await e.evaluateHandle(
            this._querySelector,
            t,
            Yu.create((e) => e.puppeteerUtil)
          ),
          !1
        );
        return Fu in r ? r.move() : null;
      } catch (e) {
        ((n.error = e), (n.hasError = !0));
      } finally {
        Zu(n);
      }
    }
    static async waitFor(e, t, n) {
      let r = { stack: [], error: void 0, hasError: !1 };
      try {
        let i,
          a = Xu(
            r,
            await (async () => {
              if (!(Fu in e)) {
                i = e;
                return;
              }
              return ((i = e.frame), await i.isolatedRealm().adoptHandle(e));
            })(),
            !1
          ),
          { visible: o = !1, hidden: s = !1, timeout: c, signal: l } = n,
          u = o || s ? `raf` : n.polling;
        try {
          let e = { stack: [], error: void 0, hasError: !1 };
          try {
            l?.throwIfAborted();
            let n = Xu(
              e,
              await i.isolatedRealm().waitForFunction(
                async (e, t, n, r, i) => {
                  let a = await e.createFunction(t)(r ?? document, n, e);
                  return e.checkVisibility(a, i);
                },
                { polling: u, root: a, timeout: c, signal: l },
                Yu.create((e) => e.puppeteerUtil),
                Vu(this._querySelector),
                t,
                a,
                o ? !0 : s ? !1 : void 0
              ),
              !1
            );
            if (l?.aborted) throw l.reason;
            return Fu in n ? await i.mainRealm().transferHandle(n) : null;
          } catch (t) {
            ((e.error = t), (e.hasError = !0));
          } finally {
            Zu(e);
          }
        } catch (e) {
          if (!Iu(e) || e.name === `AbortError`) throw e;
          let n = new (e instanceof Gl ? Gl : Error)(`Waiting for selector \`${t}\` failed`);
          throw ((n.cause = e), n);
        }
      } catch (e) {
        ((r.error = e), (r.hasError = !0));
      } finally {
        Zu(r);
      }
    }
  },
  $u = (e) => [`name`, `role`].includes(e),
  ed = /\[\s*(?<attribute>\w+)\s*=\s*(?<quote>"|')(?<value>\\.|.*?(?=\k<quote>))\k<quote>\s*\]/g,
  td = (e) => {
    if (e.length > 1e4) throw Error(`Selector ${e} is too long`);
    let t = {},
      n = e.replace(
        ed,
        (e, n, r, i) => (K($u(n), `Unknown aria attribute "${n}" in selector`), (t[n] = i), ``)
      );
    return (n && !t.name && (t.name = n), t);
  },
  nd = class extends Qu {
    static querySelector = async (e, t, { ariaQuerySelector: n }) => await n(e, t);
    static async *queryAll(e, t) {
      let { name: n, role: r } = td(t);
      yield* e.queryAXTree(n, r);
    }
    static queryOne = async (e, t) => (await Pu.first(this.queryAll(e, t))) ?? null;
  },
  rd = class extends Qu {
    static querySelector = (e, t, { cssQuerySelector: n }) => n(e, t);
    static querySelectorAll = (e, t, { cssQuerySelectorAll: n }) => n(e, t);
  },
  id =
    '"use strict";var N=Object.defineProperty;var X=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var Y=Object.prototype.hasOwnProperty;var l=(t,e)=>{for(var r in e)N(t,r,{get:e[r],enumerable:!0})},G=(t,e,r,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of B(e))!Y.call(t,s)&&s!==r&&N(t,s,{get:()=>e[s],enumerable:!(o=X(e,s))||o.enumerable});return t};var J=t=>G(N({},"__esModule",{value:!0}),t);var pe={};l(pe,{default:()=>he});module.exports=J(pe);var x=class extends Error{constructor(e,r){super(e,r),this.name=this.constructor.name}get[Symbol.toStringTag](){return this.constructor.name}},p=class extends x{};var c=class t{static create(e){return new t(e)}static async race(e){let r=new Set;try{let o=e.map(s=>s instanceof t?(s.#s&&r.add(s),s.valueOrThrow()):s);return await Promise.race(o)}finally{for(let o of r)o.reject(new Error("Timeout cleared"))}}#e=!1;#r=!1;#o;#t;#a=new Promise(e=>{this.#t=e});#s;#i;constructor(e){e&&e.timeout>0&&(this.#i=new p(e.message),this.#s=setTimeout(()=>{this.reject(this.#i)},e.timeout))}#l(e){clearTimeout(this.#s),this.#o=e,this.#t()}resolve(e){this.#r||this.#e||(this.#e=!0,this.#l(e))}reject(e){this.#r||this.#e||(this.#r=!0,this.#l(e))}resolved(){return this.#e}finished(){return this.#e||this.#r}value(){return this.#o}#n;valueOrThrow(){return this.#n||(this.#n=(async()=>{if(await this.#a,this.#r)throw this.#o;return this.#o})()),this.#n}};var L=new Map,W=t=>{let e=L.get(t);return e||(e=new Function(`return ${t}`)(),L.set(t,e),e)};var E={};l(E,{ariaQuerySelector:()=>z,ariaQuerySelectorAll:()=>b});var z=(t,e)=>globalThis.__ariaQuerySelector(t,e),b=async function*(t,e){yield*await globalThis.__ariaQuerySelectorAll(t,e)};var v={};l(v,{cssQuerySelector:()=>K,cssQuerySelectorAll:()=>Z});var K=(t,e)=>t.querySelector(e),Z=function(t,e){return t.querySelectorAll(e)};var A={};l(A,{CustomQuerySelectorRegistry:()=>y,customQuerySelectors:()=>P});var y=class{#e=new Map;register(e,r){if(!r.queryOne&&r.queryAll){let o=r.queryAll;r.queryOne=(s,i)=>{for(let n of o(s,i))return n;return null}}else if(r.queryOne&&!r.queryAll){let o=r.queryOne;r.queryAll=(s,i)=>{let n=o(s,i);return n?[n]:[]}}else if(!r.queryOne||!r.queryAll)throw new Error("At least one query method must be defined.");this.#e.set(e,{querySelector:r.queryOne,querySelectorAll:r.queryAll})}unregister(e){this.#e.delete(e)}get(e){return this.#e.get(e)}clear(){this.#e.clear()}},P=new y;var R={};l(R,{pierceQuerySelector:()=>ee,pierceQuerySelectorAll:()=>te});var ee=(t,e)=>{let r=null,o=s=>{let i=document.createTreeWalker(s,NodeFilter.SHOW_ELEMENT);do{let n=i.currentNode;n.shadowRoot&&o(n.shadowRoot),!(n instanceof ShadowRoot)&&n!==s&&!r&&n.matches(e)&&(r=n)}while(!r&&i.nextNode())};return t instanceof Document&&(t=t.documentElement),o(t),r},te=(t,e)=>{let r=[],o=s=>{let i=document.createTreeWalker(s,NodeFilter.SHOW_ELEMENT);do{let n=i.currentNode;n.shadowRoot&&o(n.shadowRoot),!(n instanceof ShadowRoot)&&n!==s&&n.matches(e)&&r.push(n)}while(i.nextNode())};return t instanceof Document&&(t=t.documentElement),o(t),r};var u=(t,e)=>{if(!t)throw new Error(e)};var w=class{#e;#r;#o;#t;constructor(e,r){this.#e=e,this.#r=r}async start(){let e=this.#t=c.create(),r=await this.#e();if(r){e.resolve(r);return}this.#o=new MutationObserver(async()=>{let o=await this.#e();o&&(e.resolve(o),await this.stop())}),this.#o.observe(this.#r,{childList:!0,subtree:!0,attributes:!0})}async stop(){u(this.#t,"Polling never started."),this.#t.finished()||this.#t.reject(new Error("Polling stopped")),this.#o&&(this.#o.disconnect(),this.#o=void 0)}result(){return u(this.#t,"Polling never started."),this.#t.valueOrThrow()}},T=class{#e;#r;constructor(e){this.#e=e}async start(){let e=this.#r=c.create(),r=await this.#e();if(r){e.resolve(r);return}let o=async()=>{if(e.finished())return;let s=await this.#e();if(!s){window.requestAnimationFrame(o);return}e.resolve(s),await this.stop()};window.requestAnimationFrame(o)}async stop(){u(this.#r,"Polling never started."),this.#r.finished()||this.#r.reject(new Error("Polling stopped"))}result(){return u(this.#r,"Polling never started."),this.#r.valueOrThrow()}},S=class{#e;#r;#o;#t;constructor(e,r){this.#e=e,this.#r=r}async start(){let e=this.#t=c.create(),r=await this.#e();if(r){e.resolve(r);return}this.#o=setInterval(async()=>{let o=await this.#e();o&&(e.resolve(o),await this.stop())},this.#r)}async stop(){u(this.#t,"Polling never started."),this.#t.finished()||this.#t.reject(new Error("Polling stopped")),this.#o&&(clearInterval(this.#o),this.#o=void 0)}result(){return u(this.#t,"Polling never started."),this.#t.valueOrThrow()}};var _={};l(_,{PCombinator:()=>H,pQuerySelector:()=>fe,pQuerySelectorAll:()=>$});var a=class{static async*map(e,r){for await(let o of e)yield await r(o)}static async*flatMap(e,r){for await(let o of e)yield*r(o)}static async collect(e){let r=[];for await(let o of e)r.push(o);return r}static async first(e){for await(let r of e)return r}};var C={};l(C,{textQuerySelectorAll:()=>m});var re=new Set(["checkbox","image","radio"]),oe=t=>t instanceof HTMLSelectElement||t instanceof HTMLTextAreaElement||t instanceof HTMLInputElement&&!re.has(t.type),se=new Set(["SCRIPT","STYLE"]),f=t=>!se.has(t.nodeName)&&!document.head?.contains(t),I=new WeakMap,F=t=>{for(;t;)I.delete(t),t instanceof ShadowRoot?t=t.host:t=t.parentNode},j=new WeakSet,ne=new MutationObserver(t=>{for(let e of t)F(e.target)}),d=t=>{let e=I.get(t);if(e||(e={full:"",immediate:[]},!f(t)))return e;let r="";if(oe(t))e.full=t.value,e.immediate.push(t.value),t.addEventListener("input",o=>{F(o.target)},{once:!0,capture:!0});else{for(let o=t.firstChild;o;o=o.nextSibling){if(o.nodeType===Node.TEXT_NODE){e.full+=o.nodeValue??"",r+=o.nodeValue??"";continue}r&&e.immediate.push(r),r="",o.nodeType===Node.ELEMENT_NODE&&(e.full+=d(o).full)}r&&e.immediate.push(r),t instanceof Element&&t.shadowRoot&&(e.full+=d(t.shadowRoot).full),j.has(t)||(ne.observe(t,{childList:!0,characterData:!0,subtree:!0}),j.add(t))}return I.set(t,e),e};var m=function*(t,e){let r=!1;for(let o of t.childNodes)if(o instanceof Element&&f(o)){let s;o.shadowRoot?s=m(o.shadowRoot,e):s=m(o,e);for(let i of s)yield i,r=!0}r||t instanceof Element&&f(t)&&d(t).full.includes(e)&&(yield t)};var k={};l(k,{checkVisibility:()=>le,pierce:()=>g,pierceAll:()=>O});var ie=["hidden","collapse"],le=(t,e)=>{if(!t)return e===!1;if(e===void 0)return t;let r=t.nodeType===Node.TEXT_NODE?t.parentElement:t,o=window.getComputedStyle(r),s=o&&!ie.includes(o.visibility)&&!ae(r);return e===s?t:!1};function ae(t){let e=t.getBoundingClientRect();return e.width===0||e.height===0}var ce=t=>"shadowRoot"in t&&t.shadowRoot instanceof ShadowRoot;function*g(t){ce(t)?yield t.shadowRoot:yield t}function*O(t){t=g(t).next().value,yield t;let e=[document.createTreeWalker(t,NodeFilter.SHOW_ELEMENT)];for(let r of e){let o;for(;o=r.nextNode();)o.shadowRoot&&(yield o.shadowRoot,e.push(document.createTreeWalker(o.shadowRoot,NodeFilter.SHOW_ELEMENT)))}}var D={};l(D,{xpathQuerySelectorAll:()=>q});var q=function*(t,e,r=-1){let s=(t.ownerDocument||document).evaluate(e,t,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE),i=[],n;for(;(n=s.iterateNext())&&(i.push(n),!(r&&i.length===r)););for(let h=0;h<i.length;h++)n=i[h],yield n,i[h]=null};var ue=/[-\\w\\P{ASCII}*]/u,H=(r=>(r.Descendent=">>>",r.Child=">>>>",r))(H||{}),V=t=>"querySelectorAll"in t,Q=class{#e;#r=[];#o=void 0;elements;constructor(e,r){this.elements=[e],this.#e=r,this.#t()}async run(){for(typeof this.#o=="string"&&this.#o.trimStart()===":scope"&&this.#t();this.#o!==void 0;this.#t()){let e=this.#o;typeof e=="string"?e[0]&&ue.test(e[0])?this.elements=a.flatMap(this.elements,async function*(r){V(r)&&(yield*r.querySelectorAll(e))}):this.elements=a.flatMap(this.elements,async function*(r){if(!r.parentElement){if(!V(r))return;yield*r.querySelectorAll(e);return}let o=0;for(let s of r.parentElement.children)if(++o,s===r)break;yield*r.parentElement.querySelectorAll(`:scope>:nth-child(${o})${e}`)}):this.elements=a.flatMap(this.elements,async function*(r){switch(e.name){case"text":yield*m(r,e.value);break;case"xpath":yield*q(r,e.value);break;case"aria":yield*b(r,e.value);break;default:let o=P.get(e.name);if(!o)throw new Error(`Unknown selector type: ${e.name}`);yield*o.querySelectorAll(r,e.value)}})}}#t(){if(this.#r.length!==0){this.#o=this.#r.shift();return}if(this.#e.length===0){this.#o=void 0;return}let e=this.#e.shift();switch(e){case">>>>":{this.elements=a.flatMap(this.elements,g),this.#t();break}case">>>":{this.elements=a.flatMap(this.elements,O),this.#t();break}default:this.#r=e,this.#t();break}}},M=class{#e=new WeakMap;calculate(e,r=[]){if(e===null)return r;e instanceof ShadowRoot&&(e=e.host);let o=this.#e.get(e);if(o)return[...o,...r];let s=0;for(let n=e.previousSibling;n;n=n.previousSibling)++s;let i=this.calculate(e.parentNode,[s]);return this.#e.set(e,i),[...i,...r]}},U=(t,e)=>{if(t.length+e.length===0)return 0;let[r=-1,...o]=t,[s=-1,...i]=e;return r===s?U(o,i):r<s?-1:1},de=async function*(t){let e=new Set;for await(let o of t)e.add(o);let r=new M;yield*[...e.values()].map(o=>[o,r.calculate(o)]).sort(([,o],[,s])=>U(o,s)).map(([o])=>o)},$=function(t,e){let r=JSON.parse(e);if(r.some(o=>{let s=0;return o.some(i=>(typeof i=="string"?++s:s=0,s>1))}))throw new Error("Multiple deep combinators found in sequence.");return de(a.flatMap(r,o=>{let s=new Q(t,o);return s.run(),s.elements}))},fe=async function(t,e){for await(let r of $(t,e))return r;return null};var me=Object.freeze({...E,...A,...R,..._,...C,...k,...D,...v,Deferred:c,createFunction:W,createTextContent:d,IntervalPoller:S,isSuitableNodeForTextMatching:f,MutationPoller:w,RAFPoller:T}),he=me;\n',
  ad = new (class {
    #e = !1;
    #t = new Set();
    append(e) {
      this.#n(() => {
        this.#t.add(e);
      });
    }
    pop(e) {
      this.#n(() => {
        this.#t.delete(e);
      });
    }
    inject(e, t = !1) {
      ((this.#e || t) && e(this.#r()), (this.#e = !1));
    }
    #n(e) {
      (e(), (this.#e = !0));
    }
    #r() {
      return `(() => {
      const module = {};
      ${id}
      ${[...this.#t].map((e) => `(${e})(module.exports.default);`).join(``)}
      return module.exports.default;
    })()`;
    }
  })(),
  od = new (class {
    #e = new Map();
    get(e) {
      let t = this.#e.get(e);
      return t ? t[1] : void 0;
    }
    register(e, t) {
      (K(!this.#e.has(e), `Cannot register over existing handler: ${e}`),
        K(/^[a-zA-Z]+$/.test(e), `Custom query handler names may only contain [a-zA-Z]`),
        K(t.queryAll || t.queryOne, `At least one query method must be implemented.`));
      let n = class extends Qu {
          static querySelectorAll = Hu(
            (e, t, n) => n.customQuerySelectors.get(PLACEHOLDER(`name`)).querySelectorAll(e, t),
            { name: JSON.stringify(e) }
          );
          static querySelector = Hu(
            (e, t, n) => n.customQuerySelectors.get(PLACEHOLDER(`name`)).querySelector(e, t),
            { name: JSON.stringify(e) }
          );
        },
        r = Hu(
          (e) => {
            e.customQuerySelectors.register(PLACEHOLDER(`name`), {
              queryAll: PLACEHOLDER(`queryAll`),
              queryOne: PLACEHOLDER(`queryOne`),
            });
          },
          {
            name: JSON.stringify(e),
            queryAll: t.queryAll ? Vu(t.queryAll) : `undefined`,
            queryOne: t.queryOne ? Vu(t.queryOne) : `undefined`,
          }
        ).toString();
      (this.#e.set(e, [r, n]), ad.append(r));
    }
    unregister(e) {
      let t = this.#e.get(e);
      if (!t) throw Error(`Cannot unregister unknown handler: ${e}`);
      (ad.pop(t[0]), this.#e.delete(e));
    }
    names() {
      return [...this.#e.keys()];
    }
    clear() {
      for (let [e] of this.#e) ad.pop(e);
      this.#e.clear();
    }
  })(),
  sd = class extends Qu {
    static querySelector = (e, t, { pierceQuerySelector: n }) => n(e, t);
    static querySelectorAll = (e, t, { pierceQuerySelectorAll: n }) => n(e, t);
  },
  cd = class extends Qu {
    static querySelectorAll = (e, t, { pQuerySelectorAll: n }) => n(e, t);
    static querySelector = (e, t, { pQuerySelector: n }) => n(e, t);
  },
  ld = {
    attribute:
      /\[\s*(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)\s*(?:(?<operator>\W?=)\s*(?<value>.+?)\s*(\s(?<caseSensitive>[iIsS]))?\s*)?\]/gu,
    id: /#(?<name>[-\w\P{ASCII}]+)/gu,
    class: /\.(?<name>[-\w\P{ASCII}]+)/gu,
    comma: /\s*,\s*/g,
    combinator: /\s*[\s>+~]\s*/g,
    'pseudo-element': /::(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
    'pseudo-class': /:(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
    universal: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?\*/gu,
    type: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)/gu,
  },
  ud = new Set([`combinator`, `comma`]),
  dd = (e) => {
    switch (e) {
      case `pseudo-element`:
      case `pseudo-class`:
        return new RegExp(ld[e].source.replace(`(?<argument>¶*)`, `(?<argument>.*)`), `gu`);
      default:
        return ld[e];
    }
  };
function fd(e, t) {
  let n = 0,
    r = ``;
  for (; t < e.length; t++) {
    let i = e[t];
    switch (i) {
      case `(`:
        ++n;
        break;
      case `)`:
        --n;
        break;
    }
    if (((r += i), n === 0)) return r;
  }
  return r;
}
function pd(e, t = ld) {
  if (!e) return [];
  let n = [e];
  for (let [e, r] of Object.entries(t))
    for (let t = 0; t < n.length; t++) {
      let i = n[t];
      if (typeof i != `string`) continue;
      r.lastIndex = 0;
      let a = r.exec(i);
      if (!a) continue;
      let o = a.index - 1,
        s = [],
        c = a[0],
        l = i.slice(0, o + 1);
      (l && s.push(l), s.push({ ...a.groups, type: e, content: c }));
      let u = i.slice(o + c.length + 1);
      (u && s.push(u), n.splice(t, 1, ...s));
    }
  let r = 0;
  for (let e of n)
    switch (typeof e) {
      case `string`:
        throw Error(`Unexpected sequence ${e} found at index ${r}`);
      case `object`:
        ((r += e.content.length),
          (e.pos = [r - e.content.length, r]),
          ud.has(e.type) && (e.content = e.content.trim() || ` `));
        break;
    }
  return n;
}
var md = /(['"])([^\\\n]*?)\1/g,
  hd = /\\./g;
function gd(e, t = ld) {
  if (((e = e.trim()), e === ``)) return [];
  let n = [];
  ((e = e.replace(hd, (e, t) => (n.push({ value: e, offset: t }), ``.repeat(e.length)))),
    (e = e.replace(
      md,
      (e, t, r, i) => (n.push({ value: e, offset: i }), `${t}${``.repeat(r.length)}${t}`)
    )));
  {
    let t = 0,
      r;
    for (; (r = e.indexOf(`(`, t)) > -1; ) {
      let i = fd(e, r);
      (n.push({ value: i, offset: r }),
        (e = `${e.substring(0, r)}(${`¶`.repeat(i.length - 2)})${e.substring(r + i.length)}`),
        (t = r + i.length));
    }
  }
  let r = pd(e, t),
    i = new Set();
  for (let e of n.reverse())
    for (let t of r) {
      let { offset: n, value: r } = e;
      if (!(t.pos[0] <= n && n + r.length <= t.pos[1])) continue;
      let { content: a } = t,
        o = n - t.pos[0];
      ((t.content = a.slice(0, o) + r + a.slice(o + r.length)), t.content !== a && i.add(t));
    }
  for (let e of i) {
    let t = dd(e.type);
    if (!t) throw Error(`Unknown token type: ${e.type}`);
    t.lastIndex = 0;
    let n = t.exec(e.content);
    if (!n) throw Error(`Unable to parse content for ${e.type}: ${e.content}`);
    Object.assign(e, n.groups);
  }
  return r;
}
function _d(e) {
  if (Array.isArray(e)) return e.map((e) => e.content).join(``);
  switch (e.type) {
    case `list`:
      return e.list.map(_d).join(`,`);
    case `relative`:
      return e.combinator + _d(e.right);
    case `complex`:
      return _d(e.left) + e.combinator + _d(e.right);
    case `compound`:
      return e.list.map(_d).join(``);
    default:
      return e.content;
  }
}
((ld.nesting = /&/g), (ld.combinator = /\s*(>>>>?|[\s>+~])\s*/g));
var vd = /\\[\s\S]/g,
  yd = (e) =>
    e.length <= 1
      ? e
      : ((e[0] === `"` || e[0] === `'`) && e.endsWith(e[0]) && (e = e.slice(1, -1)),
        e.replace(vd, (e) => e[1]));
function bd(e) {
  let t = !0,
    n = !1,
    r = !1,
    i = gd(e);
  if (i.length === 0) return [[], t, r, !1];
  let a = [],
    o = [a],
    s = [o],
    c = [];
  for (let e of i) {
    switch (e.type) {
      case `combinator`:
        switch (e.content) {
          case `>>>`:
            ((t = !1),
              c.length && (a.push(_d(c)), c.splice(0)),
              (a = []),
              o.push(`>>>`),
              o.push(a));
            continue;
          case `>>>>`:
            ((t = !1),
              c.length && (a.push(_d(c)), c.splice(0)),
              (a = []),
              o.push(`>>>>`),
              o.push(a));
            continue;
        }
        break;
      case `pseudo-element`:
        if (!e.name.startsWith(`-p-`)) break;
        ((t = !1), c.length && (a.push(_d(c)), c.splice(0)));
        let i = e.name.slice(3);
        (i === `aria` && (n = !0), a.push({ name: i, value: yd(e.argument ?? ``) }));
        continue;
      case `pseudo-class`:
        r = !0;
        break;
      case `comma`:
        (c.length && (a.push(_d(c)), c.splice(0)), (a = []), (o = [a]), s.push(o));
        continue;
    }
    c.push(e);
  }
  return (c.length && a.push(_d(c)), [s, t, r, n]);
}
var xd = {
    aria: nd,
    pierce: sd,
    xpath: class extends Qu {
      static querySelectorAll = (e, t, { xpathQuerySelectorAll: n }) => n(e, t);
      static querySelector = (e, t, { xpathQuerySelectorAll: n }) => {
        for (let r of n(e, t, 1)) return r;
        return null;
      };
    },
    text: class extends Qu {
      static querySelectorAll = (e, t, { textQuerySelectorAll: n }) => n(e, t);
    },
  },
  Sd = [`=`, `/`];
function Cd(e) {
  for (let t of [od.names().map((e) => [e, od.get(e)]), Object.entries(xd)])
    for (let [n, r] of t)
      for (let t of Sd) {
        let i = `${n}${t}`;
        if (e.startsWith(i))
          return (
            (e = e.slice(i.length)),
            { updatedSelector: e, polling: n === `aria` ? `raf` : `mutation`, QueryHandler: r }
          );
      }
  try {
    let [t, n, r, i] = bd(e);
    return n
      ? { updatedSelector: e, polling: r ? `raf` : `mutation`, QueryHandler: rd }
      : { updatedSelector: JSON.stringify(t), polling: i ? `raf` : `mutation`, QueryHandler: cd };
  } catch {
    return { updatedSelector: e, polling: `mutation`, QueryHandler: rd };
  }
}
var wd = function (e, t, n) {
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
  Td = (function (e) {
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
  Ed = new WeakSet();
function Dd(e, t) {
  let n = !1;
  if (e.prototype[Tl]) {
    let t = e.prototype[Tl];
    ((e.prototype[Tl] = function () {
      if (Ed.has(this)) {
        Ed.delete(this);
        return;
      }
      return t.call(this);
    }),
      (n = !0));
  }
  if (e.prototype[El]) {
    let t = e.prototype[El];
    ((e.prototype[El] = function () {
      if (Ed.has(this)) {
        Ed.delete(this);
        return;
      }
      return t.call(this);
    }),
      (n = !0));
  }
  return (
    n &&
      (e.prototype.move = function () {
        return (Ed.add(this), this);
      }),
    e
  );
}
function J(e = (e) => `Attempted to use disposed ${e.constructor.name}.`) {
  return (t, n) =>
    function (...n) {
      if (this.disposed) throw Error(e(this));
      return t.call(this, ...n);
    };
}
function Od(e, t) {
  return function (...t) {
    if (!this.disposed) return e.call(this, ...t);
  };
}
function kd(e, t) {
  let n = new WeakMap(),
    r = -1;
  return function (...t) {
    if ((r === -1 && (r = t.length), r !== t.length))
      throw Error(`Memoized method was called with the wrong number of arguments`);
    let i = !1,
      a = n;
    for (let e of t)
      a.has(e) ? (a = a.get(e)) : ((i = !0), a.set(e, new WeakMap()), (a = a.get(e)));
    if (i) return e.call(this, ...t);
  };
}
function Ad(
  e = function () {
    return this;
  }
) {
  return (t, n) => {
    let r = new WeakMap();
    return async function (...n) {
      let i = { stack: [], error: void 0, hasError: !1 };
      try {
        let a = e.call(this),
          o = r.get(a);
        return (
          o || ((o = new Ou()), r.set(a, o)),
          wd(i, await o.acquire(), !0),
          await t.call(this, ...n)
        );
      } catch (e) {
        ((i.error = e), (i.hasError = !0));
      } finally {
        let e = Td(i);
        e && (await e);
      }
    };
  };
}
var jd = new WeakMap(),
  Md = function (e) {
    let t = jd.get(this) ?? new Map();
    if (t.has(e)) return;
    let n =
      e === void 0
        ? (e, t) => {
            this.emit(e, t);
          }
        : (t, n) => {
            e.includes(t) && this.emit(t, n);
          };
    (t.set(e, n), jd.set(this, t));
  };
function Nd(e) {
  return ({ set: t, get: n }, r) => (
    r.addInitializer(function () {
      return Md.apply(this, [e]);
    }),
    {
      set(r) {
        let i = jd.get(this).get(e),
          a = n.call(this);
        (a !== void 0 && a.off(`*`, i), r !== void 0 && (r.on(`*`, i), t.call(this, r)));
      },
      init(t) {
        if (t === void 0) return t;
        Md.apply(this, [e]);
        let n = jd.get(this).get(e);
        return (t.on(`*`, n), t);
      },
    }
  );
}
var Pd = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Fd = function (e, t, n, r, i, a) {
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
  Id = function (e, t, n) {
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
  Ld = (function (e) {
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
  Rd = (() => {
    let e = [Dd],
      t,
      n = [],
      r,
      i = [],
      a,
      o;
    var s = class {
      static {
        r = this;
      }
      static {
        let c = typeof Symbol == `function` && Symbol.metadata ? Object.create(null) : void 0;
        (Fd(
          this,
          null,
          a,
          {
            kind: `method`,
            name: `getProperty`,
            static: !1,
            private: !1,
            access: { has: (e) => `getProperty` in e, get: (e) => e.getProperty },
            metadata: c,
          },
          null,
          i
        ),
          Fd(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `getProperties`,
              static: !1,
              private: !1,
              access: { has: (e) => `getProperties` in e, get: (e) => e.getProperties },
              metadata: c,
            },
            null,
            i
          ),
          Fd(null, (t = { value: r }), e, { kind: `class`, name: r.name, metadata: c }, null, n),
          (s = r = t.value),
          c &&
            Object.defineProperty(r, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: c,
            }),
          Pd(r, n));
      }
      constructor() {
        Pd(this, i);
      }
      async evaluate(e, ...t) {
        return ((e = tu(this.evaluate.name, e)), await this.realm.evaluate(e, this, ...t));
      }
      async evaluateHandle(e, ...t) {
        return (
          (e = tu(this.evaluateHandle.name, e)),
          await this.realm.evaluateHandle(e, this, ...t)
        );
      }
      async getProperty(e) {
        return await this.evaluateHandle((e, t) => e[t], e);
      }
      async getProperties() {
        let e = await this.evaluate((e) => {
            let t = [],
              n = Object.getOwnPropertyDescriptors(e);
            for (let e in n) n[e]?.enumerable && t.push(e);
            return t;
          }),
          t = new Map(),
          n = await Promise.all(e.map((e) => this.getProperty(e)));
        for (let [r, i] of Object.entries(e)) {
          let e = { stack: [], error: void 0, hasError: !1 };
          try {
            let a = Id(e, n[r], !1);
            a && t.set(i, a.move());
          } catch (t) {
            ((e.error = t), (e.hasError = !0));
          } finally {
            Ld(e);
          }
        }
        return t;
      }
      [((a = [J()]), (o = [J()]), Tl)]() {
        this[El]().catch(q);
      }
      [El]() {
        return this.dispose();
      }
    };
    return r;
  })(),
  zd = function (e, t, n) {
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
  Bd = (function (e) {
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
  Vd;
(function (e) {
  e.Action = `action`;
})((Vd ||= {}));
var Hd = class extends Cu {
    static race(e) {
      return Yd.create(e);
    }
    visibility = null;
    _timeout = 3e4;
    #e = !0;
    #t = !0;
    #n = !0;
    operators = {
      conditions: (e, t) => Lc((n) => Zc(...e.map((e) => e(n, t))).pipe(sl(n))),
      retryAndRaceWithSignalAndTimer: (e, t) => {
        let n = [];
        return (
          e && n.push(xu(e, t)),
          n.push(pu(this._timeout, t)),
          gs(yl({ delay: 100 }), vl(...n))
        );
      },
    };
    get timeout() {
      return this._timeout;
    }
    setTimeout(e) {
      let t = this._clone();
      return ((t._timeout = e), t);
    }
    setVisibility(e) {
      let t = this._clone();
      return ((t.visibility = e), t);
    }
    setWaitForEnabled(e) {
      let t = this._clone();
      return ((t.#t = e), t);
    }
    setEnsureElementIsInTheViewport(e) {
      let t = this._clone();
      return ((t.#e = e), t);
    }
    setWaitForStableBoundingBox(e) {
      let t = this._clone();
      return ((t.#n = e), t);
    }
    copyOptions(e) {
      return (
        (this._timeout = e._timeout),
        (this.visibility = e.visibility),
        (this.#t = e.#t),
        (this.#e = e.#e),
        (this.#n = e.#n),
        this
      );
    }
    #r = (e, t) =>
      this.#t
        ? gc(
            e.frame.waitForFunction(
              (e) =>
                e instanceof HTMLElement
                  ? ![`BUTTON`, `INPUT`, `SELECT`, `TEXTAREA`, `OPTION`, `OPTGROUP`].includes(
                      e.nodeName
                    ) || !e.hasAttribute(`disabled`)
                  : !0,
              { timeout: this._timeout, signal: t },
              e
            )
          ).pipe(ll())
        : Is;
    #i = (e) =>
      this.#n
        ? Vc(() =>
            gc(
              e.evaluate(
                (e) =>
                  new Promise((t) => {
                    window.requestAnimationFrame(() => {
                      let n = e.getBoundingClientRect();
                      window.requestAnimationFrame(() => {
                        let r = e.getBoundingClientRect();
                        t([
                          { x: n.x, y: n.y, width: n.width, height: n.height },
                          { x: r.x, y: r.y, width: r.width, height: r.height },
                        ]);
                      });
                    });
                  })
              )
            )
          ).pipe(
            gl(
              ([e, t]) => e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height
            ),
            yl({ delay: 100 }),
            ll()
          )
        : Is;
    #a = (e) =>
      this.#e
        ? gc(e.isIntersectingViewport({ threshold: 0 })).pipe(
            tl((e) => !e),
            Lc(() => gc(e.scrollIntoView())),
            Lc(() =>
              Vc(() => gc(e.isIntersectingViewport({ threshold: 0 }))).pipe(
                gl(hs),
                yl({ delay: 100 }),
                ll()
              )
            )
          )
        : Is;
    #o(e) {
      let t = e?.signal,
        n = Error(`Locator.click`);
      return this._wait(e).pipe(
        this.operators.conditions([this.#a, this.#i, this.#r], t),
        Cl(() => this.emit(Vd.Action, void 0)),
        Lc((t) =>
          gc(t.click(e)).pipe(
            al((e) => {
              throw (t.dispose().catch(q), e);
            })
          )
        ),
        this.operators.retryAndRaceWithSignalAndTimer(t, n)
      );
    }
    #s(e, t) {
      let n = t?.signal,
        r = t?.typingThreshold ?? 100,
        i = Error(`Locator.fill`);
      return this._wait(t).pipe(
        this.operators.conditions([this.#a, this.#i, this.#r], n),
        Cl(() => this.emit(Vd.Action, void 0)),
        Lc((t) =>
          gc(
            t.evaluate((e) => {
              if (e instanceof HTMLSelectElement) return `select`;
              if (e instanceof HTMLTextAreaElement) return `typeable-input`;
              if (e instanceof HTMLInputElement)
                switch (e.type) {
                  case `checkbox`:
                  case `radio`:
                    return `checkable-input`;
                  case `text`:
                  case `url`:
                  case `tel`:
                  case `search`:
                  case `password`:
                  case `number`:
                  case `email`:
                    return `typeable-input`;
                  default:
                    return `other-input`;
                }
              switch (e.getAttribute(`role`)) {
                case `checkbox`:
                case `radio`:
                case `switch`:
                  return `checkable-input`;
              }
              return e.isContentEditable ? `contenteditable` : `unknown`;
            })
          )
            .pipe(
              Lc((n) => {
                let i = () =>
                    gc(t.focus()).pipe(
                      Lc(() =>
                        gc(
                          t.evaluate((e, t) => {
                            let n = e,
                              r = String(t);
                            (n.isContentEditable ? n.innerText : n.value) !== r &&
                              (n.isContentEditable ? (n.innerText = r) : (n.value = r),
                              n.dispatchEvent(new Event(`input`, { bubbles: !0 })),
                              n.dispatchEvent(new Event(`change`, { bubbles: !0 })));
                          }, e)
                        )
                      )
                    ),
                  a = () =>
                    gc(
                      t.evaluate((e) =>
                        e.indeterminate || e.getAttribute(`aria-checked`) === `mixed`
                          ? `mixed`
                          : e.checked || e.getAttribute(`aria-checked`) === `true`
                      )
                    ).pipe(Lc((n) => (n === `mixed` || n !== !!e ? gc(t.click()) : _c(void 0))));
                switch (n) {
                  case `checkable-input`:
                    return a();
                  case `select`:
                    return gc(t.select(e).then(Zo));
                  case `contenteditable`:
                  case `typeable-input`:
                    return typeof e == `string` && e.length < r
                      ? gc(
                          t.evaluate((e, t) => {
                            let n = e,
                              r = String(t),
                              i = n.isContentEditable ? n.innerText : e.value;
                            return i === r
                              ? ``
                              : !r.startsWith(i) || !i
                                ? (n.isContentEditable ? (n.innerText = ``) : (e.value = ``), r)
                                : (n.isContentEditable
                                    ? ((n.innerText = ``), (n.innerText = i))
                                    : ((e.value = ``), (e.value = i)),
                                  r.substring(i.length));
                          }, e)
                        ).pipe(Lc((e) => (e ? gc(t.type(e)) : _c(void 0))))
                      : i();
                  case `other-input`:
                    return i();
                  case `unknown`:
                    throw Error(`Element cannot be filled out.`);
                }
              })
            )
            .pipe(
              al((e) => {
                throw (t.dispose().catch(q), e);
              })
            )
        ),
        this.operators.retryAndRaceWithSignalAndTimer(n, i)
      );
    }
    #c(e) {
      let t = e?.signal,
        n = Error(`Locator.hover`);
      return this._wait(e).pipe(
        this.operators.conditions([this.#a, this.#i], t),
        Cl(() => this.emit(Vd.Action, void 0)),
        Lc((e) =>
          gc(e.hover()).pipe(
            al((t) => {
              throw (e.dispose().catch(q), t);
            })
          )
        ),
        this.operators.retryAndRaceWithSignalAndTimer(t, n)
      );
    }
    #l(e) {
      let t = e?.signal,
        n = Error(`Locator.scroll`);
      return this._wait(e).pipe(
        this.operators.conditions([this.#a, this.#i], t),
        Cl(() => this.emit(Vd.Action, void 0)),
        Lc((t) =>
          gc(
            t.evaluate(
              (e, t, n) => {
                (t !== void 0 && (e.scrollTop = t), n !== void 0 && (e.scrollLeft = n));
              },
              e?.scrollTop,
              e?.scrollLeft
            )
          ).pipe(
            al((e) => {
              throw (t.dispose().catch(q), e);
            })
          )
        ),
        this.operators.retryAndRaceWithSignalAndTimer(t, n)
      );
    }
    clone() {
      return this._clone();
    }
    async waitHandle(e) {
      let t = Error(`Locator.waitHandle`);
      return await bc(
        this._wait(e).pipe(this.operators.retryAndRaceWithSignalAndTimer(e?.signal, t))
      );
    }
    async wait(e) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        return await zd(t, await this.waitHandle(e), !1).jsonValue();
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        Bd(t);
      }
    }
    map(e) {
      return new Kd(this._clone(), (t) => t.evaluateHandle(e));
    }
    filter(e) {
      return new Gd(
        this._clone(),
        async (t, n) => (
          await t.frame.waitForFunction(e, { signal: n, timeout: this._timeout }, t),
          !0
        )
      );
    }
    filterHandle(e) {
      return new Gd(this._clone(), e);
    }
    mapHandle(e) {
      return new Kd(this._clone(), e);
    }
    click(e) {
      return bc(this.#o(e));
    }
    fill(e, t) {
      return bc(this.#s(e, t));
    }
    hover(e) {
      return bc(this.#c(e));
    }
    scroll(e) {
      return bc(this.#l(e));
    }
  },
  Ud = class e extends Hd {
    static create(t, n) {
      return new e(t, n).setTimeout(
        `getDefaultTimeout` in t ? t.getDefaultTimeout() : t.page().getDefaultTimeout()
      );
    }
    #e;
    #t;
    constructor(e, t) {
      (super(), (this.#e = e), (this.#t = t));
    }
    _clone() {
      return new e(this.#e, this.#t);
    }
    _wait(e) {
      let t = e?.signal;
      return Vc(() =>
        gc(this.#e.waitForFunction(this.#t, { timeout: this.timeout, signal: t }))
      ).pipe(ml());
    }
  },
  Wd = class extends Hd {
    #e;
    constructor(e) {
      (super(), (this.#e = e), this.copyOptions(this.#e));
    }
    get delegate() {
      return this.#e;
    }
    setTimeout(e) {
      let t = super.setTimeout(e);
      return ((t.#e = this.#e.setTimeout(e)), t);
    }
    setVisibility(e) {
      let t = super.setVisibility(e);
      return ((t.#e = t.#e.setVisibility(e)), t);
    }
    setWaitForEnabled(e) {
      let t = super.setWaitForEnabled(e);
      return ((t.#e = this.#e.setWaitForEnabled(e)), t);
    }
    setEnsureElementIsInTheViewport(e) {
      let t = super.setEnsureElementIsInTheViewport(e);
      return ((t.#e = this.#e.setEnsureElementIsInTheViewport(e)), t);
    }
    setWaitForStableBoundingBox(e) {
      let t = super.setWaitForStableBoundingBox(e);
      return ((t.#e = this.#e.setWaitForStableBoundingBox(e)), t);
    }
  },
  Gd = class e extends Wd {
    #e;
    constructor(e, t) {
      (super(e), (this.#e = t));
    }
    _clone() {
      return new e(this.delegate.clone(), this.#e).copyOptions(this);
    }
    _wait(e) {
      return this.delegate._wait(e).pipe(
        Lc((t) =>
          gc(Promise.resolve(this.#e(t, e?.signal))).pipe(
            tl((e) => e),
            Sc(() => t)
          )
        ),
        ml()
      );
    }
  },
  Kd = class e extends Wd {
    #e;
    constructor(e, t) {
      (super(e), (this.#e = t));
    }
    _clone() {
      return new e(this.delegate.clone(), this.#e).copyOptions(this);
    }
    _wait(e) {
      return this.delegate._wait(e).pipe(Lc((t) => gc(Promise.resolve(this.#e(t, e?.signal)))));
    }
  },
  qd = class e extends Hd {
    static create(t, n) {
      return new e(t, n).setTimeout(
        `getDefaultTimeout` in t ? t.getDefaultTimeout() : t.page().getDefaultTimeout()
      );
    }
    static createFromHandle(t, n) {
      return new e(t, n).setTimeout(
        `getDefaultTimeout` in t ? t.getDefaultTimeout() : t.page().getDefaultTimeout()
      );
    }
    #e;
    #t;
    constructor(e, t) {
      (super(), (this.#e = e), (this.#t = t));
    }
    #n = (e) =>
      this.visibility
        ? (() => {
            switch (this.visibility) {
              case `hidden`:
                return Vc(() => gc(e.isHidden()));
              case `visible`:
                return Vc(() => gc(e.isVisible()));
            }
          })().pipe(gl(hs), yl({ delay: 100 }), ll())
        : Is;
    _clone() {
      return new e(this.#e, this.#t).copyOptions(this);
    }
    _wait(e) {
      let t = e?.signal;
      return Vc(() =>
        typeof this.#t == `string`
          ? gc(this.#e.waitForSelector(this.#t, { visible: !1, timeout: this._timeout, signal: t }))
          : _c(this.#t)
      ).pipe(
        tl((e) => e !== null),
        ml(),
        this.operators.conditions([this.#n], t)
      );
    }
  };
function Jd(e) {
  for (let t of e) if (!(t instanceof Hd)) throw Error(`Unknown locator for race candidate`);
  return e;
}
var Yd = class e extends Hd {
    static create(t) {
      return new e(Jd(t));
    }
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    _clone() {
      return new e(this.#e.map((e) => e.clone())).copyOptions(this);
    }
    _wait(e) {
      return nl(...this.#e.map((t) => t._wait(e)));
    }
  },
  Xd = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Zd = function (e, t, n, r, i, a) {
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
  Qd = function (e, t, n) {
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
  $d = (function (e) {
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
  ef = function (e, t, n) {
    return (
      typeof t == `symbol` && (t = t.description ? `[${t.description}]` : ``),
      Object.defineProperty(e, 'name', { configurable: !0, value: n ? `${n} ${t}` : t })
    );
  };
function tf(e, t) {
  return async function (...t) {
    if (this.realm === this.frame.isolatedRealm()) return await e.call(this, ...t);
    let n;
    this.isolatedHandle
      ? (n = this.isolatedHandle)
      : (this.isolatedHandle = n = await this.frame.isolatedRealm().adoptHandle(this));
    let r = await e.call(n, ...t);
    return r === n
      ? this
      : r instanceof Rd
        ? await this.realm.transferHandle(r)
        : (Array.isArray(r) &&
            (await Promise.all(
              r.map(async (e, t, n) => {
                e instanceof Rd && (n[t] = await this.realm.transferHandle(e));
              })
            )),
          r instanceof Map &&
            (await Promise.all(
              [...r.entries()].map(async ([e, t]) => {
                t instanceof Rd && r.set(e, await this.realm.transferHandle(t));
              })
            )),
          r);
  };
}
var nf = (() => {
  let e = Rd,
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
    h,
    g,
    _,
    v,
    y,
    b,
    x,
    S,
    C,
    w,
    T,
    E,
    D,
    O,
    ee,
    k,
    te,
    ne,
    re,
    ie;
  return class A extends e {
    static {
      let A =
        typeof Symbol == `function` && Symbol.metadata
          ? Object.create(e[Symbol.metadata] ?? null)
          : void 0;
      ((n = [J(), tf]),
        (r = [J(), tf]),
        (i = [J(), tf]),
        (a = [J(), tf]),
        (o = [J()]),
        (s = [tf]),
        (l = [J(), tf]),
        (u = [J(), tf]),
        (d = [J(), tf]),
        (f = [J(), tf]),
        (p = [J(), tf]),
        (m = [J(), tf]),
        (h = [J(), tf]),
        (g = [J(), tf]),
        (_ = [J(), tf]),
        (v = [J(), tf]),
        (y = [J(), tf]),
        (b = [J(), tf]),
        (x = [J(), tf]),
        (S = [J(), tf]),
        (C = [J(), tf]),
        (w = [J(), tf]),
        (T = [J(), tf]),
        (E = [J(), tf]),
        (D = [J(), tf]),
        (O = [J(), tf]),
        (ee = [J(), tf]),
        (k = [J(), tf]),
        (te = [J(), tf]),
        (ne = [J(), tf]),
        (re = [J(), tf]),
        (ie = [J()]),
        Zd(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `getProperty`,
            static: !1,
            private: !1,
            access: { has: (e) => `getProperty` in e, get: (e) => e.getProperty },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          r,
          {
            kind: `method`,
            name: `getProperties`,
            static: !1,
            private: !1,
            access: { has: (e) => `getProperties` in e, get: (e) => e.getProperties },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          i,
          {
            kind: `method`,
            name: `jsonValue`,
            static: !1,
            private: !1,
            access: { has: (e) => `jsonValue` in e, get: (e) => e.jsonValue },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          a,
          {
            kind: `method`,
            name: `$`,
            static: !1,
            private: !1,
            access: { has: (e) => `$` in e, get: (e) => e.$ },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          o,
          {
            kind: `method`,
            name: `$$`,
            static: !1,
            private: !1,
            access: { has: (e) => `$$` in e, get: (e) => e.$$ },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          (c = {
            value: ef(async function (e) {
              return await this.#t(e);
            }, `#$$`),
          }),
          s,
          {
            kind: `method`,
            name: `#$$`,
            static: !1,
            private: !0,
            access: { has: (e) => #e in e, get: (e) => e.#e },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          l,
          {
            kind: `method`,
            name: `waitForSelector`,
            static: !1,
            private: !1,
            access: { has: (e) => `waitForSelector` in e, get: (e) => e.waitForSelector },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          u,
          {
            kind: `method`,
            name: `isVisible`,
            static: !1,
            private: !1,
            access: { has: (e) => `isVisible` in e, get: (e) => e.isVisible },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          d,
          {
            kind: `method`,
            name: `isHidden`,
            static: !1,
            private: !1,
            access: { has: (e) => `isHidden` in e, get: (e) => e.isHidden },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          f,
          {
            kind: `method`,
            name: `toElement`,
            static: !1,
            private: !1,
            access: { has: (e) => `toElement` in e, get: (e) => e.toElement },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          p,
          {
            kind: `method`,
            name: `clickablePoint`,
            static: !1,
            private: !1,
            access: { has: (e) => `clickablePoint` in e, get: (e) => e.clickablePoint },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          m,
          {
            kind: `method`,
            name: `hover`,
            static: !1,
            private: !1,
            access: { has: (e) => `hover` in e, get: (e) => e.hover },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          h,
          {
            kind: `method`,
            name: `click`,
            static: !1,
            private: !1,
            access: { has: (e) => `click` in e, get: (e) => e.click },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          g,
          {
            kind: `method`,
            name: `drag`,
            static: !1,
            private: !1,
            access: { has: (e) => `drag` in e, get: (e) => e.drag },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          _,
          {
            kind: `method`,
            name: `dragEnter`,
            static: !1,
            private: !1,
            access: { has: (e) => `dragEnter` in e, get: (e) => e.dragEnter },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          v,
          {
            kind: `method`,
            name: `dragOver`,
            static: !1,
            private: !1,
            access: { has: (e) => `dragOver` in e, get: (e) => e.dragOver },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          y,
          {
            kind: `method`,
            name: `drop`,
            static: !1,
            private: !1,
            access: { has: (e) => `drop` in e, get: (e) => e.drop },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          b,
          {
            kind: `method`,
            name: `dragAndDrop`,
            static: !1,
            private: !1,
            access: { has: (e) => `dragAndDrop` in e, get: (e) => e.dragAndDrop },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          x,
          {
            kind: `method`,
            name: `select`,
            static: !1,
            private: !1,
            access: { has: (e) => `select` in e, get: (e) => e.select },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          S,
          {
            kind: `method`,
            name: `tap`,
            static: !1,
            private: !1,
            access: { has: (e) => `tap` in e, get: (e) => e.tap },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          C,
          {
            kind: `method`,
            name: `touchStart`,
            static: !1,
            private: !1,
            access: { has: (e) => `touchStart` in e, get: (e) => e.touchStart },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          w,
          {
            kind: `method`,
            name: `touchMove`,
            static: !1,
            private: !1,
            access: { has: (e) => `touchMove` in e, get: (e) => e.touchMove },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          T,
          {
            kind: `method`,
            name: `touchEnd`,
            static: !1,
            private: !1,
            access: { has: (e) => `touchEnd` in e, get: (e) => e.touchEnd },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          E,
          {
            kind: `method`,
            name: `focus`,
            static: !1,
            private: !1,
            access: { has: (e) => `focus` in e, get: (e) => e.focus },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          D,
          {
            kind: `method`,
            name: `type`,
            static: !1,
            private: !1,
            access: { has: (e) => `type` in e, get: (e) => e.type },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          O,
          {
            kind: `method`,
            name: `press`,
            static: !1,
            private: !1,
            access: { has: (e) => `press` in e, get: (e) => e.press },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          ee,
          {
            kind: `method`,
            name: `boundingBox`,
            static: !1,
            private: !1,
            access: { has: (e) => `boundingBox` in e, get: (e) => e.boundingBox },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          k,
          {
            kind: `method`,
            name: `boxModel`,
            static: !1,
            private: !1,
            access: { has: (e) => `boxModel` in e, get: (e) => e.boxModel },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          te,
          {
            kind: `method`,
            name: `screenshot`,
            static: !1,
            private: !1,
            access: { has: (e) => `screenshot` in e, get: (e) => e.screenshot },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          ne,
          {
            kind: `method`,
            name: `isIntersectingViewport`,
            static: !1,
            private: !1,
            access: {
              has: (e) => `isIntersectingViewport` in e,
              get: (e) => e.isIntersectingViewport,
            },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          re,
          {
            kind: `method`,
            name: `scrollIntoView`,
            static: !1,
            private: !1,
            access: { has: (e) => `scrollIntoView` in e, get: (e) => e.scrollIntoView },
            metadata: A,
          },
          null,
          t
        ),
        Zd(
          this,
          null,
          ie,
          {
            kind: `method`,
            name: `asLocator`,
            static: !1,
            private: !1,
            access: { has: (e) => `asLocator` in e, get: (e) => e.asLocator },
            metadata: A,
          },
          null,
          t
        ),
        A &&
          Object.defineProperty(this, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: A,
          }));
    }
    isolatedHandle = Xd(this, t);
    handle;
    constructor(e) {
      (super(), (this.handle = e), (this[Fu] = !0));
    }
    get id() {
      return this.handle.id;
    }
    get disposed() {
      return this.handle.disposed;
    }
    async getProperty(e) {
      return await this.handle.getProperty(e);
    }
    async getProperties() {
      return await this.handle.getProperties();
    }
    async evaluate(e, ...t) {
      return ((e = tu(this.evaluate.name, e)), await this.handle.evaluate(e, ...t));
    }
    async evaluateHandle(e, ...t) {
      return ((e = tu(this.evaluateHandle.name, e)), await this.handle.evaluateHandle(e, ...t));
    }
    async jsonValue() {
      return await this.handle.jsonValue();
    }
    toString() {
      return this.handle.toString();
    }
    remoteObject() {
      return this.handle.remoteObject();
    }
    async dispose() {
      await Promise.all([this.handle.dispose(), this.isolatedHandle?.dispose()]);
    }
    asElement() {
      return this;
    }
    async $(e) {
      let { updatedSelector: t, QueryHandler: n } = Cd(e);
      return await n.queryOne(this, t);
    }
    async $$(e, t) {
      return t?.isolate === !1 ? await this.#t(e) : await this.#e(e);
    }
    get #e() {
      return c.value;
    }
    async #t(e) {
      let { updatedSelector: t, QueryHandler: n } = Cd(e);
      return await Pu.collect(n.queryAll(this, t));
    }
    async $eval(e, t, ...n) {
      let r = { stack: [], error: void 0, hasError: !1 };
      try {
        t = tu(this.$eval.name, t);
        let i = Qd(r, await this.$(e), !1);
        if (!i) throw Error(`Error: failed to find element matching selector "${e}"`);
        return await i.evaluate(t, ...n);
      } catch (e) {
        ((r.error = e), (r.hasError = !0));
      } finally {
        $d(r);
      }
    }
    async $$eval(e, t, ...n) {
      let r = { stack: [], error: void 0, hasError: !1 };
      try {
        t = tu(this.$$eval.name, t);
        let i = await this.$$(e),
          a = Qd(r, await this.evaluateHandle((e, ...t) => t, ...i), !1),
          [o] = await Promise.all([a.evaluate(t, ...n), ...i.map((e) => e.dispose())]);
        return o;
      } catch (e) {
        ((r.error = e), (r.hasError = !0));
      } finally {
        $d(r);
      }
    }
    async waitForSelector(e, t = {}) {
      let { updatedSelector: n, QueryHandler: r, polling: i } = Cd(e);
      return await r.waitFor(this, n, { polling: i, ...t });
    }
    async #n(e) {
      return await this.evaluate(
        async (e, t, n) => !!t.checkVisibility(e, n),
        Yu.create((e) => e.puppeteerUtil),
        e
      );
    }
    async isVisible() {
      return await this.#n(!0);
    }
    async isHidden() {
      return await this.#n(!1);
    }
    async toElement(e) {
      if (!(await this.evaluate((e, t) => e.nodeName === t.toUpperCase(), e)))
        throw Error(`Element is not a(n) \`${e}\` element`);
      return this;
    }
    async clickablePoint(e) {
      let t = await this.#r();
      if (!t) throw Error(`Node is either not clickable or not an Element`);
      return e === void 0
        ? { x: t.x + t.width / 2, y: t.y + t.height / 2 }
        : { x: t.x + e.x, y: t.y + e.y };
    }
    async hover() {
      await this.scrollIntoViewIfNeeded();
      let { x: e, y: t } = await this.clickablePoint();
      await this.frame.page().mouse.move(e, t);
    }
    async click(e = {}) {
      await this.scrollIntoViewIfNeeded();
      let { x: t, y: n } = await this.clickablePoint(e.offset);
      try {
        await this.frame.page().mouse.click(t, n, e);
      } finally {
        e.debugHighlight &&
          (await this.frame.page().evaluate(
            (e, t) => {
              let n = document.createElement(`div`);
              ((n.innerHTML = `<style>
        @scope {
          :scope {
              position: fixed;
              left: ${e}px;
              top: ${t}px;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              animation: colorChange 10s 1 normal;
              animation-fill-mode: forwards;
          }

          @keyframes colorChange {
              from {
                  background-color: red;
              }
              to {
                  background-color: #FADADD00;
              }
          }
        }
      </style>`),
                n.addEventListener(
                  `animationend`,
                  () => {
                    n.remove();
                  },
                  { once: !0 }
                ),
                document.body.append(n));
            },
            t,
            n
          ));
      }
    }
    async drag(e) {
      await this.scrollIntoViewIfNeeded();
      let t = this.frame.page();
      if (t.isDragInterceptionEnabled()) {
        let n = await this.clickablePoint();
        return (e instanceof A && (e = await e.clickablePoint()), await t.mouse.drag(n, e));
      }
      try {
        (t._isDragging || ((t._isDragging = !0), await this.hover(), await t.mouse.down()),
          e instanceof A ? await e.hover() : await t.mouse.move(e.x, e.y));
      } catch (e) {
        throw ((t._isDragging = !1), e);
      }
    }
    async dragEnter(e = { items: [], dragOperationsMask: 1 }) {
      let t = this.frame.page();
      await this.scrollIntoViewIfNeeded();
      let n = await this.clickablePoint();
      await t.mouse.dragEnter(n, e);
    }
    async dragOver(e = { items: [], dragOperationsMask: 1 }) {
      let t = this.frame.page();
      await this.scrollIntoViewIfNeeded();
      let n = await this.clickablePoint();
      await t.mouse.dragOver(n, e);
    }
    async drop(e = { items: [], dragOperationsMask: 1 }) {
      let t = this.frame.page();
      if (`items` in e) {
        await this.scrollIntoViewIfNeeded();
        let n = await this.clickablePoint();
        await t.mouse.drop(n, e);
      } else (await e.drag(this), (t._isDragging = !1), await t.mouse.up());
    }
    async dragAndDrop(e, t) {
      let n = this.frame.page();
      (K(n.isDragInterceptionEnabled(), `Drag Interception is not enabled!`),
        await this.scrollIntoViewIfNeeded());
      let r = await this.clickablePoint(),
        i = await e.clickablePoint();
      await n.mouse.dragAndDrop(r, i, t);
    }
    async select(...e) {
      for (let t of e)
        K(ru(t), `Values must be strings. Found value "` + t + `" of type "` + typeof t + `"`);
      return await this.evaluate((e, t) => {
        let n = new Set(t);
        if (!(e instanceof HTMLSelectElement)) throw Error(`Element is not a <select> element.`);
        let r = new Set();
        if (e.multiple)
          for (let t of e.options) ((t.selected = n.has(t.value)), t.selected && r.add(t.value));
        else {
          for (let t of e.options) t.selected = !1;
          for (let t of e.options)
            if (n.has(t.value)) {
              ((t.selected = !0), r.add(t.value));
              break;
            }
        }
        return (
          e.dispatchEvent(new Event(`input`, { bubbles: !0 })),
          e.dispatchEvent(new Event(`change`, { bubbles: !0 })),
          [...r.values()]
        );
      }, e);
    }
    async tap() {
      await this.scrollIntoViewIfNeeded();
      let { x: e, y: t } = await this.clickablePoint();
      await this.frame.page().touchscreen.tap(e, t);
    }
    async touchStart() {
      await this.scrollIntoViewIfNeeded();
      let { x: e, y: t } = await this.clickablePoint();
      return await this.frame.page().touchscreen.touchStart(e, t);
    }
    async touchMove(e) {
      await this.scrollIntoViewIfNeeded();
      let { x: t, y: n } = await this.clickablePoint();
      if (e) return await e.move(t, n);
      await this.frame.page().touchscreen.touchMove(t, n);
    }
    async touchEnd() {
      (await this.scrollIntoViewIfNeeded(), await this.frame.page().touchscreen.touchEnd());
    }
    async focus() {
      await this.evaluate((e) => {
        if (!(e instanceof HTMLElement)) throw Error(`Cannot focus non-HTMLElement`);
        return e.focus();
      });
    }
    async type(e, t) {
      (await this.focus(), await this.frame.page().keyboard.type(e, t));
    }
    async press(e, t) {
      (await this.focus(), await this.frame.page().keyboard.press(e, t));
    }
    async #r() {
      let e = await this.evaluate((e) =>
        e instanceof Element
          ? [...e.getClientRects()].map((e) => ({
              x: e.x,
              y: e.y,
              width: e.width,
              height: e.height,
            }))
          : null
      );
      if (!e?.length) return null;
      await this.#i(e);
      let t = this.frame,
        n;
      for (; (n = t?.parentFrame()); ) {
        let r = { stack: [], error: void 0, hasError: !1 };
        try {
          let i = Qd(r, await t.frameElement(), !1);
          if (!i) throw Error(`Unsupported frame type`);
          let a = await i.evaluate((e) => {
            if (e.getClientRects().length === 0) return null;
            let t = e.getBoundingClientRect(),
              n = window.getComputedStyle(e);
            return {
              left: t.left + parseInt(n.paddingLeft, 10) + parseInt(n.borderLeftWidth, 10),
              top: t.top + parseInt(n.paddingTop, 10) + parseInt(n.borderTopWidth, 10),
            };
          });
          if (!a) return null;
          for (let t of e) ((t.x += a.left), (t.y += a.top));
          (await i.#i(e), (t = n));
        } catch (e) {
          ((r.error = e), (r.hasError = !0));
        } finally {
          $d(r);
        }
      }
      let r = e.find((e) => e.width >= 1 && e.height >= 1);
      return r ? { x: r.x, y: r.y, height: r.height, width: r.width } : null;
    }
    async #i(e) {
      let { documentWidth: t, documentHeight: n } = await this.frame
        .isolatedRealm()
        .evaluate(() => ({
          documentWidth: document.documentElement.clientWidth,
          documentHeight: document.documentElement.clientHeight,
        }));
      for (let r of e) rf(r, t, n);
    }
    async boundingBox() {
      let e = await this.evaluate((e) => {
        if (!(e instanceof Element) || e.getClientRects().length === 0) return null;
        let t = e.getBoundingClientRect();
        return { x: t.x, y: t.y, width: t.width, height: t.height };
      });
      if (!e) return null;
      let t = await this.#a();
      return t ? { x: e.x + t.x, y: e.y + t.y, height: e.height, width: e.width } : null;
    }
    async boxModel() {
      let e = await this.evaluate((e) => {
        if (!(e instanceof Element) || e.getClientRects().length === 0) return null;
        let t = e.getBoundingClientRect(),
          n = window.getComputedStyle(e),
          r = {
            padding: {
              left: parseInt(n.paddingLeft, 10),
              top: parseInt(n.paddingTop, 10),
              right: parseInt(n.paddingRight, 10),
              bottom: parseInt(n.paddingBottom, 10),
            },
            margin: {
              left: -parseInt(n.marginLeft, 10),
              top: -parseInt(n.marginTop, 10),
              right: -parseInt(n.marginRight, 10),
              bottom: -parseInt(n.marginBottom, 10),
            },
            border: {
              left: parseInt(n.borderLeft, 10),
              top: parseInt(n.borderTop, 10),
              right: parseInt(n.borderRight, 10),
              bottom: parseInt(n.borderBottom, 10),
            },
          },
          i = [
            { x: t.left, y: t.top },
            { x: t.left + t.width, y: t.top },
            { x: t.left + t.width, y: t.top + t.height },
            { x: t.left, y: t.top + t.height },
          ],
          a = o(i, r.border);
        return {
          content: o(a, r.padding),
          padding: a,
          border: i,
          margin: o(i, r.margin),
          width: t.width,
          height: t.height,
        };
        function o(e, t) {
          return [
            { x: e[0].x + t.left, y: e[0].y + t.top },
            { x: e[1].x - t.right, y: e[1].y + t.top },
            { x: e[2].x - t.right, y: e[2].y - t.bottom },
            { x: e[3].x + t.left, y: e[3].y - t.bottom },
          ];
        }
      });
      if (!e) return null;
      let t = await this.#a();
      if (!t) return null;
      for (let n of [`content`, `padding`, `border`, `margin`])
        for (let r of e[n]) ((r.x += t.x), (r.y += t.y));
      return e;
    }
    async #a() {
      let e = { x: 0, y: 0 },
        t = this.frame,
        n;
      for (; (n = t?.parentFrame()); ) {
        let r = { stack: [], error: void 0, hasError: !1 };
        try {
          let i = Qd(r, await t.frameElement(), !1);
          if (!i) throw Error(`Unsupported frame type`);
          let a = await i.evaluate((e) => {
            if (e.getClientRects().length === 0) return null;
            let t = e.getBoundingClientRect(),
              n = window.getComputedStyle(e);
            return {
              left: t.left + parseInt(n.paddingLeft, 10) + parseInt(n.borderLeftWidth, 10),
              top: t.top + parseInt(n.paddingTop, 10) + parseInt(n.borderTopWidth, 10),
            };
          });
          if (!a) return null;
          ((e.x += a.left), (e.y += a.top), (t = n));
        } catch (e) {
          ((r.error = e), (r.hasError = !0));
        } finally {
          $d(r);
        }
      }
      return e;
    }
    async screenshot(e = {}) {
      let { scrollIntoView: t = !0, clip: n } = e,
        r = this.frame.page();
      t && (await this.scrollIntoViewIfNeeded());
      let i = await this.#o(),
        [a, o] = await this.evaluate(() => {
          if (!window.visualViewport) throw Error(`window.visualViewport is not supported.`);
          return [window.visualViewport.pageLeft, window.visualViewport.pageTop];
        });
      return (
        (i.x += a),
        (i.y += o),
        n && ((i.x += n.x), (i.y += n.y), (i.height = n.height), (i.width = n.width)),
        await r.screenshot({ ...e, clip: i })
      );
    }
    async #o() {
      let e = await this.boundingBox();
      return (
        K(e, `Node is either not visible or not an HTMLElement`),
        K(e.width !== 0, `Node has 0 width.`),
        K(e.height !== 0, `Node has 0 height.`),
        e
      );
    }
    async assertConnectedElement() {
      let e = await this.evaluate(async (e) => {
        if (!e.isConnected) return `Node is detached from document`;
        if (e.nodeType !== Node.ELEMENT_NODE) return `Node is not of type HTMLElement`;
      });
      if (e) throw Error(e);
    }
    async scrollIntoViewIfNeeded() {
      (await this.isIntersectingViewport({ threshold: 1 })) || (await this.scrollIntoView());
    }
    async isIntersectingViewport(e = {}) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        await this.assertConnectedElement();
        let n = await this.#s();
        return await (Qd(t, n && (await n.#c()), !1) ?? this).evaluate(async (e, t) => {
          let n = await new Promise((t) => {
            let n = new IntersectionObserver((e) => {
              (t(e[0].intersectionRatio), n.disconnect());
            });
            n.observe(e);
          });
          return t === 1 ? n === 1 : n > t;
        }, e.threshold ?? 0);
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        $d(t);
      }
    }
    async scrollIntoView() {
      (await this.assertConnectedElement(),
        await this.evaluate(async (e) => {
          e.scrollIntoView({ block: `center`, inline: `center`, behavior: `instant` });
        }));
    }
    asLocator() {
      return qd.createFromHandle(this.frame, this);
    }
    async #s() {
      return (await this.evaluate((e) => e instanceof SVGElement)) ? this : null;
    }
    async #c() {
      return await this.evaluateHandle((e) => (e instanceof SVGSVGElement ? e : e.ownerSVGElement));
    }
  };
})();
function rf(e, t, n) {
  ((e.width = Math.max(e.x >= 0 ? Math.min(t - e.x, e.width) : Math.min(t, e.width + e.x), 0)),
    (e.height = Math.max(e.y >= 0 ? Math.min(n - e.y, e.height) : Math.min(n, e.height + e.y), 0)),
    (e.x = Math.max(e.x, 0)),
    (e.y = Math.max(e.y, 0)));
}
var af = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    constructor(e, t, n, r, i) {
      if (!e || !t) throw Error(`Extension ID and version are required`);
      ((this.#e = e), (this.#t = t), (this.#n = n), (this.#r = r), (this.#i = i));
    }
    get enabled() {
      return this.#i;
    }
    get path() {
      return this.#r;
    }
    get version() {
      return this.#t;
    }
    get name() {
      return this.#n;
    }
    get id() {
      return this.#e;
    }
  },
  of = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  sf = function (e, t, n, r, i, a) {
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
  cf = function (e, t, n) {
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
  lf = (function (e) {
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
  uf;
(function (e) {
  ((e.FrameNavigated = Symbol(`Frame.FrameNavigated`)),
    (e.FrameSwapped = Symbol(`Frame.FrameSwapped`)),
    (e.LifecycleEvent = Symbol(`Frame.LifecycleEvent`)),
    (e.FrameNavigatedWithinDocument = Symbol(`Frame.FrameNavigatedWithinDocument`)),
    (e.FrameDetached = Symbol(`Frame.FrameDetached`)),
    (e.FrameSwappedByActivation = Symbol(`Frame.FrameSwappedByActivation`)));
})((uf ||= {}));
var df = J((e) => `Attempted to use detached Frame '${e._id}'.`),
  ff = (() => {
    let e = Cu,
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
      h,
      g,
      _,
      v,
      y,
      b,
      x;
    return class extends e {
      static {
        let S =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((n = [df]),
          (r = [df]),
          (i = [df]),
          (a = [df]),
          (o = [df]),
          (s = [df]),
          (c = [df]),
          (l = [df]),
          (u = [df]),
          (d = [df]),
          (f = [df]),
          (p = [df]),
          (m = [df]),
          (h = [df]),
          (g = [df]),
          (_ = [df]),
          (v = [df]),
          (y = [df]),
          (b = [df]),
          (x = [df]),
          sf(
            this,
            null,
            n,
            {
              kind: `method`,
              name: `frameElement`,
              static: !1,
              private: !1,
              access: { has: (e) => `frameElement` in e, get: (e) => e.frameElement },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `evaluateHandle`,
              static: !1,
              private: !1,
              access: { has: (e) => `evaluateHandle` in e, get: (e) => e.evaluateHandle },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `evaluate`,
              static: !1,
              private: !1,
              access: { has: (e) => `evaluate` in e, get: (e) => e.evaluate },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `locator`,
              static: !1,
              private: !1,
              access: { has: (e) => `locator` in e, get: (e) => e.locator },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `$`,
              static: !1,
              private: !1,
              access: { has: (e) => `$` in e, get: (e) => e.$ },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `$$`,
              static: !1,
              private: !1,
              access: { has: (e) => `$$` in e, get: (e) => e.$$ },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            c,
            {
              kind: `method`,
              name: `$eval`,
              static: !1,
              private: !1,
              access: { has: (e) => `$eval` in e, get: (e) => e.$eval },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            l,
            {
              kind: `method`,
              name: `$$eval`,
              static: !1,
              private: !1,
              access: { has: (e) => `$$eval` in e, get: (e) => e.$$eval },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            u,
            {
              kind: `method`,
              name: `waitForSelector`,
              static: !1,
              private: !1,
              access: { has: (e) => `waitForSelector` in e, get: (e) => e.waitForSelector },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            d,
            {
              kind: `method`,
              name: `waitForFunction`,
              static: !1,
              private: !1,
              access: { has: (e) => `waitForFunction` in e, get: (e) => e.waitForFunction },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            f,
            {
              kind: `method`,
              name: `content`,
              static: !1,
              private: !1,
              access: { has: (e) => `content` in e, get: (e) => e.content },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            p,
            {
              kind: `method`,
              name: `addScriptTag`,
              static: !1,
              private: !1,
              access: { has: (e) => `addScriptTag` in e, get: (e) => e.addScriptTag },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            m,
            {
              kind: `method`,
              name: `addStyleTag`,
              static: !1,
              private: !1,
              access: { has: (e) => `addStyleTag` in e, get: (e) => e.addStyleTag },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            h,
            {
              kind: `method`,
              name: `click`,
              static: !1,
              private: !1,
              access: { has: (e) => `click` in e, get: (e) => e.click },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            g,
            {
              kind: `method`,
              name: `focus`,
              static: !1,
              private: !1,
              access: { has: (e) => `focus` in e, get: (e) => e.focus },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            _,
            {
              kind: `method`,
              name: `hover`,
              static: !1,
              private: !1,
              access: { has: (e) => `hover` in e, get: (e) => e.hover },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            v,
            {
              kind: `method`,
              name: `select`,
              static: !1,
              private: !1,
              access: { has: (e) => `select` in e, get: (e) => e.select },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            y,
            {
              kind: `method`,
              name: `tap`,
              static: !1,
              private: !1,
              access: { has: (e) => `tap` in e, get: (e) => e.tap },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            b,
            {
              kind: `method`,
              name: `type`,
              static: !1,
              private: !1,
              access: { has: (e) => `type` in e, get: (e) => e.type },
              metadata: S,
            },
            null,
            t
          ),
          sf(
            this,
            null,
            x,
            {
              kind: `method`,
              name: `title`,
              static: !1,
              private: !1,
              access: { has: (e) => `title` in e, get: (e) => e.title },
              metadata: S,
            },
            null,
            t
          ),
          S &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: S,
            }));
      }
      _id = of(this, t);
      _parentId;
      _name;
      _hasStartedLoading = !1;
      constructor() {
        super();
      }
      #e;
      #t() {
        return ((this.#e ||= this.mainRealm().evaluateHandle(() => document)), this.#e);
      }
      clearDocumentHandle() {
        this.#e = void 0;
      }
      async frameElement() {
        let e = { stack: [], error: void 0, hasError: !1 };
        try {
          let t = this.parentFrame();
          if (!t) return null;
          let n = cf(
            e,
            await t.isolatedRealm().evaluateHandle(() => document.querySelectorAll(`iframe,frame`)),
            !1
          );
          for await (let e of Ju(n)) {
            let n = { stack: [], error: void 0, hasError: !1 };
            try {
              let r = cf(n, e, !1);
              if ((await r.contentFrame())?._id === this._id)
                return await t.mainRealm().adoptHandle(r);
            } catch (e) {
              ((n.error = e), (n.hasError = !0));
            } finally {
              lf(n);
            }
          }
          return null;
        } catch (t) {
          ((e.error = t), (e.hasError = !0));
        } finally {
          lf(e);
        }
      }
      async evaluateHandle(e, ...t) {
        return (
          (e = tu(this.evaluateHandle.name, e)),
          await this.mainRealm().evaluateHandle(e, ...t)
        );
      }
      async evaluate(e, ...t) {
        return ((e = tu(this.evaluate.name, e)), await this.mainRealm().evaluate(e, ...t));
      }
      locator(e) {
        return typeof e == `string` ? qd.create(this, e) : Ud.create(this, e);
      }
      async $(e) {
        return await (await this.#t()).$(e);
      }
      async $$(e, t) {
        return await (await this.#t()).$$(e, t);
      }
      async $eval(e, t, ...n) {
        return ((t = tu(this.$eval.name, t)), await (await this.#t()).$eval(e, t, ...n));
      }
      async $$eval(e, t, ...n) {
        return ((t = tu(this.$$eval.name, t)), await (await this.#t()).$$eval(e, t, ...n));
      }
      async waitForSelector(e, t = {}) {
        let { updatedSelector: n, QueryHandler: r, polling: i } = Cd(e);
        return await r.waitFor(this, n, { polling: i, ...t });
      }
      async waitForFunction(e, t = {}, ...n) {
        return await this.mainRealm().waitForFunction(e, t, ...n);
      }
      async content() {
        return await this.evaluate(() => {
          let e = ``;
          for (let t of document.childNodes)
            switch (t) {
              case document.documentElement:
                e += document.documentElement.outerHTML;
                break;
              default:
                e += new XMLSerializer().serializeToString(t);
                break;
            }
          return e;
        });
      }
      async setFrameContent(e) {
        return await this.evaluate((e) => {
          (document.open(), document.write(e), document.close());
        }, e);
      }
      name() {
        return this._name || ``;
      }
      isDetached() {
        return this.detached;
      }
      get disposed() {
        return this.detached;
      }
      async addScriptTag(e) {
        let { content: t = ``, type: n } = e,
          { path: r } = e;
        if (+!!e.url + +!!r + +!!t != 1)
          throw Error('Exactly one of `url`, `path`, or `content` must be specified.');
        return (
          r &&
            ((t = await Nl.value.fs.promises.readFile(r, `utf8`)),
            (t += `//# sourceURL=${r.replace(/\n/g, ``)}`)),
          (n ??= `text/javascript`),
          await this.mainRealm().transferHandle(
            await this.isolatedRealm().evaluateHandle(
              async ({ url: e, id: t, type: n, content: r }) =>
                await new Promise((i, a) => {
                  let o = document.createElement(`script`);
                  ((o.type = n),
                    (o.text = r),
                    o.addEventListener(
                      `error`,
                      (e) => {
                        a(Error(e.message ?? `Could not load script`));
                      },
                      { once: !0 }
                    ),
                    t && (o.id = t),
                    e
                      ? ((o.src = e),
                        o.addEventListener(
                          `load`,
                          () => {
                            i(o);
                          },
                          { once: !0 }
                        ),
                        document.head.appendChild(o))
                      : (document.head.appendChild(o), i(o)));
                }),
              { ...e, type: n, content: t }
            )
          )
        );
      }
      async addStyleTag(e) {
        let { content: t = `` } = e,
          { path: n } = e;
        if (+!!e.url + +!!n + +!!t != 1)
          throw Error('Exactly one of `url`, `path`, or `content` must be specified.');
        return (
          n &&
            ((t = await Nl.value.fs.promises.readFile(n, `utf8`)),
            (t += `/*# sourceURL=` + n.replace(/\n/g, ``) + `*/`),
            (e.content = t)),
          await this.mainRealm().transferHandle(
            await this.isolatedRealm().evaluateHandle(
              async ({ url: e, content: t }) =>
                await new Promise((n, r) => {
                  let i;
                  if (!e)
                    ((i = document.createElement(`style`)),
                      i.appendChild(document.createTextNode(t)));
                  else {
                    let t = document.createElement(`link`);
                    ((t.rel = `stylesheet`), (t.href = e), (i = t));
                  }
                  return (
                    i.addEventListener(
                      `load`,
                      () => {
                        n(i);
                      },
                      { once: !0 }
                    ),
                    i.addEventListener(
                      `error`,
                      (e) => {
                        r(Error(e.message ?? `Could not load style`));
                      },
                      { once: !0 }
                    ),
                    document.head.appendChild(i),
                    i
                  );
                }),
              e
            )
          )
        );
      }
      async click(e, t = {}) {
        let n = { stack: [], error: void 0, hasError: !1 };
        try {
          let r = cf(n, await this.$(e), !1);
          (K(r, `No element found for selector: ${e}`), await r.click(t), await r.dispose());
        } catch (e) {
          ((n.error = e), (n.hasError = !0));
        } finally {
          lf(n);
        }
      }
      async focus(e) {
        let t = { stack: [], error: void 0, hasError: !1 };
        try {
          let n = cf(t, await this.$(e), !1);
          (K(n, `No element found for selector: ${e}`), await n.focus());
        } catch (e) {
          ((t.error = e), (t.hasError = !0));
        } finally {
          lf(t);
        }
      }
      async hover(e) {
        let t = { stack: [], error: void 0, hasError: !1 };
        try {
          let n = cf(t, await this.$(e), !1);
          (K(n, `No element found for selector: ${e}`), await n.hover());
        } catch (e) {
          ((t.error = e), (t.hasError = !0));
        } finally {
          lf(t);
        }
      }
      async select(e, ...t) {
        let n = { stack: [], error: void 0, hasError: !1 };
        try {
          let r = cf(n, await this.$(e), !1);
          return (K(r, `No element found for selector: ${e}`), await r.select(...t));
        } catch (e) {
          ((n.error = e), (n.hasError = !0));
        } finally {
          lf(n);
        }
      }
      async tap(e) {
        let t = { stack: [], error: void 0, hasError: !1 };
        try {
          let n = cf(t, await this.$(e), !1);
          (K(n, `No element found for selector: ${e}`), await n.tap());
        } catch (e) {
          ((t.error = e), (t.hasError = !0));
        } finally {
          lf(t);
        }
      }
      async type(e, t, n) {
        let r = { stack: [], error: void 0, hasError: !1 };
        try {
          let i = cf(r, await this.$(e), !1);
          (K(i, `No element found for selector: ${e}`), await i.type(t, n));
        } catch (e) {
          ((r.error = e), (r.hasError = !0));
        } finally {
          lf(r);
        }
      }
      async title() {
        return await this.isolatedRealm().evaluate(() => document.title);
      }
    };
  })(),
  pf = class {
    _interceptionId;
    _failureText = null;
    _response = null;
    _fromMemoryCache = !1;
    _redirectChain = [];
    interception = {
      enabled: !1,
      handled: !1,
      handlers: [],
      resolutionState: { action: mf.None },
      requestOverrides: {},
      response: null,
      abortReason: null,
    };
    constructor() {}
    continueRequestOverrides() {
      return this.interception.requestOverrides;
    }
    responseForRequest() {
      return this.interception.response;
    }
    abortErrorReason() {
      return this.interception.abortReason;
    }
    interceptResolutionState() {
      return this.interception.enabled
        ? this.interception.handled
          ? { action: mf.AlreadyHandled }
          : { ...this.interception.resolutionState }
        : { action: mf.Disabled };
    }
    isInterceptResolutionHandled() {
      return this.interception.handled;
    }
    enqueueInterceptAction(e) {
      this.interception.handlers.push(e);
    }
    async finalizeInterceptions() {
      (await this.interception.handlers.reduce((e, t) => e.then(t), Promise.resolve()),
        (this.interception.handlers = []));
      let { action: e } = this.interceptResolutionState();
      switch (e) {
        case `abort`:
          return await this._abort(this.interception.abortReason);
        case `respond`:
          if (this.interception.response === null)
            throw Error(`Response is missing for the interception`);
          return await this._respond(this.interception.response);
        case `continue`:
          return await this._continue(this.interception.requestOverrides);
      }
    }
    verifyInterception() {
      (K(this.interception.enabled, `Request Interception is not enabled!`),
        K(!this.interception.handled, `Request is already handled!`));
    }
    async continue(e = {}, t) {
      if ((this.verifyInterception(), this.canBeIntercepted())) {
        if (t === void 0) return await this._continue(e);
        if (
          ((this.interception.requestOverrides = e),
          this.interception.resolutionState.priority === void 0 ||
            t > this.interception.resolutionState.priority)
        ) {
          this.interception.resolutionState = { action: mf.Continue, priority: t };
          return;
        }
        if (t === this.interception.resolutionState.priority) {
          if (
            this.interception.resolutionState.action === `abort` ||
            this.interception.resolutionState.action === `respond`
          )
            return;
          this.interception.resolutionState.action = mf.Continue;
        }
      }
    }
    async respond(e, t) {
      if ((this.verifyInterception(), this.canBeIntercepted())) {
        if (t === void 0) return await this._respond(e);
        if (
          ((this.interception.response = e),
          this.interception.resolutionState.priority === void 0 ||
            t > this.interception.resolutionState.priority)
        ) {
          this.interception.resolutionState = { action: mf.Respond, priority: t };
          return;
        }
        if (t === this.interception.resolutionState.priority) {
          if (this.interception.resolutionState.action === `abort`) return;
          this.interception.resolutionState.action = mf.Respond;
        }
      }
    }
    async abort(e = `failed`, t) {
      if ((this.verifyInterception(), !this.canBeIntercepted())) return;
      let n = _f[e];
      if ((K(n, `Unknown error code: ` + e), t === void 0)) return await this._abort(n);
      if (
        ((this.interception.abortReason = n),
        this.interception.resolutionState.priority === void 0 ||
          t >= this.interception.resolutionState.priority)
      ) {
        this.interception.resolutionState = { action: mf.Abort, priority: t };
        return;
      }
    }
    static getResponse(e) {
      let t = ru(e) ? new TextEncoder().encode(e) : e;
      return { contentLength: t.byteLength, base64: Il(t) };
    }
  },
  mf;
(function (e) {
  ((e.Abort = `abort`),
    (e.Respond = `respond`),
    (e.Continue = `continue`),
    (e.Disabled = `disabled`),
    (e.None = `none`),
    (e.AlreadyHandled = `already-handled`));
})((mf ||= {}));
function hf(e) {
  let t = [];
  for (let n in e) {
    let r = e[n];
    if (!Object.is(r, void 0)) {
      let e = Array.isArray(r) ? r : [r];
      t.push(...e.map((e) => ({ name: n, value: e + `` })));
    }
  }
  return t;
}
var gf = {
    100: `Continue`,
    101: `Switching Protocols`,
    102: `Processing`,
    103: `Early Hints`,
    200: `OK`,
    201: `Created`,
    202: `Accepted`,
    203: `Non-Authoritative Information`,
    204: `No Content`,
    205: `Reset Content`,
    206: `Partial Content`,
    207: `Multi-Status`,
    208: `Already Reported`,
    226: `IM Used`,
    300: `Multiple Choices`,
    301: `Moved Permanently`,
    302: `Found`,
    303: `See Other`,
    304: `Not Modified`,
    305: `Use Proxy`,
    306: `Switch Proxy`,
    307: `Temporary Redirect`,
    308: `Permanent Redirect`,
    400: `Bad Request`,
    401: `Unauthorized`,
    402: `Payment Required`,
    403: `Forbidden`,
    404: `Not Found`,
    405: `Method Not Allowed`,
    406: `Not Acceptable`,
    407: `Proxy Authentication Required`,
    408: `Request Timeout`,
    409: `Conflict`,
    410: `Gone`,
    411: `Length Required`,
    412: `Precondition Failed`,
    413: `Payload Too Large`,
    414: `URI Too Long`,
    415: `Unsupported Media Type`,
    416: `Range Not Satisfiable`,
    417: `Expectation Failed`,
    418: `I'm a teapot`,
    421: `Misdirected Request`,
    422: `Unprocessable Entity`,
    423: `Locked`,
    424: `Failed Dependency`,
    425: `Too Early`,
    426: `Upgrade Required`,
    428: `Precondition Required`,
    429: `Too Many Requests`,
    431: `Request Header Fields Too Large`,
    451: `Unavailable For Legal Reasons`,
    500: `Internal Server Error`,
    501: `Not Implemented`,
    502: `Bad Gateway`,
    503: `Service Unavailable`,
    504: `Gateway Timeout`,
    505: `HTTP Version Not Supported`,
    506: `Variant Also Negotiates`,
    507: `Insufficient Storage`,
    508: `Loop Detected`,
    510: `Not Extended`,
    511: `Network Authentication Required`,
  },
  _f = {
    aborted: `Aborted`,
    accessdenied: `AccessDenied`,
    addressunreachable: `AddressUnreachable`,
    blockedbyclient: `BlockedByClient`,
    blockedbyresponse: `BlockedByResponse`,
    connectionaborted: `ConnectionAborted`,
    connectionclosed: `ConnectionClosed`,
    connectionfailed: `ConnectionFailed`,
    connectionrefused: `ConnectionRefused`,
    connectionreset: `ConnectionReset`,
    internetdisconnected: `InternetDisconnected`,
    namenotresolved: `NameNotResolved`,
    timedout: `TimedOut`,
    failed: `Failed`,
  };
function vf(e) {
  if (
    e.originalMessage.includes(`Invalid header`) ||
    e.originalMessage.includes(`Unsafe header`) ||
    e.originalMessage.includes(`Expected "header"`) ||
    e.originalMessage.includes(`invalid argument`)
  )
    throw e;
  q(e);
}
var yf = class {
  constructor() {}
  ok() {
    let e = this.status();
    return e === 0 || (e >= 200 && e <= 299);
  }
  async buffer() {
    let e = await this.content();
    return Buffer.from(e);
  }
  async text() {
    let e = await this.content();
    return new TextDecoder(`utf-8`, { fatal: !0 }).decode(e);
  }
  async json() {
    let e = await this.text();
    return JSON.parse(e);
  }
};
function bf() {
  let e = 0;
  return () => (e === 2 ** 53 - 1 && (e = 0), ++e);
}
var xf = class {
    constructor() {}
  },
  Sf = Object.freeze({
    Left: `left`,
    Right: `right`,
    Middle: `middle`,
    Back: `back`,
    Forward: `forward`,
  }),
  Cf = class {
    constructor() {}
  },
  wf = class {
    idGenerator = bf();
    touches = [];
    constructor() {}
    removeHandle(e) {
      let t = this.touches.indexOf(e);
      t !== -1 && this.touches.splice(t, 1);
    }
    async tap(e, t) {
      await (await this.touchStart(e, t)).end();
    }
    async touchMove(e, t) {
      let n = this.touches[0];
      if (!n) throw new Kl(`Must start a new Touch first`);
      return await n.move(e, t);
    }
    async touchEnd() {
      let e = this.touches.shift();
      if (!e) throw new Kl(`Must start a new Touch first`);
      await e.end();
    }
  },
  Tf = 3e4,
  Ef = class {
    #e;
    #t;
    constructor() {
      ((this.#e = null), (this.#t = null));
    }
    setDefaultTimeout(e) {
      this.#e = e;
    }
    setDefaultNavigationTimeout(e) {
      this.#t = e;
    }
    navigationTimeout() {
      return this.#t === null ? (this.#e === null ? Tf : this.#e) : this.#t;
    }
    timeout() {
      return this.#e === null ? Tf : this.#e;
    }
  },
  Df = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Of = function (e, t, n, r, i, a) {
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
  kf = function (e, t, n) {
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
  Af = (function (e) {
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
  );
function jf(e) {
  ((e.optimizeForSpeed ??= !1),
    (e.type ??= `png`),
    (e.fromSurface ??= !0),
    (e.fullPage ??= !1),
    (e.omitBackground ??= !1),
    (e.encoding ??= `binary`),
    (e.captureBeyondViewport ??= !0));
}
var Mf = (() => {
  let e = Cu,
    t = [],
    n;
  return class extends e {
    static {
      let r =
        typeof Symbol == `function` && Symbol.metadata
          ? Object.create(e[Symbol.metadata] ?? null)
          : void 0;
      (Of(
        this,
        null,
        n,
        {
          kind: `method`,
          name: `screenshot`,
          static: !1,
          private: !1,
          access: { has: (e) => `screenshot` in e, get: (e) => e.screenshot },
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
    _isDragging = (Df(this, t), !1);
    _timeoutSettings = new Ef();
    _tabId = ``;
    #e = new WeakMap();
    #t = new As(1);
    constructor() {
      (super(),
        bu(this, `request`)
          .pipe(
            Lc((e) =>
              Bc(
                _c(1),
                Zc(
                  bu(this, `requestfailed`),
                  bu(this, `requestfinished`),
                  bu(this, `response`).pipe(Sc((e) => e.request()))
                ).pipe(
                  tl((t) => t.id === e.id),
                  cl(1),
                  Sc(() => -1)
                )
              )
            ),
            _l((e, t) => _c(e + t), 0),
            Sl(bu(this, `close`)),
            bl(0)
          )
          .subscribe(this.#t));
    }
    on(e, t) {
      if (e !== `request`) return super.on(e, t);
      let n = this.#e.get(t);
      return (
        n === void 0 &&
          ((n = (e) => {
            e.enqueueInterceptAction(() => t(e));
          }),
          this.#e.set(t, n)),
        super.on(e, n)
      );
    }
    off(e, t) {
      return (e === `request` && (t = this.#e.get(t) || t), super.off(e, t));
    }
    get accessibility() {
      return this.mainFrame().accessibility;
    }
    locator(e) {
      return typeof e == `string` ? qd.create(this, e) : Ud.create(this, e);
    }
    locatorRace(e) {
      return Hd.race(e);
    }
    async $(e) {
      return await this.mainFrame().$(e);
    }
    async $$(e, t) {
      return await this.mainFrame().$$(e, t);
    }
    async evaluateHandle(e, ...t) {
      return (
        (e = tu(this.evaluateHandle.name, e)),
        await this.mainFrame().evaluateHandle(e, ...t)
      );
    }
    async $eval(e, t, ...n) {
      return ((t = tu(this.$eval.name, t)), await this.mainFrame().$eval(e, t, ...n));
    }
    async $$eval(e, t, ...n) {
      return ((t = tu(this.$$eval.name, t)), await this.mainFrame().$$eval(e, t, ...n));
    }
    async addScriptTag(e) {
      return await this.mainFrame().addScriptTag(e);
    }
    async addStyleTag(e) {
      return await this.mainFrame().addStyleTag(e);
    }
    url() {
      return this.mainFrame().url();
    }
    async content() {
      return await this.mainFrame().content();
    }
    async setContent(e, t) {
      await this.mainFrame().setContent(e, t);
    }
    async goto(e, t) {
      return await this.mainFrame().goto(e, t);
    }
    async waitForNavigation(e = {}) {
      return await this.mainFrame().waitForNavigation(e);
    }
    waitForRequest(e, t = {}) {
      let { timeout: n = this._timeoutSettings.timeout(), signal: r } = t;
      if (typeof e == `string`) {
        let t = e;
        e = (e) => e.url() === t;
      }
      return bc(
        bu(this, `request`).pipe(
          Su(e),
          vl(
            pu(n),
            xu(r),
            bu(this, `close`).pipe(
              Sc(() => {
                throw new Yl(`Page closed!`);
              })
            )
          )
        )
      );
    }
    waitForResponse(e, t = {}) {
      let { timeout: n = this._timeoutSettings.timeout(), signal: r } = t;
      if (typeof e == `string`) {
        let t = e;
        e = (e) => e.url() === t;
      }
      return bc(
        bu(this, `response`).pipe(
          Su(e),
          vl(
            pu(n),
            xu(r),
            bu(this, `close`).pipe(
              Sc(() => {
                throw new Yl(`Page closed!`);
              })
            )
          )
        )
      );
    }
    waitForNetworkIdle(e = {}) {
      return bc(this.waitForNetworkIdle$(e));
    }
    waitForNetworkIdle$(e = {}) {
      let {
        timeout: t = this._timeoutSettings.timeout(),
        idleTime: n = 500,
        concurrency: r = 0,
        signal: i,
      } = e;
      return this.#t.pipe(
        Sc((e) => e > r),
        fl(),
        xl((e) => (e ? Is : Xc(n))),
        Sc(() => {}),
        vl(
          pu(t),
          xu(i),
          bu(this, `close`).pipe(
            Sc(() => {
              throw new Yl(`Page closed!`);
            })
          )
        )
      );
    }
    async waitForFrame(e, t = {}) {
      let { timeout: n = this.getDefaultTimeout(), signal: r } = t,
        i = ru(e) ? (t) => e === t.url() : e;
      return await bc(
        Zc(bu(this, `frameattached`), bu(this, `framenavigated`), gc(this.frames())).pipe(
          Su(i),
          gl(),
          vl(
            pu(n),
            xu(r),
            bu(this, `close`).pipe(
              Sc(() => {
                throw new Yl(`Page closed.`);
              })
            )
          )
        )
      );
    }
    async emulate(e) {
      await Promise.all([
        this.setUserAgent({ userAgent: e.userAgent }),
        this.setViewport(e.viewport),
      ]);
    }
    async evaluate(e, ...t) {
      return ((e = tu(this.evaluate.name, e)), await this.mainFrame().evaluate(e, ...t));
    }
    async _maybeWriteTypedArrayToFile(e, t) {
      e && (await Nl.value.fs.promises.writeFile(e, t));
    }
    async screencast(e = {}) {
      let t = Nl.value.ScreenRecorder,
        [n, r, i] = await this.#i(),
        a;
      if (e.crop) {
        let { x: t, y: o, width: s, height: c } = Pf(Nf(e.crop));
        if (t < 0 || o < 0)
          throw Error('`crop.x` and `crop.y` must be greater than or equal to 0.');
        if (s <= 0 || c <= 0)
          throw Error('`crop.height` and `crop.width` must be greater than or equal to 0.');
        let l = n / i,
          u = r / i;
        if (t + s > l)
          throw Error(`\`crop.width\` cannot be larger than the viewport width (${l}).`);
        if (o + c > u)
          throw Error(`\`crop.height\` cannot be larger than the viewport height (${u}).`);
        a = { x: t * i, y: o * i, width: s * i, height: c * i };
      }
      if (e.speed !== void 0 && e.speed <= 0) throw Error('`speed` must be greater than 0.');
      if (e.scale !== void 0 && e.scale <= 0) throw Error('`scale` must be greater than 0.');
      let o = new t(this, n, r, { ...e, crop: a });
      try {
        await this._startScreencast();
      } catch (e) {
        throw (o.stop(), e);
      }
      if (e.path) {
        let { createWriteStream: t } = Nl.value.fs,
          n = t(e.path, `binary`);
        o.pipe(n);
      }
      return o;
    }
    #n = 0;
    #r;
    async _startScreencast() {
      (++this.#n,
        (this.#r ||= this.mainFrame()
          .client.send(`Page.startScreencast`, { format: `png` })
          .then(
            () =>
              new Promise((e) => this.mainFrame().client.once(`Page.screencastFrame`, () => e()))
          )),
        await this.#r);
    }
    async _stopScreencast() {
      (--this.#n,
        this.#r &&
          ((this.#r = void 0),
          this.#n === 0 && (await this.mainFrame().client.send(`Page.stopScreencast`))));
    }
    async #i() {
      let e = { stack: [], error: void 0, hasError: !1 };
      try {
        let t = this.viewport(),
          n = kf(e, new Ol(), !1);
        return (
          t &&
            t.deviceScaleFactor !== 0 &&
            (await this.setViewport({ ...t, deviceScaleFactor: 0 }),
            n.defer(() => {
              this.setViewport(t).catch(q);
            })),
          await this.mainFrame()
            .isolatedRealm()
            .evaluate(() => [
              window.visualViewport.width * window.devicePixelRatio,
              window.visualViewport.height * window.devicePixelRatio,
              window.devicePixelRatio,
            ])
        );
      } catch (t) {
        ((e.error = t), (e.hasError = !0));
      } finally {
        Af(e);
      }
    }
    async screenshot(e = {}) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        kf(t, await this.browserContext().startScreenshot(), !1);
        let n = { ...e, clip: e.clip ? { ...e.clip } : void 0 };
        if (n.type === void 0 && n.path !== void 0) {
          let e = n.path;
          switch (e.slice(e.lastIndexOf(`.`) + 1).toLowerCase()) {
            case `png`:
              n.type = `png`;
              break;
            case `jpeg`:
            case `jpg`:
              n.type = `jpeg`;
              break;
            case `webp`:
              n.type = `webp`;
              break;
          }
        }
        if (n.quality !== void 0) {
          if (n.quality < 0 || n.quality > 100)
            throw Error(`Expected 'quality' (${n.quality}) to be between 0 and 100, inclusive.`);
          if (n.type === void 0 || ![`jpeg`, `webp`].includes(n.type))
            throw Error(`${n.type ?? `png`} screenshots do not support 'quality'.`);
        }
        if (n.clip) {
          if (n.clip.width <= 0) throw Error(`'width' in 'clip' must be positive.`);
          if (n.clip.height <= 0) throw Error(`'height' in 'clip' must be positive.`);
        }
        jf(n);
        let r = kf(t, new Al(), !0);
        if (n.clip) {
          if (n.fullPage) throw Error(`'clip' and 'fullPage' are mutually exclusive`);
          n.clip = Pf(Nf(n.clip));
        } else if (n.fullPage) {
          if (!n.captureBeyondViewport) {
            let e = await this.mainFrame()
                .isolatedRealm()
                .evaluate(() => {
                  let e = document.documentElement;
                  return { width: e.scrollWidth, height: e.scrollHeight };
                }),
              t = this.viewport();
            (await this.setViewport({ ...t, ...e }),
              r.defer(async () => {
                await this.setViewport(t).catch(q);
              }));
          }
        } else n.captureBeyondViewport = !1;
        let i = await this._screenshot(n);
        if (n.encoding === `base64`) return i;
        let a = Pl(i, !0);
        return (await this._maybeWriteTypedArrayToFile(n.path, a), a);
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        let e = Af(t);
        e && (await e);
      }
    }
    async title() {
      return await this.mainFrame().title();
    }
    click(e, t) {
      return this.mainFrame().click(e, t);
    }
    focus(e) {
      return this.mainFrame().focus(e);
    }
    hover(e) {
      return this.mainFrame().hover(e);
    }
    select(e, ...t) {
      return this.mainFrame().select(e, ...t);
    }
    tap(e) {
      return this.mainFrame().tap(e);
    }
    type(e, t, n) {
      return this.mainFrame().type(e, t, n);
    }
    async waitForSelector(e, t = {}) {
      return await this.mainFrame().waitForSelector(e, t);
    }
    waitForFunction(e, t, ...n) {
      return this.mainFrame().waitForFunction(e, t, ...n);
    }
    [((n = [
      Ad(function () {
        return this.browser();
      }),
    ]),
    Tl)]() {
      this[El]().catch(q);
    }
    async [El]() {
      (await this.close(), await super[El]());
    }
  };
})();
function Nf(e) {
  return {
    ...e,
    ...(e.width < 0 ? { x: e.x + e.width, width: -e.width } : { x: e.x, width: e.width }),
    ...(e.height < 0 ? { y: e.y + e.height, height: -e.height } : { y: e.y, height: e.height }),
  };
}
function Pf(e) {
  let t = Math.round(e.x),
    n = Math.round(e.y),
    r = Math.round(e.width + e.x - t),
    i = Math.round(e.height + e.y - n);
  return { ...e, x: t, y: n, width: r, height: i };
}
var Ff = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o = Error(`Waiting failed`);
    #s;
    #c = Eu.create();
    #l;
    #u;
    #d = [];
    constructor(e, t, n, ...r) {
      switch (
        ((this.#e = e),
        (this.#t = t.polling),
        (this.#n = t.root),
        (this.#u = t.signal),
        this.#u?.addEventListener(`abort`, this.#f, { once: !0 }),
        typeof n)
      ) {
        case `string`:
          this.#r = `() => {return (${n});}`;
          break;
        default:
          this.#r = Vu(n);
          break;
      }
      ((this.#i = r),
        this.#e.taskManager.add(this),
        t.timeout &&
          ((this.#s = new Gl(`Waiting failed: ${t.timeout}ms exceeded`)),
          (this.#a = setTimeout(() => {
            this.terminate(this.#s);
          }, t.timeout))),
        this.rerun());
    }
    get result() {
      return this.#c.valueOrThrow();
    }
    async rerun() {
      for (let e of this.#d) e.abort();
      this.#d.length = 0;
      let e = new AbortController();
      this.#d.push(e);
      try {
        switch (this.#t) {
          case `raf`:
            this.#l = await this.#e.evaluateHandle(
              ({ RAFPoller: e, createFunction: t }, n, ...r) => {
                let i = t(n);
                return new e(() => i(...r));
              },
              Yu.create((e) => e.puppeteerUtil),
              this.#r,
              ...this.#i
            );
            break;
          case `mutation`:
            this.#l = await this.#e.evaluateHandle(
              ({ MutationPoller: e, createFunction: t }, n, r, ...i) => {
                let a = t(r);
                return new e(() => a(...i), n || document);
              },
              Yu.create((e) => e.puppeteerUtil),
              this.#n,
              this.#r,
              ...this.#i
            );
            break;
          default:
            this.#l = await this.#e.evaluateHandle(
              ({ IntervalPoller: e, createFunction: t }, n, r, ...i) => {
                let a = t(r);
                return new e(() => a(...i), n);
              },
              Yu.create((e) => e.puppeteerUtil),
              this.#t,
              this.#r,
              ...this.#i
            );
            break;
        }
        await this.#l.evaluate((e) => {
          e.start();
        });
        let e = await this.#l.evaluateHandle((e) => e.result());
        (this.#c.resolve(e), await this.terminate());
      } catch (t) {
        if (e.signal.aborted) return;
        let n = this.getBadError(t);
        n && ((this.#o.cause = n), await this.terminate(this.#o));
      }
    }
    async terminate(e) {
      if (
        (this.#e.taskManager.delete(this),
        this.#u?.removeEventListener(`abort`, this.#f),
        clearTimeout(this.#a),
        e && !this.#c.finished() && this.#c.reject(e),
        this.#l)
      )
        try {
          (await this.#l.evaluate(async (e) => {
            await e.stop();
          }),
            (this.#l &&= (await this.#l.dispose(), void 0)));
        } catch {}
    }
    getBadError(e) {
      return Iu(e)
        ? e.message.includes(`Execution context is not available in detached frame`)
          ? Error(`Waiting failed: Frame detached`)
          : e.message.includes(`Execution context was destroyed`) ||
              e.message.includes(`Cannot find context with specified id`) ||
              e.message.includes(`DiscardedBrowsingContextError`)
            ? void 0
            : e
        : Error(`WaitTask failed with an error`, { cause: e });
    }
    #f = () => {
      this.terminate(this.#u?.reason);
    };
  },
  If = class {
    #e = new Set();
    add(e) {
      this.#e.add(e);
    }
    delete(e) {
      this.#e.delete(e);
    }
    terminateAll(e) {
      for (let t of this.#e) t.terminate(e);
      this.#e.clear();
    }
    async rerunAll() {
      await Promise.all([...this.#e].map((e) => e.rerun()));
    }
  },
  Lf = class {
    timeoutSettings;
    taskManager = new If();
    constructor(e) {
      this.timeoutSettings = e;
    }
    async waitForFunction(e, t = {}, ...n) {
      let {
        polling: r = `raf`,
        timeout: i = this.timeoutSettings.timeout(),
        root: a,
        signal: o,
      } = t;
      if (typeof r == `number` && r < 0) throw Error(`Cannot poll with non-positive interval`);
      return await new Ff(this, { polling: r, root: a, timeout: i, signal: o }, e, ...n).result;
    }
    get disposed() {
      return this.#e;
    }
    #e = !1;
    dispose() {
      ((this.#e = !0),
        this.taskManager.terminateAll(Error(`waitForFunction failed: frame got detached.`)));
    }
    [Tl]() {
      this.dispose();
    }
  },
  Rf;
(function (e) {
  ((e.PAGE = `page`),
    (e.BACKGROUND_PAGE = `background_page`),
    (e.SERVICE_WORKER = `service_worker`),
    (e.SHARED_WORKER = `shared_worker`),
    (e.BROWSER = `browser`),
    (e.WEBVIEW = `webview`),
    (e.OTHER = `other`),
    (e.TAB = `tab`));
})((Rf ||= {}));
var zf = class {
    constructor() {}
    async worker() {
      return null;
    }
    async page() {
      return null;
    }
  },
  Bf;
(function (e) {
  ((e.Console = `console`), (e.Error = `error`));
})((Bf ||= {}));
var Vf = class extends Cu {
    timeoutSettings = new Ef();
    #e;
    constructor(e) {
      (super(), (this.#e = e));
    }
    url() {
      return this.#e;
    }
    async evaluate(e, ...t) {
      return ((e = tu(this.evaluate.name, e)), await this.mainRealm().evaluate(e, ...t));
    }
    async evaluateHandle(e, ...t) {
      return (
        (e = tu(this.evaluateHandle.name, e)),
        await this.mainRealm().evaluateHandle(e, ...t)
      );
    }
    async close() {
      throw new Jl(`WebWorker.close() is not supported`);
    }
  },
  Hf = function (e, t, n) {
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
  Uf = (function (e) {
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
  Wf = class {
    #e;
    #t;
    constructor(e, t = ``) {
      ((this.#e = e), (this.#t = t));
    }
    async snapshot(e = {}) {
      let { interestingOnly: t = !0, root: n = null, includeIframes: r = !1 } = e,
        { nodes: i } = await this.#e.environment.client.send(`Accessibility.getFullAXTree`, {
          frameId: this.#t,
        }),
        a;
      if (n) {
        let { node: e } = await this.#e.environment.client.send(`DOM.describeNode`, {
          objectId: n.id,
        });
        a = e.backendNodeId;
      }
      let o = Gf.createTree(this.#e, i),
        s = async (t) => {
          if (t.payload.role?.value === `Iframe`) {
            let n = { stack: [], error: void 0, hasError: !1 };
            try {
              if (!t.payload.backendDOMNodeId) return;
              let r = Hf(n, await this.#e.adoptBackendNode(t.payload.backendDOMNodeId), !1);
              if (!r || !(`contentFrame` in r)) return;
              let i = await r.contentFrame();
              if (!i) return;
              try {
                t.iframeSnapshot = (await i.accessibility.snapshot(e)) ?? void 0;
              } catch (e) {
                q(e);
              }
            } catch (e) {
              ((n.error = e), (n.hasError = !0));
            } finally {
              Uf(n);
            }
          }
          for (let e of t.children) await s(e);
        },
        c = o;
      if (!o || (r && (await s(o)), a && (c = o.find((e) => e.payload.backendDOMNodeId === a)), !c))
        return null;
      if (!t) return this.serializeTree(c)[0] ?? null;
      let l = new Set();
      return (this.collectInterestingNodes(l, o, !1), this.serializeTree(c, l)[0] ?? null);
    }
    serializeTree(e, t) {
      let n = [];
      for (let r of e.children) n.push(...this.serializeTree(r, t));
      if (t && !t.has(e)) return n;
      let r = e.serialize();
      return (
        n.length && (r.children = n),
        e.iframeSnapshot && ((r.children ||= []), r.children.push(e.iframeSnapshot)),
        [r]
      );
    }
    collectInterestingNodes(e, t, n) {
      if (((t.isInteresting(n) || t.iframeSnapshot) && e.add(t), !t.isLeafNode())) {
        n ||= t.isControl();
        for (let r of t.children) this.collectInterestingNodes(e, r, n);
      }
    }
  },
  Gf = class e {
    payload;
    children = [];
    iframeSnapshot;
    #e = !1;
    #t = !1;
    #n = !1;
    #r = !1;
    #i = !1;
    #a = !1;
    #o = !1;
    #s = !1;
    #c;
    #l;
    #u;
    #d;
    #f;
    #p;
    #m;
    #h;
    constructor(e, t) {
      ((this.payload = t),
        (this.#l = this.payload.role ? this.payload.role.value : `Unknown`),
        (this.#p = this.payload.ignored),
        (this.#c = this.payload.name ? this.payload.name.value : ``),
        (this.#u = this.payload.description ? this.payload.description.value : void 0),
        (this.#h = e));
      for (let e of this.payload.properties || [])
        (e.name === `editable` && ((this.#e = e.value.value === `richtext`), (this.#t = !0)),
          e.name === `focusable` && (this.#n = e.value.value),
          e.name === `hidden` && (this.#r = e.value.value),
          e.name === `busy` && (this.#i = e.value.value),
          e.name === `live` && (this.#f = e.value.value),
          e.name === `modal` && (this.#a = e.value.value),
          e.name === `roledescription` && (this.#d = e.value.value),
          e.name === `errormessage` && (this.#o = !0),
          e.name === `details` && (this.#s = !0));
    }
    #g() {
      return this.#e ? !1 : this.#t ? !0 : this.#l === `textbox` || this.#l === `searchbox`;
    }
    #_() {
      let e = this.#l;
      return e === `LineBreak` || e === `text` || e === `InlineTextBox` || e === `StaticText`;
    }
    #v() {
      if (this.#m === void 0) {
        this.#m = !1;
        for (let e of this.children)
          if (e.#n || e.#v()) {
            this.#m = !0;
            break;
          }
      }
      return this.#m;
    }
    find(e) {
      if (e(this)) return this;
      for (let t of this.children) {
        let n = t.find(e);
        if (n) return n;
      }
      return null;
    }
    isLeafNode() {
      if (!this.children.length || this.#g() || this.#_()) return !0;
      switch (this.#l) {
        case `doc-cover`:
        case `graphics-symbol`:
        case `img`:
        case `image`:
        case `Meter`:
        case `scrollbar`:
        case `slider`:
        case `separator`:
        case `progressbar`:
          return !0;
        default:
          break;
      }
      return this.#v() ? !1 : !!(this.#l === `heading` && this.#c);
    }
    isControl() {
      switch (this.#l) {
        case `button`:
        case `checkbox`:
        case `ColorWell`:
        case `combobox`:
        case `DisclosureTriangle`:
        case `listbox`:
        case `menu`:
        case `menubar`:
        case `menuitem`:
        case `menuitemcheckbox`:
        case `menuitemradio`:
        case `radio`:
        case `scrollbar`:
        case `searchbox`:
        case `slider`:
        case `spinbutton`:
        case `switch`:
        case `tab`:
        case `textbox`:
        case `tree`:
        case `treeitem`:
          return !0;
        default:
          return !1;
      }
    }
    isLandmark() {
      switch (this.#l) {
        case `banner`:
        case `complementary`:
        case `contentinfo`:
        case `form`:
        case `main`:
        case `navigation`:
        case `region`:
        case `search`:
          return !0;
        default:
          return !1;
      }
    }
    isInteresting(e) {
      return this.#l === `Ignored` || this.#r || this.#p
        ? !1
        : this.isLandmark() ||
            this.#n ||
            this.#e ||
            this.#i ||
            (this.#f && this.#f !== `off`) ||
            this.#a ||
            this.#o ||
            this.#s ||
            this.#d ||
            this.isControl()
          ? !0
          : e
            ? !1
            : this.isLeafNode() && (!!this.#c || !!this.#u);
    }
    serialize() {
      let e = new Map();
      for (let t of this.payload.properties || []) e.set(t.name.toLowerCase(), t.value.value);
      (this.payload.name && e.set(`name`, this.payload.name.value),
        this.payload.value && e.set(`value`, this.payload.value.value),
        this.payload.description && e.set(`description`, this.payload.description.value));
      let t = {
          role: this.#l,
          elementHandle: async () => {
            let e = { stack: [], error: void 0, hasError: !1 };
            try {
              return this.payload.backendDOMNodeId
                ? await Hf(
                    e,
                    await this.#h.adoptBackendNode(this.payload.backendDOMNodeId),
                    !1
                  ).evaluateHandle((e) => (e.nodeType === Node.TEXT_NODE ? e.parentElement : e))
                : null;
            } catch (t) {
              ((e.error = t), (e.hasError = !0));
            } finally {
              Uf(e);
            }
          },
          backendNodeId: this.payload.backendDOMNodeId,
          loaderId: this.#h.environment._loaderId,
        },
        n = [`name`, `value`, `description`, `keyshortcuts`, `roledescription`, `valuetext`, `url`],
        r = (t) => e.get(t);
      for (let i of n) e.has(i) && (t[i] = r(i));
      let i = [
          `disabled`,
          `expanded`,
          `focused`,
          `modal`,
          `multiline`,
          `multiselectable`,
          `readonly`,
          `required`,
          `selected`,
          `busy`,
          `atomic`,
        ],
        a = (t) => !!e.get(t);
      for (let n of i)
        (n === `focused` && this.#l === `RootWebArea`) || (e.has(n) && (t[n] = a(n)));
      for (let n of [`checked`, `pressed`]) {
        if (!e.has(n)) continue;
        let r = e.get(n);
        t[n] = r === `mixed` ? `mixed` : r === `true`;
      }
      let o = [`level`, `valuemax`, `valuemin`],
        s = (t) => e.get(t);
      for (let n of o) e.has(n) && (t[n] = s(n));
      let c = [
          `autocomplete`,
          `haspopup`,
          `invalid`,
          `orientation`,
          `live`,
          `relevant`,
          `errormessage`,
          `details`,
        ],
        l = (t) => e.get(t);
      for (let e of c) {
        let n = l(e);
        !n || n === `false` || (t[e] = l(e));
      }
      return t;
    }
    static createTree(t, n) {
      let r = new Map();
      for (let i of n) r.set(i.nodeId, new e(t, i));
      for (let e of r.values())
        for (let t of e.payload.childIds || []) {
          let n = r.get(t);
          n && e.children.push(n);
        }
      return r.values().next().value ?? null;
    }
  },
  Kf = function (e, t, n) {
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
  qf = (function (e) {
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
  Jf = class {
    #e;
    #t;
    #n;
    constructor(e, t, n) {
      ((this.#e = e), (this.#t = t), (this.#n = n));
    }
    get name() {
      return this.#e;
    }
    get initSource() {
      return this.#n;
    }
    async run(e, t, n, r) {
      let i = new Ol();
      try {
        if (!r) {
          let r = { stack: [], error: void 0, hasError: !1 };
          try {
            let a = await Kf(
              r,
              await e.evaluateHandle((e, t) => globalThis[e].args.get(t), this.#e, t),
              !1
            ).getProperties();
            for (let [e, t] of a)
              if (e in n)
                switch (t.remoteObject().subtype) {
                  case `node`:
                    n[+e] = t;
                    break;
                  default:
                    i.use(t);
                }
              else i.use(t);
          } catch (e) {
            ((r.error = e), (r.hasError = !0));
          } finally {
            qf(r);
          }
        }
        await e.evaluate(
          (e, t, n) => {
            let r = globalThis[e].callbacks;
            (r.get(t).resolve(n), r.delete(t));
          },
          this.#e,
          t,
          await this.#t(...n)
        );
        for (let e of n) e instanceof Rd && i.use(e);
      } catch (n) {
        Iu(n)
          ? await e
              .evaluate(
                (e, t, n, r) => {
                  let i = Error(n);
                  i.stack = r;
                  let a = globalThis[e].callbacks;
                  (a.get(t).reject(i), a.delete(t));
                },
                this.#e,
                t,
                n.message,
                n.stack
              )
              .catch(q)
          : await e
              .evaluate(
                (e, t, n) => {
                  let r = globalThis[e].callbacks;
                  (r.get(t).reject(n), r.delete(t));
                },
                this.#e,
                t,
                n
              )
              .catch(q);
      }
    }
  },
  Yf = class {
    #e;
    constructor(e) {
      this.#e = e;
    }
    async emulateAdapter(e, t = !0) {
      (await this.#e.send(`BluetoothEmulation.disable`),
        await this.#e.send(`BluetoothEmulation.enable`, { state: e, leSupported: t }));
    }
    async disableEmulation() {
      await this.#e.send(`BluetoothEmulation.disable`);
    }
    async simulatePreconnectedPeripheral(e) {
      await this.#e.send(`BluetoothEmulation.simulatePreconnectedPeripheral`, e);
    }
  },
  Xf = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o;
    constructor(e, t, n, r, i, a, o) {
      ((this.#e = e),
        (this.#t = t),
        (this.#n = n),
        (this.#r = r),
        (this.#i = i),
        (this.#a = a),
        (this.#o = o));
    }
    type() {
      return this.#e;
    }
    text() {
      return this.#t;
    }
    args() {
      return this.#n;
    }
    location() {
      return this.#r[0] ?? (this.#i ? { url: this.#i.url() } : {});
    }
    stackTrace() {
      return this.#r;
    }
    _rawStackTrace() {
      return this.#a;
    }
    _targetId() {
      return this.#o;
    }
  },
  Zf = class {
    #e;
    #t;
    #n = !1;
    constructor(e, t) {
      ((this.#e = e), (this.#t = t));
    }
    isMultiple() {
      return this.#t;
    }
    async accept(e) {
      (K(!this.#n, `Cannot accept FileChooser which is already handled!`),
        (this.#n = !0),
        await this.#e.uploadFile(...e));
    }
    async cancel() {
      (K(!this.#n, `Cannot cancel FileChooser which is already handled!`),
        (this.#n = !0),
        await this.#e.evaluate((e) => {
          e.dispatchEvent(new Event(`cancel`, { bubbles: !0 }));
        }));
    }
  },
  Qf;
(function (e) {
  ((e.Request = Symbol(`NetworkManager.Request`)),
    (e.RequestServedFromCache = Symbol(`NetworkManager.RequestServedFromCache`)),
    (e.Response = Symbol(`NetworkManager.Response`)),
    (e.RequestFailed = Symbol(`NetworkManager.RequestFailed`)),
    (e.RequestFinished = Symbol(`NetworkManager.RequestFinished`)));
})((Qf ||= {}));
var $f = class {
    #e = new Map();
    #t;
    constructor(e) {
      this.#t = e;
    }
    has(e) {
      return this.#e.has(e);
    }
    create(e, t, n) {
      let r = new ep(this.#t(), e, t);
      this.#e.set(r.id, r);
      try {
        n(r.id);
      } catch (e) {
        throw (
          r.promise.catch(q).finally(() => {
            this.#e.delete(r.id);
          }),
          r.reject(e),
          e
        );
      }
      return r.promise.finally(() => {
        this.#e.delete(r.id);
      });
    }
    reject(e, t, n) {
      let r = this.#e.get(e);
      r && this._reject(r, t, n);
    }
    rejectRaw(e, t) {
      let n = this.#e.get(e);
      n && n.reject(t);
    }
    _reject(e, t, n) {
      let r, i;
      (t instanceof ql ? ((r = t), (r.cause = e.error), (i = t.message)) : ((r = e.error), (i = t)),
        e.reject(Lu(r, `Protocol error (${e.label}): ${i}`, n)));
    }
    resolve(e, t) {
      let n = this.#e.get(e);
      n && n.resolve(t);
    }
    clear() {
      for (let e of this.#e.values()) this._reject(e, new Yl(`Target closed`));
      this.#e.clear();
    }
    getPendingProtocolErrors() {
      let e = [];
      for (let t of this.#e.values())
        e.push(Error(`${t.label} timed out. Trace: ${t.error.stack}`));
      return e;
    }
  },
  ep = class {
    #e;
    #t = new ql();
    #n = Eu.create();
    #r;
    #i;
    constructor(e, t, n) {
      ((this.#e = e),
        (this.#i = t),
        n &&
          (this.#r = setTimeout(() => {
            this.#n.reject(
              Lu(
                this.#t,
                `${t} timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed.`
              )
            );
          }, n)));
    }
    resolve(e) {
      (clearTimeout(this.#r), this.#n.resolve(e));
    }
    reject(e) {
      (clearTimeout(this.#r), this.#n.reject(e));
    }
    get id() {
      return this.#e;
    }
    get promise() {
      return this.#n.valueOrThrow();
    }
    get error() {
      return this.#t;
    }
    get label() {
      return this.#i;
    }
  },
  tp = class extends ju {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    #o = !1;
    #s = !1;
    constructor(e, t, n, r, i) {
      (super(),
        (this.#r = e),
        (this.#t = t),
        (this.#n = new $f(e._idGenerator)),
        (this.#e = n),
        (this.#i = r),
        (this.#o = i));
    }
    setTarget(e) {
      this.#a = e;
    }
    target() {
      return (K(this.#a, `Target must exist`), this.#a);
    }
    connection() {
      return this.#r;
    }
    get detached() {
      return this.#r._closed || this.#s;
    }
    parentSession() {
      return this.#i ? (this.#r?.session(this.#i) ?? void 0) : this;
    }
    send(e, t, n) {
      return this.detached
        ? Promise.reject(
            new Yl(
              `Protocol error (${e}): Session closed. Most likely the ${this.#t} has been closed.`
            )
          )
        : this.#r._rawSend(this.#n, e, t, this.#e, n).catch((t) => {
            throw t instanceof Error && t.message.includes(`Session with given id not found`)
              ? (this.onClosed(), new Yl(`Protocol error (${e}): Session with given id not found.`))
              : t;
          });
    }
    onMessage(e) {
      e.id
        ? e.error
          ? this.#o
            ? this.#n.rejectRaw(e.id, e.error)
            : this.#n.reject(e.id, Ru(e), e.error.message)
          : this.#n.resolve(e.id, e.result)
        : (K(!e.id), this.emit(e.method, e.params));
    }
    async detach() {
      if (this.detached)
        throw Error(`Session already detached. Most likely the ${this.#t} has been closed.`);
      (await this.#r.send(`Target.detachFromTarget`, { sessionId: this.#e }), (this.#s = !0));
    }
    onClosed() {
      (this.#n.clear(), (this.#s = !0), this.emit(Au.Disconnected, void 0));
    }
    id() {
      return this.#e;
    }
    hasCallback(e) {
      return this.#n.has(e);
    }
    getPendingProtocolErrors() {
      return this.#n.getPendingProtocolErrors();
    }
  },
  np = Vl(`puppeteer:protocol:SEND ►`),
  rp = Vl(`puppeteer:protocol:RECV ◀`),
  ip = class extends Cu {
    #e;
    #t;
    #n;
    #r;
    #i = new Map();
    #a = !1;
    #o = new Set();
    #s = !1;
    #c;
    #l = !1;
    #u;
    constructor(e, t, n = 0, r, i = !1, a = bf()) {
      (super(),
        (this.#l = i),
        (this.#u = a),
        (this.#c = new $f(a)),
        (this.#e = e),
        (this.#n = n),
        (this.#r = r ?? 18e4),
        (this.#t = t),
        (this.#t.onmessage = this.onMessage.bind(this)),
        (this.#t.onclose = this.#d.bind(this)));
    }
    static fromSession(e) {
      return e.connection();
    }
    get delay() {
      return this.#n;
    }
    get timeout() {
      return this.#r;
    }
    get rejectEmulateNetworkConditionsCalls() {
      return this.#s;
    }
    set rejectEmulateNetworkConditionsCalls(e) {
      this.#s = e;
    }
    get _closed() {
      return this.#a;
    }
    get _idGenerator() {
      return this.#u;
    }
    get _sessions() {
      return this.#i;
    }
    _session(e) {
      return this.#i.get(e) || null;
    }
    session(e) {
      return this._session(e);
    }
    url() {
      return this.#e;
    }
    send(e, t, n) {
      return this._rawSend(this.#c, e, t, void 0, n);
    }
    _rawSend(e, t, n, r, i) {
      return this.#a
        ? Promise.reject(new Xl(`Connection closed.`))
        : t === `Network.emulateNetworkConditions` && this.rejectEmulateNetworkConditionsCalls
          ? Promise.reject(
              Error(`Cannot reset network conditions: rule-based emulation is enabled.`)
            )
          : e.create(t, i?.timeout ?? this.#r, (e) => {
              let i = JSON.stringify({ method: t, params: n, id: e, sessionId: r });
              (np(i), this.#t.send(i));
            });
    }
    async closeBrowser() {
      await this.send(`Browser.close`);
    }
    async onMessage(e) {
      (this.#n && (await new Promise((e) => setTimeout(e, this.#n))), rp(e));
      let t = JSON.parse(e);
      if (t.method === `Target.attachedToTarget`) {
        let e = t.params.sessionId,
          n = new tp(this, t.params.targetInfo.type, e, t.sessionId, this.#l);
        (this.#i.set(e, n), this.emit(Au.SessionAttached, n));
        let r = this.#i.get(t.sessionId);
        r && r.emit(Au.SessionAttached, n);
      } else if (t.method === `Target.detachedFromTarget`) {
        let e = this.#i.get(t.params.sessionId);
        if (e) {
          (e.onClosed(), this.#i.delete(t.params.sessionId), this.emit(Au.SessionDetached, e));
          let n = this.#i.get(t.sessionId);
          n && n.emit(Au.SessionDetached, e);
        }
      }
      if (t.sessionId) {
        let e = this.#i.get(t.sessionId);
        e && e.onMessage(t);
      } else if (t.id) {
        if (this.#c.has(t.id))
          t.error
            ? this.#l
              ? this.#c.rejectRaw(t.id, t.error)
              : this.#c.reject(t.id, Ru(t), t.error.message)
            : this.#c.resolve(t.id, t.result);
        else
          for (let e of this.#i.values())
            if (e.hasCallback(t.id)) {
              e.onMessage(t);
              break;
            }
      } else this.emit(t.method, t.params);
    }
    #d() {
      if (!this.#a) {
        ((this.#a = !0), (this.#t.onmessage = void 0), (this.#t.onclose = void 0), this.#c.clear());
        for (let e of this.#i.values()) e.onClosed();
        (this.#i.clear(), this.emit(Au.Disconnected, void 0));
      }
    }
    dispose() {
      (this.#d(), this.#t.close());
    }
    isAutoAttached(e) {
      return !this.#o.has(e);
    }
    async _createSession(e, t = !0) {
      t || this.#o.add(e.targetId);
      let { sessionId: n } = await this.send(`Target.attachToTarget`, {
        targetId: e.targetId,
        flatten: !0,
      });
      this.#o.delete(e.targetId);
      let r = this.#i.get(n);
      if (!r) throw Error(`CDPSession creation failed.`);
      return r;
    }
    async createSession(e) {
      return await this._createSession(e, !1);
    }
    getPendingProtocolErrors() {
      let e = [];
      e.push(...this.#c.getPendingProtocolErrors());
      for (let t of this.#i.values()) e.push(...t.getPendingProtocolErrors());
      return e;
    }
  };
function ap(e) {
  return e instanceof Yl;
}
var op = class {
    #e;
    #t;
    constructor(e) {
      ((this.#e = new sp(e)), (this.#t = new cp(e)));
    }
    updateClient(e) {
      (this.#e.updateClient(e), this.#t.updateClient(e));
    }
    async startJSCoverage(e = {}) {
      return await this.#e.start(e);
    }
    async stopJSCoverage() {
      return await this.#e.stop();
    }
    async startCSSCoverage(e = {}) {
      return await this.#t.start(e);
    }
    async stopCSSCoverage() {
      return await this.#t.stop();
    }
  },
  sp = class {
    #e;
    #t = !1;
    #n = new Map();
    #r = new Map();
    #i;
    #a = !1;
    #o = !1;
    #s = !1;
    constructor(e) {
      this.#e = e;
    }
    updateClient(e) {
      this.#e = e;
    }
    async start(e = {}) {
      K(!this.#t, `JSCoverage is already enabled`);
      let {
        resetOnNavigation: t = !0,
        reportAnonymousScripts: n = !1,
        includeRawScriptCoverage: r = !1,
        useBlockCoverage: i = !0,
      } = e;
      ((this.#a = t),
        (this.#o = n),
        (this.#s = r),
        (this.#t = !0),
        this.#n.clear(),
        this.#r.clear(),
        (this.#i = new Ol()));
      let a = this.#i.use(new Cu(this.#e));
      (a.on(`Debugger.scriptParsed`, this.#l.bind(this)),
        a.on(`Runtime.executionContextsCleared`, this.#c.bind(this)),
        await Promise.all([
          this.#e.send(`Profiler.enable`),
          this.#e.send(`Profiler.startPreciseCoverage`, { callCount: this.#s, detailed: i }),
          this.#e.send(`Debugger.enable`),
          this.#e.send(`Debugger.setSkipAllPauses`, { skip: !0 }),
        ]));
    }
    #c() {
      this.#a && (this.#n.clear(), this.#r.clear());
    }
    async #l(e) {
      if (!eu.isPuppeteerURL(e.url) && !(!e.url && !this.#o))
        try {
          let t = await this.#e.send(`Debugger.getScriptSource`, { scriptId: e.scriptId });
          (this.#n.set(e.scriptId, e.url), this.#r.set(e.scriptId, t.scriptSource));
        } catch (e) {
          q(e);
        }
    }
    async stop() {
      (K(this.#t, `JSCoverage is not enabled`), (this.#t = !1));
      let e = await Promise.all([
        this.#e.send(`Profiler.takePreciseCoverage`),
        this.#e.send(`Profiler.stopPreciseCoverage`),
        this.#e.send(`Profiler.disable`),
        this.#e.send(`Debugger.disable`),
      ]);
      this.#i?.dispose();
      let t = [],
        n = e[0];
      for (let e of n.result) {
        let n = this.#n.get(e.scriptId);
        !n && this.#o && (n = `debugger://VM` + e.scriptId);
        let r = this.#r.get(e.scriptId);
        if (r === void 0 || n === void 0) continue;
        let i = [];
        for (let t of e.functions) i.push(...t.ranges);
        let a = lp(i);
        this.#s
          ? t.push({ url: n, ranges: a, text: r, rawScriptCoverage: e })
          : t.push({ url: n, ranges: a, text: r });
      }
      return t;
    }
  },
  cp = class {
    #e;
    #t = !1;
    #n = new Map();
    #r = new Map();
    #i;
    #a = !1;
    constructor(e) {
      this.#e = e;
    }
    updateClient(e) {
      this.#e = e;
    }
    async start(e = {}) {
      K(!this.#t, `CSSCoverage is already enabled`);
      let { resetOnNavigation: t = !0 } = e;
      ((this.#a = t), (this.#t = !0), this.#n.clear(), this.#r.clear(), (this.#i = new Ol()));
      let n = this.#i.use(new Cu(this.#e));
      (n.on(`CSS.styleSheetAdded`, this.#s.bind(this)),
        n.on(`Runtime.executionContextsCleared`, this.#o.bind(this)),
        await Promise.all([
          this.#e.send(`DOM.enable`),
          this.#e.send(`CSS.enable`),
          this.#e.send(`CSS.startRuleUsageTracking`),
        ]));
    }
    #o() {
      this.#a && (this.#n.clear(), this.#r.clear());
    }
    async #s(e) {
      let t = e.header;
      if (t.sourceURL)
        try {
          let e = await this.#e.send(`CSS.getStyleSheetText`, { styleSheetId: t.styleSheetId });
          (this.#n.set(t.styleSheetId, t.sourceURL), this.#r.set(t.styleSheetId, e.text));
        } catch (e) {
          q(e);
        }
    }
    async stop() {
      (K(this.#t, `CSSCoverage is not enabled`), (this.#t = !1));
      let e = await this.#e.send(`CSS.stopRuleUsageTracking`);
      (await Promise.all([this.#e.send(`CSS.disable`), this.#e.send(`DOM.disable`)]),
        this.#i?.dispose());
      let t = new Map();
      for (let n of e.ruleUsage) {
        let e = t.get(n.styleSheetId);
        (e || ((e = []), t.set(n.styleSheetId, e)),
          e.push({ startOffset: n.startOffset, endOffset: n.endOffset, count: +!!n.used }));
      }
      let n = [];
      for (let e of this.#n.keys()) {
        let r = this.#n.get(e);
        K(r !== void 0, `Stylesheet URL is undefined (styleSheetId=${e})`);
        let i = this.#r.get(e);
        K(i !== void 0, `Stylesheet text is undefined (styleSheetId=${e})`);
        let a = lp(t.get(e) || []);
        n.push({ url: r, ranges: a, text: i });
      }
      return n;
    }
  };
function lp(e) {
  let t = [];
  for (let n of e)
    (t.push({ offset: n.startOffset, type: 0, range: n }),
      t.push({ offset: n.endOffset, type: 1, range: n }));
  t.sort((e, t) => {
    if (e.offset !== t.offset) return e.offset - t.offset;
    if (e.type !== t.type) return t.type - e.type;
    let n = e.range.endOffset - e.range.startOffset,
      r = t.range.endOffset - t.range.startOffset;
    return e.type === 0 ? r - n : n - r;
  });
  let n = [],
    r = [],
    i = 0;
  for (let e of t) {
    if (n.length && i < e.offset && n[n.length - 1] > 0) {
      let t = r[r.length - 1];
      t && t.end === i ? (t.end = e.offset) : r.push({ start: i, end: e.offset });
    }
    ((i = e.offset), e.type === 0 ? n.push(e.range.count) : n.pop());
  }
  return r.filter((e) => e.end - e.start > 0);
}
var up = class extends Nu {
    #e;
    constructor(e, t, n, r = ``) {
      (super(t, n, r), (this.#e = e));
    }
    async handle(e) {
      await this.#e.send(`Page.handleJavaScriptDialog`, { accept: e.accept, promptText: e.text });
    }
  },
  dp = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  fp = function (e, t, n, r, i, a) {
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
  pp = function (e, t, n) {
    return (
      typeof t == `symbol` && (t = t.description ? `[${t.description}]` : ``),
      Object.defineProperty(e, 'name', { configurable: !0, value: n ? `${n} ${t}` : t })
    );
  },
  mp = class {
    #e;
    #t;
    #n;
    constructor(e, t, n) {
      ((this.#e = e), (this.#t = t), (this.#n = n), this.#t.registerState(this));
    }
    async setState(e) {
      ((this.#e = e), await this.sync());
    }
    get state() {
      return this.#e;
    }
    async sync() {
      await Promise.all(this.#t.clients().map((e) => this.#n(e, this.#e)));
    }
  },
  hp = (() => {
    let e = [],
      t,
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
      h,
      g,
      _,
      v,
      y,
      b,
      x,
      S;
    return class {
      static {
        let C = typeof Symbol == `function` && Symbol.metadata ? Object.create(null) : void 0;
        ((t = [kd]),
          (r = [kd]),
          (a = [kd]),
          (s = [kd]),
          (l = [kd]),
          (d = [kd]),
          (p = [kd]),
          (h = [kd]),
          (_ = [kd]),
          (y = [kd]),
          (x = [kd]),
          fp(
            this,
            (n = {
              value: pp(async function (e, t) {
                if (!t.viewport) {
                  await Promise.all([
                    e.send(`Emulation.clearDeviceMetricsOverride`),
                    e.send(`Emulation.setTouchEmulationEnabled`, { enabled: !1 }),
                  ]).catch(q);
                  return;
                }
                let { viewport: n } = t,
                  r = n.isMobile || !1,
                  i = n.width,
                  a = n.height,
                  o = n.deviceScaleFactor ?? 1,
                  s = n.isLandscape
                    ? { angle: 90, type: `landscapePrimary` }
                    : { angle: 0, type: `portraitPrimary` },
                  c = n.hasTouch || !1;
                await Promise.all([
                  e
                    .send(`Emulation.setDeviceMetricsOverride`, {
                      mobile: r,
                      width: i,
                      height: a,
                      deviceScaleFactor: o,
                      screenOrientation: s,
                    })
                    .catch((e) => {
                      if (e.message.includes(`Target does not support metrics override`)) {
                        q(e);
                        return;
                      }
                      throw e;
                    }),
                  e.send(`Emulation.setTouchEmulationEnabled`, { enabled: c }),
                ]);
              }, `#applyViewport`),
            }),
            t,
            {
              kind: `method`,
              name: `#applyViewport`,
              static: !1,
              private: !0,
              access: { has: (e) => #g in e, get: (e) => e.#g },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (i = {
              value: pp(async function (e, t) {
                t.active &&
                  (t.overrides
                    ? await e.send(`Emulation.setIdleOverride`, {
                        isUserActive: t.overrides.isUserActive,
                        isScreenUnlocked: t.overrides.isScreenUnlocked,
                      })
                    : await e.send(`Emulation.clearIdleOverride`));
              }, `#emulateIdleState`),
            }),
            r,
            {
              kind: `method`,
              name: `#emulateIdleState`,
              static: !1,
              private: !0,
              access: { has: (e) => #_ in e, get: (e) => e.#_ },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (o = {
              value: pp(async function (e, t) {
                if (t.active)
                  try {
                    await e.send(`Emulation.setTimezoneOverride`, {
                      timezoneId: t.timezoneId || ``,
                    });
                  } catch (e) {
                    throw Iu(e) && e.message.includes(`Invalid timezone`)
                      ? Error(`Invalid timezone ID: ${t.timezoneId}`)
                      : e;
                  }
              }, `#emulateTimezone`),
            }),
            a,
            {
              kind: `method`,
              name: `#emulateTimezone`,
              static: !1,
              private: !0,
              access: { has: (e) => #v in e, get: (e) => e.#v },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (c = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(`Emulation.setEmulatedVisionDeficiency`, {
                    type: t.visionDeficiency || `none`,
                  }));
              }, `#emulateVisionDeficiency`),
            }),
            s,
            {
              kind: `method`,
              name: `#emulateVisionDeficiency`,
              static: !1,
              private: !0,
              access: { has: (e) => #y in e, get: (e) => e.#y },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (u = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(`Emulation.setCPUThrottlingRate`, { rate: t.factor ?? 1 }));
              }, `#emulateCpuThrottling`),
            }),
            l,
            {
              kind: `method`,
              name: `#emulateCpuThrottling`,
              static: !1,
              private: !0,
              access: { has: (e) => #b in e, get: (e) => e.#b },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (f = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(`Emulation.setEmulatedMedia`, { features: t.mediaFeatures }));
              }, `#emulateMediaFeatures`),
            }),
            d,
            {
              kind: `method`,
              name: `#emulateMediaFeatures`,
              static: !1,
              private: !0,
              access: { has: (e) => #x in e, get: (e) => e.#x },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (m = {
              value: pp(async function (e, t) {
                t.active && (await e.send(`Emulation.setEmulatedMedia`, { media: t.type || `` }));
              }, `#emulateMediaType`),
            }),
            p,
            {
              kind: `method`,
              name: `#emulateMediaType`,
              static: !1,
              private: !0,
              access: { has: (e) => #S in e, get: (e) => e.#S },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (g = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(
                    `Emulation.setGeolocationOverride`,
                    t.geoLocation
                      ? {
                          longitude: t.geoLocation.longitude,
                          latitude: t.geoLocation.latitude,
                          accuracy: t.geoLocation.accuracy,
                        }
                      : void 0
                  ));
              }, `#setGeolocation`),
            }),
            h,
            {
              kind: `method`,
              name: `#setGeolocation`,
              static: !1,
              private: !0,
              access: { has: (e) => #C in e, get: (e) => e.#C },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (v = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(`Emulation.setDefaultBackgroundColorOverride`, { color: t.color }));
              }, `#setDefaultBackgroundColor`),
            }),
            _,
            {
              kind: `method`,
              name: `#setDefaultBackgroundColor`,
              static: !1,
              private: !0,
              access: { has: (e) => #w in e, get: (e) => e.#w },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (b = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(`Emulation.setScriptExecutionDisabled`, {
                    value: !t.javaScriptEnabled,
                  }));
              }, `#setJavaScriptEnabled`),
            }),
            y,
            {
              kind: `method`,
              name: `#setJavaScriptEnabled`,
              static: !1,
              private: !0,
              access: { has: (e) => #T in e, get: (e) => e.#T },
              metadata: C,
            },
            null,
            e
          ),
          fp(
            this,
            (S = {
              value: pp(async function (e, t) {
                t.active &&
                  (await e.send(`Emulation.setFocusEmulationEnabled`, { enabled: t.enabled }));
              }, `#emulateFocus`),
            }),
            x,
            {
              kind: `method`,
              name: `#emulateFocus`,
              static: !1,
              private: !0,
              access: { has: (e) => #E in e, get: (e) => e.#E },
              metadata: C,
            },
            null,
            e
          ),
          C &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: C,
            }));
      }
      #e = dp(this, e);
      #t = !1;
      #n = !1;
      #r = [];
      #i = new mp({ active: !1 }, this, this.#g);
      #a = new mp({ active: !1 }, this, this.#_);
      #o = new mp({ active: !1 }, this, this.#v);
      #s = new mp({ active: !1 }, this, this.#y);
      #c = new mp({ active: !1 }, this, this.#b);
      #l = new mp({ active: !1 }, this, this.#x);
      #u = new mp({ active: !1 }, this, this.#S);
      #d = new mp({ active: !1 }, this, this.#C);
      #f = new mp({ active: !1 }, this, this.#w);
      #p = new mp({ javaScriptEnabled: !0, active: !1 }, this, this.#T);
      #m = new mp({ enabled: !0, active: !1 }, this, this.#E);
      #h = new Set();
      constructor(e) {
        this.#e = e;
      }
      updateClient(e) {
        ((this.#e = e), this.#h.delete(e));
      }
      registerState(e) {
        this.#r.push(e);
      }
      clients() {
        return [this.#e, ...Array.from(this.#h)];
      }
      async registerSpeculativeSession(e) {
        (this.#h.add(e),
          e.once(Au.Disconnected, () => {
            this.#h.delete(e);
          }),
          Promise.all(this.#r.map((e) => e.sync().catch(q))));
      }
      get javascriptEnabled() {
        return this.#p.state.javaScriptEnabled;
      }
      async emulateViewport(e) {
        let t = this.#i.state;
        if (!e && !t.active) return !1;
        await this.#i.setState(e ? { viewport: e, active: !0 } : { active: !1 });
        let n = e?.isMobile || !1,
          r = e?.hasTouch || !1,
          i = this.#t !== n || this.#n !== r;
        return ((this.#t = n), (this.#n = r), i);
      }
      get #g() {
        return n.value;
      }
      async emulateIdleState(e) {
        await this.#a.setState({ active: !0, overrides: e });
      }
      get #_() {
        return i.value;
      }
      get #v() {
        return o.value;
      }
      async emulateTimezone(e) {
        await this.#o.setState({ timezoneId: e, active: !0 });
      }
      get #y() {
        return c.value;
      }
      async emulateVisionDeficiency(e) {
        (K(
          !e ||
            new Set([
              `none`,
              `achromatopsia`,
              `blurredVision`,
              `deuteranopia`,
              `protanopia`,
              `reducedContrast`,
              `tritanopia`,
            ]).has(e),
          `Unsupported vision deficiency: ${e}`
        ),
          await this.#s.setState({ active: !0, visionDeficiency: e }));
      }
      get #b() {
        return u.value;
      }
      async emulateCPUThrottling(e) {
        (K(e === null || e >= 1, `Throttling rate should be greater or equal to 1`),
          await this.#c.setState({ active: !0, factor: e ?? void 0 }));
      }
      get #x() {
        return f.value;
      }
      async emulateMediaFeatures(e) {
        if (Array.isArray(e))
          for (let t of e) {
            let e = t.name;
            K(
              /^(?:prefers-(?:color-scheme|reduced-motion)|color-gamut)$/.test(e),
              `Unsupported media feature: ` + e
            );
          }
        await this.#l.setState({ active: !0, mediaFeatures: e });
      }
      get #S() {
        return m.value;
      }
      async emulateMediaType(e) {
        (K(
          e === `screen` || e === `print` || (e ?? void 0) === void 0,
          `Unsupported media type: ` + e
        ),
          await this.#u.setState({ type: e, active: !0 }));
      }
      get #C() {
        return g.value;
      }
      async setGeolocation(e) {
        let { longitude: t, latitude: n, accuracy: r = 0 } = e;
        if (t < -180 || t > 180)
          throw Error(`Invalid longitude "${t}": precondition -180 <= LONGITUDE <= 180 failed.`);
        if (n < -90 || n > 90)
          throw Error(`Invalid latitude "${n}": precondition -90 <= LATITUDE <= 90 failed.`);
        if (r < 0) throw Error(`Invalid accuracy "${r}": precondition 0 <= ACCURACY failed.`);
        await this.#d.setState({
          active: !0,
          geoLocation: { longitude: t, latitude: n, accuracy: r },
        });
      }
      get #w() {
        return v.value;
      }
      async resetDefaultBackgroundColor() {
        await this.#f.setState({ active: !0, color: void 0 });
      }
      async setTransparentBackgroundColor() {
        await this.#f.setState({ active: !0, color: { r: 0, g: 0, b: 0, a: 0 } });
      }
      get #T() {
        return b.value;
      }
      async setJavaScriptEnabled(e) {
        await this.#p.setState({ active: !0, javaScriptEnabled: e });
      }
      get #E() {
        return S.value;
      }
      async emulateFocus(e) {
        await this.#m.setState({ active: !0, enabled: e });
      }
    };
  })(),
  gp = class {
    #e;
    #t;
    constructor(e) {
      ((this.#e = e.code), (this.#t = e.details));
    }
    get code() {
      return this.#e;
    }
    get details() {
      return this.#t;
    }
  },
  _p = class {
    #e;
    #t;
    #n = new WeakMap();
    constructor(e, t, n) {
      ((this.#e = t), (this.#t = n), this.#n.set(e, t));
    }
    get id() {
      return this.#e;
    }
    get source() {
      return this.#t;
    }
    getIdForFrame(e) {
      return this.#n.get(e);
    }
    setIdForFrame(e, t) {
      this.#n.set(e, t);
    }
  },
  vp = class extends Mu {
    #e;
    #t;
    #n;
    #r = !1;
    #i = this.#o.bind(this);
    #a = new Set();
    constructor(e, t, n) {
      (super(),
        (this.#e = e),
        (this.#t = t),
        (this.#n = n.id),
        this.#e.on(`DeviceAccess.deviceRequestPrompted`, this.#i),
        this.#e.on(`Target.detachedFromTarget`, () => {
          this.#e = null;
        }),
        this.#o(n));
    }
    #o(e) {
      if (e.id === this.#n)
        for (let t of e.devices) {
          if (this.devices.some((e) => e.id === t.id)) continue;
          let e = { id: t.id, name: t.name };
          this.devices.push(e);
          for (let t of this.#a) t.filter(e) && t.promise.resolve(e);
        }
    }
    async waitForDevice(e, t = {}) {
      for (let t of this.devices) if (e(t)) return t;
      let { timeout: n = this.#t.timeout() } = t,
        r = Eu.create({
          message: `Waiting for \`DeviceRequestPromptDevice\` failed: ${n}ms exceeded`,
          timeout: n,
        });
      t.signal &&
        t.signal.addEventListener(
          `abort`,
          () => {
            r.reject(t.signal?.reason);
          },
          { once: !0 }
        );
      let i = { filter: e, promise: r };
      this.#a.add(i);
      try {
        return await r.valueOrThrow();
      } finally {
        this.#a.delete(i);
      }
    }
    async select(e) {
      return (
        K(this.#e !== null, `Cannot select device through detached session!`),
        K(this.devices.includes(e), `Cannot select unknown device!`),
        K(!this.#r, `Cannot select DeviceRequestPrompt which is already handled!`),
        this.#e.off(`DeviceAccess.deviceRequestPrompted`, this.#i),
        (this.#r = !0),
        await this.#e.send(`DeviceAccess.selectPrompt`, { id: this.#n, deviceId: e.id })
      );
    }
    async cancel() {
      return (
        K(this.#e !== null, `Cannot cancel prompt through detached session!`),
        K(!this.#r, `Cannot cancel DeviceRequestPrompt which is already handled!`),
        this.#e.off(`DeviceAccess.deviceRequestPrompted`, this.#i),
        (this.#r = !0),
        await this.#e.send(`DeviceAccess.cancelPrompt`, { id: this.#n })
      );
    }
  },
  yp = class {
    #e;
    #t;
    #n = new Set();
    constructor(e, t) {
      ((this.#e = e),
        (this.#t = t),
        this.#e.on(`DeviceAccess.deviceRequestPrompted`, (e) => {
          this.#r(e);
        }),
        this.#e.on(`Target.detachedFromTarget`, () => {
          this.#e = null;
        }));
    }
    async waitForDevicePrompt(e = {}) {
      K(this.#e !== null, `Cannot wait for device prompt through detached session!`);
      let t = this.#n.size === 0,
        n;
      t && (n = this.#e.send(`DeviceAccess.enable`));
      let { timeout: r = this.#t.timeout() } = e,
        i = Eu.create({
          message: `Waiting for \`DeviceRequestPrompt\` failed: ${r}ms exceeded`,
          timeout: r,
        });
      (e.signal &&
        e.signal.addEventListener(
          `abort`,
          () => {
            i.reject(e.signal?.reason);
          },
          { once: !0 }
        ),
        this.#n.add(i));
      try {
        let [e] = await Promise.all([i.valueOrThrow(), n]);
        return e;
      } finally {
        this.#n.delete(i);
      }
    }
    #r(e) {
      if (!this.#n.size) return;
      K(this.#e !== null);
      let t = new vp(this.#e, this.#t, e);
      for (let e of this.#n) e.resolve(t);
      this.#n.clear();
    }
  };
function bp(e, t, n) {
  let r = [];
  for (let e of t) r.push(wp(e));
  let i = [];
  if (e.stackTrace)
    for (let t of e.stackTrace.callFrames)
      i.push({ url: t.url, lineNumber: t.lineNumber, columnNumber: t.columnNumber });
  return new Xf(Ap(e.type), r.join(` `), t, i, void 0, e.stackTrace, n);
}
function xp(e) {
  let t, n;
  if (!e.exception) ((t = `Error`), (n = e.text));
  else if (
    (e.exception.type !== `object` || e.exception.subtype !== `error`) &&
    !e.exception.objectId
  )
    return Ep(e.exception);
  else {
    let r = Sp(e);
    ((t = r.name), (n = r.message));
  }
  let r = n.split(`
`).length,
    i = Error(n);
  i.name = t;
  let a = i.stack.split(`
`),
    o = a.splice(0, r);
  if ((a.shift(), e.stackTrace && a.length < Error.stackTraceLimit))
    for (let t of e.stackTrace.callFrames.reverse()) {
      if (eu.isPuppeteerURL(t.url) && t.url !== eu.INTERNAL_URL) {
        let e = eu.parse(t.url);
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
    (i.stack = [...o, ...a].join(`
`)),
    i
  );
}
var Sp = (e) => {
  let t = ``,
    n,
    r =
      e.exception?.description?.split(`
    at `) ?? [],
    i = Math.min(e.stackTrace?.callFrames.length ?? 0, r.length - 1);
  return (
    r.splice(-i, i),
    e.exception?.className && (t = e.exception.className),
    (n = r.join(`
`)),
    t && n.startsWith(`${t}: `) && (n = n.slice(t.length + 2)),
    { message: n, name: t }
  );
};
function Cp(e) {
  let t, n;
  if (!e.exception) ((t = `Error`), (n = e.text));
  else if (
    (e.exception.type !== `object` || e.exception.subtype !== `error`) &&
    !e.exception.objectId
  )
    return Ep(e.exception);
  else {
    let r = Sp(e);
    ((t = r.name), (n = r.message));
  }
  let r = Error(n);
  r.name = t;
  let i = r.message.split(`
`).length,
    a = r.stack
      .split(
        `
`
      )
      .splice(0, i),
    o = [];
  if (e.stackTrace) {
    for (let t of e.stackTrace.callFrames)
      if (
        (o.push(
          `    at ${t.functionName || `<anonymous>`} (${t.url}:${t.lineNumber + 1}:${t.columnNumber + 1})`
        ),
        o.length >= Error.stackTraceLimit)
      )
        break;
  }
  return (
    (r.stack = [...a, ...o].join(`
`)),
    r
  );
}
function wp(e) {
  let t = e.remoteObject();
  return t.objectId ? Tp(e) : Ep(t);
}
function Tp(e) {
  let t = e.remoteObject();
  K(t.objectId, `Cannot extract value when no objectId is given`);
  let n = t.description ?? ``;
  if (t.subtype === `error` && n) {
    let e = n.indexOf(`
`);
    return e === -1 ? n : n.slice(0, e);
  }
  return `[${t.subtype || t.type} ${t.className}]`;
}
function Ep(e) {
  if ((K(!e.objectId, `Cannot extract value when objectId is given`), e.unserializableValue)) {
    if (e.type === `bigint`) return BigInt(e.unserializableValue.replace(`n`, ``));
    switch (e.unserializableValue) {
      case `-0`:
        return -0;
      case `NaN`:
        return NaN;
      case `Infinity`:
        return 1 / 0;
      case `-Infinity`:
        return -1 / 0;
      default:
        throw Error(`Unsupported unserializable value: ` + e.unserializableValue);
    }
  }
  return e.value;
}
function Dp(e, t, n) {
  globalThis[t] ||
    Object.assign(globalThis, {
      [t](...r) {
        let i = globalThis[t];
        ((i.args ??= new Map()), (i.callbacks ??= new Map()));
        let a = (i.lastSeq ?? 0) + 1;
        return (
          (i.lastSeq = a),
          i.args.set(a, r),
          globalThis[n + t](
            JSON.stringify({
              type: e,
              name: t,
              seq: a,
              args: r,
              isTrivial: !r.some((e) => e instanceof Node),
            })
          ),
          new Promise((e, t) => {
            i.callbacks.set(a, {
              resolve(t) {
                (i.args.delete(a), e(t));
              },
              reject(e) {
                (i.args.delete(a), t(e));
              },
            });
          })
        );
      },
    });
}
var Op = `puppeteer_`;
function kp(e, t) {
  return cu(Dp, e, t, Op);
}
function Ap(e) {
  switch (e) {
    case `warning`:
      return `warn`;
    default:
      return e;
  }
}
var jp = class extends Rd {
  #e = !1;
  #t;
  #n;
  constructor(e, t) {
    (super(), (this.#n = e), (this.#t = t));
  }
  get disposed() {
    return this.#e;
  }
  get realm() {
    return this.#n;
  }
  get client() {
    return this.realm.environment.client;
  }
  async jsonValue() {
    if (!this.#t.objectId) return Ep(this.#t);
    let e = await this.evaluate((e) => e);
    if (e === void 0) throw Error(`Could not serialize referenced object`);
    return e;
  }
  asElement() {
    return null;
  }
  async dispose() {
    this.#e || ((this.#e = !0), await Mp(this.client, this.#t));
  }
  toString() {
    return this.#t.objectId
      ? `JSHandle@` + (this.#t.subtype || this.#t.type)
      : `JSHandle:` + Ep(this.#t);
  }
  get id() {
    return this.#t.objectId;
  }
  remoteObject() {
    return this.#t;
  }
  async getProperties() {
    let e = await this.client.send(`Runtime.getProperties`, {
        objectId: this.#t.objectId,
        ownProperties: !0,
      }),
      t = new Map();
    for (let n of e.result)
      !n.enumerable || !n.value || t.set(n.name, this.#n.createCdpHandle(n.value));
    return t;
  }
};
async function Mp(e, t) {
  t.objectId &&
    (await e.send(`Runtime.releaseObject`, { objectId: t.objectId }).catch((e) => {
      q(e);
    }));
}
var Np = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Pp = function (e, t, n, r, i, a) {
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
  Fp = new Set([`StaticText`, `InlineTextBox`]),
  Ip = (() => {
    let e = nf,
      t = [],
      n,
      r,
      i,
      a;
    return class extends e {
      static {
        let o =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        ((n = [J()]),
          (r = [J(), tf]),
          (i = [J(), tf]),
          (a = [J()]),
          Pp(
            this,
            null,
            n,
            {
              kind: `method`,
              name: `contentFrame`,
              static: !1,
              private: !1,
              access: { has: (e) => `contentFrame` in e, get: (e) => e.contentFrame },
              metadata: o,
            },
            null,
            t
          ),
          Pp(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `scrollIntoView`,
              static: !1,
              private: !1,
              access: { has: (e) => `scrollIntoView` in e, get: (e) => e.scrollIntoView },
              metadata: o,
            },
            null,
            t
          ),
          Pp(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `uploadFile`,
              static: !1,
              private: !1,
              access: { has: (e) => `uploadFile` in e, get: (e) => e.uploadFile },
              metadata: o,
            },
            null,
            t
          ),
          Pp(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `autofill`,
              static: !1,
              private: !1,
              access: { has: (e) => `autofill` in e, get: (e) => e.autofill },
              metadata: o,
            },
            null,
            t
          ),
          o &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: o,
            }));
      }
      #e = Np(this, t);
      constructor(e, t) {
        super(new jp(e, t));
      }
      get realm() {
        return this.handle.realm;
      }
      get client() {
        return this.handle.client;
      }
      remoteObject() {
        return this.handle.remoteObject();
      }
      get #t() {
        return this.frame._frameManager;
      }
      get frame() {
        return this.realm.environment;
      }
      async contentFrame() {
        let e = await this.client.send(`DOM.describeNode`, { objectId: this.id });
        return typeof e.node.frameId == `string` ? this.#t.frame(e.node.frameId) : null;
      }
      async scrollIntoView() {
        await this.assertConnectedElement();
        try {
          await this.client.send(`DOM.scrollIntoViewIfNeeded`, { objectId: this.id });
        } catch (e) {
          (q(e), await super.scrollIntoView());
        }
      }
      async uploadFile(...e) {
        let t = await this.evaluate((e) => e.multiple);
        K(e.length <= 1 || t, `Multiple file uploads only work with <input type=file multiple>`);
        let n = Nl.value.path;
        if (
          (n &&
            (e = e.map((e) => (n.win32.isAbsolute(e) || n.posix.isAbsolute(e) ? e : n.resolve(e)))),
          e.length === 0)
        ) {
          await this.evaluate((e) => {
            ((e.files = new DataTransfer().files),
              e.dispatchEvent(new Event(`input`, { bubbles: !0, composed: !0 })),
              e.dispatchEvent(new Event(`change`, { bubbles: !0 })));
          });
          return;
        }
        let {
          node: { backendNodeId: r },
        } = await this.client.send(`DOM.describeNode`, { objectId: this.id });
        await this.client.send(`DOM.setFileInputFiles`, {
          objectId: this.id,
          files: e,
          backendNodeId: r,
        });
      }
      async autofill(e) {
        let t = (await this.client.send(`DOM.describeNode`, { objectId: this.handle.id })).node
            .backendNodeId,
          n = this.frame._id;
        await this.client.send(`Autofill.trigger`, {
          fieldId: t,
          frameId: n,
          card: e.creditCard,
          address: e.address,
        });
      }
      async *queryAXTree(e, t) {
        let { nodes: n } = await this.client.send(`Accessibility.queryAXTree`, {
            objectId: this.id,
            accessibleName: e,
            role: t,
          }),
          r = n.filter((e) => !(e.ignored || !e.role || Fp.has(e.role.value)));
        return yield* Pu.map(r, (e) => this.realm.adoptBackendNode(e.backendDOMNodeId));
      }
      async backendNodeId() {
        if (this.#e) return this.#e;
        let { node: e } = await this.client.send(`DOM.describeNode`, { objectId: this.handle.id });
        return ((this.#e = e.backendNodeId), this.#e);
      }
    };
  })(),
  Lp = function (e, t, n) {
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
  Rp = (function (e) {
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
  zp = new Jf(`__ariaQuerySelector`, nd.queryOne, ``),
  Bp = new Jf(
    `__ariaQuerySelectorAll`,
    async (e, t) => {
      let n = nd.queryAll(e, t);
      return await e.realm.evaluateHandle((...e) => e, ...(await Pu.collect(n)));
    },
    ``
  ),
  Vp = class extends Cu {
    #e;
    #t;
    #n;
    #r;
    #i = new Ol();
    constructor(e, t, n) {
      (super(), (this.#e = e), (this.#t = n), (this.#n = t.id), t.name && (this.#r = t.name));
      let r = this.#i.use(new Cu(this.#e));
      (r.on(`Runtime.bindingCalled`, this.#c.bind(this)),
        r.on(`Runtime.executionContextDestroyed`, async (e) => {
          e.executionContextId === this.#n && this[Tl]();
        }),
        r.on(`Runtime.executionContextsCleared`, async () => {
          this[Tl]();
        }),
        r.on(`Runtime.consoleAPICalled`, this.#l.bind(this)),
        r.on(Au.Disconnected, () => {
          this[Tl]();
        }));
    }
    #a = new Map();
    #o = new Ou();
    async #s(e) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        if (this.#a.has(e.name)) return;
        Lp(t, await this.#o.acquire(), !1);
        try {
          (await this.#e.send(
            `Runtime.addBinding`,
            this.#r
              ? { name: Op + e.name, executionContextName: this.#r }
              : { name: Op + e.name, executionContextId: this.#n }
          ),
            await this.evaluate(Dp, `internal`, e.name, Op),
            this.#a.set(e.name, e));
        } catch (e) {
          if (
            e instanceof Error &&
            (e.message.includes(`Execution context was destroyed`) ||
              e.message.includes(`Cannot find context with specified id`))
          )
            return;
          q(e);
        }
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        Rp(t);
      }
    }
    async #c(e) {
      if (e.executionContextId !== this.#n) return;
      let t;
      try {
        t = JSON.parse(e.payload);
      } catch {
        return;
      }
      let { type: n, name: r, seq: i, args: a, isTrivial: o } = t;
      if (n !== `internal`) {
        this.emit(`bindingcalled`, e);
        return;
      }
      if (!this.#a.has(r)) {
        this.emit(`bindingcalled`, e);
        return;
      }
      try {
        await this.#a.get(r)?.run(this, i, a, o);
      } catch (e) {
        q(e);
      }
    }
    get id() {
      return this.#n;
    }
    #l(e) {
      e.executionContextId === this.#n && this.emit(`consoleapicalled`, e);
    }
    #u = !1;
    #d;
    get puppeteerUtil() {
      let e = Promise.resolve();
      return (
        (this.#u ||= ((e = Promise.all([this.#f(zp), this.#f(Bp)])), !0)),
        ad.inject((t) => {
          (this.#d &&
            this.#d.then((e) => {
              e.dispose();
            }),
            (this.#d = e.then(() => this.evaluateHandle(t))));
        }, !this.#d),
        this.#d
      );
    }
    async #f(e) {
      try {
        await this.#s(e);
      } catch (e) {
        q(e);
      }
    }
    async evaluate(e, ...t) {
      return await this.#p(!0, e, ...t);
    }
    async evaluateHandle(e, ...t) {
      return await this.#p(!1, e, ...t);
    }
    async #p(e, t, ...n) {
      let r = gu(nu(t)?.toString() ?? eu.INTERNAL_URL);
      if (ru(t)) {
        let n = this.#n,
          i = t,
          a = hu.test(i) ? i : `${i}\n${r}\n`,
          { exceptionDetails: o, result: s } = await this.#e
            .send(`Runtime.evaluate`, {
              expression: a,
              contextId: n,
              returnByValue: e,
              awaitPromise: !0,
              userGesture: !0,
            })
            .catch(Hp);
        if (o) throw xp(o);
        return e ? Ep(s) : this.#t.createCdpHandle(s);
      }
      let i = Vu(t),
        a = hu.test(i) ? i : `${i}\n${r}\n`,
        o;
      try {
        o = this.#e.send(`Runtime.callFunctionOn`, {
          functionDeclaration: a,
          executionContextId: this.#n,
          arguments: n.some((e) => e instanceof Yu)
            ? await Promise.all(n.map((e) => l(this, e)))
            : n.map((e) => u(this, e)),
          returnByValue: e,
          awaitPromise: !0,
          userGesture: !0,
        });
      } catch (e) {
        throw (
          e instanceof TypeError &&
            e.message.startsWith(`Converting circular structure to JSON`) &&
            (e.message += ` Recursive objects are not allowed.`),
          e
        );
      }
      let { exceptionDetails: s, result: c } = await o.catch(Hp);
      if (s) throw xp(s);
      if (e) return Ep(c);
      return this.#t.createCdpHandle(c);
      async function l(e, t) {
        return (t instanceof Yu && (t = await t.get(e)), u(e, t));
      }
      function u(e, t) {
        if (typeof t == `bigint`) return { unserializableValue: `${t.toString()}n` };
        if (Object.is(t, -0)) return { unserializableValue: `-0` };
        if (Object.is(t, 1 / 0)) return { unserializableValue: `Infinity` };
        if (Object.is(t, -1 / 0)) return { unserializableValue: `-Infinity` };
        if (Object.is(t, NaN)) return { unserializableValue: `NaN` };
        let n = t && (t instanceof jp || t instanceof Ip) ? t : null;
        if (n) {
          if (n.realm !== e.#t)
            throw Error(`JSHandles can be evaluated only in the context they were created!`);
          if (n.disposed) throw Error(`JSHandle is disposed!`);
          return n.remoteObject().unserializableValue
            ? { unserializableValue: n.remoteObject().unserializableValue }
            : n.remoteObject().objectId
              ? { objectId: n.remoteObject().objectId }
              : { value: n.remoteObject().value };
        }
        return { value: t };
      }
    }
    [Tl]() {
      (this.#i.dispose(), this.emit(`disposed`, void 0), super[Tl]());
    }
  },
  Hp = (e) => {
    if (
      e.message.includes(`Object reference chain is too long`) ||
      e.message.includes(`Object couldn't be returned by value`)
    )
      return { result: { type: `undefined` } };
    throw e.message.endsWith(`Cannot find context with specified id`) ||
      e.message.endsWith(`Inspected target navigated or closed`)
      ? Error(`Execution context was destroyed, most likely because of a navigation.`)
      : e;
  },
  Up;
(function (e) {
  ((e.FrameAttached = Symbol(`FrameManager.FrameAttached`)),
    (e.FrameNavigated = Symbol(`FrameManager.FrameNavigated`)),
    (e.FrameDetached = Symbol(`FrameManager.FrameDetached`)),
    (e.FrameSwapped = Symbol(`FrameManager.FrameSwapped`)),
    (e.LifecycleEvent = Symbol(`FrameManager.LifecycleEvent`)),
    (e.FrameNavigatedWithinDocument = Symbol(`FrameManager.FrameNavigatedWithinDocument`)),
    (e.ConsoleApiCalled = Symbol(`FrameManager.ConsoleApiCalled`)),
    (e.BindingCalled = Symbol(`FrameManager.BindingCalled`)));
})((Up ||= {}));
var Wp = Symbol(`mainWorld`),
  Gp = Symbol(`puppeteerWorld`),
  Kp = class extends Vf {
    #e;
    #t;
    #n;
    #r;
    #i;
    get internalEmitter() {
      return this.#i;
    }
    constructor(e, t, n, r, i, a) {
      (super(t),
        (this.#n = n),
        (this.#t = e),
        (this.#r = r),
        (this.#e = new qp(this, new Ef(), Wp)),
        (this.#i = new Cu()),
        this.#t.once(`Runtime.executionContextCreated`, async (t) => {
          this.#e.setContext(new Vp(e, t.context, this.#e));
        }),
        this.#e.emitter.on(`consoleapicalled`, async (e) => {
          try {
            let t = e.args.map((e) => this.#e.createCdpHandle(e)),
              n = this.#i.listenerCount(Bf.Console) === 0,
              r = this.listenerCount(Bf.Console) === 0;
            if (n && r) {
              for (let e of t) e.dispose().catch(q);
              return;
            }
            let i = bp(e, t, this.#n);
            (this.#i.emit(Bf.Console, i), r || this.emit(Bf.Console, i));
          } catch (e) {
            q(e);
          }
        }),
        this.#t.on(`Runtime.exceptionThrown`, i),
        this.#t.once(Au.Disconnected, () => {
          this.#e.dispose();
        }),
        a?.addClient(this.#t).catch(q),
        this.#t.send(`Runtime.enable`).catch(q));
    }
    mainRealm() {
      return this.#e;
    }
    get client() {
      return this.#t;
    }
    async close() {
      switch (this.#r) {
        case Rf.SERVICE_WORKER:
          (await this.client.connection()?.send(`Target.closeTarget`, { targetId: this.#n }),
            await this.client
              .connection()
              ?.send(`Target.detachFromTarget`, { sessionId: this.client.id() }));
          break;
        case Rf.SHARED_WORKER:
          await this.client.connection()?.send(`Target.closeTarget`, { targetId: this.#n });
          break;
        default:
          await this.evaluate(() => {
            self.close();
          });
      }
    }
  },
  qp = class extends Lf {
    #e;
    #t = new Cu();
    #n;
    #r;
    #i;
    constructor(e, t, n) {
      (super(t), (this.#i = e), (this.#n = n));
    }
    get environment() {
      return this.#i;
    }
    get client() {
      return this.#i.client;
    }
    get emitter() {
      return this.#t;
    }
    setContext(e) {
      (this.#e?.[Tl](),
        e.once(`disposed`, this.#a.bind(this)),
        e.on(`consoleapicalled`, this.#o.bind(this)),
        e.on(`bindingcalled`, this.#s.bind(this)),
        (this.#e = e),
        this.#t.emit(`context`, e),
        this.taskManager.rerunAll());
    }
    #a() {
      ((this.#e = void 0), `clearDocumentHandle` in this.#i && this.#i.clearDocumentHandle());
    }
    #o(e) {
      this.#t.emit(`consoleapicalled`, e);
    }
    #s(e) {
      this.#t.emit(`bindingcalled`, e);
    }
    hasContext() {
      return !!this.#e;
    }
    get context() {
      return this.#e;
    }
    #c() {
      if (this.disposed)
        throw Error(
          `Execution context is not available in detached frame or worker "${this.environment.url()}" (are you trying to evaluate?)`
        );
      return this.#e;
    }
    async #l() {
      let e = Error(`Execution context was destroyed`);
      return await bc(
        bu(this.#t, `context`).pipe(
          vl(
            bu(this.#t, `disposed`).pipe(
              Sc(() => {
                throw e;
              })
            ),
            pu(this.timeoutSettings.timeout())
          )
        )
      );
    }
    async evaluateHandle(e, ...t) {
      e = tu(this.evaluateHandle.name, e);
      let n = this.#c();
      return ((n ||= await this.#l()), await n.evaluateHandle(e, ...t));
    }
    async evaluate(e, ...t) {
      e = tu(this.evaluate.name, e);
      let n = this.#c();
      return ((n ||= await this.#l()), await n.evaluate(e, ...t));
    }
    async adoptBackendNode(e) {
      let t = this.#c();
      t ||= await this.#l();
      let { object: n } = await this.client.send(`DOM.resolveNode`, {
        backendNodeId: e,
        executionContextId: t.id,
      });
      return this.createCdpHandle(n);
    }
    async adoptHandle(e) {
      if (e.realm === this) return await e.evaluateHandle((e) => e);
      let t = await this.client.send(`DOM.describeNode`, { objectId: e.id });
      return await this.adoptBackendNode(t.node.backendNodeId);
    }
    async transferHandle(e) {
      if (e.realm === this || e.remoteObject().objectId === void 0) return e;
      let t = await this.client.send(`DOM.describeNode`, { objectId: e.remoteObject().objectId }),
        n = await this.adoptBackendNode(t.node.backendNodeId);
      return (await e.dispose(), n);
    }
    createCdpHandle(e) {
      return e.subtype === `node` ? new Ip(this, e) : new jp(this, e);
    }
    [Tl]() {
      (this.#e?.[Tl](),
        this.#t.emit(`disposed`, void 0),
        this.#t.removeAllListeners(),
        super[Tl]());
    }
    get origin() {
      return this.#r;
    }
    set origin(e) {
      this.#r = e;
    }
    setWorldId(e) {
      this.#n = e;
    }
    async extension() {
      if (this.#i instanceof Kp) throw Error(`Unable to get extension from Realm`);
      return this.#n === Wp
        ? null
        : typeof this.#n == `string`
          ? ((await this.#i._frameManager.page().browser().extensions()).get(this.#n) ?? null)
          : null;
    }
  },
  Jp = new Map([
    [`load`, `load`],
    [`domcontentloaded`, `DOMContentLoaded`],
    [`networkidle0`, `networkIdle`],
    [`networkidle2`, `networkAlmostIdle`],
  ]),
  Yp = class {
    #e;
    #t;
    #n;
    #r = null;
    #i = new Ol();
    #a;
    #o;
    #s = Eu.create();
    #c = Eu.create();
    #l = Eu.create();
    #u = Error(`LifecycleWatcher terminated`);
    #d;
    #f;
    #p;
    constructor(e, t, n, r, i) {
      (Array.isArray(n) ? (n = n.slice()) : typeof n == `string` && (n = [n]),
        (this.#a = t._loaderId),
        (this.#e = n.map((e) => {
          let t = Jp.get(e);
          return (K(t, `Unknown value for options.waitUntil: ` + e), t);
        })),
        i?.addEventListener(`abort`, () => {
          (i.reason instanceof Error && (i.reason.cause = this.#u), this.#o.reject(i.reason));
        }),
        (this.#t = t),
        (this.#n = r),
        this.#i.use(new Cu(t._frameManager)).on(Up.LifecycleEvent, this.#x.bind(this)));
      let a = this.#i.use(new Cu(t));
      (a.on(uf.FrameNavigatedWithinDocument, this.#v.bind(this)),
        a.on(uf.FrameNavigated, this.#y.bind(this)),
        a.on(uf.FrameSwapped, this.#b.bind(this)),
        a.on(uf.FrameSwappedByActivation, this.#b.bind(this)),
        a.on(uf.FrameDetached, this.#_.bind(this)));
      let o = this.#i.use(new Cu(e));
      (o.on(Qf.Request, this.#m.bind(this)),
        o.on(Qf.Response, this.#g.bind(this)),
        o.on(Qf.RequestFailed, this.#h.bind(this)),
        (this.#o = Eu.create({
          timeout: this.#n,
          message: `Navigation timeout of ${this.#n} ms exceeded`,
        })),
        this.#x());
    }
    #m(e) {
      e.frame() !== this.#t ||
        !e.isNavigationRequest() ||
        ((this.#r = e),
        this.#p?.resolve(),
        (this.#p = Eu.create()),
        e.response() !== null && this.#p?.resolve());
    }
    #h(e) {
      this.#r?.id === e.id && this.#p?.resolve();
    }
    #g(e) {
      this.#r?.id === e.request().id && this.#p?.resolve();
    }
    #_(e) {
      if (this.#t === e) {
        ((this.#u.message = `Navigating frame was detached`), this.#o.resolve(this.#u));
        return;
      }
      this.#x();
    }
    async navigationResponse() {
      return (await this.#p?.valueOrThrow(), this.#r ? this.#r.response() : null);
    }
    sameDocumentNavigationPromise() {
      return this.#s.valueOrThrow();
    }
    newDocumentNavigationPromise() {
      return this.#l.valueOrThrow();
    }
    lifecyclePromise() {
      return this.#c.valueOrThrow();
    }
    terminationPromise() {
      return this.#o.valueOrThrow();
    }
    #v() {
      ((this.#d = !0), this.#x());
    }
    #y(e) {
      if (e === `BackForwardCacheRestore`) return this.#b();
      this.#x();
    }
    #b() {
      ((this.#f = !0), this.#x());
    }
    #x() {
      if (!e(this.#t, this.#e)) return;
      (this.#c.resolve(),
        this.#d && this.#s.resolve(void 0),
        (this.#f || this.#t._loaderId !== this.#a) && this.#l.resolve(void 0));
      function e(t, n) {
        for (let e of n) if (!t._lifecycleEvents.has(e)) return !1;
        for (let r of t.childFrames()) if (r._hasStartedLoading && !e(r, n)) return !1;
        return !0;
      }
    }
    dispose() {
      (this.#i.dispose(),
        (this.#u.cause = Error(`LifecycleWatcher disposed`)),
        this.#o.resolve(this.#u));
    }
  },
  Xp = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  Zp = function (e, t, n, r, i, a) {
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
  Qp = (() => {
    let e = ff,
      t = [],
      n,
      r,
      i,
      a,
      o,
      s,
      c;
    return class extends e {
      static {
        let l =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (Zp(
          this,
          null,
          n,
          {
            kind: `method`,
            name: `goto`,
            static: !1,
            private: !1,
            access: { has: (e) => `goto` in e, get: (e) => e.goto },
            metadata: l,
          },
          null,
          t
        ),
          Zp(
            this,
            null,
            r,
            {
              kind: `method`,
              name: `waitForNavigation`,
              static: !1,
              private: !1,
              access: { has: (e) => `waitForNavigation` in e, get: (e) => e.waitForNavigation },
              metadata: l,
            },
            null,
            t
          ),
          Zp(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `setContent`,
              static: !1,
              private: !1,
              access: { has: (e) => `setContent` in e, get: (e) => e.setContent },
              metadata: l,
            },
            null,
            t
          ),
          Zp(
            this,
            null,
            a,
            {
              kind: `method`,
              name: `addPreloadScript`,
              static: !1,
              private: !1,
              access: { has: (e) => `addPreloadScript` in e, get: (e) => e.addPreloadScript },
              metadata: l,
            },
            null,
            t
          ),
          Zp(
            this,
            null,
            o,
            {
              kind: `method`,
              name: `addExposedFunctionBinding`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `addExposedFunctionBinding` in e,
                get: (e) => e.addExposedFunctionBinding,
              },
              metadata: l,
            },
            null,
            t
          ),
          Zp(
            this,
            null,
            s,
            {
              kind: `method`,
              name: `removeExposedFunctionBinding`,
              static: !1,
              private: !1,
              access: {
                has: (e) => `removeExposedFunctionBinding` in e,
                get: (e) => e.removeExposedFunctionBinding,
              },
              metadata: l,
            },
            null,
            t
          ),
          Zp(
            this,
            null,
            c,
            {
              kind: `method`,
              name: `waitForDevicePrompt`,
              static: !1,
              private: !1,
              access: { has: (e) => `waitForDevicePrompt` in e, get: (e) => e.waitForDevicePrompt },
              metadata: l,
            },
            null,
            t
          ),
          l &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: l,
            }));
      }
      #e = (Xp(this, t), ``);
      #t = !1;
      #n;
      _frameManager;
      _loaderId = ``;
      _lifecycleEvents = new Set();
      _id;
      _parentId;
      accessibility;
      worlds;
      extensionWorlds = {};
      constructor(e, t, n, r) {
        (super(),
          (this._frameManager = e),
          (this.#e = ``),
          (this._id = t),
          (this._parentId = n),
          (this.#t = !1),
          (this.#n = r),
          (this._loaderId = ``),
          (this.worlds = {
            [Wp]: new qp(this, this._frameManager.timeoutSettings, Wp),
            [Gp]: new qp(this, this._frameManager.timeoutSettings, Gp),
          }),
          (this.accessibility = new Wf(this.worlds[Wp], t)),
          this.on(uf.FrameSwappedByActivation, () => {
            (this._onLoadingStarted(), this._onLoadingStopped());
          }),
          this.registerWorldListeners(this.worlds[Wp]));
      }
      registerWorldListeners(e) {
        (e.emitter.on(`consoleapicalled`, (t) => {
          this._frameManager.emit(Up.ConsoleApiCalled, [e, t]);
        }),
          e.emitter.on(`bindingcalled`, (t) => {
            this._frameManager.emit(Up.BindingCalled, [e, t]);
          }));
      }
      _client() {
        return this.#n;
      }
      updateId(e) {
        this._id = e;
      }
      updateClient(e) {
        this.#n = e;
      }
      page() {
        return this._frameManager.page();
      }
      async goto(e, t = {}) {
        if (!this.page()._isUrlAllowed(e))
          throw Error(`Navigation to ${e} is blocked by blocklist/allowlist rules`);
        let {
            referer: n = this._frameManager.networkManager.extraHTTPHeaders().referer,
            referrerPolicy: r = this._frameManager.networkManager.extraHTTPHeaders()[
              `referer-policy`
            ],
            waitUntil: i = [`load`],
            timeout: a = this._frameManager.timeoutSettings.navigationTimeout(),
          } = t,
          o = !1,
          s = new Yp(this._frameManager.networkManager, this, i, a),
          c = await Eu.race([
            l(this.#n, e, n, r ? $p(r) : void 0, this._id),
            s.terminationPromise(),
          ]);
        c ||= await Eu.race([
          s.terminationPromise(),
          o ? s.newDocumentNavigationPromise() : s.sameDocumentNavigationPromise(),
        ]);
        try {
          if (c) throw c;
          return await s.navigationResponse();
        } finally {
          s.dispose();
        }
        async function l(e, t, n, r, i) {
          try {
            let a = await e.send(`Page.navigate`, {
              url: t,
              referrer: n,
              frameId: i,
              referrerPolicy: r,
            });
            return (
              (o = !!a.loaderId),
              a.errorText === `net::ERR_HTTP_RESPONSE_CODE_FAILURE`
                ? null
                : a.errorText
                  ? Error(`${a.errorText} at ${t}`)
                  : null
            );
          } catch (e) {
            if (Iu(e)) return e;
            throw e;
          }
        }
      }
      async waitForNavigation(e = {}) {
        let {
            waitUntil: t = [`load`],
            timeout: n = this._frameManager.timeoutSettings.navigationTimeout(),
            signal: r,
          } = e,
          i = new Yp(this._frameManager.networkManager, this, t, n, r),
          a = await Eu.race([
            i.terminationPromise(),
            ...(e.ignoreSameDocumentNavigation ? [] : [i.sameDocumentNavigationPromise()]),
            i.newDocumentNavigationPromise(),
          ]);
        try {
          if (a) throw a;
          let e = await Eu.race([i.terminationPromise(), i.navigationResponse()]);
          if (e instanceof Error) throw a;
          return e || null;
        } finally {
          i.dispose();
        }
      }
      get client() {
        return this.#n;
      }
      mainRealm() {
        return this.worlds[Wp];
      }
      isolatedRealm() {
        return this.worlds[Gp];
      }
      async setContent(e, t = {}) {
        let {
          waitUntil: n = [`load`],
          timeout: r = this._frameManager.timeoutSettings.navigationTimeout(),
        } = t;
        await this.setFrameContent(e);
        let i = new Yp(this._frameManager.networkManager, this, n, r),
          a = await Eu.race([i.terminationPromise(), i.lifecyclePromise()]);
        if ((i.dispose(), a)) throw a;
      }
      url() {
        return this.#e;
      }
      parentFrame() {
        return this._frameManager._frameTree.parentFrame(this._id) || null;
      }
      childFrames() {
        return this._frameManager._frameTree.childFrames(this._id);
      }
      #r() {
        return this._frameManager._deviceRequestPromptManager(this.#n);
      }
      async addPreloadScript(e) {
        let t = this.parentFrame();
        if ((t && this.#n === t.client) || e.getIdForFrame(this)) return;
        let { identifier: n } = await this.#n.send(`Page.addScriptToEvaluateOnNewDocument`, {
          source: e.source,
        });
        e.setIdForFrame(this, n);
      }
      async addExposedFunctionBinding(e) {
        (this !== this._frameManager.mainFrame() && !this._hasStartedLoading) ||
          (await Promise.all([
            this.#n.send(`Runtime.addBinding`, { name: Op + e.name }),
            this.evaluate(e.initSource).catch(q),
          ]));
      }
      async removeExposedFunctionBinding(e) {
        (this !== this._frameManager.mainFrame() && !this._hasStartedLoading) ||
          (await Promise.all([
            this.#n.send(`Runtime.removeBinding`, { name: Op + e.name }),
            this.evaluate((e) => {
              globalThis[e] = void 0;
            }, e.name).catch(q),
          ]));
      }
      async waitForDevicePrompt(e = {}) {
        return await this.#r().waitForDevicePrompt(e);
      }
      _navigated(e) {
        ((this._name = e.name), (this.#e = `${e.url}${e.urlFragment || ``}`));
      }
      _navigatedWithinDocument(e) {
        this.#e = e;
      }
      _onLifecycleEvent(e, t) {
        (t === `init` && ((this._loaderId = e), this._lifecycleEvents.clear()),
          this._lifecycleEvents.add(t));
      }
      _onLoadingStopped() {
        (this._lifecycleEvents.add(`DOMContentLoaded`), this._lifecycleEvents.add(`load`));
      }
      _onLoadingStarted() {
        this._hasStartedLoading = !0;
      }
      get detached() {
        return this.#t;
      }
      [((n = [df]), (r = [df]), (i = [df]), (a = [df]), (o = [df]), (s = [df]), (c = [df]), Tl)]() {
        if (!this.#t) {
          ((this.#t = !0), this.worlds[Wp][Tl](), this.worlds[Gp][Tl]());
          for (let e of Object.values(this.extensionWorlds)) e[Tl]();
          super[Tl]();
        }
      }
      exposeFunction() {
        throw new Jl();
      }
      async frameElement() {
        let e = this.parentFrame();
        if (!e) return null;
        let { backendNodeId: t } = await e.client.send(`DOM.getFrameOwner`, { frameId: this._id });
        return await e.mainRealm().adoptBackendNode(t);
      }
      extensionRealms() {
        return Object.values(this.extensionWorlds);
      }
    };
  })();
function $p(e) {
  return e.replaceAll(/-./g, (e) => e[1].toUpperCase());
}
var em = class {
    #e = new Map();
    #t = new Map();
    #n = new Map();
    #r;
    #i = !1;
    #a = new Map();
    getMainFrame() {
      return this.#r;
    }
    getById(e) {
      return this.#e.get(e);
    }
    waitForFrame(e) {
      let t = this.getById(e);
      if (t) return Promise.resolve(t);
      let n = Eu.create();
      return ((this.#a.get(e) || new Set()).add(n), n.valueOrThrow());
    }
    frames() {
      return Array.from(this.#e.values());
    }
    addFrame(e) {
      (this.#e.set(e._id, e),
        e._parentId
          ? (this.#t.set(e._id, e._parentId),
            this.#n.has(e._parentId) || this.#n.set(e._parentId, new Set()),
            this.#n.get(e._parentId).add(e._id))
          : (!this.#r || this.#i) && ((this.#r = e), (this.#i = !1)),
        this.#a.get(e._id)?.forEach((t) => t.resolve(e)));
    }
    removeFrame(e) {
      (this.#e.delete(e._id),
        this.#t.delete(e._id),
        e._parentId ? this.#n.get(e._parentId)?.delete(e._id) : (this.#i = !0));
    }
    childFrames(e) {
      let t = this.#n.get(e);
      return t
        ? Array.from(t)
            .map((e) => this.getById(e))
            .filter((e) => e !== void 0)
        : [];
    }
    parentFrame(e) {
      let t = this.#t.get(e);
      return t ? this.getById(t) : void 0;
    }
  },
  tm = class extends pf {
    id;
    #e;
    #t;
    #n;
    #r;
    #i;
    #a = !1;
    #o;
    #s = {};
    #c;
    #l;
    get client() {
      return this.#e;
    }
    set client(e) {
      this.#e = e;
    }
    constructor(e, t, n, r, i, a) {
      (super(),
        (this.#e = e),
        (this.id = i.requestId),
        (this.#t = i.requestId === i.loaderId && i.type === `Document`),
        (this._interceptionId = n),
        (this.#n = i.request.url + (i.request.urlFragment ?? ``)),
        (this.#r = (i.type || `other`).toLowerCase()),
        (this.#i = i.request.method),
        i.request.postDataEntries && i.request.postDataEntries.length > 0
          ? (this.#o = new TextDecoder().decode(
              Ll(
                i.request.postDataEntries
                  .map((e) => (e.bytes ? Pl(e.bytes, !0) : null))
                  .filter((e) => e !== null)
              )
            ))
          : (this.#o = i.request.postData),
        (this.#a = i.request.hasPostData ?? !1),
        (this.#c = t),
        (this._redirectChain = a),
        (this.#l = i.initiator),
        (this.interception.enabled = r),
        this.updateHeaders(i.request.headers));
    }
    updateHeaders(e) {
      for (let [t, n] of Object.entries(e)) this.#s[t.toLowerCase()] = n;
    }
    url() {
      return this.#n;
    }
    resourceType() {
      return this.#r;
    }
    method() {
      return this.#i;
    }
    postData() {
      return this.#o;
    }
    hasPostData() {
      return this.#a;
    }
    async fetchPostData() {
      try {
        return (await this.#e.send(`Network.getRequestPostData`, { requestId: this.id })).postData;
      } catch (e) {
        q(e);
        return;
      }
    }
    headers() {
      return structuredClone(this.#s);
    }
    response() {
      return this._response;
    }
    frame() {
      return this.#c;
    }
    isNavigationRequest() {
      return this.#t;
    }
    initiator() {
      return this.#l;
    }
    redirectChain() {
      return this._redirectChain.slice();
    }
    failure() {
      return this._failureText ? { errorText: this._failureText } : null;
    }
    canBeIntercepted() {
      return !this.url().startsWith(`data:`) && !this._fromMemoryCache;
    }
    async _continue(e = {}) {
      let { url: t, method: n, postData: r, headers: i } = e;
      this.interception.handled = !0;
      let a = r ? Fl(r) : void 0;
      if (this._interceptionId === void 0)
        throw Error(`HTTPRequest is missing _interceptionId needed for Fetch.continueRequest`);
      await this.#e
        .send(`Fetch.continueRequest`, {
          requestId: this._interceptionId,
          url: t,
          method: n,
          postData: a,
          headers: i ? hf(i) : void 0,
        })
        .catch((e) => ((this.interception.handled = !1), vf(e)));
    }
    async _respond(e) {
      this.interception.handled = !0;
      let t;
      e.body && (t = pf.getResponse(e.body));
      let n = {};
      if (e.headers)
        for (let t of Object.keys(e.headers)) {
          let r = e.headers[t];
          n[t.toLowerCase()] = Array.isArray(r) ? r.map((e) => String(e)) : String(r);
        }
      (e.contentType && (n[`content-type`] = e.contentType),
        t?.contentLength &&
          !(`content-length` in n) &&
          (n[`content-length`] = String(t.contentLength)));
      let r = e.status || 200;
      if (this._interceptionId === void 0)
        throw Error(`HTTPRequest is missing _interceptionId needed for Fetch.fulfillRequest`);
      await this.#e
        .send(`Fetch.fulfillRequest`, {
          requestId: this._interceptionId,
          responseCode: r,
          responsePhrase: gf[r],
          responseHeaders: hf(n),
          body: t?.base64,
        })
        .catch((e) => ((this.interception.handled = !1), vf(e)));
    }
    async _abort(e) {
      if (((this.interception.handled = !0), this._interceptionId === void 0))
        throw Error(`HTTPRequest is missing _interceptionId needed for Fetch.failRequest`);
      await this.#e
        .send(`Fetch.failRequest`, { requestId: this._interceptionId, errorReason: e || `Failed` })
        .catch(vf);
    }
  },
  nm = class {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a;
    constructor(e) {
      ((this.#e = e.subjectName),
        (this.#t = e.issuer),
        (this.#n = e.validFrom),
        (this.#r = e.validTo),
        (this.#i = e.protocol),
        (this.#a = e.sanList));
    }
    issuer() {
      return this.#t;
    }
    validFrom() {
      return this.#n;
    }
    validTo() {
      return this.#r;
    }
    protocol() {
      return this.#i;
    }
    subjectName() {
      return this.#e;
    }
    subjectAlternativeNames() {
      return this.#a;
    }
  };
function rm(e) {
  return e.includes(`
`)
    ? e
        .split(
          `
`
        )
        .map((e) => e.trim())
        .filter(Boolean)
        .join(`, `)
    : e;
}
var im = class extends yf {
    #e;
    #t = null;
    #n = Eu.create();
    #r;
    #i;
    #a;
    #o;
    #s;
    #c = {};
    #l;
    #u;
    constructor(e, t, n) {
      (super(),
        (this.#e = e),
        (this.#r = { ip: t.remoteIPAddress, port: t.remotePort }),
        (this.#a = this.#d(n) || t.statusText),
        (this.#o = !!t.fromDiskCache),
        (this.#s = !!t.fromServiceWorker),
        (this.#i = n ? n.statusCode : t.status));
      let r = n ? n.headers : t.headers;
      for (let [e, t] of Object.entries(r)) this.#c[e.toLowerCase()] = rm(t);
      ((this.#l = t.securityDetails ? new nm(t.securityDetails) : null),
        (this.#u = t.timing || null));
    }
    #d(e) {
      if (!e || !e.headersText) return;
      let t = e.headersText.split(`\r`, 1)[0];
      if (!t || t.length > 1e3) return;
      let n = t.match(/[^ ]* [^ ]* (.*)/);
      if (!n) return;
      let r = n[1];
      if (r) return r;
    }
    _resolveBody(e) {
      return e ? this.#n.reject(e) : this.#n.resolve();
    }
    remoteAddress() {
      return this.#r;
    }
    url() {
      return this.#e.url();
    }
    status() {
      return this.#i;
    }
    statusText() {
      return this.#a;
    }
    headers() {
      return this.#c;
    }
    securityDetails() {
      return this.#l;
    }
    timing() {
      return this.#u;
    }
    content() {
      return (
        (this.#t ||= this.#n.valueOrThrow().then(async () => {
          try {
            let e = await this.#e.client.send(`Network.getResponseBody`, { requestId: this.#e.id });
            return Pl(e.body, e.base64Encoded);
          } catch (e) {
            throw e instanceof ql && e.originalMessage === `No resource with given identifier found`
              ? new ql(
                  `Could not load response body for this request. This might happen if the request is a preflight request.`
                )
              : e;
          }
        })),
        this.#t
      );
    }
    request() {
      return this.#e;
    }
    fromCache() {
      return this.#o || this.#e._fromMemoryCache;
    }
    fromServiceWorker() {
      return this.#s;
    }
    frame() {
      return this.#e.frame();
    }
  },
  am = class {
    #e = new Map();
    #t = new Map();
    #n = new Map();
    #r = new Map();
    #i = new Map();
    #a = new Map();
    #o = new Map();
    forget(e) {
      (this.#e.delete(e),
        this.#t.delete(e),
        this.#r.delete(e),
        this.#o.delete(e),
        this.#a.delete(e),
        this.#i.delete(e));
    }
    requestExtraInfo(e) {
      return (this.#r.has(e) || this.#r.set(e, []), this.#r.get(e));
    }
    responseExtraInfo(e) {
      return (this.#i.has(e) || this.#i.set(e, []), this.#i.get(e));
    }
    queuedRedirectInfo(e) {
      return (this.#a.has(e) || this.#a.set(e, []), this.#a.get(e));
    }
    queueRedirectInfo(e, t) {
      this.queuedRedirectInfo(e).push(t);
    }
    takeQueuedRedirectInfo(e) {
      return this.queuedRedirectInfo(e).shift();
    }
    inFlightRequestsCount() {
      let e = 0;
      for (let t of this.#n.values()) t.response() || e++;
      return e;
    }
    storeRequestWillBeSent(e, t) {
      this.#e.set(e, t);
    }
    getRequestWillBeSent(e) {
      return this.#e.get(e);
    }
    forgetRequestWillBeSent(e) {
      this.#e.delete(e);
    }
    getRequestPaused(e) {
      return this.#t.get(e);
    }
    forgetRequestPaused(e) {
      this.#t.delete(e);
    }
    storeRequestPaused(e, t) {
      this.#t.set(e, t);
    }
    getRequest(e) {
      return this.#n.get(e);
    }
    storeRequest(e, t) {
      this.#n.set(e, t);
    }
    forgetRequest(e) {
      this.#n.delete(e);
    }
    getQueuedEventGroup(e) {
      return this.#o.get(e);
    }
    queueEventGroup(e, t) {
      this.#o.set(e, t);
    }
    forgetQueuedEventGroup(e) {
      this.#o.delete(e);
    }
    printState() {
      function e(e, t) {
        return t instanceof Map
          ? { dataType: `Map`, value: Array.from(t.entries()) }
          : t instanceof tm
            ? { dataType: `CdpHTTPRequest`, value: `${t.id}: ${t.url()}` }
            : t;
      }
      (console.log(`httpRequestsMap`, JSON.stringify(this.#n, e, 2)),
        console.log(`requestWillBeSentMap`, JSON.stringify(this.#e, e, 2)),
        console.log(`requestWillBeSentMap`, JSON.stringify(this.#i, e, 2)),
        console.log(`requestWillBeSentMap`, JSON.stringify(this.#t, e, 2)));
    }
  },
  om = class extends Cu {
    #e;
    #t = new am();
    #n;
    #r = null;
    #i = new Set();
    #a = !1;
    #o;
    #s;
    #c;
    #l;
    #u;
    #d;
    #f = [
      [`Fetch.requestPaused`, this.#T],
      [`Fetch.authRequired`, this.#w],
      [`Network.requestWillBeSent`, this.#C],
      [`Network.requestWillBeSentExtraInfo`, this.#k],
      [`Network.requestServedFromCache`, this.#A],
      [`Network.responseReceived`, this.#N],
      [`Network.loadingFinished`, this.#I],
      [`Network.loadingFailed`, this.#R],
      [`Network.responseReceivedExtraInfo`, this.#P],
      [Au.Disconnected, this.#g],
    ];
    #p = new Map();
    #m = !0;
    constructor(e, t) {
      (super(), (this.#e = e), (this.#m = t ?? !0));
    }
    #h(e) {
      return (
        Iu(e) &&
        (ap(e) || e.message.includes(`Not supported`) || e.message.includes(`wasn't found`))
      );
    }
    async addClient(e) {
      if (!this.#m || this.#p.has(e)) return;
      let t = new Ol();
      this.#p.set(e, t);
      let n = t.use(new Cu(e));
      for (let [t, r] of this.#f) n.on(t, (t) => r.bind(this)(e, t));
      try {
        await Promise.all([
          e.send(`Network.enable`),
          this.#_(e),
          this.#y(e),
          this.#S(e),
          this.#x(e),
          this.#b(e),
        ]);
      } catch (e) {
        if (this.#h(e)) return;
        throw e;
      }
    }
    async #g(e) {
      (this.#p.get(e)?.dispose(), this.#p.delete(e));
    }
    async authenticate(e) {
      this.#r = e;
      let t = this.#a || !!this.#r;
      t !== this.#o && ((this.#o = t), await this.#v(this.#x.bind(this)));
    }
    async setExtraHTTPHeaders(e) {
      let t = {};
      for (let [n, r] of Object.entries(e))
        (K(ru(r), `Expected value of header "${n}" to be String, but "${typeof r}" is found.`),
          (t[n.toLowerCase()] = r));
      ((this.#n = t), await this.#v(this.#_.bind(this)));
    }
    async #_(e) {
      if (this.#n !== void 0)
        try {
          await e.send(`Network.setExtraHTTPHeaders`, { headers: this.#n });
        } catch (e) {
          if (this.#h(e)) return;
          throw e;
        }
    }
    extraHTTPHeaders() {
      return Object.assign({}, this.#n);
    }
    inFlightRequestsCount() {
      return this.#t.inFlightRequestsCount();
    }
    async setOfflineMode(e) {
      ((this.#c ||= { offline: !1, upload: -1, download: -1, latency: 0 }),
        (this.#c.offline = e),
        await this.#v(this.#y.bind(this)));
    }
    async emulateNetworkConditions(e) {
      ((this.#c ||= { offline: e?.offline ?? !1, upload: -1, download: -1, latency: 0 }),
        (this.#c.upload = e ? e.upload : -1),
        (this.#c.download = e ? e.download : -1),
        (this.#c.latency = e ? e.latency : 0),
        (this.#c.offline = e?.offline ?? !1),
        await this.#v(this.#y.bind(this)));
    }
    async #v(e) {
      await Promise.all(Array.from(this.#p.keys()).map((t) => e(t)));
    }
    async #y(e) {
      if (this.#c !== void 0)
        try {
          await e.send(`Network.emulateNetworkConditions`, {
            offline: this.#c.offline,
            latency: this.#c.latency,
            uploadThroughput: this.#c.upload,
            downloadThroughput: this.#c.download,
          });
        } catch (e) {
          if (this.#h(e)) return;
          throw e;
        }
    }
    async setUserAgent(e, t, n) {
      ((this.#l = e), (this.#u = t), (this.#d = n), await this.#v(this.#b.bind(this)));
    }
    async #b(e) {
      if (this.#l !== void 0)
        try {
          await e.send(`Network.setUserAgentOverride`, {
            userAgent: this.#l,
            userAgentMetadata: this.#u,
            platform: this.#d,
          });
        } catch (e) {
          if (this.#h(e)) return;
          throw e;
        }
    }
    async setCacheEnabled(e) {
      ((this.#s = !e), await this.#v(this.#S.bind(this)));
    }
    async setRequestInterception(e) {
      this.#a = e;
      let t = this.#a || !!this.#r;
      t !== this.#o && ((this.#o = t), await this.#v(this.#x.bind(this)));
    }
    async #x(e) {
      if (this.#o !== void 0) {
        this.#s === void 0 && (this.#s = !1);
        try {
          this.#o
            ? await Promise.all([
                this.#S(e),
                e.send(`Fetch.enable`, { handleAuthRequests: !0, patterns: [{ urlPattern: `*` }] }),
              ])
            : await Promise.all([this.#S(e), e.send(`Fetch.disable`)]);
        } catch (e) {
          if (this.#h(e)) return;
          throw e;
        }
      }
    }
    async #S(e) {
      if (this.#s !== void 0)
        try {
          await e.send(`Network.setCacheDisabled`, { cacheDisabled: this.#s });
        } catch (e) {
          if (this.#h(e)) return;
          throw e;
        }
    }
    #C(e, t) {
      if (this.#a && !t.request.url.startsWith(`data:`)) {
        let { requestId: n } = t;
        this.#t.storeRequestWillBeSent(n, t);
        let r = this.#t.getRequestPaused(n);
        if (r) {
          let { requestId: i } = r;
          (this.#E(t, r), this.#O(e, t, i), this.#t.forgetRequestPaused(n));
        }
        return;
      }
      this.#O(e, t, void 0);
    }
    #w(e, t) {
      let n = `Default`;
      this.#i.has(t.requestId)
        ? (n = `CancelAuth`)
        : this.#r && ((n = `ProvideCredentials`), this.#i.add(t.requestId));
      let { username: r, password: i } = this.#r || { username: void 0, password: void 0 };
      e.send(`Fetch.continueWithAuth`, {
        requestId: t.requestId,
        authChallengeResponse: { response: n, username: r, password: i },
      }).catch(q);
    }
    #T(e, t) {
      !this.#a && this.#o && e.send(`Fetch.continueRequest`, { requestId: t.requestId }).catch(q);
      let { networkId: n, requestId: r } = t;
      if (!n) {
        this.#D(e, t);
        return;
      }
      let i = (() => {
        let e = this.#t.getRequestWillBeSent(n);
        if (e && (e.request.url !== t.request.url || e.request.method !== t.request.method)) {
          this.#t.forgetRequestWillBeSent(n);
          return;
        }
        return e;
      })();
      i ? (this.#E(i, t), this.#O(e, i, r)) : this.#t.storeRequestPaused(n, t);
    }
    #E(e, t) {
      e.request.headers = { ...e.request.headers, ...t.request.headers };
    }
    #D(e, t) {
      let n = new tm(e, t.frameId ? this.#e.frame(t.frameId) : null, t.requestId, this.#a, t, []);
      (this.emit(Qf.Request, n), n.finalizeInterceptions());
    }
    #O(e, t, n, r = !1) {
      let i = [];
      if (t.redirectResponse) {
        let r = null;
        if (t.redirectHasExtraInfo && ((r = this.#t.responseExtraInfo(t.requestId).shift()), !r)) {
          this.#t.queueRedirectInfo(t.requestId, { event: t, fetchRequestId: n });
          return;
        }
        let a = this.#t.getRequest(t.requestId);
        if (a) {
          (this.#j(e, a, t.redirectResponse, r), (i = a._redirectChain));
          let n = this.#t.requestExtraInfo(t.requestId).shift();
          n && a.updateHeaders(n.headers);
        }
      }
      let a = new tm(e, t.frameId ? this.#e.frame(t.frameId) : null, n, this.#a, t, i),
        o = this.#t.requestExtraInfo(t.requestId).shift();
      (o && a.updateHeaders(o.headers),
        (a._fromMemoryCache = r),
        this.#t.storeRequest(t.requestId, a),
        this.emit(Qf.Request, a),
        a.finalizeInterceptions());
    }
    #k(e, t) {
      let n = this.#t.getRequest(t.requestId);
      n ? n.updateHeaders(t.headers) : this.#t.requestExtraInfo(t.requestId).push(t);
    }
    #A(e, t) {
      let n = this.#t.getRequestWillBeSent(t.requestId),
        r = this.#t.getRequest(t.requestId);
      if (
        (r && (r._fromMemoryCache = !0),
        !r && n && (this.#O(e, n, void 0, !0), (r = this.#t.getRequest(t.requestId))),
        !r)
      ) {
        q(
          Error(
            `Request ${t.requestId} was served from cache but we could not find the corresponding request object`
          )
        );
        return;
      }
      this.emit(Qf.RequestServedFromCache, r);
    }
    #j(e, t, n, r) {
      let i = new im(t, n, r);
      ((t._response = i),
        t._redirectChain.push(t),
        i._resolveBody(Error(`Response body is unavailable for redirect responses`)),
        this.#F(t, !1),
        this.emit(Qf.Response, i),
        this.emit(Qf.RequestFinished, t));
    }
    #M(e, t, n) {
      let r = this.#t.getRequest(t.requestId);
      if (!r) return;
      (this.#t.responseExtraInfo(t.requestId).length &&
        q(Error(`Unexpected extraInfo events for request ` + t.requestId)),
        t.response.fromDiskCache && (n = null));
      let i = new im(r, t.response, n);
      ((r._response = i), this.emit(Qf.Response, i));
    }
    #N(e, t) {
      let n = this.#t.getRequest(t.requestId),
        r = null;
      if (
        n &&
        !n._fromMemoryCache &&
        t.hasExtraInfo &&
        ((r = this.#t.responseExtraInfo(t.requestId).shift()), !r)
      ) {
        this.#t.queueEventGroup(t.requestId, { responseReceivedEvent: t });
        return;
      }
      this.#M(e, t, r);
    }
    #P(e, t) {
      let n = this.#t.takeQueuedRedirectInfo(t.requestId);
      if (n) {
        (this.#t.responseExtraInfo(t.requestId).push(t), this.#O(e, n.event, n.fetchRequestId));
        return;
      }
      let r = this.#t.getQueuedEventGroup(t.requestId);
      if (r) {
        (this.#t.forgetQueuedEventGroup(t.requestId),
          this.#M(e, r.responseReceivedEvent, t),
          r.loadingFinishedEvent && this.#L(e, r.loadingFinishedEvent),
          r.loadingFailedEvent && this.#z(e, r.loadingFailedEvent));
        return;
      }
      this.#t.responseExtraInfo(t.requestId).push(t);
    }
    #F(e, t) {
      let n = e.id,
        r = e._interceptionId;
      (this.#t.forgetRequest(n), r !== void 0 && this.#i.delete(r), t && this.#t.forget(n));
    }
    #I(e, t) {
      let n = this.#t.getQueuedEventGroup(t.requestId);
      n ? (n.loadingFinishedEvent = t) : this.#L(e, t);
    }
    #L(e, t) {
      let n = this.#t.getRequest(t.requestId);
      n &&
        (this.#B(e, n),
        n.response() && n.response()?._resolveBody(),
        this.#F(n, !0),
        this.emit(Qf.RequestFinished, n));
    }
    #R(e, t) {
      let n = this.#t.getQueuedEventGroup(t.requestId);
      n ? (n.loadingFailedEvent = t) : this.#z(e, t);
    }
    #z(e, t) {
      let n = this.#t.getRequest(t.requestId);
      if (!n) return;
      (this.#B(e, n), (n._failureText = t.errorText));
      let r = n.response();
      (r && r._resolveBody(), this.#F(n, !0), this.emit(Qf.RequestFailed, n));
    }
    #B(e, t) {
      e !== t.client && (t.client = e);
    }
  },
  sm = 100,
  cm = `chrome-extension://`,
  lm = class extends Cu {
    #e;
    #t;
    #n;
    #r = new Set();
    #i;
    #a = new Map();
    #o = new Set();
    _frameTree = new em();
    #s = new Set();
    #c = new WeakMap();
    #l;
    get timeoutSettings() {
      return this.#n;
    }
    get networkManager() {
      return this.#t;
    }
    get client() {
      return this.#i;
    }
    constructor(e, t, n) {
      (super(),
        (this.#i = e),
        (this.#e = t),
        (this.#t = new om(this, t.browser().isNetworkEnabled())),
        (this.#n = n),
        this.setupEventListeners(this.#i),
        e.once(Au.Disconnected, () => {
          this.#u().catch(q);
        }));
    }
    async #u() {
      let e = this._frameTree.getMainFrame();
      if (!e) return;
      if (!this.#e.browser().connected) {
        this.#C(e);
        return;
      }
      for (let t of e.childFrames()) this.#C(t);
      let t = Eu.create({ timeout: sm, message: `Frame was not swapped` });
      e.once(uf.FrameSwappedByActivation, () => {
        t.resolve();
      });
      try {
        await t.valueOrThrow();
      } catch {
        this.#C(e);
      }
    }
    async swapFrameTree(e) {
      this.#i = e;
      let t = this._frameTree.getMainFrame();
      (t &&
        (this.#s.add(this.#i.target()._targetId),
        this._frameTree.removeFrame(t),
        t.updateId(this.#i.target()._targetId),
        this._frameTree.addFrame(t),
        t.updateClient(e)),
        this.setupEventListeners(e),
        e.once(Au.Disconnected, () => {
          this.#u().catch(q);
        }),
        await this.initialize(e, t),
        await this.#t.addClient(e),
        t && t.emit(uf.FrameSwappedByActivation, void 0));
    }
    async registerSpeculativeSession(e) {
      await this.#t.addClient(e);
    }
    setupEventListeners(e) {
      (e.on(`Page.frameAttached`, async (t) => {
        (await this.#l?.valueOrThrow(), this.#h(e, t.frameId, t.parentFrameId));
      }),
        e.on(`Page.frameNavigated`, async (e) => {
          (this.#s.add(e.frame.id), await this.#l?.valueOrThrow(), this.#g(e.frame, e.type));
        }),
        e.on(`Page.navigatedWithinDocument`, async (e) => {
          (await this.#l?.valueOrThrow(), this.#v(e.frameId, e.url));
        }),
        e.on(`Page.frameDetached`, async (e) => {
          (await this.#l?.valueOrThrow(), this.#y(e.frameId, e.reason));
        }),
        e.on(`Page.frameStartedLoading`, async (e) => {
          (await this.#l?.valueOrThrow(), this.#f(e.frameId));
        }),
        e.on(`Page.frameStoppedLoading`, async (e) => {
          (await this.#l?.valueOrThrow(), this.#p(e.frameId));
        }),
        e.on(`Runtime.executionContextCreated`, async (t) => {
          (await this.#l?.valueOrThrow(), this.#S(t.context, e));
        }),
        e.on(`Page.lifecycleEvent`, async (e) => {
          (await this.#l?.valueOrThrow(), this.#d(e));
        }),
        e.on(`Audits.issueAdded`, (e) => {
          this.#e.emit(`issue`, new gp(e.issue));
        }));
    }
    async initialize(e, t) {
      try {
        (this.#l?.resolve(),
          (this.#l = Eu.create()),
          await Promise.all([
            this.#t.addClient(e),
            e.send(`Page.enable`),
            e.send(`Page.getFrameTree`).then(({ frameTree: t }) => {
              (this.#m(e, t), this.#l?.resolve());
            }),
            e.send(`Page.setLifecycleEventsEnabled`, { enabled: !0 }),
            e.send(`Runtime.enable`).then(() => this.#_(e, mu)),
            ...(t ? Array.from(this.#a.values()) : []).map((e) => t?.addPreloadScript(e)),
            ...(t ? Array.from(this.#o.values()) : []).map((e) => t?.addExposedFunctionBinding(e)),
            this.#e.browser().isIssuesEnabled() && e.send(`Audits.enable`),
          ]));
      } catch (e) {
        if ((this.#l?.resolve(), Iu(e) && ap(e))) return;
        throw e;
      }
    }
    page() {
      return this.#e;
    }
    mainFrame() {
      let e = this._frameTree.getMainFrame();
      return (K(e, `Requesting main frame too early!`), e);
    }
    frames() {
      return Array.from(this._frameTree.frames());
    }
    frame(e) {
      return this._frameTree.getById(e) || null;
    }
    async addExposedFunctionBinding(e) {
      (this.#o.add(e),
        await Promise.all(this.frames().map(async (t) => await t.addExposedFunctionBinding(e))));
    }
    async removeExposedFunctionBinding(e) {
      (this.#o.delete(e),
        await Promise.all(this.frames().map(async (t) => await t.removeExposedFunctionBinding(e))));
    }
    async evaluateOnNewDocument(e) {
      let { identifier: t } = await this.mainFrame()
          ._client()
          .send(`Page.addScriptToEvaluateOnNewDocument`, { source: e }),
        n = new _p(this.mainFrame(), t, e);
      return (
        this.#a.set(t, n),
        await Promise.all(this.frames().map(async (e) => await e.addPreloadScript(n))),
        { identifier: t }
      );
    }
    async removeScriptToEvaluateOnNewDocument(e) {
      let t = this.#a.get(e);
      if (!t) throw Error(`Script to evaluate on new document with id ${e} not found`);
      (this.#a.delete(e),
        await Promise.all(
          this.frames().map((e) => {
            let n = t.getIdForFrame(e);
            if (n)
              return e
                ._client()
                .send(`Page.removeScriptToEvaluateOnNewDocument`, { identifier: n })
                .catch(q);
          })
        ));
    }
    onAttachedToTarget(e) {
      if (e._getTargetInfo().type !== `iframe`) return;
      let t = this.frame(e._getTargetInfo().targetId);
      (t && t.updateClient(e._session()),
        this.setupEventListeners(e._session()),
        this.initialize(e._session(), t).catch(q));
    }
    _deviceRequestPromptManager(e) {
      let t = this.#c.get(e);
      return (t === void 0 && ((t = new yp(e, this.#n)), this.#c.set(e, t)), t);
    }
    #d(e) {
      let t = this.frame(e.frameId);
      t &&
        (t._onLifecycleEvent(e.loaderId, e.name),
        this.emit(Up.LifecycleEvent, t),
        t.emit(uf.LifecycleEvent, void 0));
    }
    #f(e) {
      let t = this.frame(e);
      t && t._onLoadingStarted();
    }
    #p(e) {
      let t = this.frame(e);
      t &&
        (t._onLoadingStopped(), this.emit(Up.LifecycleEvent, t), t.emit(uf.LifecycleEvent, void 0));
    }
    #m(e, t) {
      if (
        (t.frame.parentId && this.#h(e, t.frame.id, t.frame.parentId),
        this.#s.has(t.frame.id) ? this.#s.delete(t.frame.id) : this.#g(t.frame, `Navigation`),
        t.childFrames)
      )
        for (let n of t.childFrames) this.#m(e, n);
    }
    #h(e, t, n) {
      let r = this.frame(t);
      if (r) {
        let t = this.frame(n);
        e && t && r.client !== t?.client && r.updateClient(e);
        return;
      }
      ((r = new Qp(this, t, n, e)), this._frameTree.addFrame(r), this.emit(Up.FrameAttached, r));
    }
    async #g(e, t) {
      let n = e.id,
        r = !e.parentId,
        i = this._frameTree.getById(n);
      if (i) for (let e of i.childFrames()) this.#C(e);
      (r &&
        (i ? (this._frameTree.removeFrame(i), (i._id = n)) : (i = new Qp(this, n, void 0, this.#i)),
        this._frameTree.addFrame(i)),
        (i = await this._frameTree.waitForFrame(n)),
        i._navigated(e),
        this.emit(Up.FrameNavigated, i),
        i.emit(uf.FrameNavigated, t));
    }
    async #_(e, t) {
      let n = `${e.id()}:${t}`;
      this.#r.has(n) ||
        (await e.send(`Page.addScriptToEvaluateOnNewDocument`, {
          source: `//# sourceURL=${eu.INTERNAL_URL}`,
          worldName: t,
        }),
        await Promise.all(
          this.frames()
            .filter((t) => t.client === e)
            .map((n) =>
              e
                .send(`Page.createIsolatedWorld`, {
                  frameId: n._id,
                  worldName: t,
                  grantUniveralAccess: !0,
                })
                .catch(q)
            )
        ),
        this.#r.add(n));
    }
    #v(e, t) {
      let n = this.frame(e);
      n &&
        (n._navigatedWithinDocument(t),
        this.emit(Up.FrameNavigatedWithinDocument, n),
        n.emit(uf.FrameNavigatedWithinDocument, void 0),
        this.emit(Up.FrameNavigated, n),
        n.emit(uf.FrameNavigated, `Navigation`));
    }
    #y(e, t) {
      let n = this.frame(e);
      if (n)
        switch (t) {
          case `remove`:
            this.#C(n);
            break;
          case `swap`:
            (this.emit(Up.FrameSwapped, n), n.emit(uf.FrameSwapped, void 0));
            break;
        }
    }
    #b(e) {
      return e.startsWith(cm);
    }
    #x(e) {
      if (!e || !this.#b(e)) return null;
      let t = e.substring(19),
        n = t.indexOf(`/`);
      return n === -1 ? t : t.substring(0, n);
    }
    #S(e, t) {
      let n = e.auxData,
        r = e.origin,
        i = n && n.frameId,
        a = typeof i == `string` ? this.frame(i) : void 0,
        o;
      if (a) {
        if (a.client !== t) return;
        if (e.auxData && e.auxData.isDefault) o = a.worlds[Wp];
        else if (e.name === mu) o = a.worlds[Gp];
        else if (this.#b(r)) {
          let e = this.#x(r);
          if (!e) {
            q(`Error while parsing extension id`);
            return;
          }
          a.extensionWorlds[e]
            ? (o = a.extensionWorlds[e])
            : ((o = new qp(a, this.timeoutSettings, e)),
              (a.extensionWorlds[e] = o),
              a.registerWorldListeners(o),
              (o.origin = r),
              o.setWorldId(e));
        }
      }
      if (!o) return;
      let s = new Vp(a?.client || this.#i, e, o);
      o.setContext(s);
    }
    #C(e) {
      for (let t of e.childFrames()) this.#C(t);
      (this._frameTree.removeFrame(e),
        this.emit(Up.FrameDetached, e),
        e.emit(uf.FrameDetached, e),
        e[Tl]());
    }
  },
  um = {
    0: { keyCode: 48, key: `0`, code: `Digit0` },
    1: { keyCode: 49, key: `1`, code: `Digit1` },
    2: { keyCode: 50, key: `2`, code: `Digit2` },
    3: { keyCode: 51, key: `3`, code: `Digit3` },
    4: { keyCode: 52, key: `4`, code: `Digit4` },
    5: { keyCode: 53, key: `5`, code: `Digit5` },
    6: { keyCode: 54, key: `6`, code: `Digit6` },
    7: { keyCode: 55, key: `7`, code: `Digit7` },
    8: { keyCode: 56, key: `8`, code: `Digit8` },
    9: { keyCode: 57, key: `9`, code: `Digit9` },
    Power: { key: `Power`, code: `Power` },
    Eject: { key: `Eject`, code: `Eject` },
    Abort: { keyCode: 3, code: `Abort`, key: `Cancel` },
    Help: { keyCode: 6, code: `Help`, key: `Help` },
    Backspace: { keyCode: 8, code: `Backspace`, key: `Backspace` },
    Tab: { keyCode: 9, code: `Tab`, key: `Tab` },
    Numpad5: {
      keyCode: 12,
      shiftKeyCode: 101,
      key: `Clear`,
      code: `Numpad5`,
      shiftKey: `5`,
      location: 3,
    },
    NumpadEnter: { keyCode: 13, code: `NumpadEnter`, key: `Enter`, text: `\r`, location: 3 },
    Enter: { keyCode: 13, code: `Enter`, key: `Enter`, text: `\r` },
    '\r': { keyCode: 13, code: `Enter`, key: `Enter`, text: `\r` },
    '\n': { keyCode: 13, code: `Enter`, key: `Enter`, text: `\r` },
    ShiftLeft: { keyCode: 16, code: `ShiftLeft`, key: `Shift`, location: 1 },
    ShiftRight: { keyCode: 16, code: `ShiftRight`, key: `Shift`, location: 2 },
    ControlLeft: { keyCode: 17, code: `ControlLeft`, key: `Control`, location: 1 },
    ControlRight: { keyCode: 17, code: `ControlRight`, key: `Control`, location: 2 },
    AltLeft: { keyCode: 18, code: `AltLeft`, key: `Alt`, location: 1 },
    AltRight: { keyCode: 18, code: `AltRight`, key: `Alt`, location: 2 },
    Pause: { keyCode: 19, code: `Pause`, key: `Pause` },
    CapsLock: { keyCode: 20, code: `CapsLock`, key: `CapsLock` },
    Escape: { keyCode: 27, code: `Escape`, key: `Escape` },
    Convert: { keyCode: 28, code: `Convert`, key: `Convert` },
    NonConvert: { keyCode: 29, code: `NonConvert`, key: `NonConvert` },
    Space: { keyCode: 32, code: `Space`, key: ` ` },
    Numpad9: {
      keyCode: 33,
      shiftKeyCode: 105,
      key: `PageUp`,
      code: `Numpad9`,
      shiftKey: `9`,
      location: 3,
    },
    PageUp: { keyCode: 33, code: `PageUp`, key: `PageUp` },
    Numpad3: {
      keyCode: 34,
      shiftKeyCode: 99,
      key: `PageDown`,
      code: `Numpad3`,
      shiftKey: `3`,
      location: 3,
    },
    PageDown: { keyCode: 34, code: `PageDown`, key: `PageDown` },
    End: { keyCode: 35, code: `End`, key: `End` },
    Numpad1: {
      keyCode: 35,
      shiftKeyCode: 97,
      key: `End`,
      code: `Numpad1`,
      shiftKey: `1`,
      location: 3,
    },
    Home: { keyCode: 36, code: `Home`, key: `Home` },
    Numpad7: {
      keyCode: 36,
      shiftKeyCode: 103,
      key: `Home`,
      code: `Numpad7`,
      shiftKey: `7`,
      location: 3,
    },
    ArrowLeft: { keyCode: 37, code: `ArrowLeft`, key: `ArrowLeft` },
    Numpad4: {
      keyCode: 37,
      shiftKeyCode: 100,
      key: `ArrowLeft`,
      code: `Numpad4`,
      shiftKey: `4`,
      location: 3,
    },
    Numpad8: {
      keyCode: 38,
      shiftKeyCode: 104,
      key: `ArrowUp`,
      code: `Numpad8`,
      shiftKey: `8`,
      location: 3,
    },
    ArrowUp: { keyCode: 38, code: `ArrowUp`, key: `ArrowUp` },
    ArrowRight: { keyCode: 39, code: `ArrowRight`, key: `ArrowRight` },
    Numpad6: {
      keyCode: 39,
      shiftKeyCode: 102,
      key: `ArrowRight`,
      code: `Numpad6`,
      shiftKey: `6`,
      location: 3,
    },
    Numpad2: {
      keyCode: 40,
      shiftKeyCode: 98,
      key: `ArrowDown`,
      code: `Numpad2`,
      shiftKey: `2`,
      location: 3,
    },
    ArrowDown: { keyCode: 40, code: `ArrowDown`, key: `ArrowDown` },
    Select: { keyCode: 41, code: `Select`, key: `Select` },
    Open: { keyCode: 43, code: `Open`, key: `Execute` },
    PrintScreen: { keyCode: 44, code: `PrintScreen`, key: `PrintScreen` },
    Insert: { keyCode: 45, code: `Insert`, key: `Insert` },
    Numpad0: {
      keyCode: 45,
      shiftKeyCode: 96,
      key: `Insert`,
      code: `Numpad0`,
      shiftKey: `0`,
      location: 3,
    },
    Delete: { keyCode: 46, code: `Delete`, key: `Delete` },
    NumpadDecimal: {
      keyCode: 46,
      shiftKeyCode: 110,
      code: `NumpadDecimal`,
      key: `\0`,
      shiftKey: `.`,
      location: 3,
    },
    Digit0: { keyCode: 48, code: `Digit0`, shiftKey: `)`, key: `0` },
    Digit1: { keyCode: 49, code: `Digit1`, shiftKey: `!`, key: `1` },
    Digit2: { keyCode: 50, code: `Digit2`, shiftKey: `@`, key: `2` },
    Digit3: { keyCode: 51, code: `Digit3`, shiftKey: `#`, key: `3` },
    Digit4: { keyCode: 52, code: `Digit4`, shiftKey: `$`, key: `4` },
    Digit5: { keyCode: 53, code: `Digit5`, shiftKey: `%`, key: `5` },
    Digit6: { keyCode: 54, code: `Digit6`, shiftKey: `^`, key: `6` },
    Digit7: { keyCode: 55, code: `Digit7`, shiftKey: `&`, key: `7` },
    Digit8: { keyCode: 56, code: `Digit8`, shiftKey: `*`, key: `8` },
    Digit9: { keyCode: 57, code: `Digit9`, shiftKey: `(`, key: `9` },
    KeyA: { keyCode: 65, code: `KeyA`, shiftKey: `A`, key: `a` },
    KeyB: { keyCode: 66, code: `KeyB`, shiftKey: `B`, key: `b` },
    KeyC: { keyCode: 67, code: `KeyC`, shiftKey: `C`, key: `c` },
    KeyD: { keyCode: 68, code: `KeyD`, shiftKey: `D`, key: `d` },
    KeyE: { keyCode: 69, code: `KeyE`, shiftKey: `E`, key: `e` },
    KeyF: { keyCode: 70, code: `KeyF`, shiftKey: `F`, key: `f` },
    KeyG: { keyCode: 71, code: `KeyG`, shiftKey: `G`, key: `g` },
    KeyH: { keyCode: 72, code: `KeyH`, shiftKey: `H`, key: `h` },
    KeyI: { keyCode: 73, code: `KeyI`, shiftKey: `I`, key: `i` },
    KeyJ: { keyCode: 74, code: `KeyJ`, shiftKey: `J`, key: `j` },
    KeyK: { keyCode: 75, code: `KeyK`, shiftKey: `K`, key: `k` },
    KeyL: { keyCode: 76, code: `KeyL`, shiftKey: `L`, key: `l` },
    KeyM: { keyCode: 77, code: `KeyM`, shiftKey: `M`, key: `m` },
    KeyN: { keyCode: 78, code: `KeyN`, shiftKey: `N`, key: `n` },
    KeyO: { keyCode: 79, code: `KeyO`, shiftKey: `O`, key: `o` },
    KeyP: { keyCode: 80, code: `KeyP`, shiftKey: `P`, key: `p` },
    KeyQ: { keyCode: 81, code: `KeyQ`, shiftKey: `Q`, key: `q` },
    KeyR: { keyCode: 82, code: `KeyR`, shiftKey: `R`, key: `r` },
    KeyS: { keyCode: 83, code: `KeyS`, shiftKey: `S`, key: `s` },
    KeyT: { keyCode: 84, code: `KeyT`, shiftKey: `T`, key: `t` },
    KeyU: { keyCode: 85, code: `KeyU`, shiftKey: `U`, key: `u` },
    KeyV: { keyCode: 86, code: `KeyV`, shiftKey: `V`, key: `v` },
    KeyW: { keyCode: 87, code: `KeyW`, shiftKey: `W`, key: `w` },
    KeyX: { keyCode: 88, code: `KeyX`, shiftKey: `X`, key: `x` },
    KeyY: { keyCode: 89, code: `KeyY`, shiftKey: `Y`, key: `y` },
    KeyZ: { keyCode: 90, code: `KeyZ`, shiftKey: `Z`, key: `z` },
    MetaLeft: { keyCode: 91, code: `MetaLeft`, key: `Meta`, location: 1 },
    MetaRight: { keyCode: 92, code: `MetaRight`, key: `Meta`, location: 2 },
    ContextMenu: { keyCode: 93, code: `ContextMenu`, key: `ContextMenu` },
    NumpadMultiply: { keyCode: 106, code: `NumpadMultiply`, key: `*`, location: 3 },
    NumpadAdd: { keyCode: 107, code: `NumpadAdd`, key: `+`, location: 3 },
    NumpadSubtract: { keyCode: 109, code: `NumpadSubtract`, key: `-`, location: 3 },
    NumpadDivide: { keyCode: 111, code: `NumpadDivide`, key: `/`, location: 3 },
    F1: { keyCode: 112, code: `F1`, key: `F1` },
    F2: { keyCode: 113, code: `F2`, key: `F2` },
    F3: { keyCode: 114, code: `F3`, key: `F3` },
    F4: { keyCode: 115, code: `F4`, key: `F4` },
    F5: { keyCode: 116, code: `F5`, key: `F5` },
    F6: { keyCode: 117, code: `F6`, key: `F6` },
    F7: { keyCode: 118, code: `F7`, key: `F7` },
    F8: { keyCode: 119, code: `F8`, key: `F8` },
    F9: { keyCode: 120, code: `F9`, key: `F9` },
    F10: { keyCode: 121, code: `F10`, key: `F10` },
    F11: { keyCode: 122, code: `F11`, key: `F11` },
    F12: { keyCode: 123, code: `F12`, key: `F12` },
    F13: { keyCode: 124, code: `F13`, key: `F13` },
    F14: { keyCode: 125, code: `F14`, key: `F14` },
    F15: { keyCode: 126, code: `F15`, key: `F15` },
    F16: { keyCode: 127, code: `F16`, key: `F16` },
    F17: { keyCode: 128, code: `F17`, key: `F17` },
    F18: { keyCode: 129, code: `F18`, key: `F18` },
    F19: { keyCode: 130, code: `F19`, key: `F19` },
    F20: { keyCode: 131, code: `F20`, key: `F20` },
    F21: { keyCode: 132, code: `F21`, key: `F21` },
    F22: { keyCode: 133, code: `F22`, key: `F22` },
    F23: { keyCode: 134, code: `F23`, key: `F23` },
    F24: { keyCode: 135, code: `F24`, key: `F24` },
    NumLock: { keyCode: 144, code: `NumLock`, key: `NumLock` },
    ScrollLock: { keyCode: 145, code: `ScrollLock`, key: `ScrollLock` },
    AudioVolumeMute: { keyCode: 173, code: `AudioVolumeMute`, key: `AudioVolumeMute` },
    AudioVolumeDown: { keyCode: 174, code: `AudioVolumeDown`, key: `AudioVolumeDown` },
    AudioVolumeUp: { keyCode: 175, code: `AudioVolumeUp`, key: `AudioVolumeUp` },
    MediaTrackNext: { keyCode: 176, code: `MediaTrackNext`, key: `MediaTrackNext` },
    MediaTrackPrevious: { keyCode: 177, code: `MediaTrackPrevious`, key: `MediaTrackPrevious` },
    MediaStop: { keyCode: 178, code: `MediaStop`, key: `MediaStop` },
    MediaPlayPause: { keyCode: 179, code: `MediaPlayPause`, key: `MediaPlayPause` },
    Semicolon: { keyCode: 186, code: `Semicolon`, shiftKey: `:`, key: `;` },
    Equal: { keyCode: 187, code: `Equal`, shiftKey: `+`, key: `=` },
    NumpadEqual: { keyCode: 187, code: `NumpadEqual`, key: `=`, location: 3 },
    Comma: { keyCode: 188, code: `Comma`, shiftKey: `<`, key: `,` },
    Minus: { keyCode: 189, code: `Minus`, shiftKey: `_`, key: `-` },
    Period: { keyCode: 190, code: `Period`, shiftKey: `>`, key: `.` },
    Slash: { keyCode: 191, code: `Slash`, shiftKey: `?`, key: `/` },
    Backquote: { keyCode: 192, code: `Backquote`, shiftKey: `~`, key: '`' },
    BracketLeft: { keyCode: 219, code: `BracketLeft`, shiftKey: `{`, key: `[` },
    Backslash: { keyCode: 220, code: `Backslash`, shiftKey: `|`, key: `\\` },
    BracketRight: { keyCode: 221, code: `BracketRight`, shiftKey: `}`, key: `]` },
    Quote: { keyCode: 222, code: `Quote`, shiftKey: `"`, key: `'` },
    AltGraph: { keyCode: 225, code: `AltGraph`, key: `AltGraph` },
    Props: { keyCode: 247, code: `Props`, key: `CrSel` },
    Cancel: { keyCode: 3, key: `Cancel`, code: `Abort` },
    Clear: { keyCode: 12, key: `Clear`, code: `Numpad5`, location: 3 },
    Shift: { keyCode: 16, key: `Shift`, code: `ShiftLeft`, location: 1 },
    Control: { keyCode: 17, key: `Control`, code: `ControlLeft`, location: 1 },
    Alt: { keyCode: 18, key: `Alt`, code: `AltLeft`, location: 1 },
    Accept: { keyCode: 30, key: `Accept` },
    ModeChange: { keyCode: 31, key: `ModeChange` },
    ' ': { keyCode: 32, key: ` `, code: `Space` },
    Print: { keyCode: 42, key: `Print` },
    Execute: { keyCode: 43, key: `Execute`, code: `Open` },
    '\0': { keyCode: 46, key: `\0`, code: `NumpadDecimal`, location: 3 },
    a: { keyCode: 65, key: `a`, code: `KeyA` },
    b: { keyCode: 66, key: `b`, code: `KeyB` },
    c: { keyCode: 67, key: `c`, code: `KeyC` },
    d: { keyCode: 68, key: `d`, code: `KeyD` },
    e: { keyCode: 69, key: `e`, code: `KeyE` },
    f: { keyCode: 70, key: `f`, code: `KeyF` },
    g: { keyCode: 71, key: `g`, code: `KeyG` },
    h: { keyCode: 72, key: `h`, code: `KeyH` },
    i: { keyCode: 73, key: `i`, code: `KeyI` },
    j: { keyCode: 74, key: `j`, code: `KeyJ` },
    k: { keyCode: 75, key: `k`, code: `KeyK` },
    l: { keyCode: 76, key: `l`, code: `KeyL` },
    m: { keyCode: 77, key: `m`, code: `KeyM` },
    n: { keyCode: 78, key: `n`, code: `KeyN` },
    o: { keyCode: 79, key: `o`, code: `KeyO` },
    p: { keyCode: 80, key: `p`, code: `KeyP` },
    q: { keyCode: 81, key: `q`, code: `KeyQ` },
    r: { keyCode: 82, key: `r`, code: `KeyR` },
    s: { keyCode: 83, key: `s`, code: `KeyS` },
    t: { keyCode: 84, key: `t`, code: `KeyT` },
    u: { keyCode: 85, key: `u`, code: `KeyU` },
    v: { keyCode: 86, key: `v`, code: `KeyV` },
    w: { keyCode: 87, key: `w`, code: `KeyW` },
    x: { keyCode: 88, key: `x`, code: `KeyX` },
    y: { keyCode: 89, key: `y`, code: `KeyY` },
    z: { keyCode: 90, key: `z`, code: `KeyZ` },
    Meta: { keyCode: 91, key: `Meta`, code: `MetaLeft`, location: 1 },
    '*': { keyCode: 106, key: `*`, code: `NumpadMultiply`, location: 3 },
    '+': { keyCode: 107, key: `+`, code: `NumpadAdd`, location: 3 },
    '-': { keyCode: 109, key: `-`, code: `NumpadSubtract`, location: 3 },
    '/': { keyCode: 111, key: `/`, code: `NumpadDivide`, location: 3 },
    ';': { keyCode: 186, key: `;`, code: `Semicolon` },
    '=': { keyCode: 187, key: `=`, code: `Equal` },
    ',': { keyCode: 188, key: `,`, code: `Comma` },
    '.': { keyCode: 190, key: `.`, code: `Period` },
    '`': { keyCode: 192, key: '`', code: `Backquote` },
    '[': { keyCode: 219, key: `[`, code: `BracketLeft` },
    '\\': { keyCode: 220, key: `\\`, code: `Backslash` },
    ']': { keyCode: 221, key: `]`, code: `BracketRight` },
    "'": { keyCode: 222, key: `'`, code: `Quote` },
    Attn: { keyCode: 246, key: `Attn` },
    CrSel: { keyCode: 247, key: `CrSel`, code: `Props` },
    ExSel: { keyCode: 248, key: `ExSel` },
    EraseEof: { keyCode: 249, key: `EraseEof` },
    Play: { keyCode: 250, key: `Play` },
    ZoomOut: { keyCode: 251, key: `ZoomOut` },
    ')': { keyCode: 48, key: `)`, code: `Digit0` },
    '!': { keyCode: 49, key: `!`, code: `Digit1` },
    '@': { keyCode: 50, key: `@`, code: `Digit2` },
    '#': { keyCode: 51, key: `#`, code: `Digit3` },
    $: { keyCode: 52, key: `$`, code: `Digit4` },
    '%': { keyCode: 53, key: `%`, code: `Digit5` },
    '^': { keyCode: 54, key: `^`, code: `Digit6` },
    '&': { keyCode: 55, key: `&`, code: `Digit7` },
    '(': { keyCode: 57, key: `(`, code: `Digit9` },
    A: { keyCode: 65, key: `A`, code: `KeyA` },
    B: { keyCode: 66, key: `B`, code: `KeyB` },
    C: { keyCode: 67, key: `C`, code: `KeyC` },
    D: { keyCode: 68, key: `D`, code: `KeyD` },
    E: { keyCode: 69, key: `E`, code: `KeyE` },
    F: { keyCode: 70, key: `F`, code: `KeyF` },
    G: { keyCode: 71, key: `G`, code: `KeyG` },
    H: { keyCode: 72, key: `H`, code: `KeyH` },
    I: { keyCode: 73, key: `I`, code: `KeyI` },
    J: { keyCode: 74, key: `J`, code: `KeyJ` },
    K: { keyCode: 75, key: `K`, code: `KeyK` },
    L: { keyCode: 76, key: `L`, code: `KeyL` },
    M: { keyCode: 77, key: `M`, code: `KeyM` },
    N: { keyCode: 78, key: `N`, code: `KeyN` },
    O: { keyCode: 79, key: `O`, code: `KeyO` },
    P: { keyCode: 80, key: `P`, code: `KeyP` },
    Q: { keyCode: 81, key: `Q`, code: `KeyQ` },
    R: { keyCode: 82, key: `R`, code: `KeyR` },
    S: { keyCode: 83, key: `S`, code: `KeyS` },
    T: { keyCode: 84, key: `T`, code: `KeyT` },
    U: { keyCode: 85, key: `U`, code: `KeyU` },
    V: { keyCode: 86, key: `V`, code: `KeyV` },
    W: { keyCode: 87, key: `W`, code: `KeyW` },
    X: { keyCode: 88, key: `X`, code: `KeyX` },
    Y: { keyCode: 89, key: `Y`, code: `KeyY` },
    Z: { keyCode: 90, key: `Z`, code: `KeyZ` },
    ':': { keyCode: 186, key: `:`, code: `Semicolon` },
    '<': { keyCode: 188, key: `<`, code: `Comma` },
    _: { keyCode: 189, key: `_`, code: `Minus` },
    '>': { keyCode: 190, key: `>`, code: `Period` },
    '?': { keyCode: 191, key: `?`, code: `Slash` },
    '~': { keyCode: 192, key: `~`, code: `Backquote` },
    '{': { keyCode: 219, key: `{`, code: `BracketLeft` },
    '|': { keyCode: 220, key: `|`, code: `Backslash` },
    '}': { keyCode: 221, key: `}`, code: `BracketRight` },
    '"': { keyCode: 222, key: `"`, code: `Quote` },
    SoftLeft: { key: `SoftLeft`, code: `SoftLeft`, location: 4 },
    SoftRight: { key: `SoftRight`, code: `SoftRight`, location: 4 },
    Camera: { keyCode: 44, key: `Camera`, code: `Camera`, location: 4 },
    Call: { key: `Call`, code: `Call`, location: 4 },
    EndCall: { keyCode: 95, key: `EndCall`, code: `EndCall`, location: 4 },
    VolumeDown: { keyCode: 182, key: `VolumeDown`, code: `VolumeDown`, location: 4 },
    VolumeUp: { keyCode: 183, key: `VolumeUp`, code: `VolumeUp`, location: 4 },
  },
  dm = class extends xf {
    #e;
    #t = new Set();
    _modifiers = 0;
    constructor(e) {
      (super(), (this.#e = e));
    }
    updateClient(e) {
      this.#e = e;
    }
    async down(e, t = { text: void 0, commands: [] }) {
      let n = this.#r(e),
        r = this.#t.has(n.code);
      (this.#t.add(n.code), (this._modifiers |= this.#n(n.key)));
      let i = t.text === void 0 ? n.text : t.text;
      await this.#e.send(`Input.dispatchKeyEvent`, {
        type: i ? `keyDown` : `rawKeyDown`,
        modifiers: this._modifiers,
        windowsVirtualKeyCode: n.keyCode,
        code: n.code,
        key: n.key,
        text: i,
        unmodifiedText: i,
        autoRepeat: r,
        location: n.location,
        isKeypad: n.location === 3,
        commands: t.commands,
      });
    }
    #n(e) {
      return e === `Alt` ? 1 : e === `Control` ? 2 : e === `Meta` ? 4 : e === `Shift` ? 8 : 0;
    }
    #r(e) {
      let t = this._modifiers & 8,
        n = { key: ``, keyCode: 0, code: ``, text: ``, location: 0 },
        r = um[e];
      return (
        K(r, `Unknown key: "${e}"`),
        r.key && (n.key = r.key),
        t && r.shiftKey && (n.key = r.shiftKey),
        r.keyCode && (n.keyCode = r.keyCode),
        t && r.shiftKeyCode && (n.keyCode = r.shiftKeyCode),
        r.code && (n.code = r.code),
        r.location && (n.location = r.location),
        n.key.length === 1 && (n.text = n.key),
        r.text && (n.text = r.text),
        t && r.shiftText && (n.text = r.shiftText),
        this._modifiers & -9 && (n.text = ``),
        n
      );
    }
    async up(e) {
      let t = this.#r(e);
      ((this._modifiers &= ~this.#n(t.key)),
        this.#t.delete(t.code),
        await this.#e.send(`Input.dispatchKeyEvent`, {
          type: `keyUp`,
          modifiers: this._modifiers,
          key: t.key,
          windowsVirtualKeyCode: t.keyCode,
          code: t.code,
          location: t.location,
        }));
    }
    async sendCharacter(e) {
      await this.#e.send(`Input.insertText`, { text: e });
    }
    charIsKey(e) {
      return !!um[e];
    }
    async type(e, t = {}) {
      let n = t.delay || void 0;
      for (let t of e)
        this.charIsKey(t)
          ? await this.press(t, { delay: n })
          : (n && (await new Promise((e) => setTimeout(e, n))), await this.sendCharacter(t));
    }
    async press(e, t = {}) {
      let { delay: n = null } = t;
      (await this.down(e, t),
        n && (await new Promise((e) => setTimeout(e, t.delay))),
        await this.up(e));
    }
  },
  fm = (e) => {
    switch (e) {
      case Sf.Left:
        return 1;
      case Sf.Right:
        return 2;
      case Sf.Middle:
        return 4;
      case Sf.Back:
        return 8;
      case Sf.Forward:
        return 16;
    }
  },
  pm = (e) =>
    e & 1
      ? Sf.Left
      : e & 2
        ? Sf.Right
        : e & 4
          ? Sf.Middle
          : e & 8
            ? Sf.Back
            : e & 16
              ? Sf.Forward
              : `none`,
  mm = class extends Cf {
    #e;
    #t;
    constructor(e, t) {
      (super(), (this.#e = e), (this.#t = t));
    }
    updateClient(e) {
      this.#e = e;
    }
    #n = { position: { x: 0, y: 0 }, buttons: 0 };
    get #r() {
      return Object.assign({ ...this.#n }, ...this.#i);
    }
    #i = [];
    #a() {
      let e = {};
      this.#i.push(e);
      let t = () => {
        this.#i.splice(this.#i.indexOf(e), 1);
      };
      return {
        update: (t) => {
          Object.assign(e, t);
        },
        commit: () => {
          ((this.#n = { ...this.#n, ...e }), t());
        },
        rollback: t,
      };
    }
    async #o(e) {
      let { update: t, commit: n, rollback: r } = this.#a();
      try {
        (await e(t), n());
      } catch (e) {
        throw (r(), e);
      }
    }
    async reset() {
      let e = [];
      for (let [t, n] of [
        [1, Sf.Left],
        [4, Sf.Middle],
        [2, Sf.Right],
        [16, Sf.Forward],
        [8, Sf.Back],
      ])
        this.#r.buttons & t && e.push(this.up({ button: n }));
      ((this.#r.position.x !== 0 || this.#r.position.y !== 0) && e.push(this.move(0, 0)),
        await Promise.all(e));
    }
    async move(e, t, n = {}) {
      let { steps: r = 1 } = n,
        i = this.#r.position,
        a = { x: e, y: t };
      for (let e = 1; e <= r; e++)
        await this.#o((t) => {
          t({ position: { x: i.x + (a.x - i.x) * (e / r), y: i.y + (a.y - i.y) * (e / r) } });
          let { buttons: n, position: o } = this.#r;
          return this.#e.send(`Input.dispatchMouseEvent`, {
            type: `mouseMoved`,
            modifiers: this.#t._modifiers,
            buttons: n,
            button: pm(n),
            ...o,
          });
        });
    }
    async down(e = {}) {
      let { button: t = Sf.Left, clickCount: n = 1 } = e,
        r = fm(t);
      if (!r) throw Error(`Unsupported mouse button: ${t}`);
      if (this.#r.buttons & r) throw Error(`'${t}' is already pressed.`);
      await this.#o((e) => {
        e({ buttons: this.#r.buttons | r });
        let { buttons: i, position: a } = this.#r;
        return this.#e.send(`Input.dispatchMouseEvent`, {
          type: `mousePressed`,
          modifiers: this.#t._modifiers,
          clickCount: n,
          buttons: i,
          button: t,
          ...a,
        });
      });
    }
    async up(e = {}) {
      let { button: t = Sf.Left, clickCount: n = 1 } = e,
        r = fm(t);
      if (!r) throw Error(`Unsupported mouse button: ${t}`);
      if (!(this.#r.buttons & r)) throw Error(`'${t}' is not pressed.`);
      await this.#o((e) => {
        e({ buttons: this.#r.buttons & ~r });
        let { buttons: i, position: a } = this.#r;
        return this.#e.send(`Input.dispatchMouseEvent`, {
          type: `mouseReleased`,
          modifiers: this.#t._modifiers,
          clickCount: n,
          buttons: i,
          button: t,
          ...a,
        });
      });
    }
    async click(e, t, n = {}) {
      let { delay: r, count: i = 1 } = n;
      if (i < 1) throw Error(`Click must occur a positive number of times.`);
      let a = [this.move(e, t)];
      for (let e = 1; e < i; ++e)
        a.push(this.down({ ...n, clickCount: e }), this.up({ ...n, clickCount: e }));
      (a.push(this.down({ ...n, clickCount: i })),
        typeof r == `number` &&
          (await Promise.all(a),
          (a.length = 0),
          await new Promise((e) => {
            setTimeout(e, r);
          })),
        a.push(this.up({ ...n, clickCount: i })),
        await Promise.all(a));
    }
    async wheel(e = {}) {
      let { deltaX: t = 0, deltaY: n = 0 } = e,
        { position: r, buttons: i } = this.#r;
      await this.#e.send(`Input.dispatchMouseEvent`, {
        type: `mouseWheel`,
        pointerType: `mouse`,
        modifiers: this.#t._modifiers,
        deltaY: n,
        deltaX: t,
        buttons: i,
        ...r,
      });
    }
    async drag(e, t) {
      let n = new Promise((e) => {
        this.#e.once(`Input.dragIntercepted`, (t) => e(t.data));
      });
      return (await this.move(e.x, e.y), await this.down(), await this.move(t.x, t.y), await n);
    }
    async dragEnter(e, t) {
      await this.#e.send(`Input.dispatchDragEvent`, {
        type: `dragEnter`,
        x: e.x,
        y: e.y,
        modifiers: this.#t._modifiers,
        data: t,
      });
    }
    async dragOver(e, t) {
      await this.#e.send(`Input.dispatchDragEvent`, {
        type: `dragOver`,
        x: e.x,
        y: e.y,
        modifiers: this.#t._modifiers,
        data: t,
      });
    }
    async drop(e, t) {
      await this.#e.send(`Input.dispatchDragEvent`, {
        type: `drop`,
        x: e.x,
        y: e.y,
        modifiers: this.#t._modifiers,
        data: t,
      });
    }
    async dragAndDrop(e, t, n = {}) {
      let { delay: r = null } = n,
        i = await this.drag(e, t);
      (await this.dragEnter(t, i),
        await this.dragOver(t, i),
        r && (await new Promise((e) => setTimeout(e, r))),
        await this.drop(t, i),
        await this.up());
    }
  },
  hm = class {
    #e = !1;
    #t;
    #n;
    #r;
    #i;
    constructor(e, t, n, r) {
      ((this.#r = e), (this.#t = t), (this.#i = n), (this.#n = r));
    }
    updateClient(e) {
      this.#r = e;
    }
    async start() {
      if (this.#e) throw new Kl(`Touch has already started`);
      (await this.#r.send(`Input.dispatchTouchEvent`, {
        type: `touchStart`,
        touchPoints: [this.#n],
        modifiers: this.#i._modifiers,
      }),
        (this.#e = !0));
    }
    move(e, t) {
      return (
        (this.#n.x = Math.round(e)),
        (this.#n.y = Math.round(t)),
        this.#r.send(`Input.dispatchTouchEvent`, {
          type: `touchMove`,
          touchPoints: [this.#n],
          modifiers: this.#i._modifiers,
        })
      );
    }
    async end() {
      (await this.#r.send(`Input.dispatchTouchEvent`, {
        type: `touchEnd`,
        touchPoints: [this.#n],
        modifiers: this.#i._modifiers,
      }),
        this.#t.removeHandle(this));
    }
  },
  gm = class extends wf {
    #e;
    #t;
    constructor(e, t) {
      (super(), (this.#e = e), (this.#t = t));
    }
    updateClient(e) {
      ((this.#e = e),
        this.touches.forEach((t) => {
          t.updateClient(e);
        }));
    }
    async touchStart(e, t) {
      let n = this.idGenerator(),
        r = { x: Math.round(e), y: Math.round(t), radiusX: 0.5, radiusY: 0.5, force: 0.5, id: n },
        i = new hm(this.#e, this, this.#t, r);
      return (await i.start(), this.touches.push(i), i);
    }
  },
  _m = class {
    #e;
    #t = !1;
    #n;
    constructor(e) {
      this.#e = e;
    }
    updateClient(e) {
      this.#e = e;
    }
    async start(e = {}) {
      K(!this.#t, `Cannot start recording trace while already recording trace.`);
      let t = [
          `-*`,
          `devtools.timeline`,
          `v8.execute`,
          `disabled-by-default-devtools.timeline`,
          `disabled-by-default-devtools.timeline.frame`,
          `toplevel`,
          `blink.console`,
          `blink.user_timing`,
          `latencyInfo`,
          `disabled-by-default-devtools.timeline.stack`,
          `disabled-by-default-v8.cpu_profiler`,
        ],
        { path: n, screenshots: r = !1, categories: i = t } = e;
      r && i.push(`disabled-by-default-devtools.screenshot`);
      let a = i.filter((e) => e.startsWith(`-`)).map((e) => e.slice(1)),
        o = i.filter((e) => !e.startsWith(`-`));
      ((this.#n = n),
        (this.#t = !0),
        await this.#e.send(`Tracing.start`, {
          transferMode: `ReturnAsStream`,
          traceConfig: { excludedCategories: a, includedCategories: o },
        }));
    }
    async stop() {
      let e = Eu.create();
      return (
        this.#e.once(`Tracing.tracingComplete`, async (t) => {
          try {
            K(t.stream, `Missing "stream"`);
            let n = await lu(await uu(this.#e, t.stream), this.#n);
            e.resolve(n ?? void 0);
          } catch (t) {
            Iu(t) ? e.reject(t) : e.reject(Error(`Unknown error: ${t}`));
          }
        }),
        await this.#e.send(`Tracing.end`),
        (this.#t = !1),
        await e.valueOrThrow()
      );
    }
  },
  vm = class extends Cu {
    #e;
    #t;
    #n;
    name;
    description;
    inputSchema;
    annotations;
    frame;
    location;
    rawStackTrace;
    constructor(e, t, n) {
      (super(),
        (this.#e = e),
        (this.name = t.name),
        (this.description = t.description),
        (this.inputSchema = t.inputSchema),
        (this.annotations = t.annotations),
        (this.frame = n),
        (this.#t = t.backendNodeId),
        t.stackTrace?.callFrames.length &&
          (this.location = {
            url: t.stackTrace.callFrames[0].url,
            lineNumber: t.stackTrace.callFrames[0].lineNumber,
            columnNumber: t.stackTrace.callFrames[0].columnNumber,
          }),
        (this.rawStackTrace = t.stackTrace));
    }
    get formElement() {
      return (async () => {
        if (this.#n && !this.#n.disposed) return this.#n;
        if (this.#t)
          return ((this.#n = await this.frame.worlds[Wp].adoptBackendNode(this.#t)), this.#n);
      })();
    }
    async execute(e = {}) {
      let { invocationId: t } = await this.#e.invokeTool(this, e);
      return await new Promise((e) => {
        let n = (r) => {
          r.id === t && (this.#e.off(`toolresponded`, n), e(r));
        };
        this.#e.on(`toolresponded`, n);
      });
    }
  },
  ym = class {
    id;
    tool;
    input;
    constructor(e, t, n) {
      ((this.id = e), (this.tool = t));
      try {
        this.input = JSON.parse(n);
      } catch (e) {
        ((this.input = {}), q(e));
      }
    }
  },
  bm = class extends Cu {
    #e;
    #t;
    #n = new Map();
    #r = new Map();
    #i = (e) => {
      let t = [];
      for (let n of e.tools) {
        let e = this.#t.frame(n.frameId);
        if (!e) continue;
        let r = this.#n.get(n.frameId) ?? new Map();
        this.#n.has(n.frameId) || this.#n.set(n.frameId, r);
        let i = new vm(this, n, e);
        (r.set(n.name, i), t.push(i));
      }
      this.emit(`toolsadded`, { tools: t });
    };
    #a = (e) => {
      let t = [];
      (e.tools.forEach((e) => {
        let n = this.#n.get(e.frameId)?.get(e.name);
        (n && t.push(n), this.#n.get(e.frameId)?.delete(e.name));
      }),
        this.emit(`toolsremoved`, { tools: t }));
    };
    #o = (e) => {
      let t = this.#n.get(e.frameId)?.get(e.toolName);
      if (!t) return;
      let n = new ym(e.invocationId, t, e.input);
      (this.#r.set(n.id, n), t.emit(`toolinvoked`, n), this.emit(`toolinvoked`, n));
    };
    #s = (e) => {
      let t = this.#r.get(e.invocationId);
      t && this.#r.delete(e.invocationId);
      let n = {
        id: e.invocationId,
        call: t,
        status: e.status,
        output: e.output,
        errorText: e.errorText,
        exception: e.exception,
      };
      this.emit(`toolresponded`, n);
    };
    #c = (e) => {
      this.#r.clear();
      let t = this.#n.get(e._id);
      if (!t) return;
      let n = Array.from(t.values());
      (this.#n.delete(e._id), n.length && this.emit(`toolsremoved`, { tools: n }));
    };
    constructor(e, t) {
      (super(), (this.#e = e), (this.#t = t), this.#t.on(Up.FrameNavigated, this.#c), this.#l());
    }
    async initialize() {
      return await this.#e.send(`WebMCP.enable`).catch(q);
    }
    async invokeTool(e, t) {
      return await this.#e.send(`WebMCP.invokeTool`, {
        frameId: e.frame._id,
        toolName: e.name,
        input: t,
      });
    }
    tools() {
      return Array.from(this.#n.values()).flatMap((e) => Array.from(e.values()));
    }
    #l() {
      (this.#e.on(`WebMCP.toolsAdded`, this.#i),
        this.#e.on(`WebMCP.toolsRemoved`, this.#a),
        this.#e.on(`WebMCP.toolInvoked`, this.#o),
        this.#e.on(`WebMCP.toolResponded`, this.#s));
    }
    updateClient(e) {
      (this.#e.off(`WebMCP.toolsAdded`, this.#i),
        this.#e.off(`WebMCP.toolsRemoved`, this.#a),
        this.#e.off(`WebMCP.toolInvoked`, this.#o),
        this.#e.off(`WebMCP.toolResponded`, this.#s),
        (this.#e = e),
        this.#l());
    }
  },
  xm = function (e, t, n) {
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
  Sm = (function (e) {
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
  );
function Cm(e) {
  switch (e) {
    case `Strict`:
    case `Lax`:
    case `None`:
      return e;
    default:
      return;
  }
}
var wm = class e extends Mf {
    static async _create(t, n, r) {
      let i = new e(t, n);
      if ((await i.#k(), r))
        try {
          await i.setViewport(r);
        } catch (e) {
          if (Iu(e) && ap(e)) q(e);
          else throw e;
        }
      return i;
    }
    #e = !1;
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
    #m = new Map();
    #h = new Map();
    #g;
    #_;
    #v = new Map();
    #y = new Set();
    #b = Eu.create();
    #x = !1;
    #S = !1;
    constructor(e, t) {
      (super(),
        (this.#r = e),
        (this.#a = e.parentSession()),
        K(this.#a, `Tab target session is not defined.`),
        (this.#o = this.#a.target()),
        K(this.#o, `Tab target is not defined.`),
        (this._tabId = this.#o._getTargetInfo().targetId),
        (this.#i = t),
        (this.#t = t._targetManager()),
        (this.#s = new dm(e)),
        (this.#c = new mm(e, this.#s)),
        (this.#l = new gm(e, this.#s)),
        (this.#u = new lm(e, this, this._timeoutSettings)),
        (this.#d = new hp(e)),
        (this.#f = new _m(e)),
        (this.#p = new bm(e, this.#u)),
        (this.#g = new op(e)),
        (this.#_ = null),
        (this.#n = new Yf(this.#r.connection())));
      let n = new Cu(this.#u);
      (n.on(Up.FrameAttached, (e) => {
        this.emit(`frameattached`, e);
      }),
        n.on(Up.FrameDetached, (e) => {
          this.emit(`framedetached`, e);
        }),
        n.on(Up.FrameNavigated, (e) => {
          this.emit(`framenavigated`, e);
        }),
        n.on(Up.ConsoleApiCalled, ([e, t]) => {
          this.#I(e, t);
        }),
        n.on(Up.BindingCalled, ([e, t]) => {
          this.#L(e, t);
        }));
      let r = new Cu(this.#u.networkManager);
      (r.on(Qf.Request, (e) => {
        this.emit(`request`, e);
      }),
        r.on(Qf.RequestServedFromCache, (e) => {
          this.emit(`requestservedfromcache`, e);
        }),
        r.on(Qf.Response, (e) => {
          this.emit(`response`, e);
        }),
        r.on(Qf.RequestFailed, (e) => {
          this.emit(`requestfailed`, e);
        }),
        r.on(Qf.RequestFinished, (e) => {
          this.emit(`requestfinished`, e);
        }),
        this.#a.on(Au.Swapped, this.#w.bind(this)),
        this.#a.on(Au.Ready, this.#T.bind(this)),
        this.#t.on(`targetGone`, this.#D),
        this.#o._isClosedDeferred
          .valueOrThrow()
          .then(() => {
            (this.#t.off(`targetGone`, this.#D), this.emit(`close`, void 0), (this.#e = !0));
          })
          .catch(q),
        this.#E(),
        this.#C());
    }
    #C() {
      let e = [];
      for (let t of this.#t.getChildTargets(this.#i)) e.push(t);
      let t = 0;
      for (; t < e.length; ) {
        let n = e[t];
        t++;
        let r = n._session();
        r && this.#O(r);
        for (let t of this.#t.getChildTargets(n)) e.push(t);
      }
    }
    async #w(e) {
      (K(e instanceof tp, `CDPSession is not instance of CdpCDPSession`),
        (this.#r = e),
        (this.#i = e.target()),
        K(this.#i, `Missing target on swap`),
        this.#s.updateClient(e),
        this.#c.updateClient(e),
        this.#l.updateClient(e),
        this.#d.updateClient(e),
        this.#f.updateClient(e),
        this.#p.updateClient(e),
        this.#g.updateClient(e),
        await this.#u.swapFrameTree(e),
        this.#E());
    }
    async #T(e) {
      (K(e instanceof tp),
        e.target()._subtype() === `prerender` &&
          (this.#u.registerSpeculativeSession(e).catch(q),
          this.#d.registerSpeculativeSession(e).catch(q)));
    }
    #E() {
      let e = new Cu(this.#r);
      (e.on(Au.Ready, this.#O),
        e.on(Au.Disconnected, () => {
          this.#b.reject(new Yl(`Target closed`));
        }),
        e.on(`Page.domContentEventFired`, () => {
          this.emit(`domcontentloaded`, void 0);
        }),
        e.on(`Page.loadEventFired`, () => {
          this.emit(`load`, void 0);
        }),
        e.on(`Page.javascriptDialogOpening`, this.#R.bind(this)),
        e.on(`Runtime.exceptionThrown`, this.#F.bind(this)),
        e.on(`Inspector.targetCrashed`, this.#j.bind(this)),
        e.on(`Performance.metrics`, this.#N.bind(this)),
        e.on(`Log.entryAdded`, this.#M.bind(this)),
        e.on(`Page.fileChooserOpened`, this.#A.bind(this)));
    }
    #D = (e) => {
      let t = e._session()?.id(),
        n = this.#v.get(t);
      n && (this.#v.delete(t), this.emit(`workerdestroyed`, n));
    };
    #O = (e) => {
      if (
        (K(e instanceof tp),
        this.#u.onAttachedToTarget(e.target()),
        e.target()._getTargetInfo().type === `worker`)
      ) {
        let t = new Kp(
          e,
          e.target().url(),
          e.target()._targetId,
          e.target().type(),
          this.#F.bind(this),
          this.#u.networkManager
        );
        (this.#v.set(e.id(), t),
          t.internalEmitter.on(Bf.Console, (e) => {
            let n = this.listenerCount(`console`) === 0,
              r = t.listenerCount(Bf.Console) === 0;
            if (n && r) {
              for (let t of e.args()) t.dispose().catch(q);
              return;
            }
            n || this.emit(`console`, e);
          }),
          this.emit(`workercreated`, t));
      }
      e.on(Au.Ready, this.#O);
    };
    async #k() {
      try {
        await Promise.all([
          this.#u.initialize(this.#r),
          this.#r.send(`Performance.enable`),
          this.#r.send(`Log.enable`),
          this.#p.initialize(),
        ]);
      } catch (e) {
        if (Iu(e) && ap(e)) q(e);
        else throw e;
      }
    }
    async resize(e) {
      let t = await this.windowId();
      await this.#r.send(`Browser.setContentsSize`, {
        windowId: Number(t),
        width: e.contentWidth,
        height: e.contentHeight,
      });
    }
    async windowId() {
      let { windowId: e } = await this.#r.send(`Browser.getWindowForTarget`);
      return e.toString();
    }
    async #A(e) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        if (!this.#y.size) return;
        let n = this.#u.frame(e.frameId);
        K(n, `This should never happen.`);
        let r = new Zf(
          xm(t, await n.worlds[Wp].adoptBackendNode(e.backendNodeId), !1).move(),
          e.mode !== `selectSingle`
        );
        for (let e of this.#y) e.resolve(r);
        this.#y.clear();
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        Sm(t);
      }
    }
    _client() {
      return this.#r;
    }
    _isUrlAllowed(e) {
      return this.#t.isUrlAllowed(e);
    }
    isServiceWorkerBypassed() {
      return this.#x;
    }
    isDragInterceptionEnabled() {
      return this.#S;
    }
    isJavaScriptEnabled() {
      return this.#d.javascriptEnabled;
    }
    async openDevTools() {
      let e = this.target()._targetId,
        t = this.browser(),
        n = await t._hasDevToolsTarget(this.target()._targetId);
      return n ? await t._getDevToolsTargetPage(n) : await t._createDevToolsPage(e);
    }
    async hasDevTools() {
      return !!(await this.browser()._hasDevToolsTarget(this.target()._targetId));
    }
    async waitForFileChooser(e = {}) {
      let t = this.#y.size === 0,
        { timeout: n = this._timeoutSettings.timeout() } = e,
        r = Eu.create({
          message: `Waiting for \`FileChooser\` failed: ${n}ms exceeded`,
          timeout: n,
        });
      (e.signal &&
        e.signal.addEventListener(
          `abort`,
          () => {
            r.reject(e.signal?.reason);
          },
          { once: !0 }
        ),
        this.#y.add(r));
      let i;
      t && (i = this.#r.send(`Page.setInterceptFileChooserDialog`, { enabled: !0 }));
      try {
        let [e] = await Promise.all([r.valueOrThrow(), i]);
        return e;
      } catch (e) {
        throw (this.#y.delete(r), e);
      }
    }
    async setGeolocation(e) {
      return await this.#d.setGeolocation(e);
    }
    target() {
      return this.#i;
    }
    browser() {
      return this.#i.browser();
    }
    browserContext() {
      return this.#i.browserContext();
    }
    #j() {
      this.emit(`error`, Error(`Page crashed!`));
    }
    #M(e) {
      let { level: t, text: n, args: r, source: i, url: a, lineNumber: o, stackTrace: s } = e.entry;
      (r &&
        r.map((e) => {
          Mp(this.#r, e);
        }),
        i !== `worker` &&
          this.emit(
            `console`,
            new Xf(Ap(t), n, [], [{ url: a, lineNumber: o }], void 0, s, this.#i._targetId)
          ));
    }
    mainFrame() {
      return this.#u.mainFrame();
    }
    get keyboard() {
      return this.#s;
    }
    get touchscreen() {
      return this.#l;
    }
    get coverage() {
      return this.#g;
    }
    get tracing() {
      return this.#f;
    }
    get webmcp() {
      return this.#p;
    }
    frames() {
      return this.#u.frames();
    }
    workers() {
      return Array.from(this.#v.values());
    }
    async setRequestInterception(e) {
      return await this.#u.networkManager.setRequestInterception(e);
    }
    async setBypassServiceWorker(e) {
      return ((this.#x = e), await this.#r.send(`Network.setBypassServiceWorker`, { bypass: e }));
    }
    async setDragInterception(e) {
      return ((this.#S = e), await this.#r.send(`Input.setInterceptDrags`, { enabled: e }));
    }
    async setOfflineMode(e) {
      return await this.#u.networkManager.setOfflineMode(e);
    }
    async emulateNetworkConditions(e) {
      return await this.#u.networkManager.emulateNetworkConditions(e);
    }
    async emulateFocusedPage(e) {
      return await this.#d.emulateFocus(e);
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
    async queryObjects(e) {
      (K(!e.disposed, `Prototype JSHandle is disposed!`),
        K(e.id, `Prototype JSHandle must not be referencing primitive value`));
      let t = await this.mainFrame().client.send(`Runtime.queryObjects`, {
        prototypeObjectId: e.id,
      });
      return this.mainFrame().mainRealm().createCdpHandle(t.objects);
    }
    async cookies(...e) {
      let t = (await this.#r.send(`Network.getCookies`, { urls: e.length ? e : [this.url()] }))
          .cookies,
        n = [`sourcePort`];
      return t
        .map((e) => {
          for (let t of n) delete e[t];
          return e;
        })
        .map((e) => ({
          ...e,
          partitionKey: e.partitionKey ? e.partitionKey.topLevelSite : void 0,
        }));
    }
    async deleteCookie(...e) {
      let t = this.url();
      for (let n of e) {
        let e = { ...n, partitionKey: Dm(n.partitionKey) };
        if (
          (!n.url && t.startsWith(`http`) && (e.url = t),
          await this.#r.send(`Network.deleteCookies`, e),
          t.startsWith(`http`) && !e.partitionKey)
        ) {
          let n = new URL(t);
          await this.#r.send(`Network.deleteCookies`, {
            ...e,
            partitionKey: {
              topLevelSite: n.origin.replace(`:${n.port}`, ``),
              hasCrossSiteAncestor: !1,
            },
          });
        }
      }
    }
    async setCookie(...e) {
      let t = this.url(),
        n = t.startsWith(`http`),
        r = e.map((e) => {
          let r = Object.assign({}, e);
          return (
            !r.url && n && (r.url = t),
            K(r.url !== `about:blank`, `Blank page can not have cookie "${r.name}"`),
            K(
              !String.prototype.startsWith.call(r.url || ``, `data:`),
              `Data URL page can not have cookie "${r.name}"`
            ),
            r
          );
        });
      (await this.deleteCookie(...r),
        r.length &&
          (await this.#r.send(`Network.setCookies`, {
            cookies: r.map((e) => ({
              ...e,
              partitionKey: Dm(e.partitionKey),
              sameSite: Cm(e.sameSite),
            })),
          })));
    }
    async exposeFunction(e, t) {
      if (this.#m.has(e))
        throw Error(`Failed to add page binding with name ${e}: window['${e}'] already exists!`);
      let n = kp(`exposedFun`, e),
        r;
      switch (typeof t) {
        case `function`:
          r = new Jf(e, t, n);
          break;
        default:
          r = new Jf(e, t.default, n);
          break;
      }
      this.#m.set(e, r);
      let [{ identifier: i }] = await Promise.all([
        this.#u.evaluateOnNewDocument(n),
        this.#u.addExposedFunctionBinding(r),
      ]);
      this.#h.set(e, i);
    }
    async removeExposedFunction(e) {
      let t = this.#h.get(e);
      if (!t) throw Error(`Function with name "${e}" does not exist`);
      let n = this.#m.get(e);
      (this.#h.delete(e),
        this.#m.delete(e),
        await Promise.all([
          this.#u.removeScriptToEvaluateOnNewDocument(t),
          this.#u.removeExposedFunctionBinding(n),
        ]));
    }
    async authenticate(e) {
      return await this.#u.networkManager.authenticate(e);
    }
    async setExtraHTTPHeaders(e) {
      return await this.#u.networkManager.setExtraHTTPHeaders(e);
    }
    async setUserAgent(e, t) {
      if (typeof e == `string`) return await this.#u.networkManager.setUserAgent(e, t);
      {
        let t = e.userAgent ?? (await this.browser().userAgent());
        return await this.#u.networkManager.setUserAgent(t, e.userAgentMetadata, e.platform);
      }
    }
    async metrics() {
      let e = await this.#r.send(`Performance.getMetrics`);
      return this.#P(e.metrics);
    }
    async captureHeapSnapshot(e) {
      let { createWriteStream: t } = Nl.value.fs,
        n = t(e.path),
        r = new Promise((e, t) => {
          (n.on(`error`, t), n.on(`finish`, e));
        }),
        i = this.#r;
      (await i.send(`HeapProfiler.enable`), await i.send(`HeapProfiler.collectGarbage`));
      let a = (e) => {
        n.write(e.chunk);
      };
      i.on(`HeapProfiler.addHeapSnapshotChunk`, a);
      try {
        await i.send(`HeapProfiler.takeHeapSnapshot`, { reportProgress: !1 });
      } finally {
        (i.off(`HeapProfiler.addHeapSnapshotChunk`, a), await i.send(`HeapProfiler.disable`));
      }
      (n.end(), await r);
    }
    #N(e) {
      this.emit(`metrics`, { title: e.title, metrics: this.#P(e.metrics) });
    }
    #P(e) {
      let t = {};
      for (let n of e || []) Tm.has(n.name) && (t[n.name] = n.value);
      return t;
    }
    #F(e) {
      this.emit(`pageerror`, Cp(e.exceptionDetails));
    }
    #I(e, t, n) {
      n ||= t.args.map((t) => e.createCdpHandle(t));
      let r = this.listenerCount(`console`) > 0,
        i = e.environment instanceof Vf && e.environment.listenerCount(Bf.Console) > 0;
      if (!r) {
        if (!i) for (let e of n) e.dispose().catch(q);
        return;
      }
      let a;
      (e.environment.client instanceof tp && (a = e.environment.client.target()._targetId),
        this.emit(`console`, bp(t, n, a)));
    }
    async #L(e, t) {
      let n;
      try {
        n = JSON.parse(t.payload);
      } catch {
        return;
      }
      let { type: r, name: i, seq: a, args: o, isTrivial: s } = n;
      if (r !== `exposedFun`) return;
      let c = e.context;
      c && (await this.#m.get(i)?.run(c, a, o, s));
    }
    #R(e) {
      let t = fu(e.type),
        n = new up(this.#r, t, e.message, e.defaultPrompt);
      this.emit(`dialog`, n);
    }
    async reload(e) {
      let [t] = await Promise.all([
        this.waitForNavigation({ ...e, ignoreSameDocumentNavigation: !0 }),
        this.#r.send(`Page.reload`, { ignoreCache: e?.ignoreCache ?? !1 }),
      ]);
      return t;
    }
    async createCDPSession() {
      return await this.target().createCDPSession();
    }
    async goBack(e = {}) {
      return await this.#z(-1, e);
    }
    async goForward(e = {}) {
      return await this.#z(1, e);
    }
    async #z(e, t) {
      let n = await this.#r.send(`Page.getNavigationHistory`),
        r = n.entries[n.currentIndex + e];
      if (!r) throw Error(`History entry to navigate to not found.`);
      return (
        await Promise.all([
          this.waitForNavigation(t),
          this.#r.send(`Page.navigateToHistoryEntry`, { entryId: r.id }),
        ])
      )[0];
    }
    async bringToFront() {
      await this.#r.send(`Page.bringToFront`);
    }
    async setJavaScriptEnabled(e) {
      return await this.#d.setJavaScriptEnabled(e);
    }
    async setBypassCSP(e) {
      await this.#r.send(`Page.setBypassCSP`, { enabled: e });
    }
    async triggerExtensionAction(e) {
      return await e.triggerAction(this);
    }
    async emulateMediaType(e) {
      return await this.#d.emulateMediaType(e);
    }
    async emulateCPUThrottling(e) {
      return await this.#d.emulateCPUThrottling(e);
    }
    async emulateMediaFeatures(e) {
      return await this.#d.emulateMediaFeatures(e);
    }
    async emulateTimezone(e) {
      return await this.#d.emulateTimezone(e);
    }
    async emulateIdleState(e) {
      return await this.#d.emulateIdleState(e);
    }
    async emulateVisionDeficiency(e) {
      return await this.#d.emulateVisionDeficiency(e);
    }
    async setViewport(e) {
      let t = await this.#d.emulateViewport(e);
      ((this.#_ = e), t && (await this.reload()));
    }
    viewport() {
      return this.#_;
    }
    async evaluateOnNewDocument(e, ...t) {
      let n = cu(e, ...t);
      return await this.#u.evaluateOnNewDocument(n);
    }
    async removeScriptToEvaluateOnNewDocument(e) {
      return await this.#u.removeScriptToEvaluateOnNewDocument(e);
    }
    async setCacheEnabled(e = !0) {
      await this.#u.networkManager.setCacheEnabled(e);
    }
    async _screenshot(e) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        let {
            fromSurface: n,
            omitBackground: r,
            optimizeForSpeed: i,
            quality: a,
            clip: o,
            type: s,
            captureBeyondViewport: c,
          } = e,
          l = xm(t, new Al(), !0);
        r &&
          (s === `png` || s === `webp`) &&
          (await this.#d.setTransparentBackgroundColor(),
          l.defer(async () => {
            await this.#d.resetDefaultBackgroundColor().catch(q);
          }));
        let u = o;
        if (u && !c) {
          let e = await this.mainFrame()
            .isolatedRealm()
            .evaluate(() => {
              let { height: e, pageLeft: t, pageTop: n, width: r } = window.visualViewport;
              return { x: t, y: n, height: e, width: r };
            });
          u = Em(u, e);
        }
        let { data: d } = await this.#r.send(`Page.captureScreenshot`, {
          format: s,
          optimizeForSpeed: i,
          fromSurface: n,
          ...(a === void 0 ? {} : { quality: Math.round(a) }),
          ...(u ? { clip: { ...u, scale: u.scale ?? 1 } } : {}),
          captureBeyondViewport: c,
        });
        return d;
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        let e = Sm(t);
        e && (await e);
      }
    }
    async createPDFStream(e = {}) {
      let { timeout: t = this._timeoutSettings.timeout() } = e,
        {
          landscape: n,
          displayHeaderFooter: r,
          headerTemplate: i,
          footerTemplate: a,
          printBackground: o,
          scale: s,
          width: c,
          height: l,
          margin: u,
          pageRanges: d,
          preferCSSPageSize: f,
          omitBackground: p,
          tagged: m,
          outline: h,
          waitForFonts: g,
        } = _u(e);
      (p && (await this.#d.setTransparentBackgroundColor()),
        g &&
          (await bc(
            gc(
              this.mainFrame()
                .isolatedRealm()
                .evaluate(() => document.fonts.ready)
            ).pipe(vl(pu(t)))
          )));
      let _ = await bc(
        gc(
          this.#r.send(`Page.printToPDF`, {
            transferMode: `ReturnAsStream`,
            landscape: n,
            displayHeaderFooter: r,
            headerTemplate: i,
            footerTemplate: a,
            printBackground: o,
            scale: s,
            paperWidth: c,
            paperHeight: l,
            marginTop: u.top,
            marginBottom: u.bottom,
            marginLeft: u.left,
            marginRight: u.right,
            pageRanges: d,
            preferCSSPageSize: f,
            generateTaggedPDF: m,
            generateDocumentOutline: h,
          })
        ).pipe(vl(pu(t)))
      );
      return (
        p && (await this.#d.resetDefaultBackgroundColor()),
        K(_.stream, '`stream` is missing from `Page.printToPDF'),
        await uu(this.#r, _.stream)
      );
    }
    async pdf(e = {}) {
      let { path: t = void 0 } = e,
        n = await lu(await this.createPDFStream(e), t);
      return (K(n, `Could not create typed array`), n);
    }
    async close(e = { runBeforeUnload: void 0 }) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        xm(t, await this.browserContext().waitForScreenshotOperations(), !1);
        let n = this.#r.connection();
        (K(n, `Connection closed. Most likely the page has been closed.`),
          e.runBeforeUnload
            ? await this.#r.send(`Page.close`)
            : (await n.send(`Target.closeTarget`, { targetId: this.#i._targetId }),
              await this.#o._isClosedDeferred.valueOrThrow()));
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        Sm(t);
      }
    }
    isClosed() {
      return this.#e;
    }
    get mouse() {
      return this.#c;
    }
    async waitForDevicePrompt(e = {}) {
      return await this.mainFrame().waitForDevicePrompt(e);
    }
    get bluetooth() {
      return this.#n;
    }
    extensionRealms() {
      return this.mainFrame().extensionRealms();
    }
  },
  Tm = new Set([
    `Timestamp`,
    `Documents`,
    `Frames`,
    `JSEventListeners`,
    `Nodes`,
    `LayoutCount`,
    `RecalcStyleCount`,
    `LayoutDuration`,
    `RecalcStyleDuration`,
    `ScriptDuration`,
    `TaskDuration`,
    `JSHeapUsedSize`,
    `JSHeapTotalSize`,
  ]);
function Em(e, t) {
  let n = Math.max(e.x, t.x),
    r = Math.max(e.y, t.y);
  return {
    x: n,
    y: r,
    width: Math.max(Math.min(e.x + e.width, t.x + t.width) - n, 0),
    height: Math.max(Math.min(e.y + e.height, t.y + t.height) - r, 0),
  };
}
function Dm(e) {
  if (e !== void 0)
    return typeof e == `string`
      ? { topLevelSite: e, hasCrossSiteAncestor: !1 }
      : { topLevelSite: e.sourceOrigin, hasCrossSiteAncestor: e.hasCrossSiteAncestor ?? !1 };
}
var Om = function (e, t, n) {
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
  km = (function (e) {
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
  Am = class extends ku {
    #e;
    #t;
    #n;
    constructor(e, t, n) {
      (super(), (this.#e = e), (this.#t = t), (this.#n = n));
    }
    get id() {
      return this.#n;
    }
    targets() {
      return this.#t.targets().filter((e) => e.browserContext() === this);
    }
    async pages(e = !1) {
      return (
        await Promise.all(
          this.targets()
            .filter(
              (t) =>
                t.type() === `page` ||
                ((t.type() === `other` || e) && this.#t._getIsPageTargetCallback()?.(t))
            )
            .map((e) => e.page())
        )
      ).filter((e) => !!e);
    }
    async overridePermissions(e, t) {
      let n = t.map((e) => {
        let t = wu.get(e);
        if (!t) throw Error(`Unknown permission: ` + e);
        return t;
      });
      await this.#e.send(`Browser.grantPermissions`, {
        origin: e,
        browserContextId: this.#n || void 0,
        permissions: n,
      });
    }
    async setPermission(e, ...t) {
      await Promise.all(
        t.map(async (t) => {
          let n = {
            name: t.permission.name,
            userVisibleOnly: t.permission.userVisibleOnly,
            sysex: t.permission.sysex,
            allowWithoutSanitization: t.permission.allowWithoutSanitization,
            panTiltZoom: t.permission.panTiltZoom,
          };
          await this.#e.send(`Browser.setPermission`, {
            origin: e === `*` ? void 0 : e,
            browserContextId: this.#n || void 0,
            permission: n,
            setting: t.state,
          });
        })
      );
    }
    async clearPermissionOverrides() {
      await this.#e.send(`Browser.resetPermissions`, { browserContextId: this.#n || void 0 });
    }
    async newPage(e) {
      let t = { stack: [], error: void 0, hasError: !1 };
      try {
        return (
          Om(t, await this.waitForScreenshotOperations(), !1),
          await this.#t._createPageInContext(this.#n, e)
        );
      } catch (e) {
        ((t.error = e), (t.hasError = !0));
      } finally {
        km(t);
      }
    }
    browser() {
      return this.#t;
    }
    async close() {
      (K(this.#n, `Default BrowserContext cannot be closed!`),
        await this.#t._disposeContext(this.#n));
    }
    async cookies() {
      let { cookies: e } = await this.#e.send(`Storage.getCookies`, { browserContextId: this.#n });
      return e.map((e) => ({
        ...e,
        partitionKey: e.partitionKey
          ? {
              sourceOrigin: e.partitionKey.topLevelSite,
              hasCrossSiteAncestor: e.partitionKey.hasCrossSiteAncestor,
            }
          : void 0,
      }));
    }
    async setCookie(...e) {
      return await this.#e.send(`Storage.setCookies`, {
        browserContextId: this.#n,
        cookies: e.map((e) => ({
          ...e,
          partitionKey: Dm(e.partitionKey),
          sameSite: Cm(e.sameSite),
        })),
      });
    }
    async setDownloadBehavior(e) {
      await this.#e.send(`Browser.setDownloadBehavior`, {
        behavior: e.policy,
        downloadPath: e.downloadPath,
        browserContextId: this.#n,
      });
    }
  },
  jm = class extends af {
    #e;
    constructor(e, t, n, r, i, a) {
      (super(e, t, n, r, i), (this.#e = a));
    }
    async workers() {
      let e = this.#e.targets().filter((e) => {
          let t = e.url();
          return e.type() === `service_worker` && t.startsWith(`chrome-extension://` + this.id);
        }),
        t = [];
      for (let n of e)
        try {
          let e = await n.worker();
          e && t.push(e);
        } catch (e) {
          if (this.#t(e)) {
            q(e);
            continue;
          }
          throw e;
        }
      return t;
    }
    async pages() {
      let e = this.#e.targets().filter((e) => {
        let t = e.url();
        return (
          (e.type() === `page` || e.type() === `background_page`) &&
          t.startsWith(`chrome-extension://` + this.id)
        );
      });
      return (
        await Promise.all(
          e.map(async (e) => {
            try {
              return await e.asPage();
            } catch (e) {
              if (this.#t(e)) return (q(e), null);
              throw e;
            }
          })
        )
      ).filter((e) => e !== null);
    }
    async triggerAction(e) {
      await this.#e._connection.send(`Extensions.triggerAction`, {
        id: this.id,
        targetId: e._tabId,
      });
    }
    #t(e) {
      return Iu(e) && (ap(e) || e.message.includes(`No target with given id found`));
    }
  },
  Mm;
(function (e) {
  ((e.SUCCESS = `success`), (e.ABORTED = `aborted`));
})((Mm ||= {}));
var Nm = class extends zf {
    #e;
    #t;
    #n;
    #r;
    #i;
    #a = new Set();
    _initializedDeferred = Eu.create();
    _isClosedDeferred = Eu.create();
    _targetId;
    _asPagePromise;
    pagePromise;
    constructor(e, t, n, r, i) {
      (super(),
        (this.#t = t),
        (this.#r = r),
        (this.#n = e),
        (this.#e = n),
        (this._targetId = e.targetId),
        (this.#i = i),
        this.#t && this.#t.setTarget(this));
    }
    async asPage() {
      if (this.pagePromise) {
        let e = await this.pagePromise;
        if (e) return e;
      }
      if (!this._asPagePromise) {
        let e = this._session();
        this._asPagePromise = (e ? Promise.resolve(e) : this._sessionFactory()(!1)).then((e) =>
          wm._create(e, this, null)
        );
      }
      return (await this._asPagePromise) ?? null;
    }
    _subtype() {
      return this.#n.subtype;
    }
    _session() {
      return this.#t;
    }
    _addChildTarget(e) {
      this.#a.add(e);
    }
    _removeChildTarget(e) {
      this.#a.delete(e);
    }
    _childTargets() {
      return this.#a;
    }
    _sessionFactory() {
      if (!this.#i) throw Error(`sessionFactory is not initialized`);
      return this.#i;
    }
    createCDPSession() {
      if (!this.#i) throw Error(`sessionFactory is not initialized`);
      return this.#i(!1).then((e) => (e.setTarget(this), e));
    }
    url() {
      return this.#n.url;
    }
    type() {
      switch (this.#n.type) {
        case `page`:
          return Rf.PAGE;
        case `background_page`:
          return Rf.BACKGROUND_PAGE;
        case `service_worker`:
          return Rf.SERVICE_WORKER;
        case `shared_worker`:
          return Rf.SHARED_WORKER;
        case `browser`:
          return Rf.BROWSER;
        case `webview`:
          return Rf.WEBVIEW;
        case `tab`:
          return Rf.TAB;
        default:
          return Rf.OTHER;
      }
    }
    _targetManager() {
      if (!this.#r) throw Error(`targetManager is not initialized`);
      return this.#r;
    }
    _getTargetInfo() {
      return this.#n;
    }
    browser() {
      if (!this.#e) throw Error(`browserContext is not initialized`);
      return this.#e.browser();
    }
    browserContext() {
      if (!this.#e) throw Error(`browserContext is not initialized`);
      return this.#e;
    }
    opener() {
      let { openerId: e } = this.#n;
      if (e)
        return this.browser()
          .targets()
          .find((t) => t._targetId === e);
    }
    _targetInfoChanged(e) {
      ((this.#n = e), this._checkIfInitialized());
    }
    _initialize() {
      this._initializedDeferred.resolve(Mm.SUCCESS);
    }
    _isTargetExposed() {
      return this.type() !== Rf.TAB && !this._subtype();
    }
    _checkIfInitialized() {
      this._initializedDeferred.resolved() || this._initializedDeferred.resolve(Mm.SUCCESS);
    }
  },
  Pm = class e extends Nm {
    #e;
    constructor(e, t, n, r, i, a) {
      (super(e, t, n, r, i), (this.#e = a ?? void 0));
    }
    _initialize() {
      (this._initializedDeferred
        .valueOrThrow()
        .then(async (t) => {
          if (t === Mm.ABORTED) return;
          let n = this.opener();
          if (!(n instanceof e)) return;
          if (!n || !n.pagePromise || this.type() !== `page`) return !0;
          let r = await n.pagePromise;
          if (!r.listenerCount(`popup`)) return !0;
          let i = await this.page();
          return (r.emit(`popup`, i), !0);
        })
        .catch(q),
        this._checkIfInitialized());
    }
    async page() {
      if (!this.pagePromise) {
        let e = this._session();
        this.pagePromise = (e ? Promise.resolve(e) : this._sessionFactory()(!1)).then((e) =>
          wm._create(e, this, this.#e ?? null)
        );
      }
      return (await this.pagePromise) ?? null;
    }
    _checkIfInitialized() {
      this._initializedDeferred.resolved() ||
        (this._getTargetInfo().url !== `` && this._initializedDeferred.resolve(Mm.SUCCESS));
    }
  },
  Fm = class extends Pm {},
  Im = class extends Nm {
    #e;
    async worker() {
      if (!this.#e) {
        let e = this._session();
        this.#e = (e ? Promise.resolve(e) : this._sessionFactory()(!1)).then(
          (e) => new Kp(e, this._getTargetInfo().url, this._targetId, this.type(), () => {}, void 0)
        );
      }
      return await this.#e;
    }
  },
  Lm = class extends Nm {},
  Rm = Object.defineProperty,
  Y = (e, t) => Rm(e, `name`, { value: t, configurable: !0 }),
  zm = class {
    type = 3;
    name = ``;
    prefix = ``;
    value = ``;
    suffix = ``;
    modifier = 3;
    constructor(e, t, n, r, i, a) {
      ((this.type = e),
        (this.name = t),
        (this.prefix = n),
        (this.value = r),
        (this.suffix = i),
        (this.modifier = a));
    }
    hasCustomName() {
      return this.name !== `` && typeof this.name != `number`;
    }
  };
Y(zm, `Part`);
var Bm = /[$_\p{ID_Start}]/u,
  Vm = /[$_\u200C\u200D\p{ID_Continue}]/u,
  Hm = `.*`;
function Um(e, t) {
  return (t ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(e);
}
Y(Um, `isASCII`);
function Wm(e, t = !1) {
  let n = [],
    r = 0;
  for (; r < e.length; ) {
    let i = e[r],
      a = Y(function (i) {
        if (!t) throw TypeError(i);
        n.push({ type: `INVALID_CHAR`, index: r, value: e[r++] });
      }, `ErrorOrInvalid`);
    if (i === `*`) {
      n.push({ type: `ASTERISK`, index: r, value: e[r++] });
      continue;
    }
    if (i === `+` || i === `?`) {
      n.push({ type: `OTHER_MODIFIER`, index: r, value: e[r++] });
      continue;
    }
    if (i === `\\`) {
      n.push({ type: `ESCAPED_CHAR`, index: r++, value: e[r++] });
      continue;
    }
    if (i === `{`) {
      n.push({ type: `OPEN`, index: r, value: e[r++] });
      continue;
    }
    if (i === `}`) {
      n.push({ type: `CLOSE`, index: r, value: e[r++] });
      continue;
    }
    if (i === `:`) {
      let t = ``,
        i = r + 1;
      for (; i < e.length; ) {
        let n = e.substr(i, 1);
        if ((i === r + 1 && Bm.test(n)) || (i !== r + 1 && Vm.test(n))) {
          t += e[i++];
          continue;
        }
        break;
      }
      if (!t) {
        a(`Missing parameter name at ${r}`);
        continue;
      }
      (n.push({ type: `NAME`, index: r, value: t }), (r = i));
      continue;
    }
    if (i === `(`) {
      let t = 1,
        i = ``,
        o = r + 1,
        s = !1;
      if (e[o] === `?`) {
        a(`Pattern cannot start with "?" at ${o}`);
        continue;
      }
      for (; o < e.length; ) {
        if (!Um(e[o], !1)) {
          (a(`Invalid character '${e[o]}' at ${o}.`), (s = !0));
          break;
        }
        if (e[o] === `\\`) {
          i += e[o++] + e[o++];
          continue;
        }
        if (e[o] === `)`) {
          if ((t--, t === 0)) {
            o++;
            break;
          }
        } else if (e[o] === `(` && (t++, e[o + 1] !== `?`)) {
          (a(`Capturing groups are not allowed at ${o}`), (s = !0));
          break;
        }
        i += e[o++];
      }
      if (s) continue;
      if (t) {
        a(`Unbalanced pattern at ${r}`);
        continue;
      }
      if (!i) {
        a(`Missing pattern at ${r}`);
        continue;
      }
      (n.push({ type: `REGEX`, index: r, value: i }), (r = o));
      continue;
    }
    n.push({ type: `CHAR`, index: r, value: e[r++] });
  }
  return (n.push({ type: `END`, index: r, value: `` }), n);
}
Y(Wm, `lexer`);
function Gm(e, t = {}) {
  let n = Wm(e);
  ((t.delimiter ??= `/#?`), (t.prefixes ??= `./`));
  let r = `[^${Km(t.delimiter)}]+?`,
    i = [],
    a = 0,
    o = 0,
    s = new Set(),
    c = Y((e) => {
      if (o < n.length && n[o].type === e) return n[o++].value;
    }, `tryConsume`),
    l = Y(() => c(`OTHER_MODIFIER`) ?? c(`ASTERISK`), `tryConsumeModifier`),
    u = Y((e) => {
      let t = c(e);
      if (t !== void 0) return t;
      let { type: r, index: i } = n[o];
      throw TypeError(`Unexpected ${r} at ${i}, expected ${e}`);
    }, `mustConsume`),
    d = Y(() => {
      let e = ``,
        t;
      for (; (t = c(`CHAR`) ?? c(`ESCAPED_CHAR`)); ) e += t;
      return e;
    }, `consumeText`),
    f = Y((e) => e, `DefaultEncodePart`),
    p = t.encodePart || f,
    m = ``,
    h = Y((e) => {
      m += e;
    }, `appendToPendingFixedValue`),
    g = Y(() => {
      m.length && (i.push(new zm(3, ``, ``, p(m), ``, 3)), (m = ``));
    }, `maybeAddPartFromPendingFixedValue`),
    _ = Y((e, t, n, o, c) => {
      let l = 3;
      switch (c) {
        case `?`:
          l = 1;
          break;
        case `*`:
          l = 0;
          break;
        case `+`:
          l = 2;
          break;
      }
      if (!t && !n && l === 3) {
        h(e);
        return;
      }
      if ((g(), !t && !n)) {
        if (!e) return;
        i.push(new zm(3, ``, ``, p(e), ``, l));
        return;
      }
      let u;
      u = n ? (n === `*` ? Hm : n) : r;
      let d = 2;
      u === r ? ((d = 1), (u = ``)) : u === Hm && ((d = 0), (u = ``));
      let f;
      if ((t ? (f = t) : n && (f = a++), s.has(f))) throw TypeError(`Duplicate name '${f}'.`);
      (s.add(f), i.push(new zm(d, f, p(e), u, p(o), l)));
    }, `addPart`);
  for (; o < n.length; ) {
    let e = c(`CHAR`),
      n = c(`NAME`),
      r = c(`REGEX`);
    if ((!n && !r && (r = c(`ASTERISK`)), n || r)) {
      let i = e ?? ``;
      (t.prefixes.indexOf(i) === -1 && (h(i), (i = ``)), g());
      let a = l();
      _(i, n, r, ``, a);
      continue;
    }
    let i = e ?? c(`ESCAPED_CHAR`);
    if (i) {
      h(i);
      continue;
    }
    if (c(`OPEN`)) {
      let e = d(),
        t = c(`NAME`),
        n = c(`REGEX`);
      !t && !n && (n = c(`ASTERISK`));
      let r = d();
      u(`CLOSE`);
      let i = l();
      _(e, t, n, r, i);
      continue;
    }
    (g(), u(`END`));
  }
  return i;
}
Y(Gm, `parse`);
function Km(e) {
  return e.replace(/([.+*?^${}()[\]|/\\])/g, `\\$1`);
}
Y(Km, `escapeString`);
function qm(e) {
  return e && e.ignoreCase ? `ui` : `u`;
}
Y(qm, `flags`);
function Jm(e, t, n) {
  return Xm(Gm(e, n), t, n);
}
Y(Jm, `stringToRegexp`);
function Ym(e) {
  switch (e) {
    case 0:
      return `*`;
    case 1:
      return `?`;
    case 2:
      return `+`;
    case 3:
      return ``;
  }
}
Y(Ym, `modifierToString`);
function Xm(e, t, n = {}) {
  ((n.delimiter ??= `/#?`),
    (n.prefixes ??= `./`),
    (n.sensitive ??= !1),
    (n.strict ??= !1),
    (n.end ??= !0),
    (n.start ??= !0),
    (n.endsWith = ``));
  let r = n.start ? `^` : ``;
  for (let i of e) {
    if (i.type === 3) {
      i.modifier === 3 ? (r += Km(i.value)) : (r += `(?:${Km(i.value)})${Ym(i.modifier)}`);
      continue;
    }
    t && t.push(i.name);
    let e = `[^${Km(n.delimiter)}]+?`,
      a = i.value;
    if ((i.type === 1 ? (a = e) : i.type === 0 && (a = Hm), !i.prefix.length && !i.suffix.length)) {
      i.modifier === 3 || i.modifier === 1
        ? (r += `(${a})${Ym(i.modifier)}`)
        : (r += `((?:${a})${Ym(i.modifier)})`);
      continue;
    }
    if (i.modifier === 3 || i.modifier === 1) {
      ((r += `(?:${Km(i.prefix)}(${a})${Km(i.suffix)})`), (r += Ym(i.modifier)));
      continue;
    }
    ((r += `(?:${Km(i.prefix)}`),
      (r += `((?:${a})(?:`),
      (r += Km(i.suffix)),
      (r += Km(i.prefix)),
      (r += `(?:${a}))*)${Km(i.suffix)})`),
      i.modifier === 0 && (r += `?`));
  }
  let i = `[${Km(n.endsWith)}]|$`,
    a = `[${Km(n.delimiter)}]`;
  if (n.end)
    return (
      n.strict || (r += `${a}?`),
      n.endsWith.length ? (r += `(?=${i})`) : (r += `$`),
      new RegExp(r, qm(n))
    );
  n.strict || (r += `(?:${a}(?=${i}))?`);
  let o = !1;
  if (e.length) {
    let t = e[e.length - 1];
    t.type === 3 && t.modifier === 3 && (o = n.delimiter.indexOf(t) > -1);
  }
  return (o || (r += `(?=${a}|${i})`), new RegExp(r, qm(n)));
}
Y(Xm, `partsToRegexp`);
var Zm = { delimiter: ``, prefixes: ``, sensitive: !0, strict: !0 },
  Qm = { delimiter: `.`, prefixes: ``, sensitive: !0, strict: !0 },
  $m = { delimiter: `/`, prefixes: `/`, sensitive: !0, strict: !0 };
function eh(e, t) {
  return e.length
    ? e[0] === `/`
      ? !0
      : !t || e.length < 2
        ? !1
        : (e[0] == `\\` || e[0] == `{`) && e[1] == `/`
    : !1;
}
Y(eh, `isAbsolutePathname`);
function th(e, t) {
  return e.startsWith(t) ? e.substring(t.length, e.length) : e;
}
Y(th, `maybeStripPrefix`);
function nh(e, t) {
  return e.endsWith(t) ? e.substr(0, e.length - t.length) : e;
}
Y(nh, `maybeStripSuffix`);
function rh(e) {
  return !e || e.length < 2
    ? !1
    : e[0] === `[` || ((e[0] === `\\` || e[0] === `{`) && e[1] === `[`);
}
Y(rh, `treatAsIPv6Hostname`);
var ih = [`ftp`, `file`, `http`, `https`, `ws`, `wss`];
function ah(e) {
  if (!e) return !0;
  for (let t of ih) if (e.test(t)) return !0;
  return !1;
}
Y(ah, `isSpecialScheme`);
function oh(e, t) {
  if (((e = th(e, `#`)), t || e === ``)) return e;
  let n = new URL(`https://example.com`);
  return ((n.hash = e), n.hash ? n.hash.substring(1, n.hash.length) : ``);
}
Y(oh, `canonicalizeHash`);
function sh(e, t) {
  if (((e = th(e, `?`)), t || e === ``)) return e;
  let n = new URL(`https://example.com`);
  return ((n.search = e), n.search ? n.search.substring(1, n.search.length) : ``);
}
Y(sh, `canonicalizeSearch`);
function ch(e, t) {
  return t || e === `` ? e : rh(e) ? yh(e) : vh(e);
}
Y(ch, `canonicalizeHostname`);
function lh(e, t) {
  if (t || e === ``) return e;
  let n = new URL(`https://example.com`);
  return ((n.password = e), n.password);
}
Y(lh, `canonicalizePassword`);
function uh(e, t) {
  if (t || e === ``) return e;
  let n = new URL(`https://example.com`);
  return ((n.username = e), n.username);
}
Y(uh, `canonicalizeUsername`);
function dh(e, t, n) {
  if (n || e === ``) return e;
  if (t && !ih.includes(t)) return new URL(`${t}:${e}`).pathname;
  let r = e[0] == `/`;
  return (
    (e = new URL(r ? e : `/-` + e, `https://example.com`).pathname),
    r || (e = e.substring(2, e.length)),
    e
  );
}
Y(dh, `canonicalizePathname`);
function fh(e, t, n) {
  return (mh(t) === e && (e = ``), n || e === `` ? e : bh(e));
}
Y(fh, `canonicalizePort`);
function ph(e, t) {
  return ((e = nh(e, `:`)), t || e === `` ? e : hh(e));
}
Y(ph, `canonicalizeProtocol`);
function mh(e) {
  switch (e) {
    case `ws`:
    case `http`:
      return `80`;
    case `wws`:
    case `https`:
      return `443`;
    case `ftp`:
      return `21`;
    default:
      return ``;
  }
}
Y(mh, `defaultPortForProtocol`);
function hh(e) {
  if (e === ``) return e;
  if (/^[-+.A-Za-z0-9]*$/.test(e)) return e.toLowerCase();
  throw TypeError(`Invalid protocol '${e}'.`);
}
Y(hh, `protocolEncodeCallback`);
function gh(e) {
  if (e === ``) return e;
  let t = new URL(`https://example.com`);
  return ((t.username = e), t.username);
}
Y(gh, `usernameEncodeCallback`);
function _h(e) {
  if (e === ``) return e;
  let t = new URL(`https://example.com`);
  return ((t.password = e), t.password);
}
Y(_h, `passwordEncodeCallback`);
function vh(e) {
  if (e === ``) return e;
  if (/[\t\n\r #%/:<>?@[\]^\\|]/g.test(e)) throw TypeError(`Invalid hostname '${e}'`);
  let t = new URL(`https://example.com`);
  return ((t.hostname = e), t.hostname);
}
Y(vh, `hostnameEncodeCallback`);
function yh(e) {
  if (e === ``) return e;
  if (/[^0-9a-fA-F[\]:]/g.test(e)) throw TypeError(`Invalid IPv6 hostname '${e}'`);
  return e.toLowerCase();
}
Y(yh, `ipv6HostnameEncodeCallback`);
function bh(e) {
  if (e === `` || (/^[0-9]*$/.test(e) && parseInt(e) <= 65535)) return e;
  throw TypeError(`Invalid port '${e}'.`);
}
Y(bh, `portEncodeCallback`);
function xh(e) {
  if (e === ``) return e;
  let t = new URL(`https://example.com`);
  return (
    (t.pathname = e[0] === `/` ? e : `/-` + e),
    e[0] === `/` ? t.pathname : t.pathname.substring(2, t.pathname.length)
  );
}
Y(xh, `standardURLPathnameEncodeCallback`);
function Sh(e) {
  return e === `` ? e : new URL(`data:${e}`).pathname;
}
Y(Sh, `pathURLPathnameEncodeCallback`);
function Ch(e) {
  if (e === ``) return e;
  let t = new URL(`https://example.com`);
  return ((t.search = e), t.search.substring(1, t.search.length));
}
Y(Ch, `searchEncodeCallback`);
function wh(e) {
  if (e === ``) return e;
  let t = new URL(`https://example.com`);
  return ((t.hash = e), t.hash.substring(1, t.hash.length));
}
Y(wh, `hashEncodeCallback`);
var Th = class {
  #e;
  #t = [];
  #n = {};
  #r = 0;
  #i = 1;
  #a = 0;
  #o = 0;
  #s = 0;
  #c = 0;
  #l = !1;
  constructor(e) {
    this.#e = e;
  }
  get result() {
    return this.#n;
  }
  parse() {
    for (this.#t = Wm(this.#e, !0); this.#r < this.#t.length; this.#r += this.#i) {
      if (((this.#i = 1), this.#t[this.#r].type === `END`)) {
        if (this.#o === 0) {
          (this.#f(), this.#C() ? this.#u(9, 1) : this.#S() ? this.#u(8, 1) : this.#u(7, 0));
          continue;
        } else if (this.#o === 2) {
          this.#p(5);
          continue;
        }
        this.#u(10, 0);
        break;
      }
      if (this.#s > 0)
        if (this.#T()) --this.#s;
        else continue;
      if (this.#w()) {
        this.#s += 1;
        continue;
      }
      switch (this.#o) {
        case 0:
          this.#g() && this.#p(1);
          break;
        case 1:
          if (this.#g()) {
            this.#k();
            let e = 7,
              t = 1;
            (this.#_() ? ((e = 2), (t = 3)) : this.#l && (e = 2), this.#u(e, t));
          }
          break;
        case 2:
          this.#v() ? this.#p(3) : (this.#x() || this.#S() || this.#C()) && this.#p(5);
          break;
        case 3:
          this.#y() ? this.#u(4, 1) : this.#v() && this.#u(5, 1);
          break;
        case 4:
          this.#v() && this.#u(5, 1);
          break;
        case 5:
          (this.#E() ? (this.#c += 1) : this.#D() && --this.#c,
            this.#b() && !this.#c
              ? this.#u(6, 1)
              : this.#x()
                ? this.#u(7, 0)
                : this.#S()
                  ? this.#u(8, 1)
                  : this.#C() && this.#u(9, 1));
          break;
        case 6:
          this.#x() ? this.#u(7, 0) : this.#S() ? this.#u(8, 1) : this.#C() && this.#u(9, 1);
          break;
        case 7:
          this.#S() ? this.#u(8, 1) : this.#C() && this.#u(9, 1);
          break;
        case 8:
          this.#C() && this.#u(9, 1);
          break;
        case 9:
          break;
        case 10:
          break;
      }
    }
    this.#n.hostname !== void 0 && this.#n.port === void 0 && (this.#n.port = ``);
  }
  #u(e, t) {
    switch (this.#o) {
      case 0:
        break;
      case 1:
        this.#n.protocol = this.#O();
        break;
      case 2:
        break;
      case 3:
        this.#n.username = this.#O();
        break;
      case 4:
        this.#n.password = this.#O();
        break;
      case 5:
        this.#n.hostname = this.#O();
        break;
      case 6:
        this.#n.port = this.#O();
        break;
      case 7:
        this.#n.pathname = this.#O();
        break;
      case 8:
        this.#n.search = this.#O();
        break;
      case 9:
        this.#n.hash = this.#O();
        break;
      case 10:
        break;
    }
    (this.#o !== 0 &&
      e !== 10 &&
      ([1, 2, 3, 4].includes(this.#o) && [6, 7, 8, 9].includes(e) && (this.#n.hostname ??= ``),
      [1, 2, 3, 4, 5, 6].includes(this.#o) &&
        [8, 9].includes(e) &&
        (this.#n.pathname ??= this.#l ? `/` : ``),
      [1, 2, 3, 4, 5, 6, 7].includes(this.#o) && e === 9 && (this.#n.search ??= ``)),
      this.#d(e, t));
  }
  #d(e, t) {
    ((this.#o = e), (this.#a = this.#r + t), (this.#r += t), (this.#i = 0));
  }
  #f() {
    ((this.#r = this.#a), (this.#i = 0));
  }
  #p(e) {
    (this.#f(), (this.#o = e));
  }
  #m(e) {
    return (
      e < 0 && (e = this.#t.length - e),
      e < this.#t.length ? this.#t[e] : this.#t[this.#t.length - 1]
    );
  }
  #h(e, t) {
    let n = this.#m(e);
    return (
      n.value === t && (n.type === `CHAR` || n.type === `ESCAPED_CHAR` || n.type === `INVALID_CHAR`)
    );
  }
  #g() {
    return this.#h(this.#r, `:`);
  }
  #_() {
    return this.#h(this.#r + 1, `/`) && this.#h(this.#r + 2, `/`);
  }
  #v() {
    return this.#h(this.#r, `@`);
  }
  #y() {
    return this.#h(this.#r, `:`);
  }
  #b() {
    return this.#h(this.#r, `:`);
  }
  #x() {
    return this.#h(this.#r, `/`);
  }
  #S() {
    if (this.#h(this.#r, `?`)) return !0;
    if (this.#t[this.#r].value !== `?`) return !1;
    let e = this.#m(this.#r - 1);
    return e.type !== `NAME` && e.type !== `REGEX` && e.type !== `CLOSE` && e.type !== `ASTERISK`;
  }
  #C() {
    return this.#h(this.#r, `#`);
  }
  #w() {
    return this.#t[this.#r].type == `OPEN`;
  }
  #T() {
    return this.#t[this.#r].type == `CLOSE`;
  }
  #E() {
    return this.#h(this.#r, `[`);
  }
  #D() {
    return this.#h(this.#r, `]`);
  }
  #O() {
    let e = this.#t[this.#r],
      t = this.#m(this.#a).index;
    return this.#e.substring(t, e.index);
  }
  #k() {
    let e = {};
    (Object.assign(e, Zm), (e.encodePart = hh));
    let t = Jm(this.#O(), void 0, e);
    this.#l = ah(t);
  }
};
Y(Th, `Parser`);
var Eh = [`protocol`, `username`, `password`, `hostname`, `port`, `pathname`, `search`, `hash`],
  Dh = `*`;
function Oh(e, t) {
  if (typeof e != `string`) throw TypeError(`parameter 1 is not of type 'string'.`);
  let n = new URL(e, t);
  return {
    protocol: n.protocol.substring(0, n.protocol.length - 1),
    username: n.username,
    password: n.password,
    hostname: n.hostname,
    port: n.port,
    pathname: n.pathname,
    search: n.search === `` ? void 0 : n.search.substring(1, n.search.length),
    hash: n.hash === `` ? void 0 : n.hash.substring(1, n.hash.length),
  };
}
Y(Oh, `extractValues`);
function kh(e, t) {
  return t ? jh(e) : e;
}
Y(kh, `processBaseURLString`);
function Ah(e, t, n) {
  let r;
  if (typeof t.baseURL == `string`)
    try {
      ((r = new URL(t.baseURL)),
        t.protocol === void 0 &&
          (e.protocol = kh(r.protocol.substring(0, r.protocol.length - 1), n)),
        !n &&
          t.protocol === void 0 &&
          t.hostname === void 0 &&
          t.port === void 0 &&
          t.username === void 0 &&
          (e.username = kh(r.username, n)),
        !n &&
          t.protocol === void 0 &&
          t.hostname === void 0 &&
          t.port === void 0 &&
          t.username === void 0 &&
          t.password === void 0 &&
          (e.password = kh(r.password, n)),
        t.protocol === void 0 && t.hostname === void 0 && (e.hostname = kh(r.hostname, n)),
        t.protocol === void 0 &&
          t.hostname === void 0 &&
          t.port === void 0 &&
          (e.port = kh(r.port, n)),
        t.protocol === void 0 &&
          t.hostname === void 0 &&
          t.port === void 0 &&
          t.pathname === void 0 &&
          (e.pathname = kh(r.pathname, n)),
        t.protocol === void 0 &&
          t.hostname === void 0 &&
          t.port === void 0 &&
          t.pathname === void 0 &&
          t.search === void 0 &&
          (e.search = kh(r.search.substring(1, r.search.length), n)),
        t.protocol === void 0 &&
          t.hostname === void 0 &&
          t.port === void 0 &&
          t.pathname === void 0 &&
          t.search === void 0 &&
          t.hash === void 0 &&
          (e.hash = kh(r.hash.substring(1, r.hash.length), n)));
    } catch {
      throw TypeError(`invalid baseURL '${t.baseURL}'.`);
    }
  if (
    (typeof t.protocol == `string` && (e.protocol = ph(t.protocol, n)),
    typeof t.username == `string` && (e.username = uh(t.username, n)),
    typeof t.password == `string` && (e.password = lh(t.password, n)),
    typeof t.hostname == `string` && (e.hostname = ch(t.hostname, n)),
    typeof t.port == `string` && (e.port = fh(t.port, e.protocol, n)),
    typeof t.pathname == `string`)
  ) {
    if (((e.pathname = t.pathname), r && !eh(e.pathname, n))) {
      let t = r.pathname.lastIndexOf(`/`);
      t >= 0 && (e.pathname = kh(r.pathname.substring(0, t + 1), n) + e.pathname);
    }
    e.pathname = dh(e.pathname, e.protocol, n);
  }
  return (
    typeof t.search == `string` && (e.search = sh(t.search, n)),
    typeof t.hash == `string` && (e.hash = oh(t.hash, n)),
    e
  );
}
Y(Ah, `applyInit`);
function jh(e) {
  return e.replace(/([+*?:{}()\\])/g, `\\$1`);
}
Y(jh, `escapePatternString`);
function Mh(e) {
  return e.replace(/([.+*?^${}()[\]|/\\])/g, `\\$1`);
}
Y(Mh, `escapeRegexpString`);
function Nh(e, t) {
  ((t.delimiter ??= `/#?`),
    (t.prefixes ??= `./`),
    (t.sensitive ??= !1),
    (t.strict ??= !1),
    (t.end ??= !0),
    (t.start ??= !0),
    (t.endsWith = ``));
  let n = `[^${Mh(t.delimiter)}]+?`,
    r = /[$_\u200C\u200D\p{ID_Continue}]/u,
    i = ``;
  for (let a = 0; a < e.length; ++a) {
    let o = e[a];
    if (o.type === 3) {
      if (o.modifier === 3) {
        i += jh(o.value);
        continue;
      }
      i += `{${jh(o.value)}}${Ym(o.modifier)}`;
      continue;
    }
    let s = o.hasCustomName(),
      c =
        !!o.suffix.length ||
        (!!o.prefix.length && (o.prefix.length !== 1 || !t.prefixes.includes(o.prefix))),
      l = a > 0 ? e[a - 1] : null,
      u = a < e.length - 1 ? e[a + 1] : null;
    if (!c && s && o.type === 1 && o.modifier === 3 && u && !u.prefix.length && !u.suffix.length)
      if (u.type === 3) {
        let e = u.value.length > 0 ? u.value[0] : ``;
        c = r.test(e);
      } else c = !u.hasCustomName();
    if (!c && !o.prefix.length && l && l.type === 3) {
      let e = l.value[l.value.length - 1];
      c = t.prefixes.includes(e);
    }
    (c && (i += `{`),
      (i += jh(o.prefix)),
      s && (i += `:${o.name}`),
      o.type === 2
        ? (i += `(${o.value})`)
        : o.type === 1
          ? s || (i += `(${n})`)
          : o.type === 0 &&
            (!s && (!l || l.type === 3 || l.modifier !== 3 || c || o.prefix !== ``)
              ? (i += `*`)
              : (i += `(.*)`)),
      o.type === 1 && s && o.suffix.length && r.test(o.suffix[0]) && (i += `\\`),
      (i += jh(o.suffix)),
      c && (i += `}`),
      o.modifier !== 3 && (i += Ym(o.modifier)));
  }
  return i;
}
Y(Nh, `partsToPattern`);
var Ph = class {
  #e;
  #t = {};
  #n = {};
  #r = {};
  #i = {};
  #a = !1;
  constructor(e = {}, t, n) {
    try {
      let r;
      if ((typeof t == `string` ? (r = t) : (n = t), typeof e == `string`)) {
        let t = new Th(e);
        if ((t.parse(), (e = t.result), r === void 0 && typeof e.protocol != `string`))
          throw TypeError(`A base URL must be provided for a relative constructor string.`);
        e.baseURL = r;
      } else {
        if (!e || typeof e != `object`)
          throw TypeError(`parameter 1 is not of type 'string' and cannot convert to dictionary.`);
        if (r) throw TypeError(`parameter 1 is not of type 'string'.`);
      }
      typeof n > `u` && (n = { ignoreCase: !1 });
      let i = { ignoreCase: n.ignoreCase === !0 },
        a = {
          pathname: Dh,
          protocol: Dh,
          username: Dh,
          password: Dh,
          hostname: Dh,
          port: Dh,
          search: Dh,
          hash: Dh,
        };
      ((this.#e = Ah(a, e, !0)), mh(this.#e.protocol) === this.#e.port && (this.#e.port = ``));
      let o;
      for (o of Eh) {
        if (!(o in this.#e)) continue;
        let e = {},
          t = this.#e[o];
        switch (((this.#n[o] = []), o)) {
          case `protocol`:
            (Object.assign(e, Zm), (e.encodePart = hh));
            break;
          case `username`:
            (Object.assign(e, Zm), (e.encodePart = gh));
            break;
          case `password`:
            (Object.assign(e, Zm), (e.encodePart = _h));
            break;
          case `hostname`:
            (Object.assign(e, Qm), rh(t) ? (e.encodePart = yh) : (e.encodePart = vh));
            break;
          case `port`:
            (Object.assign(e, Zm), (e.encodePart = bh));
            break;
          case `pathname`:
            ah(this.#t.protocol)
              ? (Object.assign(e, $m, i), (e.encodePart = xh))
              : (Object.assign(e, Zm, i), (e.encodePart = Sh));
            break;
          case `search`:
            (Object.assign(e, Zm, i), (e.encodePart = Ch));
            break;
          case `hash`:
            (Object.assign(e, Zm, i), (e.encodePart = wh));
            break;
        }
        try {
          ((this.#i[o] = Gm(t, e)),
            (this.#t[o] = Xm(this.#i[o], this.#n[o], e)),
            (this.#r[o] = Nh(this.#i[o], e)),
            (this.#a = this.#a || this.#i[o].some((e) => e.type === 2)));
        } catch {
          throw TypeError(`invalid ${o} pattern '${this.#e[o]}'.`);
        }
      }
    } catch (e) {
      throw TypeError(`Failed to construct 'URLPattern': ${e.message}`);
    }
  }
  get [Symbol.toStringTag]() {
    return `URLPattern`;
  }
  test(e = {}, t) {
    let n = {
      pathname: ``,
      protocol: ``,
      username: ``,
      password: ``,
      hostname: ``,
      port: ``,
      search: ``,
      hash: ``,
    };
    if (typeof e != `string` && t) throw TypeError(`parameter 1 is not of type 'string'.`);
    if (typeof e > `u`) return !1;
    try {
      n = typeof e == `object` ? Ah(n, e, !1) : Ah(n, Oh(e, t), !1);
    } catch {
      return !1;
    }
    let r;
    for (r of Eh) if (!this.#t[r].exec(n[r])) return !1;
    return !0;
  }
  exec(e = {}, t) {
    let n = {
      pathname: ``,
      protocol: ``,
      username: ``,
      password: ``,
      hostname: ``,
      port: ``,
      search: ``,
      hash: ``,
    };
    if (typeof e != `string` && t) throw TypeError(`parameter 1 is not of type 'string'.`);
    if (typeof e > `u`) return;
    try {
      n = typeof e == `object` ? Ah(n, e, !1) : Ah(n, Oh(e, t), !1);
    } catch {
      return null;
    }
    let r = {};
    t ? (r.inputs = [e, t]) : (r.inputs = [e]);
    let i;
    for (i of Eh) {
      let e = this.#t[i].exec(n[i]);
      if (!e) return null;
      let t = {};
      for (let [n, r] of this.#n[i].entries())
        (typeof r == `string` || typeof r == `number`) && (t[r] = e[n + 1]);
      r[i] = { input: n[i] ?? ``, groups: t };
    }
    return r;
  }
  static compareComponent(e, t, n) {
    let r = Y((e, t) => {
        for (let n of [`type`, `modifier`, `prefix`, `value`, `suffix`]) {
          if (e[n] < t[n]) return -1;
          if (e[n] !== t[n]) return 1;
        }
        return 0;
      }, `comparePart`),
      i = new zm(3, ``, ``, ``, ``, 3),
      a = new zm(0, ``, ``, ``, ``, 3),
      o = Y((e, t) => {
        let n = 0;
        for (; n < Math.min(e.length, t.length); ++n) {
          let i = r(e[n], t[n]);
          if (i) return i;
        }
        return e.length === t.length ? 0 : r(e[n] ?? i, t[n] ?? i);
      }, `comparePartList`);
    return !t.#r[e] && !n.#r[e]
      ? 0
      : t.#r[e] && !n.#r[e]
        ? o(t.#i[e], [a])
        : !t.#r[e] && n.#r[e]
          ? o([a], n.#i[e])
          : o(t.#i[e], n.#i[e]);
  }
  get protocol() {
    return this.#r.protocol;
  }
  get username() {
    return this.#r.username;
  }
  get password() {
    return this.#r.password;
  }
  get hostname() {
    return this.#r.hostname;
  }
  get port() {
    return this.#r.port;
  }
  get pathname() {
    return this.#r.pathname;
  }
  get search() {
    return this.#r.search;
  }
  get hash() {
    return this.#r.hash;
  }
  get hasRegExpGroups() {
    return this.#a;
  }
};
(Y(Ph, `URLPattern`), globalThis.URLPattern || (globalThis.URLPattern = Ph));
function Fh(e, t) {
  return !!e._subtype() && !t.subtype;
}
var Ih = class extends Cu {
  #e;
  #t = new Map();
  #n = new Map();
  #r = new Map();
  #i = new Set();
  #a;
  #o;
  #s = new WeakMap();
  #c = new WeakMap();
  #l = Eu.create();
  #u = !0;
  #d = [{}];
  #f = new Set();
  #p = !1;
  #m = [];
  #h = [];
  constructor(e, t, n, r = !0, i, a) {
    if ((super(), i && a)) throw Error(`Cannot specify both blockList and allowList`);
    ((this.#e = e),
      (this.#a = n),
      (this.#o = t),
      (this.#u = r),
      (this.#m = this.#D(i)),
      (this.#h = this.#D(a)),
      this.#e.on(`Target.targetCreated`, this.#x),
      this.#e.on(`Target.targetDestroyed`, this.#S),
      this.#e.on(`Target.targetInfoChanged`, this.#C),
      this.#e.on(Au.SessionDetached, this.#b),
      this.#g(this.#e));
  }
  async initialize() {
    (await this.#e.send(`Target.setDiscoverTargets`, { discover: !0, filter: this.#d }),
      await this.#e.send(`Target.setAutoAttach`, {
        waitForDebuggerOnStart: !0,
        flatten: !0,
        autoAttach: !0,
        filter: [{ type: `page`, exclude: !0 }, ...this.#d],
      }),
      (this.#p = !0),
      this.#T(),
      await this.#l.valueOrThrow());
  }
  addToIgnoreTarget(e) {
    this.#i.add(e);
  }
  getChildTargets(e) {
    return e._childTargets();
  }
  dispose() {
    (this.#e.off(`Target.targetCreated`, this.#x),
      this.#e.off(`Target.targetDestroyed`, this.#S),
      this.#e.off(`Target.targetInfoChanged`, this.#C),
      this.#e.off(Au.SessionDetached, this.#b),
      this.#_(this.#e));
  }
  getAvailableTargets() {
    return this.#n;
  }
  getDiscoveredTargetInfos() {
    return this.#t;
  }
  #g(e) {
    let t = (t) => {
      this.#w(e, t);
    };
    (K(!this.#s.has(e)), this.#s.set(e, t), e.on(`Target.attachedToTarget`, t));
    let n = (t) => this.#E(e, t);
    (K(!this.#c.has(e)), this.#c.set(e, n), e.on(`Target.detachedFromTarget`, n));
  }
  #_(e) {
    let t = this.#s.get(e);
    t && (e.off(`Target.attachedToTarget`, t), this.#s.delete(e));
    let n = this.#c.get(e);
    n && (e.off(`Target.detachedFromTarget`, n), this.#c.delete(e));
  }
  #v = async (e, t) => {
    (await e.send(`Runtime.runIfWaitingForDebugger`).catch(q),
      await t.send(`Target.detachFromTarget`, { sessionId: e.id() }).catch(q));
  };
  #y = (e) => (e instanceof tp ? e.target() : null);
  #b = (e) => {
    this.#_(e);
  };
  #x = async (e) => {
    if (
      (this.#t.set(e.targetInfo.targetId, e.targetInfo),
      this.emit(`targetDiscovered`, e.targetInfo),
      e.targetInfo.type === `browser` && e.targetInfo.attached)
    ) {
      if (this.#n.has(e.targetInfo.targetId)) return;
      let t = this.#o(e.targetInfo, void 0);
      (t._initialize(), this.#n.set(e.targetInfo.targetId, t));
    }
  };
  #S = (e) => {
    let t = this.#t.get(e.targetId);
    if ((this.#t.delete(e.targetId), this.#T(e.targetId), t?.type === `service_worker`)) {
      let t = this.#n.get(e.targetId);
      t && (this.emit(`targetGone`, t), this.#n.delete(e.targetId));
    }
  };
  #C = (e) => {
    if (
      (this.#t.set(e.targetInfo.targetId, e.targetInfo),
      this.#i.has(e.targetInfo.targetId) || !e.targetInfo.attached)
    )
      return;
    let t = this.#n.get(e.targetInfo.targetId);
    if (!t) return;
    let n = t.url(),
      r = t._initializedDeferred.value() === Mm.SUCCESS;
    if (Fh(t, e.targetInfo)) {
      let e = t._session();
      (K(e, `Target that is being activated is missing a CDPSession.`),
        e.parentSession()?.emit(Au.Swapped, e));
    }
    (t._targetInfoChanged(e.targetInfo),
      r &&
        n !== t.url() &&
        this.emit(`targetChanged`, { target: t, wasInitialized: r, previousURL: n }));
  };
  #w = async (e, t) => {
    let n = t.targetInfo,
      r = this.#e._session(t.sessionId);
    if (!r) throw Error(`Session ${t.sessionId} was not created.`);
    if (!this.#e.isAutoAttached(n.targetId)) return;
    if (!this.#p && !this.isUrlAllowed(n.url)) {
      await this.#v(r, e);
      return;
    }
    if (n.type === `service_worker`) {
      if (
        (await this.#v(r, e),
        this.#n.has(n.targetId) || this.#i.has(n.targetId) || !this.#t.has(n.targetId))
      )
        return;
      let t = this.#o(n);
      (t._initialize(), this.#n.set(n.targetId, t), this.emit(`targetAvailable`, t));
      return;
    }
    let i = this.#n.get(n.targetId),
      a = i !== void 0;
    i ||= this.#o(n, r, e instanceof tp ? e : void 0);
    let o = this.#y(e);
    if (this.#a && !this.#a(i)) {
      (this.#i.add(n.targetId), o?.type() === `tab` && this.#T(o._targetId), await this.#v(r, e));
      return;
    }
    (this.#u && t.targetInfo.type === `tab` && !this.#p && this.#f.add(t.targetInfo.targetId),
      this.#g(r),
      a
        ? (r.setTarget(i), this.#r.set(r.id(), i))
        : (i._initialize(), this.#n.set(n.targetId, i), this.#r.set(r.id(), i)),
      o?._addChildTarget(i),
      e.emit(Au.Ready, r),
      a || this.emit(`targetAvailable`, i),
      o?.type() === `tab` && this.#T(o._targetId),
      await Promise.all([
        r.send(`Target.setAutoAttach`, {
          waitForDebuggerOnStart: !0,
          flatten: !0,
          autoAttach: !0,
          filter: this.#d,
        }),
        this.#O(r),
        r.send(`Runtime.runIfWaitingForDebugger`),
      ]).catch(q));
  };
  #T(e) {
    (e !== void 0 && this.#f.delete(e), this.#p && this.#f.size === 0 && this.#l.resolve());
  }
  #E = (e, t) => {
    let n = this.#r.get(t.sessionId);
    (this.#r.delete(t.sessionId),
      n &&
        (e instanceof tp && e.target()._removeChildTarget(n),
        this.#n.delete(n._targetId),
        this.emit(`targetGone`, n)));
  };
  isUrlAllowed = (e) => {
    if ((this.#m.length === 0 && this.#h.length === 0) || !e || e === `about:blank`) return !0;
    for (let t of this.#m) if (t.pattern.test(e)) return !1;
    if (this.#h.length > 0) {
      for (let t of this.#h) if (t.pattern.test(e)) return !0;
      return !1;
    }
    return !0;
  };
  #D(e) {
    let t = [];
    for (let n of e ?? []) t.push({ pattern: new Ph(n), rule: n });
    return t;
  }
  #O = async (e) => {
    if (this.#m.length === 0 && this.#h.length === 0) return;
    let t = [];
    for (let e of this.#m)
      t.push({
        urlPattern: e.rule,
        offline: !0,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    if (this.#h.length > 0) {
      for (let e of this.#h)
        t.push({
          urlPattern: e.rule,
          offline: !1,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
        });
      t.push({
        urlPattern: ``,
        offline: !0,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    }
    await e.send(`Network.emulateNetworkConditionsByRule`, {
      offline: this.#m.length > 0 ? !0 : void 0,
      matchedNetworkConditions: t,
    });
  };
};
function Lh(e) {
  return e.startsWith(`devtools://devtools/bundled/devtools_app.html`);
}
var Rh = class e extends Tu {
  protocol = `cdp`;
  static async _create(t, n, r, i, a, o, s, c, l, u = !0, d = !0, f = !0, p = !1, m, h) {
    let g = new e(t, n, i, o, s, c, l, u, d, f, p, m, h);
    if (h) {
      let e = await g.#b();
      if (parseInt(e.product.match(/\d+/)?.[0] ?? `0`, 10) < 149)
        throw Error(`The allowlist option require Chrome 149 or greater.`);
    }
    return (
      r && (await t.send(`Security.setIgnoreCertificateErrors`, { ignore: !0 })),
      await g._attach(a),
      g
    );
  }
  #e;
  #t;
  #n;
  #r;
  #i;
  #a;
  #o;
  #s = new Map();
  #c = !0;
  #l = !0;
  #u;
  #d = !1;
  #f = new Map();
  constructor(e, t, n, r, i, a, o, s = !0, c = !0, l = !0, u = !1, d, f) {
    (super(),
      (this.#c = c),
      (this.#l = l),
      (this.#e = n),
      (this.#t = r),
      (this.#n = e),
      (this.#r = i || (() => {})),
      (this.#i = a || (() => !0)),
      (this.#d = u),
      this.#m(o),
      (e.rejectEmulateNetworkConditionsCalls = !!((d && d.length > 0) || (f && f.length > 0))),
      (this.#u = new Ih(e, this.#h, this.#i, s, d, f)),
      (this.#o = new Am(this.#n, this)));
    for (let e of t) this.#s.set(e, new Am(this.#n, this, e));
  }
  #p = () => {
    this.emit(`disconnected`, void 0);
  };
  async _attach(e) {
    (this.#n.on(Au.Disconnected, this.#p),
      e && (await this.#o.setDownloadBehavior(e)),
      this.#u.on(`targetAvailable`, this.#g),
      this.#u.on(`targetGone`, this.#_),
      this.#u.on(`targetChanged`, this.#v),
      this.#u.on(`targetDiscovered`, this.#y),
      await this.#u.initialize());
  }
  _detach() {
    (this.#n.off(Au.Disconnected, this.#p),
      this.#u.off(`targetAvailable`, this.#g),
      this.#u.off(`targetGone`, this.#_),
      this.#u.off(`targetChanged`, this.#v),
      this.#u.off(`targetDiscovered`, this.#y));
  }
  process() {
    return this.#t ?? null;
  }
  _targetManager() {
    return this.#u;
  }
  #m(e) {
    this.#a =
      e ||
      ((e) =>
        e.type() === `page` ||
        e.type() === `background_page` ||
        e.type() === `webview` ||
        (this.#d && e.type() === `other` && Lh(e.url())));
  }
  _getIsPageTargetCallback() {
    return this.#a;
  }
  async createBrowserContext(e = {}) {
    let { proxyServer: t, proxyBypassList: n, downloadBehavior: r } = e,
      { browserContextId: i } = await this.#n.send(`Target.createBrowserContext`, {
        proxyServer: t,
        proxyBypassList: n && n.join(`,`),
      }),
      a = new Am(this.#n, this, i);
    return (r && (await a.setDownloadBehavior(r)), this.#s.set(i, a), a);
  }
  browserContexts() {
    return [this.#o, ...Array.from(this.#s.values())];
  }
  defaultBrowserContext() {
    return this.#o;
  }
  async _disposeContext(e) {
    e &&
      (await this.#n.send(`Target.disposeBrowserContext`, { browserContextId: e }),
      this.#s.delete(e));
  }
  #h = (e, t) => {
    let { browserContextId: n } = e,
      r = n && this.#s.has(n) ? this.#s.get(n) : this.#o;
    if (!r) throw Error(`Missing browser context`);
    let i = (t) => this.#n._createSession(e, t),
      a = new Lm(e, t, r, this.#u, i);
    return e.url && Lh(e.url)
      ? new Fm(e, t, r, this.#u, i, this.#e ?? null)
      : this.#a(a)
        ? new Pm(e, t, r, this.#u, i, this.#e ?? null)
        : e.type === `service_worker` || e.type === `shared_worker`
          ? new Im(e, t, r, this.#u, i)
          : a;
  };
  #g = async (e) => {
    e._isTargetExposed() &&
      (await e._initializedDeferred.valueOrThrow()) === Mm.SUCCESS &&
      (this.emit(`targetcreated`, e), e.browserContext().emit(`targetcreated`, e));
  };
  #_ = async (e) => {
    (e._initializedDeferred.resolve(Mm.ABORTED),
      e._isClosedDeferred.resolve(),
      e._isTargetExposed() &&
        (await e._initializedDeferred.valueOrThrow()) === Mm.SUCCESS &&
        (this.emit(`targetdestroyed`, e), e.browserContext().emit(`targetdestroyed`, e)));
  };
  #v = ({ target: e }) => {
    (this.emit(`targetchanged`, e), e.browserContext().emit(`targetchanged`, e));
  };
  #y = (e) => {
    this.emit(`targetdiscovered`, e);
  };
  wsEndpoint() {
    return this.#n.url();
  }
  async newPage(e) {
    return await this.#o.newPage(e);
  }
  async _createPageInContext(e, t) {
    let n = this.targets().filter((t) => t.browserContext().id === e).length > 0,
      r = t?.type === `window` ? t.windowBounds : void 0,
      { targetId: i } = await this.#n.send(`Target.createTarget`, {
        url: `about:blank`,
        browserContextId: e || void 0,
        left: r?.left,
        top: r?.top,
        width: r?.width,
        height: r?.height,
        windowState: r?.windowState,
        newWindow: n && t?.type === `window` ? !0 : void 0,
        background: t?.background,
      }),
      a = await this.waitForTarget((e) => e._targetId === i);
    if (!a) throw Error(`Missing target for page (id = ${i})`);
    if ((await a._initializedDeferred.valueOrThrow()) !== Mm.SUCCESS)
      throw Error(`Failed to create target for page (id = ${i})`);
    let o = await a.page();
    if (!o) throw Error(`Failed to create a page for context (id = ${e})`);
    return o;
  }
  async _createDevToolsPage(e) {
    let t = await this.#n.send(`Target.openDevTools`, { targetId: e });
    return await this._getDevToolsTargetPage(t.targetId);
  }
  async _getDevToolsTargetPage(e) {
    let t = await this.waitForTarget((t) => t._targetId === e);
    if (!t) throw Error(`Missing target for DevTools page (id = ${e})`);
    if ((await t._initializedDeferred.valueOrThrow()) !== Mm.SUCCESS)
      throw Error(`Failed to create target for DevTools page (id = ${e})`);
    let n = await t.page();
    if (!n) throw Error(`Failed to create a DevTools Page for target (id = ${e})`);
    return n;
  }
  async _hasDevToolsTarget(e) {
    return (await this.#n.send(`Target.getDevToolsTarget`, { targetId: e })).targetId;
  }
  async installExtension(e) {
    let { id: t } = await this.#n.send(`Extensions.loadUnpacked`, { path: e });
    return (this.#f.delete(t), t);
  }
  async uninstallExtension(e) {
    await this.#n.send(`Extensions.uninstall`, { id: e });
    let t = [];
    for (let [n, r] of this._targetManager().getDiscoveredTargetInfos().entries())
      r.url.includes(e) &&
        r.type === `service_worker` &&
        (this._targetManager().addToIgnoreTarget(n),
        t.push(
          new Promise((e) =>
            setTimeout(() => {
              (this.#n.emit(`Target.targetDestroyed`, { targetId: n }), e(null));
            }, 0)
          )
        ));
    (await Promise.all(t), this.#f.delete(e));
  }
  async screens() {
    let { screenInfos: e } = await this.#n.send(`Emulation.getScreenInfos`);
    return e;
  }
  async addScreen(e) {
    let { screenInfo: t } = await this.#n.send(`Emulation.addScreen`, e);
    return t;
  }
  async removeScreen(e) {
    return await this.#n.send(`Emulation.removeScreen`, { screenId: e });
  }
  async getWindowBounds(e) {
    let { bounds: t } = await this.#n.send(`Browser.getWindowBounds`, { windowId: Number(e) });
    return t;
  }
  async setWindowBounds(e, t) {
    await this.#n.send(`Browser.setWindowBounds`, { windowId: Number(e), bounds: t });
  }
  targets() {
    return Array.from(this.#u.getAvailableTargets().values()).filter(
      (e) => e._isTargetExposed() && e._initializedDeferred.value() === Mm.SUCCESS
    );
  }
  target() {
    let e = this.targets().find((e) => e.type() === `browser`);
    if (!e) throw Error(`Browser target is not found`);
    return e;
  }
  async version() {
    return (await this.#b()).product;
  }
  async userAgent() {
    return (await this.#b()).userAgent;
  }
  async close() {
    (await this.#r.call(null), await this.disconnect());
  }
  disconnect() {
    return (this.#u.dispose(), this.#n.dispose(), this._detach(), Promise.resolve());
  }
  get _connection() {
    return this.#n;
  }
  get connected() {
    return !this.#n._closed;
  }
  #b() {
    return this.#n.send(`Browser.getVersion`);
  }
  get debugInfo() {
    return { pendingProtocolErrors: this.#n.getPendingProtocolErrors() };
  }
  isNetworkEnabled() {
    return this.#c;
  }
  async extensions() {
    let e = await this.#n.send(`Extensions.getExtensions`),
      t = new Map();
    for (let n of e.extensions)
      if (this.#f.has(n.id)) t.set(n.id, this.#f.get(n.id));
      else {
        let e = new jm(n.id, n.version, n.name, n.path, n.enabled, this);
        t.set(n.id, e);
      }
    return ((this.#f = t), this.#f);
  }
  isIssuesEnabled() {
    return this.#l;
  }
};
async function zh(e, t, n) {
  let {
      acceptInsecureCerts: r = !1,
      networkEnabled: i = !0,
      issuesEnabled: a = !0,
      defaultViewport: o = Ql,
      downloadBehavior: s,
      targetFilter: c,
      _isPageTarget: l,
      slowMo: u = 0,
      protocolTimeout: d,
      handleDevToolsAsPage: f,
      idGenerator: p = bf(),
      blocklist: m,
      allowlist: h,
    } = n,
    g = new ip(t, e, u, d, !1, p),
    { browserContextIds: _ } = await g.send(`Target.getBrowserContexts`);
  return await Rh._create(
    g,
    _,
    r,
    o,
    s,
    void 0,
    () => g.send(`Browser.close`).catch(q),
    c,
    l,
    void 0,
    i,
    a,
    f,
    m,
    h
  );
}
Object.freeze({
  'Slow 3G': {
    download: ((500 * 1e3) / 8) * 0.8,
    upload: ((500 * 1e3) / 8) * 0.8,
    latency: 400 * 5,
  },
  'Fast 3G': {
    download: ((1.6 * 1e3 * 1e3) / 8) * 0.9,
    upload: ((750 * 1e3) / 8) * 0.9,
    latency: 150 * 3.75,
  },
  'Slow 4G': {
    download: ((1.6 * 1e3 * 1e3) / 8) * 0.9,
    upload: ((750 * 1e3) / 8) * 0.9,
    latency: 150 * 3.75,
  },
  'Fast 4G': {
    download: ((9 * 1e3 * 1e3) / 8) * 0.9,
    upload: ((1.5 * 1e3 * 1e3) / 8) * 0.9,
    latency: 60 * 2.75,
  },
});
var Bh = e({ BrowserWebSocketTransport: () => Vh }),
  Vh = class e {
    static create(t) {
      return new Promise((n, r) => {
        let i = new WebSocket(t);
        (i.addEventListener(`open`, () => n(new e(i))), i.addEventListener(`error`, r));
      });
    }
    #e;
    onmessage;
    onclose;
    constructor(e) {
      ((this.#e = e),
        this.#e.addEventListener(`message`, (e) => {
          this.onmessage && this.onmessage.call(null, e.data);
        }),
        this.#e.addEventListener(`close`, () => {
          this.onclose && this.onclose.call(null);
        }),
        this.#e.addEventListener(`error`, q));
    }
    send(e) {
      this.#e.send(e);
    }
    close() {
      this.#e.close();
    }
  },
  Hh = [
    {
      name: `Blackberry PlayBook`,
      userAgent: `Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+`,
      viewport: {
        width: 600,
        height: 1024,
        deviceScaleFactor: 1,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Blackberry PlayBook landscape`,
      userAgent: `Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+`,
      viewport: {
        width: 1024,
        height: 600,
        deviceScaleFactor: 1,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `BlackBerry Z30`,
      userAgent: `Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `BlackBerry Z30 landscape`,
      userAgent: `Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy Note 3`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy Note 3 landscape`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy Note II`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy Note II landscape`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy S III`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy S III landscape`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy S5`,
      userAgent: `Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy S5 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy S8`,
      userAgent: `Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36`,
      viewport: {
        width: 360,
        height: 740,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy S8 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36`,
      viewport: {
        width: 740,
        height: 360,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy S9+`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36`,
      viewport: {
        width: 320,
        height: 658,
        deviceScaleFactor: 4.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy S9+ landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36`,
      viewport: {
        width: 658,
        height: 320,
        deviceScaleFactor: 4.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Galaxy Tab S4`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36`,
      viewport: {
        width: 712,
        height: 1138,
        deviceScaleFactor: 2.25,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Galaxy Tab S4 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36`,
      viewport: {
        width: 1138,
        height: 712,
        deviceScaleFactor: 2.25,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPad`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1`,
      viewport: {
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPad landscape`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1`,
      viewport: {
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPad (gen 6)`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPad (gen 6) landscape`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPad (gen 7)`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 810,
        height: 1080,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPad (gen 7) landscape`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 1080,
        height: 810,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPad Mini`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1`,
      viewport: {
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPad Mini landscape`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1`,
      viewport: {
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPad Pro`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1`,
      viewport: {
        width: 1024,
        height: 1366,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPad Pro landscape`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1`,
      viewport: {
        width: 1366,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPad Pro 11`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 834,
        height: 1194,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPad Pro 11 landscape`,
      userAgent: `Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 1194,
        height: 834,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 4`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53`,
      viewport: {
        width: 320,
        height: 480,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 4 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53`,
      viewport: {
        width: 480,
        height: 320,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 5`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1`,
      viewport: {
        width: 320,
        height: 568,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 5 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1`,
      viewport: {
        width: 568,
        height: 320,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 6`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 6 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 667,
        height: 375,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 6 Plus`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 414,
        height: 736,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 6 Plus landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 736,
        height: 414,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 7`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 7 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 667,
        height: 375,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 7 Plus`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 414,
        height: 736,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 7 Plus landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 736,
        height: 414,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 8`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 8 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 667,
        height: 375,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 8 Plus`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 414,
        height: 736,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 8 Plus landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 736,
        height: 414,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone SE`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1`,
      viewport: {
        width: 320,
        height: 568,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone SE landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1`,
      viewport: {
        width: 568,
        height: 320,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone X`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone X landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
      viewport: {
        width: 812,
        height: 375,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone XR`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 414,
        height: 896,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone XR landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 896,
        height: 414,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 11`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 414,
        height: 828,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 11 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 828,
        height: 414,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 11 Pro`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 11 Pro landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 812,
        height: 375,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 11 Pro Max`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 414,
        height: 896,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 11 Pro Max landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 896,
        height: 414,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 12`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 12 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 844,
        height: 390,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 12 Pro`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 12 Pro landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 844,
        height: 390,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 12 Pro Max`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 428,
        height: 926,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 12 Pro Max landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 926,
        height: 428,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 12 Mini`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 12 Mini landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 812,
        height: 375,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 13`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 13 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 844,
        height: 390,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 13 Pro`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 13 Pro landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 844,
        height: 390,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 13 Pro Max`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 428,
        height: 926,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 13 Pro Max landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 926,
        height: 428,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 13 Mini`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 13 Mini landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 812,
        height: 375,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 14`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 390,
        height: 663,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 14 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 750,
        height: 340,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 14 Plus`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 428,
        height: 745,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 14 Plus landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 832,
        height: 378,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 14 Pro`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 393,
        height: 659,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 14 Pro landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 734,
        height: 343,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 14 Pro Max`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 430,
        height: 739,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 14 Pro Max landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 814,
        height: 380,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 15`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 393,
        height: 659,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 15 landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 734,
        height: 343,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 15 Plus`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 430,
        height: 739,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 15 Plus landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 814,
        height: 380,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 15 Pro`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 393,
        height: 659,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 15 Pro landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 734,
        height: 343,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `iPhone 15 Pro Max`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 430,
        height: 739,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `iPhone 15 Pro Max landscape`,
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`,
      viewport: {
        width: 814,
        height: 380,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `JioPhone 2`,
      userAgent: `Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5`,
      viewport: {
        width: 240,
        height: 320,
        deviceScaleFactor: 1,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `JioPhone 2 landscape`,
      userAgent: `Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5`,
      viewport: {
        width: 320,
        height: 240,
        deviceScaleFactor: 1,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Kindle Fire HDX`,
      userAgent: `Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true`,
      viewport: {
        width: 800,
        height: 1280,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Kindle Fire HDX landscape`,
      userAgent: `Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true`,
      viewport: {
        width: 1280,
        height: 800,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `LG Optimus L70`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 384,
        height: 640,
        deviceScaleFactor: 1.25,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `LG Optimus L70 landscape`,
      userAgent: `Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 640,
        height: 384,
        deviceScaleFactor: 1.25,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Microsoft Lumia 550`,
      userAgent: `Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Microsoft Lumia 950`,
      userAgent: `Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 4,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Microsoft Lumia 950 landscape`,
      userAgent: `Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 4,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 10`,
      userAgent: `Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36`,
      viewport: {
        width: 800,
        height: 1280,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 10 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36`,
      viewport: {
        width: 1280,
        height: 800,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 4`,
      userAgent: `Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 384,
        height: 640,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 4 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 640,
        height: 384,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 5`,
      userAgent: `Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 5 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 5X`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 412,
        height: 732,
        deviceScaleFactor: 2.625,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 5X landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 732,
        height: 412,
        deviceScaleFactor: 2.625,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 6`,
      userAgent: `Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 412,
        height: 732,
        deviceScaleFactor: 3.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 6 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 732,
        height: 412,
        deviceScaleFactor: 3.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 6P`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 412,
        height: 732,
        deviceScaleFactor: 3.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 6P landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 732,
        height: 412,
        deviceScaleFactor: 3.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nexus 7`,
      userAgent: `Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36`,
      viewport: {
        width: 600,
        height: 960,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nexus 7 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36`,
      viewport: {
        width: 960,
        height: 600,
        deviceScaleFactor: 2,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nokia Lumia 520`,
      userAgent: `Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)`,
      viewport: {
        width: 320,
        height: 533,
        deviceScaleFactor: 1.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nokia Lumia 520 landscape`,
      userAgent: `Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)`,
      viewport: {
        width: 533,
        height: 320,
        deviceScaleFactor: 1.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Nokia N9`,
      userAgent: `Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13`,
      viewport: {
        width: 480,
        height: 854,
        deviceScaleFactor: 1,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Nokia N9 landscape`,
      userAgent: `Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13`,
      viewport: {
        width: 854,
        height: 480,
        deviceScaleFactor: 1,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Pixel 2`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 411,
        height: 731,
        deviceScaleFactor: 2.625,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Pixel 2 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 731,
        height: 411,
        deviceScaleFactor: 2.625,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Pixel 2 XL`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 411,
        height: 823,
        deviceScaleFactor: 3.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Pixel 2 XL landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36`,
      viewport: {
        width: 823,
        height: 411,
        deviceScaleFactor: 3.5,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Pixel 3`,
      userAgent: `Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36`,
      viewport: {
        width: 393,
        height: 786,
        deviceScaleFactor: 2.75,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Pixel 3 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36`,
      viewport: {
        width: 786,
        height: 393,
        deviceScaleFactor: 2.75,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Pixel 4`,
      userAgent: `Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36`,
      viewport: {
        width: 353,
        height: 745,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Pixel 4 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36`,
      viewport: {
        width: 745,
        height: 353,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Pixel 4a (5G)`,
      userAgent: `Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36`,
      viewport: {
        width: 353,
        height: 745,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Pixel 4a (5G) landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36`,
      viewport: {
        width: 745,
        height: 353,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Pixel 5`,
      userAgent: `Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36`,
      viewport: {
        width: 393,
        height: 851,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Pixel 5 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36`,
      viewport: {
        width: 851,
        height: 393,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
    {
      name: `Moto G4`,
      userAgent: `Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36`,
      viewport: {
        width: 360,
        height: 640,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !1,
      },
    },
    {
      name: `Moto G4 landscape`,
      userAgent: `Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36`,
      viewport: {
        width: 640,
        height: 360,
        deviceScaleFactor: 3,
        isMobile: !0,
        hasTouch: !0,
        isLandscape: !0,
      },
    },
  ],
  Uh = {};
for (let e of Hh) Uh[e.name] = e;
Object.freeze(Uh);
async function Wh(e, t, n) {
  let {
      acceptInsecureCerts: r = !1,
      networkEnabled: a = !0,
      issuesEnabled: o = !0,
      defaultViewport: s = Ql,
    } = n,
    { bidiConnection: c, cdpConnection: l, closeCallback: u } = await Gh(e, t, n);
  return await (
    await i(() => import(`./bidi-C37lr4Tc.js`), __vite__mapDeps([2, 0, 1]))
  ).BidiBrowser.create({
    connection: c,
    cdpConnection: l,
    closeCallback: u,
    process: void 0,
    defaultViewport: s,
    acceptInsecureCerts: r,
    networkEnabled: a,
    issuesEnabled: o,
    capabilities: n.capabilities,
  });
}
async function Gh(e, t, n) {
  let r = await i(() => import(`./bidi-C37lr4Tc.js`), __vite__mapDeps([2, 0, 1])),
    { slowMo: a = 0, protocolTimeout: o, idGenerator: s = bf() } = n,
    c = new r.BidiConnection(t, e, s, a, o);
  try {
    let e = await c.send(`session.status`, {});
    if (`type` in e && e.type === `success`)
      return {
        bidiConnection: c,
        closeCallback: async () => {
          await c.send(`browser.close`, {}).catch(q);
        },
      };
  } catch (e) {
    if (!(e instanceof ql)) throw e;
  }
  c.unbind();
  let l = new ip(t, e, a, o, !0, s);
  if ((await l.send(`Browser.getVersion`)).product.toLowerCase().includes(`firefox`))
    throw new Jl(`Firefox is not supported in BiDi over CDP mode.`);
  return {
    cdpConnection: l,
    bidiConnection: await r.connectBidiOverCdp(l),
    closeCallback: async () => {
      await l.send(`Browser.close`).catch(q);
    },
  };
}
var Kh = async () =>
  Ml
    ? (
        await i(
          async () => {
            let { NodeWebSocketTransport: e } = await Promise.resolve().then(() => y_);
            return { NodeWebSocketTransport: e };
          },
          void 0
        )
      ).NodeWebSocketTransport
    : (
        await i(
          async () => {
            let { BrowserWebSocketTransport: e } = await Promise.resolve().then(() => Bh);
            return { BrowserWebSocketTransport: e };
          },
          void 0
        )
      ).BrowserWebSocketTransport;
function qh(e) {
  if (e.blocklist && e.allowlist) throw Error(`Cannot specify both blocklist and allowlist`);
  if (e.protocol === `webDriverBiDi` && (e.blocklist || e.allowlist))
    throw Error(`blocklist and allowlist are only supported with the CDP protocol`);
}
async function Jh(e) {
  qh(e);
  let { connectionTransport: t, endpointUrl: n } = await Yh(e);
  return e.protocol === `webDriverBiDi` ? await Wh(t, n, e) : await zh(t, n, e);
}
async function Yh(e) {
  let { browserWSEndpoint: n, browserURL: r, channel: a, transport: o, headers: s = {} } = e;
  if (
    (K(
      Number(!!n) + Number(!!r) + Number(!!o) + Number(!!a) === 1,
      `Exactly one of browserWSEndpoint, browserURL, transport or channel must be passed to puppeteer.connect`
    ),
    o)
  )
    return { connectionTransport: o, endpointUrl: `` };
  if (n) return { connectionTransport: await (await Kh()).create(n, s), endpointUrl: n };
  if (r) {
    let e = await Xh(r);
    return { connectionTransport: await (await Kh()).create(e), endpointUrl: e };
  } else if (e.channel && Ml) {
    let {
        detectBrowserPlatform: n,
        resolveDefaultUserDataDir: r,
        Browser: a,
      } = await i(
        async () => {
          let {
            detectBrowserPlatform: e,
            resolveDefaultUserDataDir: t,
            Browser: n,
          } = await Promise.resolve().then(() => __);
          return { detectBrowserPlatform: e, resolveDefaultUserDataDir: t, Browser: n };
        },
        void 0
      ),
      o = n();
    if (!o) throw Error(`Could not detect required browser platform`);
    let { convertPuppeteerChannelToBrowsersChannel: c } = await i(
        async () => {
          let { convertPuppeteerChannelToBrowsersChannel: e } = await Promise.resolve().then(
            () => w_
          );
          return { convertPuppeteerChannelToBrowsersChannel: e };
        },
        void 0
      ),
      { join: l } = await i(
        async () => {
          let { join: e } = await import(`./__vite-browser-external-DOOah4Mz.js`).then((e) =>
            t(e.t(), 1)
          );
          return { join: e };
        },
        __vite__mapDeps([0, 1])
      ),
      u = l(r(a.CHROME, o, c(e.channel)), `DevToolsActivePort`);
    try {
      let e = await Nl.value.fs.promises.readFile(u, `ascii`),
        [t, n] = e
          .split(
            `
`
          )
          .map((e) => e.trim())
          .filter((e) => !!e);
      if (!t || !n) throw Error(`Invalid DevToolsActivePort '${e}' found`);
      let r = parseInt(t, 10);
      if (isNaN(r) || r <= 0 || r > 65535) throw Error(`Invalid port '${t}' found`);
      let i = `ws://localhost:${r}${n}`;
      return { connectionTransport: await (await Kh()).create(i, s), endpointUrl: i };
    } catch (t) {
      throw Error(`Could not find DevToolsActivePort for ${e.channel} at ${u}`, { cause: t });
    }
  }
  throw Error(`Invalid connection options`);
}
async function Xh(e) {
  let t = new URL(`/json/version`, e);
  try {
    let e = await globalThis.fetch(t.toString(), { method: `GET` });
    if (!e.ok) throw Error(`HTTP ${e.statusText}`);
    return (await e.json()).webSocketDebuggerUrl;
  } catch (e) {
    throw (
      Iu(e) && (e.message = `Failed to fetch browser webSocket URL from ${t}: ` + e.message),
      e
    );
  }
}
var Zh = class {
    static customQueryHandlers = od;
    static registerCustomQueryHandler(e, t) {
      return this.customQueryHandlers.register(e, t);
    }
    static unregisterCustomQueryHandler(e) {
      return this.customQueryHandlers.unregister(e);
    }
    static customQueryHandlerNames() {
      return this.customQueryHandlers.names();
    }
    static clearCustomQueryHandlers() {
      return this.customQueryHandlers.clear();
    }
    _isPuppeteerCore;
    _changedBrowsers = !1;
    constructor(e) {
      ((this._isPuppeteerCore = e.isPuppeteerCore), (this.connect = this.connect.bind(this)));
    }
    connect(e) {
      return Jh(e);
    }
  },
  Qh = Object.freeze({
    chrome: `149.0.7827.22`,
    'chrome-headless-shell': `149.0.7827.22`,
    firefox: `stable_151.0`,
  }),
  X;
(function (e) {
  ((e.CHROME = `chrome`),
    (e.CHROMEHEADLESSSHELL = `chrome-headless-shell`),
    (e.CHROMIUM = `chromium`),
    (e.FIREFOX = `firefox`),
    (e.CHROMEDRIVER = `chromedriver`));
})((X ||= {}));
var Z;
(function (e) {
  ((e.LINUX = `linux`),
    (e.LINUX_ARM = `linux_arm`),
    (e.MAC = `mac`),
    (e.MAC_ARM = `mac_arm`),
    (e.WIN32 = `win32`),
    (e.WIN64 = `win64`));
})((Z ||= {}));
var Q;
(function (e) {
  ((e.CANARY = `canary`),
    (e.NIGHTLY = `nightly`),
    (e.BETA = `beta`),
    (e.DEV = `dev`),
    (e.DEVEDITION = `devedition`),
    (e.STABLE = `stable`),
    (e.ESR = `esr`),
    (e.LATEST = `latest`));
})((Q ||= {}));
var $;
(function (e) {
  ((e.STABLE = `stable`), (e.DEV = `dev`), (e.CANARY = `canary`), (e.BETA = `beta`));
})(($ ||= {}));
async function $h(e, t, n, r = !0) {
  let a;
  try {
    let { ProxyAgent: e } = await i(async () => {
      let { ProxyAgent: e } = await import(`./browsers-BR-oJzMt.js`);
      return { ProxyAgent: e };
    }, []);
    a = new e();
  } catch {}
  let o = {
      protocol: e.protocol,
      hostname: e.hostname,
      port: e.port,
      path: e.pathname + e.search,
      method: t,
      headers: r ? { Connection: `keep-alive` } : void 0,
      auth: (0, G.urlToHttpOptions)(e).auth,
      agent: a,
    },
    s =
      (o.protocol,
      G.request(o, (e) => {
        e.statusCode && e.statusCode >= 300 && e.statusCode < 400 && e.headers.location
          ? ($h(new G.URL(e.headers.location), t, n), e.resume())
          : n(e);
      }));
  return (s.end(), s);
}
async function eg(e) {
  let t = await tg(e);
  try {
    return JSON.parse(t);
  } catch {
    throw Error(`Could not parse JSON from ` + e.toString());
  }
}
function tg(e) {
  return new Promise(async (t, n) => {
    try {
      (
        await $h(
          e,
          `GET`,
          (r) => {
            let i = ``;
            if (r.statusCode && r.statusCode >= 400)
              return n(Error(`Got status code ${r.statusCode}`));
            (r.on(`data`, (e) => {
              i += e;
            }),
              r.on(`end`, () => {
                try {
                  return t(String(i));
                } catch {
                  return n(Error(`Failed to read text response from ${e}`));
                }
              }));
          },
          !1
        )
      ).on(`error`, (e) => {
        n(e);
      });
    } catch (e) {
      n(e);
    }
  });
}
function ng(e) {
  switch (e) {
    case Z.LINUX_ARM:
    case Z.LINUX:
      return `linux64`;
    case Z.MAC_ARM:
      return `mac-arm64`;
    case Z.MAC:
      return `mac-x64`;
    case Z.WIN32:
      return `win32`;
    case Z.WIN64:
      return `win64`;
  }
}
function rg(e, t) {
  switch (e) {
    case Z.MAC:
    case Z.MAC_ARM:
      return G.default.join(
        `chrome-` + ng(e),
        `Google Chrome for Testing.app`,
        `Contents`,
        `MacOS`,
        `Google Chrome for Testing`
      );
    case Z.LINUX_ARM:
    case Z.LINUX:
      return G.default.join(`chrome-linux64`, `chrome`);
    case Z.WIN32:
    case Z.WIN64:
      return G.default.join(`chrome-` + ng(e), `chrome.exe`);
  }
}
var ig = `https://googlechromelabs.github.io/chrome-for-testing`;
async function ag(e) {
  let t = await eg(new URL(`${ig}/last-known-good-versions.json`));
  for (let e of Object.keys(t.channels))
    ((t.channels[e.toLowerCase()] = t.channels[e]), delete t.channels[e]);
  return t.channels[e];
}
async function og(e) {
  return (await eg(new URL(`${ig}/latest-versions-per-milestone.json`))).milestones[e];
}
async function sg(e) {
  return (await eg(new URL(`${ig}/latest-patch-versions-per-build.json`))).builds[e];
}
async function cg(e) {
  if (Object.values($).includes(e)) return (await ag(e)).version;
  if (e.match(/^\d+$/)) return (await og(e))?.version;
  if (e.match(/^\d+\.\d+\.\d+$/)) return (await sg(e))?.version;
}
var lg = [`PROGRAMFILES`, `ProgramW6432`, `ProgramFiles(x86)`, `LOCALAPPDATA`];
function ug(e, t) {
  if (t.size === 0) throw Error(`Non of the common Windows Env variables were set`);
  let n;
  switch (e) {
    case $.STABLE:
      n = `Google\\Chrome\\Application\\chrome.exe`;
      break;
    case $.BETA:
      n = `Google\\Chrome Beta\\Application\\chrome.exe`;
      break;
    case $.CANARY:
      n = `Google\\Chrome SxS\\Application\\chrome.exe`;
      break;
    case $.DEV:
      n = `Google\\Chrome Dev\\Application\\chrome.exe`;
      break;
  }
  return [...t.values()].map((e) => G.default.win32.join(e, n));
}
function dg(e) {
  try {
    let t = (0, G.execSync)(`cmd.exe /c echo %${e.toLocaleUpperCase()}%`, {
      stdio: [`ignore`, `pipe`, `ignore`],
      encoding: `utf-8`,
    }).trim();
    if (t) return t;
  } catch {}
}
function fg(e) {
  if (
    !(0, G.execSync)(`wslinfo --version`, {
      stdio: [`ignore`, `pipe`, `ignore`],
      encoding: `utf-8`,
    }).trim()
  )
    throw Error(`Not in WSL or unsupported version of WSL.`);
  let t = new Set();
  for (let e of lg) {
    let n = dg(e);
    n && t.add(n);
  }
  return ug(e, t).map((e) => (0, G.execSync)(`wslpath "${e}"`).toString().trim());
}
function pg(e) {
  let t = [];
  switch (e) {
    case $.STABLE:
      t.push(`/opt/google/chrome/chrome`);
      break;
    case $.BETA:
      t.push(`/opt/google/chrome-beta/chrome`);
      break;
    case $.CANARY:
      t.push(`/opt/google/chrome-canary/chrome`);
      break;
    case $.DEV:
      t.push(`/opt/google/chrome-unstable/chrome`);
      break;
  }
  try {
    let n = fg(e);
    n && t.push(...n);
  } catch {}
  return t;
}
function mg(e, t) {
  switch (e) {
    case Z.WIN64:
    case Z.WIN32:
      let e = new Set(lg.map((e) => ({})[e]).filter((e) => !!e));
      return (
        e.add(`C:\\Program Files`),
        e.add(`C:\\Program Files (x86)`),
        e.add(`D:\\Program Files`),
        e.add(`D:\\Program Files (x86)`),
        ug(t, e)
      );
    case Z.MAC_ARM:
    case Z.MAC:
      switch (t) {
        case $.STABLE:
          return [`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`];
        case $.BETA:
          return [`/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta`];
        case $.CANARY:
          return [`/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`];
        case $.DEV:
          return [`/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev`];
      }
    case Z.LINUX_ARM:
    case Z.LINUX:
      return pg(t);
  }
}
function hg(e, t) {
  switch (e) {
    case Z.WIN64:
    case Z.WIN32:
      switch (t) {
        case $.STABLE:
          return G.default.join(gg(), `Google`, `Chrome`, `User Data`);
        case $.BETA:
          return G.default.join(gg(), `Google`, `Chrome Beta`, `User Data`);
        case $.CANARY:
          return G.default.join(gg(), `Google`, `Chrome SxS`, `User Data`);
        case $.DEV:
          return G.default.join(gg(), `Google`, `Chrome Dev`, `User Data`);
      }
    case Z.MAC_ARM:
    case Z.MAC:
      switch (t) {
        case $.STABLE:
          return G.default.join(vg(), `Chrome`);
        case $.BETA:
          return G.default.join(vg(), `Chrome Beta`);
        case $.DEV:
          return G.default.join(vg(), `Chrome Dev`);
        case $.CANARY:
          return G.default.join(vg(), `Chrome Canary`);
      }
    case Z.LINUX_ARM:
    case Z.LINUX:
      switch (t) {
        case $.STABLE:
          return G.default.join(_g(), `google-chrome`);
        case $.BETA:
          return G.default.join(_g(), `google-chrome-beta`);
        case $.CANARY:
          return G.default.join(_g(), `google-chrome-canary`);
        case $.DEV:
          return G.default.join(_g(), `google-chrome-unstable`);
      }
  }
}
function gg() {
  return {}.LOCALAPPDATA || G.default.join(G.default.homedir(), `AppData`, `Local`);
}
function _g() {
  return (
    {}.CHROME_CONFIG_HOME || {}.XDG_CONFIG_HOME || G.default.join(G.default.homedir(), `.config`)
  );
}
function vg() {
  return G.default.join(G.default.homedir(), `Library`, `Application Support`, `Google`);
}
function yg(e, t) {
  let n = e.trim(),
    r = t.trim(),
    i = /^\d+(?:\.\d+){0,3}$/;
  if (!i.test(n)) throw Error(`Version ${e} is not a valid Chrome version`);
  if (!i.test(r)) throw Error(`Version ${t} is not a valid Chrome version`);
  let a = n.split(`.`).map(Number),
    o = r.split(`.`).map(Number);
  for (let e = 0; e < 4; e++) {
    let t = a[e] ?? 0,
      n = o[e] ?? 0;
    if (t > n) return 1;
    if (t < n) return -1;
  }
  return 0;
}
function bg(e) {
  switch (e) {
    case Z.LINUX_ARM:
    case Z.LINUX:
      return `linux64`;
    case Z.MAC_ARM:
      return `mac-arm64`;
    case Z.MAC:
      return `mac-x64`;
    case Z.WIN32:
      return `win32`;
    case Z.WIN64:
      return `win64`;
  }
}
function xg(e, t) {
  switch (e) {
    case Z.MAC:
    case Z.MAC_ARM:
      return G.default.join(`chrome-headless-shell-` + bg(e), `chrome-headless-shell`);
    case Z.LINUX_ARM:
    case Z.LINUX:
      return G.default.join(`chrome-headless-shell-linux64`, `chrome-headless-shell`);
    case Z.WIN32:
    case Z.WIN64:
      return G.default.join(`chrome-headless-shell-` + bg(e), `chrome-headless-shell.exe`);
  }
}
function Sg(e) {
  switch (e) {
    case Z.LINUX_ARM:
    case Z.LINUX:
      return `linux64`;
    case Z.MAC_ARM:
      return `mac-arm64`;
    case Z.MAC:
      return `mac-x64`;
    case Z.WIN32:
      return `win32`;
    case Z.WIN64:
      return `win64`;
  }
}
function Cg(e, t) {
  switch (e) {
    case Z.MAC:
    case Z.MAC_ARM:
      return G.default.join(`chromedriver-` + Sg(e), `chromedriver`);
    case Z.LINUX_ARM:
    case Z.LINUX:
      return G.default.join(`chromedriver-linux64`, `chromedriver`);
    case Z.WIN32:
    case Z.WIN64:
      return G.default.join(`chromedriver-` + Sg(e), `chromedriver.exe`);
  }
}
function wg(e) {
  switch (e) {
    case Z.LINUX_ARM:
    case Z.LINUX:
      return `Linux_x64`;
    case Z.MAC_ARM:
      return `Mac_Arm`;
    case Z.MAC:
      return `Mac`;
    case Z.WIN32:
      return `Win`;
    case Z.WIN64:
      return `Win_x64`;
  }
}
function Tg(e, t) {
  switch (e) {
    case Z.MAC:
    case Z.MAC_ARM:
      return G.default.join(`chrome-mac`, `Chromium.app`, `Contents`, `MacOS`, `Chromium`);
    case Z.LINUX_ARM:
    case Z.LINUX:
      return G.default.join(`chrome-linux`, `chrome`);
    case Z.WIN32:
    case Z.WIN64:
      return G.default.join(`chrome-win`, `chrome.exe`);
  }
}
async function Eg(e) {
  return await tg(
    new URL(`https://storage.googleapis.com/chromium-browser-snapshots/${wg(e)}/LAST_CHANGE`)
  );
}
function Dg(e, t) {
  return Number(e) - Number(t);
}
function Og(e) {
  for (let t of Object.values(Ag))
    if (e.startsWith(t + `_`)) return ((e = e.substring(t.length + 1)), [t, e]);
  return [Ag.NIGHTLY, e];
}
function kg(e, t) {
  let [n] = Og(t);
  switch (n) {
    case Ag.NIGHTLY:
      switch (e) {
        case Z.MAC_ARM:
        case Z.MAC:
          return G.default.join(`Firefox Nightly.app`, `Contents`, `MacOS`, `firefox`);
        case Z.LINUX_ARM:
        case Z.LINUX:
          return G.default.join(`firefox`, `firefox`);
        case Z.WIN32:
        case Z.WIN64:
          return G.default.join(`firefox`, `firefox.exe`);
      }
    case Ag.BETA:
    case Ag.DEVEDITION:
    case Ag.ESR:
    case Ag.STABLE:
      switch (e) {
        case Z.MAC_ARM:
        case Z.MAC:
          return G.default.join(`Firefox.app`, `Contents`, `MacOS`, `firefox`);
        case Z.LINUX_ARM:
        case Z.LINUX:
          return G.default.join(`firefox`, `firefox`);
        case Z.WIN32:
        case Z.WIN64:
          return G.default.join(`core`, `firefox.exe`);
      }
  }
}
var Ag;
(function (e) {
  ((e.STABLE = `stable`),
    (e.ESR = `esr`),
    (e.DEVEDITION = `devedition`),
    (e.BETA = `beta`),
    (e.NIGHTLY = `nightly`));
})((Ag ||= {}));
var jg = `https://product-details.mozilla.org/1.0`;
async function Mg(e = Ag.NIGHTLY) {
  let t = {
      [Ag.ESR]: `FIREFOX_ESR`,
      [Ag.STABLE]: `LATEST_FIREFOX_VERSION`,
      [Ag.DEVEDITION]: `FIREFOX_DEVEDITION`,
      [Ag.BETA]: `FIREFOX_DEVEDITION`,
      [Ag.NIGHTLY]: `FIREFOX_NIGHTLY`,
    },
    n = (await eg(new URL(`${jg}/firefox_versions.json`)))[t[e]];
  if (!n) throw Error(`Channel ${e} is not found.`);
  return e + `_` + n;
}
async function Ng(e) {
  (G.default.existsSync(e.path) || (await G.default.promises.mkdir(e.path, { recursive: !0 })),
    await Ig({ preferences: { ...Pg(e.preferences), ...e.preferences }, path: e.path }));
}
function Pg(e) {
  let t = `dummy.test`;
  return Object.assign(
    {
      'app.normandy.api_url': ``,
      'app.update.checkInstallTime': !1,
      'app.update.disabledForTesting': !0,
      'apz.content_response_timeout': 6e4,
      'browser.contentblocking.features.standard': `-tp,tpPrivate,cookieBehavior0,-cryptoTP,-fp`,
      'browser.dom.window.dump.enabled': !0,
      'browser.newtabpage.activity-stream.feeds.system.topstories': !1,
      'browser.newtabpage.enabled': !1,
      'browser.pagethumbnails.capturing_disabled': !0,
      'browser.safebrowsing.blockedURIs.enabled': !1,
      'browser.safebrowsing.downloads.enabled': !1,
      'browser.safebrowsing.malware.enabled': !1,
      'browser.safebrowsing.phishing.enabled': !1,
      'browser.search.update': !1,
      'browser.sessionstore.resume_from_crash': !1,
      'browser.shell.checkDefaultBrowser': !1,
      'browser.startup.homepage': `about:blank`,
      'browser.startup.homepage_override.mstone': `ignore`,
      'browser.startup.page': 0,
      'browser.tabs.disableBackgroundZombification': !1,
      'browser.tabs.warnOnCloseOtherTabs': !1,
      'browser.tabs.warnOnOpen': !1,
      'browser.translations.automaticallyPopup': !1,
      'browser.uitour.enabled': !1,
      'browser.urlbar.suggest.searches': !1,
      'browser.usedOnWindows10.introURL': ``,
      'browser.warnOnQuit': !1,
      'datareporting.healthreport.documentServerURI': `http://${t}/dummy/healthreport/`,
      'datareporting.healthreport.logging.consoleEnabled': !1,
      'datareporting.healthreport.service.enabled': !1,
      'datareporting.healthreport.service.firstRun': !1,
      'datareporting.healthreport.uploadEnabled': !1,
      'datareporting.policy.dataSubmissionEnabled': !1,
      'datareporting.policy.dataSubmissionPolicyBypassNotification': !0,
      'devtools.jsonview.enabled': !1,
      'dom.disable_open_during_load': !1,
      'dom.file.createInChild': !0,
      'dom.ipc.reportProcessHangs': !1,
      'dom.max_chrome_script_run_time': 0,
      'dom.max_script_run_time': 0,
      'extensions.autoDisableScopes': 0,
      'extensions.enabledScopes': 5,
      'extensions.getAddons.cache.enabled': !1,
      'extensions.installDistroAddons': !1,
      'extensions.update.enabled': !1,
      'extensions.update.notifyUser': !1,
      'extensions.webservice.discoverURL': `http://${t}/dummy/discoveryURL`,
      'focusmanager.testmode': !0,
      'general.useragent.updates.enabled': !1,
      'geo.provider.testing': !0,
      'geo.wifi.scan': !1,
      'hangmonitor.timeout': 0,
      'javascript.options.showInConsole': !0,
      'media.gmp-manager.updateEnabled': !1,
      'media.sanity-test.disabled': !0,
      'network.cookie.sameSite.laxByDefault': !1,
      'network.http.prompt-temp-redirect': !1,
      'network.http.speculative-parallel-limit': 0,
      'network.manage-offline-status': !1,
      'network.sntp.pools': t,
      'plugin.state.flash': 0,
      'privacy.trackingprotection.enabled': !1,
      'remote.enabled': !0,
      'remote.bidi.dismiss_file_pickers.enabled': !0,
      'screenshots.browser.component.enabled': !1,
      'security.certerrors.mitm.priming.enabled': !1,
      'security.fileuri.strict_origin_policy': !1,
      'security.notification_enable_delay': 0,
      'services.settings.server': `http://${t}/dummy/blocklist/`,
      'signon.autofillForms': !1,
      'signon.rememberSignons': !1,
      'startup.homepage_welcome_url': `about:blank`,
      'startup.homepage_welcome_url.additional': ``,
      'toolkit.cosmeticAnimations.enabled': !1,
      'toolkit.startup.max_resumed_crashes': -1,
    },
    e
  );
}
async function Fg(e) {
  G.default.existsSync(e) && (await G.default.promises.copyFile(e, e + `.puppeteer`));
}
async function Ig(e) {
  let t = G.default.join(e.path, `prefs.js`),
    n = G.default.join(e.path, `user.js`),
    r = Object.entries(e.preferences).map(
      ([e, t]) => `user_pref(${JSON.stringify(e)}, ${JSON.stringify(t)});`
    ),
    i = await Promise.allSettled([
      Fg(n).then(async () => {
        await G.default.promises.writeFile(
          n,
          r.join(`
`)
        );
      }),
      Fg(t),
    ]);
  for (let e of i) if (e.status === `rejected`) throw e.reason;
}
function Lg(e, t) {
  return parseInt(e.replace(`.`, ``), 16) - parseInt(t.replace(`.`, ``), 16);
}
(X.CHROMEDRIVER,
  X.CHROMEHEADLESSSHELL,
  X.CHROME,
  X.CHROMIUM,
  X.FIREFOX,
  X.CHROMEDRIVER,
  X.CHROMEHEADLESSSHELL,
  X.CHROME,
  X.CHROMIUM,
  X.FIREFOX);
var Rg = {
    [X.CHROMEDRIVER]: Cg,
    [X.CHROMEHEADLESSSHELL]: xg,
    [X.CHROME]: rg,
    [X.CHROMIUM]: Tg,
    [X.FIREFOX]: kg,
  },
  zg = {
    [X.CHROMEDRIVER]: yg,
    [X.CHROMEHEADLESSSHELL]: yg,
    [X.CHROME]: yg,
    [X.CHROMIUM]: Dg,
    [X.FIREFOX]: Lg,
  };
async function Bg(e, t, n) {
  switch (e) {
    case X.FIREFOX:
      switch (n) {
        case Q.LATEST:
          return await Mg(Ag.NIGHTLY);
        case Q.BETA:
          return await Mg(Ag.BETA);
        case Q.NIGHTLY:
          return await Mg(Ag.NIGHTLY);
        case Q.DEVEDITION:
          return await Mg(Ag.DEVEDITION);
        case Q.STABLE:
          return await Mg(Ag.STABLE);
        case Q.ESR:
          return await Mg(Ag.ESR);
        case Q.CANARY:
        case Q.DEV:
          throw Error(`${n.toUpperCase()} is not available for Firefox`);
      }
    case X.CHROME:
      switch (n) {
        case Q.LATEST:
          return await cg($.CANARY);
        case Q.BETA:
          return await cg($.BETA);
        case Q.CANARY:
          return await cg($.CANARY);
        case Q.DEV:
          return await cg($.DEV);
        case Q.STABLE:
          return await cg($.STABLE);
        case Q.NIGHTLY:
        case Q.DEVEDITION:
        case Q.ESR:
          throw Error(`${n.toUpperCase()} is not available for Chrome`);
      }
    case X.CHROMEDRIVER:
      switch (n) {
        case Q.LATEST:
        case Q.CANARY:
          return await cg($.CANARY);
        case Q.BETA:
          return await cg($.BETA);
        case Q.DEV:
          return await cg($.DEV);
        case Q.STABLE:
          return await cg($.STABLE);
        case Q.NIGHTLY:
        case Q.DEVEDITION:
        case Q.ESR:
          throw Error(`${n.toUpperCase()} is not available for ChromeDriver`);
      }
    case X.CHROMEHEADLESSSHELL:
      switch (n) {
        case Q.LATEST:
        case Q.CANARY:
          return await cg($.CANARY);
        case Q.BETA:
          return await cg($.BETA);
        case Q.DEV:
          return await cg($.DEV);
        case Q.STABLE:
          return await cg($.STABLE);
        case Q.NIGHTLY:
        case Q.DEVEDITION:
        case Q.ESR:
          throw Error(`${n} is not available for chrome-headless-shell`);
      }
    case X.CHROMIUM:
      switch (n) {
        case Q.LATEST:
          return await Eg(t);
        case Q.NIGHTLY:
        case Q.CANARY:
        case Q.DEV:
        case Q.DEVEDITION:
        case Q.BETA:
        case Q.STABLE:
        case Q.ESR:
          throw Error(`${n} is not supported for Chromium. Use 'latest' instead.`);
      }
  }
}
async function Vg(e, t, n) {
  let r = n;
  if (Object.values(Q).includes(r)) return await Bg(e, t, r);
  switch (e) {
    case X.FIREFOX:
      return n;
    case X.CHROME:
      return (await cg(n)) || n;
    case X.CHROMEDRIVER:
      return (await cg(n)) || n;
    case X.CHROMEHEADLESSSHELL:
      return (await cg(n)) || n;
    case X.CHROMIUM:
      return n;
  }
}
async function Hg(e, t) {
  switch (e) {
    case X.FIREFOX:
      return await Ng(t);
    case X.CHROME:
    case X.CHROMIUM:
      throw Error(`Profile creation is not support for ${e} yet`);
  }
}
function Ug(e, t, n) {
  switch (e) {
    case X.CHROMEDRIVER:
    case X.CHROMEHEADLESSSHELL:
    case X.FIREFOX:
    case X.CHROMIUM:
      throw Error(`Default user dir detection is not supported for ${e} yet.`);
    case X.CHROME:
      return hg(t, n);
  }
}
function Wg(e, t, n) {
  switch (e) {
    case X.CHROMEDRIVER:
    case X.CHROMEHEADLESSSHELL:
    case X.FIREFOX:
    case X.CHROMIUM:
      throw Error(`System browser detection is not supported for ${e} yet.`);
    case X.CHROME:
      return mg(t, n);
  }
}
function Gg(e) {
  return zg[e];
}
var Kg = (e) => {
  let t = (0, G.debuglog)(e);
  return t.enabled ? t : void 0;
};
function qg() {
  let e = G.default.platform(),
    t = G.default.arch();
  switch (e) {
    case `darwin`:
      return t === `arm64` ? Z.MAC_ARM : Z.MAC;
    case `linux`:
      return t === `arm64` ? Z.LINUX_ARM : Z.LINUX;
    case `win32`:
      return t === `x64` || (t === `arm64` && Jg(G.default.release())) ? Z.WIN64 : Z.WIN32;
    default:
      return;
  }
}
function Jg(e) {
  let t = e.split(`.`);
  if (t.length > 2) {
    let e = parseInt(t[0], 10),
      n = parseInt(t[1], 10),
      r = parseInt(t[2], 10);
    return e > 10 || (e === 10 && n > 0) || (e === 10 && n === 0 && r >= 22e3);
  }
  return !1;
}
var Yg = Kg(`puppeteer:browsers:cache`),
  Xg = class {
    browser;
    buildId;
    platform;
    executablePath;
    #e;
    constructor(e, t, n, r) {
      ((this.#e = e),
        (this.browser = t),
        (this.buildId = n),
        (this.platform = r),
        (this.executablePath = e.computeExecutablePath({ browser: t, buildId: n, platform: r })));
    }
    get path() {
      return this.#e.installationDir(this.browser, this.platform, this.buildId);
    }
    readMetadata() {
      return this.#e.readMetadata(this.browser);
    }
    writeMetadata(e) {
      this.#e.writeMetadata(this.browser, e);
    }
  },
  Zg = class {
    #e;
    constructor(e) {
      this.#e = e;
    }
    get rootDir() {
      return this.#e;
    }
    browserRoot(e) {
      return G.default.join(this.#e, e);
    }
    metadataFile(e) {
      return G.default.join(this.browserRoot(e), `.metadata`);
    }
    readMetadata(e) {
      let t = this.metadataFile(e);
      if (!G.default.existsSync(t)) return { aliases: {} };
      let n = JSON.parse(G.default.readFileSync(t, `utf8`));
      if (typeof n != `object`) throw Error(`.metadata is not an object`);
      return n;
    }
    writeMetadata(e, t) {
      let n = this.metadataFile(e);
      (G.default.mkdirSync(G.default.dirname(n), { recursive: !0 }),
        G.default.writeFileSync(n, JSON.stringify(t, null, 2)));
    }
    readExecutablePath(e, t, n) {
      let r = this.readMetadata(e),
        i = `${t}-${n}`;
      return r.executablePaths?.[i] ?? null;
    }
    writeExecutablePath(e, t, n, r) {
      let i = this.readMetadata(e);
      i.executablePaths ||= {};
      let a = `${t}-${n}`;
      ((i.executablePaths[a] = r), this.writeMetadata(e, i));
    }
    resolveAlias(e, t) {
      let n = this.readMetadata(e);
      return t === `latest`
        ? Object.values(n.aliases || {})
            .sort(Gg(e))
            .at(-1)
        : n.aliases[t];
    }
    installationDir(e, t, n) {
      return G.default.join(this.browserRoot(e), `${t}-${n}`);
    }
    clear() {
      G.default.rmSync(this.#e, { force: !0, recursive: !0, maxRetries: 10, retryDelay: 500 });
    }
    uninstall(e, t, n) {
      let r = this.readMetadata(e);
      for (let e of Object.keys(r.aliases)) r.aliases[e] === n && delete r.aliases[e];
      let i = `${t}-${n}`;
      (r.executablePaths?.[i] && (delete r.executablePaths[i], this.writeMetadata(e, r)),
        G.default.rmSync(this.installationDir(e, t, n), {
          force: !0,
          recursive: !0,
          maxRetries: 10,
          retryDelay: 500,
        }));
    }
    getInstalledBrowsers() {
      return G.default.existsSync(this.#e)
        ? G.default
            .readdirSync(this.#e)
            .filter((e) => Object.values(X).includes(e))
            .flatMap((e) =>
              G.default
                .readdirSync(this.browserRoot(e))
                .map((t) => {
                  let n = Qg(G.default.join(this.browserRoot(e), t));
                  return n ? new Xg(this, e, n.buildId, n.platform) : null;
                })
                .filter((e) => e !== null)
            )
        : [];
    }
    computeExecutablePath(e) {
      if (((e.platform ??= qg()), !e.platform))
        throw Error(
          `Cannot download a binary for the provided platform: ${G.default.platform()} (${G.default.arch()})`
        );
      try {
        e.buildId = this.resolveAlias(e.browser, e.buildId) ?? e.buildId;
      } catch {
        Yg?.(`could not read .metadata file for the browser`);
      }
      let t = this.installationDir(e.browser, e.platform, e.buildId),
        n = this.readExecutablePath(e.browser, e.platform, e.buildId);
      return n ? G.default.join(t, n) : G.default.join(t, Rg[e.browser](e.platform, e.buildId));
    }
  };
function Qg(e) {
  let t = G.default.basename(e).split(`-`);
  if (t.length !== 2) return;
  let [n, r] = t;
  if (!(!r || !n)) return { platform: n, buildId: r };
}
var $g = Kg(`puppeteer:browsers:launcher`);
function e_(e) {
  if (e.cacheDir === null) {
    if (((e.platform ??= qg()), e.platform === void 0))
      throw Error(`No platform specified. Couldn't auto-detect browser platform.`);
    return Rg[e.browser](e.platform, e.buildId);
  }
  return new Zg(e.cacheDir).computeExecutablePath(e);
}
function t_(e) {
  if (((e.platform ??= qg()), !e.platform))
    throw Error(
      `Cannot download a binary for the provided platform: ${G.default.platform()} (${G.default.arch()})`
    );
  let t = Wg(e.browser, e.platform, e.channel);
  for (let e of t)
    try {
      return ((0, G.accessSync)(e), e);
    } catch {}
  throw Error(
    `Could not find Google Chrome executable for channel '${e.channel}' at:${t.map((e) => `\n - ${e}`)}.`
  );
}
function n_(e) {
  return new l_(e);
}
var r_ = /^DevTools listening on (ws:\/\/.*)$/,
  i_ = /^WebDriver BiDi listening on (ws:\/\/.*)$/,
  a_ = new Map(),
  o_ = {
    exit: (...e) => {
      a_.get(`exit`)?.forEach((t) => t(...e));
    },
    SIGINT: (...e) => {
      a_.get(`SIGINT`)?.forEach((t) => t(...e));
    },
    SIGHUP: (...e) => {
      a_.get(`SIGHUP`)?.forEach((t) => t(...e));
    },
    SIGTERM: (...e) => {
      a_.get(`SIGTERM`)?.forEach((t) => t(...e));
    },
  };
function s_(e, t) {
  let n = a_.get(e) || [];
  (n.length === 0 && process.on(e, o_[e]), n.push(t), a_.set(e, n));
}
function c_(e, t) {
  let n = a_.get(e) || [],
    r = n.indexOf(t);
  r !== -1 && (n.splice(r, 1), a_.set(e, n), n.length === 0 && process.off(e, o_[e]));
}
var l_ = class {
    #e;
    #t;
    #n;
    #r = !1;
    #i = !1;
    #a = async () => {};
    #o;
    #s = [];
    #c = 1e3;
    #l = new G.EventEmitter();
    #u = () => {
      this.kill();
    };
    #d;
    constructor(e) {
      if (
        ((this.#e = e.executablePath),
        (this.#t = e.args ?? []),
        (this.#d = e.signal),
        this.#d?.aborted)
      )
        throw Error(this.#d.reason ? this.#d.reason : `Launch aborted`);
      (this.#d?.addEventListener(`abort`, this.#u, { once: !0 }),
        (e.pipe ??= !1),
        (e.dumpio ??= !1),
        (e.handleSIGINT ??= !0),
        (e.handleSIGTERM ??= !0),
        (e.handleSIGHUP ??= !0),
        (e.detached ??= process.platform !== `win32`));
      let t = this.#p({ pipe: e.pipe }),
        n = e.env || {};
      ($g?.(`Launching ${this.#e} ${this.#t.join(` `)}`, {
        detached: e.detached,
        env: Object.keys(n).reduce(
          (e, t) => (t.toLowerCase().startsWith(`puppeteer_`) && (e[t] = n[t]), e),
          {}
        ),
        stdio: t,
      }),
        (this.#n = G.default.spawn(this.#e, this.#t, { detached: e.detached, env: n, stdio: t })),
        this.#_(this.#n.stderr),
        this.#_(this.#n.stdout),
        $g?.(`Launched ${this.#n.pid}`),
        e.dumpio && (this.#n.stderr?.pipe(process.stderr), this.#n.stdout?.pipe(process.stdout)),
        s_(`exit`, this.#h),
        e.handleSIGINT && s_(`SIGINT`, this.#g),
        e.handleSIGTERM && s_(`SIGTERM`, this.#g),
        e.handleSIGHUP && s_(`SIGHUP`, this.#g),
        e.onExit && (this.#a = e.onExit),
        (this.#o = new Promise((e, t) => {
          this.#n.once(`exit`, async () => {
            ($g?.(`Browser process ${this.#n.pid} onExit`), this.#m(), (this.#r = !0));
            try {
              await this.#f();
            } catch (e) {
              t(e);
              return;
            }
            e();
          });
        })));
    }
    async #f() {
      this.#i || ((this.#i = !0), await this.#a());
    }
    get nodeProcess() {
      return this.#n;
    }
    #p(e) {
      return e.pipe ? [`pipe`, `pipe`, `pipe`, `pipe`, `pipe`] : [`pipe`, `pipe`, `pipe`];
    }
    #m() {
      (c_(`exit`, this.#h),
        c_(`SIGINT`, this.#g),
        c_(`SIGTERM`, this.#g),
        c_(`SIGHUP`, this.#g),
        this.#d?.removeEventListener(`abort`, this.#u));
    }
    #h = (e) => {
      this.kill();
    };
    #g = (e) => {
      switch (e) {
        case `SIGINT`:
          (this.kill(), process.exit(130));
        case `SIGTERM`:
        case `SIGHUP`:
          this.close();
          break;
      }
    };
    async close() {
      return (await this.#f(), this.#r || this.kill(), await this.#o);
    }
    hasClosed() {
      return this.#o;
    }
    kill() {
      if (($g?.(`Trying to kill ${this.#n.pid}`), this.#n && this.#n.pid && d_(this.#n.pid)))
        try {
          if (($g?.(`Browser process ${this.#n.pid} exists`), process.platform === `win32`))
            try {
              G.default.execSync(`taskkill /pid ${this.#n.pid} /T /F`);
            } catch (e) {
              ($g?.(`Killing ${this.#n.pid} using taskkill failed`, e), this.#n.kill());
            }
          else {
            let e = -this.#n.pid;
            try {
              process.kill(e, `SIGKILL`);
            } catch (e) {
              ($g?.(`Killing ${this.#n.pid} using process.kill failed`, e),
                this.#n.kill(`SIGKILL`));
            }
          }
        } catch (e) {
          throw Error(`${u_}\nError cause: ${f_(e) ? e.stack : e}`);
        }
      this.#m();
    }
    #_(e) {
      let t = G.default.createInterface(e),
        n = () => {
          (t.off(`line`, r), t.off(`close`, i));
          try {
            t.close();
          } catch {}
        },
        r = (e) => {
          if (e.trim() === ``) return;
          this.#s.push(e);
          let t = this.#s.length - this.#c;
          (t && this.#s.splice(0, t), this.#l.emit(`line`, e));
        },
        i = () => {
          n();
        };
      (t.on(`line`, r), t.on(`close`, i));
    }
    getRecentLogs() {
      return [...this.#s];
    }
    waitForLineOutput(e, t = 0) {
      return new Promise((n, r) => {
        let i = (e) => {
          (o(),
            r(
              Error(
                [
                  `Failed to launch the browser process: ${e instanceof Error ? ` ${e.message}` : ` Code: ${e}`}`,
                  ``,
                  `stderr:`,
                  this.getRecentLogs().join(`
`),
                  ``,
                  `TROUBLESHOOTING: https://pptr.dev/troubleshooting`,
                  ``,
                ].join(`
`)
              )
            ));
        };
        (this.#n.on(`exit`, i), this.#n.on(`error`, i));
        let a = t > 0 ? setTimeout(s, t) : void 0;
        this.#l.on(`line`, c);
        let o = () => {
          (clearTimeout(a),
            this.#l.off(`line`, c),
            this.#n.off(`exit`, i),
            this.#n.off(`error`, i));
        };
        function s() {
          (o(),
            r(
              new m_(
                `Timed out after ${t} ms while waiting for the WS endpoint URL to appear in stdout!`
              )
            ));
        }
        for (let e of this.#s) c(e);
        function c(t) {
          let r = t.match(e);
          r && (o(), n(r[1]));
        }
      });
    }
  },
  u_ = `Puppeteer was unable to kill the process which ran the browser binary.
This means that, on future Puppeteer launches, Puppeteer might not be able to launch the browser.
Please check your open processes and ensure that the browser processes that Puppeteer launched have been killed.
If you think this is a bug, please report it on the Puppeteer issue tracker.`;
function d_(e) {
  try {
    return process.kill(e, 0);
  } catch (e) {
    if (p_(e) && e.code && e.code === `ESRCH`) return !1;
    throw e;
  }
}
function f_(e) {
  return typeof e == `object` && !!e && `name` in e && `message` in e;
}
function p_(e) {
  return f_(e) && (`errno` in e || `code` in e || `path` in e || `syscall` in e);
}
var m_ = class extends Error {
  constructor(e) {
    (super(e),
      (this.name = this.constructor.name),
      Error.captureStackTrace(this, this.constructor));
  }
};
((0, G.promisify)(G.execFile), Kg(`puppeteer:browsers:fileUtil`), Kg(`puppeteer:browsers:install`));
async function h_(e) {
  if (((e.platform ??= qg()), !e.platform))
    throw Error(
      `Cannot detect the browser platform for: ${G.default.platform()} (${G.default.arch()})`
    );
  new Zg(e.cacheDir).uninstall(e.browser, e.platform, e.buildId);
}
async function g_(e) {
  return new Zg(e.cacheDir).getInstalledBrowsers();
}
var __ = e({
    Browser: () => X,
    detectBrowserPlatform: () => qg,
    resolveDefaultUserDataDir: () => Ug,
  }),
  v_ = n((e, t) => {
    t.exports = function () {
      throw Error(
        `ws does not work in the browser. Browser clients must use the native WebSocket object`
      );
    };
  }),
  y_ = e({ NodeWebSocketTransport: () => x_ }),
  b_ = t(v_(), 1),
  x_ = class e {
    static create(t, n) {
      return new Promise((r, i) => {
        let a = new b_.default(t, [], {
          followRedirects: !0,
          perMessageDeflate: !1,
          allowSynchronousEvents: !1,
          maxPayload: 256 * 1024 * 1024,
          headers: { 'User-Agent': `Puppeteer ${Rl}`, ...n },
        });
        (a.addEventListener(`open`, () => r(new e(a))), a.addEventListener(`error`, i));
      });
    }
    #e;
    onmessage;
    onclose;
    constructor(e) {
      ((this.#e = e),
        this.#e.addEventListener(`message`, (e) => {
          this.onmessage && this.onmessage.call(null, e.data);
        }),
        this.#e.addEventListener(`close`, () => {
          this.onclose && this.onclose.call(null);
        }),
        this.#e.addEventListener(`error`, q));
    }
    send(e) {
      this.#e.send(e);
    }
    close() {
      this.#e.close();
    }
  },
  S_ = class {
    #e;
    #t = new Ol();
    #n = !1;
    #r = [];
    onclose;
    onmessage;
    constructor(e, t) {
      this.#e = e;
      let n = this.#t.use(new Cu(t));
      (n.on(`data`, (e) => this.#i(e)),
        n.on(`close`, () => {
          this.onclose && this.onclose.call(null);
        }),
        n.on(`error`, q),
        this.#t.use(new Cu(e)).on(`error`, q));
    }
    send(e) {
      (K(!this.#n, '`PipeTransport` is closed.'), this.#e.write(e), this.#e.write(`\0`));
    }
    #i(e) {
      if ((K(!this.#n, '`PipeTransport` is closed.'), this.#r.push(e), e.indexOf(`\0`) === -1))
        return;
      let t = Buffer.concat(this.#r),
        n = 0,
        r = t.indexOf(`\0`);
      for (; r !== -1; ) {
        let e = t.toString(void 0, n, r);
        (setImmediate(() => {
          this.onmessage && this.onmessage.call(null, e);
        }),
          (n = r + 1),
          (r = t.indexOf(`\0`, n)));
      }
      n >= t.length ? (this.#r = []) : (this.#r = [t.subarray(n)]);
    }
    close() {
      ((this.#n = !0), this.#t.dispose());
    }
  },
  C_ = class {
    #e;
    puppeteer;
    constructor(e, t) {
      ((this.puppeteer = e), (this.#e = t));
    }
    get browser() {
      return this.#e;
    }
    async launch(e = {}) {
      let {
          dumpio: t = !1,
          enableExtensions: n = !1,
          env: r = {},
          handleSIGINT: i = !0,
          handleSIGTERM: a = !0,
          handleSIGHUP: o = !0,
          acceptInsecureCerts: s = !1,
          networkEnabled: c = !0,
          issuesEnabled: l = !0,
          defaultViewport: u = Ql,
          downloadBehavior: d,
          slowMo: f = 0,
          timeout: p = 3e4,
          waitForInitialPage: m = !0,
          protocolTimeout: h,
          handleDevToolsAsPage: g,
          idGenerator: _ = bf(),
          blocklist: v,
          allowlist: y,
        } = e,
        { protocol: b } = e;
      if (
        (this.#e === `firefox` && b === void 0 && (b = `webDriverBiDi`),
        qh({ allowlist: y, blocklist: v, protocol: b }),
        this.#e === `firefox` && b === `cdp`)
      )
        throw Error(`Connecting to Firefox using CDP is no longer supported`);
      let x = await this.computeLaunchArguments({ ...e, protocol: b });
      if (!(0, G.existsSync)(x.executablePath))
        throw Error(`Browser was not found at the configured executablePath (${x.executablePath})`);
      let S = x.args.includes(`--remote-debugging-pipe`),
        C = async () => {
          await this.cleanUserDataDir(x.userDataDir, { isTemp: x.isTempUserDataDir });
        };
      if (this.#e === `firefox` && b === `webDriverBiDi` && S)
        throw Error(`Pipe connections are not supported with Firefox and WebDriver BiDi`);
      let w = n_({
          executablePath: x.executablePath,
          args: x.args,
          handleSIGHUP: o,
          handleSIGTERM: a,
          handleSIGINT: i,
          dumpio: t,
          env: r,
          pipe: S,
          onExit: C,
          signal: e.signal,
        }),
        T,
        E,
        D = !1,
        O = async () => {
          D || ((D = !0), await this.closeBrowser(w, E));
        };
      try {
        this.#e === `firefox`
          ? (T = await this.createBiDiBrowser(w, O, {
              timeout: p,
              protocolTimeout: h,
              slowMo: f,
              defaultViewport: u,
              acceptInsecureCerts: s,
              networkEnabled: c,
              idGenerator: _,
            }))
          : ((E = S
              ? await this.createCdpPipeConnection(w, {
                  timeout: p,
                  protocolTimeout: h,
                  slowMo: f,
                  idGenerator: _,
                })
              : await this.createCdpSocketConnection(w, {
                  timeout: p,
                  protocolTimeout: h,
                  slowMo: f,
                  idGenerator: _,
                })),
            (T =
              b === `webDriverBiDi`
                ? await this.createBiDiOverCdpBrowser(w, E, O, {
                    defaultViewport: u,
                    acceptInsecureCerts: s,
                    networkEnabled: c,
                    issuesEnabled: l,
                  })
                : await Rh._create(
                    E,
                    [],
                    s,
                    u,
                    d,
                    w.nodeProcess,
                    O,
                    e.targetFilter,
                    void 0,
                    void 0,
                    c,
                    l,
                    g,
                    v,
                    y
                  )));
      } catch (t) {
        O();
        let n = w.getRecentLogs().join(`
`);
        throw n.includes(`Failed to create a ProcessSingleton for your profile directory`) ||
          (process.platform === `win32` &&
            (0, G.existsSync)((0, G.join)(x.userDataDir, `lockfile`)))
          ? Error(
              `The browser is already running for ${x.userDataDir}. Use a different \`userDataDir\` or stop the running browser first.`
            )
          : n.includes(`Missing X server`) && e.headless === !1
            ? Error(
                `Missing X server to start the headful browser. Either set headless to true or use xvfb-run to run your Puppeteer script.`
              )
            : t instanceof m_
              ? new Gl(t.message)
              : t;
      }
      if (Array.isArray(n)) {
        if (this.#e === `chrome` && !S)
          throw Error(
            'To use `enableExtensions` with a list of paths in Chrome, you must be connected with `--remote-debugging-pipe` (`pipe: true`).'
          );
        await Promise.all([n.map((e) => T.installExtension(e))]);
      }
      return (m && (await this.waitForPageTarget(T, p)), T);
    }
    async closeBrowser(e, t) {
      if (t)
        try {
          (await t.closeBrowser(), await e.hasClosed());
        } catch (t) {
          (q(t), await e.close());
        }
      else await bc(nl(gc(e.hasClosed()), Xc(5e3).pipe(Sc(() => gc(e.close())))));
    }
    async waitForPageTarget(e, t) {
      try {
        await e.waitForTarget((e) => e.type() === `page`, { timeout: t });
      } catch (t) {
        throw (await e.close(), t);
      }
    }
    async createCdpSocketConnection(e, t) {
      let n = await e.waitForLineOutput(r_, t.timeout);
      return new ip(n, await x_.create(n), t.slowMo, t.protocolTimeout, !1, t.idGenerator);
    }
    async createCdpPipeConnection(e, t) {
      let { 3: n, 4: r } = e.nodeProcess.stdio;
      return new ip(``, new S_(n, r), t.slowMo, t.protocolTimeout, !1, t.idGenerator);
    }
    async createBiDiOverCdpBrowser(e, t, n, r) {
      let a = {}.PUPPETEER_WEBDRIVER_BIDI_ONLY === `true`,
        o = await i(() => import(`./bidi-C37lr4Tc.js`), __vite__mapDeps([2, 0, 1])),
        s = await o.connectBidiOverCdp(t);
      return await o.BidiBrowser.create({
        connection: s,
        cdpConnection: a ? void 0 : t,
        closeCallback: n,
        process: e.nodeProcess,
        defaultViewport: r.defaultViewport,
        acceptInsecureCerts: r.acceptInsecureCerts,
        networkEnabled: r.networkEnabled,
        issuesEnabled: r.issuesEnabled,
      });
    }
    async createBiDiBrowser(e, t, n) {
      let r = (await e.waitForLineOutput(i_, n.timeout)) + `/session`,
        a = await x_.create(r),
        o = await i(() => import(`./bidi-C37lr4Tc.js`), __vite__mapDeps([2, 0, 1])),
        s = new o.BidiConnection(r, a, n.idGenerator, n.slowMo, n.protocolTimeout);
      return await o.BidiBrowser.create({
        connection: s,
        closeCallback: t,
        process: e.nodeProcess,
        defaultViewport: n.defaultViewport,
        acceptInsecureCerts: n.acceptInsecureCerts,
        networkEnabled: n.networkEnabled ?? !0,
        issuesEnabled: n.issuesEnabled ?? !0,
      });
    }
    async getProfilePath() {
      return (0, G.join)(
        (await this.puppeteer.configuration()).temporaryDirectory ?? (0, G.tmpdir)(),
        `puppeteer_dev_${this.browser}_profile-`
      );
    }
    async resolveExecutablePath(e, t = !0) {
      let n = await this.puppeteer.configuration(),
        r = n.executablePath;
      if (r) {
        if (t && !(0, G.existsSync)(r))
          throw Error(
            `Tried to find the browser at the configured path (${r}), but no executable was found.`
          );
        return r;
      }
      function i(e, t) {
        switch (e) {
          case `chrome`:
            return t === `shell` ? X.CHROMEHEADLESSSHELL : X.CHROME;
          case `firefox`:
            return X.FIREFOX;
        }
        return X.CHROME;
      }
      let a = i(this.browser, e),
        o = await this.puppeteer.defaultDownloadPath(),
        s = await this.puppeteer.browserVersion();
      if (((r = e_({ cacheDir: o, browser: a, buildId: s })), t && !(0, G.existsSync)(r))) {
        let e = n?.[this.browser]?.version;
        if (e)
          throw Error(
            `Tried to find the browser at the configured path (${r}) for version ${e}, but no executable was found.`
          );
        switch (this.browser) {
          case `chrome`:
            throw Error(
              `Could not find Chrome (ver. ${s}). This can occur if either\n 1. you did not perform an installation before running the script (e.g. \`npx puppeteer browsers install ${a}\`) or\n 2. your cache path is incorrectly configured (which is: ${n.cacheDirectory}).\nFor (2), check out our guide on configuring puppeteer at https://pptr.dev/guides/configuration.`
            );
          case `firefox`:
            throw Error(`Could not find Firefox (rev. ${s}). This can occur if either\n 1. you did not perform an installation for Firefox before running the script (e.g. \`npx puppeteer browsers install firefox\`) or
 2. your cache path is incorrectly configured (which is: ${n.cacheDirectory}).\nFor (2), check out our guide on configuring puppeteer at https://pptr.dev/guides/configuration.`);
        }
      }
      return r;
    }
  },
  w_ = e({ convertPuppeteerChannelToBrowsersChannel: () => T_ });
function T_(e) {
  switch (e) {
    case `chrome`:
      return $.STABLE;
    case `chrome-dev`:
      return $.DEV;
    case `chrome-beta`:
      return $.BETA;
    case `chrome-canary`:
      return $.CANARY;
  }
}
var E_ = { force: !0, recursive: !0, maxRetries: 5 };
async function D_(e) {
  await G.default.promises.rm(e, E_);
}
var O_ = class extends C_ {
  constructor(e) {
    super(e, `chrome`);
  }
  async launch(e = {}) {
    return (
      (await this.puppeteer.configuration()).logLevel === `warn` &&
        process.platform === `darwin` &&
        process.arch === `x64` &&
        G.default.cpus()[0]?.model.includes(`Apple`) &&
        console.warn(
          [
            `\x1B[1m\x1B[43m\x1B[30m`,
            `Degraded performance warning:\x1B[0m\x1B[33m`,
            `Launching Chrome on Mac Silicon (arm64) from an x64 Node installation results in`,
            `Rosetta translating the Chrome binary, even if Chrome is already arm64. This would`,
            `result in huge performance issues. To resolve this, you must run Puppeteer with`,
            `a version of Node built for arm64.`,
          ].join(`
  `)
        ),
      await super.launch(e)
    );
  }
  async computeLaunchArguments(e = {}) {
    let {
        ignoreDefaultArgs: t = !1,
        args: n = [],
        pipe: r = !1,
        debuggingPort: i,
        channel: a,
        executablePath: o,
      } = e,
      s = [];
    (t
      ? Array.isArray(t)
        ? s.push(...this.defaultArgs(e).filter((e) => !t.includes(e)))
        : s.push(...n)
      : s.push(...this.defaultArgs(e)),
      s.some((e) => e.startsWith(`--remote-debugging-`)) ||
        (r
          ? (K(!i, `Browser should be launched with either pipe or debugging port - not both.`),
            s.push(`--remote-debugging-pipe`))
          : s.push(`--remote-debugging-port=${i || 0}`)));
    let c = !1,
      l = s.findIndex((e) => e.startsWith(`--user-data-dir`));
    l < 0 &&
      ((c = !0),
      s.push(`--user-data-dir=${await (0, G.mkdtemp)(await this.getProfilePath())}`),
      (l = s.length - 1));
    let u = s[l].split(`=`, 2)[1];
    K(typeof u == `string`, '`--user-data-dir` is malformed');
    let d = o;
    return (
      (d ||=
        (K(
          a || !this.puppeteer._isPuppeteerCore,
          'An `executablePath` or `channel` must be specified for `puppeteer-core`'
        ),
        a ? await this.executablePath(a) : await this.resolveExecutablePath(e.headless ?? !0))),
      { executablePath: d, args: s, isTempUserDataDir: c, userDataDir: u }
    );
  }
  async cleanUserDataDir(e, t) {
    if (t.isTemp)
      try {
        await D_(e);
      } catch (e) {
        throw (q(e), e);
      }
  }
  defaultArgs(e = {}) {
    let t = k_(`--disable-features`, e.args);
    e.args && t.length > 0 && A_(e.args, `--disable-features`);
    let n = {}.PUPPETEER_TEST_EXPERIMENTAL_CHROME_FEATURES === `true`,
      r = k_(`--enable-features`, e.args);
    e.args && r.length > 0 && A_(e.args, `--enable-features`);
    let i = [`PdfOopif`, ...r].filter((e) => e !== ``),
      a = [
        `--allow-pre-commit-input`,
        `--disable-background-networking`,
        `--disable-background-timer-throttling`,
        `--disable-backgrounding-occluded-windows`,
        `--disable-breakpad`,
        `--disable-client-side-phishing-detection`,
        `--disable-component-extensions-with-background-pages`,
        `--disable-crash-reporter`,
        `--disable-default-apps`,
        `--disable-dev-shm-usage`,
        `--disable-hang-monitor`,
        `--disable-infobars`,
        `--disable-ipc-flooding-protection`,
        `--disable-popup-blocking`,
        `--disable-prompt-on-repost`,
        `--disable-renderer-backgrounding`,
        `--disable-search-engine-choice-screen`,
        `--disable-sync`,
        `--enable-automation`,
        `--export-tagged-pdf`,
        `--force-color-profile=srgb`,
        `--generate-pdf-document-outline`,
        `--metrics-recording-only`,
        `--no-first-run`,
        `--password-store=basic`,
        `--use-mock-keychain`,
        `--disable-features=${[
          `Translate`,
          `AcceptCHFrame`,
          `MediaRouter`,
          `OptimizationHints`,
          `WebUIReloadButton`,
          ...(n ? [] : [`ProcessPerSiteUpToMainFrameThreshold`, `IsolateSandboxedIframes`]),
          ...t,
        ]
          .filter((e) => e !== ``)
          .filter((e) => !i.includes(e))
          .join(`,`)}`,
        `--enable-features=${i.join(`,`)}`,
      ].filter((e) => e !== ``),
      {
        devtools: o = !1,
        headless: s = !o,
        args: c = [],
        userDataDir: l,
        enableExtensions: u = !1,
      } = e;
    return (
      {}.PUPPETEER_DANGEROUS_NO_SANDBOX === `true` &&
        !c.includes(`--no-sandbox`) &&
        a.push(`--no-sandbox`),
      l &&
        a.push(
          `--user-data-dir=${G.default.posix.isAbsolute(l) || G.default.win32.isAbsolute(l) ? l : G.default.resolve(l)}`
        ),
      o && a.push(`--auto-open-devtools-for-tabs`),
      s &&
        a.push(
          s === `shell` ? `--headless` : `--headless=new`,
          `--hide-scrollbars`,
          `--mute-audio`
        ),
      a.push(u ? `--enable-unsafe-extension-debugging` : `--disable-extensions`),
      c.every((e) => e.startsWith(`-`)) && a.push(`about:blank`),
      a.push(...c),
      a
    );
  }
  async executablePath(e, t = !0) {
    return e
      ? t_({ browser: X.CHROME, channel: T_(e) })
      : await this.resolveExecutablePath(void 0, t);
  }
};
function k_(e, t = []) {
  let n = e.endsWith(`=`) ? e : `${e}=`;
  return t
    .filter((e) => e.startsWith(n))
    .flatMap((e) =>
      e
        .substring(e.indexOf(`=`) + 1)
        .trim()
        .split(`,`)
        .map((e) => e.trim())
    )
    .filter((e) => e);
}
function A_(e, t) {
  let n = t.endsWith(`=`) ? t : `${t}=`,
    r = 0;
  for (; r < e.length; ) e[r].startsWith(n) ? e.splice(r, 1) : r++;
  return e;
}
var j_ = class e extends C_ {
    constructor(e) {
      super(e, `firefox`);
    }
    static getPreferences(e) {
      return { ...e, 'fission.webContentIsolationStrategy': 0 };
    }
    async computeLaunchArguments(t = {}) {
      let {
          ignoreDefaultArgs: n = !1,
          args: r = [],
          executablePath: i,
          pipe: a = !1,
          extraPrefsFirefox: o = {},
          debuggingPort: s = null,
        } = t,
        c = [];
      (n
        ? Array.isArray(n)
          ? c.push(...this.defaultArgs(t).filter((e) => !n.includes(e)))
          : c.push(...r)
        : c.push(...this.defaultArgs(t)),
        c.some((e) => e.startsWith(`--remote-debugging-`)) ||
          (a &&
            K(
              s === null,
              `Browser should be launched with either pipe or debugging port - not both.`
            ),
          c.push(`--remote-debugging-port=${s || 0}`)));
      let l,
        u = !0,
        d = c.findIndex((e) => [`-profile`, `--profile`].includes(e));
      if (d !== -1) {
        if (((l = c[d + 1]), !l)) throw Error(`Missing value for profile command line argument`);
        u = !1;
      } else
        ((l = await (0, G.mkdtemp)(await this.getProfilePath())), c.push(`--profile`), c.push(l));
      await Hg(X.FIREFOX, { path: l, preferences: e.getPreferences(o) });
      let f;
      return (
        this.puppeteer._isPuppeteerCore || i
          ? (K(i, 'An `executablePath` must be specified for `puppeteer-core`'), (f = i))
          : (f = await this.executablePath(void 0)),
        { isTempUserDataDir: u, userDataDir: l, args: c, executablePath: f }
      );
    }
    async cleanUserDataDir(e, t) {
      if (t.isTemp)
        try {
          await D_(e);
        } catch (e) {
          throw (q(e), e);
        }
      else
        try {
          let t = await Promise.allSettled(
            [`prefs.js`, `user.js`].map(async (t) => {
              let n = G.default.join(e, t + `.puppeteer`);
              if (G.default.existsSync(n)) {
                let r = G.default.join(e, t);
                (await (0, G.unlink)(r), await (0, G.rename)(n, r));
              }
            })
          );
          for (let e of t) if (e.status === `rejected`) throw e.reason;
        } catch (e) {
          q(e);
        }
    }
    async executablePath(e, t = !0) {
      return await this.resolveExecutablePath(void 0, t);
    }
    defaultArgs(e = {}) {
      let { devtools: t = !1, headless: n = !t, args: r = [], userDataDir: i = null } = e,
        a = [];
      switch (G.default.platform()) {
        case `darwin`:
          a.push(`--foreground`);
          break;
        case `win32`:
          a.push(`--wait-for-browser`);
          break;
      }
      return (
        i && (a.push(`--profile`), a.push(i)),
        n && a.push(`--headless`),
        t && a.push(`--devtools`),
        r.every((e) => e.startsWith(`-`)) && a.push(`about:blank`),
        a.push(...r),
        a
      );
    }
  },
  M_ = class extends Zh {
    #e;
    #t;
    configuration;
    constructor(e) {
      let { configuration: t, ...n } = e;
      (super(n),
        t ? (this.configuration = t) : (this.configuration = () => Promise.resolve({})),
        (this.connect = this.connect.bind(this)),
        (this.launch = this.launch.bind(this)),
        (this.executablePath = this.executablePath.bind(this)),
        (this.defaultArgs = this.defaultArgs.bind(this)),
        (this.trimCache = this.trimCache.bind(this)));
    }
    connect(e) {
      return super.connect(e);
    }
    async launch(e = {}) {
      let { browser: t = await this.defaultBrowser() } = e;
      if (((this.#t = t), ![`chrome`, `firefox`].includes(t))) throw Error(`Unknown product: ${t}`);
      return ((this.#e = this.#n(t)), await this.#e.launch(e));
    }
    #n(e) {
      if (this.#e && this.#e.browser === e) return this.#e;
      switch (e) {
        case `chrome`:
          return new O_(this);
        case `firefox`:
          return new j_(this);
        default:
          throw Error(`Unknown product: ${e}`);
      }
    }
    async executablePath(e) {
      return e === void 0
        ? await this.#n(await this.lastLaunchedBrowser()).executablePath(void 0, !1)
        : typeof e == `string`
          ? await this.#n(`chrome`).executablePath(e, !1)
          : await this.#n(e.browser ?? (await this.lastLaunchedBrowser())).resolveExecutablePath(
              e.headless,
              !1
            );
    }
    async browserVersion() {
      let e = await this.configuration(),
        t = await this.lastLaunchedBrowser();
      return e?.[t]?.version ?? Qh[t];
    }
    async defaultDownloadPath() {
      return (await this.configuration()).cacheDirectory;
    }
    async lastLaunchedBrowser() {
      return this.#t ?? (await this.defaultBrowser());
    }
    async defaultBrowser() {
      return (await this.configuration()).defaultBrowser ?? `chrome`;
    }
    async defaultArgs(e = {}) {
      return this.#n(e.browser ?? (await this.lastLaunchedBrowser())).defaultArgs(e);
    }
    async trimCache() {
      let e = qg();
      if (!e) throw Error(`The current platform is not supported.`);
      let t = await this.configuration(),
        n = t.cacheDirectory,
        r = await g_({ cacheDir: n }),
        i = [
          { product: `chrome`, browser: X.CHROME, currentBuildId: `` },
          { product: `firefox`, browser: X.FIREFOX, currentBuildId: `` },
        ];
      await Promise.all(
        i.map(async (n) => {
          let r = t?.[n.product]?.version ?? Qh[n.product];
          n.currentBuildId = await Vg(n.browser, e, r);
        })
      );
      let a = new Set(i.map((e) => `${e.browser}_${e.currentBuildId}`)),
        o = new Set(i.map((e) => e.browser));
      for (let t of r)
        o.has(t.browser) &&
          (a.has(`${t.browser}_${t.buildId}`) ||
            (await h_({ browser: t.browser, platform: e, cacheDir: n, buildId: t.buildId })));
    }
  },
  N_ = function (e, t, n) {
    for (var r = arguments.length > 2, i = 0; i < t.length; i++)
      n = r ? t[i].call(e, n) : t[i].call(e);
    return r ? n : void 0;
  },
  P_ = function (e, t, n, r, i, a) {
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
  F_ = function (e, t, n) {
    return (
      typeof t == `symbol` && (t = t.description ? `[${t.description}]` : ``),
      Object.defineProperty(e, 'name', { configurable: !0, value: n ? `${n} ${t}` : t })
    );
  },
  I_ = 30,
  L_ = 30,
  R_ = Vl(`puppeteer:ffmpeg`),
  z_ = (() => {
    let e = G.PassThrough,
      t = [],
      n,
      r,
      i;
    return class extends e {
      static {
        let a =
          typeof Symbol == `function` && Symbol.metadata
            ? Object.create(e[Symbol.metadata] ?? null)
            : void 0;
        (P_(
          this,
          (r = {
            value: F_(async function (e) {
              let t = await new Promise((t) => {
                this.#t.stdin.write(e, t);
              });
              t && console.log(`ffmpeg failed to write: ${t.message}.`);
            }, `#writeFrame`),
          }),
          n,
          {
            kind: `method`,
            name: `#writeFrame`,
            static: !1,
            private: !0,
            access: { has: (e) => #o in e, get: (e) => e.#o },
            metadata: a,
          },
          null,
          t
        ),
          P_(
            this,
            null,
            i,
            {
              kind: `method`,
              name: `stop`,
              static: !1,
              private: !1,
              access: { has: (e) => `stop` in e, get: (e) => e.stop },
              metadata: a,
            },
            null,
            t
          ),
          a &&
            Object.defineProperty(this, Symbol.metadata, {
              enumerable: !0,
              configurable: !0,
              writable: !0,
              value: a,
            }));
      }
      #e = N_(this, t);
      #t;
      #n = new AbortController();
      #r;
      #i;
      constructor(
        e,
        t,
        n,
        {
          ffmpegPath: r,
          speed: i,
          scale: a,
          crop: o,
          format: s,
          fps: c,
          loop: l,
          delay: u,
          quality: d,
          colors: f,
          path: p,
          overwrite: m,
        } = {}
      ) {
        (super({ allowHalfOpen: !1 }),
          (r ??= `ffmpeg`),
          (s ??= `webm`),
          (c ??= L_),
          (l ||= -1),
          (u ??= -1),
          (d ??= I_),
          (f ??= 256),
          (m ??= !0),
          (this.#i = c));
        let { error: h } = (0, G.spawnSync)(r);
        if (h) throw h;
        let g = [`crop='min(${t},iw):min(${n},ih):0:0'`, `pad=${t}:${n}:0:0`];
        (i && g.push(`setpts=${1 / i}*PTS`),
          o && g.push(`crop=${o.width}:${o.height}:${o.x}:${o.y}`),
          a && g.push(`scale=iw*${a}:-1:flags=lanczos`));
        let _ = this.#a(s, c, l, u, d, f),
          v = _.indexOf(`-vf`);
        (v !== -1 && g.push(_.splice(v, 2).at(-1) ?? ``),
          p && G.default.mkdirSync((0, G.dirname)(p), { recursive: m }),
          (this.#t = (0, G.spawn)(
            r,
            [
              [`-loglevel`, `error`],
              [`-avioflags`, `direct`],
              [
                `-fpsprobesize`,
                `0`,
                `-probesize`,
                `32`,
                `-analyzeduration`,
                `0`,
                `-fflags`,
                `nobuffer`,
              ],
              [`-f`, `image2pipe`, `-vcodec`, `png`, `-i`, `pipe:0`],
              [`-an`],
              [`-threads`, `1`],
              [`-framerate`, `${c}`],
              [`-b:v`, `0`],
              _,
              [`-vf`, g.join()],
              [m ? `-y` : `-n`],
              `pipe:1`,
            ].flat(),
            { stdio: [`pipe`, `pipe`, `pipe`] }
          )),
          this.#t.stdout.pipe(this),
          this.#t.stderr.on(`data`, (e) => {
            R_(e.toString(`utf8`));
          }),
          (this.#e = e));
        let { client: y } = this.#e.mainFrame();
        (y.once(Au.Disconnected, () => {
          this.stop().catch(q);
        }),
          (this.#r = yc(
            bu(y, `Page.screencastFrame`).pipe(
              Cl((e) => {
                y.send(`Page.screencastFrameAck`, { sessionId: e.sessionId });
              }),
              tl((e) => e.metadata.timestamp !== void 0),
              Sc((e) => ({
                buffer: Buffer.from(e.data, `base64`),
                timestamp: e.metadata.timestamp,
              })),
              il(2, 1),
              ol(([{ timestamp: e, buffer: t }, { timestamp: n }]) =>
                gc(Array(Math.round(c * Math.max(n - e, 0))).fill(t))
              ),
              Sc((e) => (this.#o(e), [e, performance.now()])),
              Sl(Gc(this.#n.signal, `abort`))
            ),
            { defaultValue: [Buffer.from([]), performance.now()] }
          )));
      }
      #a(e, t, n, r, i, a) {
        let o = [
          [`-vcodec`, `vp9`],
          [`-crf`, `${i}`],
          [`-deadline`, `realtime`, `-cpu-used`, `${Math.min(G.default.cpus().length / 2, 8)}`],
        ];
        switch (e) {
          case `webm`:
            return [...o, [`-f`, `webm`]].flat();
          case `gif`:
            return (
              (t = L_ === t ? 20 : `source_fps`),
              n === 1 / 0 && (n = 0),
              r !== -1 && (r /= 10),
              [
                [
                  `-vf`,
                  `fps=${t},split[s0][s1];[s0]palettegen=stats_mode=diff:max_colors=${a}[p];[s1][p]paletteuse=dither=bayer`,
                ],
                [`-loop`, `${n}`],
                [`-final_delay`, `${r}`],
                [`-f`, `gif`],
              ].flat()
            );
          case `mp4`:
            return [...o, [`-movflags`, `hybrid_fragmented`], [`-f`, `mp4`]].flat();
        }
      }
      get #o() {
        return r.value;
      }
      async stop() {
        if (this.#n.signal.aborted) return;
        (await this.#e._stopScreencast().catch(q), this.#n.abort());
        let [e, t] = await this.#r;
        (await Promise.all(
          Array(Math.max(1, Math.round((this.#i * (performance.now() - t)) / 1e3)))
            .fill(e)
            .map(this.#o.bind(this))
        ),
          this.#t.stdin.end(),
          await new Promise((e) => {
            this.#t.once(`close`, e);
          }));
      }
      async [((n = [Ad()]), (i = [Ad()]), El)]() {
        (await this.stop(), await super[El]());
      }
    };
  })();
Nl.value = { fs: G.default, path: G.default, ScreenRecorder: z_ };
var B_ = new M_({ isPuppeteerCore: !0 }),
  { connect: V_, defaultArgs: H_, executablePath: U_, launch: W_ } = B_;
(class e {
  static {
    this.DEFAULT_WIDTH = 256;
  }
  static {
    this.DEFAULT_HEIGHT = 256;
  }
  constructor(e) {
    ((this._browser = null),
      (this._isDisposed = !1),
      (this._config = e),
      (this._thumbnailDir = (0, G.join)(e.workspacePath, `.animoria`, `thumbnails`)));
  }
  async generateBatch(e, t) {
    let n = G.performance.now(),
      r = this._config.concurrency ?? 4;
    if (t?.aborted || this._isDisposed)
      throw Error(`Thumbnail generation aborted before starting.`);
    let i = e.filter((e) => e.status === `parsed`);
    await (0, G.mkdir)(this._thumbnailDir, { recursive: !0 });
    let a = [],
      o = [];
    for (let e of i) (await G_(this._thumbnailPath(e))) ? a.push(e) : o.push(e);
    let s = [],
      c = () => {
        this.dispose().catch(() => {});
      };
    t && t.addEventListener(`abort`, c);
    try {
      if (o.length > 0 && !this._isDisposed) {
        this._browser = await B_.launch({
          executablePath: this._config.chromiumPath,
          headless: !0,
          handleSIGINT: !0,
          handleSIGTERM: !0,
          handleSIGHUP: !0,
          args: [`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-web-security`],
        });
        for (let e = 0; e < o.length && !(t?.aborted || this._isDisposed); e += r) {
          let t = o.slice(e, e + r),
            n = await Promise.allSettled(t.map((e) => this._generateOne(e)));
          for (let t of n)
            t.status === `fulfilled`
              ? s.push(t.value)
              : s.push({
                  asset: o[e],
                  thumbnailPath: null,
                  fromCache: !1,
                  error: String(t.reason),
                });
        }
      }
    } finally {
      (t && t.removeEventListener(`abort`, c), await this.dispose());
    }
    let l = a.map((e) => ({ asset: e, thumbnailPath: this._thumbnailPath(e), fromCache: !0 })),
      u = [...l, ...s],
      d = s.filter((e) => e.thumbnailPath !== null).length,
      f = s.filter((e) => e.thumbnailPath === null).length;
    return {
      results: u,
      generated: d,
      fromCache: l.length,
      failed: f,
      durationMs: G.performance.now() - n,
    };
  }
  _thumbnailPath(e) {
    let t = (0, G.createHash)(`md5`).update(e.path).digest(`hex`).slice(0, 8);
    return (0, G.join)(this._thumbnailDir, e.stem + `-` + t + `.png`);
  }
  async _generateOne(t) {
    let n = this._thumbnailPath(t);
    if (await G_(n)) return { asset: t, thumbnailPath: n, fromCache: !0 };
    if (t.format === `gif` || t.format === `apng`)
      try {
        return (
          await (0, G.writeFile)(n, await (0, G.readFile)(t.path)),
          { asset: t, thumbnailPath: n, fromCache: !1 }
        );
      } catch (e) {
        return {
          asset: t,
          thumbnailPath: null,
          fromCache: !1,
          error: `Failed to copy raster file: ${e}`,
        };
      }
    if (this._isDisposed || !this._browser)
      return {
        asset: t,
        thumbnailPath: null,
        fromCache: !1,
        error: `Thumbnail generator has been disposed`,
      };
    let r = this._config.width ?? e.DEFAULT_WIDTH,
      i = this._config.height ?? e.DEFAULT_HEIGHT;
    try {
      let e = await this._browser.newPage();
      try {
        await e.setViewport({ width: r, height: i });
        let a = ``;
        return (
          (a =
            t.format === `rive`
              ? this._getRiveHtml(t)
              : t.format === `animated-svg`
                ? this._getSvgHtml(t)
                : this._getLottieHtml(t)),
          await e.setContent(a, { waitUntil: `domcontentloaded` }),
          await e.waitForSelector(`#ready`, { timeout: 5e3 }),
          await (0, G.writeFile)(
            n,
            await e.screenshot({ type: `png`, clip: { x: 0, y: 0, width: r, height: i } })
          ),
          { asset: t, thumbnailPath: n, fromCache: !1 }
        );
      } finally {
        await e.close();
      }
    } catch (e) {
      return {
        asset: t,
        thumbnailPath: null,
        fromCache: !1,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  _getSvgHtml(e) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
    svg { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  ${(0, G.readFileSync)(e.path, `utf-8`)}
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const ready = document.createElement('div');
        ready.id = 'ready';
        document.body.appendChild(ready);
      }, 200);
    });
  <\/script>
</body>
</html>`;
  }
  _getRiveHtml(e) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    canvas { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script src="https://unpkg.com/@rive-app/canvas@2.7.0" integrity="sha384-/eeUnIO+LtJFuHxtEY5yYVsmKsTCTjuvu2z8iuhGBPdGjwNjS9K7AItr+MyUr+Zh" crossorigin="anonymous"><\/script>
  <script>
    const base64Data = "${(0, G.readFileSync)(e.path).toString(`base64`)}";
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    rive.Rive.load({
      buffer: bytes.buffer,
      canvas: document.getElementById('canvas'),
      autoplay: true,
      onLoad: () => {
        setTimeout(() => {
          const ready = document.createElement('div');
          ready.id = 'ready';
          document.body.appendChild(ready);
        }, 500);
      },
      onLoadError: () => {
        const ready = document.createElement('div');
        ready.id = 'ready';
        document.body.appendChild(ready);
      }
    });
  <\/script>
</body>
</html>`;
  }
  _getLottieHtml(e) {
    let t = this._config.frame ?? `first`,
      n =
        e.metadata && (e.metadata.format === `lottie` || e.metadata.format === `dotlottie`)
          ? e.metadata.totalFrames
          : 0,
      r = t === `middle` ? Math.floor(n / 2) : 0;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js" integrity="sha384-J8C0MvgX4WP58J4N2W99vCKd2J6z99ynOJ5bEfE6jeP7kVTW1drYtv/jzrxM5jbm" crossorigin="anonymous"><\/script>
  <script>
    window.__ANIM_DATA__ = ${(0, G.readFileSync)(e.path, `utf-8`)};

    const anim = lottie.loadAnimation({
      container: document.getElementById('container'),
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: window.__ANIM_DATA__,
    });

    anim.addEventListener('DOMLoaded', function() {
      anim.goToAndStop(${r}, true);
      const ready = document.createElement('div');
      ready.id = 'ready';
      document.body.appendChild(ready);
    });
  <\/script>
</body>
</html>`;
  }
  async dispose() {
    if (((this._isDisposed = !0), this._browser))
      try {
        await this._browser.close();
      } catch {
      } finally {
        this._browser = null;
      }
  }
});
async function G_(e) {
  try {
    return (await (0, G.access)(e), !0);
  } catch {
    return !1;
  }
}
var K_ = {
  en: {
    control: {
      title: `DX Control Panel`,
      hybridThemes: `Hybrid Themes`,
      activeTheme: `Active Theme: `,
      themeStandalone: `Sxnnyside standalone`,
      themeDarcula: `IntelliJ Darcula`,
      themeLight: `IntelliJ Light`,
      watcherSimulator: `Watcher Simulator`,
      addRive: `Add Rive (.rive)`,
      addGif: `Add GIF (.gif)`,
      modifyAsset: `Modify Asset (success.json)`,
      removeAsset: `Remove Asset (loading.json)`,
      language: `Language`,
    },
    app: { scanningStart: `Starting scan...` },
    gallery: {
      title: `Animoria`,
      searchPlaceholder: `Search animations...`,
      emptyTitle: `Your workspace is empty`,
      emptyDesc: `No supported animated assets found in this directory.`,
      injectDemo: `Inject Demo Animation`,
      noResults: `No results for `,
      scanning: `Scanning workspace... `,
    },
    asset: { parsing: `Parsing...`, unknownError: `Unknown error` },
    preview: {
      emptyMessage: `Select an animation to view its detailed metadata`,
      dimensionsSize: `Dimensions & Size`,
      dimensions: `Dimensions`,
      size: `Size`,
      errorTitle: `Parsing Error`,
      lottieDetails: `Lottie/dotLottie Details`,
      fps: `Frame Rate (FPS)`,
      totalFrames: `Total Frames`,
      layerCount: `Layer Count`,
      duration: `Duration`,
      markers: `Timeline Markers`,
      dotlottieContent: `dotLottie Archive Content`,
      riveDetails: `Rive Details`,
      artboards: `Artboards`,
      stateMachines: `State Machines`,
      animations: `Animations`,
      rasterDetails: `Raster Animation Details`,
      frameCount: `Frame Count`,
      loopCount: `Loop Count`,
      infinite: `Infinite (0)`,
      svgDetails: `SVG Animation Details`,
      animationType: `Animation Type`,
      elementCount: `DOM elements`,
      format: `Format`,
    },
    vscode: {
      loading: `Loading animation...`,
      assetRemoved: `This asset has been deleted from the workspace.`,
      livePreview: `Live Preview`,
      play: `Play`,
      pause: `Pause`,
      restart: `Restart`,
      loop: `Loop`,
      metadata: `Metadata`,
      frames: `Frames`,
      layers: `Layers`,
      fileSize: `File Size`,
      usageReferences: `Usage References`,
      searchingCodebase: `Searching codebase...`,
      noReferences: `No references found in source files.`,
      quickActions: `Quick Actions`,
      copyPath: `Copy Path`,
      copyName: `Copy Name`,
      revealInExplorer: `Reveal in Explorer`,
      notFoundIn: `Not found in {files} source files`,
      foundIn: `Found in {count} location(s) · {files} files searched · {ms}ms`,
      loadError: `Failed to load animation.`,
      hasImages: `HAS IMAGES`,
      animationsCount: `animations`,
      none: `None`,
    },
  },
  es: {
    control: {
      title: `DX Panel de Control`,
      hybridThemes: `Temas Híbridos`,
      activeTheme: `Tema activo: `,
      themeStandalone: `Sxnnyside standalone`,
      themeDarcula: `IntelliJ Darcula`,
      themeLight: `IntelliJ Light`,
      watcherSimulator: `Watcher Simulador`,
      addRive: `Agregar Rive (.rive)`,
      addGif: `Agregar GIF (.gif)`,
      modifyAsset: `Modificar Asset (success.json)`,
      removeAsset: `Eliminar Asset (loading.json)`,
      language: `Idioma`,
    },
    app: { scanningStart: `Iniciando escaneo...` },
    gallery: {
      title: `Animoria`,
      searchPlaceholder: `Buscar animaciones...`,
      emptyTitle: `Tu espacio de trabajo está vacío`,
      emptyDesc: `No se encontraron archivos animados soportados en este directorio.`,
      injectDemo: `Inyectar Animación Demo`,
      noResults: `Sin resultados para `,
      scanning: `Escaneando el espacio de trabajo... `,
    },
    asset: { parsing: `Analizando...`, unknownError: `Error desconocido` },
    preview: {
      emptyMessage: `Selecciona una animación para ver sus metadatos detallados`,
      dimensionsSize: `Dimensiones y Tamaño`,
      dimensions: `Dimensiones`,
      size: `Tamaño`,
      errorTitle: `Error de Análisis`,
      lottieDetails: `Detalles de Lottie/dotLottie`,
      fps: `Tasa de FPS`,
      totalFrames: `Fotogramas Totales`,
      layerCount: `Cantidad de Capas`,
      duration: `Duración`,
      markers: `Marcadores de Línea de Tiempo`,
      dotlottieContent: `Contenido del Archivo dotLottie`,
      riveDetails: `Detalles de Rive`,
      artboards: `Mesas de Trabajo`,
      stateMachines: `Máquinas de Estado`,
      animations: `Animaciones`,
      rasterDetails: `Detalles de Animación Raster`,
      frameCount: `Cantidad de Fotogramas`,
      loopCount: `Cantidad de Bucles`,
      infinite: `Infinito (0)`,
      svgDetails: `Detalles de Animación SVG`,
      animationType: `Tipo de Animación`,
      elementCount: `Elementos DOM`,
      format: `Formato`,
    },
    vscode: {
      loading: `Cargando animación...`,
      assetRemoved: `Este asset ha sido eliminado del espacio de trabajo.`,
      livePreview: `Vista Previa en Vivo`,
      play: `Reproducir`,
      pause: `Pausar`,
      restart: `Reiniciar`,
      loop: `Bucle`,
      metadata: `Metadatos`,
      frames: `Fotogramas`,
      layers: `Capas`,
      fileSize: `Tamaño de archivo`,
      usageReferences: `Referencias de Uso`,
      searchingCodebase: `Buscando en la base de código...`,
      noReferences: `No se encontraron referencias en los archivos fuente.`,
      quickActions: `Acciones Rápidas`,
      copyPath: `Copiar Ruta`,
      copyName: `Copiar Nombre`,
      revealInExplorer: `Mostrar en el Explorador`,
      notFoundIn: `No encontrado en {files} archivos fuente`,
      foundIn: `Encontrado en {count} ubicación(es) · {files} archivos buscados · {ms}ms`,
      loadError: `Error al cargar la animación.`,
      hasImages: `CONTIENE IMÁGENES`,
      animationsCount: `animaciones`,
      none: `Ninguno`,
    },
  },
  ja: {
    control: {
      title: `DX コントロールパネル`,
      hybridThemes: `ハイブリッドテーマ`,
      activeTheme: `有効なテーマ: `,
      themeStandalone: `Sxnnyside スタンドアロン`,
      themeDarcula: `IntelliJ Darcula`,
      themeLight: `IntelliJ Light`,
      watcherSimulator: `ウォッチャーシミュレータ`,
      addRive: `Rive を追加 (.rive)`,
      addGif: `GIF を追加 (.gif)`,
      modifyAsset: `アセットを変更 (success.json)`,
      removeAsset: `アセットを削除 (loading.json)`,
      language: `言語`,
    },
    app: { scanningStart: `スキャンを開始中...` },
    gallery: {
      title: `Animoria`,
      searchPlaceholder: `アニメーションを検索...`,
      emptyTitle: `ワークスペースが空です`,
      emptyDesc: `このディレクトリにサポートされているアニメーションアセットが見つかりませんでした。`,
      injectDemo: `デモアニメーションを注入`,
      noResults: `検索結果がありません： `,
      scanning: `ワークスペースをスキャン中... `,
    },
    asset: { parsing: `解析中...`, unknownError: `不明なエラー` },
    preview: {
      emptyMessage: `アニメーションを選択して詳細なメタデータを表示します`,
      dimensionsSize: `ディメンションとサイズ`,
      dimensions: `寸法 (幅×高さ)`,
      size: `ファイルサイズ`,
      errorTitle: `解析エラー`,
      lottieDetails: `Lottie/dotLottie の詳細`,
      fps: `フレームレート (FPS)`,
      totalFrames: `総フレーム数`,
      layerCount: `レイヤー数`,
      duration: `再生時間`,
      markers: `タイムラインマーカー`,
      dotlottieContent: `dotLottie アーカイブの内容`,
      riveDetails: `Rive の詳細`,
      artboards: `アートボード`,
      stateMachines: `ステートマシン`,
      animations: `アニメーション`,
      rasterDetails: `ラスターアニメーションの詳細`,
      frameCount: `総フレーム数`,
      loopCount: `ループ回数`,
      infinite: `無限 (0)`,
      svgDetails: `SVG アニメーションの詳細`,
      animationType: `アニメーションタイプ`,
      elementCount: `DOM 要素数`,
      format: `フォーマット`,
    },
    vscode: {
      loading: `アニメーションを読み込み中...`,
      assetRemoved: `このアセットはワークスペースから削除されました。`,
      livePreview: `ライブプレビュー`,
      play: `再生`,
      pause: `一時停止`,
      restart: `再起動`,
      loop: `ループ`,
      metadata: `メタデータ`,
      frames: `フレーム数`,
      layers: `レイヤー数`,
      fileSize: `ファイルサイズ`,
      usageReferences: `使用場所の参照`,
      searchingCodebase: `コードベースを検索中...`,
      noReferences: `ソースファイルに参照が見つかりませんでした。`,
      quickActions: `クイックアクション`,
      copyPath: `パスをコピー`,
      copyName: `名前をコピー`,
      revealInExplorer: `エクスプローラーで表示`,
      notFoundIn: `{files} 個のソースファイルで見つかりませんでした`,
      foundIn: `{count} 箇所で見つかりました · {files} ファイル検索 · {ms}ms`,
      loadError: `アニメーションの読み込みに失敗しました。`,
      hasImages: `画像あり`,
      animationsCount: `アニメーション`,
      none: `なし`,
    },
  },
  fr: {
    control: {
      title: `Panneau de Contrôle DX`,
      hybridThemes: `Thèmes Hybrides`,
      activeTheme: `Thème actif: `,
      themeStandalone: `Sxnnyside autonome`,
      themeDarcula: `IntelliJ Darcula`,
      themeLight: `IntelliJ Light`,
      watcherSimulator: `Simulateur d'observateur`,
      addRive: `Ajouter Rive (.rive)`,
      addGif: `Ajouter GIF (.gif)`,
      modifyAsset: `Modifier Asset (success.json)`,
      removeAsset: `Supprimer Asset (loading.json)`,
      language: `Langue`,
    },
    app: { scanningStart: `Démarrage de l'analyse...` },
    gallery: {
      title: `Animoria`,
      searchPlaceholder: `Rechercher des animations...`,
      emptyTitle: `Votre espace de travail est vide`,
      emptyDesc: `Aucun fichier d'animation pris en charge trouvé dans ce dossier.`,
      injectDemo: `Injecter l'animation de démonstration`,
      noResults: `Aucun résultat pour `,
      scanning: `Analyse de l'espace de travail... `,
    },
    asset: { parsing: `Analyse...`, unknownError: `Erreur inconnue` },
    preview: {
      emptyMessage: `Sélectionnez une animation pour afficher ses métadonnées`,
      dimensionsSize: `Dimensions & Taille`,
      dimensions: `Dimensions`,
      size: `Taille`,
      errorTitle: `Erreur d'analyse`,
      lottieDetails: `Détails Lottie/dotLottie`,
      fps: `Fréquence d'images (FPS)`,
      totalFrames: `Total de Frames`,
      layerCount: `Nombre de calques`,
      duration: `Durée`,
      markers: `Marqueurs temporels`,
      dotlottieContent: `Contenu de l'archive dotLottie`,
      riveDetails: `Détails Rive`,
      artboards: `Plans de travail (Artboards)`,
      stateMachines: `Machines d'état`,
      animations: `Animations`,
      rasterDetails: `Détails de l'animation trame (Raster)`,
      frameCount: `Nombre de frames`,
      loopCount: `Nombre de boucles`,
      infinite: `Infini (0)`,
      svgDetails: `Détails de l'animation SVG`,
      animationType: `Type d'animation`,
      elementCount: `Éléments DOM`,
      format: `Format`,
    },
    vscode: {
      loading: `Chargement de l'animation...`,
      assetRemoved: `Cet asset a été supprimé de l'espace de travail.`,
      livePreview: `Aperçu en Direct`,
      play: `Lire`,
      pause: `Pause`,
      restart: `Recommencer`,
      loop: `Boucle`,
      metadata: `Métadonnées`,
      frames: `Frames`,
      layers: `Calques`,
      fileSize: `Taille du fichier`,
      usageReferences: `Références d'Utilisation`,
      searchingCodebase: `Recherche dans le code source...`,
      noReferences: `Aucune référence trouvée dans les fichiers source.`,
      quickActions: `Actions Rapides`,
      copyPath: `Copier le Chemin`,
      copyName: `Copier le Nom`,
      revealInExplorer: `Révéler dans l'Explorateur`,
      notFoundIn: `Non trouvé dans {files} fichiers source`,
      foundIn: `Trouvé dans {count} emplacement(s) · {files} fichiers recherchés · {ms}ms`,
      loadError: `Échec du chargement de l'animation.`,
      hasImages: `CONTIENT DES IMAGES`,
      animationsCount: `animations`,
      none: `Aucun`,
    },
  },
  'zh-CN': {
    control: {
      title: `DX 控制面板`,
      hybridThemes: `混合主题`,
      activeTheme: `当前主题: `,
      themeStandalone: `Sxnnyside 独立模式`,
      themeDarcula: `IntelliJ Darcula`,
      themeLight: `IntelliJ Light`,
      watcherSimulator: `文件监听模拟器`,
      addRive: `添加 Rive (.rive)`,
      addGif: `添加 GIF (.gif)`,
      modifyAsset: `修改资源 (success.json)`,
      removeAsset: `删除资源 (loading.json)`,
      language: `语言`,
    },
    app: { scanningStart: `正在启动扫描...` },
    gallery: {
      title: `Animoria`,
      searchPlaceholder: `搜索动画...`,
      emptyTitle: `您的工作区为空`,
      emptyDesc: `在此目录中未检测到支持的动画资源。`,
      injectDemo: `注入演示动画`,
      noResults: `没有找到相关结果： `,
      scanning: `正在扫描工作区... `,
    },
    asset: { parsing: `正在解析...`, unknownError: `未知错误` },
    preview: {
      emptyMessage: `选择一个动画以查看其详细的元数据`,
      dimensionsSize: `尺寸与大小`,
      dimensions: `尺寸`,
      size: `文件大小`,
      errorTitle: `解析错误`,
      lottieDetails: `Lottie/dotLottie 详情`,
      fps: `帧率 (FPS)`,
      totalFrames: `总帧数`,
      layerCount: `图层数量`,
      duration: `持续时间`,
      markers: `时间轴标记`,
      dotlottieContent: `dotLottie 归档内容`,
      riveDetails: `Rive 详情`,
      artboards: `画板 (Artboards)`,
      stateMachines: `状态机`,
      animations: `动画列表`,
      rasterDetails: `光栅动画详情`,
      frameCount: `总帧数`,
      loopCount: `循环次数`,
      infinite: `无限循环 (0)`,
      svgDetails: `SVG 动画详情`,
      animationType: `动画类型`,
      elementCount: `DOM 元素数量`,
      format: `格式`,
    },
    vscode: {
      loading: `正在加载动画...`,
      assetRemoved: `此资源已从工作区中删除。`,
      livePreview: `实时预览`,
      play: `播放`,
      pause: `暂停`,
      restart: `重新开始`,
      loop: `循环`,
      metadata: `元数据`,
      frames: `帧数`,
      layers: `图层`,
      fileSize: `文件大小`,
      usageReferences: `使用引用`,
      searchingCodebase: `正在搜索代码库...`,
      noReferences: `在源文件中未找到引用。`,
      quickActions: `快捷操作`,
      copyPath: `复制路径`,
      copyName: `复制名称`,
      revealInExplorer: `在资源管理器中显示`,
      notFoundIn: `在 {files} 个源文件中未找到`,
      foundIn: `在 {count} 处找到 · 已搜索 {files} 个文件 · 耗时 {ms} 毫秒`,
      loadError: `加载动画失败。`,
      hasImages: `包含图像`,
      animationsCount: `个动画`,
      none: `无`,
    },
  },
};
function q_(e, t = `en`) {
  let n = K_[t] || K_.en,
    r = e.split(`.`),
    i = n;
  for (let t of r)
    if (i && typeof i == `object` && t in i) i = i[t];
    else {
      let t = K_.en;
      for (let n of r)
        if (t && typeof t == `object` && n in t) t = t[n];
        else return e;
      return typeof t == `string` ? t : e;
    }
  return typeof i == `string` ? i : e;
}
function J_(e, t, n, r) {
  var i = arguments.length,
    a = i < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, n)) : r,
    o;
  if (typeof Reflect == `object` && typeof Reflect.decorate == `function`)
    a = Reflect.decorate(e, t, n, r);
  else
    for (var s = e.length - 1; s >= 0; s--)
      (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
  return (i > 3 && a && Object.defineProperty(t, n, a), a);
}
var Y_ = class extends Me {
  constructor(...e) {
    (super(...e), (this.name = ``), (this.format = ``));
  }
  static {
    this.styles = d`
    :host {
      display: block;
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease;
    }

    :host(:hover) {
      transform: scale(1.05);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .canvas {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    /* Onda vectorial que oscila en hover */
    .motion-path {
      fill: none;
      stroke: rgba(255, 255, 255, 0.9);
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 40;
      stroke-dashoffset: 40;
      transition: stroke-dashoffset 0.4s ease;
    }

    :host(:hover) .motion-path {
      stroke-dashoffset: 0;
      animation: waveOscillate 1.6s infinite ease-in-out;
    }

    @keyframes waveOscillate {
      0%, 100% {
        transform: translateY(0) scaleY(1);
      }
      50% {
        transform: translateY(-1.5px) scaleY(0.8);
      }
    }

    /* Playhead central estático */
    .playhead {
      fill: #ffffff;
      transition: transform 0.2s ease;
    }

    :host(:hover) .playhead {
      transform: scale(1.2);
    }

    .format-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 8px;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.55);
      color: rgba(255, 255, 255, 0.95);
      padding: 1px 3px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      pointer-events: none;
    }
  `;
  }
  _getDeterministicGradient(e) {
    if (!e) return `linear-gradient(135deg, #4f46e5, #06b6d4)`;
    let t = 0;
    for (let n = 0; n < e.length; n++) t = e.charCodeAt(n) + ((t << 5) - t);
    let n = Math.abs(t) % 360;
    return `linear-gradient(135deg, hsl(${n}, 65%, 45%), hsl(${(n + 40) % 360}, 60%, 35%))`;
  }
  render() {
    return F`
      <div class="canvas" style="background: ${this._getDeterministicGradient(this.name)};">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <!-- Onda del timeline -->
          <path
            class="motion-path"
            d="M2 12 C 5 6, 8 18, 12 12 C 16 6, 19 18, 22 12"
          />
          <!-- Playhead central indicando control temporal -->
          <circle class="playhead" cx="12" cy="12" r="2" />
        </svg>
        <span class="format-badge">${this.format ? this.format.substring(0, 3) : `LOTT`}</span>
      </div>
    `;
  }
};
(J_([Le({ type: String })], Y_.prototype, `name`, void 0),
  J_([Le({ type: String })], Y_.prototype, `format`, void 0),
  (Y_ = J_([Pe(`animoria-thumbnail-fallback`)], Y_)));
var X_ = class extends Me {
  constructor(...e) {
    (super(...e), (this.locale = `en`));
  }
  static {
    this.styles = d`
    :host {
      display: block;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: var(--animoria-bg-secondary);
      border-bottom: 1px solid var(--animoria-border-color);
      transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .item:hover {
      background: var(--animoria-hover-bg);
    }

    .thumbnail {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid var(--animoria-border-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
    }

    animoria-thumbnail-fallback {
      flex-shrink: 0;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .stem {
      font-size: 13px;
      font-weight: 500;
      color: var(--animoria-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta {
      font-size: 11px;
      color: var(--animoria-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .error {
      font-size: 11px;
      color: var(--animoria-error-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pending {
      font-size: 11px;
      color: var(--animoria-text-muted);
    }
  `;
  }
  t(e) {
    return q_(e, this.locale);
  }
  _onClick() {
    this.dispatchEvent(
      new CustomEvent(`select-asset`, { detail: { asset: this.asset }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    let { asset: e } = this;
    return e
      ? F`
      <div class="item" @click="${this._onClick}">
        ${
          e.thumbnailPath
            ? F`
          <img class="thumbnail" src="${e.thumbnailPath}" alt="${e.name}" />
        `
            : F`
          <animoria-thumbnail-fallback
            .name="${e.name}"
            .format="${e.format}"
          ></animoria-thumbnail-fallback>
        `
        }
        
        <div class="info">
          <span class="stem">${e.stem}</span>
          ${
            e.status === `parsed` && e.metadata
              ? F`
            <span class="meta">
              ${`fps` in e.metadata ? F`${e.metadata.fps}fps &middot; ` : ``}
              ${e.metadata.durationSeconds}s
              &middot;
              ${e.metadata.width}&times;${e.metadata.height}
            </span>
          `
              : e.status === `error`
                ? F`
            <span class="error">${e.error ?? this.t(`asset.unknownError`)}</span>
          `
                : F`
            <span class="pending">${this.t(`asset.parsing`)}&hellip;</span>
          `
          }
        </div>
      </div>
    `
      : F``;
  }
};
(J_([Le({ type: Object })], X_.prototype, `asset`, void 0),
  J_([Le({ type: String })], X_.prototype, `locale`, void 0),
  (X_ = J_([Pe(`animoria-asset-item`)], X_)));
var Z_ = class extends Me {
  constructor(...e) {
    (super(...e),
      (this.assets = []),
      (this.loading = !1),
      (this.progressMessage = ``),
      (this.progressPercent = 0),
      (this.workspacePath = ``),
      (this.locale = `en`),
      (this._query = ``));
  }
  static {
    this.styles = d`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: var(--animoria-bg-primary);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px 8px;
      background: var(--animoria-bg-primary);
      border-bottom: 1px solid var(--animoria-border-color);
      flex-shrink: 0;
    }

    .title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--animoria-text-primary);
    }

    .count {
      font-size: 11px;
      background: var(--animoria-badge-bg);
      color: var(--animoria-text-primary);
      padding: 1px 6px;
      border-radius: 8px;
    }

    .search-wrap {
      padding: 6px 8px;
      background: var(--animoria-bg-primary);
      border-bottom: 1px solid var(--animoria-border-color);
      flex-shrink: 0;
    }

    .search {
      width: 100%;
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border-color);
      border-radius: 3px;
      color: var(--animoria-text-primary);
      font-size: 12px;
      padding: 4px 8px;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .search:focus {
      border-color: var(--animoria-accent);
    }

    .search::placeholder {
      color: var(--animoria-text-muted);
    }

    .list {
      flex: 1;
      overflow-y: auto;
    }

    .list::-webkit-scrollbar {
      width: 6px;
    }

    .list::-webkit-scrollbar-thumb {
      background: var(--animoria-scroll-thumb);
      border-radius: 3px;
    }

    .list::-webkit-scrollbar-thumb:hover {
      background: var(--animoria-scroll-thumb-hover);
    }

    .empty {
      padding: 20px 12px;
      font-size: 12px;
      color: var(--animoria-text-muted);
      text-align: center;
    }

    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--animoria-accent), var(--animoria-accent-hover));
      transition: width 0.2s ease-out;
      box-shadow: 0 0 8px var(--animoria-accent);
    }

    .empty-card {
      padding: 40px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px dashed var(--animoria-border-color);
      border-radius: 8px;
      margin: 20px;
    }

    .empty-icon {
      font-size: 40px;
      opacity: 0.7;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--animoria-text-primary);
      margin: 0;
    }

    .empty-desc {
      font-size: 12px;
      color: var(--animoria-text-muted);
      margin: 0 0 8px 0;
      line-height: 1.5;
      max-width: 240px;
    }

    .inject-btn {
      background: var(--animoria-accent);
      color: var(--animoria-accent-text);
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.2s ease, transform 0.1s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .inject-btn:hover {
      background: var(--animoria-accent-hover);
    }

    .inject-btn:active {
      transform: scale(0.97);
    }
  `;
  }
  t(e) {
    return q_(e, this.locale);
  }
  get filteredAssets() {
    if (!this._query) return this.assets;
    let e = this._query.toLowerCase();
    return this.assets.filter(
      (t) => t.name.toLowerCase().includes(e) || t.stem.toLowerCase().includes(e)
    );
  }
  _onInput(e) {
    this._query = e.target.value;
  }
  _onInjectDemo() {
    window.postMessage({ command: `injectDemo`, target: `extension` }, `*`);
  }
  render() {
    let e = this.filteredAssets;
    return F`
      <div class="header">
        <span class="title">${this.t(`gallery.title`)}</span>
        <span class="count">${this.assets.length}</span>
      </div>

      ${
        this.loading
          ? F`
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${this.progressPercent}%"></div>
        </div>
      `
          : ``
      }

      <div class="search-wrap">
        <input
          class="search"
          type="text"
          placeholder="${this.t(`gallery.searchPlaceholder`)}"
          .value="${this._query}"
          @input="${this._onInput}"
        />
      </div>

      <div class="list">
        ${
          this.loading && this.assets.length === 0
            ? F`
          <p class="empty">${this.progressMessage || this.t(`gallery.scanning`)} (${this.progressPercent}%)</p>
        `
            : this.assets.length === 0
              ? F`
          <div class="empty-card">
            <div class="empty-icon">📂</div>
            <p class="empty-title">${this.t(`gallery.emptyTitle`)}</p>
            <p class="empty-desc">${this.t(`gallery.emptyDesc`)}</p>
            <button class="inject-btn" @click="${this._onInjectDemo}">${this.t(`gallery.injectDemo`)}</button>
          </div>
        `
              : e.length === 0
                ? F`
          <p class="empty">${this.t(`gallery.noResults`)} &ldquo;${this._query}&rdquo;</p>
        `
                : e.map(
                    (e) => F`
          <animoria-asset-item .asset="${e}" .locale="${this.locale}"></animoria-asset-item>
        `
                  )
        }
      </div>
    `;
  }
};
(J_([Le({ type: Array })], Z_.prototype, `assets`, void 0),
  J_([Le({ type: Boolean })], Z_.prototype, `loading`, void 0),
  J_([Le({ type: String })], Z_.prototype, `progressMessage`, void 0),
  J_([Le({ type: Number })], Z_.prototype, `progressPercent`, void 0),
  J_([Le({ type: String })], Z_.prototype, `workspacePath`, void 0),
  J_([Le({ type: String })], Z_.prototype, `locale`, void 0),
  J_([Re()], Z_.prototype, `_query`, void 0),
  (Z_ = J_([Pe(`animoria-gallery`)], Z_)));
var Q_ = class extends Me {
  constructor(...e) {
    (super(...e), (this.locale = `en`), (this._currentTheme = `theme-sandbox-standalone`));
  }
  static {
    this.styles = d`
    :host {
      display: block;
      width: 280px;
      background: var(--animoria-bg-secondary);
      border-left: 1px solid var(--animoria-border-color);
      padding: 20px;
      box-sizing: border-box;
      font-family: var(--animoria-font-family);
      color: var(--animoria-text-primary);
      overflow-y: auto;
    }

    h3 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--animoria-accent);
      border-bottom: 1px solid var(--animoria-border-color);
      padding-bottom: 8px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    .theme-info {
      font-size: 11px;
      color: var(--animoria-text-muted);
      margin-bottom: 12px;
    }

    .btn {
      display: block;
      width: 100%;
      background: var(--animoria-bg-primary);
      border: 1px solid var(--animoria-border-color);
      color: var(--animoria-text-primary);
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      text-align: left;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .btn:hover {
      background: var(--animoria-hover-bg);
      border-color: var(--animoria-accent);
    }

    .btn.active {
      border-color: var(--animoria-accent);
      background: rgba(99, 102, 241, 0.1);
    }

    .btn-watcher {
      background: rgba(99, 102, 241, 0.05);
      border-color: rgba(99, 102, 241, 0.2);
    }

    .btn-watcher:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--animoria-accent);
    }

    .lang-selector select {
      width: 100%;
      background: var(--animoria-bg-primary);
      border: 1px solid var(--animoria-border-color);
      color: var(--animoria-text-primary);
      padding: 6px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      outline: none;
    }

    .lang-selector select:focus {
      border-color: var(--animoria-accent);
    }
  `;
  }
  connectedCallback() {
    (super.connectedCallback(), this._setTheme(this._currentTheme));
  }
  t(e) {
    return q_(e, this.locale);
  }
  _setTheme(e) {
    ((this._currentTheme = e), (document.body.className = ``), document.body.classList.add(e));
  }
  _onLangChange(e) {
    let t = e.target;
    this.dispatchEvent(
      new CustomEvent(`change-locale`, { detail: { locale: t.value }, bubbles: !0, composed: !0 })
    );
  }
  _emitWatcherEvent(e, t) {
    window.postMessage({ command: `watcherEvent`, type: e, asset: t }, `*`);
  }
  _simulateAddRive() {
    let e = {
      path: `/workspace/assets/animations/hero.rive`,
      name: `hero.rive`,
      stem: `hero`,
      format: `rive`,
      sizeBytes: 94800,
      mtime: Date.now(),
      status: `parsed`,
      metadata: {
        format: `rive`,
        width: 1024,
        height: 768,
        durationSeconds: 12.5,
        artboards: [`hero-header`, `compact-view`],
        stateMachines: [`StateMachineMain`],
        animations: [`intro_reveal`, `hover_pulse`, `outro_collapse`],
      },
    };
    this._emitWatcherEvent(`added`, e);
  }
  _simulateAddGif() {
    let e = {
      path: `/workspace/assets/animations/loading-spinner.gif`,
      name: `loading-spinner.gif`,
      stem: `loading-spinner`,
      format: `gif`,
      sizeBytes: 43200,
      mtime: Date.now(),
      status: `parsed`,
      metadata: {
        format: `gif`,
        width: 64,
        height: 64,
        durationSeconds: 0.8,
        frameCount: 24,
        loopCount: 0,
      },
    };
    this._emitWatcherEvent(`added`, e);
  }
  _simulateModifyAsset() {
    let e = {
      path: `/workspace/assets/animations/success.json`,
      name: `success.json`,
      stem: `success`,
      format: `lottie`,
      sizeBytes: 4200,
      mtime: Date.now(),
      status: `parsed`,
      metadata: {
        format: `lottie`,
        fps: 60,
        durationSeconds: 1.5,
        totalFrames: 90,
        width: 512,
        height: 512,
        layerCount: 12,
      },
    };
    this._emitWatcherEvent(`modified`, e);
  }
  _simulateRemoveAsset() {
    let e = {
      path: `/workspace/assets/animations/loading.json`,
      name: `loading.json`,
      stem: `loading`,
      format: `lottie`,
      sizeBytes: 3800,
      mtime: Date.now(),
      status: `parsed`,
    };
    this._emitWatcherEvent(`removed`, e);
  }
  render() {
    return F`
      <h3>${this.t(`control.title`)}</h3>

      <div class="section-title">${this.t(`control.language`)}</div>
      <div class="lang-selector">
        <select @change="${this._onLangChange}" .value="${this.locale}">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ja">日本語</option>
          <option value="fr">Français</option>
          <option value="zh-CN">简体中文</option>
        </select>
      </div>

      <div class="section-title">${this.t(`control.hybridThemes`)}</div>
      <div class="theme-info">${this.t(`control.activeTheme`)}<strong>${this._currentTheme}</strong></div>
      
      <button 
        class="btn ${this._currentTheme === `theme-sandbox-standalone` ? `active` : ``}" 
        @click="${() => this._setTheme(`theme-sandbox-standalone`)}"
      >
        ${this.t(`control.themeStandalone`)}
      </button>
      <button 
        class="btn ${this._currentTheme === `theme-intellij-dark` ? `active` : ``}" 
        @click="${() => this._setTheme(`theme-intellij-dark`)}"
      >
        ${this.t(`control.themeDarcula`)}
      </button>
      <button 
        class="btn ${this._currentTheme === `theme-intellij-light` ? `active` : ``}" 
        @click="${() => this._setTheme(`theme-intellij-light`)}"
      >
        ${this.t(`control.themeLight`)}
      </button>

      <div class="section-title">${this.t(`control.watcherSimulator`)}</div>
      
      <button class="btn btn-watcher" @click="${this._simulateAddRive}">
        ${this.t(`control.addRive`)}
      </button>
      <button class="btn btn-watcher" @click="${this._simulateAddGif}">
        ${this.t(`control.addGif`)}
      </button>
      <button class="btn btn-watcher" @click="${this._simulateModifyAsset}">
        ${this.t(`control.modifyAsset`)}
      </button>
      <button class="btn btn-watcher" @click="${this._simulateRemoveAsset}">
        ${this.t(`control.removeAsset`)}
      </button>
    `;
  }
};
(J_([Le({ type: String })], Q_.prototype, `locale`, void 0),
  J_([Re()], Q_.prototype, `_currentTheme`, void 0),
  (Q_ = J_([Pe(`sandbox-control-panel`)], Q_)));
var $_ = class extends Me {
  constructor(...e) {
    (super(...e), (this.asset = null), (this.locale = `en`));
  }
  static {
    this.styles = d`
    :host {
      display: block;
      width: 340px;
      height: 100%;
      border-left: 1px solid var(--animoria-border-color);
      background: var(--animoria-bg-secondary);
      color: var(--animoria-text-primary);
      overflow-y: auto;
      box-sizing: border-box;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 32px;
      text-align: center;
      color: var(--animoria-text-muted);
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.6;
    }

    .container {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .format-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--animoria-badge-bg);
      color: var(--animoria-accent-hover);
      letter-spacing: 0.05em;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      word-break: break-all;
      color: var(--animoria-text-primary);
    }

    .path {
      font-size: 11px;
      color: var(--animoria-text-muted);
      word-break: break-all;
      background: rgba(0, 0, 0, 0.2);
      padding: 6px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
    }

    .section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--animoria-border-color);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--animoria-text-muted);
      border-bottom: 1px solid var(--animoria-border-color);
      padding-bottom: 6px;
      margin: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .grid-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .grid-label {
      font-size: 10px;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
    }

    .grid-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--animoria-text-primary);
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .list-item {
      font-size: 12px;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--animoria-border-color);
      word-break: break-all;
    }

    .badge-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge-item {
      font-size: 11px;
      background: var(--animoria-hover-bg);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid var(--animoria-border-color);
    }

    .thumbnail-preview {
      width: 100%;
      height: 160px;
      border-radius: 6px;
      border: 1px solid var(--animoria-border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--animoria-bg-primary);
      position: relative;
    }

    .thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `;
  }
  t(e) {
    return q_(e, this.locale);
  }
  _formatSize(e) {
    if (e < 1024) return `${e} B`;
    let t = e / 1024;
    return t < 1024 ? `${t.toFixed(1)} KB` : `${(t / 1024).toFixed(1)} MB`;
  }
  _renderMetadataDetails() {
    let { asset: e } = this;
    if (!e || e.status !== `parsed` || !e.metadata) return F``;
    let { metadata: t } = e;
    switch (t.format) {
      case `lottie`:
      case `dotlottie`:
        return F`
          <div class="section">
            <h3 class="section-title">${this.t(`preview.lottieDetails`)}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.fps`)}</span>
                <span class="grid-value">${t.fps}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.totalFrames`)}</span>
                <span class="grid-value">${t.totalFrames}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.layerCount`)}</span>
                <span class="grid-value">${t.layerCount}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.duration`)}</span>
                <span class="grid-value">${t.durationSeconds}s</span>
              </div>
            </div>
          </div>

          ${
            t.markers && t.markers.length > 0
              ? F`
            <div class="section">
              <h3 class="section-title">${this.t(`preview.markers`)}</h3>
              <div class="list">
                ${t.markers.map(
                  (e) => F`
                    <div class="list-item">
                      <strong>${e.name}</strong> (frame ${e.frame}, duration ${e.durationFrames}f)
                    </div>
                  `
                )}
              </div>
            </div>
          `
              : ``
          }

          ${
            t.dotLottie && t.dotLottie.animations.length > 0
              ? F`
            <div class="section">
              <h3 class="section-title">${this.t(`preview.dotlottieContent`)}</h3>
              <div class="list">
                ${t.dotLottie.animations.map(
                  (e) => F`
                    <div class="list-item">
                      ID: <code>${e.id}</code>${e.name ? ` (${e.name})` : ``}
                    </div>
                  `
                )}
              </div>
            </div>
          `
              : ``
          }
        `;
      case `rive`:
        return F`
          <div class="section">
            <h3 class="section-title">${this.t(`preview.riveDetails`)}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.artboards`)}</span>
                <span class="grid-value">${t.artboards.length}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.stateMachines`)}</span>
                <span class="grid-value">${t.stateMachines.length}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t(`preview.artboards`)}</h3>
            <div class="badge-grid">
              ${t.artboards.map((e) => F`<span class="badge-item">${e}</span>`)}
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t(`preview.stateMachines`)}</h3>
            <div class="badge-grid">
              ${t.stateMachines.map((e) => F`<span class="badge-item">${e}</span>`)}
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t(`preview.animations`)}</h3>
            <div class="badge-grid">
              ${t.animations.map((e) => F`<span class="badge-item">${e}</span>`)}
            </div>
          </div>
        `;
      case `gif`:
      case `apng`:
        return F`
          <div class="section">
            <h3 class="section-title">${this.t(`preview.rasterDetails`)}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.frameCount`)}</span>
                <span class="grid-value">${t.frameCount}</span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.loopCount`)}</span>
                <span class="grid-value">
                  ${t.loopCount === 0 ? this.t(`preview.infinite`) : t.loopCount}
                </span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.duration`)}</span>
                <span class="grid-value">${t.durationSeconds}s</span>
              </div>
            </div>
          </div>
        `;
      case `animated-svg`:
        return F`
          <div class="section">
            <h3 class="section-title">${this.t(`preview.svgDetails`)}</h3>
            <div class="grid">
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.animationType`)}</span>
                <span class="grid-value" style="text-transform: uppercase;">
                  ${t.animationType}
                </span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.elementCount`)}</span>
                <span class="grid-value">${t.elementCount}</span>
              </div>
            </div>
          </div>
        `;
      default:
        return F``;
    }
  }
  render() {
    let { asset: e } = this;
    return e
      ? F`
      <div class="container">
        <div class="thumbnail-preview">
          ${
            e.thumbnailPath
              ? F`
            <img class="thumbnail-img" src="${e.thumbnailPath}" alt="${e.name}" />
          `
              : F`
            <animoria-thumbnail-fallback
              .name="${e.name}"
              .format="${e.format}"
              style="width: 80px; height: 80px;"
            ></animoria-thumbnail-fallback>
          `
          }
        </div>

        <div class="header">
          <span class="format-badge">${e.format}</span>
          <h2 class="title">${e.name}</h2>
          <div class="path">${e.path}</div>
        </div>

        <div class="section">
          <h3 class="section-title">${this.t(`preview.dimensionsSize`)}</h3>
          <div class="grid">
            <div class="grid-item">
              <span class="grid-label">${this.t(`preview.dimensions`)}</span>
              <span class="grid-value">
                ${e.metadata ? F`${e.metadata.width}&times;${e.metadata.height}` : `—`}
              </span>
            </div>
            <div class="grid-item">
              <span class="grid-label">${this.t(`preview.size`)}</span>
              <span class="grid-value">${this._formatSize(e.sizeBytes)}</span>
            </div>
          </div>
        </div>

        ${
          e.status === `error`
            ? F`
          <div class="section" style="border-color: var(--animoria-error-text);">
            <h3 class="section-title" style="color: var(--animoria-error-text);">${this.t(`preview.errorTitle`)}</h3>
            <div class="list-item" style="color: var(--animoria-error-text); background: rgba(244, 63, 94, 0.05);">
              ${e.error ?? `Unknown validation/parsing error`}
            </div>
          </div>
        `
            : this._renderMetadataDetails()
        }
      </div>
    `
      : F`
        <div class="empty-state">
          <div class="empty-icon">&spar;</div>
          <div>${this.t(`preview.emptyMessage`)}</div>
        </div>
      `;
  }
};
(J_([Le({ type: Object })], $_.prototype, `asset`, void 0),
  J_([Le({ type: String })], $_.prototype, `locale`, void 0),
  ($_ = J_([Pe(`animoria-preview-panel`)], $_)));
var ev = [
  {
    path: `/workspace/assets/animations/success.json`,
    name: `success.json`,
    stem: `success`,
    format: `lottie`,
    sizeBytes: 4200,
    mtime: Date.now(),
    status: `parsed`,
    metadata: {
      format: `lottie`,
      fps: 30,
      durationSeconds: 3,
      totalFrames: 90,
      width: 512,
      height: 512,
      layerCount: 8,
      markers: [
        { name: `intro`, frame: 0, durationFrames: 30 },
        { name: `loop`, frame: 30, durationFrames: 60 },
      ],
    },
  },
  {
    path: `/workspace/assets/animations/loading.json`,
    name: `loading.json`,
    stem: `loading`,
    format: `lottie`,
    sizeBytes: 3800,
    mtime: Date.now(),
    status: `parsed`,
    metadata: {
      format: `lottie`,
      fps: 30,
      durationSeconds: 2,
      totalFrames: 60,
      width: 256,
      height: 256,
      layerCount: 3,
    },
  },
  {
    path: `/workspace/assets/animations/confetti.json`,
    name: `confetti.json`,
    stem: `confetti`,
    format: `lottie`,
    sizeBytes: 5100,
    mtime: Date.now(),
    status: `parsed`,
    metadata: {
      format: `lottie`,
      fps: 60,
      durationSeconds: 4,
      totalFrames: 240,
      width: 1024,
      height: 1024,
      layerCount: 15,
    },
  },
  {
    path: `/workspace/assets/animations/logo.rive`,
    name: `logo.rive`,
    stem: `logo`,
    format: `rive`,
    sizeBytes: 85200,
    mtime: Date.now(),
    status: `parsed`,
    metadata: {
      format: `rive`,
      width: 800,
      height: 600,
      durationSeconds: 5,
      artboards: [`main`, `compact`],
      stateMachines: [`StateMachine1`, `HoverTransition`],
      animations: [`idle`, `rotate`, `success_trigger`],
    },
  },
  {
    path: `/workspace/assets/animations/loader.gif`,
    name: `loader.gif`,
    stem: `loader`,
    format: `gif`,
    sizeBytes: 154e3,
    mtime: Date.now(),
    status: `parsed`,
    metadata: {
      format: `gif`,
      width: 128,
      height: 128,
      durationSeconds: 1.5,
      frameCount: 45,
      loopCount: 0,
    },
  },
  {
    path: `/workspace/assets/animations/animated-wave.svg`,
    name: `animated-wave.svg`,
    stem: `animated-wave`,
    format: `animated-svg`,
    sizeBytes: 12e3,
    mtime: Date.now(),
    status: `parsed`,
    metadata: {
      format: `animated-svg`,
      width: 400,
      height: 200,
      durationSeconds: 8,
      animationType: `css`,
      elementCount: 12,
    },
  },
  {
    path: `/workspace/assets/animations/error-example.json`,
    name: `error-example.json`,
    stem: `error-example`,
    format: `lottie`,
    sizeBytes: 200,
    mtime: Date.now(),
    status: `error`,
    error: `Validation failed: structural key "layers" is missing`,
  },
];
new (class {
  constructor() {
    window.addEventListener(`message`, (e) => {
      e.data && e.data.target === `extension` && this._handleFrontendMessage(e.data);
    });
  }
  _postToFrontend(e, t) {
    window.postMessage({ command: e, ...t }, `*`);
  }
  _handleFrontendMessage(e) {
    if (!(!e || !e.command))
      switch ((console.log(`[Mock Extension Host] Recibido: ${e.command}`, e), e.command)) {
        case `scan`:
          this._simulateScan();
          break;
        case `openPreview`:
          console.log(`[Mock Host] Abriendo preview de: ${e.asset.name}`);
          break;
        case `deleteAsset`:
          (console.log(`[Mock Host] Eliminando asset: ${e.path}`),
            this._postToFrontend(`assetDeleted`, { path: e.path }));
          break;
        case `injectDemo`:
          console.log(`[Mock Host] Injecting demo asset...`);
          let t = {
            path: `/workspace/assets/animations/brand-logo.rive`,
            name: `brand-logo.rive`,
            stem: `brand-logo`,
            format: `rive`,
            sizeBytes: 102400,
            mtime: Date.now(),
            status: `parsed`,
            metadata: {
              format: `rive`,
              width: 500,
              height: 500,
              durationSeconds: 0,
              artboards: [`BrandLogoBoard`],
              stateMachines: [`BrandAnimationController`],
              animations: [`spin`, `glow`, `pulse`],
            },
          };
          this._postToFrontend(`watcherEvent`, { type: `added`, asset: t });
          break;
      }
  }
  _simulateScan() {
    (this._postToFrontend(`scanProgress`, {
      message: `Iniciando crawler recursivo de directorios...`,
      index: 0,
      total: 3,
      assets: [],
    }),
      setTimeout(() => {
        this._postToFrontend(`scanProgress`, {
          message: `Buscando llaves "v" y "layers" en primer bloque (1KB)...`,
          index: 1,
          total: 3,
          assets: ev.slice(0, 2),
        });
      }, 400),
      setTimeout(() => {
        this._postToFrontend(`scanProgress`, {
          message: `Generando metadatos para la cola de assets...`,
          index: 2,
          total: 3,
          assets: ev.slice(0, 5),
        });
      }, 800),
      setTimeout(() => {
        this._postToFrontend(`scanComplete`, { assets: ev, durationMs: 142, parsedCount: 6 });
      }, 1200));
  }
})();
var tv = class extends Me {
  constructor(...e) {
    (super(...e),
      (this._assets = []),
      (this._loading = !1),
      (this._progressMessage = ``),
      (this._progressPercent = 0),
      (this._selectedAsset = null),
      (this._locale = `en`),
      (this._handleMessage = (e) => {
        let t = e.data;
        if (!(!t || !t.command))
          switch (t.command) {
            case `scanProgress`:
              ((this._progressMessage = t.message),
                t.total > 0
                  ? (this._progressPercent = Math.round((t.index / t.total) * 100))
                  : (this._progressPercent = 0),
                t.assets && (this._assets = t.assets));
              break;
            case `scanComplete`:
              ((this._assets = t.assets),
                (this._loading = !1),
                (this._progressMessage = ``),
                (this._progressPercent = 100));
              break;
            case `watcherEvent`:
              this._handleWatcherEvent(t.type, t.asset);
              break;
            case `assetDeleted`:
              ((this._assets = this._assets.filter((e) => e.path !== t.path)),
                this._selectedAsset?.path === t.path && (this._selectedAsset = null));
              break;
          }
      }));
  }
  static {
    this.styles = d`
    :host {
      display: flex;
      flex-direction: row;
      height: 100vh;
      width: 100%;
      overflow: hidden;
      background: var(--animoria-bg-primary);
    }

    animoria-gallery {
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    animoria-preview-panel {
      flex-shrink: 0;
    }

    sandbox-control-panel {
      flex-shrink: 0;
    }
  `;
  }
  connectedCallback() {
    (super.connectedCallback(),
      window.addEventListener(`message`, this._handleMessage),
      this._triggerScan());
  }
  disconnectedCallback() {
    (super.disconnectedCallback(), window.removeEventListener(`message`, this._handleMessage));
  }
  t(e) {
    return q_(e, this._locale);
  }
  _triggerScan() {
    ((this._loading = !0),
      (this._progressMessage = this.t(`app.scanningStart`)),
      (this._progressPercent = 0),
      (this._selectedAsset = null),
      window.postMessage({ command: `scan`, target: `extension` }, `*`));
  }
  _onSelectAsset(e) {
    this._selectedAsset = e.detail.asset;
  }
  _onChangeLocale(e) {
    ((this._locale = e.detail.locale),
      this._loading &&
        this._progressMessage === q_(`app.scanningStart`, this._locale === `en` ? `es` : `en`) &&
        (this._progressMessage = this.t(`app.scanningStart`)));
  }
  _handleWatcherEvent(e, t) {
    e === `added`
      ? this._assets.some((e) => e.path === t.path) || (this._assets = [...this._assets, t])
      : e === `modified`
        ? ((this._assets = this._assets.map((e) => (e.path === t.path ? t : e))),
          this._selectedAsset?.path === t.path && (this._selectedAsset = t))
        : e === `removed` &&
          ((this._assets = this._assets.filter((e) => e.path !== t.path)),
          this._selectedAsset?.path === t.path && (this._selectedAsset = null));
  }
  render() {
    return F`
      <animoria-gallery
        .assets="${this._assets}"
        .loading="${this._loading}"
        .progressMessage="${this._progressMessage}"
        .progressPercent="${this._progressPercent}"
        .locale="${this._locale}"
        workspacePath="/workspace"
        @select-asset="${this._onSelectAsset}"
        @change-locale="${this._onChangeLocale}"
      ></animoria-gallery>
      <animoria-preview-panel 
        .asset="${this._selectedAsset}" 
        .locale="${this._locale}"
      ></animoria-preview-panel>
      <sandbox-control-panel 
        .locale="${this._locale}"
      ></sandbox-control-panel>
    `;
  }
};
(J_([Re()], tv.prototype, `_assets`, void 0),
  J_([Re()], tv.prototype, `_loading`, void 0),
  J_([Re()], tv.prototype, `_progressMessage`, void 0),
  J_([Re()], tv.prototype, `_progressPercent`, void 0),
  J_([Re()], tv.prototype, `_selectedAsset`, void 0),
  J_([Re()], tv.prototype, `_locale`, void 0),
  (tv = J_([Pe(`animoria-app`)], tv)));
export {
  xu as $,
  Nd as A,
  _c as At,
  Pu as B,
  gf as C,
  Vc as Ct,
  nf as D,
  bc as Dt,
  df as E,
  gl as Et,
  nd as F,
  Eu as G,
  Mu as H,
  Yu as I,
  Cu as J,
  Tu as K,
  Hu as L,
  kd as M,
  vl as Mt,
  J as N,
  xl as Nt,
  tf as O,
  gc as Ot,
  ad as P,
  cu as Q,
  Vu as R,
  mf as S,
  Nc as St,
  ff as T,
  tl as Tt,
  ju as U,
  Nu as V,
  ku as W,
  hu as X,
  eu as Y,
  q as Z,
  Cf as _,
  Pl as _t,
  op as a,
  ou as at,
  yf as b,
  Ol as bt,
  Xf as c,
  pu as ct,
  Bf as d,
  Yl as dt,
  bu as et,
  zf as f,
  Gl as ft,
  xf as g,
  Fl as gt,
  Mf as h,
  Vl as ht,
  hp as i,
  au as it,
  Od as j,
  nl as jt,
  Rd as k,
  Sc as kt,
  Wf as l,
  Xl as lt,
  Lf as m,
  Jl as mt,
  rm as n,
  gu as nt,
  $f as o,
  ru as ot,
  Rf as p,
  Kl as pt,
  wu as q,
  nm as r,
  su as rt,
  Zf as s,
  _u as st,
  _m as t,
  nu as tt,
  Vf as u,
  ql as ut,
  Sf as v,
  K as vt,
  vf as w,
  dl as wt,
  pf as x,
  Tl as xt,
  wf as y,
  Nl as yt,
  Iu as z,
};
