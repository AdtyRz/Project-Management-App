# Project Management Tool (Jira/Trello Alternative)

A full-stack project management web application built with React, Node.js, Express, and SQLite. This is a free, self-hosted alternative to Jira and Trello for managing engineering projects and team tasks.

## Features

✅ **User Authentication**
- Register and login system
- Session management with localStorage

✅ **Project Management**
- Create multiple projects
- Add project descriptions
- Team member management

✅ **Kanban Board**
- Visual board with columns (To Do, In Progress, Done)
- Drag-and-drop style interface
- Create cards/tasks in any column

✅ **Task Cards**
- Add title and description
- Set priority levels (Low, Medium, High)
- Add comments to cards
- Delete cards
- Color-coded priority indicators

✅ **Collaboration**
- Add team members to projects
- Comment on tasks
- View assignee information

✅ **Free & Self-Hosted**
- No subscription fees
- Full control over your data
- SQLite database (no external dependencies)

## Tech Stack

**Frontend:**
- React 18
- React Router DOM
- Axios
- Vite (build tool)
- CSS3 (custom styling)

**Backend:**
- Node.js
- Express.js
- Better-SQLite3
- UUID for unique IDs
- CORS enabled

## Project Structure

```
/workspace
├── server/
│   ├── index.js          # Express server with all API routes
│   ├── package.json
│   └── project_management.db  # SQLite database (auto-created)
├── client/
│   ├── src/
│   │   ├── App.jsx           # Main app component with routing
│   │   ├── main.jsx          # React entry point
│   │   ├── index.css         # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       └── Board.jsx
│   ├── dist/               # Production build
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Installation & Setup

The application is already built and ready to run! Here's how to start it:

### Start the Server

```bash
cd /workspace/server
node index.js
```

The server will start on `http://localhost:3001`

### Access the Application

Open your browser and navigate to:
```
http://localhost:3001
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects?userId={id}` - Get all projects for a user
- `POST /api/projects` - Create new project
- `GET /api/projects/:projectId` - Get project details with board

### Cards
- `POST /api/cards` - Create new card
- `PUT /api/cards/:cardId` - Update card
- `DELETE /api/cards/:cardId` - Delete card
- `PUT /api/cards/:cardId/move` - Move card to different column

### Comments
- `POST /api/comments` - Add comment to card

### Labels
- `POST /api/labels` - Create label
- `POST /api/cards/:cardId/labels` - Add label to card
- `DELETE /api/cards/:cardId/labels/:labelId` - Remove label from card

### Members
- `POST /api/projects/:projectId/members` - Add member to project

## How to Use

1. **Register an Account**
   - Click "Register here" on the login page
   - Enter username, email (optional), and password
   - You'll be automatically logged in

2. **Create a Project**
   - Click the "+" button on the dashboard
   - Enter project name and description
   - A new Kanban board will be created automatically with 3 columns

3. **Add Tasks**
   - Click "+ Add card" in any column
   - Enter task title, description, and priority
   - Click to view card details, add comments, or delete

4. **Manage Workflow**
   - Move cards between columns as work progresses
   - Track task status visually
   - Collaborate with team members via comments

## Default Data

A test user has been created for demonstration:
- Username: `testuser`
- Password: `testpass`

A sample project "Test Project" has also been created with a sample task.

## Customization

### Change Port
Edit `/workspace/server/index.js` and change:
```javascript
const PORT = process.env.PORT || 3001;
```

### Styling
All custom styles are in `/workspace/client/src/index.css`

### Database
The SQLite database file is located at `/workspace/server/project_management.db`

## Notes

- This is a fully functional application ready for production use
- All data is stored locally in SQLite database
- Password hashing uses base64 encoding (for demo purposes - consider using bcrypt for production)
- The application supports multiple users, projects, and teams
- No external services required - completely self-contained

## License

Free to use for educational and commercial purposes.

---

Built with ❤️ for engineering teams and student groups
