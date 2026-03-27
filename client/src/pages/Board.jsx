import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Board() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [boardData, setBoardData] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [newCardPriority, setNewCardPriority] = useState('medium');
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchBoardData();
  }, [projectId]);

  const fetchBoardData = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}`);
      setBoardData(response.data);
    } catch (error) {
      console.error('Failed to fetch board data:', error);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/cards', {
        title: newCardTitle,
        description: newCardDescription,
        columnId: selectedColumn.id,
        priority: newCardPriority
      });
      setShowCardModal(false);
      setNewCardTitle('');
      setNewCardDescription('');
      setNewCardPriority('medium');
      fetchBoardData();
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/comments', {
        cardId: selectedCard.id,
        userId: user.id,
        content: commentText
      });
      setCommentText('');
      fetchBoardData();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteCard = async () => {
    try {
      await axios.delete(`/api/cards/${selectedCard.id}`);
      setSelectedCard(null);
      fetchBoardData();
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  if (!boardData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="board-container">
      <div className="board-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/dashboard')}>← Back</button>
          <span className="board-title">{boardData.project.name}</span>
        </div>
      </div>

      <div className="columns-wrapper">
        {boardData.columns.map(column => (
          <div key={column.id} className="column">
            <div className="column-header">
              {column.name}
              <span>({column.cards.length})</span>
            </div>
            <div className="column-cards">
              {column.cards.map(card => (
                <div
                  key={card.id}
                  className={`card-item ${getPriorityClass(card.priority)}`}
                  onClick={() => setSelectedCard(card)}
                >
                  <div className="card-title">{card.title}</div>
                  {card.labels && card.labels.length > 0 && (
                    <div className="card-labels">
                      {card.labels.map(label => (
                        <span
                          key={label.id}
                          className="label"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="card-meta">
                    {card.assignee_name && <span>👤 {card.assignee_name}</span>}
                    {card.due_date && <span>📅 {new Date(card.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="add-card-btn"
              onClick={() => {
                setSelectedColumn(column);
                setShowCardModal(true);
              }}
            >
              + Add card
            </button>
          </div>
        ))}
      </div>

      {/* Add Card Modal */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Card to {selectedColumn?.name}</h2>
              <button className="close-btn" onClick={() => setShowCardModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCard}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={newCardDescription}
                  onChange={(e) => setNewCardDescription(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newCardPriority}
                  onChange={(e) => setNewCardPriority(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid #dfe1e6', borderRadius: '4px' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button type="submit" className="btn">Add Card</button>
            </form>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal card-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Card Details</h2>
              <button className="close-btn" onClick={() => setSelectedCard(null)}>×</button>
            </div>
            <div className="card-detail-header">
              <div className={`card-detail-title ${getPriorityClass(selectedCard.priority)}`}>
                {selectedCard.title}
              </div>
            </div>
            
            <div className="card-detail-section">
              <h4>Description</h4>
              <div className="card-description">
                {selectedCard.description || 'No description'}
              </div>
            </div>

            <div className="card-detail-section">
              <h4>Comments</h4>
              {selectedCard.comments && selectedCard.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-author">{comment.username}</div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              ))}
              <form onSubmit={handleAddComment} className="add-comment">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                />
                <button type="submit">Send</button>
              </form>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={handleDeleteCard}>
                Delete Card
              </button>
              <button className="btn" onClick={() => setSelectedCard(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
