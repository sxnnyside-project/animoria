(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=globalThis,t=e.ShadowRoot&&(e.ShadyCSS===void 0||e.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,n=Symbol(),r=new WeakMap,i=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,n=this.t;if(t&&e===void 0){let t=n!==void 0&&n.length===1;t&&(e=r.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&r.set(n,e))}return e}toString(){return this.cssText}},a=e=>new i(typeof e==`string`?e:e+``,void 0,n),o=(e,...t)=>new i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,n),s=(n,r)=>{if(t)n.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let t of r){let r=document.createElement(`style`),i=e.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=t.cssText,n.appendChild(r)}},c=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return a(t)})(e):e,{is:l,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:ee,getOwnPropertySymbols:te,getPrototypeOf:ne}=Object,f=globalThis,p=f.trustedTypes,re=p?p.emptyScript:``,ie=f.reactiveElementPolyfillSupport,m=(e,t)=>e,h={toAttribute(e,t){switch(t){case Boolean:e=e?re:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},g=(e,t)=>!l(e,t),ae={attribute:!0,type:String,converter:h,reflect:!1,useDefault:!1,hasChanged:g};Symbol.metadata??=Symbol(`metadata`),f.litPropertyMetadata??=new WeakMap;var _=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=ae){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&u(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ae}static _$Ei(){if(this.hasOwnProperty(m(`elementProperties`)))return;let e=ne(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m(`properties`))){let e=this.properties,t=[...ee(e),...te(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(c(e))}else e!==void 0&&t.push(c(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return s(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?h:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?h:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??g)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};_.elementStyles=[],_.shadowRootOptions={mode:`open`},_[m(`elementProperties`)]=new Map,_[m(`finalized`)]=new Map,ie?.({ReactiveElement:_}),(f.reactiveElementVersions??=[]).push(`2.1.2`);var v=globalThis,oe=e=>e,y=v.trustedTypes,se=y?y.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,ce=`$lit$`,b=`lit$${Math.random().toFixed(9).slice(2)}$`,le=`?`+b,ue=`<${le}>`,x=document,S=()=>x.createComment(``),C=e=>e===null||typeof e!=`object`&&typeof e!=`function`,w=Array.isArray,de=e=>w(e)||typeof e?.[Symbol.iterator]==`function`,T=`[ 	
\f\r]`,E=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,fe=/-->/g,pe=/>/g,D=RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),O=/'/g,k=/"/g,A=/^(?:script|style|textarea|title)$/i,j=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),M=Symbol.for(`lit-noChange`),N=Symbol.for(`lit-nothing`),me=new WeakMap,P=x.createTreeWalker(x,129);function he(e,t){if(!w(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return se===void 0?t:se.createHTML(t)}var ge=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=E;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===E?c[1]===`!--`?o=fe:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=D):(A.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=D):o=pe:o===D?c[0]===`>`?(o=i??E,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?D:c[3]===`"`?k:O):o===k||o===O?o=D:o===fe||o===pe?o=E:(o=D,i=void 0);let d=o===D&&e[t+1].startsWith(`/>`)?` `:``;a+=o===E?n+ue:l>=0?(r.push(s),n.slice(0,l)+ce+n.slice(l)+b+d):n+b+(l===-2?t:d)}return[he(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},F=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=ge(t,n);if(this.el=e.createElement(l,r),P.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=P.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(ce)){let t=u[o++],n=i.getAttribute(e).split(b),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?ve:r[1]===`?`?ye:r[1]===`@`?be:R}),i.removeAttribute(e)}else e.startsWith(b)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(A.test(i.tagName)){let e=i.textContent.split(b),t=e.length-1;if(t>0){i.textContent=y?y.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],S()),P.nextNode(),c.push({type:2,index:++a});i.append(e[t],S())}}}else if(i.nodeType===8)if(i.data===le)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(b,e+1))!==-1;)c.push({type:7,index:a}),e+=b.length-1}a++}}static createElement(e,t){let n=x.createElement(`template`);return n.innerHTML=e,n}};function I(e,t,n=e,r){if(t===M)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=C(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=I(e,i._$AS(e,t.values),i,r)),t}var _e=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??x).importNode(t,!0);P.currentNode=r;let i=P.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new L(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new xe(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=P.nextNode(),a++)}return P.currentNode=x,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},L=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=N,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=I(this,e,t),C(e)?e===N||e==null||e===``?(this._$AH!==N&&this._$AR(),this._$AH=N):e!==this._$AH&&e!==M&&this._(e):e._$litType$===void 0?e.nodeType===void 0?de(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==N&&C(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=F.createElement(he(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new _e(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=me.get(e.strings);return t===void 0&&me.set(e.strings,t=new F(e)),t}k(t){w(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(S()),this.O(S()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=oe(e).nextSibling;oe(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},R=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=N,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=N}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=I(this,e,t,0),a=!C(e)||e!==this._$AH&&e!==M,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=I(this,r[n+o],t,o),s===M&&(s=this._$AH[o]),a||=!C(s)||s!==this._$AH[o],s===N?e=N:e!==N&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===N?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},ve=class extends R{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===N?void 0:e}},ye=class extends R{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==N)}},be=class extends R{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=I(this,e,t,0)??N)===M)return;let n=this._$AH,r=e===N&&n!==N||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==N&&(n===N||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},xe=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){I(this,e)}},Se=v.litHtmlPolyfillSupport;Se?.(F,L),(v.litHtmlVersions??=[]).push(`3.3.3`);var Ce=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new L(t.insertBefore(S(),e),e,void 0,n??{})}return i._$AI(e),i},z=globalThis,B=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Ce(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return M}};B._$litElement$=!0,B.finalized=!0,z.litElementHydrateSupport?.({LitElement:B});var we=z.litElementPolyfillSupport;we?.({LitElement:B}),(z.litElementVersions??=[]).push(`4.2.2`);var V=e=>(t,n)=>{n===void 0?customElements.define(e,t):n.addInitializer(()=>{customElements.define(e,t)})},Te={attribute:!0,type:String,converter:h,reflect:!1,hasChanged:g},Ee=(e=Te,t,n)=>{let{kind:r,metadata:i}=n,a=globalThis.litPropertyMetadata.get(i);if(a===void 0&&globalThis.litPropertyMetadata.set(i,a=new Map),r===`setter`&&((e=Object.create(e)).wrapped=!0),a.set(n.name,e),r===`accessor`){let{name:r}=n;return{set(n){let i=t.get.call(this);t.set.call(this,n),this.requestUpdate(r,i,e,!0,n)},init(t){return t!==void 0&&this.C(r,void 0,e,t),t}}}if(r===`setter`){let{name:r}=n;return function(n){let i=this[r];t.call(this,n),this.requestUpdate(r,i,e,!0,n)}}throw Error(`Unsupported decorator location: `+r)};function H(e){return(t,n)=>typeof n==`object`?Ee(e,t,n):((e,t,n)=>{let r=t.hasOwnProperty(n);return t.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(t,n):void 0})(e,t,n)}function U(e){return H({...e,state:!0,attribute:!1})}var W={en:{control:{title:`DX Control Panel`,hybridThemes:`Hybrid Themes`,activeTheme:`Active Theme: `,themeStandalone:`Sxnnyside standalone`,themeDarcula:`IntelliJ Darcula`,themeLight:`IntelliJ Light`,watcherSimulator:`Watcher Simulator`,addRive:`Add Rive (.rive)`,addGif:`Add GIF (.gif)`,modifyAsset:`Modify Asset (success.json)`,removeAsset:`Remove Asset (loading.json)`,language:`Language`},app:{scanningStart:`Starting scan...`},gallery:{title:`Animoria`,searchPlaceholder:`Search animations...`,emptyTitle:`Your workspace is empty`,emptyDesc:`No supported animated assets found in this directory.`,injectDemo:`Inject Demo Animation`,noResults:`No results for `,scanning:`Scanning workspace... `},asset:{parsing:`Parsing...`,unknownError:`Unknown error`},preview:{emptyMessage:`Select an animation to view its detailed metadata`,dimensionsSize:`Dimensions & Size`,dimensions:`Dimensions`,size:`Size`,errorTitle:`Parsing Error`,lottieDetails:`Lottie/dotLottie Details`,fps:`Frame Rate (FPS)`,totalFrames:`Total Frames`,layerCount:`Layer Count`,duration:`Duration`,markers:`Timeline Markers`,dotlottieContent:`dotLottie Archive Content`,riveDetails:`Rive Details`,artboards:`Artboards`,stateMachines:`State Machines`,animations:`Animations`,rasterDetails:`Raster Animation Details`,frameCount:`Frame Count`,loopCount:`Loop Count`,infinite:`Infinite (0)`,svgDetails:`SVG Animation Details`,animationType:`Animation Type`,elementCount:`DOM elements`,format:`Format`},vscode:{loading:`Loading animation...`,assetRemoved:`This asset has been deleted from the workspace.`,livePreview:`Live Preview`,play:`Play`,pause:`Pause`,restart:`Restart`,loop:`Loop`,metadata:`Metadata`,frames:`Frames`,layers:`Layers`,fileSize:`File Size`,usageReferences:`Usage References`,searchingCodebase:`Searching codebase...`,noReferences:`No references found in source files.`,quickActions:`Quick Actions`,copyPath:`Copy Path`,copyName:`Copy Name`,revealInExplorer:`Reveal in Explorer`,notFoundIn:`Not found in {files} source files`,foundIn:`Found in {count} location(s) · {files} files searched · {ms}ms`,loadError:`Failed to load animation.`,hasImages:`HAS IMAGES`,animationsCount:`animations`,none:`None`}},es:{control:{title:`DX Panel de Control`,hybridThemes:`Temas Híbridos`,activeTheme:`Tema activo: `,themeStandalone:`Sxnnyside standalone`,themeDarcula:`IntelliJ Darcula`,themeLight:`IntelliJ Light`,watcherSimulator:`Watcher Simulador`,addRive:`Agregar Rive (.rive)`,addGif:`Agregar GIF (.gif)`,modifyAsset:`Modificar Asset (success.json)`,removeAsset:`Eliminar Asset (loading.json)`,language:`Idioma`},app:{scanningStart:`Iniciando escaneo...`},gallery:{title:`Animoria`,searchPlaceholder:`Buscar animaciones...`,emptyTitle:`Tu espacio de trabajo está vacío`,emptyDesc:`No se encontraron archivos animados soportados en este directorio.`,injectDemo:`Inyectar Animación Demo`,noResults:`Sin resultados para `,scanning:`Escaneando el espacio de trabajo... `},asset:{parsing:`Analizando...`,unknownError:`Error desconocido`},preview:{emptyMessage:`Selecciona una animación para ver sus metadatos detallados`,dimensionsSize:`Dimensiones y Tamaño`,dimensions:`Dimensiones`,size:`Tamaño`,errorTitle:`Error de Análisis`,lottieDetails:`Detalles de Lottie/dotLottie`,fps:`Tasa de FPS`,totalFrames:`Fotogramas Totales`,layerCount:`Cantidad de Capas`,duration:`Duración`,markers:`Marcadores de Línea de Tiempo`,dotlottieContent:`Contenido del Archivo dotLottie`,riveDetails:`Detalles de Rive`,artboards:`Mesas de Trabajo`,stateMachines:`Máquinas de Estado`,animations:`Animaciones`,rasterDetails:`Detalles de Animación Raster`,frameCount:`Cantidad de Fotogramas`,loopCount:`Cantidad de Bucles`,infinite:`Infinito (0)`,svgDetails:`Detalles de Animación SVG`,animationType:`Tipo de Animación`,elementCount:`Elementos DOM`,format:`Formato`},vscode:{loading:`Cargando animación...`,assetRemoved:`Este asset ha sido eliminado del espacio de trabajo.`,livePreview:`Vista Previa en Vivo`,play:`Reproducir`,pause:`Pausar`,restart:`Reiniciar`,loop:`Bucle`,metadata:`Metadatos`,frames:`Fotogramas`,layers:`Capas`,fileSize:`Tamaño de archivo`,usageReferences:`Referencias de Uso`,searchingCodebase:`Buscando en la base de código...`,noReferences:`No se encontraron referencias en los archivos fuente.`,quickActions:`Acciones Rápidas`,copyPath:`Copiar Ruta`,copyName:`Copiar Nombre`,revealInExplorer:`Mostrar en el Explorador`,notFoundIn:`No encontrado en {files} archivos fuente`,foundIn:`Encontrado en {count} ubicación(es) · {files} archivos buscados · {ms}ms`,loadError:`Error al cargar la animación.`,hasImages:`CONTIENE IMÁGENES`,animationsCount:`animaciones`,none:`Ninguno`}},ja:{control:{title:`DX コントロールパネル`,hybridThemes:`ハイブリッドテーマ`,activeTheme:`有効なテーマ: `,themeStandalone:`Sxnnyside スタンドアロン`,themeDarcula:`IntelliJ Darcula`,themeLight:`IntelliJ Light`,watcherSimulator:`ウォッチャーシミュレータ`,addRive:`Rive を追加 (.rive)`,addGif:`GIF を追加 (.gif)`,modifyAsset:`アセットを変更 (success.json)`,removeAsset:`アセットを削除 (loading.json)`,language:`言語`},app:{scanningStart:`スキャンを開始中...`},gallery:{title:`Animoria`,searchPlaceholder:`アニメーションを検索...`,emptyTitle:`ワークスペースが空です`,emptyDesc:`このディレクトリにサポートされているアニメーションアセットが見つかりませんでした。`,injectDemo:`デモアニメーションを注入`,noResults:`検索結果がありません： `,scanning:`ワークスペースをスキャン中... `},asset:{parsing:`解析中...`,unknownError:`不明なエラー`},preview:{emptyMessage:`アニメーションを選択して詳細なメタデータを表示します`,dimensionsSize:`ディメンションとサイズ`,dimensions:`寸法 (幅×高さ)`,size:`ファイルサイズ`,errorTitle:`解析エラー`,lottieDetails:`Lottie/dotLottie の詳細`,fps:`フレームレート (FPS)`,totalFrames:`総フレーム数`,layerCount:`レイヤー数`,duration:`再生時間`,markers:`タイムラインマーカー`,dotlottieContent:`dotLottie アーカイブの内容`,riveDetails:`Rive の詳細`,artboards:`アートボード`,stateMachines:`ステートマシン`,animations:`アニメーション`,rasterDetails:`ラスターアニメーションの詳細`,frameCount:`総フレーム数`,loopCount:`ループ回数`,infinite:`無限 (0)`,svgDetails:`SVG アニメーションの詳細`,animationType:`アニメーションタイプ`,elementCount:`DOM 要素数`,format:`フォーマット`},vscode:{loading:`アニメーションを読み込み中...`,assetRemoved:`このアセットはワークスペースから削除されました。`,livePreview:`ライブプレビュー`,play:`再生`,pause:`一時停止`,restart:`再起動`,loop:`ループ`,metadata:`メタデータ`,frames:`フレーム数`,layers:`レイヤー数`,fileSize:`ファイルサイズ`,usageReferences:`使用場所の参照`,searchingCodebase:`コードベースを検索中...`,noReferences:`ソースファイルに参照が見つかりませんでした。`,quickActions:`クイックアクション`,copyPath:`パスをコピー`,copyName:`名前をコピー`,revealInExplorer:`エクスプローラーで表示`,notFoundIn:`{files} 個のソースファイルで見つかりませんでした`,foundIn:`{count} 箇所で見つかりました · {files} ファイル検索 · {ms}ms`,loadError:`アニメーションの読み込みに失敗しました。`,hasImages:`画像あり`,animationsCount:`アニメーション`,none:`なし`}},fr:{control:{title:`Panneau de Contrôle DX`,hybridThemes:`Thèmes Hybrides`,activeTheme:`Thème actif: `,themeStandalone:`Sxnnyside autonome`,themeDarcula:`IntelliJ Darcula`,themeLight:`IntelliJ Light`,watcherSimulator:`Simulateur d'observateur`,addRive:`Ajouter Rive (.rive)`,addGif:`Ajouter GIF (.gif)`,modifyAsset:`Modifier Asset (success.json)`,removeAsset:`Supprimer Asset (loading.json)`,language:`Langue`},app:{scanningStart:`Démarrage de l'analyse...`},gallery:{title:`Animoria`,searchPlaceholder:`Rechercher des animations...`,emptyTitle:`Votre espace de travail est vide`,emptyDesc:`Aucun fichier d'animation pris en charge trouvé dans ce dossier.`,injectDemo:`Injecter l'animation de démonstration`,noResults:`Aucun résultat pour `,scanning:`Analyse de l'espace de travail... `},asset:{parsing:`Analyse...`,unknownError:`Erreur inconnue`},preview:{emptyMessage:`Sélectionnez une animation pour afficher ses métadonnées`,dimensionsSize:`Dimensions & Taille`,dimensions:`Dimensions`,size:`Taille`,errorTitle:`Erreur d'analyse`,lottieDetails:`Détails Lottie/dotLottie`,fps:`Fréquence d'images (FPS)`,totalFrames:`Total de Frames`,layerCount:`Nombre de calques`,duration:`Durée`,markers:`Marqueurs temporels`,dotlottieContent:`Contenu de l'archive dotLottie`,riveDetails:`Détails Rive`,artboards:`Plans de travail (Artboards)`,stateMachines:`Machines d'état`,animations:`Animations`,rasterDetails:`Détails de l'animation trame (Raster)`,frameCount:`Nombre de frames`,loopCount:`Nombre de boucles`,infinite:`Infini (0)`,svgDetails:`Détails de l'animation SVG`,animationType:`Type d'animation`,elementCount:`Éléments DOM`,format:`Format`},vscode:{loading:`Chargement de l'animation...`,assetRemoved:`Cet asset a été supprimé de l'espace de travail.`,livePreview:`Aperçu en Direct`,play:`Lire`,pause:`Pause`,restart:`Recommencer`,loop:`Boucle`,metadata:`Métadonnées`,frames:`Frames`,layers:`Calques`,fileSize:`Taille du fichier`,usageReferences:`Références d'Utilisation`,searchingCodebase:`Recherche dans le code source...`,noReferences:`Aucune référence trouvée dans les fichiers source.`,quickActions:`Actions Rapides`,copyPath:`Copier le Chemin`,copyName:`Copier le Nom`,revealInExplorer:`Révéler dans l'Explorateur`,notFoundIn:`Non trouvé dans {files} fichiers source`,foundIn:`Trouvé dans {count} emplacement(s) · {files} fichiers recherchés · {ms}ms`,loadError:`Échec du chargement de l'animation.`,hasImages:`CONTIENT DES IMAGES`,animationsCount:`animations`,none:`Aucun`}},"zh-CN":{control:{title:`DX 控制面板`,hybridThemes:`混合主题`,activeTheme:`当前主题: `,themeStandalone:`Sxnnyside 独立模式`,themeDarcula:`IntelliJ Darcula`,themeLight:`IntelliJ Light`,watcherSimulator:`文件监听模拟器`,addRive:`添加 Rive (.rive)`,addGif:`添加 GIF (.gif)`,modifyAsset:`修改资源 (success.json)`,removeAsset:`删除资源 (loading.json)`,language:`语言`},app:{scanningStart:`正在启动扫描...`},gallery:{title:`Animoria`,searchPlaceholder:`搜索动画...`,emptyTitle:`您的工作区为空`,emptyDesc:`在此目录中未检测到支持的动画资源。`,injectDemo:`注入演示动画`,noResults:`没有找到相关结果： `,scanning:`正在扫描工作区... `},asset:{parsing:`正在解析...`,unknownError:`未知错误`},preview:{emptyMessage:`选择一个动画以查看其详细的元数据`,dimensionsSize:`尺寸与大小`,dimensions:`尺寸`,size:`文件大小`,errorTitle:`解析错误`,lottieDetails:`Lottie/dotLottie 详情`,fps:`帧率 (FPS)`,totalFrames:`总帧数`,layerCount:`图层数量`,duration:`持续时间`,markers:`时间轴标记`,dotlottieContent:`dotLottie 归档内容`,riveDetails:`Rive 详情`,artboards:`画板 (Artboards)`,stateMachines:`状态机`,animations:`动画列表`,rasterDetails:`光栅动画详情`,frameCount:`总帧数`,loopCount:`循环次数`,infinite:`无限循环 (0)`,svgDetails:`SVG 动画详情`,animationType:`动画类型`,elementCount:`DOM 元素数量`,format:`格式`},vscode:{loading:`正在加载动画...`,assetRemoved:`此资源已从工作区中删除。`,livePreview:`实时预览`,play:`播放`,pause:`暂停`,restart:`重新开始`,loop:`循环`,metadata:`元数据`,frames:`帧数`,layers:`图层`,fileSize:`文件大小`,usageReferences:`使用引用`,searchingCodebase:`正在搜索代码库...`,noReferences:`在源文件中未找到引用。`,quickActions:`快捷操作`,copyPath:`复制路径`,copyName:`复制名称`,revealInExplorer:`在资源管理器中显示`,notFoundIn:`在 {files} 个源文件中未找到`,foundIn:`在 {count} 处找到 · 已搜索 {files} 个文件 · 耗时 {ms} 毫秒`,loadError:`加载动画失败。`,hasImages:`包含图像`,animationsCount:`个动画`,none:`无`}}};function G(e,t=`en`){let n=W[t]||W.en,r=e.split(`.`),i=n;for(let t of r)if(i&&typeof i==`object`&&t in i)i=i[t];else{let t=W.en;for(let n of r)if(t&&typeof t==`object`&&n in t)t=t[n];else return e;return typeof t==`string`?t:e}return typeof i==`string`?i:e}function K(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a}var q=class extends B{constructor(...e){super(...e),this.name=``,this.format=``}static{this.styles=o`
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
      transition:
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.2s ease;
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
      0%,
      100% {
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
  `}_getDeterministicGradient(e){if(!e)return`linear-gradient(135deg, #4f46e5, #06b6d4)`;let t=0;for(let n=0;n<e.length;n++)t=e.charCodeAt(n)+((t<<5)-t);let n=Math.abs(t)%360;return`linear-gradient(135deg, hsl(${n}, 65%, 45%), hsl(${(n+40)%360}, 60%, 35%))`}render(){return j`
      <div class="canvas" style="background: ${this._getDeterministicGradient(this.name)};">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <!-- Onda del timeline -->
          <path class="motion-path" d="M2 12 C 5 6, 8 18, 12 12 C 16 6, 19 18, 22 12" />
          <!-- Playhead central indicando control temporal -->
          <circle class="playhead" cx="12" cy="12" r="2" />
        </svg>
        <span class="format-badge">${this.format?this.format.substring(0,3):`LOTT`}</span>
      </div>
    `}};K([H({type:String})],q.prototype,`name`,void 0),K([H({type:String})],q.prototype,`format`,void 0),q=K([V(`animoria-thumbnail-fallback`)],q);var J=class extends B{constructor(...e){super(...e),this.locale=`en`}static{this.styles=o`
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
  `}t(e){return G(e,this.locale)}_onClick(){this.dispatchEvent(new CustomEvent(`select-asset`,{detail:{asset:this.asset},bubbles:!0,composed:!0}))}render(){let{asset:e}=this;return e?j`
      <div class="item" @click="${this._onClick}">
        ${e.thumbnailPath?j` <img class="thumbnail" src="${e.thumbnailPath}" alt="${e.name}" /> `:j`
              <animoria-thumbnail-fallback
                .name="${e.name}"
                .format="${e.format}"
              ></animoria-thumbnail-fallback>
            `}

        <div class="info">
          <span class="stem">${e.stem}</span>
          ${e.status===`parsed`&&e.metadata?j`
                <span class="meta">
                  ${`fps`in e.metadata?j`${e.metadata.fps}fps &middot; `:``}
                  ${e.metadata.durationSeconds}s &middot;
                  ${e.metadata.width}&times;${e.metadata.height}
                </span>
              `:e.status===`error`?j` <span class="error">${e.error??this.t(`asset.unknownError`)}</span> `:j` <span class="pending">${this.t(`asset.parsing`)}&hellip;</span> `}
        </div>
      </div>
    `:j``}};K([H({type:Object})],J.prototype,`asset`,void 0),K([H({type:String})],J.prototype,`locale`,void 0),J=K([V(`animoria-asset-item`)],J);var Y=class extends B{constructor(...e){super(...e),this.assets=[],this.loading=!1,this.progressMessage=``,this.progressPercent=0,this.workspacePath=``,this.locale=`en`,this._query=``}static{this.styles=o`
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
      transition:
        background-color 0.2s ease,
        transform 0.1s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .inject-btn:hover {
      background: var(--animoria-accent-hover);
    }

    .inject-btn:active {
      transform: scale(0.97);
    }
  `}t(e){return G(e,this.locale)}get filteredAssets(){if(!this._query)return this.assets;let e=this._query.toLowerCase();return this.assets.filter(t=>t.name.toLowerCase().includes(e)||t.stem.toLowerCase().includes(e))}_onInput(e){this._query=e.target.value}_onInjectDemo(){window.postMessage({command:`injectDemo`,target:`extension`},`*`)}render(){let e=this.filteredAssets;return j`
      <div class="header">
        <span class="title">${this.t(`gallery.title`)}</span>
        <span class="count">${this.assets.length}</span>
      </div>

      ${this.loading?j`
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${this.progressPercent}%"></div>
            </div>
          `:``}

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
        ${this.loading&&this.assets.length===0?j`
              <p class="empty">
                ${this.progressMessage||this.t(`gallery.scanning`)} (${this.progressPercent}%)
              </p>
            `:this.assets.length===0?j`
                <div class="empty-card">
                  <div class="empty-icon">📂</div>
                  <p class="empty-title">${this.t(`gallery.emptyTitle`)}</p>
                  <p class="empty-desc">${this.t(`gallery.emptyDesc`)}</p>
                  <button class="inject-btn" @click="${this._onInjectDemo}">
                    ${this.t(`gallery.injectDemo`)}
                  </button>
                </div>
              `:e.length===0?j`
                  <p class="empty">${this.t(`gallery.noResults`)} &ldquo;${this._query}&rdquo;</p>
                `:e.map(e=>j`
                    <animoria-asset-item
                      .asset="${e}"
                      .locale="${this.locale}"
                    ></animoria-asset-item>
                  `)}
      </div>
    `}};K([H({type:Array})],Y.prototype,`assets`,void 0),K([H({type:Boolean})],Y.prototype,`loading`,void 0),K([H({type:String})],Y.prototype,`progressMessage`,void 0),K([H({type:Number})],Y.prototype,`progressPercent`,void 0),K([H({type:String})],Y.prototype,`workspacePath`,void 0),K([H({type:String})],Y.prototype,`locale`,void 0),K([U()],Y.prototype,`_query`,void 0),Y=K([V(`animoria-gallery`)],Y);var X=class extends B{constructor(...e){super(...e),this.locale=`en`,this._currentTheme=`theme-sandbox-standalone`}static{this.styles=o`
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
      transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
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
  `}connectedCallback(){super.connectedCallback(),this._setTheme(this._currentTheme)}t(e){return G(e,this.locale)}_setTheme(e){this._currentTheme=e,document.body.className=``,document.body.classList.add(e)}_onLangChange(e){let t=e.target;this.dispatchEvent(new CustomEvent(`change-locale`,{detail:{locale:t.value},bubbles:!0,composed:!0}))}_emitWatcherEvent(e,t){window.postMessage({command:`watcherEvent`,type:e,asset:t},`*`)}_simulateAddRive(){let e={path:`/workspace/assets/animations/hero.rive`,name:`hero.rive`,stem:`hero`,format:`rive`,sizeBytes:94800,mtime:Date.now(),status:`parsed`,metadata:{format:`rive`,width:1024,height:768,durationSeconds:12.5,artboards:[`hero-header`,`compact-view`],stateMachines:[`StateMachineMain`],animations:[`intro_reveal`,`hover_pulse`,`outro_collapse`]}};this._emitWatcherEvent(`added`,e)}_simulateAddGif(){let e={path:`/workspace/assets/animations/loading-spinner.gif`,name:`loading-spinner.gif`,stem:`loading-spinner`,format:`gif`,sizeBytes:43200,mtime:Date.now(),status:`parsed`,metadata:{format:`gif`,width:64,height:64,durationSeconds:.8,frameCount:24,loopCount:0}};this._emitWatcherEvent(`added`,e)}_simulateModifyAsset(){let e={path:`/workspace/assets/animations/success.json`,name:`success.json`,stem:`success`,format:`lottie`,sizeBytes:4200,mtime:Date.now(),status:`parsed`,metadata:{format:`lottie`,fps:60,durationSeconds:1.5,totalFrames:90,width:512,height:512,layerCount:12}};this._emitWatcherEvent(`modified`,e)}_simulateRemoveAsset(){let e={path:`/workspace/assets/animations/loading.json`,name:`loading.json`,stem:`loading`,format:`lottie`,sizeBytes:3800,mtime:Date.now(),status:`parsed`};this._emitWatcherEvent(`removed`,e)}render(){return j`
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
      <div class="theme-info">
        ${this.t(`control.activeTheme`)}<strong>${this._currentTheme}</strong>
      </div>

      <button
        class="btn ${this._currentTheme===`theme-sandbox-standalone`?`active`:``}"
        @click="${()=>this._setTheme(`theme-sandbox-standalone`)}"
      >
        ${this.t(`control.themeStandalone`)}
      </button>
      <button
        class="btn ${this._currentTheme===`theme-intellij-dark`?`active`:``}"
        @click="${()=>this._setTheme(`theme-intellij-dark`)}"
      >
        ${this.t(`control.themeDarcula`)}
      </button>
      <button
        class="btn ${this._currentTheme===`theme-intellij-light`?`active`:``}"
        @click="${()=>this._setTheme(`theme-intellij-light`)}"
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
    `}};K([H({type:String})],X.prototype,`locale`,void 0),K([U()],X.prototype,`_currentTheme`,void 0),X=K([V(`sandbox-control-panel`)],X);var Z=class extends B{constructor(...e){super(...e),this.asset=null,this.locale=`en`}static{this.styles=o`
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
  `}t(e){return G(e,this.locale)}_formatSize(e){if(e<1024)return`${e} B`;let t=e/1024;return t<1024?`${t.toFixed(1)} KB`:`${(t/1024).toFixed(1)} MB`}_renderMetadataDetails(){let{asset:e}=this;if(!e||e.status!==`parsed`||!e.metadata)return j``;let{metadata:t}=e;switch(t.format){case`lottie`:case`dotlottie`:return j`
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

          ${t.markers&&t.markers.length>0?j`
                <div class="section">
                  <h3 class="section-title">${this.t(`preview.markers`)}</h3>
                  <div class="list">
                    ${t.markers.map(e=>j`
                        <div class="list-item">
                          <strong>${e.name}</strong> (frame ${e.frame}, duration
                          ${e.durationFrames}f)
                        </div>
                      `)}
                  </div>
                </div>
              `:``}
          ${t.dotLottie&&t.dotLottie.animations.length>0?j`
                <div class="section">
                  <h3 class="section-title">${this.t(`preview.dotlottieContent`)}</h3>
                  <div class="list">
                    ${t.dotLottie.animations.map(e=>j`
                        <div class="list-item">
                          ID: <code>${e.id}</code>${e.name?` (${e.name})`:``}
                        </div>
                      `)}
                  </div>
                </div>
              `:``}
        `;case`rive`:return j`
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
              ${t.artboards.map(e=>j`<span class="badge-item">${e}</span>`)}
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t(`preview.stateMachines`)}</h3>
            <div class="badge-grid">
              ${t.stateMachines.map(e=>j`<span class="badge-item">${e}</span>`)}
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">${this.t(`preview.animations`)}</h3>
            <div class="badge-grid">
              ${t.animations.map(e=>j`<span class="badge-item">${e}</span>`)}
            </div>
          </div>
        `;case`gif`:case`apng`:return j`
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
                  ${t.loopCount===0?this.t(`preview.infinite`):t.loopCount}
                </span>
              </div>
              <div class="grid-item">
                <span class="grid-label">${this.t(`preview.duration`)}</span>
                <span class="grid-value">${t.durationSeconds}s</span>
              </div>
            </div>
          </div>
        `;case`animated-svg`:return j`
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
        `;default:return j``}}render(){let{asset:e}=this;return e?j`
      <div class="container">
        <div class="thumbnail-preview">
          ${e.thumbnailPath?j` <img class="thumbnail-img" src="${e.thumbnailPath}" alt="${e.name}" /> `:j`
                <animoria-thumbnail-fallback
                  .name="${e.name}"
                  .format="${e.format}"
                  style="width: 80px; height: 80px;"
                ></animoria-thumbnail-fallback>
              `}
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
                ${e.metadata?j`${e.metadata.width}&times;${e.metadata.height}`:`—`}
              </span>
            </div>
            <div class="grid-item">
              <span class="grid-label">${this.t(`preview.size`)}</span>
              <span class="grid-value">${this._formatSize(e.sizeBytes)}</span>
            </div>
          </div>
        </div>

        ${e.status===`error`?j`
              <div class="section" style="border-color: var(--animoria-error-text);">
                <h3 class="section-title" style="color: var(--animoria-error-text);">
                  ${this.t(`preview.errorTitle`)}
                </h3>
                <div
                  class="list-item"
                  style="color: var(--animoria-error-text); background: rgba(244, 63, 94, 0.05);"
                >
                  ${e.error??`Unknown validation/parsing error`}
                </div>
              </div>
            `:this._renderMetadataDetails()}
      </div>
    `:j`
        <div class="empty-state">
          <div class="empty-icon">&spar;</div>
          <div>${this.t(`preview.emptyMessage`)}</div>
        </div>
      `}};K([H({type:Object})],Z.prototype,`asset`,void 0),K([H({type:String})],Z.prototype,`locale`,void 0),Z=K([V(`animoria-preview-panel`)],Z);var Q=[{path:`/workspace/assets/animations/success.json`,name:`success.json`,stem:`success`,format:`lottie`,sizeBytes:4200,mtime:Date.now(),status:`parsed`,metadata:{format:`lottie`,fps:30,durationSeconds:3,totalFrames:90,width:512,height:512,layerCount:8,markers:[{name:`intro`,frame:0,durationFrames:30},{name:`loop`,frame:30,durationFrames:60}]}},{path:`/workspace/assets/animations/loading.json`,name:`loading.json`,stem:`loading`,format:`lottie`,sizeBytes:3800,mtime:Date.now(),status:`parsed`,metadata:{format:`lottie`,fps:30,durationSeconds:2,totalFrames:60,width:256,height:256,layerCount:3}},{path:`/workspace/assets/animations/confetti.json`,name:`confetti.json`,stem:`confetti`,format:`lottie`,sizeBytes:5100,mtime:Date.now(),status:`parsed`,metadata:{format:`lottie`,fps:60,durationSeconds:4,totalFrames:240,width:1024,height:1024,layerCount:15}},{path:`/workspace/assets/animations/logo.rive`,name:`logo.rive`,stem:`logo`,format:`rive`,sizeBytes:85200,mtime:Date.now(),status:`parsed`,metadata:{format:`rive`,width:800,height:600,durationSeconds:5,artboards:[`main`,`compact`],stateMachines:[`StateMachine1`,`HoverTransition`],animations:[`idle`,`rotate`,`success_trigger`]}},{path:`/workspace/assets/animations/loader.gif`,name:`loader.gif`,stem:`loader`,format:`gif`,sizeBytes:154e3,mtime:Date.now(),status:`parsed`,metadata:{format:`gif`,width:128,height:128,durationSeconds:1.5,frameCount:45,loopCount:0}},{path:`/workspace/assets/animations/animated-wave.svg`,name:`animated-wave.svg`,stem:`animated-wave`,format:`animated-svg`,sizeBytes:12e3,mtime:Date.now(),status:`parsed`,metadata:{format:`animated-svg`,width:400,height:200,durationSeconds:8,animationType:`css`,elementCount:12}},{path:`/workspace/assets/animations/error-example.json`,name:`error-example.json`,stem:`error-example`,format:`lottie`,sizeBytes:200,mtime:Date.now(),status:`error`,error:`Validation failed: structural key "layers" is missing`}];new class{constructor(){if(!(typeof window<`u`&&(window.location.protocol===`http:`||window.location.protocol===`https:`))){console.log(`[Animoria Host] Running in native IDE environment. Mock host disabled.`);return}window.addEventListener(`message`,e=>{e.data&&e.data.target===`extension`&&this._handleFrontendMessage(e.data)})}_postToFrontend(e,t){window.postMessage({command:e,...t},`*`)}_handleFrontendMessage(e){if(!(!e||!e.command))switch(console.log(`[Mock Extension Host] Received: ${e.command}`,e),e.command){case`scan`:this._simulateScan();break;case`openPreview`:console.log(`[Mock Host] Opening preview for: ${e.asset.name}`);break;case`deleteAsset`:console.log(`[Mock Host] Deleting asset: ${e.path}`),this._postToFrontend(`assetDeleted`,{path:e.path});break;case`injectDemo`:console.log(`[Mock Host] Injecting demo asset...`);let t={path:`/workspace/assets/animations/brand-logo.rive`,name:`brand-logo.rive`,stem:`brand-logo`,format:`rive`,sizeBytes:102400,mtime:Date.now(),status:`parsed`,metadata:{format:`rive`,width:500,height:500,durationSeconds:0,artboards:[`BrandLogoBoard`],stateMachines:[`BrandAnimationController`],animations:[`spin`,`glow`,`pulse`]}};this._postToFrontend(`watcherEvent`,{type:`added`,asset:t});break}}_simulateScan(){this._postToFrontend(`scanProgress`,{message:`Starting recursive directory crawler...`,index:0,total:3,assets:[]}),setTimeout(()=>{this._postToFrontend(`scanProgress`,{message:`Searching for "v" and "layers" keys in the first chunk (1KB)...`,index:1,total:3,assets:Q.slice(0,2)})},400),setTimeout(()=>{this._postToFrontend(`scanProgress`,{message:`Generating metadata for asset queue...`,index:2,total:3,assets:Q.slice(0,5)})},800),setTimeout(()=>{this._postToFrontend(`scanComplete`,{assets:Q,durationMs:142,parsedCount:6})},1200)}};var $=class extends B{constructor(...e){super(...e),this._assets=[],this._loading=!1,this._progressMessage=``,this._progressPercent=0,this._selectedAsset=null,this._locale=`en`,this._handleMessage=e=>{let t=e.data;if(!(!t||!t.command))switch(t.command){case`scanProgress`:this._progressMessage=t.message,t.total>0?this._progressPercent=Math.round(t.index/t.total*100):this._progressPercent=0,t.assets&&(this._assets=t.assets);break;case`scanComplete`:this._assets=t.assets,this._loading=!1,this._progressMessage=``,this._progressPercent=100;break;case`watcherEvent`:this._handleWatcherEvent(t.type,t.asset);break;case`assetDeleted`:this._assets=this._assets.filter(e=>e.path!==t.path),this._selectedAsset?.path===t.path&&(this._selectedAsset=null);break}}}static{this.styles=o`
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
  `}connectedCallback(){super.connectedCallback(),window.addEventListener(`message`,this._handleMessage),this._triggerScan()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener(`message`,this._handleMessage)}t(e){return G(e,this._locale)}_triggerScan(){this._loading=!0,this._progressMessage=this.t(`app.scanningStart`),this._progressPercent=0,this._selectedAsset=null,window.postMessage({command:`scan`,target:`extension`},`*`)}_onSelectAsset(e){this._selectedAsset=e.detail.asset}_onChangeLocale(e){this._locale=e.detail.locale,this._loading&&this._progressMessage===G(`app.scanningStart`,this._locale===`en`?`es`:`en`)&&(this._progressMessage=this.t(`app.scanningStart`))}_handleWatcherEvent(e,t){e===`added`?this._assets.some(e=>e.path===t.path)||(this._assets=[...this._assets,t]):e===`modified`?(this._assets=this._assets.map(e=>e.path===t.path?t:e),this._selectedAsset?.path===t.path&&(this._selectedAsset=t)):e===`removed`&&(this._assets=this._assets.filter(e=>e.path!==t.path),this._selectedAsset?.path===t.path&&(this._selectedAsset=null))}render(){return j`
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
      <sandbox-control-panel .locale="${this._locale}"></sandbox-control-panel>
    `}};K([U()],$.prototype,`_assets`,void 0),K([U()],$.prototype,`_loading`,void 0),K([U()],$.prototype,`_progressMessage`,void 0),K([U()],$.prototype,`_progressPercent`,void 0),K([U()],$.prototype,`_selectedAsset`,void 0),K([U()],$.prototype,`_locale`,void 0),$=K([V(`animoria-app`)],$);