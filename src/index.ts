import "dotenv/config"
import express from "express";
import cors from "cors";
import jwt from 'jsonwebtoken'
import argon2 from "argon2";
import md5 from "md5";
import { connect } from "./connection/connection";
import { ObjectId } from "mongodb";
import { limiter } from "./helpers/limiter";
import { redisDelete, redisGet, redisSet } from "./connection/redis";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
if (process.env.NODE_ENV === "production") {
  console.log('Running in production mode');
  app.use(limiter);
} else {
  console.log('Running in development mode');
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/signup", async (req, res): Promise<void | any> => {
  if (!req.body.email)
    return res.status(400).json({ message: "Email is required" });
  if (!req.body.password)
    return res.status(400).json({ message: "Password is required" });

  const { email, password } = req.body;
  const db = await connect({ db: "users" });
  const collection = db.collection("users");
  const user = await collection.findOne({ email });
  
  if (user) {
    res.status(400).json({ message: "User already exists" });
  } else {
    const _password = await argon2.hash(password);
    await collection.insertOne({ email, password: _password });
    res.status(200).json({ message: "User created" });
  }
});

app.post('/signin', async (req, res): Promise<void | any> => {
  if (!req.body.email)    
    return res.status(400).json({ message: "Email is required" });
  if (!req.body.password)
    return res.status(400).json({ message: "Password is required" });

  const { email, password } = req.body;
  const db = await connect({ db: "users" });
  const collection = db.collection("users");
  const user = await collection.findOne({ email });
  
  if (!user) {
    res.status(400).json({ message: "User does not exist" });
  } else {
    const verified = await argon2.verify(user?.password as string, password);
    if (verified) {
      const token = jwt.sign({ 
        id: user._id,
        email,
       }, process.env.JWT_SECRET as string, {
        expiresIn: "30d",        
      });

      // Store the token in Redis
      await redisSet(md5(token),'ok');

      res.status(200).json({ 
        token,
        message: "User logged in"
      });
    } else {
      res.status(400).json({ message: "Password is incorrect" });
    }
  }
});

app.post('/refresh-token', async (req, res): Promise<void | any> => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };
    const db = await connect({ db: "users" });
    const collection = db.collection("users");
    const user = await collection.findOne({ _id: new ObjectId(decoded.id) });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const newToken = jwt.sign({
      id: user._id,
      email: user.email,
    }, process.env.JWT_SECRET as string, {
      expiresIn: "30d",
    });

    // Store the token in Redis
    await redisDelete(md5(token));
    await redisSet(md5(newToken),'ok');

    res.status(200).json({
      token: newToken,
      message: "Token refreshed successfully"
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

app.post('/verify-token', async (req, res): Promise<void | any> => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  const redisToken = await redisGet(md5(token));
  if (!redisToken) {
    return res.status(401).json({ message: "Invalid token in redis" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };
    const db = await connect({ db: "users" });
    const collection = db.collection("users");
    const user = await collection.findOne({ _id: new ObjectId(decoded.id) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Token is valid", valid: true });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

app.post('/signout', async (req, res): Promise<void | any> => {
  try {
    const { authorization } = req.headers;
    const token = authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    await redisDelete(md5(token));
    res.json({ message: "User logged out" });
  } catch (e) {
    res.status(400).json({ message: "Error logging out" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
