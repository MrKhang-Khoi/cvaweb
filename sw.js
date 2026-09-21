/* ==========================================================================
   SERVICE WORKER: CỔNG WEBSITE GIÁO VIÊN (PWA OFFLINE-FIRST & AUTO-UPDATE)
   Phiên bản: 2.1.0
   ========================================================================== */

const CACHE_NAME = 'teacher-hub-v2.1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './dist/qrcode.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// 1. CÀI ĐẶT (INSTALL): Caching bền bỉ (Resilient caching - không để 1 file lỗi chặn toàn bộ)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const cachePromises = ASSETS_TO_CACHE.map(async asset => {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[ServiceWorker] Không thể nạp trước tài nguyên:', asset, err);
        }
      });
      await Promise.all(cachePromises);
    })
  );
});

// 2. KÍCH HOẠT (ACTIVATE): Dọn dẹp cache phiên bản cũ & chiếm quyền điều khiển
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Xóa cache phiên bản cũ:', key);
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ĐÓN BẮT TRUY VẤN MẠNG (FETCH): Stale-While-Revalidate với ignoreSearch & Offline Fallback
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Chỉ cache các tài nguyên cùng nguồn gốc (local origin)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(req, { ignoreSearch: true }).then(cachedResponse => {
          // Lấy bản mới từ mạng để cập nhật ngầm vào cache (nếu là GET)
          const networkFetch = fetch(req).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && req.method === 'GET') {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          }).catch(async () => {
            // Mất mạng: Nếu là điều hướng trang, trả về index.html đã cache
            if (req.mode === 'navigate') {
              const fallback = await cache.match('./index.html', { ignoreSearch: true });
              if (fallback) return fallback;
            }
            if (cachedResponse) return cachedResponse;
            return new Response('Ngoại tuyến: Tài nguyên chưa được lưu trong bộ nhớ đệm.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });

          // Trả về bản cache ngay nếu có, nếu không thì chờ mạng
          return cachedResponse || networkFetch;
        });
      })
    );
  } else {
    // Các yêu cầu mở website ngoài: Đi trực tiếp qua mạng, xử lý lỗi an toàn
    event.respondWith(
      fetch(req).catch(() => {
        // Nếu là yêu cầu ảnh từ ngoài bị mất mạng
        if (req.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        return new Response('Website ngoài yêu cầu kết nối mạng Internet.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
  }
});

// 4. LẮNG NGHE LỆNH CẬP NHẬT TỨC THÌ (AUTO-UPDATE MESSAGE)
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// 5. XỬ LÝ NHẤP VÀO THÔNG BÁO NHẮC NHỞ (NOTIFICATION CLICK)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return Promise.resolve();
    })
  );
});
