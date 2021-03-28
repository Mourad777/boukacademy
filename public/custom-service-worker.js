console.log('service worker loaded')

self.addEventListener('push', e => {
    const data = e.data.json();
    console.log('data.url', data.url)
    console.log('push recieved', data);
    console.log('data.icon', data.icon)
    console.log('click action222', data.url)
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

// self.addEventListener('notificationclick', function(event) {
//     console.log('On notification click: ', event.notification.tag);
//     event.notification.close();

//     // This looks to see if the current is already open and
//     // focuses if it is
//     event.waitUntil(clients.matchAll({
//       type: "window"
//     }).then(function(clientList) {
//       for (var i = 0; i < clientList.length; i++) {
//         var client = clientList[i];
//         if (client.url == '/' && 'focus' in client)
//           return client.focus();
//       }
//       if (clients.openWindow)
//         return clients.openWindow('/');
//     }));
//   });