import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FaTrash } from 'react-icons/fa';

const TaskCard = ({ task }) => {
  const queryClient = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task._id,
    data: {
      type: 'Task',
      task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move'
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`https://task-management-app-vert-seven.vercel.app/tasks/${task._id}`);
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
      className="bg-base-100 p-4 rounded-lg shadow-md cursor-move hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start">
        <h4 className="font-medium">{task.title}</h4>
        <button
          onClick={() => deleteTaskMutation.mutate()}
          className="btn btn-ghost btn-xs text-error"
        >
          <FaTrash />
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