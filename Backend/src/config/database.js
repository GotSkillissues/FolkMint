// Database configuration

const connectDB = async () => {
  try {
    // TODO: Implement database connection logic
    // Example for MongoDB:
    // await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
