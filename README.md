# 📋 TaskFlow — Real-Time Collaborative Task Management

> A full-stack, real-time collaborative task management application. Two or more users can work on the same board simultaneously and see each other's changes instantly.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?logo=socket.io&logoColor=white)](https://socket.io)

**🌐 Live Demo:** *coming soon — deploy following instructions below*

![TaskFlow Screenshot](./screenshots/board.png)

---

## ✨ Features

### 🤝 Real-Time Collaboration
- **Multi-user boards** — invite teammates by email with editor or viewer roles
- **Live updates via Socket.io** — task creation, edits, moves, and comments propagate instantly across all connected clients
- **Online presence** — see who's currently viewing the board (avatars in the header)
- **Per-board permission enforcement** — viewers can read but not edit; owners control membership

### 📋 Kanban Board
- **Drag & drop** for tasks (within and across lists) and lists themselves
- **Default lists** ("To Do", "In Progress", "Done") created automatically with every new board — customisable anytime
- **Rich task model** — priority (low/medium/high), due dates, assignees, labels, descriptions, comments
- **Overdue indicators** — visually highlight tasks past their due date
- **Quick-add UI** — Enter to save, Esc to cancel, no modal overload

### 🔐 Auth & Security
- JWT-based authentication with bcrypt password hashing
- Per-route board-access middleware enforces owner/editor/viewer roles
- Socket authentication via JWT — sockets can only join boards the user has access to

### 💬 Comments
- Comment thread on every task with user attribution and timestamps
- Real-time comment delivery to all viewers of the task
- Authors and board owners can delete comments

---

## 🛠️ Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18 · Vite · React Router · Tailwind CSS · @hello-pangea/dnd (drag-drop) · Socket.io client · Lucide icons · date-fns |
| **Backend** | Node.js · Express · Socket.io · Mongoose · JWT · bcryptjs |
| **Database** | MongoDB Atlas with compound indexes |
| **Real-time** | Socket.io (WebSocket transport with polling fallback) |

---

## 🏗️ Architecture

### Real-Time Sync Pattern

```
┌──────────┐    HTTP POST     ┌──────────┐   .save()   ┌──────────┐
│ Client A │ ────────────────▶│ Express  │────────────▶│ MongoDB  │
└──────────┘                  │   API    │             └──────────┘
                              └─────┬────┘
                                    │ io.to(room).emit()
                              ┌─────▼─────┐
                              │ Socket.io │
                              └─────┬─────┘
                          ┌─────────┴─────────┐
                          ▼                   ▼
                     ┌──────────┐        ┌──────────┐
                     │ Client A │        │ Client B │
                     │ (update) │        │ (update) │
                     └──────────┘        └──────────┘
```

Every mutation (create / update / delete / move) is followed by a room-scoped Socket.io broadcast. Clients listening on `board:<id>` receive the change and patch their local state — no full reloads.

### Permission Layers
1. **HTTP middleware** — `loadBoard()` checks the user's membership and required role before any controller runs
2. **Socket middleware** — authenticates the socket connection via JWT before any event handlers fire
3. **Room-join validation** — `socket.on('board:join')` re-checks board access before adding the socket to the room

### Optimistic UI
Drag-and-drop updates render locally first, then sync with the server. If the server rejects (e.g., permission lost mid-action), the UI reloads from source-of-truth.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (Atlas free tier or local)

### Setup

```bash
# Clone the repo
git clone https://github.com/<your-username>/taskflow.git
cd taskflow

# === Backend ===
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and a JWT secret
npm run dev
# Server runs on http://localhost:5000

# === Frontend (new terminal) ===
cd ../client
npm install
npm run dev
# Client runs on http://localhost:5173
```

Open `http://localhost:5173`, sign up two accounts (in different browsers or incognito windows), create a board on Account A, invite Account B by email, and watch live collaboration in action.

### Environment Variables (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/taskflow
JWT_SECRET=<run: openssl rand -base64 32>
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

---

## 📂 Project Structure

```
taskflow/
├── server/
│   ├── config/db.js
│   ├── models/
│   │   ├── User.js              # auth user
│   │   ├── Board.js             # owner + members[]
│   │   ├── List.js              # board columns
│   │   └── Task.js              # tasks w/ embedded comments
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   └── boardAccess.js       # role-based board permissions
│   ├── controllers/             # business logic (auth, board, list, task)
│   ├── routes/                  # REST endpoints
│   ├── sockets/index.js         # Socket.io handlers
│   └── server.js
└── client/
    ├── src/
    │   ├── api/
    │   │   ├── axios.js         # HTTP client w/ token interceptor
    │   │   └── socket.js        # Socket.io singleton
    │   ├── context/AuthContext  # session state
    │   ├── pages/
    │   │   ├── Login / Signup
    │   │   ├── BoardsList       # home: list & create boards
    │   │   └── BoardView        # board page (drag-drop + real-time)
    │   └── components/
    │       ├── ListColumn       # kanban column
    │       ├── TaskCard         # compact task card
    │       ├── TaskModal        # detail view w/ comments
    │       ├── MembersPanel     # invite & manage members
    │       └── UserAvatar
    └── vite.config.js
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Sign up |
| `POST` | `/api/auth/login` | Sign in |
| `GET`  | `/api/auth/me` | Current user |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/boards` | List user's boards |
| `POST` | `/api/boards` | Create board (auto-seeds 3 lists) |
| `GET`  | `/api/boards/:id` | Full board (lists + tasks) |
| `PATCH`| `/api/boards/:id` | Update metadata (owner only) |
| `DELETE` | `/api/boards/:id` | Delete board (owner only) |
| `POST` | `/api/boards/:id/members` | Invite by email |
| `PATCH`| `/api/boards/:id/members/:userId` | Change role |
| `DELETE` | `/api/boards/:id/members/:userId` | Remove member |

### Lists & Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/lists/board/:boardId` | Create list |
| `PATCH`| `/api/lists/board/:boardId/reorder` | Reorder lists |
| `PATCH`| `/api/lists/board/:boardId/:id` | Rename list |
| `DELETE` | `/api/lists/board/:boardId/:id` | Delete list (cascades tasks) |
| `POST` | `/api/tasks/board/:boardId` | Create task |
| `PATCH`| `/api/tasks/board/:boardId/:id` | Update task fields |
| `PATCH`| `/api/tasks/board/:boardId/:id/move` | Move between lists / reposition |
| `DELETE` | `/api/tasks/board/:boardId/:id` | Delete task |
| `POST` | `/api/tasks/board/:boardId/:id/comments` | Add comment |
| `DELETE` | `/api/tasks/board/:boardId/:id/comments/:commentId` | Remove comment |

### Socket.io Events

**Client → Server**
- `board:join <boardId>` — join board room
- `board:leave <boardId>` — leave board room
- `task:typing { boardId, taskId }` — broadcast typing indicator

**Server → Client** (broadcast to room)
- `board:online-users [users]` — sent on join
- `user:joined | user:left { user }` — presence updates
- `board:updated | board:member-added | board:member-removed | board:member-updated`
- `list:created | list:updated | list:deleted | list:reordered`
- `task:created | task:updated | task:moved | task:deleted`
- `task:comment-added | task:comment-removed`

---

## 🚢 Deployment

**Frontend (Vercel):**
1. Import the client folder on Vercel
2. Set build command `npm run build`, output dir `dist`
3. Add env: `VITE_API_URL` if you decouple frontend from backend domain

**Backend (Render/Railway):**
1. Deploy server folder as a Node service
2. Set environment vars (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` = deployed frontend URL)
3. Update `cors` origin and Socket.io CORS to match

**Database:** MongoDB Atlas free tier handles this app comfortably.

---

## 🗺️ Roadmap

- [ ] Email notifications on invite & task assignment
- [ ] @mentions in comments with notifications
- [ ] File attachments (S3 / Cloudinary)
- [ ] Activity log per board
- [ ] AI-powered task summarisation (Anthropic Claude)
- [ ] Native mobile app (React Native)

---

## 👤 Author

**Adarsh Sharma** — built end-to-end as a portfolio project demonstrating real-time collaboration architecture.

[LinkedIn](https://www.linkedin.com/in/adarsh201sharma/) · [GitHub](https://github.com/adarsh201sharma)

---

## 📄 License

MIT — feel free to fork, adapt, and learn from it.
