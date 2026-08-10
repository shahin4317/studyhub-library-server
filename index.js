const express = require('express');
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config()
const app = express();
app.use(cors())

const port = process.env.PORT || 8080
const uri = process.env.MONGO_URI




const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    const db = client.db("studyhubdb")
    const roomsCollection = db.collection('rooms')

    app.get('/rooms', async(req,res)=>{
        const result = await roomsCollection.find().toArray()
        res.send(result)
    })

    app.get('/rooms/:id', async(req,res)=>{
        const {id}= req.params
        const result = await roomsCollection.findOne({_id: new ObjectId(id)})
        res.send(result)
    })





    // Send a ping to confirm a successful connection
    const result = await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
    return result;
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});