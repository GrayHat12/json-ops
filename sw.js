/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-ab7aa862'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "assets/Compare-3abbf89c.css",
    "revision": null
  }, {
    "url": "assets/Compare-dd6b52e9.js",
    "revision": null
  }, {
    "url": "assets/Dashboard-6624759c.js",
    "revision": null
  }, {
    "url": "assets/db-5f1c2d43.js",
    "revision": null
  }, {
    "url": "assets/icon-e5751860.svg",
    "revision": null
  }, {
    "url": "assets/index-2f399611.js",
    "revision": null
  }, {
    "url": "assets/index-c44629be.css",
    "revision": null
  }, {
    "url": "icon.svg",
    "revision": "ef773a3066a9edbdf374b026142ccb87"
  }, {
    "url": "icons/maskable_icon_x128.png",
    "revision": "f2a55a2cbeb1119379649aa515cc9c2e"
  }, {
    "url": "icons/maskable_icon_x192.png",
    "revision": "b9ac9b05e54d577f24677180e81dc479"
  }, {
    "url": "icons/maskable_icon_x384.png",
    "revision": "34b31afd667a76b3e8bde9d65fe041a7"
  }, {
    "url": "icons/maskable_icon_x48.png",
    "revision": "196364073593bb4c1753ded2796d2b75"
  }, {
    "url": "icons/maskable_icon_x512.png",
    "revision": "312e9f40ee4fb4844d0344a68df29aba"
  }, {
    "url": "icons/maskable_icon_x72.png",
    "revision": "a2c67e0309b8ce89c0456507e7c864e9"
  }, {
    "url": "icons/maskable_icon_x96.png",
    "revision": "600952d3ff7912aedf7f944bda55906f"
  }, {
    "url": "icons/maskable_icon.png",
    "revision": "581496adeca9aa460c920dd287b5532c"
  }, {
    "url": "index.html",
    "revision": "9dec0b7b36a1415a830b8e698a79e6fd"
  }, {
    "url": "noflash.js",
    "revision": "ec30bd9bc1348f16dcbdbcd720f7ba9b"
  }, {
    "url": "registerSW.js",
    "revision": "48bb6f73a84866139b97ebd2a493d967"
  }, {
    "url": "manifest.webmanifest",
    "revision": "383752943a17d91e3b1c9209b5317086"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
