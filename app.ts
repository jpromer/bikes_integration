import * as dotenv from 'dotenv';
import express, {
  Express,
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { ConsumeMessage } from 'amqplib';
import { QueuesNames, QueuesNamesList } from './src/constants/queue-names';
import RabbitMQ from './src/services/rabbitmq';
import bikes from './src/routes/bikes';
import swagger from './src/routes/swagger';
import HttpError from './src/models/http-error';
import { BikeInterface } from './src/models/bike';
import { createBike, deleteBike, updateBike } from './src/controllers/bikes';
dotenv.config();

const app: Express = express();
const port: number = Number(process.env.PORT) ?? 3000;

function initConsumeMessagesRabbitMQ(tempRabbitMQ: RabbitMQ): void {
  console.log('initConsumeMessagesRabbitMQ!!!');
  tempRabbitMQ.consumeMessages(
    QueuesNames.createBike,
    (message: ConsumeMessage | null) => {
      if (message != null) {
        const bike: BikeInterface = JSON.parse(message.content.toString());
        void createBike(bike);
      }
    }
  );
  tempRabbitMQ.consumeMessages(
    QueuesNames.updateBike,
    (message: ConsumeMessage | null) => {
      if (message != null) {
        const bike: BikeInterface = JSON.parse(message.content.toString());
        void updateBike(bike);
      }
    }
  );
  tempRabbitMQ.consumeMessages(
    QueuesNames.deleteBike,
    (message: ConsumeMessage | null) => {
      if (message != null) {
        const bikeId: string = message.content.toString();
        void deleteBike(bikeId);
      }
    }
  );
}

const rabbitMQ: RabbitMQ = new RabbitMQ(
  QueuesNamesList,
  initConsumeMessagesRabbitMQ
);

app.use(cors());

app.use(helmet());

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

app.use('/bikes', bikes);
app.use('/api-docs', swagger);

app.use((req: Request, res: Response) => {
  throw new HttpError('Could not find this route.', 404);
});

app.use(((error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(error);
  }
  res.status(error?.code ?? 500);
  res.json({ message: error?.message ?? 'An unknown error occurred!' });
}) as ErrorRequestHandler);

mongoose
  .connect(`${process.env.MONGODB_CONNECTION ?? ''}`)
  .then(() => {
    app.listen(port, () => {
      console.log(`Bikes API listening on port ${port}`);
      rabbitMQ.init(1).catch(() => {
        console.log('error!');
      });
      process.on('exit', (code) => {
        rabbitMQ.close();
      });
    });
  })
  .catch((err) => {
    console.log('Init Mongoose: ', err);
  });

process.on('SIGINT', () => {
  process.exit(1);
});
