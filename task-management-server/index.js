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

        // If status is changing, handle reordering
        if (status && oldTask.status !== status) {
          // Get tasks in target status
          const tasksInTargetStatus = await tasksCollection
            .find({ status })
            .sort({ order: 1 })
            .toArray();

          // Update orders in target status to make room for new task
          for (let i = tasksInTargetStatus.length - 1; i >= order; i--) {
            await tasksCollection.updateOne(
              { _id: tasksInTargetStatus[i]._id },
              { $set: { order: i + 1 } }
            );
          }

          // Get tasks in old status
          const tasksInOldStatus = await tasksCollection
            .find({ status: oldTask.status, _id: { $ne: new ObjectId(id) } })
            .sort({ order: 1 })
            .toArray();

          // Reorder tasks in old status to fill the gap
          for (let i = 0; i < tasksInOldStatus.length; i++) {
            await tasksCollection.updateOne(
              { _id: tasksInOldStatus[i]._id },
              { $set: { order: i } }
            );
          }
        }

        // Update the task itself
        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: status || oldTask.status,
              order: typeof order === 'number' ? order : oldTask.order,
              updatedAt: new Date()
            }
          }
        );

        res.send(result);
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
