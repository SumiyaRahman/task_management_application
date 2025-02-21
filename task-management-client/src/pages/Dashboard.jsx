import React from 'react';
import { useState } from 'react';
import { DndContext, closestCorners, useSensor, TouchSensor, MouseSensor, useSensors } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import TaskColumn from '../components/TaskColumn';
import AddTaskModal from '../components/AddTaskModal';
import TaskStats from '../components/TaskStats';

const Dashboard = () => {
  // Define sensors first
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

  // Other hooks
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:5000/tasks');
      return data;
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask) => {
      const { data } = await axios.patch(
        `http://localhost:5000/tasks/${updatedTask._id}`,
        updatedTask
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTask = tasks.find(task => task._id === active.id);
    const updatedTask = {
      ...activeTask,
      status: over.id
    };

    updateTaskMutation.mutate(updatedTask);
  };

  if (isLoading) return <div>Loading...</div>;

  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="p-6">
      <div className="mb-8">
        <TaskStats 
          total={tasks.length}
          completed={completedTasks.length}
          inProgress={inProgressTasks.length}
          todo={todoTasks.length}
        />
      </div>

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="btn btn-primary mb-6"
      >
        Add New Task
      </button>

      <DndContext
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
        sensors={sensors}
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
      </DndContext>

      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard; 