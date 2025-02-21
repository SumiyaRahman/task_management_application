const TaskStats = ({ total, completed, inProgress, todo }) => {
  return (
    <div className="stats shadow w-full">
      <div className="stat">
        <div className="stat-title">Total Tasks</div>
        <div className="stat-value">{total}</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">Completed</div>
        <div className="stat-value text-success">{completed}</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">In Progress</div>
        <div className="stat-value text-warning">{inProgress}</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">To Do</div>
        <div className="stat-value text-error">{todo}</div>
      </div>
    </div>
  );
};

export default TaskStats; 