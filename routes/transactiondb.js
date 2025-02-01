const express = require("express");
const sql = require("mssql/msnodesqlv8");
const config = require("../config/dbConfig"); // your SQL Server config
const app = express();
const router = express.Router();

// Endpoint to get all transactions from transactionDb
router.get("/", async (req, res) => {
  try {
    // Connect to the database
    const pool = await sql.connect(config.metadataDBConfig);

    const query = `
      SELECT 
        t.transactionId,
        t.studentId,
        t.orderId,
        t.razorpay_order_id,
        t.razorpay_payment_id,
        t.transactionDate,
        t.registrationAmt,
        s.firstName,
        s.lastName,
        s.email,
        s.phone,
        s.rollNo,
        s.scholarNo,
        c.className
      FROM 
        transactionDb t
      JOIN 
        studentMaster s ON t.studentId = s.studentId
      JOIN 
          classes c ON s.classId = c.classId  
    `;

    // Query to get all transactions from the transactionDb table
    const result = await pool.request().query(query);

    // Return the result as JSON
    res.status(200).json(result.recordset);

    // Close the database connection
    pool.close();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error retrieving transactions", error: error.message });
  }
});

router.get("/db/:studentId", async (req, res) => {
  const studentId = req.params.studentId;
  try {
    const pool = await sql.connect(config.metadataDBConfig);

    const query = `
        SELECT 
          t.transactionId,
          t.studentId,
          t.orderId,
          t.razorpay_order_id,
          t.razorpay_payment_id,
          t.transactionDate,
          t.registrationAmt,
          s.firstName,
          s.lastName,
          s.email,
          s.phone,
          s.fatherName,
          s.motherName,
          c.classId,
          c.className,
          s.stream
        FROM 
          transactionDb t
        JOIN 
          studentMaster s ON t.studentId = s.studentId
        JOIN 
          classes c ON s.classId = c.classId
        WHERE 
          t.studentId = @studentId
      `;

    const result = await pool
      .request()
      .input("studentId", sql.VarChar, studentId)
      .query(query);

    res.status(200).json(result.recordset);
    pool.close();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error retrieving transactions", error: error.message });
  }
});

module.exports = router;
