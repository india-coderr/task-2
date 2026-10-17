import mongoose from 'mongoose';

let isReplicaSet = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_sales_mgmt';
    
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000
    });

    console.log(`[DATABASE] MongoDB Connected to host: ${conn.connection.host}, database: ${conn.connection.name}`);

    // Check replica set status via admin hello command
    try {
      const adminDb = conn.connection.db.admin();
      const helloResult = await adminDb.command({ hello: 1 });
      
      if (helloResult.setName) {
        isReplicaSet = true;
        console.log(`[DATABASE] Replica set verified: "${helloResult.setName}". Multi-document transactions are fully supported.`);
      } else {
        isReplicaSet = false;
        console.error(
          '\n====================================================================\n' +
          '[DATABASE ERROR] MongoDB is NOT running as a replica set!\n' +
          'Transactions (required for sales consistency) require a replica set.\n' +
          'Options to enable transactions:\n' +
          ' 1. Use MongoDB Atlas (free tier comes with replica set enabled by default).\n' +
          ' 2. Or start local MongoDB with --replSet rs0 and run rs.initiate().\n' +
          '====================================================================\n'
        );
      }
    } catch (cmdErr) {
      console.warn('[DATABASE] Could not verify replica set hello command:', cmdErr.message);
    }

    return conn;
  } catch (error) {
    console.error(`[DATABASE ERROR] Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export const getIsReplicaSet = () => isReplicaSet;
