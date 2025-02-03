// module.exports = {
//     // Metadata database configuration
//     metadataDBConfig: {
//       //    user: 'LAPTOP-JO66B6L3\\ABHISHEK', // Your database username
//       //    password: '', // Your database password
//       server: "LAPTOP-JO66B6L3\\SQLEXPRESS", // Your database server IP address
//       database: "GardeniaRegistrationPortal", // Your database name
//       options: {
//         trustedConnection: true,
//       },
//     },
//   };

module.exports = {
  // Metadata database configuration
  metadataDBConfig: {
    user: "dpsuser",
    password: "dps@123",
    server: "150.242.203.229", // SQL Server address
    database: "GardeniaRegistrationPortal",
    options: {
      encrypt: false, // Set to true if using Azure
      enableArithAbort: true,
      multipleActiveResultSets: true,
    },
  },
};

// Function to
