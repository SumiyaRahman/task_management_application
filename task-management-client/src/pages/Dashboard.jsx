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
      const { data } = await axios.get('http://localhost:5000/tasks');
      return data;
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask) => {
      // Only send status and order in update
      const { data } = await axios.patch(
        `http://localhost:5000/tasks/${updatedTask._id}`,
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
    
    // Get the correct status from the container
    const newStatus = over.data?.current?.type === 'Column' ? over.id : over.data?.current?.status;
    
    if (activeTask.status !== newStatus) {
      // Moving to a different status/column
      const tasksInTargetStatus = tasks.filter(t => t.status === newStatus);
      const updatedTask = {
        ...activeTask,
        status: newStatus,
        order: tasksInTargetStatus.length // Add to end of new column
      };

      // Optimistically update UI
      queryClient.setQueryData(['tasks'], oldTasks => {
        return oldTasks.map(t => t._id === activeTask._id ? updatedTask : t);
      });
      
      try {
        await updateTaskMutation.mutateAsync(updatedTask);
      } catch (error) {
        console.error('Error updating task:', error);
        // Revert optimistic update on error
        queryClient.setQueryData(['tasks'], tasks);
      }
    } else {
      // Reordering within the same column
      const columnTasks = tasks
        .filter(t => t.status === activeTask.status)
        .sort((a, b) => a.order - b.order);
        
      const oldIndex = columnTasks.findIndex(t => t._id === active.id);
      const newIndex = columnTasks.findIndex(t => t._id === over.id);

      if (oldIndex !== newIndex) {
        const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
        
        // Create an array of update operations
        const updates = reorderedTasks.map((task, index) => ({
          ...task,
          order: index
        }));

        // Store original tasks state
        const originalTasks = [...tasks];

        // Optimistically update UI for all affected tasks
        queryClient.setQueryData(['tasks'], oldTasks => {
          return oldTasks.map(t => {
            const updatedTask = updates.find(u => u._id === t._id);
            return updatedTask || t;
          });
        });

        try {
          // Update all reordered tasks
          await Promise.all(
            updates.map(task => 
              updateTaskMutation.mutateAsync({
                _id: task._id,
                status: task.status,
                order: task.order
              })
            )
          );
        } catch (error) {
          console.error('Error reordering tasks:', error);
          // Revert to original state on error
          queryClient.setQueryData(['tasks'], originalTasks);
        }
      }
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