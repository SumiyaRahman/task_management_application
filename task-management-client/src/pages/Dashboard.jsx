import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import TaskColumn from '../components/TaskColumn';
import AddTaskModal from '../components/AddTaskModal';
import TaskStats from '../components/TaskStats';
import TaskCard from '../components/TaskCard';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [activeId, setActiveId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await axios.get('https://task-management-app-vert-seven.vercel.app/tasks');
      return data;
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask) => {
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
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(task => task._id === active.id);
    const overTask = tasks.find(task => task._id === over.id);

    try {
      // Moving between columns
      if (over.data?.current?.type === 'Column') {
        const newStatus = over.id;
        if (activeTask.status !== newStatus) {
          const tasksInNewStatus = tasks.filter(t => t.status === newStatus);
          await updateTaskMutation.mutateAsync({
            _id: activeTask._id,
            status: newStatus,
            order: tasksInNewStatus.length
          });
        }
      }
      // Reordering within same column or moving to different column
      else if (overTask) {
        const sameColumn = activeTask.status === overTask.status;
        const columnTasks = tasks
          .filter(t => t.status === overTask.status)
          .sort((a, b) => a.order - b.order);

        if (sameColumn) {
          // Reordering within same column
          const oldIndex = columnTasks.findIndex(t => t._id === activeTask._id);
          const newIndex = columnTasks.findIndex(t => t._id === overTask._id);

          if (oldIndex !== newIndex) {
            // Optimistically update UI
            const newTasks = [...tasks];
            const movedTask = newTasks.find(t => t._id === activeTask._id);
            if (movedTask) {
              movedTask.order = newIndex;
              queryClient.setQueryData(['tasks'], newTasks);
            }

            await updateTaskMutation.mutateAsync({
              _id: activeTask._id,
              status: activeTask.status,
              order: newIndex
            });
          }
        } else {
          // Moving to different column
          await updateTaskMutation.mutateAsync({
            _id: activeTask._id,
            status: overTask.status,
            order: overTask.order
          });
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
      // Refresh tasks on error to ensure correct state
      queryClient.invalidateQueries(['tasks']);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  const todoTasks = tasks
    .filter(task => task.status === 'todo')
    .sort((a, b) => a.order - b.order);

  const inProgressTasks = tasks
    .filter(task => task.status === 'in-progress')
    .sort((a, b) => a.order - b.order);

  const completedTasks = tasks
    .filter(task => task.status === 'completed')
    .sort((a, b) => a.order - b.order);

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
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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