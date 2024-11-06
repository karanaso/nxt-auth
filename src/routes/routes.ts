import "dotenv/config";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import md5 from "md5";
import { ObjectId } from "mongodb";
import { connect } from "../connection/connection";
import { redisDelete, redisGet, redisSet } from "../connection/redis";
import { Router } from "express";
const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Returns a hello world message
 *     responses:
 *       200:
 *         description: Hello World message
 *
 */
router.get("/", (req, res) => {
  res.send("Hello World!");
});

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *              email:
 *                type: string
 *              format: email
 *              password:
 *                type: string
 *     responses:
 *       200:
 *         description: User successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - User already exists or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */ 
router.post("/signup", async (req, res): Promise<void | any> => {
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

/**
 * @swagger
 * /signin:
 *   post:
 *     summary: Sign in a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     parameters:
 *       - name: email
 *       - name: password
 *     responses:
 *       200:
 *         description: User successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Invalid credentials or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/signin", async (req, res): Promise<void | any> => {
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
      const token = jwt.sign(
        {
          id: user._id,
          email,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "30d",
        }
      );

      // Store the token in Redis
      await redisSet(md5(token), "ok");

      res.status(200).json({
        token,
        message: "User logged in",
      });
    } else {
      res.status(400).json({ message: "Password is incorrect" });
    }
  }
});

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     description: Generates a new JWT token using an existing valid token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Current valid JWT token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: New JWT token
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Token is required or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/refresh-token", async (req, res): Promise<void | any> => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
    };
    const db = await connect({ db: "users" });
    const collection = db.collection("users");
    const user = await collection.findOne({ _id: new ObjectId(decoded.id) });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const newToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "30d",
      }
    );

    // Store the token in Redis
    await redisDelete(md5(token));
    await redisSet(md5(newToken), "ok");

    res.status(200).json({
      token: newToken,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

/**
 * @swagger
 * /verify-token:
 *   post:
 *     summary: Verify JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 required: true
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 valid:
 *                   type: boolean
 *       400:
 *         description: Token is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/verify-token", async (req, res): Promise<void | any> => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  const redisToken = await redisGet(md5(token));
  if (!redisToken) {
    return res.status(401).json({ message: "Invalid token in redis" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
    };
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

/**
 * @swagger
 * /signout:
 *   post:
 *     summary: Sign out user by invalidating token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Token is required or Error logging out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post("/signout", async (req, res): Promise<void | any> => {
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
export default router;
