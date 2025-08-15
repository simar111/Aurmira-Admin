const mongoose = require('mongoose');
const db = 'NewEcom'; // Replace with your new database name

const connectToDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI; // Cluster URI without database name
    const connection = await mongoose.createConnection(`${dbUri}/${db}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Connected to MongoDB Database: ${db}`);
    return connection;
  } catch (error) {
    console.error(`Error connecting to DB ${db}:`, error);
    throw error;
  }
};

module.exports = { connectToDB };