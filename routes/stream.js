const express = require("express");
const router = express.Router();
const sql = require("mssql");
// const sql = require("mssql/msnodesqlv8");
const config = require("../config/dbConfig"); // Adjust the path based on your project structure

// GET API to fetch all streams
router.get("/", async (req, res) => {
  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch all streams
    const result = await pool.request().query(`
      SELECT 
        streamId,
        streamName
      FROM dbo.streams
      ORDER BY streamName ASC
    `);

    // Return the result
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
    const streamId = req.params.id;
  
    try {
      // Open database connection
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Query to fetch class by classId
      const result = await pool.request()
        .input("streamId", sql.Int, streamId)
        .query(`
          SELECT * 
          FROM dbo.streams
          WHERE streamId = @streamId
        `);
  
      // If class is found, return the data
      if (result.recordset.length > 0) {
        res.status(200).json(result.recordset[0]);
      } else {
        res.status(404).json({ message: "Stream not found" });
      }
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
router.post("/", async (req, res) => {
  const { streamName } = req.body;

  // Validate input
  if (!streamName) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    // Insert session into the database
    const result = await pool
      .request()
      .input("streamName", sql.VarChar(50), streamName)
      .query(
        "INSERT INTO dbo.streams (streamName) VALUES (@streamName)"
      );

    // Respond with success
    res.status(201).json({ message: "Stream added successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.put("/:streamId", async (req, res) => {
  const { streamId } = req.params;
  const { streamName } = req.body;

  // Validate input
  if (!streamName) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    // Update session details in the database
    const result = await pool
      .request()
      .input("streamId", sql.Int, streamId)
      .input("streamName", sql.VarChar(50), streamName).query(`
          UPDATE dbo.streams
          SET streamName = @streamName
          WHERE streamId = @streamId
        `);

    // Check if the session exists and is updated
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Stream not found" });
    }

    res.status(200).json({ message: "Stream updated successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.delete("/:streamId", async (req, res) => {
    const { streamId } = req.params;
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Check if the session is associated with any student
      const checkSessionInClass = await pool
        .request()
        .input("streamId", sql.Int, streamId)
        .query("SELECT * FROM dbo.classes WHERE streamId = @streamId");
  
      if (checkSessionInClass.recordset.length > 0) {
        return res.status(400).json({ message: "Stream is in use and cannot be deleted" });
      }
  
      const result = await pool
        .request()
        .input("streamId", sql.Int, streamId)
        .query("DELETE FROM dbo.streams WHERE streamId = @streamId");
  
      // Check if the session exists and is deleted
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: "Stream not found" });
      }
  
      res.status(200).json({ message: "Stream deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

module.exports = router;
