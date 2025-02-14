const express = require("express");
const sql = require("mssql");
// const sql = require("mssql/msnodesqlv8");
const config = require("../config/dbConfig"); // your SQL Server config
const app = express();
const router = express.Router();

// API to feed marks for one student
router.post("/:studentId/feed", async (req, res) => {
  const { english, hindi, maths, science } = req.body;
  const { studentId } = req.params;

  if (!studentId || !english || !hindi || !maths || !science) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const pool = await sql.connect(config.metadataDBConfig);

    const checkResult = await pool.query(
      `SELECT * FROM MarksheetMaster WHERE StudentId = ${studentId}`
    );

    if (checkResult.recordset.length > 0) {
      // Student already has marks, so update instead of inserting
      await pool.query(
        `UPDATE MarksheetMaster 
           SET english = ${english}, hindi = ${hindi}, maths = ${maths}, science = ${science} 
           WHERE studentId = ${studentId}`
      );

      return res.status(200).json({ message: "Marks updated successfully" });
    } else {
      await pool
        .request()
        .input("studentId", sql.Int, studentId)
        .input("english", sql.Int, english)
        .input("hindi", sql.Int, hindi)
        .input("maths", sql.Int, maths)
        .input("science", sql.Int, science)
        .query(
          "INSERT INTO dbo.MarksheetMaster (studentId, english, hindi, maths, science) VALUES (@studentId, @english, @hindi, @maths, @science)"
        );
      res.status(201).json({ message: "Marks added successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/feedAll", async (req, res) => {
  const { marks } = req.body; // Expecting an array of student marks

  if (!marks || marks.length === 0) {
    return res.status(400).json({ message: "Marks data is required" });
  }

  try {
    const pool = await sql.connect(config.metadataDBConfig);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const student of marks) {
      const { studentId, english, hindi, maths, science } = student;

      // Check if studentId exists in studentMaster
      const studentCheck = await transaction
        .request()
        .input("studentId", sql.Int, studentId)
        .query(
          `SELECT studentId FROM studentMaster WHERE studentId = @studentId`
        );

      if (studentCheck.recordset.length === 0) {
        return res
          .status(400)
          .json({ message: `Student ID ${studentId} not found` });
      }

      const totalMarks = english + hindi + maths + science;

      let status = false; // Default to fail
      if (
        english >= 8 &&
        hindi >= 8 &&
        maths >= 8 &&
        science >= 8 &&
        totalMarks >= 40
      ) {
        status = true; // Pass only if both conditions are met
      }

      // Upsert (Insert if not exists, update if exists)
      await transaction
        .request()
        .input("studentId", sql.Int, studentId)
        .input("english", sql.Int, english)
        .input("hindi", sql.Int, hindi)
        .input("maths", sql.Int, maths)
        .input("science", sql.Int, science)
        .input("status", sql.Bit, status).query(`
          MERGE INTO MarksheetMaster AS target
          USING (SELECT @studentId AS studentId) AS source
          ON target.studentId = source.studentId
          WHEN MATCHED THEN 
              UPDATE SET english = @english, hindi = @hindi, maths = @maths, science = @science, status = @status
          WHEN NOT MATCHED THEN 
              INSERT (studentId, english, hindi, maths, science, status)
              VALUES (@studentId, @english, @hindi, @maths, @science, @status);
        `);
    }

    await transaction.commit();
    res.status(201).json({ message: "All marks saved successfully" });
  } catch (error) {
    console.error("Error saving marks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:studentId/update", async (req, res) => {
  try {
    const { studentId } = req.params;
    let { english, hindi, maths, science } = req.body;

    english = Number(english);
    hindi = Number(hindi);
    maths = Number(maths);
    science = Number(science);

    if (isNaN(english) || isNaN(hindi) || isNaN(maths) || isNaN(science)) {
      return res.status(400).json({ message: "Invalid marks input" });
    }

    const totalMarks = english + hindi + maths + science;
    const maxMarks = 25 * 4;
    const percentage = (totalMarks / maxMarks) * 100;

    let status = false; // Default to fail
    if (
      english >= 8 &&
      hindi >= 8 &&
      maths >= 8 &&
      science >= 8 &&
      percentage >= 40
    ) {
      status = true; // Pass only if both conditions are met
    }

    const pool = await sql.connect(config.metadataDBConfig);

    // Update marks and status
    await pool
      .request()
      .input("studentId", sql.Int, studentId)
      .input("english", sql.Int, english)
      .input("hindi", sql.Int, hindi)
      .input("maths", sql.Int, maths)
      .input("science", sql.Int, science)
      .input("status", sql.Bit, status) // Passing the updated status
      .query(`
        UPDATE marksheetMaster
        SET 
          english = @english, 
          hindi = @hindi, 
          maths = @maths, 
          science = @science,
          status = @status
        WHERE studentId = @studentId
      `);

    res.json({ message: "Marks updated successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const pool = await sql.connect(config.metadataDBConfig);

    // Fetch student marks from the database
    const result = await pool.request().input("studentId", sql.Int, studentId)
      .query(`
        SELECT mm.studentId, mm.english, mm.hindi, mm.maths, mm.science, sm.isPresent
        FROM dbo.marksheetMaster mm
        LEFT JOIN dbo.studentMaster sm 
          ON mm.studentId = sm.studentId
        WHERE mm.studentId = @studentId AND sm.isPresent = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Student marks not found" });
    }

    res.json(result.recordset[0]); // Send the marks data
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get/qualified_count", async (req, res) => {
  try {
    // Step 1: Get total count of students with paymentStatus: true
    const pool = await sql.connect(config.metadataDBConfig); // Update your connection details

    const result = await pool.request().query(`
      SELECT
          COUNT(*) AS qualifiedCount
      FROM
          MarksheetMaster
      WHERE
          status = 1;
    `);

    const { qualifiedCount } = result.recordset[0];
    // Send the result back
    res.status(200).json({
      success: true,
      qualifiedCount,
      message: "Qualified Student counts fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching student counts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student counts.",
      error: error.message,
    });
  }
});

module.exports = router;
