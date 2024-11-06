import "dotenv/config"
import express from "express";
import cors from "cors";
import { limiter } from "./helpers/limiter";
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import authRouter from "./routes/routes";

const swaggerOptions = {
  swaggerDefinition: {
    myapi: '3.0.0',
    info: {
      title: 'nxt-auth API',
      version: '1.0.0',
      description: 'API documentation',
    },
    servers: [
      {
        url: `${process.env.PORT}`,
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // files containing annotations as above
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/', authRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

if (process.env.NODE_ENV === "production") {
  console.log('Running in production mode');
  app.use(limiter);
} else {
  console.log('Running in development mode');
}

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
