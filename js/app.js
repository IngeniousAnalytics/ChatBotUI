import config from '/config.js';

document.addEventListener('DOMContentLoaded', function () {
    const chatbox = document.querySelector('.chatbox');
    const chatboxButton = document.querySelector('.chatbox__button button');
    const sendButton = document.querySelector('.send__button');
    const chatInput = document.querySelector('.chatbox__footer input');
    const chatMessages = document.querySelector('.chatbox__messages div');
    const processingTag = document.createElement('div');
    processingTag.classList.add('processing-message');
    processingTag.textContent = 'Processing...';

    let bannedWords = []; // This will be populated with banned words from the server

    // Fetch the banned words from the server
    const fetchBannedWords = async () => {
        try {
            const response = await fetch(`${config.baseUrl}/banned-words`);
            const data = await response.text();
            bannedWords = data.split('\n').map(word => word.trim().toLowerCase());
        } catch (error) {
            console.error('Failed to fetch banned words:', error);
        }
    };

    // Call fetchBannedWords when the DOM is loaded
    fetchBannedWords();

    // Toggle chatbox visibility
    chatboxButton.addEventListener('click', () => {
        chatbox.classList.toggle('chatbox--active');
    });

    // Add message to chat
    const addMessageToChat = (message, className, isBlurred = false) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('messages__item', className);
        messageElement.innerHTML = `<div><span ${isBlurred ? 'class="blurred-text"' : ''}>${message}</span></div>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Check if the message contains banned words and blur them
    const checkAndBlurMessage = (message) => {
        let isBlurred = false;
        let words = message.split(' ');
        words = words.map(word => {
            if (bannedWords.includes(word.toLowerCase())) {
                isBlurred = true;
                return '****';
            }
            return word;
        });
        return { message: words.join(' '), isBlurred: isBlurred };
    };

    // Format the response to make it more readable
    const formatResponse = (response) => {
        // Split response into lines
        const lines = response.split('\n');
        // If there are multiple lines, format with bullet points
        if (lines.length > 1) {
            return '<ul>' + lines.map(line => `<li>${line.trim()}</li>`).join('') + '</ul>';
        }
        // Otherwise, just return the single line as is
        return response;
    };

    // Handle message sending
    const handleSendMessage = async (event) => {
        event.preventDefault();
        const question = chatInput.value;
        if (question.trim()) {
            const { message, isBlurred } = checkAndBlurMessage(question);
            addMessageToChat(message, 'messages__item--visitor', isBlurred);

            // Disable input and show processing message
            chatInput.disabled = true;
            chatMessages.appendChild(processingTag);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            const response = await fetch(`${config.baseUrl}/ask-question/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ 'question': question })
            });

            const result = await response.json();

            // Enable input and remove processing message
            chatInput.disabled = false;
            chatMessages.removeChild(processingTag);

            if (result.error) {
                addMessageToChat(result.error, 'messages__item--operator');
            } else {
                const formattedResponse = formatResponse(result.response);
                addMessageToChat(formattedResponse, 'messages__item--operator');
            }
            chatInput.value = '';
        }
    };

    sendButton.addEventListener('click', handleSendMessage);

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendMessage(event);
        }
    });

    // Check for greeting messages
    const isGreeting = (message) => {
        const greetings = ["hi", "hello", "good morning", "good afternoon", "good evening", "hey"];
        return greetings.includes(message.toLowerCase());
    };
});
