// console.log("hello client!(chat sub-directory)");
import { ChatMessage } from "global";
import { socket } from "../sockets";
import { snapshot } from "node:test";

const chatContainer = document.querySelector<HTMLDivElement>(
  "#chat-container div",
);
socket.on("chat:message:0", ({ message, sender, timestamp }: ChatMessage) => {
  console.log({ message, sender, timestamp });
  //debugging cant get the message to show up on the chat ui:
  console.log("Sending message to server:", message);

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message");

  const img = document.createElement("img");
  img.src = `https://gravatar.com/avatar/${sender.gravatar}?d=identicon`;
  img.alt = `Gravatar for ${sender.email}`;
  img.classList.add("avatar");
  messageContainer.appendChild(img);

  const messageContent = document.createElement("span");
  messageContent.classList.add("message-content");
  messageContent.innerText = message;

  const messageTimestamp = document.createElement("span");
  messageTimestamp.classList.add("message-timestamp");
  messageTimestamp.innerText = new Date(timestamp).toLocaleTimeString();
  messageContainer.appendChild(messageTimestamp);
  messageContainer.appendChild(messageContent);
  //note: "? just says if this is null dont do the rest"
  // "! means ik this is not going to be null"
  chatContainer!.appendChild(messageContainer);
});

const chatForm = document.querySelector<HTMLFormElement>(
  "#chat-container form",
);

const chatInput = document.querySelector<HTMLInputElement>(
  "#chat-container input",
);

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = chatInput?.value;
  if (!message) {
    return;
  }

  chatInput.value = "";
  // fetch("/api/chat/"  for now putting as 0
  fetch("/chat/0", {
    method: "post",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  }).catch((error) => {
    console.error("Error sending message: ", error);
  });
});
