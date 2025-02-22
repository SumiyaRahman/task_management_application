import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const AddTaskModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    status: 'todo'
  });

  const addTaskMutation = useMutation({
    mutationFn: async (newTask) => {
      const { data } = await axios.post('https://task-management-app-vert-seven.vercel.app/tasks', newTask);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      onClose();
      setTaskData({ title: '', description: '', status: 'todo' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addTaskMutation.mutate(taskData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Add New Task</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              className="input input-bordered"
              maxLength={50}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
              className="textarea textarea-bordered"
              maxLength={200}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Category</span>
            </label>
            <select
              value={taskData.status}
              onChange={(e) => setTaskData({ ...taskData, status: e.target.value })}
              className="select select-bordered w-full"
              required
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addTaskMutation.isLoading}
            >
              {addTaskMutation.isLoading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal; 