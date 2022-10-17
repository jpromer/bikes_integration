import * as dotenv from 'dotenv';
import amqp, { Connection, Channel, Replies, ConsumeMessage } from 'amqplib';
dotenv.config();

export default class RabbitMQ {
  private readonly _queueName: string | string[];
  private readonly _initCallback: null | ((rabbitMQ: RabbitMQ) => void);
  private _connection: Connection | null;
  private _channel: Channel | null;
  private _countPrefetch: number;
  private _durable: boolean;
  private readonly _rabbitmqUrl = `${
    String(process.env.RABBITMQ_URL) ?? 'amqp://localhost'
  }`;

  constructor(
    queueName: string | string[],
    initCallback?: null | ((rabbitMQ: RabbitMQ) => void)
  ) {
    this._queueName = queueName;
    this._connection = null;
    this._channel = null;
    this._initCallback = initCallback != null ? initCallback : null;
    this._countPrefetch = 1;
    this._durable = true;
  }

  private async reload(): Promise<void> {
    this._connection = null;
    this._channel = null;
    void setTimeout(() => {
      console.log('RabbitMQ: Start Reconnection');
      void this.init(this._countPrefetch, this._durable).catch(() => {
        console.log('RabbitMQ: Reconnection Fails');
      });
    }, 10000);
  }

  isConnected(): boolean {
    return this._connection != null && this._channel != null;
  }

  async init(countPrefetch = 1, durable = true): Promise<RabbitMQ> {
    this._countPrefetch = countPrefetch;
    this._durable = durable;
    console.log('RabbitMQ: Start Connection');
    if (this.isConnected()) {
      return await Promise.reject(
        new Error('RabbitMQ: RabbitMQ is already connected')
      );
    }
    return await amqp.connect(this._rabbitmqUrl).then(
      async (tempConnection: Connection) => {
        this._connection = tempConnection;
        this._connection.on('error', function (this: RabbitMQ, error) {
          console.log('RabbitMQ: Connection Error Event: ', error);
          this._connection = null;
          this._channel = null;
        });
        this._connection.on(
          'close',
          function (this: RabbitMQ) {
            console.log('RabbitMQ: Connection Close Event');
            void this.reload();
          }.bind(this)
        );
        this._connection.on('blocked', function (reason) {
          console.log('RabbitMQ: Connection Blocked Event: ', { ...reason });
        });
        this._connection.on('unblocked', function () {
          console.log('RabbitMQ: Connection Unblocked Event!');
        });
        console.log('RabbitMQ: Connected!');
        return await this._connection
          .createChannel()
          .then(
            async (tempChannel: Channel) => {
              this._channel = tempChannel;
              this._channel.on('error', function (this: RabbitMQ, error) {
                console.log('RabbitMQ: Channel Error Event: ', error);
                this._channel = null;
              });
              this._channel.on('close', function (this: RabbitMQ) {
                console.log('RabbitMQ: Channel Close Event!');
                this._channel = null;
              });
              this._channel.on('return', function (message) {
                console.log('RabbitMQ: Channel Return Event: ', message);
              });
              this._channel.on('drain', function () {
                console.log('RabbitMQ: Channel Drain Event!');
              });
              console.log('RabbitMQ: Channel created!');
              console.log(
                'RabbitMQ: Init with assert existence of queue: ',
                this._queueName
              );
              if (typeof this._queueName === 'string') {
                return await Promise.resolve(
                  this._channel.assertQueue(this._queueName, {
                    durable: this._durable,
                  })
                );
              } else if (this._queueName?.length > 0) {
                try {
                  for (
                    let index = 0;
                    index < this._queueName.length - 1;
                    index++
                  ) {
                    await this._channel.assertQueue(this._queueName[index], {
                      durable: this._durable,
                    });
                  }
                } catch (error) {
                  console.log('RabbitMQ: CreateChannel Error: ', error);
                  this.close();
                  return await Promise.reject(error);
                }
                return await Promise.resolve(
                  this._channel.assertQueue(
                    this._queueName[this._queueName.length - 1],
                    { durable: this._durable }
                  )
                );
              }
              return await Promise.reject(
                new Error('RabbitMQ: Bad queueName Error')
              );
            },
            async (error) => {
              console.log('RabbitMQ: CreateChannel Error: ', error);
              this.close();
              return await Promise.reject(error);
            }
          )
          .then(
            async (ok: Replies.AssertQueue) => {
              if (this._countPrefetch !== 0)
                void this._channel?.prefetch(this._countPrefetch);
              console.log('RabbitMQ: Ok data of AssertQueue: ', ok);
              if (this._initCallback != null) {
                this._initCallback(this);
              }
              return await Promise.resolve(this);
            },
            async (error) => {
              console.log('RabbitMQ: AssertQueue Error: ', error);
              this.close();
              return await Promise.reject(error);
            }
          );
      },
      async (error) => {
        console.log('RabbitMQ: Connection Error: ', error);
        void this.reload();
        return await Promise.reject(error);
      }
    );
  }

  sendMessage(queueName: string, message: string, persistent = true): void {
    if (!this.isConnected()) {
      throw new Error('RabbitMQ: RabbitMQ is not connected');
    }
    const state: boolean | undefined = this._channel?.sendToQueue(
      queueName,
      Buffer.from(message),
      {
        persistent,
      }
    );
    console.log(`RabbitMQ: State of message in queue (${queueName}): `, state);
  }

  consumeMessages(
    queueName: string,
    callback: (message: ConsumeMessage | null) => void,
    noAck = false
  ): void {
    if (!this.isConnected()) {
      throw new Error('RabbitMQ: RabbitMQ is not connected');
    }
    this._channel
      ?.consume(
        queueName,
        (message: ConsumeMessage | null) => {
          callback(message);
          console.log(
            ` [${queueName}] Received: ${message?.content.toString() ?? ''}`
          );
          if (message != null) this._channel?.ack(message);
        },
        {
          noAck,
        }
      )
      .then(
        (ok: Replies.Consume) => {
          console.log('RabbitMQ: Ok data of Consume: ', ok);
        },
        (error) => {
          console.log('RabbitMQ: Consume Error: ', error);
          this.close();
        }
      );
  }

  close(): void {
    if (this.isConnected()) {
      this._channel
        ?.close()
        .catch((error) => {
          console.log('RabbitMQ: Channel Close Error: ', error);
        })
        .finally(() => {
          this._connection?.close().catch((error) => {
            console.log('RabbitMQ: Connection Close Error: ', error);
          });
        });
    } else {
      this._connection?.close().catch((error) => {
        console.log('RabbitMQ: Connection Close Error: ', error);
      });
    }
  }
}
