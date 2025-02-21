import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

const TaskColumn = ({ title, tasks, status }) => {
  const { setNodeRef } = useDroppable({
    id: status
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-base-200 p-4 rounded-lg"
    >
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <SortableContext
        items={tasks.map(task => task._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default TaskColumn; 