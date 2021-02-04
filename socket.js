let io

module.exports = {
    init:httpServer =>{
       io = require('socket.io')(httpServer)
       io.set('origins', '*:*');
       return io
    },
    getIO:()=>{
        if(!io) {
            throw new Error('Socket IO not initialized')
        }
        return io
    }
}