const express = require('express');
const cors = require('cors');
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u51v8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    
    const database = client.db("taskManagement");
    const usersCollection = database.collection("users");
    const tasksCollection = database.collection("tasks");

    // Save user data from Google login
    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        
        // Check if user already exists
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        
        if (existingUser) {
          return res.send({ message: 'User already exists' });
        }

        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).send({ error: 'Error saving user data' });
      }
    });

    // Get all tasks with sorting by order
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().sort({ order: 1 }).toArray();
        res.send(tasks);
      } catch (error) {
        res.status(500).send({ error: 'Error fetching tasks' });
      }
    });

    // Add new task
    app.post('/tasks', async (req, res) => {
      try {
        // Get the highest order number in the same status
        const highestOrderTask = await tasksCollection
          .find({ status: req.body.status })
          .sort({ order: -1 })
          .limit(1)
          .toArray();

        const nextOrder = highestOrderTask.length > 0 ? highestOrderTask[0].order + 1 : 0;

        const task = {
          ...req.body,
          createdAt: new Date(),
          order: nextOrder,
          status: req.body.status || 'todo' // Default to todo if no status provided
        };

        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Error creating task' });
      }
    });

    // Update task status and order
    app.patch('/tasks/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { status, order } = req.body;
        
        // Find the task being updated
        const oldTask = await tasksCollection.findOne({ _id: new ObjectId(id) });
        if (!oldTask) {
          return res.status(404).send({ error: 'Task not found' });
        }

        // If moving to a different status (between columns)
        if (status && oldTask.status !== status) {
          // Get tasks in the new status column
          const tasksInNewStatus = await tasksCollection
            .find({ status })
            .sort({ order: 1 })
            .toArray();

          // Get tasks in the old status column
          const tasksInOldStatus = await tasksCollection
            .find({ 
              status: oldTask.status,
              _id: { $ne: new ObjectId(id) }
            })
            .sort({ order: 1 })
            .toArray();

          // First, update the task's status and order
          await tasksCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                status,
                order: tasksInNewStatus.length, // Add to end of new column
                updatedAt: new Date()
              }
            }
          );

          // Then, reorder tasks in the old status column
          const updateOldStatusPromises = tasksInOldStatus.map((task, index) => {
            return tasksCollection.updateOne(
              { _id: task._id },
              { $set: { order: index } }
            );
          });

          await Promise.all(updateOldStatusPromises);

          res.send({ success: true });
        } 
        // If reordering within the same status (within column)
        else if (typeof order === 'number') {
          const tasksInSameStatus = await tasksCollection
            .find({ 
              status: oldTask.status,
              _id: { $ne: new ObjectId(id) }
            })
            .sort({ order: 1 })
            .toArray();

          // Make space for the task at the new position
          await tasksCollection.updateMany(
            { 
              status: oldTask.status,
              order: { $gte: order },
              _id: { $ne: new ObjectId(id) }
            },
            { $inc: { order: 1 } }
          );

          // Update the task's order
          await tasksCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                order,
                updatedAt: new Date()
              }
            }
          );

          // Normalize orders to prevent gaps
          const allTasksInStatus = await tasksCollection
            .find({ status: oldTask.status })
            .sort({ order: 1 })
            .toArray();

          const updateOrderPromises = allTasksInStatus.map((task, index) => {
            return tasksCollection.updateOne(
              { _id: task._id },
              { $set: { order: index } }
            );
          });

          await Promise.all(updateOrderPromises);

          res.send({ success: true });
        }
      } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).send({ error: 'Error updating task' });
      }
    });

    // Reorder tasks within the same status
    app.post('/tasks/reorder', async (req, res) => {
      try {
        const { taskId, newOrder, status } = req.body;

        // Get the task to be moved
        const taskToMove = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
        
        if (!taskToMove) {
          return res.status(404).send({ error: 'Task not found' });
        }

        // Get all tasks in the same status
        const tasksInSameStatus = await tasksCollection
          .find({ status })
          .sort({ order: 1 })
          .toArray();

        // Calculate new orders
        const updatePromises = tasksInSameStatus.map((task) => {
          let newTaskOrder = task.order;

          if (task._id.toString() === taskId) {
            newTaskOrder = newOrder;
          } else if (task.order >= newOrder) {
            newTaskOrder = task.order + 1;
          }

          return tasksCollection.updateOne(
            { _id: task._id },
            { $set: { order: newTaskOrder } }
          );
        });

        await Promise.all(updatePromises);
        res.send({ success: true });
      } catch (error) {
        res.status(500).send({ error: 'Error reordering tasks' });
      }
    });

    // Delete task
    app.delete('/tasks/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Error deleting task' });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
