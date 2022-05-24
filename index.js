const express = require('express')
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kgl7e.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        const partCollection = client.db('shizuka_industries').collection('parts');
        const orderCollection = client.db('shizuka_industries').collection('orders');

        app.get('/part', async (req, res) => {
            const query = {};
            const cursor = partCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts)
        });

        app.get('/part/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await partCollection.findOne(query);
            res.send(part);
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = orderCollection.insertOne(order)
            res.send(result);
        })


        app.get('/order', async (req, res) => {
            const customer = req.query.customerEmail;
            const query = { customer: customer };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally {

    }

}
run().catch(console.dir)

console.log(uri)

app.get('/', (req, res) => {
    res.send('Hello from shizuka!')
})

app.listen(port, () => {
    console.log(`Shizuka App listening on port ${port}`)
})