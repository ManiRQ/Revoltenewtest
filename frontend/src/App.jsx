import { useRef, useState } from 'react';

function createTask(text) {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
  };
}

export default function App() {
  const [draft, setDraft] = useState('');
  const [tasks, setTasks] = useState([]);
  const inputRef = useRef(null);
  const completedCount = tasks.filter((task) => task.completed).length;
  const taskCountLabel = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} · ${completedCount} completed`;

  function handleSubmit(event) {
    event.preventDefault();

    const text = draft.trim();
    if (!text) {
      return;
    }

    setTasks((currentTasks) => [...currentTasks, createTask(text)]);
    setDraft('');
    inputRef.current?.focus();
  }

  function toggleTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function deleteTask(taskId) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  return (
    <main className="app-shell">
      <div className="app-content">
        <header className="page-header">
          <p className="eyebrow">A little more room to think</p>
          <h1>To-do list</h1>
          <p className="page-intro">Keep it simple. Take one thing at a time.</p>
        </header>

        <form className="task-form" onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="task-input">
            New task
          </label>
          <div className="input-row">
            <input
              ref={inputRef}
              id="task-input"
              className="task-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="What needs to get done?"
              autoComplete="off"
            />
            <button className="add-button" type="submit" disabled={!draft.trim()}>
              Add task
            </button>
          </div>
        </form>

        <section className="task-section" aria-labelledby="task-list-heading">
          <div className="list-heading">
            <h2 id="task-list-heading">Your list</h2>
            <p className="task-count" role="status" aria-live="polite" aria-atomic="true">
              {taskCountLabel}
            </p>
          </div>

          {tasks.length === 0 ? (
            <p className="empty-state">
              Nothing on your list yet. Add a task above to get started.
            </p>
          ) : (
            <ul className="task-list">
              {tasks.map((task) => (
                <li className={`task-row${task.completed ? ' is-complete' : ''}`} key={task.id}>
                  <label className="task-label" htmlFor={`task-${task.id}`}>
                    <input
                      className="task-checkbox"
                      id={`task-${task.id}`}
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className="task-text">{task.text}</span>
                  </label>
                  <button
                    className="delete-button"
                    type="button"
                    aria-label={`Delete task: ${task.text}`}
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
