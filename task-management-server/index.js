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

    // Get all tasks
    app.get('/tasks', async (req, res) => {
      try {
        const tasks = await tasksCollection.find().toArray();
        res.send(tasks);
      } catch (error) {
        res.status(500).send({ error: 'Error fetching tasks' });
      }
    });

    // Add new task
    app.post('/tasks', async (req, res) => {
      try {
        const task = {
          ...req.body,
          createdAt: new Date(),
        };
        const result = await tasksCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Error creating task' });
      }
    });

    // Update task
    app.patch('/tasks/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: req.body }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Error updating task' });
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
