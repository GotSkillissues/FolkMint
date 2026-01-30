const { pool } = require("./config/database");

// Simple test to check database connection
const testDBConnection = async () => {
  try {
    let query = 'SELECT * from product;';
    const client = await pool.connect();
    const result = await client.query(query);
    for (let row of result.rows) {
      console.log(row);
    }
    return result;  
    process.exit(0);       
  } catch (error) {
    console.error('✗ Database connection error:', error.message);
    process.exit(1);
  }
};

testDBConnection();