const express = require("express");
const cors = require("cors");
const config = require('./config/dbConfig')
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/admin");
const sessionRoutes = require("./routes/session");
const classRoutes = require("./routes/class");
const streamRoutes = require("./routes/stream");
const paymentRoutes = require("./routes/payment");
const transactionRoutes = require("./routes/transactiondb");
const marksRoutes = require("./routes/marksfeed");
const noticeRoutes = require("./routes/notice");
const sql = require("mssql/msnodesqlv8");
require('dotenv/config');

const app = express();
const api = process.env.API_URL;
// Middleware
app.use(cors());
app.options("*", cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
// Routes
app.use(`${api}/student`, studentRoutes); 
app.use(`${api}/admin`, adminRoutes); 
app.use(`${api}/session`, sessionRoutes); 
app.use(`${api}/class`, classRoutes); 
app.use(`${api}/stream`, streamRoutes); 
app.use(`${api}/payment`, paymentRoutes);
app.use(`${api}/transactions`, transactionRoutes);
app.use(`${api}/marks`, marksRoutes);
app.use(`${api}/notices`, noticeRoutes);

app.use(
  "/uploads",
  express.static(__dirname + "/uploads")
);
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port  http://localhost:${PORT}`);
});


// Example of connecting to the database
sql
  .connect(config.metadataDBConfig)
  .then((pool) => {
    console.log("Connected to SQL Server");
    return pool.close(); // Close the connection when done
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });



// Graceful shutdown: Close all DB connections
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await closeAllConnections();
  process.exit(0);
});
