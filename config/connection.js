const mongoose = require('mongoose');
const state = {
    db: null,
};

module.exports.connect = async function () {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/');
    console.log('Connected to database!');
    state.db = mongoose.connection;
  } catch (err) {
    console.error('Error connecting to database:', err.message);
  }
};

module.exports.get = function () {
    return state.db;
  };