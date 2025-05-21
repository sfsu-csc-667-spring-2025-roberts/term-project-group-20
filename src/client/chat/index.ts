// console.log("hello client!(chat sub-directory)");
import { ChatMessage } from "global";
import { socket } from "../sockets";
import { snapshot } from "node:test";

socket.on("chat:message:0", ({ message, sender, timestamp }: ChatMessage) => {
  console.log({ message, sender, timestamp });
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
