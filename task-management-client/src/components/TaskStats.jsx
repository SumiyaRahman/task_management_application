import React from 'react';

const TaskStats = ({ total, completed, inProgress, todo }) => {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">Statistics</h3>
      <div className="stats stats-vertical shadow bg-base-100">
        <div className="stat">
          <div className="stat-title">Total Tasks</div>
          <div className="stat-value text-primary">{total}</div>
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
    </div>
  );
};

export default TaskStats; 