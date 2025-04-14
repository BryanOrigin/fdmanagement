// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is working!' });
});

// Get all fixed deposits
app.get('/api/fixed-deposits', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fixed_deposits');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new fixed deposit
app.post('/api/fixed-deposits', async (req, res) => {
  try {
    const fd = req.body;
    const [result] = await pool.query(
      `INSERT INTO fixed_deposits 
       (accountNumber, holderName, bankName, principleAmount, interestRate, 
        dueDate, duration, durationType, startDate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fd.accountNumber, fd.holderName, fd.bankName, fd.principleAmount, 
       fd.interestRate, fd.dueDate, fd.duration, fd.durationType, fd.startDate]
    );
    res.status(201).json({ id: result.insertId, ...fd });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update an existing fixed deposit
app.put('/api/fixed-deposits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fd = req.body;
    await pool.query(
      `UPDATE fixed_deposits SET 
       accountNumber = ?, holderName = ?, bankName = ?, 
       principleAmount = ?, interestRate = ?, dueDate = ?, 
       duration = ?, durationType = ?, startDate = ?
       WHERE id = ?`,
      [fd.accountNumber, fd.holderName, fd.bankName, fd.principleAmount, 
       fd.interestRate, fd.dueDate, fd.duration, fd.durationType, fd.startDate, id]
    );
    res.json({ id, ...fd });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a fixed deposit
app.delete('/api/fixed-deposits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM fixed_deposits WHERE id = ?', [id]);
    res.json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});