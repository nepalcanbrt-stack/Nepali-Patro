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
define(['./workbox-7b16fee0'], (function (workbox) { 'use strict';

  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "312f4d186bd6e98755305d87f53d8141"
  }, {
    "url": "pwa-512x512.png",
    "revision": "685dc458caa9035f5dcecf2c6f0c9784"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d8d88b64a7d7c0c10265dbe0f8a4e469"
  }, {
    "url": "index.html",
    "revision": "c791e1155068a4c4ec1faa391bece9a4"
  }, {
    "url": "icon.svg",
    "revision": "4ac7b556dfc944c981b4b42b65a90783"
  }, {
    "url": "favicon.png",
    "revision": "4a936b540efefc4a91446de9cf850c1e"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "43a60f29c37e143cbf2e0075e23bd0a5"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-pPlhO8sE.js",
    "revision": null
  }, {
    "url": "assets/timer-gOx6T0Xp.js",
    "revision": null
  }, {
    "url": "assets/three-vendor-C0igJ8kC.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-BWaJ3C7D.js",
    "revision": null
  }, {
    "url": "assets/motion-vendor-CHeNTPHT.js",
    "revision": null
  }, {
    "url": "assets/lock-QLOdxhRB.js",
    "revision": null
  }, {
    "url": "assets/jsx-dev-runtime-Dm_E8pXv.js",
    "revision": null
  }, {
    "url": "assets/index-Cmk7AEhg.css",
    "revision": null
  }, {
    "url": "assets/index-CcDltfz_.js",
    "revision": null
  }, {
    "url": "assets/firebase-vendor-CASAcpI_.js",
    "revision": null
  }, {
    "url": "assets/calendar-K1eutAo0.js",
    "revision": null
  }, {
    "url": "assets/arrow-left-CQc-Cd2E.js",
    "revision": null
  }, {
    "url": "assets/SettingsModal-D5FwPxoi.js",
    "revision": null
  }, {
    "url": "assets/Patro3DSceneScreen-B_lcjOhT.js",
    "revision": null
  }, {
    "url": "assets/PanchangScreen-CDZ5mwOr.js",
    "revision": null
  }, {
    "url": "assets/NotificationCenterModal-BKyVX11r.js",
    "revision": null
  }, {
    "url": "assets/NoteModal-C1kNMo16.js",
    "revision": null
  }, {
    "url": "assets/LoginScreen-DvuNz7F_.js",
    "revision": null
  }, {
    "url": "assets/FestivalsScreen-GINNUZOB.js",
    "revision": null
  }, {
    "url": "assets/ConverterScreen-DxBRMSTs.js",
    "revision": null
  }, {
    "url": "assets/CalendarScreen-DBVWJAeb.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "43a60f29c37e143cbf2e0075e23bd0a5"
  }, {
    "url": "favicon.png",
    "revision": "4a936b540efefc4a91446de9cf850c1e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d8d88b64a7d7c0c10265dbe0f8a4e469"
  }, {
    "url": "pwa-512x512.png",
    "revision": "685dc458caa9035f5dcecf2c6f0c9784"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "312f4d186bd6e98755305d87f53d8141"
  }, {
    "url": "manifest.webmanifest",
    "revision": "70fde8686d1cc54bc9eb0782ad7220e9"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /^\/ws\//]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
