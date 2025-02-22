import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

const TaskColumn = ({ title, tasks, status }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-base-200 p-4 rounded-lg h-[calc(100vh-120px)] flex flex-col ${
        isOver ? 'ring-2 ring-primary ring-inset' : ''
      }`}
    >
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <SortableContext
        items={tasks.map(task => task._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 flex-1 overflow-auto">
          {tasks.map(task => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default TaskColumn; 