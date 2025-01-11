const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kgl7e.mongodb.net/?retryWrites=true&w=majority`;
console.log(process.env.DB_PASS);
console.log(uri);

const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
	const authHeader = req.headers.authorization;
	console.log(authHeader);
	if (!authHeader) {
		return res.status(401).send({ message: "UnAuthorized Access" });
	}
	const token = authHeader.split(" ")[1];
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
		if (err) {
			return res.status(403).send({ message: "Forbidden access" });
		}
		req.decoded = decoded;
		next();
	});
}

async function run() {
	try {
		await client.connect();

		const partCollection = client.db("shizuka_industries").collection("parts");
		const orderCollection = client
			.db("shizuka_industries")
			.collection("orders");
		const paymentCollection = client
			.db("shizuka_industries")
			.collection("payments");
		const userCollection = client.db("shizuka_industries").collection("users");

		app.put("/user/:email", async (req, res) => {
			const email = req.params.email;
			const user = req.body;
			const filter = { email: email };
			const options = { upsert: true };
			const updateDoc = {
				$set: user,
			};
			const result = await userCollection.updateOne(filter, updateDoc, options);
			const token = jwt.sign(
				{ email: email },
				process.env.ACCESS_TOKEN_SECRET,
				{ expiresIn: "1h" }
			);
			res.send({ result, token });
		});

		app.get("/admin/:email", async (req, res) => {
			const email = req.params.email;
			const user = await userCollection.findOne({ email: email });
			const isAdmin = user.role === "admin";
			res.send({ admin: isAdmin });
		});

		app.put("/user/admin/:email", verifyJWT, async (req, res) => {
			const email = req.params.email;
			const requester = req.decoded.email;
			const requesterAccount = await userCollection.findOne({
				email: requester,
			});
			if (requesterAccount.role === "admin") {
				const filter = { email: email };
				const updateDoc = {
					$set: { role: "admin" },
				};
				const result = await userCollection.updateOne(filter, updateDoc);
				res.send(result);
			} else {
				res.status(403).send({ message: "forbidded" });
			}
		});

		app.get("/user", verifyJWT, async (req, res) => {
			const users = await userCollection.find().toArray();
			res.send(users);
		});

		app.get("/part", async (req, res) => {
			const query = {};
			const cursor = partCollection.find(query);
			const parts = await cursor.toArray();
			res.send(parts);
		});

		app.get("/part/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const part = await partCollection.findOne(query);
			res.send(part);
		});

		app.post("/order", async (req, res) => {
			const order = req.body;
			const result = orderCollection.insertOne(order);
			res.send(result);
		});

		app.get("/orders", async (req, res) => {
			const order = await orderCollection.find().toArray();
			res.send(order);
		});

		app.get("/order", verifyJWT, async (req, res) => {
			const customerEmail = req.query.customerEmail;
			const decodedEmail = req.decoded.email;
			if (customerEmail === decodedEmail) {
				const query = { customerEmail: customerEmail };
				const orders = await orderCollection.find(query).toArray();
				return res.send(orders);
			} else {
				return res.status(403).send({ message: "forbidden access" });
			}
		});

		app.get("/order/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const order = await orderCollection.findOne(query);
			res.send(order);
		});

		app.delete("/order/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await orderCollection.deleteOne(query);
			res.send(result);
		});

		app.patch("/order/:id", async (req, res) => {
			const id = req.params.id;
			const payment = req.body;
			const filter = { _id: ObjectId(id) };
			const updatedDoc = {
				$set: {
					paid: true,
					transactionId: payment.transactionId,
				},
			};

			const result = await paymentCollection.insertOne(payment);
			const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
			res.send(updatedDoc);
		});

		app.post("/create-payment-intent", async (req, res) => {
			const order = req.body;
			const price = order.price;
			const amount = parseFloat(price) * 100;
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types: ["card"],
			});
			res.send({ clientSecret: paymentIntent.client_secret });
		});
	} finally {
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Hello from shizuka industry!");
});

app.listen(port, () => {
	console.log(`Shizuka App is listening on port ${port}`);
});
