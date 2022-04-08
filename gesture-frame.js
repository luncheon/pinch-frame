const b=(o,t,e)=>o<t?t:o>e?e:o,u=o=>o<0?0:o,v=(o,t)=>{let e=0;for(let s=0;s<o.length;s++)e+=t(o[s]);return e},d=(o,t)=>o.length===1?t(o[0]):v(o,t)/o.length,f=o=>{let t;const e=()=>(t=void 0,o());return[()=>t??=requestAnimationFrame(e),()=>t!==void 0&&(cancelAnimationFrame(t),t=void 0)]};class g extends HTMLElement{static observedAttributes=["scale","min-scale","max-scale","offset-x","offset-y"];#t=1;get scale(){return this.#t}set scale(t){this.#t!==t&&(this.#s("scale",this.#t=t=b(t,this.#e,this.#i)),this.#d.style.transform=`scale(${t})`)}#e=.1;get minScale(){return this.#e}set minScale(t){this.#e!==t&&t>0&&(this.#s("min-scale",this.#e=t),this.#t<t&&(this.scale=t))}#i=100;get maxScale(){return this.#i}set maxScale(t){this.#i!==t&&t>0&&(this.#s("max-scale",this.#i=t),this.#t>t&&(this.scale=t))}#n=0;get offsetX(){return this.#n}set offsetX(t){this.setOffset(t,this.#r)}#r=0;get offsetY(){return this.#r}set offsetY(t){this.setOffset(this.#n,t)}#a=0;#c=0;#o;#l;#d;#u;constructor(){super();const t=this.attachShadow({mode:"open"});t.innerHTML="<div part=container><div part=top-left></div><slot part=content></slot></div>",this.#o=t.firstElementChild,this.#l=this.#o.firstElementChild,this.#d=this.#l.nextElementSibling;{let e=1;const[s]=f(()=>e=1);this.#u=()=>{s(),e=0},this.addEventListener("scroll",()=>{if(e){const n=this.#b()[0].transformPoint({x:this.#a-this.scrollLeft,y:this.#c-this.scrollTop});this.#s("offset-x",this.#n=n.x),this.#s("offset-y",this.#r=n.y)}})}}#h=1;#s(t,e){this.#h=0,this.setAttribute(t,e),this.#h=1}attributeChangedCallback(t,e,s){this.#h&&e!==s&&(this[t.replace(/-([a-z])/g,(n,r)=>r.toUpperCase())]=+s)}connectedCallback(){this.setAttribute("scale",this.#t),this.setAttribute("min-scale",this.#e),this.setAttribute("max-scale",this.#i)}#f="";#m=[new DOMMatrixReadOnly,new DOMMatrixReadOnly];#b(){let t="";for(let e=this;e;e=e.parentElement){const s=getComputedStyle(e).transform;s&&s!=="none"&&(t=`${s} ${t}`)}if(this.#f!==t){const e=new DOMMatrix(t);e.e=e.f=0,this.#f=t,this.#m=[DOMMatrixReadOnly.fromMatrix(e),DOMMatrixReadOnly.fromMatrix(e.inverse())]}return this.#m}setOffset(t,e){if(this.#n===t&&this.#r===e)return;this.#s("offset-x",this.#n=t),this.#s("offset-y",this.#r=e);const{x:s,y:n}=this.#b()[1].transformPoint({x:t,y:e}),r=this.#o.style;r.margin=`${this.#c=u(n)}px 0 0 ${this.#a=u(s)}px`,r.width=`${s<0?this.clientWidth-s:0}px`,r.height=`${n<0?this.clientHeight-n:0}px`,this.#u(),this.scrollTo(u(-s),u(-n))}zoom(t,e,s){const n=this.#t,r=b(n*t,this.#e,this.#i);if(r===n)return;const h=r/n-1,a=this.#l.getBoundingClientRect();this.scale=r,this.setOffset(this.#n+h*(a.x-e),this.#r+h*(a.y-s))}}const p={passive:!1},y=typeof ontouchend<"u";class E extends g{static observedAttributes=[...super.observedAttributes,"pan","pinch-zoom"];#t=!1;get pan(){return this.#t}set pan(t){t=!!t,this.#t!==t&&((this.#t=t)?this.setAttribute("pan",""):this.removeAttribute("pan"))}#e=!1;get pinchZoom(){return this.#e}set pinchZoom(t){t=!!t,this.#e!==t&&((this.#e=t)?this.setAttribute("pinch-zoom",""):this.removeAttribute("pinch-zoom"))}attributeChangedCallback(t,e,s){t==="pan"?this.pan=s!==null:t==="pinch-zoom"?this.pinchZoom=s!==null:super.attributeChangedCallback(t,e,s)}constructor(){if(super(),y){let t={x:0,y:0,d:0},e=[];const[s,n]=f(()=>{const i=d(e,c=>c.x),l=d(e,c=>c.y),m=t.d&&d(e,c=>c.d);m&&this.zoom(m/t.d,i,l),this.setOffset(this.offsetX+i-t.x,this.offsetY+l-t.y),e=[],t={x:i,y:l,d:m}}),r=({touches:i})=>({x:d(i,l=>l.clientX),y:d(i,l=>l.clientY),d:i.length>1?Math.hypot(i[0].clientX-i[1].clientX,i[0].clientY-i[1].clientY):0}),h=i=>{n(),e=[],i.touches.length!==0&&(t=r(i))},a=i=>{(i.touches.length===1?this.#t:this.#e)&&(i.preventDefault(),e.push(r(i)),s())};this.addEventListener("touchstart",h),this.addEventListener("touchend",h),this.addEventListener("touchmove",a,p)}else{{let t=1,e,s;const[n]=f(()=>{this.zoom(t,e,s),t=1});this.addEventListener("wheel",r=>{this.#e&&r.ctrlKey&&(r.preventDefault(),t*=.99**r.deltaY,{clientX:e,clientY:s}=r,n())},p)}{let t,e,s,n;const[r]=f(()=>{this.setOffset(this.offsetX+s-t,this.offsetY+n-e),t=s,e=n}),h=l=>{l.preventDefault(),{clientX:s,clientY:n}=l,r()},a=l=>{this.#t&&l.button===0&&({clientX:t,clientY:e}=l,addEventListener("pointermove",h))},i=()=>removeEventListener("pointermove",h);this.addEventListener("pointerdown",a),this.addEventListener("pointerup",i),this.addEventListener("pointercancel",i)}}}}customElements.define("gesture-frame",E);export{E as GestureFrame};
