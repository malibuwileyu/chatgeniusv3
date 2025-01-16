# Project Structure

## Backend Structure (/backend) /backend
├── config/
│ ├── database.js
│ └── config.js
├── middleware/
│ ├── auth.js
│ ├── errorHandler.js
│ ├── upload.js
│ └── validate.js
├── models/
│ ├── User.js
│ ├── Channel.js
│ ├── Message.js
│ ├── File.js
│ └── Reaction.js
├── routes/
│ ├── auth.js
│ ├── channels.js
│ ├── messages.js
│ ├── files.js
│ ├── users.js
│ └── reactions.js
├── services/
│ ├── authService.js
│ ├── channelService.js
│ ├── messageService.js
│ ├── fileService.js
│ └── userService.js
├── utils/
│ ├── logger.js
│ ├── validation.js
│ └── helpers.js
├── app.js
└── index.js

/frontend
├── public/
│ ├── index.html
│ └── assets/
├── src/
│ ├── components/
│ │ ├── auth/
│ │ ├── channels/
│ │ ├── messages/
│ │ ├── files/
│ │ └── common/
│ ├── features/
│ │ ├── auth/
│ │ ├── channels/
│ │ ├── messages/
│ │ └── files/
│ ├── hooks/
│ │ ├── useAuth.js
│ │ ├── useChannel.js
│ │ └── useMessage.js
│ ├── services/
│ │ ├── api.js
│ │ └── storage.js
│ ├── store/
│ │ ├── slices/
│ │ └── store.js
│ ├── utils/
│ │ ├── constants.js
│ │ └── helpers.js
│ ├── App.js
│ └── index.js
└── package.json