const socket = io();

//연결이 되면 cookie에서 id를 추출하고 server에 전송
socket.on("connect", () => {
    const id = document.cookie.split('id=')[1];
    socket.emit('NewUserConnect', id);
});

//채팅을 받아 chat_window에 보여줌
socket.on('updateMessage', function (data) {
    const chat_window = document.getElementById('chat_window');
    if(data.id === undefined){
        chat_window.innerHTML += (data.message + '<br>');
    }
    else{
        chat_window.innerHTML += (data.id + " : " + data.message + '<br>');
    }
});

//버튼을 눌러 내가 기입한 채팅을 전송
const sendButton = document.getElementById('chat_send_button'); 
const chatInput = document.getElementById('chat_input'); 
sendButton.addEventListener('click', function(){ 
    var message = chatInput.value; 
    if(!message) return false; 
    socket.emit('sendMessage', { message }); 
    chatInput.value = ''; 
});