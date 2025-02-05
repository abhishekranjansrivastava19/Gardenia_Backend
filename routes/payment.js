const express = require("express");
const multer = require("multer");
// const sql = require("mssql/msnodesqlv8");
const sql = require("mssql");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config/dbConfig");
const router = express.Router();
require("dotenv/config");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("inValid image type");

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "uploads");
    // cb(uploadError, "public/collegelogo");
  },
  filename: function (req, file, cb) {
    const fileName = file.fieldname.split("").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}'-'${Date.now()}.${extension}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 }, // 20 KB limit
});

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
router.post(`/order`, upload.single("image"), async (req, res) => {
  const {
    registrationAmt,
    firstName,
    lastName,
    fatherName,
    motherName,
    fatherPhone,
    address,
    dob,
    gender,
    phone,
    password,
    previousSchool,
    sessionId,
    classId,
    stream,
    email,
    paymentStatus,
    orderId,
  } = req.body;

  const file = req.file;
  if (!file) return res.status(400).send("no image in the request");

  const fileName = req.file.filename;
  const basePath = `${req.protocol}://${req.get("host")}/uploads/`;
  const image = `${basePath}${fileName}`
  try {
    if (
      !registrationAmt ||
      !firstName ||
      !lastName ||
      !fatherName ||
      !motherName ||
      !fatherPhone ||
      !address ||
      !dob ||
      !gender ||
      !phone ||
      !password ||
      !previousSchool ||
      !sessionId ||
      !classId ||
      !stream ||
      !image ||
      !email ||
      !orderId
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const pool = await sql.connect(config.metadataDBConfig);

    const emailCheckResult = await pool
      .request()
      .input("email", sql.VarChar(100), email)
      .query("SELECT email FROM dbo.studentMaster WHERE email = @email");

    if (emailCheckResult.recordset.length > 0) {
      // Email already exists
      return res.status(201).json({ message: "Email already exists" });
    }

    const insertStudentQuery = `
    INSERT INTO temporaryStudentMaster (
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
        previousSchool, 
        stream, 
        classId,
        paymentStatus,
        orderId,
        image
    )
    VALUES (
        @firstName, 
        @lastName, 
        @fatherName, 
        @fatherPhone, 
        @motherName, 
        @address, 
        @dob, 
        @gender, 
        @email, 
        @phone, 
        @password, 
        @sessionId, 
        @previousSchool, 
        @stream, 
        @classId,
        @paymentStatus,
        @orderId,
        @image
    );
`;
    await pool
      .request()
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
      .input("password", sql.VarChar(255), password) // Ensure password is hashed before storing
      .input("sessionId", sql.Int, sessionId)
      .input("previousSchool", sql.VarChar(255), previousSchool)
      .input("image", sql.VarChar(255), image)
      .input("stream", sql.VarChar(100), stream)
      .input("classId", sql.Int, classId)
      .input("paymentStatus", sql.Bit, paymentStatus)
      .input("orderId", sql.VarChar(100), orderId)
      .query(insertStudentQuery);

    const options = {
      amount: Number(registrationAmt * 100),
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };
    // console.log(options);
    razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "somthing went wrong" });
      }
      console.log(order);
      res.status(200).json({ data: order, orderId: orderId });
    });
  } catch (error) {
    console.error(error);
  }
});

router.post(`/oldStudent/order`, async (req, res) => {
  const {
    registrationAmt,
    orderId,
    studentId,
    stream,
    classId,
    previousSchool,
  } = req.body;

  console.log(req.body);

  try {
    if (!registrationAmt || !orderId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const options = {
      amount: Number(registrationAmt * 100),
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };
    // console.log(options);
    razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "somthing went wrong" });
      }
      console.log(order);
      res.status(200).json({
        data: order,
        orderId: orderId,
        studentId: studentId,
        stream: stream,
        classId: classId,
        previousSchool: previousSchool,
      });
    });
  } catch (error) {
    console.error(error);
  }
});

router.post("/payment_verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const orderId = req.query.orderId;
  const registrationAmt = req.query.registrationAmt;
  
  try {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex");

    const isAuthentic = expectedSign === razorpay_signature;
    if (isAuthentic) {
      const pool = await sql.connect(config.metadataDBConfig);

      // Retrieve temporary registration data
      const tempDataQuery = `
                SELECT * FROM temporaryStudentMaster WHERE orderId = @orderId;
            `;
      const tempData = await pool
        .request()
        .input("orderId", sql.VarChar, req.query.orderId)
        .query(tempDataQuery);

      if (tempData.recordset.length === 0) {
        return res
          .status(400)
          .json({ message: "No temporary data found for this orderId" });
      }

      const paymentStatus = 1;
      const {
        firstName,
        lastName,
        fatherName,
        motherName,
        fatherPhone,
        address,
        dob,
        gender,
        phone,
        password,
        previousSchool,
        sessionId,
        classId,
        stream,
        email,
        orderId,
        image,
      } = tempData.recordset[0];

      const insertStudentQuery = `
    INSERT INTO studentMaster (
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
        previousSchool, 
        stream, 
        classId,
        paymentStatus,
        orderId,
        image
    )
    OUTPUT INSERTED.studentId
    VALUES (
        @firstName, 
        @lastName, 
        @fatherName, 
        @fatherPhone, 
        @motherName, 
        @address, 
        @dob, 
        @gender, 
        @email, 
        @phone, 
        @password, 
        @sessionId, 
        @previousSchool, 
        @stream, 
        @classId,
        @paymentStatus,
        @orderId,
        @image
    );
`;

      const result = await pool
        .request()
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
        .input("password", sql.VarChar(255), password) // Ensure password is hashed before storing
        .input("sessionId", sql.Int, sessionId)
        .input("previousSchool", sql.VarChar(255), previousSchool)
        .input("image", sql.VarChar(255), image)
        .input("stream", sql.VarChar(100), stream)
        .input("classId", sql.Int, classId)
        .input("paymentStatus", sql.Bit, paymentStatus)
        .input("orderId", sql.VarChar(100), orderId)
        .query(insertStudentQuery);

      if (!result.recordset || result.recordset.length === 0) {
        return res.status(500).json({ message: "Student insertion failed" });
      }
      const studentId = result.recordset[0].studentId;

      const transactionDate = new Date()
      const insertTransactionQuery = `
      INSERT INTO dbo.transactionDb (
        studentId,
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        registrationAmt,
        transactionDate
      )
      VALUES (
        @studentId,
        @orderId,
        @razorpay_order_id,
        @razorpay_payment_id,
        @registrationAmt,
        @transactionDate
      );
    `;
      await pool
        .request()
        .input("studentId", sql.Int, studentId)
        .input("orderId", sql.VarChar(100), orderId)
        .input("razorpay_order_id", sql.VarChar(100), razorpay_order_id)
        .input("razorpay_payment_id", sql.VarChar(100), razorpay_payment_id)
        .input("registrationAmt", sql.Decimal(10, 2), registrationAmt/100)
        .input("transactionDate", sql.DateTime, transactionDate)
        .query(insertTransactionQuery);

      const deleteTempDataQuery = `
                DELETE FROM temporaryStudentMaster WHERE orderId = @orderId;
            `;
      await pool
        .request()
        .input("orderId", sql.VarChar, orderId)
        .query(deleteTempDataQuery);

      // Close the database connection
      pool.close();

      res.redirect("https://admission.dpserp.com");
    } else {
      res.status(500).json({ message: "failed" });
    }
  } catch (error) {
    console.error(error);
  }
});

router.post("/oldStudent/payment_verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const orderId = req.query.orderId;
  const studentId = req.query.studentId;
  const classId = req.query.classId;
  const stream = req.query.stream;
  const previousSchool = req.query.previousSchool;
  const registrationAmt = req.query.registrationAmt;
  console.log(req.query);

  try {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex");

    const isAuthentic = expectedSign === razorpay_signature;
    if (isAuthentic) {
      const pool = await sql.connect(config.metadataDBConfig);

      const paymentStatus = 1;
      const transactionDate = new Date();
      // Retrieve temporary registration data
      await pool
        .request()
        .input("studentId", sql.Int, studentId)
        .input("stream", sql.NVarChar, stream)
        .input("classId", sql.Int, classId)
        .input("paymentStatus", sql.Bit, paymentStatus)
        .input("orderId", sql.Bit, orderId)
        .input("previousSchool", sql.NVarChar, previousSchool).query(`
              UPDATE dbo.studentMaster
              SET 
                stream = @stream,
                classId = @classId,
                previousSchool = @previousSchool,
                paymentStatus = @paymentStatus,
                orderId = @orderId
              WHERE studentId = @studentId
            `);

      await pool
        .request()
        .input("studentId", sql.Int, studentId)
        .input("orderId", sql.NVarChar, orderId)
        .input("razorpay_order_id", sql.NVarChar, razorpay_order_id)
        .input("razorpay_payment_id", sql.NVarChar, razorpay_payment_id)
        .input("registrationAmt", sql.Decimal(10, 2), registrationAmt/100) // Assuming registrationAmt is a decimal
        .input("transactionDate", sql.DateTime, transactionDate) // Current date and time
        .query(`
                  INSERT INTO dbo.transactionDb (studentId, orderId, razorpay_order_id, razorpay_payment_id, registrationAmt, transactionDate)
                  VALUES (@studentId, @orderId, @razorpay_order_id, @razorpay_payment_id, @registrationAmt, @transactionDate)
                `);

      pool.close();

      res.redirect(
        // `http://localhost:3001/${studentId}/studentPanel/reciept?orderId=${orderId}`
        `https://admission.dpserp.com/${studentId}/studentPanel/reciept?orderId=${orderId}`
      );
    } else {
      res.status(500).json({ message: "failed" });
    }
  } catch (error) {
    console.error(error);
  }
});

module.exports = router;
