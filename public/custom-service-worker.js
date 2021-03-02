console.log('service worker loaded')

self.addEventListener('push',e=>{
    const data = e.data.json();
    console.log('push recieved',data);
    console.log('data.icon',data.icon)
    const isIM = data.isIM
    self.registration.showNotification(data.title, {
        body:data.body,
        icon:isIM ? data.icon : '/logo512.png'
    })
})