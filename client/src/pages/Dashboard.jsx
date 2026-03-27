import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`/api/projects?userId=${user.id}`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/projects', {
        name: newProjectName,
        description: newProjectDescription,
        ownerId: user.id
      });
      setShowModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/board/${projectId}`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>My Projects</h1>
        <div className="user-info">
          <span>Welcome, {user.username}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="projects-grid">
        {projects.map(project => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => handleProjectClick(project.id)}
          >
            <h3>{project.name}</h3>
            <p>{project.description || 'No description'}</p>
            <div className="project-meta">
              <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="create-project-btn"
        onClick={() => setShowModal(true)}
        title="Create Project"
      >
        +
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
              <button type="submit" className="btn">Create Project</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
