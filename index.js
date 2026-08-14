const express = require('express');
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

dotenv.config()
const app = express();
app.use(express.json())
app.use(cors())

const port = process.env.PORT || 8080
const uri = process.env.MONGO_URI


const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
console.log(JWKS, "jwks");



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = (req, res, next) => {
  console.log(`${req.method} | {req.url}`);
  next()
}
const varifyToken = async (req, res, next) => {
  const { authorization } = req.headers
  const token = authorization?.split(" ")[1]
  console.log(token);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorize' })
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: 'http://localhost:3000', // Should match your JWT issuer, which is the BASE_URL
      audience: 'http://localhost:3000', // Should match your JWT audience, which is the BASE_URL by default
    })
    console.log(payload);

    req.user = payload;
    console.log(req.user);
    next()
  } catch (error) {
    console.error('Token validation failed:', error)
    return res.status(401).json({ message: 'Unauthorize' })
  }


}


async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    const db = client.db("studyhubdb")
    const roomsCollection = db.collection('rooms')
    const bookingCollection = db.collection('bookkings')

    app.get('/rooms', async (req, res) => {
      try {
        const {
          search,
          amenities,
          minPrice,
          maxPrice,
          floor
        } = req.query;

        const query = {};

        // Search by room name
        if (search) {
          query.name = {
            $regex: search,
            $options: "i"
          };
        }

        // Amenities filter
        if (amenities) {
          const amenitiesArray = amenities
            .split(",")
            .filter(Boolean);

          if (amenitiesArray.length > 0) {
            query.amenities = {
              $in: amenitiesArray
            };
          }
        }

        // Price filter
        if (minPrice || maxPrice) {
          query.hourlyRate = {};

          if (minPrice) {
            query.hourlyRate.$gte = Number(minPrice);
          }

          if (maxPrice) {
            query.hourlyRate.$lte = Number(maxPrice);
          }
        }

        // Floor filter
        if (floor) {
          query.floor = {
            $regex: floor,
            $options: "i"
          };
        }

        console.log("Room Query:", query);

        const result = await roomsCollection
          .find(query)
          .toArray();

        res.status(200).json(result);

      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Failed to fetch rooms",
          error: error.message
        });
      }
    });

    app.get('/rooms/:id',
      logger,


      async (req, res) => {
        console.log(req.user, "req");
        const { id } = req.params
        const result = await roomsCollection.findOne({ _id: new ObjectId(id) })
        res.send(result)
      })



    app.post('/rooms', async (req, res) => {
      try {
        const roomsData = req.body
        console.log(roomsData);
        const result = await roomsCollection.insertOne(roomsData)
        res.send(result)

      } catch (error) {
        res.status(500).send({
          message: "Failed to add room",
          error: error.message
        })

      }

    })
    // for my listing
    app.get('/my-rooms', async (req, res) => {
      try {
        const ownerId = req.query.ownerId;

        const result = await roomsCollection
          .find({ ownerId: ownerId })
          .toArray();

        res.send(result);

      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch my rooms",
          error: error.message
        });
      }
    });
    // for edit page 
    app.patch('/rooms/:id', async (req, res) => {
      const { id } = req.params
      const edit = req.body
      const result = await roomsCollection.updateOne({ _id: new ObjectId(id) },
        { $set: edit }
      )
      res.send(result)

    })
    // for delete
    app.delete('/rooms/:id', async (req, res) => {
      const { id } = req.params
      const result = await roomsCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {
      const bookingdata = req.body
      const result = await bookingCollection.insertOne(bookingdata)
      res.json(result)

    })



    app.get('/bookings', async (req, res) => {
      try {
        const userId = req.query.userId;

        const result = await bookingCollection
          .find({ userId: userId })
          .toArray();

        res.send(result);

      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch bookings",
          error: error.message
        });
      }
    });

    app.patch('/bookings/:id/cancel', async (req, res) => {
      try {

        const { id } = req.params;

        const result = await bookingCollection.updateOne(
          {
            _id: new ObjectId(id),
            status: "confirmed"
          },
          {
            $set: {
              status: "cancelled"
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            message: "Booking not found"
          });
        }

        res.json({
          message: "Booking cancelled successfully",
          result
        });

      } catch (error) {

        console.error(error);

        res.status(500).json({
          message: "Failed to cancel booking",
          error: error.message
        });

      }
    });




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