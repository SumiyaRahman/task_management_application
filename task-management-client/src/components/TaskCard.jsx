import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const TaskCard = ({ task }) => {
  const queryClient = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`http://localhost:5000/tasks/${task._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-base-100 p-4 rounded-lg shadow-md cursor-move"
    >
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{task.title}</h4>
        <button
          onClick={() => deleteTaskMutation.mutate()}
          className="btn btn-ghost btn-xs"
        >
          ×
        </button>
      </div>
      {task.description && (
        <p className="text-sm mt-2 text-base-content/70">{task.description}</p>
      )}
      <div className="text-xs mt-3 text-base-content/50">
        {format(new Date(task.createdAt), 'MMM d, yyyy')}
      </div>
    </div>
  );
};

export default TaskCard; 