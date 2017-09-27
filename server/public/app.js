const app = document.getElementById('app')

app.innerHTML = `<p>Loading Data</p>`

const socket = io();
const client = feathers();

// Create the Feathers application with a `socketio` connection
client.configure(feathers.socketio(socket));
client.configure(feathers.hooks())
client.configure(feathers.authentication({
  storage: window.localStorage
}));

const fileContents = client.service('/file-contents')

fileContents.find().then(data => {
  console.log("loading initial data");
  console.log(data)
  app.innerHTML = `<p>${data.content}</p>`
})

fileContents.on('created', data => {
  console.log("Data updated");
  console.log(data);
  app.innerHTML = `<p>${data.content}</p>`
})


// // Add a new message to the list
// function addMessage(message) {
//   const chat = document.querySelector('.chat');
//   users.get(message.userId).then(user => {
//     chat.insertAdjacentHTML('beforeend', `<div class="message flex flex-row">
//       <img src="${user.gravitar}" alt="${message.name}" class="avatar">
//       <div class="message-wrapper">
//         <p class="message-header">
//           <span class="username font-600">${user.email}</span>
//         </p>
//         <p class="message-content font-300">${message.text}</p>
//       </div>
//     </div>`);
//
//     chat.scrollTop = chat.scrollHeight - chat.clientHeight;
//   })
// }

// document.getElementById('send-message').addEventListener('submit', function(ev) {
//   const nameInput = document.querySelector('[name="name"]');
//   // This is the message text input field
//   const textInput = document.querySelector('[name="text"]');
//
//   // Create a new message and then clear the input field
//   client.service('messages').create({
//     text: textInput.value,
//     name: nameInput.value
//   }).then(() => {
//     textInput.value = '';
//   });
//   ev.preventDefault();
// });
