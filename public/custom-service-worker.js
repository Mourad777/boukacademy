console.log('service worker loaded')

self.addEventListener('push', e => {
    const data = e.data.json();
    console.log('push recieved', data);
    const isIM = data.isIM
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: isIM ? data.icon : '/logo512.png',
        vibrate: [300, 100, 400],
        data: {
            url: data.url
          }
    })
})

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
})