import React from 'react';
import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import TaskColumn from '../components/TaskColumn';
import AddTaskModal from '../components/AddTaskModal';
import TaskStats from '../components/TaskStats';
import TaskCard from '../components/TaskCard';

const Dashboard = () => {
  const [activeId, setActiveId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await axios.get('https://task-management-app-vert-seven.vercel.app/tasks');
      return data;
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask) => {
      // Only send status and order in update
      const { data } = await axios.patch(
        `https://task-management-app-vert-seven.vercel.app/tasks/${updatedTask._id}`,
        {
          status: updatedTask.status,
          order: updatedTask.order
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const activeTask = tasks.find(task => task._id === active.id);
    const overTask = tasks.find(task => task._id === over.id);
    
    // Get the target status - either from the column or the task being dropped on
    const targetStatus = over.data?.current?.type === 'Column' 
      ? over.id 
      : overTask?.status;

    if (!activeTask) return;

    try {
      if (activeTask.status !== targetStatus) {
        // Moving to a different column
        await updateTaskMutation.mutateAsync({
          _id: activeTask._id,
          status: targetStatus
        });
      } else {
        // Reordering within the same column
        const columnTasks = tasks
          .filter(t => t.status === activeTask.status)
          .sort((a, b) => a.order - b.order);

        const oldIndex = columnTasks.findIndex(t => t._id === activeTask._id);
        const newIndex = columnTasks.findIndex(t => t._id === over.id);

        if (oldIndex !== newIndex) {
          await updateTaskMutation.mutateAsync({
            _id: activeTask._id,
            order: newIndex
          });
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  const todoTasks = tasks.filter(task => task.status === 'todo').sort((a, b) => a.order - b.order);
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').sort((a, b) => a.order - b.order);
  const completedTasks = tasks.filter(task => task.status === 'completed').sort((a, b) => a.order - b.order);

  const activeTask = tasks.find(task => task._id === activeId);

  return (
    <div className="flex h-screen bg-base-100">
      {/* Sidebar */}
      <aside className="w-64 bg-base-200 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Task Manager</h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary w-full"
          >
            Add New Task
          </button>
        </div>

        <div className="flex flex-col">
          <TaskStats 
            total={tasks.length}
            completed={completedTasks.length}
            inProgress={inProgressTasks.length}
            todo={todoTasks.length}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TaskColumn
              title="To Do"
              tasks={todoTasks}
              status="todo"
            />
            <TaskColumn
              title="In Progress"
              tasks={inProgressTasks}
              status="in-progress"
            />
            <TaskColumn
              title="Completed"
              tasks={completedTasks}
              status="completed"
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <TaskCard task={activeTask} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;