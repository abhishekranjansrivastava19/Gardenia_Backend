const express = require("express");
const sql = require("mssql/msnodesqlv8");
const jwt = require("jsonwebtoken");
const config = require("../config/dbConfig"); // Update with your database config file
const router = express.Router();



router.get("/:adminId", async (req, res) => {
    const { adminId } = req.params;
  
    // Validate the adminId
    if (!adminId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Query to fetch admin details by ID
      const result = await pool
        .request()
        .input("adminId", sql.Int, adminId)
        .query("SELECT adminId, email, isAdmin FROM dbo.admin WHERE adminId = @adminId");
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      const admin = result.recordset[0];
      res.status(200).json({ admin });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  router.get("/", async (req, res) => {
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Query to fetch all admins
      const result = await pool
        .request()
        .query("SELECT adminId, email, isAdmin FROM dbo.admin");
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "No admins found" });
      }
  
      res.status(200).json({ admins: result.recordset });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });


// Add Admin API
router.post("/addAdmin", async (req, res) => {
  const { email, password, isAdmin } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    // Insert admin data into the admin table
    const result = await pool
      .request()
      .input("email", sql.VarChar(100), email)
      .input("password", sql.VarChar(255), password)
      .input("isAdmin", sql.Bit, isAdmin !== undefined ? isAdmin : true) // Default to true
      .query(
        `
        INSERT INTO dbo.admin (email, password, isAdmin)
        VALUES (@email, @password, @isAdmin)
      `
      );

    res.status(201).json({ message: "Admin added successfully" });
  } catch (err) {
    console.error("Database error:", err);

    // Handle duplicate email error
    if (err.number === 2627) {
      res.status(400).json({ message: "Email already exists" });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
});


router.post("/adminLogin", async (req, res) => {
    const { email, password } = req.body;
  
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Query the admin table to find the admin by email
      const result = await pool
        .request()
        .input("email", sql.VarChar(100), email)
        .query("SELECT * FROM dbo.admin WHERE email = @email");
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      const admin = result.recordset[0];
  
      // Verify password
      if (admin.password !== password) {
        return res.status(401).json({ message: "Invalid password" });
      }
  
      // Check if the user is an admin
      if (!admin.isAdmin) {
        return res.status(403).json({ message: "Access denied. Not an admin." });
      }
  
      // Generate JWT token
      const token = jwt.sign(
        {
          adminId: admin.adminId,
          email: admin.email,
          isAdmin: admin.isAdmin,
        },
        'JWT_SECRET',
        { expiresIn: "1h" }
      );
         
      res.status(200).send({token: token, message: "login successfully", result:'success'});
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  router.put("/:adminId", async (req, res) => {
    const { adminId } = req.params;
    const { email, password, isAdmin } = req.body;
  
    // Validate input
    if (!email && !password && isAdmin === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Build the dynamic update query
      let query = "UPDATE dbo.admin SET ";
      const updates = [];
      
      // Set up dynamic parameters
      const request = pool.request(); // Request instance
  
      if (email) {
        updates.push("email = @email");
        request.input("email", sql.VarChar(255), email);
      }
      if (password) {
        updates.push("password = @password");
        request.input("password", sql.VarChar(255), password);
      }
      if (isAdmin !== undefined) {
        updates.push("isAdmin = @isAdmin");
        request.input("isAdmin", sql.Bit, isAdmin);
      }
  
      query += updates.join(", ");
      query += " WHERE adminId = @adminId";
  
      // Add the adminId parameter for the WHERE clause
      request.input("adminId", sql.Int, adminId);
  
      // Execute the update query
      const result = await request.query(query);
  
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      res.status(200).json({ message: "Admin updated successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  

  router.delete("/:adminId", async (req, res) => {
    const { adminId } = req.params;
  
    try {
      // Connect to the database
      const pool = await sql.connect(config.metadataDBConfig);
  
      // Check if the admin exists
      const adminExists = await pool
        .request()
        .input("adminId", sql.Int, adminId)
        .query("SELECT * FROM dbo.admin WHERE adminId = @adminId");
  
      if (adminExists.recordset.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      // Delete the admin
      const result = await pool
        .request()
        .input("adminId", sql.Int, adminId)
        .query("DELETE FROM dbo.admin WHERE adminId = @adminId");
  
      if (result.rowsAffected[0] === 0) {
        return res.status(500).json({ message: "Failed to delete admin" });
      }
  
      res.status(200).json({ message: "Admin deleted successfully" });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

module.exports = router;