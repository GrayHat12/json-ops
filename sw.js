if(!self.define){let e,s={};const i=(i,n)=>(i=new URL(i+".js",n).href,s[i]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=s,document.head.appendChild(e)}else e=i,importScripts(i),s()})).then((()=>{let e=s[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(n,r)=>{const o=e||("document"in self?document.currentScript.src:"")||location.href;if(s[o])return;let c={};const a=e=>i(e,o),l={module:{uri:o},exports:c,require:a};s[o]=Promise.all(n.map((e=>l[e]||a(e)))).then((e=>(r(...e),c)))}}define(["./workbox-56a10583"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/Compare-3abbf89c.css",revision:null},{url:"assets/Compare-7c170270.js",revision:null},{url:"assets/Dashboard-98dc4d2b.js",revision:null},{url:"assets/db-a0a5d8a1.js",revision:null},{url:"assets/icon-e5751860.svg",revision:null},{url:"assets/index-c44629be.css",revision:null},{url:"assets/index-eec8de52.js",revision:null},{url:"icon.svg",revision:"ef773a3066a9edbdf374b026142ccb87"},{url:"icons/maskable_icon_x128.png",revision:"f2a55a2cbeb1119379649aa515cc9c2e"},{url:"icons/maskable_icon_x192.png",revision:"b9ac9b05e54d577f24677180e81dc479"},{url:"icons/maskable_icon_x384.png",revision:"34b31afd667a76b3e8bde9d65fe041a7"},{url:"icons/maskable_icon_x48.png",revision:"196364073593bb4c1753ded2796d2b75"},{url:"icons/maskable_icon_x512.png",revision:"312e9f40ee4fb4844d0344a68df29aba"},{url:"icons/maskable_icon_x72.png",revision:"a2c67e0309b8ce89c0456507e7c864e9"},{url:"icons/maskable_icon_x96.png",revision:"600952d3ff7912aedf7f944bda55906f"},{url:"icons/maskable_icon.png",revision:"581496adeca9aa460c920dd287b5532c"},{url:"index.html",revision:"f7fc969dbbc0242da9d15287d1495139"},{url:"noflash.js",revision:"ec30bd9bc1348f16dcbdbcd720f7ba9b"},{url:"registerSW.js",revision:"48bb6f73a84866139b97ebd2a493d967"},{url:"manifest.webmanifest",revision:"383752943a17d91e3b1c9209b5317086"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
