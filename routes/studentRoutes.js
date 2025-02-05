const express = require("express");
const router = express.Router();
const config = require("../config/dbConfig");
const sql = require("mssql");
// const sql = require("mssql/msnodesqlv8");
const jwt = require("jsonwebtoken");

router.get("/:id", async (req, res) => {
  const studentId = req.params.id;

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await pool.request().input("studentId", sql.Int, studentId)
      .query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.paymentStatus,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName, -- Fetching stream details
          sm.sessionId,
          s.sessionName AS sessionName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.sessions s ON sm.sessionId = s.sessionId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId -- Joining streams table
        WHERE sm.studentId = @studentId
      `);

    // If student is found, return the data
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/getVerified/:id", async (req, res) => {
  const studentId = req.params.id;

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await pool.request().input("studentId", sql.Int, studentId)
      .query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.paymentStatus,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName, -- Fetching stream details
          sm.sessionId,
          s.sessionName AS sessionName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.sessions s ON sm.sessionId = s.sessionId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId -- Joining streams table
        WHERE sm.isVerified = 1 AND sm.studentId = @studentId
      `);

    // If student is found, return the data
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  // const studentId = req.params.id;

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await // .input("studentId", sql.Int, studentId)
    pool.request().query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.paymentStatus,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName, -- Fetching stream details
          sm.sessionId,
          s.sessionName AS sessionName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.sessions s ON sm.sessionId = s.sessionId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId 
        WHERE sm.paymentStatus = 1
      `);

    // If student is found, return the data
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }
    res.status(200).json({ students: result.recordset });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get/Count", async (req, res) => {
  try {
    // Step 1: Get total count of students with paymentStatus: true
    const pool = await sql.connect(config.metadataDBConfig); // Update your connection details

    const result = await pool.request().query(`
      SELECT
          COUNT(*) AS totalCount,
          SUM(CASE WHEN isOld = 1 THEN 1 ELSE 0 END) AS oldCount,
          SUM(CASE WHEN isOld = 0 THEN 1 ELSE 0 END) AS newCount
      FROM
          studentMaster
      WHERE
          paymentStatus = 1;
    `);

    const { totalCount, oldCount, newCount } = result.recordset[0];

    // Send the result back
    res.status(200).json({
      success: true,
      totalCount,
      oldCount,
      newCount,
      message: "Student counts fetched successfully.",
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

router.get("/get/verified_count", async (req, res) => {
  try {
    // Step 1: Get total count of students with paymentStatus: true
    const pool = await sql.connect(config.metadataDBConfig); // Update your connection details

    const result = await pool.request().query(`
      SELECT
          COUNT(*) AS verifiedCount
      FROM
          studentMaster
      WHERE
          isVerified = 1;
    `);

    const { verifiedCount } = result.recordset[0];

    // Send the result back
    res.status(200).json({
      success: true,
      verifiedCount,
      message: "verified Student counts fetched successfully.",
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

router.get("/verified/list", async (req, res) => {
  // const studentId = req.params.id;

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await // .input("studentId", sql.Int, studentId)
    pool.request().query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.paymentStatus,
          sm.isPresent,
          sm.rollNo,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName, -- Fetching stream details
          sm.sessionId,
          s.sessionName AS sessionName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.sessions s ON sm.sessionId = s.sessionId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId 
        WHERE sm.isVerified = 1 AND sm.paymentStatus = 1
      `);

    // If student is found, return the data
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }
    res.status(200).json({ students: result.recordset });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  const {
    scholarNo,
    firstName,
    lastName,
    fatherName,
    fatherPhone,
    motherName,
    address,
    dob,
    gender,
    email,
    phone,
    password,
    sessionId,
    classId,
    stream,
    previousSchool,
    image,
    isOld, // New field
    isVerified, // New field
    isPass,
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !fatherName ||
    !motherName ||
    !dob ||
    !gender ||
    !password
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    const emailCheckResult = await pool
      .request()
      .input("email", sql.VarChar(100), email)
      .query("SELECT email FROM dbo.studentMaster WHERE email = @email");

    if (emailCheckResult.recordset.length > 0) {
      // Email already exists
      return res.status(201).json({ message: "Email already exists" });
    }
    // Insert student data into the studentMaster table
    await pool
      .request()
      .input("scholarNo", sql.VarChar(50), scholarNo)
      .input("firstName", sql.VarChar(100), firstName)
      .input("lastName", sql.VarChar(100), lastName)
      .input("fatherName", sql.VarChar(100), fatherName)
      .input("fatherPhone", sql.VarChar(20), fatherPhone)
      .input("motherName", sql.VarChar(100), motherName)
      .input("address", sql.VarChar(255), address)
      .input("dob", sql.Date, dob)
      .input("gender", sql.VarChar(10), gender)
      .input("email", sql.VarChar(100), email)
      .input("phone", sql.VarChar(20), phone)
      .input("password", sql.VarChar(255), password)
      .input("sessionId", sql.Int, sessionId)
      .input("classId", sql.VarChar(10), classId)
      .input("stream", sql.VarChar(10), stream)
      .input("previousSchool", sql.VarChar(255), previousSchool)
      .input("image", sql.VarChar(255), image)
      .input("isOld", sql.Bit, isOld) // New field
      .input("isVerified", sql.Bit, isVerified) // New field
      .input("isPass", sql.Bit, isPass).query(`
        INSERT INTO dbo.studentMaster (
          scholarNo, firstName, lastName, fatherName, fatherPhone, motherName, address, 
          dob, gender, email, phone, password, sessionId, classId, stream, 
          previousSchool, image, isOld, isVerified, isPass
        ) VALUES (
          @scholarNo, @firstName, @lastName, @fatherName, @fatherPhone, @motherName, @address, 
          @dob, @gender, @email, @phone, @password, @sessionId, @classId, @stream, 
          @previousSchool, @image, @isOld, @isVerified, @isPass
        )
      `);

    res.status(201).json({ message: "Student registered successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { scholarNoOrEmail, password } = req.body;

  // Validate input fields
  if (!scholarNoOrEmail || !password) {
    return res
      .status(400)
      .json({ message: "ScholarNo/Email and Password are required" });
  }

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Check if the student exists by either scholarNo or email
    const result = await pool
      .request()
      .input("scholarNoOrEmail", sql.VarChar(100), scholarNoOrEmail).query(`
        SELECT * FROM dbo.studentMaster 
        WHERE scholarNo = @scholarNoOrEmail OR email = @scholarNoOrEmail
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = result.recordset[0];

    // Compare the provided password with the stored password (plain text comparison)
    if (student.password !== password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const payload = {
      studentId: student.studentId,
      scholarNo: student.scholarNo,
      email: student.email,
      isAdmin: student.isAdmin,
      userRole: student.userRole,
      isOld: student.isOld,
      isVarified: student.isVarified,
      isPass: student.isPass,
    };

    const token = jwt.sign(payload, "LXIXLXIX", { expiresIn: "1h" }); // Replace "your-secret-key" with your secret key

    // Send response with token and student data
    res
      .status(200)
      .send({ token: token, message: "login successfully", result: "success" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  const studentId = req.params.id; // Extract studentId from params
  const { stream, classId, previousSchool } = req.body; // Extract fields from request body

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Update query for the studentMaster table
    const result = await pool
      .request()
      .input("studentId", sql.Int, studentId)
      .input("stream", sql.NVarChar, stream)
      .input("classId", sql.Int, classId)
      .input("previousSchool", sql.NVarChar, previousSchool).query(`
        UPDATE dbo.studentMaster
        SET 
          stream = @stream,
          classId = @classId,
          previousSchool = @previousSchool
        WHERE studentId = @studentId
      `);

    // If rows are affected, return success response
    if (result.rowsAffected[0] > 0) {
      console.log("Student updated successfully.");
      return res
        .status(200)
        .send({ message: "Student updated successfully", result: "success" });
    } else {
      console.log("Student not found.");
      return res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// router.put("/update/verify", async (req, res) => {
//   const { studentIds } = req.body; // Expecting an array of student IDs in the request body

//   if (!Array.isArray(studentIds) || studentIds.length === 0) {
//     return res.status(400).json({ message: "No student IDs provided" });
//   }

//   try {
//     // Open database connection
//     const pool = await sql.connect(config.metadataDBConfig);

//     // Convert studentIds array into a comma-separated string
//     const studentIdList = studentIds.join(",");

//     // Update query to set isVerified to true for all selected students
//     const result = await pool.request().query(`
//       UPDATE dbo.studentMaster
//       SET isVerified = 1
//       WHERE studentId IN (${studentIdList})
//     `);

//     // Check if rows were affected
//     if (result.rowsAffected[0] > 0) {
//       res.status(200).json({ message: `${result.rowsAffected[0]} students have been successfully verified` });
//     } else {
//       res.status(404).json({ message: "No students were updated. Please check the provided IDs." });
//     }
//   } catch (error) {
//     console.error("Database error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

router.put("/update/verify", async (req, res) => {
  const { studentIds } = req.body; // Expecting an array of student IDs in the request body

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ message: "No student IDs provided" });
  }

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Find the last assigned roll number
    const lastRollQuery = await pool.request().query(`
      SELECT MAX(CAST(rollNo AS INT)) AS lastRollNo FROM dbo.studentMaster WHERE rollNo IS NOT NULL
    `);

    let lastRollNo = lastRollQuery.recordset[0]?.lastRollNo || 20250000; // Start from 20250001

    // Loop through students and update each one with a roll number
    let updatedCount = 0;
    for (const studentId of studentIds) {
      lastRollNo++; // Generate next roll number

      // Update student with isVerified = 1 and assign roll number if not already assigned
      const result = await pool
        .request()
        .input("studentId", sql.Int, studentId)
        .input("rollNo", sql.VarChar, lastRollNo.toString()).query(`
          UPDATE dbo.studentMaster
          SET isVerified = 1, rollNo = (CASE WHEN rollNo IS NULL THEN @rollNo ELSE rollNo END)
          WHERE studentId = @studentId
        `);

      if (result.rowsAffected[0] > 0) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      res
        .status(200)
        .json({
          message: `${updatedCount} students have been successfully verified and assigned roll numbers.`,
        });
    } else {
      res
        .status(404)
        .json({
          message: "No students were updated. Please check the provided IDs.",
        });
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/markpresent/:studentId", async (req, res) => {
  const { studentId } = req.params; // Student ID from URL parameter
  const { studentName } = req.query;
  if (!studentId) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Update query to set isPresent to true for the given student ID
    const result = await pool.request().input("studentId", sql.Int, studentId)
      .query(`
        UPDATE dbo.studentMaster
        SET isPresent = 1
        WHERE studentId = @studentId
      `);

    // Check if a row was updated
    if (result.rowsAffected[0] > 0) {
      res
        .status(200)
        .json({ message: `Student ${studentName} marked as present` });
    } else {
      res
        .status(404)
        .json({ message: "Student not found or already marked present" });
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get/present_count", async (req, res) => {
  try {
    // Step 1: Get total count of students with paymentStatus: true
    const pool = await sql.connect(config.metadataDBConfig); // Update your connection details

    const result = await pool.request().query(`
      SELECT
          COUNT(*) AS presentCount
      FROM
          studentMaster
      WHERE
          isPresent = 1;
    `);

    const { presentCount } = result.recordset[0];

    // Send the result back
    res.status(200).json({
      success: true,
      presentCount,
      message: "Present Student counts fetched successfully.",
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

router.get(`/present/list`, async (req, res) => {
  // const studentId = req.params.id;
  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await // .input("studentId", sql.Int, studentId)
    pool.request().query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.paymentStatus,
          sm.isPresent,
          sm.rollNo,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName, -- Fetching stream details
          sm.sessionId,
          mm.status,
          mm.english,
          mm.hindi,
          mm.maths,
          mm.science,
          s.sessionName AS sessionName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.sessions s ON sm.sessionId = s.sessionId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId 
        LEFT JOIN dbo.MarksheetMaster mm ON sm.studentId = mm.studentId 
        WHERE sm.isPresent = 1 AND sm.isVerified = 1
      `);

    // If student is found, return the data
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }
    res.status(200).json({ students: result.recordset });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get(`/qualified/list`, async (req, res) => {
  // const studentId = req.params.id;
  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await // .input("studentId", sql.Int, studentId)
    pool.request().query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.paymentStatus,
          sm.isPresent,
          sm.rollNo,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName, -- Fetching stream details
          sm.sessionId,
          mm.status,
          mm.english,
          mm.hindi,
          mm.maths,
          mm.science,
          s.sessionName AS sessionName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.sessions s ON sm.sessionId = s.sessionId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId 
        LEFT JOIN dbo.MarksheetMaster mm ON sm.studentId = mm.studentId 
        WHERE mm.status = 1 AND sm.isPresent = 1
      `);

    // If student is found, return the data
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }
    res.status(200).json({ students: result.recordset });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/Qualified/:id", async (req, res) => {
  const studentId = req.params.id;

  try {
    // Open database connection
    const pool = await sql.connect(config.metadataDBConfig);

    // Query to fetch student with populated class, session, and stream details
    const result = await pool.request().input("studentId", sql.Int, studentId)
      .query(`
        SELECT 
          sm.studentId,
          sm.scholarNo,
          sm.firstName,
          sm.lastName,
          sm.fatherName,
          sm.fatherPhone,
          sm.motherName,
          sm.address,
          sm.dob,
          sm.gender,
          sm.email,
          sm.phone,
          sm.password,
          sm.previousSchool,
          sm.image,
          sm.isOld,
          sm.isVerified,
          sm.isPass,
          sm.isAdmin,
          sm.userRole,
          sm.classId,
          sm.rollNo,
          sm.paymentStatus,
          c.className AS className,
          c.classType AS classType,
          c.registrationAmt AS registrationAmt,
          c.streamId AS streamId,
          st.streamName AS streamName
        FROM dbo.studentMaster sm
        LEFT JOIN dbo.classes c ON sm.classId = c.classId
        LEFT JOIN dbo.streams st ON c.streamId = st.streamId 
        LEFT JOIN dbo.MarksheetMaster mm ON sm.studentId = mm.studentId 
        WHERE mm.status = 1 AND sm.studentId = @studentId
      `);

    // If student is found, return the data
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;
