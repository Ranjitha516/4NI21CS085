const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const WINDOW_SIZE = 10;
const TIMEOUT = 500; // in milliseconds

const QUALIFIED_IDS = new Set(['p', 'f', 'e', 'r']);
const THIRD_PARTY_API = 'http://localhost:9876/numbers/e';

let numbersStore = [];
const lock = new Set();

function fetchNumber(type) {
  return axios.get(`${THIRD_PARTY_API}${type}`, { timeout: TIMEOUT })
    .then(response => response.data)
    .catch(error => {
      console.error('Error fetching number:', error.message);
      return null;
    });
}

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;

  if (!QUALIFIED_IDS.has(numberid)) {
    return res.status(400).json({ error: 'Invalid number ID' });
  }

  let newNumber = await fetchNumber(numberid);

  if (newNumber === null) {
    return res.status(500).json({ error: 'Failed to fetch number' });
  }

  // Ensure numbers are unique and disregard duplicates
  if (!numbersStore.includes(newNumber)) {
    // Acquire lock
    lock.add(newNumber);

    // Replace the oldest number if window size is exceeded
    if (numbersStore.length >= WINDOW_SIZE) {
      numbersStore.shift();
    }
    numbersStore.push(newNumber);

    // Release lock
    lock.delete(newNumber);
  }

  const sum = numbersStore.reduce((a, b) => a + b, 0);
  const average = numbersStore.length ? sum / numbersStore.length : 0;

  res.json({
    windowPrevState: numbersStore.slice(0, -1),
    windowCurrState: numbersStore,
    numbers: numbersStore,
    avg: average.toFixed(2),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
