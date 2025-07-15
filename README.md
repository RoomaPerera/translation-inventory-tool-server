# translation-inventory-tool-backend

This is the backend server for the Translation Inventory Tool, developed using Node.js, Express, and MongoDB.
It provides APIs for authentication, user management, and translation project handling.

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose ODM)
- JWT Authentication
- Nodemon (for development)
- CORS
- dotenv

## Features


## Installation

1. Clone the repository:
```bash
https://github.com/RoomaPerera/translation-inventory-tool-backend.git

2. Install Dependancies:
npm install

3. Create a .env file in the root directory and add the following:
PORT=5000
MONGO_URI=your_mongodb_connection_string
SECRET=your_secret_key

4. Run the development server:
npm run dev

---

### API Endpoints


## Folder Structure

backend/
│
├── config/             # Database configuration and environment variables
│   ├── db.js
│   └──index.js
│
├── controllers/        # Request handler functions
│   ├── authController.js
│   └── userController.js
│
├── middleware/         # Custom Express middleware
│   └── authMiddleware.js
│
├── models/             # Mongoose schema models
│   └── userModel.js
│
├── routes/             # Express route definitions
│   ├── authRoutes.js
│   └── userRoutes.js
│
├── .env                # Environment variables (not committed to GitHub)
├── package.json        # Project dependencies and metadata
├── server.js           # Main server file
└── README.md           # Project documentation


## License
This project is for academic and portfolio purposes.