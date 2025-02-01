const express = require("express");
const router = express.Router();
const sql = require("mssql/msnodesqlv8");
const config = require("../config/dbConfig");

router.post("/", async (req, res) => {
  const { title, description, date } = req.body;

  // Validate input
  if (!title || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    // Insert session into the database
    const result = await pool
      .request()
      .input("title", sql.VarChar(50), title)
      .input("description", sql.VarChar(50), description)
      .input("date", sql.Date, date)
      .query(
        "INSERT INTO dbo.Notices (title, description, date) VALUES (@title, @description, @date)"
      );

    // Respond with success
    res.status(201).json({ message: "Notice added successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const pool = await sql.connect(config.metadataDBConfig);

    const result = await pool.request().query("SELECT * FROM notices");
    res.status(200).json(result.recordset); // Return the list of notices
  } catch (err) {
    console.error("Error fetching notices:", err);
    res.status(500).json({ error: "Failed to fetch notices" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;

  // Validate input
  if (!title || !description || !date) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    // Update session details in the database
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("title", sql.VarChar(50), title)
      .input("description", sql.VarChar(50), description)
      .input("date", sql.Date, date).query(`
          UPDATE dbo.Notices
          SET title = @title,
          description = @description,
          date = @date
          WHERE id = @id
        `);

    // Check if the session exists and is updated
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.status(200).json({ message: "Notice updated successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM dbo.Notices WHERE id = @id");

    // Check if the session exists and is deleted
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.status(201).json({ message: "Notice deleted successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
