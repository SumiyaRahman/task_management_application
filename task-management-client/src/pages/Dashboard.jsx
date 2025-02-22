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
    if (!activeTask) return;

    try {
      // Dropping in a column
      if (over.data?.current?.type === 'Column') {
        const newStatus = over.id;
        if (activeTask.status !== newStatus) {
          // Store original task state
          const originalTask = { ...activeTask };
          
          // Optimistically update UI
          queryClient.setQueryData(['tasks'], oldTasks => 
            oldTasks.map(t => t._id === activeTask._id 
              ? { ...t, status: newStatus }
              : t
            )
          );

          try {
            await updateTaskMutation.mutateAsync({
              _id: activeTask._id,
              status: newStatus,
              order: tasks.filter(t => t.status === newStatus).length
            });
          } catch (error) {
            // Revert on error
            queryClient.setQueryData(['tasks'], oldTasks =>
              oldTasks.map(t => t._id === activeTask._id ? originalTask : t)
            );
            throw error;
          }
        }
        return;
      }

      // Dropping on another task
      const overTask = tasks.find(task => task._id === over.id);
      if (!overTask) return;

      // Same status, different position
      if (activeTask.status === overTask.status) {
        const sameColumnTasks = tasks
          .filter(task => task.status === activeTask.status)
          .sort((a, b) => a.order - b.order);

        const oldIndex = sameColumnTasks.findIndex(task => task._id === active.id);
        const newIndex = sameColumnTasks.findIndex(task => task._id === over.id);

        if (oldIndex !== newIndex) {
          // Store original tasks state
          const originalTasks = [...tasks];

          // Optimistically update UI
          queryClient.setQueryData(['tasks'], oldTasks => {
            const newTasks = [...oldTasks];
            const taskToMove = newTasks.find(t => t._id === activeTask._id);
            const targetTask = newTasks.find(t => t._id === overTask._id);
            if (taskToMove && targetTask) {
              taskToMove.order = targetTask.order;
            }
            return newTasks;
          });

          try {
            await updateTaskMutation.mutateAsync({
              _id: activeTask._id,
              status: activeTask.status,
              order: newIndex
            });
          } catch (error) {
            // Revert on error
            queryClient.setQueryData(['tasks'], originalTasks);
            throw error;
          }
        }
      } 
      // Different status
      else {
        // Store original task state
        const originalTask = { ...activeTask };

        // Optimistically update UI
        queryClient.setQueryData(['tasks'], oldTasks =>
          oldTasks.map(t => t._id === activeTask._id 
            ? { ...t, status: overTask.status, order: overTask.order }
            : t
          )
        );

        try {
          await updateTaskMutation.mutateAsync({
            _id: activeTask._id,
            status: overTask.status,
            order: overTask.order
          });
        } catch (error) {
          // Revert on error
          queryClient.setQueryData(['tasks'], oldTasks =>
            oldTasks.map(t => t._id === activeTask._id ? originalTask : t)
          );
          throw error;
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Show error to user
      toast.error('Failed to update task. Please try again.');
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