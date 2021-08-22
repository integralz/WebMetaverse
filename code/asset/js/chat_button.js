function ChatButtonClick() {
    const chat_system = document.getElementById("chat_system");
    
    if (chat_system.style.visibility == 'visible') {
        chat_system.style.visibility = 'hidden';
    }
    else {
        chat_system.style.visibility = 'visible';
    }
}