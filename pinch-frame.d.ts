declare class ScrollableFrame extends HTMLElement {
    #private;
    static readonly observedAttributes: readonly string[];
    get scale(): number;
    set scale(scale: number);
    get minScale(): number;
    set minScale(minScale: number);
    get maxScale(): number;
    set maxScale(maxScale: number);
    get offsetX(): number;
    set offsetX(offsetX: number);
    get offsetY(): number;
    set offsetY(offsetY: number);
    constructor();
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    connectedCallback(): void;
    setOffset(offsetX: number, offsetY: number): void;
    zoom(scaleRatio: number, originClientX: number, originClientY: number): void;
}
export declare class PinchFrame extends ScrollableFrame {
    #private;
    static readonly observedAttributes: readonly string[];
    get disabled(): boolean;
    set disabled(disabled: boolean);
    constructor();
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
}
export {};
