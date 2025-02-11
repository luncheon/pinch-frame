const clamp = (x, min, max) => x < min ? min : x > max ? max : x;
const clampZero = (x) => x < 0 ? 0 : x;
const preventDefault = (event) => event.preventDefault();
const throttle = (callback) => {
  let handle;
  const wrappedCallback = () => (handle = void 0, callback());
  return [
    () => handle ??= requestAnimationFrame(wrappedCallback),
    () => handle !== void 0 && (cancelAnimationFrame(handle), handle = void 0)
  ];
};
const computedStyleCache = /* @__PURE__ */ new WeakMap();
const cachedComputedStyle = (element) => {
  let computedStyle = computedStyleCache.get(element);
  if (!computedStyle) {
    computedStyle = getComputedStyle(element);
    computedStyleCache.set(element, computedStyle);
  }
  return computedStyle;
};
const accumulateInverseCssZoom = CSS.supports("zoom", "1") ? (element) => {
  let zoom = 1;
  for (; element; element = element.parentElement) zoom *= cachedComputedStyle(element).zoom;
  return 1 / zoom;
} : () => 1;
class ScrollableFrame extends HTMLElement {
  static observedAttributes = ["scale", "min-scale", "max-scale", "offset-x", "offset-y"];
  #scale = 1;
  get scale() {
    return this.#scale;
  }
  set scale(scale) {
    scale = clamp(scale, this.#minScale, this.#maxScale);
    if (this.#scale !== scale) {
      this.#setAttribute("scale", this.#scale = scale);
      this.#content.style.transform = `scale(${scale})`;
    }
  }
  #minScale = 0.1;
  get minScale() {
    return this.#minScale;
  }
  set minScale(minScale) {
    if (this.#minScale !== minScale && minScale > 0) {
      this.#setAttribute("min-scale", this.#minScale = minScale);
      this.#scale < minScale && (this.scale = minScale);
    }
  }
  #maxScale = 100;
  get maxScale() {
    return this.#maxScale;
  }
  set maxScale(maxScale) {
    if (this.#maxScale !== maxScale && maxScale > 0) {
      this.#setAttribute("max-scale", this.#maxScale = maxScale);
      this.#scale > maxScale && (this.scale = maxScale);
    }
  }
  #offsetX = 0;
  get offsetX() {
    return this.#offsetX;
  }
  set offsetX(offsetX) {
    this.setOffset(offsetX, this.#offsetY);
  }
  #offsetY = 0;
  get offsetY() {
    return this.#offsetY;
  }
  set offsetY(offsetY) {
    this.setOffset(this.#offsetX, offsetY);
  }
  #marginX = 0;
  #marginY = 0;
  #container;
  #topLeft;
  #content;
  #disableScrollEventTemporarily;
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = "<div part=container><div part=top-left></div><slot part=content></slot></div>";
    this.#container = shadowRoot.firstElementChild;
    this.#topLeft = this.#container.firstElementChild;
    this.#content = this.#topLeft.nextElementSibling;
    {
      let isScrollEventEnabled = 1;
      const [reserveListeningScrollEvent] = throttle(() => isScrollEventEnabled = 1);
      this.#disableScrollEventTemporarily = () => {
        reserveListeningScrollEvent();
        isScrollEventEnabled = 0;
      };
      this.addEventListener("scroll", () => {
        if (isScrollEventEnabled) {
          const offset = this.#getCTMs()[0].transformPoint({ x: this.#marginX - this.scrollLeft, y: this.#marginY - this.scrollTop });
          this.#setAttribute("offset-x", this.#offsetX = offset.x);
          this.#setAttribute("offset-y", this.#offsetY = offset.y);
        }
      });
    }
  }
  #isAttributeChangedCallbackEnabled = 1;
  #setAttribute(name, value) {
    this.#isAttributeChangedCallbackEnabled = 0;
    this.setAttribute(name, value);
    this.#isAttributeChangedCallbackEnabled = 1;
  }
  connectedCallback() {
    this.#setAttribute("scale", this.#scale);
    this.#setAttribute("min-scale", this.#minScale);
    this.#setAttribute("max-scale", this.#maxScale);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.#isAttributeChangedCallbackEnabled && oldValue !== newValue && newValue !== null) {
      if (name === "offset-x") {
        this.offsetX = +newValue;
      } else if (name === "offset-y") {
        this.offsetY = +newValue;
      } else if (name === "scale") {
        this.scale = +newValue;
      } else if (name === "min-scale") {
        this.minScale = +newValue;
      } else if (name === "max-scale") {
        this.maxScale = +newValue;
      }
    }
  }
  #memoizedCTMString = "";
  #memoizedCTMs = [new DOMMatrixReadOnly(), new DOMMatrixReadOnly()];
  #getCTMs() {
    let ctmString = "";
    for (let element = this; element; element = element.parentElement) {
      const transform = cachedComputedStyle(element).transform;
      transform && transform !== "none" && (ctmString = `${transform} ${ctmString}`);
    }
    if (this.#memoizedCTMString !== ctmString) {
      const ctm = new DOMMatrix(ctmString);
      ctm.e = ctm.f = 0;
      this.#memoizedCTMString = ctmString;
      this.#memoizedCTMs = [ctm, ctm.inverse()];
    }
    return this.#memoizedCTMs;
  }
  setOffset(offsetX, offsetY) {
    if (this.#offsetX === offsetX && this.#offsetY === offsetY) {
      return;
    }
    this.#setAttribute("offset-x", this.#offsetX = offsetX);
    this.#setAttribute("offset-y", this.#offsetY = offsetY);
    const { x, y } = this.#getCTMs()[1].transformPoint({ x: offsetX, y: offsetY });
    const containerStyle = this.#container.style;
    containerStyle.margin = `${this.#marginY = clampZero(y)}px 0 0 ${this.#marginX = clampZero(x)}px`;
    containerStyle.width = `${x < 0 ? this.clientWidth - x : 0}px`;
    containerStyle.height = `${y < 0 ? this.clientHeight - y : 0}px`;
    this.#disableScrollEventTemporarily();
    this.scrollTo(clampZero(-x), clampZero(-y));
  }
  _zoom(scaleRatio, originClientX, originClientY) {
    const previousScale = this.#scale;
    const scale = clamp(previousScale * scaleRatio, this.#minScale, this.#maxScale);
    if (scale !== previousScale) {
      const offsetScale = scale / previousScale - 1;
      const topLeft = this.#topLeft.getBoundingClientRect();
      this.scale = scale;
      this.setOffset(this.#offsetX + offsetScale * (topLeft.x - originClientX), this.#offsetY + offsetScale * (topLeft.y - originClientY));
    }
  }
  /**
   * Zoom keeping the apparent position of `(origin.x, origin.y)`. Zoom in when `scaleRatio > 1` and zoom out when `scaleRatio < 1`. `origin.x` and `origin.y` can be specified as a `number` (px) or a `` `${number}%` ``. The default value for both is `"50%"` (center).
   */
  zoom(scaleRatio, origin) {
    if (scaleRatio === 1) {
      return;
    }
    const rect = this.getBoundingClientRect();
    const originX = origin?.x ?? rect.width / 2;
    const originY = origin?.y ?? rect.height / 2;
    this._zoom(
      scaleRatio,
      rect.x + (typeof originX === "number" ? originX : rect.width * parseFloat(originX) * 0.01),
      rect.y + (typeof originY === "number" ? originY : rect.height * parseFloat(originY) * 0.01)
    );
  }
  /**
   * Adjust the scale and offset to display the entire content.
   */
  fit(options) {
    const { offsetWidth: width, offsetHeight: height } = this;
    const { offsetWidth: contentWidth, offsetHeight: contentHeight } = this.#content;
    const marginX = options?.marginX ?? 0;
    const marginY = options?.marginY ?? 0;
    const widthBasedScale = (width - marginX - marginX) / contentWidth;
    const heightBasedScale = (height - marginY - marginY) / contentHeight;
    if (widthBasedScale < heightBasedScale) {
      this.scale = widthBasedScale;
      this.setOffset(marginX, Math.floor(height - contentHeight * widthBasedScale) / 2);
    } else {
      this.scale = heightBasedScale;
      this.setOffset(Math.floor(width - contentWidth * heightBasedScale) / 2, marginY);
    }
  }
  /**
   * Adjust the scale and offset-x to fit the width.
   */
  fitX(options) {
    const margin = options?.margin ?? 0;
    this.scale = (this.offsetWidth - margin - margin) / this.#content.offsetWidth;
    this.offsetX = margin;
  }
  /**
   * Adjust the scale and offset-y to fit the height.
   */
  fitY(options) {
    const margin = options?.margin ?? 0;
    this.scale = (this.offsetHeight - margin - margin) / this.#content.offsetHeight;
    this.offsetY = margin;
  }
}
class GestureFrame extends ScrollableFrame {
  static observedAttributes = [
    ...super.observedAttributes,
    "pan-x",
    "pan-y",
    "pan-button",
    "pinch-zoom",
    "anchor-left",
    "anchor-right",
    "anchor-top",
    "anchor-bottom"
  ];
  #setBooleanAttribute(name, oldValue, newValue, setValue) {
    newValue = !!newValue;
    if (oldValue !== newValue) {
      setValue(newValue);
      newValue ? this.setAttribute(name, "") : this.removeAttribute(name);
    }
  }
  #panX = false;
  get panX() {
    return this.#panX;
  }
  set panX(panX) {
    this.#setBooleanAttribute("pan-x", this.#panX, panX, (panX2) => this.#panX = panX2);
  }
  #panY = false;
  get panY() {
    return this.#panY;
  }
  set panY(panY) {
    this.#setBooleanAttribute("pan-y", this.#panY, panY, (panY2) => this.#panY = panY2);
  }
  #panButton = 0;
  get panButton() {
    return this.#panButton;
  }
  set panButton(panButton) {
    if (this.#panButton !== panButton) {
      this.setAttribute("pan-button", this.#panButton = panButton);
      if (panButton === 2) {
        this.addEventListener("contextmenu", preventDefault);
      } else {
        this.removeEventListener("contextmenu", preventDefault);
      }
    }
  }
  #pinchZoom = false;
  get pinchZoom() {
    return this.#pinchZoom;
  }
  set pinchZoom(pinchZoom) {
    this.#setBooleanAttribute("pinch-zoom", this.#pinchZoom, pinchZoom, (pinchZoom2) => this.#pinchZoom = pinchZoom2);
  }
  #anchorLeft = false;
  get anchorLeft() {
    return this.#anchorLeft;
  }
  set anchorLeft(anchorLeft) {
    this.#setBooleanAttribute("anchor-left", this.#anchorLeft, anchorLeft, (anchorLeft2) => this.#anchorLeft = anchorLeft2);
  }
  #anchorRight = false;
  get anchorRight() {
    return this.#anchorRight;
  }
  set anchorRight(anchorRight) {
    this.#setBooleanAttribute("anchor-right", this.#anchorRight, anchorRight, (anchorRight2) => this.#anchorRight = anchorRight2);
  }
  #anchorTop = false;
  get anchorTop() {
    return this.#anchorTop;
  }
  set anchorTop(anchorTop) {
    this.#setBooleanAttribute("anchor-top", this.#anchorTop, anchorTop, (anchorTop2) => this.#anchorTop = anchorTop2);
  }
  #anchorBottom = false;
  get anchorBottom() {
    return this.#anchorBottom;
  }
  set anchorBottom(anchorBottom) {
    this.#setBooleanAttribute("anchor-bottom", this.#anchorBottom, anchorBottom, (anchorBottom2) => this.#anchorBottom = anchorBottom2);
  }
  #w0;
  #h0;
  #resizeObserver = new ResizeObserver(() => {
    const { offsetWidth: w, offsetHeight: h, anchorLeft, anchorRight, anchorTop, anchorBottom } = this;
    const w0 = this.#w0;
    const h0 = this.#h0;
    const anchorCenterX = anchorLeft === anchorRight;
    const anchorCenterY = anchorTop === anchorBottom;
    this.setOffset(
      this.offsetX + (anchorCenterX ? (w - w0) / 2 : anchorLeft ? 0 : w - w0),
      this.offsetY + (anchorCenterY ? (h - h0) / 2 : anchorTop ? 0 : h - h0)
    );
    if (anchorLeft && anchorRight) {
      this.zoom(
        w / w0,
        anchorCenterY ? void 0 : { y: this.offsetY + (anchorTop ? 0 : (this.firstElementChild?.offsetHeight ?? 0) * this.scale) }
      );
    } else if (anchorTop && anchorBottom) {
      this.zoom(
        h / h0,
        anchorCenterX ? void 0 : { x: this.offsetX + (anchorLeft ? 0 : (this.firstElementChild?.offsetWidth ?? 0) * this.scale) }
      );
    }
    this.#w0 = w;
    this.#h0 = h;
  });
  connectedCallback() {
    this.#resizeObserver.observe(this, { box: "border-box" });
    this.#w0 = this.offsetWidth;
    this.#h0 = this.offsetHeight;
  }
  disconnectedCallback() {
    this.#resizeObserver.disconnect();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "pan-x") {
      this.panX = newValue !== null;
    } else if (name === "pan-y") {
      this.panY = newValue !== null;
    } else if (name === "pan-button") {
      this.panButton = +newValue || 0;
    } else if (name === "pinch-zoom") {
      this.pinchZoom = newValue !== null;
    } else if (name === "anchor-left") {
      this.anchorLeft = newValue !== null;
    } else if (name === "anchor-right") {
      this.anchorRight = newValue !== null;
    } else if (name === "anchor-top") {
      this.anchorTop = newValue !== null;
    } else if (name === "anchor-bottom") {
      this.anchorBottom = newValue !== null;
    } else {
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }
  constructor() {
    super();
    {
      let scaleRatio = 1;
      let clientX;
      let clientY;
      const [reserveZooming] = throttle(() => {
        const inverseCssZoom = accumulateInverseCssZoom(this);
        this._zoom(scaleRatio, clientX * inverseCssZoom, clientY * inverseCssZoom);
        scaleRatio = 1;
      });
      this.addEventListener(
        "wheel",
        (event) => {
          if (this.#pinchZoom && event.ctrlKey) {
            event.preventDefault();
            scaleRatio *= this.wheelEventScale(event);
            ({ clientX, clientY } = event);
            reserveZooming();
          }
        },
        { passive: false }
      );
    }
    {
      let pointers = [];
      let inverseCssZoom = 1;
      const [requestPanZoom] = throttle(() => {
        const [p1, p2] = pointers;
        if (p1 && p2 && this.#pinchZoom) {
          const x = (p1.cx + p2.cx) / 2;
          const y = (p1.cy + p2.cy) / 2;
          const cd = Math.hypot(p1.cx - p2.cx, p1.cy - p2.cy);
          const pd = Math.hypot(p1.px - p2.px, p1.py - p2.py);
          cd && pd && this._zoom(cd / pd, x, y);
          this.setOffset(this.offsetX + x - (p1.px + p2.px) / 2, this.offsetY + y - (p1.py + p2.py) / 2);
        } else if (p1 && (this.#panX || this.#panY) && p1.b === this.#panButton) {
          this.setOffset(
            this.#panX ? this.offsetX + p1.cx - p1.px : this.offsetX,
            this.#panY ? this.offsetY + p1.cy - p1.py : this.offsetY
          );
        }
        pointers.forEach((pointer) => {
          pointer.px = pointer.cx;
          pointer.py = pointer.cy;
        });
      });
      const onPointerMove = (event) => {
        if (event.buttons === 0) {
          pointers = [];
          removeEventListeners();
          return;
        }
        const pointer = pointers.find((p) => p.id === event.pointerId);
        if (pointer) {
          (this.#panX || this.#panY || this.#pinchZoom && pointers.length >= 2) && event.preventDefault();
          pointer.cx = event.clientX * inverseCssZoom;
          pointer.cy = event.clientY * inverseCssZoom;
          requestPanZoom();
        }
      };
      const onPointerUp = (event) => {
        const index = pointers.findIndex((p) => p.id === event.pointerId);
        if (index !== -1) {
          pointers.splice(index, 1);
          pointers.length || removeEventListeners();
        }
      };
      const removeEventListeners = () => {
        removeEventListener("pointermove", onPointerMove);
        removeEventListener("pointerup", onPointerUp, true);
        removeEventListener("pointercancel", onPointerUp, true);
      };
      this.addEventListener("pointerdown", (event) => {
        if ((this.#panX || this.#panY) && event.button === this.#panButton || this.#pinchZoom && event.button === 0) {
          pointers.length === 0 && (inverseCssZoom = accumulateInverseCssZoom(this));
          const cx = event.clientX * inverseCssZoom;
          const cy = event.clientY * inverseCssZoom;
          pointers.push({ id: event.pointerId, b: event.button, cx, cy, px: cx, py: cy });
          addEventListener("pointermove", onPointerMove);
          addEventListener("pointerup", onPointerUp, true);
          addEventListener("pointercancel", onPointerUp, true);
        }
      });
    }
  }
  wheelEventScale(wheelEvent) {
    return clamp(1 - wheelEvent.deltaY * 0.01, 0.8, 1.25);
  }
}
customElements.define("gesture-frame", GestureFrame);
export {
  GestureFrame
};
