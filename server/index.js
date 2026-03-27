const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize SQLite Database
const db = new Database('./project_management.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    board_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id)
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    column_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    priority TEXT DEFAULT 'medium',
    assignee_id TEXT,
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    project_id TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS card_labels (
    card_id TEXT NOT NULL,
    label_id TEXT NOT NULL,
    PRIMARY KEY (card_id, label_id),
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (label_id) REFERENCES labels(id)
  );
`);

// Helper function to hash passwords (simple hash for demo, use bcrypt in production)
function hashPassword(password) {
  return Buffer.from(password).toString('base64');
}

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = hashPassword(password);
    const userId = uuidv4();

    const stmt = db.prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)');
    stmt.run(userId, username, hashedPassword, email || null);

    res.json({ 
      message: 'User registered successfully',
      user: { id: userId, username, email }
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = hashPassword(password);
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hashedPassword);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ 
      message: 'Login successful',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ============ PROJECT ROUTES ============

// Get all projects for a user
app.get('/api/projects', (req, res) => {
  try {
    const { userId } = req.query;
    
    const projects = db.prepare(`
      SELECT DISTINCT p.* FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = ? OR pm.user_id = ?
    `).all(userId, userId);

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
app.post('/api/projects', (req, res) => {
  try {
    const { name, description, ownerId } = req.body;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and ownerId are required' });
    }

    const projectId = uuidv4();
    const stmt = db.prepare('INSERT INTO projects (id, name, description, owner_id) VALUES (?, ?, ?, ?)');
    stmt.run(projectId, name, description || '', ownerId);

    // Add owner as member
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(projectId, ownerId, 'owner');

    // Create default board
    const boardId = uuidv4();
    db.prepare('INSERT INTO boards (id, name, project_id) VALUES (?, ?, ?)')
      .run(boardId, 'Main Board', projectId);

    // Create default columns
    const defaultColumns = ['To Do', 'In Progress', 'Done'];
    defaultColumns.forEach((colName, index) => {
      const colId = uuidv4();
      db.prepare('INSERT INTO columns (id, name, board_id, position) VALUES (?, ?, ?, ?)')
        .run(colId, colName, boardId, index);
    });

    res.json({ 
      message: 'Project created successfully',
      projectId,
      boardId
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get project details with board
app.get('/api/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const board = db.prepare('SELECT * FROM boards WHERE project_id = ?').get(projectId);
    const columns = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position').all(board.id);
    
    const cardsWithDetails = columns.map(column => {
      const cards = db.prepare(`
        SELECT c.*, u.username as assignee_name 
        FROM cards c 
        LEFT JOIN users u ON c.assignee_id = u.id 
        WHERE c.column_id = ? 
        ORDER BY c.position
      `).all(column.id);
      
      return {
        ...column,
        cards: cards.map(card => ({
          ...card,
          labels: db.prepare('SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.label_id WHERE cl.card_id = ?').all(card.id),
          comments: db.prepare('SELECT cm.*, u.username FROM comments cm JOIN users u ON cm.user_id = u.id WHERE cm.card_id = ? ORDER BY cm.created_at').all(card.id)
        }))
      };
    });

    const members = db.prepare(`
      SELECT u.id, u.username, u.email, pm.role 
      FROM users u 
      JOIN project_members pm ON u.id = pm.user_id 
      WHERE pm.project_id = ?
    `).all(projectId);

    const labels = db.prepare('SELECT * FROM labels WHERE project_id = ?').all(projectId);

    res.json({
      project,
      board,
      columns: cardsWithDetails,
      members,
      labels
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// ============ CARD ROUTES ============

// Create card
app.post('/api/cards', (req, res) => {
  try {
    const { title, description, columnId, priority, assigneeId, dueDate } = req.body;
    
    if (!title || !columnId) {
      return res.status(400).json({ error: 'Title and columnId are required' });
    }

    const cardId = uuidv4();
    const maxPosition = db.prepare('SELECT MAX(position) as maxPos FROM cards WHERE column_id = ?').get(columnId);
    const newPosition = (maxPosition.maxPos || -1) + 1;

    const stmt = db.prepare(`
      INSERT INTO cards (id, title, description, column_id, position, priority, assignee_id, due_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(cardId, title, description || '', columnId, newPosition, priority || 'medium', assigneeId || null, dueDate || null);

    res.json({ message: 'Card created successfully', cardId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card
app.put('/api/cards/:cardId', (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, description, columnId, position, priority, assigneeId, dueDate } = req.body;
    
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (columnId !== undefined) { updates.push('column_id = ?'); values.push(columnId); }
    if (position !== undefined) { updates.push('position = ?'); values.push(position); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (assigneeId !== undefined) { updates.push('assignee_id = ?'); values.push(assigneeId); }
    if (dueDate !== undefined) { updates.push('due_date = ?'); values.push(dueDate); }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(cardId);

    const query = `UPDATE cards SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    res.json({ message: 'Card updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card
app.delete('/api/cards/:cardId', (req, res) => {
  try {
    const { cardId } = req.params;
    
    db.prepare('DELETE FROM card_labels WHERE card_id = ?').run(cardId);
    db.prepare('DELETE FROM comments WHERE card_id = ?').run(cardId);
    db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Move card to different column
app.put('/api/cards/:cardId/move', (req, res) => {
  try {
    const { cardId } = req.params;
    const { columnId, position } = req.body;
    
    if (!columnId || position === undefined) {
      return res.status(400).json({ error: 'columnId and position are required' });
    }

    // Update positions of other cards in target column
    const cardsInColumn = db.prepare('SELECT id, position FROM cards WHERE column_id = ? AND position >= ?').all(columnId, position);
    
    db.transaction(() => {
      cardsInColumn.forEach(card => {
        db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(card.position + 1, card.id);
      });
      
      db.prepare('UPDATE cards SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(columnId, position, cardId);
    })();

    res.json({ message: 'Card moved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move card' });
  }
});

// ============ COMMENT ROUTES ============

app.post('/api/comments', (req, res) => {
  try {
    const { cardId, userId, content } = req.body;
    
    if (!cardId || !userId || !content) {
      return res.status(400).json({ error: 'cardId, userId, and content are required' });
    }

    const commentId = uuidv4();
    db.prepare('INSERT INTO comments (id, card_id, user_id, content) VALUES (?, ?, ?, ?)')
      .run(commentId, cardId, userId, content);

    res.json({ message: 'Comment added successfully', commentId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============ LABEL ROUTES ============

app.post('/api/labels', (req, res) => {
  try {
    const { name, color, projectId } = req.body;
    
    if (!name || !color || !projectId) {
      return res.status(400).json({ error: 'name, color, and projectId are required' });
    }

    const labelId = uuidv4();
    db.prepare('INSERT INTO labels (id, name, color, project_id) VALUES (?, ?, ?, ?)')
      .run(labelId, name, color, projectId);

    res.json({ message: 'Label created successfully', labelId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create label' });
  }
});

app.post('/api/cards/:cardId/labels', (req, res) => {
  try {
    const { cardId } = req.params;
    const { labelId } = req.body;
    
    db.prepare('INSERT OR IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)').run(cardId, labelId);

    res.json({ message: 'Label added to card successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add label to card' });
  }
});

app.delete('/api/cards/:cardId/labels/:labelId', (req, res) => {
  try {
    const { cardId, labelId } = req.params;
    
    db.prepare('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?').run(cardId, labelId);

    res.json({ message: 'Label removed from card successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove label from card' });
  }
});

// ============ MEMBER ROUTES ============

app.post('/api/projects/:projectId/members', (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;
    
    db.prepare('INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(projectId, userId, role || 'member');

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Serve frontend for all other routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
