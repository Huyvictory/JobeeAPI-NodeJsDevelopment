const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose
    .connect(process.env.DB_LOCAL_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((con) => {
      console.log(
        `Connect to database mongoDB succesfully with the following host ${con.connection.host}`
      );
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = connectDatabase;
