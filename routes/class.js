const express = require("express");
const router = express.Router();
const sql = require("mssql/msnodesqlv8");
const config = require("../config/dbConfig"); // Adjust the path as per your project structure

// GET API to fetch all classes
router.get("/", async (req, res) => {
  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch all classes with their associated streams
    const result = await pool.request().query(`
      SELECT 
        c.classId,
        c.className,
        c.classType,
        c.registrationAmt,
        c.streamId,
        st.streamName AS streamName -- Fetch stream name from the streams table
      FROM dbo.classes c
      LEFT JOIN dbo.streams st ON c.streamId = st.streamId -- Join with streams table
      ORDER BY c.className ASC
    `);

    // Return the result
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
    const classId = req.params.id;
  
    try {
      // Open database connection
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Query to fetch class by classId
      const result = await pool.request()
        .input("classId", sql.Int, classId)
        .query(`
          SELECT * 
          FROM dbo.classes
          WHERE classId = @classId
        `);
  
      // If class is found, return the data
      if (result.recordset.length > 0) {
        res.status(200).json(result.recordset[0]);
      } else {
        res.status(404).json({ message: "Class not found" });
      }
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
router.get("/stream/:streamId", async (req, res) => {
    const streamId = req.params.streamId;
  
    try {
      // Open database connection
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Query to fetch classes by streamId
      const result = await pool.request()
        .input("streamId", sql.Int, streamId)
        .query(`
          SELECT 
            classId,
            className,
            classType,
            registrationAmt,
            streamId
          FROM dbo.classes
          WHERE streamId = @streamId
          ORDER BY className ASC
        `);
  
      // If classes are found, return the data
      if (result.recordset.length > 0) {
        res.status(200).json(result.recordset);
      } else {
        res.status(404).json({ message: "No classes found for the selected stream." });
      }
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  router.post("/", async (req, res) => {
    const { className, classType, streamId, registrationAmt } = req.body;
  
    // Validate input
    if (!className || !classType || !streamId || !registrationAmt) {
      return res.status(400).json({ message: "All fields are required" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Insert session into the database
      await pool
        .request()
        .input("className", sql.VarChar(50), className)
        .input("classType", sql.VarChar(50), classType)
        .input("streamId", sql.Int, streamId)
        .input("registrationAmt", sql.VarChar(50), registrationAmt)
        .query(
          "INSERT INTO dbo.classes (className, classType, streamId, registrationAmt) VALUES (@className, @classType, @streamId, @registrationAmt)"
        );
  
      // Respond with success
      res.status(201).json({ message: "Class added successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  
  router.put("/:classId", async (req, res) => {
    const { classId } = req.params;
    const { className, classType, streamId, registrationAmt } = req.body;
  
    // Validate input
    if (!className || !classType || !streamId || !registrationAmt) {
      return res.status(400).json({ message: "Missing required fields" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Update session details in the database
      const result = await pool
        .request()
        .input("classId", sql.Int, classId)
        .input("className", sql.VarChar(50), className)
        .input("classType", sql.VarChar(50), classType)
        .input("streamId", sql.VarChar(50), streamId)
        .input("registrationAmt", sql.VarChar(50), registrationAmt)
        .query(`
            UPDATE dbo.classes
            SET className = @className,
            classType = @classType,
            streamId = @streamId,
            registrationAmt = @registrationAmt
            WHERE classId = @classId
          `);
  
      // Check if the session exists and is updated
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: "Class not found" });
      }
  
      res.status(200).json({ message: "Class updated successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });



  router.delete("/:classId", async (req, res) => {
      const { classId } = req.params;
    
      try {
        // Connect to the database
        const pool = await sql.connect(config.metadataDBConfig);
    
        // Check if the session is associated with any student
        const checkClassInStudentMaster = await pool
          .request()
          .input("classId", sql.Int, classId)
          .query("SELECT * FROM dbo.studentMaster WHERE classId = @classId");
    
        if (checkClassInStudentMaster.recordset.length > 0) {
          return res.status(400).json({ message: "Class is in use and cannot be deleted" });
        }
    
        const result = await pool
          .request()
          .input("classId", sql.Int, classId)
          .query("DELETE FROM dbo.classes WHERE classId = @classId");
    
        // Check if the session exists and is deleted
        if (result.rowsAffected[0] === 0) {
          return res.status(404).json({ message: "Class not found" });
        }
    
        res.status(200).json({ message: "Class deleted successfully" });
      } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

module.exports = router;
