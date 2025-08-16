# translation-inventory-tool-backend

## Introduction

The **Translation Inventory Tool Backend** is a server-side application built to streamline every aspect of collaborative multilingual translation within organizations. Leveraging **Node.js**, **Express**, and **MongoDB**, it exposes a robust **RESTful API** for secure, role-based workflows that cover the full translation lifecycle:

- **User Authentication & Management**:  
  - JWT-based login/registration  
  - Password reset via email verification  
  - Auto-logout after inactivity  
  - Granular role assignments (Translator, Developer, Administrator) with admin approval  

- **Translation & Project Handling**:  
  - Create and manage translation projects and keys  
  - Translators add, edit, or filter translations by product, language, status, or user  
  - Bulk import/export for administrators  
  - Dynamic context-based translation variations  

- **Automated Quality & Consistency Checks**:  
  - Asynchronous background tasks compute translation quality scores  
  - Language-detection module flags mismatches for review  

- **Semantic Translation Memory & Dynamic Glossary**:  
  - Vector-based similarity matching suggests approved translations  
  - Periodic glossary extraction from translation corpus  

- **Real-Time Collaboration & Version Control**:  
  - Live editing sessions with conflict resolution algorithms  
  - Revision diff analysis and side-by-side version history for seamless rollbacks  

- **Search, Validation & Notifications**:  
  - Fuzzy search using Levenshtein distance  
  - File formatting validation for CSV/JSON uploads  
  - Readability and complexity metrics  
  - Email notifications for new translation requests  

- **Activity Logging & Anomaly Detection**:  
  - Detailed audit trails of all user actions  
  - Statistical analysis of logs to detect unusual activity and trigger alerts  

- **Analytics & Reporting**:  
  - Scheduled aggregation of KPIs 
  - Interactive dashboards with exportable reports  

Designed for **scalability**, **security**, and **extensibility**, this backend forms the foundation of a continuous integration pipeline for multilingual applications—whether you need automated translation file generation, rigorous quality assurance, or real-time collaboration across global teams.

## Tech Stack

### Runtime & Frameworks
- **Node.js** (v18.x or newer)  
- **Express.js** (v4.x)  
- **Python** (v3.9 or newer)  
  - **FastAPI** for Python-based microservices  
  - **Uvicorn** as ASGI server  

### Database & ODM
- **MongoDB** (v6.x)  
- **Mongoose** (v8.x)

### Authentication & Security
- **JSON Web Tokens** (`jsonwebtoken` v9.x)  
- **Password hashing** (`bcrypt` v5.x, `bcryptjs` v3.x)  
- **Rate limiting** (`express-rate-limit` v7.x)  
- **Input validation** (`validator` v13.x)

### File Handling & Data Import/Export
- **File uploads** (`multer` v2.x)  
- **CSV parsing** (`csv-parser` v3.x)  
- **JSON ↔ CSV conversion** (`json2csv` v6.x)  
- **Archive creation** (`archiver` v7.x)

### Networking & HTTP
- **CORS** (`cors` v2.x)  
- **Cookie parsing** (`cookie-parser` v1.x)  
- **HTTP client** (`axios` v1.x)  

### Real‑Time & Collaborative Editing
- **WebSockets** (`ws` v8.x)  
- **Socket.IO** (`socket.io` & `socket.io-client` v4.x)  
- **Yjs & y-websocket** (v13.x & v1.x)  

### Natural Language Processing (Python)
- **spaCy** (`en_core_web_md` model)  
- **Pydantic** for data validation in FastAPI  
- **Python standard libs** (`collections`, `typing`)

### Background Jobs & Scheduling
- **Cron jobs** (`node-cron` v3.x)  

### Notifications & Email
- **Transactional email** (`nodemailer` v6.x)  
- **Password strength** (`zxcvbn` v4.x)  

### Search, Diff & Fuzzy Matching
- **String diff** (`diff` v7.x)  
- **Levenshtein distance** (`fast-levenshtein` & `fastest-levenshtein` v3.x & v1.x)  

### Environment & Configuration
- **Environment variables** (`dotenv` v16.x)  

### Other Utilities
- **Web socket utilities** (`y-websocket`, `yjs`)  
- **Data validation & sanitization** (`validator` v13.x)  

### Development & Tooling
- **Nodemon** for hot-reloading (`nodemon`)  
- **Git & GitHub** for version control  

## Features

### 1. User Authentication & Management
- Role-based access control (Translator/Developer/Admin)  
- Secure JWT authentication with email verification  
- Admin approval workflow for new registrations  
- Password reset via email  
- Automatic session timeout  

### 2. Translation Management
- Advanced filtering by project/language/key status  
- Collaborative editing with conflict resolution  
- Bulk import/export (JSON/CSV)  
- Version control with diff visualization  
- Context-aware translations (multiple variations)  

### 3. Quality Assurance
- Automated quality scoring  
- Language detection validation  
- Readability & complexity analysis  
- Anomaly detection in translations  

### 4. Intelligent Assistance
- NLP-powered translation suggestions  
- Dynamic glossary generation  
- Fuzzy search (Levenshtein distance)  
- Semantic translation memory  

### 5. Project Management
- Multi-language project organization  
- Translator-language assignment  
- Real-time progress dashboards  
- Scheduled report generation  

### 6. Activity Monitoring
- Comprehensive audit logs  
- Admin activity oversight  
- Email notifications for:  
--New translation assignments  
- Quality flag alerts  
- System anomalies  

### 7. Security Features
- Rate-limited authentication  
- Suspicious activity detection  
- IP blocking for anomalies  
- Role-based permissions  


## Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/RoomaPerera/translation-inventory-tool-server.git
   cd translation-inventory-tool-server

2. **Install dependencies**
   ```bash
   npm install

3. **Create a .env file in the project root with the following variables:**
   ```bash
   PORT=5000
   MONGO_URI=<YOUR_MONGODB_CONNECTION_STRING>
   SECRET=<RANDOM_SECRET_FOR_APP_ENCRYPTION>
   JWT_SECRET=<YOUR_JWT_SECRET_KEY>
   SMTP_HOST=<YOUR_SMTP_HOST>
   SMTP_PORT=<YOUR_SMTP_PORT>
   SMTP_USER=<YOUR_SMTP_USERNAME>
   SMTP_PASS=<YOUR_SMTP_PASSWORD>
   FROM_EMAIL=<EMAIL_ADDRESS_FOR_SENDING_NOTIFICATIONS>
   FRONTEND_URL=http://localhost:5173

5. **Start the development server**
   - **Backend**
     -Navigate to the project root and run:
     ```bash
     npm run dev
   - **NLP Microservice**
     In a separate terminal, navigate to the `src/nlp_service` folder and run:  
     ```bash
     cd src/nlp_service
     python app.py
     ```

### API Endpoints

#### Authentication
| Endpoint                      | Method | Body/Params                           | Description                                | Auth Required |
|-------------------------------|--------|---------------------------------------|--------------------------------------------|---------------|
| `/api/auth/register`          | POST   | `{email, password, name, role?}`      | Register new user                          | No            |
| `/api/auth/login`             | POST   | `{email, password}`                   | User login (rate-limited)                  | No            |
| `/api/auth/resetPassword`     | POST   | `{email}`                             | Initiate password reset                    | No            |
| `/api/auth/setNewPassword`    | POST   | `{token, newPassword}`                | Complete password reset                    | No            |
| `/api/auth/me`                | GET    | -                                     | Get current user data                      | JWT           |
| `/api/auth/changePassword`    | POST   | `{currentPassword, newPassword}`      | Change logged-in user's password           | JWT           |
| `/api/auth/logout`            | POST   | -                                     | Logout user                                | JWT           |

#### Users (Admin Only)
| Endpoint                          | Method | Params/Body                           | Description                                |
|-----------------------------------|--------|---------------------------------------|--------------------------------------------|
| `/api/users/:id/approve`          | PUT    | -                                     | Approve pending user                       |
| `/api/users/:id/reject`           | PUT    | -                                     | Reject pending user                        |
| `/api/users/getUserList`          | GET    | -                                     | List all users                             |
| `/api/users/filterUserList/:role` | GET    | `role` in path                        | Filter users by role                       |
| `/api/users/deleteUser/:id`       | DELETE | -                                     | Delete user                                |
| `/api/users/deleteRejectedUsers`  | DELETE | -                                     | Bulk delete rejected users                 |
| `/api/users/getPendingUsers`      | GET    | -                                     | List pending approval users                |
| `/api/users/modifyLanguages/:id`  | PUT    | `{languages: array}`                  | Update user's language assignments         |
| `/api/users/getUser/:id`          | GET    | -                                     | Get specific user details                  |

#### Projects
| Endpoint                          | Method | Params/Body                           | Description                                | Auth |
|-----------------------------------|--------|---------------------------------------|--------------------------------------------|------|
| `/api/projects`                   | POST   | `{name, description, ...}`            | Create new project                         | JWT  |
| `/api/projects`                   | GET    | -                                     | List all projects                          | JWT  |
| `/api/projects/:id`               | GET    | `id` in path                          | Get project details                        | JWT  |
| `/api/projects/:id`               | PUT    | `id` in path + update fields          | Update project                             | JWT  |
| `/api/projects/:id`               | DELETE | `id` in path                          | Delete project                             | JWT  |
| `/api/projects/:id/languages`     | GET    | `id` in path                          | Get project's languages                    | JWT  |
| `/api/projects/:id/languages`     | POST   | `id` in path + `{languages: array}`   | Assign languages to project                | JWT  |

#### Translations
| Endpoint                                     | Method | Params/Body                           | Description                                |
|----------------------------------------------|--------|---------------------------------------|--------------------------------------------|
| `/api/translations`                          | GET    | `?projectId=&language=`               | Filter translations                        |
| `/api/translations`                          | POST   | `{projectId, language, key, value}`   | Add new translation                        |
| `/api/translations/:id`                      | PUT    | `{value, status?}`                    | Update translation                         |
| `/api/translations/:id`                      | DELETE | -                                     | Delete translation                         |
| `/api/translations/:id/revisions`            | GET    | -                                     | Get revision history                       |
| `/api/translations/:id/diff/:revIndex`       | GET    | `revIndex` in path                    | Get diff for specific revision             |
| `/api/translations/:id/revert/:revIndex`     | POST   | -                                     | Revert to specific revision                |
| `/api/translations/:id/history`              | GET    | -                                     | Complete version history                   |

#### NLP Services
| Endpoint                | Method | Body                              | Description                                |
|-------------------------|--------|-----------------------------------|--------------------------------------------|
| `/api/nlp/suggest`      | POST   | `{text, sourceLang, targetLang}`  | Get translation suggestions                |
| `/api/nlp/glossary`     | POST   | `{text, language}`                | Extract glossary terms                     |

#### Developer Tools
| Endpoint                                              | Method | Params                           | Description                                |
|-------------------------------------------------------|--------|----------------------------------|--------------------------------------------|
| `/api/dev/projects/:projectId/translations/generate`  | GET    | `projectId` in path              | Export translations (JSON/CSV)             |
| `/api/dev/projects/:projectId/translations/upload`    | POST   | `projectId` + file upload        | Bulk upload translations                   |

#### Anomaly Detection
| Endpoint                           | Method | Body/Params                   | Description                                |
|------------------------------------|--------|-------------------------------|--------------------------------------------|
| `/api/anomalies/trigger-detection` | POST   | -                             | Manual anomaly detection run               |
| `/api/anomalies/cleanup`           | POST   | -                             | Clean old test data                        |
| `/api/anomalies/stats/summary`     | GET    | -                             | Get anomaly statistics                     |
| `/api/anomalies`                   | GET    | `?status=&type=`              | Filter anomalies                           |
| `/api/anomalies/:id`               | GET    | `id` in path                  | Get specific anomaly                       |
| `/api/anomalies/:id`               | PUT    | `id` + update fields          | Update anomaly                             |
| `/api/anomalies/:id/review`        | PATCH  | -                             | Mark as reviewed                           |
| `/api/anomalies/:id`               | DELETE | -                             | Delete anomaly                             |
| `/api/anomalies/block-ip`          | POST   | `{ip: string}`                | Block suspicious IP                        |

#### Activity Logs
| Endpoint          | Method | Body                | Description                     | Auth |
|-------------------|--------|---------------------|---------------------------------|------|
| `/api/activity`   | POST   | `{action, details}` | Log new activity                | JWT  |
| `/api/activity`   | GET    | `?user=&action=`    | Query activity logs             | JWT  |

#### Languages
| Endpoint              | Method | Body/Params          | Description                     | Auth        |
|-----------------------|--------|----------------------|---------------------------------|-------------|
| `/api/languages`      | GET    | -                    | List all languages              | JWT         |
| `/api/languages`      | POST   | `{code, name}`       | Add new language (Admin only)   | JWT + Admin |
| `/api/languages/:id`  | PUT    | `id` + update fields | Update language                 | JWT + Admin |
| `/api/languages/:id`  | DELETE | -                    | Delete language                 | JWT + Admin |

#### Fuzzy Search
| Endpoint            | Method | Query Params       | Description                |
|---------------------|--------|--------------------|----------------------------|
| `/api/fuzzy-search` | GET    | `?q=searchTerm`    | Search across translations |

## Project Structure

backend/
├── config/             # Database configuration and environment variables
├── controllers/        # Business logic handlers
├── middleware/         # Auth and utility middleware
├── models/             # Mongoose schema models
├── nlp_service/        # Express route definitions
├── realtime/           # Express route definitions
├── routes/             # All API endpoints
└── utils/              # Helper functions and services


## License
This project was developed as a Second‑Year university project for GTN Tech and is published here for academic and portfolio purposes only. 
