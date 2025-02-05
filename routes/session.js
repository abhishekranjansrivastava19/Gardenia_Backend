const express = require("express");
const sql = require("mssql");
// const sql = require("mssql/msnodesqlv8");
const config = require("../config/dbConfig"); // Update with your database config file
const router = express.Router();

// Add session API
router.post("/", async (req, res) => {
    const { sessionName, sessionStart, sessionEnd } = req.body;
  
    // Validate input
    if (!sessionName || !sessionStart || !sessionEnd) {
      return res.status(400).json({ message: "All fields are required" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Insert session into the database
      const result = await pool
        .request()
        .input("sessionName", sql.VarChar(255), sessionName)
        .input("sessionStart", sql.Date, sessionStart)
        .input("sessionEnd", sql.Date, sessionEnd)
        .query(
          "INSERT INTO dbo.sessions (sessionName, sessionStart, sessionEnd) VALUES (@sessionName, @sessionStart, @sessionEnd)"
        );
  
      // Respond with success
      res.status(201).json({ message: "Session added successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  

  // Get session by ID
router.get("/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Fetch the session by ID
      const result = await pool
        .request()
        .input("sessionId", sql.Int, sessionId)
        .query("SELECT * FROM dbo.sessions WHERE sessionId = @sessionId");
  
      // Check if the session exists
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "Session not found" });
      }
  
      // Respond with the session details
      res.status(200).json(result.recordset[0]);
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
  // Get all sessions
router.get("/", async (req, res) => {
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Fetch all sessions
      const result = await pool
        .request()
        .query("SELECT * FROM dbo.sessions");
  
      // Check if there are any sessions
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "No sessions found" });
      }
  
      // Respond with the list of sessions
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
  // Update session by ID
router.put("/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const { sessionName, sessionStart, sessionEnd } = req.body;
  
    // Validate input
    if (!sessionName || !sessionStart || !sessionEnd) {
      return res.status(400).json({ message: "Missing required fields" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Update session details in the database
      const result = await pool
        .request()
        .input("sessionId", sql.Int, sessionId)
        .input("sessionName", sql.VarChar(255), sessionName)
        .input("sessionStart", sql.Date, sessionStart)
        .input("sessionEnd", sql.Date, sessionEnd)
        .query(`
          UPDATE dbo.sessions
          SET sessionName = @sessionName, sessionStart = @sessionStart, sessionEnd = @sessionEnd
          WHERE sessionId = @sessionId
        `);
  
      // Check if the session exists and is updated
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: "Session not found" });
      }
  
      res.status(200).json({ message: "Session updated successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
  // Delete session by ID
router.delete("/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Check if the session is associated with any student
      const checkSessionInStudentMaster = await pool
        .request()
        .input("sessionId", sql.Int, sessionId)
        .query("SELECT * FROM dbo.studentMaster WHERE sessionId = @sessionId");
  
      if (checkSessionInStudentMaster.recordset.length > 0) {
        return res.status(400).json({ message: "Session is in use and cannot be deleted" });
      }
  
      // Delete the session if it's not in use
      const result = await pool
        .request()
        .input("sessionId", sql.Int, sessionId)
        .query("DELETE FROM dbo.sessions WHERE sessionId = @sessionId");
  
      // Check if the session exists and is deleted
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: "Session not found" });
      }
  
      res.status(200).json({ message: "Session deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
  module.exports = router;