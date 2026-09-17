/* ==========================================================================
   SERVICE WORKER: CỔNG WEBSITE GIÁO VIÊN (PWA OFFLINE-FIRST & AUTO-UPDATE)
   Phiên bản: 1.3.0
   ========================================================================== */

const CACHE_NAME = 'teacher-hub-v1.3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// 1. CÀI ĐẶT (INSTALL): Nạp trước các tài nguyên cốt lõi vào bộ nhớ đệm
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Tự động kích hoạt ngay nếu được yêu cầu
      return self.skipWaiting();
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
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. ĐÓN BẮT TRUY VẤN MẠNG (FETCH): Chiến lược Stale-While-Revalidate cho chạy Offline
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Chỉ cache các tài nguyên cùng nguồn gốc (local origin)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(req).then(cachedResponse => {
          // Lấy bản mới từ mạng để cập nhật ngầm vào cache
          const networkFetch = fetch(req).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && req.method === 'GET') {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Mất mạng: Trả về bản cache đã lưu
            return cachedResponse;
          });

          // Trả về bản cache ngay nếu có, nếu không thì chờ mạng
          return cachedResponse || networkFetch;
        });
      })
    );
  } else {
    // Các yêu cầu mở website ngoài (vnEdu, SMAS, CSDL...): Đi trực tiếp qua mạng
    event.respondWith(
      fetch(req).catch(() => {
        return new Response('Website ngoài yêu cầu kết nối mạng Internet.', {
          status: 503,
          statusText: 'Service Unavailable'
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
    })
  );
});
