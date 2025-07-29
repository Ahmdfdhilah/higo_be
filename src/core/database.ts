import mongoose from 'mongoose';
import { config } from './config';

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

export class Database {
  private static instance: Database;
  private retryCount = 0;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      await mongoose.connect(config.mongodbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('✅ Connected to MongoDB');
      this.retryCount = 0;

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
        this.reconnect();
      });

    } catch (error) {
      console.error('MongoDB connection failed:', error);
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (this.retryCount >= MAX_RETRIES) {
      console.error('Max retry attempts reached. Exiting...');
      process.exit(1);
    }

    this.retryCount++;
    console.log(`Reconnecting to MongoDB (attempt ${this.retryCount}/${MAX_RETRIES})...`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, RETRY_DELAY);
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('📴 Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }

  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  public getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }
}

export const database = Database.getInstance();